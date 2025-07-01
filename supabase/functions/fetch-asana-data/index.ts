import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const logs = [];

    // 1. Conectarse a Supabase con permisos de admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    );

    // 2. Obtener credenciales maestras de Asana
    const { data: asanaCreds, error: credsError } = await supabaseAdmin
      .from('api_credentials')
      .select('access_token, extra_data')
      .eq('platform', 'asana')
      .is('cliente_id', null)
      .single();

    if (credsError || !asanaCreds) throw new Error("Credenciales de Asana no encontradas.");

    const ASANA_PAT = asanaCreds.access_token;
    const WORKSPACE_GID = asanaCreds.extra_data?.workspace_gid;
    if (!WORKSPACE_GID) throw new Error("El workspace_gid no está definido en extra_data.");
    
    const authHeaders = { 'Authorization': `Bearer ${ASANA_PAT}` };

    // 3. Obtener el mapeo de Teams a Clientes
    const { data: mappings, error: mappingError } = await supabaseAdmin
      .from('asana_team_client_mapping')
      .select('asana_team_gid, cliente_id');
      
    if(mappingError) throw mappingError;
    const teamToClientMap = new Map(mappings.map(m => [m.asana_team_gid, m.cliente_id]));
    logs.push(`Mapa de ${teamToClientMap.size} teams a clientes cargado.`);

    // 4. Obtener y guardar TODOS los TEAMS del workspace
    const teamsUrl = `https://app.asana.com/api/1.0/teams?workspace=${WORKSPACE_GID}&opt_fields=gid,name,permalink_url`;
    const teamsResponse = await fetch(teamsUrl, { headers: authHeaders });
    if (!teamsResponse.ok) throw new Error(`Error al obtener teams: ${await teamsResponse.text()}`);
    
    const { data: asanaTeams } = await teamsResponse.json();
    if (asanaTeams && asanaTeams.length > 0) {
        const teamsToUpsert = asanaTeams.map(t => ({ gid: t.gid, name: t.name, permalink_url: t.permalink_url }));
        const { error: teamsUpsertError } = await supabaseAdmin.from('asana_teams_cache').upsert(teamsToUpsert, { onConflict: 'gid' });
        if (teamsUpsertError) throw teamsUpsertError;
        logs.push(`${teamsToUpsert.length} Teams guardados/actualizados en la caché.`);
    }

    // 5. Obtener TODOS los proyectos del Workspace
    const projectsUrl = `https://app.asana.com/api/1.0/projects?workspace=${WORKSPACE_GID}&opt_fields=gid,name,due_on,current_status.text,current_status.color,permalink_url,team.gid`;
    const projectsResponse = await fetch(projectsUrl, { headers: authHeaders });
    if (!projectsResponse.ok) throw new Error(`Error al obtener proyectos: ${await projectsResponse.text()}`);
    
    const { data: asanaProjects } = await projectsResponse.json();
    logs.push(`Se encontraron ${asanaProjects.length} proyectos en el workspace.`);

    // 6. Filtrar y guardar los proyectos que pertenecen a un team mapeado
    let projectsToUpsert = [];
    if (asanaProjects && asanaProjects.length > 0) {
      projectsToUpsert = asanaProjects
        .filter(p => p.team && teamToClientMap.has(p.team.gid))
        .map(p => ({
          gid: p.gid,
          name: p.name,
          due_on: p.due_on,
          current_status_text: p.current_status?.text,
          current_status_color: p.current_status?.color,
          permalink_url: p.permalink_url,
          team_gid: p.team.gid,
          cliente_id: teamToClientMap.get(p.team.gid)
        }));

      if (projectsToUpsert.length > 0) {
        const { error: projectsUpsertError } = await supabaseAdmin
          .from('asana_projects_cache').upsert(projectsToUpsert, { onConflict: 'gid' });
        if (projectsUpsertError) throw projectsUpsertError;
        logs.push(`${projectsToUpsert.length} proyectos relevantes guardados.`);

        // 7. Obtener las tareas para los proyectos relevantes
        for (const project of projectsToUpsert) {
          const tasksUrl = `https://app.asana.com/api/1.0/projects/${project.gid}/tasks?opt_fields=gid,name,assignee.name,due_on,completed`;
          const tasksResponse = await fetch(tasksUrl, { headers: authHeaders });
          if (!tasksResponse.ok) {
  // Leemos la respuesta de error detallada que nos da Asana
  const errorBody = await tasksResponse.json();
  // La añadimos a nuestros logs para poder verla
  logs.push(`Error al obtener tareas para ${project.name}: ${JSON.stringify(errorBody)}`);
  continue;
}
          const { data: asanaTasks } = await tasksResponse.json();
          if (!asanaTasks || asanaTasks.length === 0) continue;
          const tasksToUpsert = asanaTasks.map(t => ({
            gid: t.gid, name: t.name, assignee_name: t.assignee?.name,
            due_on: t.due_on, completed: t.completed, project_gid: project.gid
          }));
          await supabaseAdmin.from('asana_tasks_cache').upsert(tasksToUpsert, { onConflict: 'gid' });
        }
      } else {
        logs.push("No se encontraron proyectos para los equipos mapeados.");
      }
    }

    return new Response(JSON.stringify({ status: 'ok', logs }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});