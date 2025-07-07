import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { v4 as uuidv4 } from 'uuid'

export const useUserStore = defineStore('user', () => {
  // --- STATE ---
  // Estos son los datos reactivos que guardaremos globalmente.
  const id = ref(null) // ID de la tabla 'clientes'
  const authId = ref(null) // ID de Supabase Auth
  const email = ref('')
  const name = ref('')
  const avatarUrl = ref('')

  // --- GETTERS ---
  // Propiedades computadas que derivan del estado.
  const initials = computed(() => {
    if (!name.value) return 'CL'
    return name.value
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  })

  // --- ACTIONS ---
  // Funciones que modifican el estado. Aquí va toda la lógica de Supabase.

  async function fetchProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')

      authId.value = user.id
      email.value = user.email

      const { data: clientData, error } = await supabase
        .from('clientes')
        .select('id, empresa, avatar_url')
        .eq('auth_id', user.id)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error

      if (clientData) {
        id.value = clientData.id
        name.value = clientData.empresa || ''
        avatarUrl.value = clientData.avatar_url || ''
      }
    } catch (error) {
      console.error('Error al cargar el perfil en el store:', error.message)
    }
  }

  async function updateProfileName(newName) {
    if (!authId.value) return
    const { error } = await supabase
      .from('clientes')
      .upsert({ auth_id: authId.value, empresa: newName }, { onConflict: 'auth_id' })
    
    if (error) throw error
    name.value = newName // Actualizamos el estado local
  }

  async function updateAvatar(newUrl) {
    if (!authId.value) return
     const { error } = await supabase
      .from('clientes')
      .update({ avatar_url: newUrl })
      .eq('auth_id', authId.value)

    if (error) throw error
    avatarUrl.value = newUrl // Actualizamos el estado local
  }

  return {
    id,
    authId,
    email,
    name,
    avatarUrl,
    initials,
    fetchProfile,
    updateProfileName,
    updateAvatar,
  }
})