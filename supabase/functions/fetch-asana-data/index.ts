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

    // 4. NUEVO: Obtener y guardar TODOS los USUARIOS del workspace
    // Nota: El "Área" es un campo personalizado en Asana. Este script asume que tienes una columna "area" en tu tabla "asana_users_cache"
    // que podrías llenar manualmente o adaptar este script si conoces el GID del campo personalizado.
    const usersUrl = `https://app.asana.com/api/1.0/users?workspace=${WORKSPACE_GID}&opt_fields=gid,name,email`;
    const usersResponse = await fetch(usersUrl, { headers: authHeaders });
    if (!usersResponse.ok) throw new Error(`Error al obtener usuarios: ${await usersResponse.text()}`);
    const { data: asanaUsers } = await usersResponse.json();
    if (asanaUsers && asanaUsers.length > 0) {
        const usersToUpsert = asanaUsers.map(u => ({ gid: u.gid, name: u.name, email: u.email }));
        const { error: usersUpsertError } = await supabaseAdmin.from('asana_users_cache').upsert(usersToUpsert, { onConflict: 'gid' });
        if (usersUpsertError) throw usersUpsertError;
        logs.push(`${usersToUpsert.length} Usuarios guardados/actualizados en la caché.`);
    }

    // 5. Obtener TODOS los proyectos del Workspace
    const projectsUrl = `https://app.asana.com/api/1.0/projects?workspace=${WORKSPACE_GID}&archived=false&opt_fields=gid,name,due_on,current_status.text,current_status.color,permalink_url,team.gid`;
    const projectsResponse = await fetch(projectsUrl, { headers: authHeaders });
    if (!projectsResponse.ok) throw new Error(`Error al obtener proyectos: ${await projectsResponse.text()}`);
    
    const { data: asanaProjects } = await projectsResponse.json();
    logs.push(`Se encontraron ${asanaProjects.length} proyectos en el workspace.`);

    // 6. Filtrar y guardar los proyectos que pertenecen a un team mapeado
    if (asanaProjects && asanaProjects.length > 0) {
      const projectsToUpsert = asanaProjects
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

        // 7. Obtener las tareas para los proyectos relevantes (con los campos corregidos)
        for (const project of projectsToUpsert) {
          // CORREGIDO: Se añaden "notes" y "assignee.gid" a los campos solicitados
          const tasksUrl = `https://app.asana.com/api/1.0/projects/${project.gid}/tasks?opt_fields=gid,name,notes,assignee.gid,due_on,completed`;
          const tasksResponse = await fetch(tasksUrl, { headers: authHeaders });
          if (!tasksResponse.ok) {
            logs.push(`Error al obtener tareas para ${project.name}: ${await tasksResponse.text()}`);
            continue;
          }
          const { data: asanaTasks } = await tasksResponse.json();
          if (!asanaTasks || asanaTasks.length === 0) continue;

          // CORREGIDO: Se mapean los nuevos campos para guardarlos en la base de datos
          const tasksToUpsert = asanaTasks.map(t => ({
            gid: t.gid,
            name: t.name,
            notes: t.notes, // Campo añadido
            assignee_gid: t.assignee?.gid, // Campo añadido
            due_on: t.due_on,
            completed: t.completed,
            project_gid: project.gid
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