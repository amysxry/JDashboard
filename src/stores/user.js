import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabaseClient'

export const useUserStore = defineStore('user', () => {
  // --- STATE ---
  const clientId = ref(null) // <-- CAMBIO: Renombrado de 'id' a 'clientId' para mayor claridad
  const authId = ref(null)
  const email = ref('')
  const name = ref('')
  const avatarUrl = ref('')
  const balance = ref(0) // <-- CAMBIO: Añadido estado para el saldo

  // --- GETTERS ---
  const initials = computed(() => {
    if (!name.value) return '' // Devuelve vacío si no hay nombre para evitar 'CL'
    return name.value
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  })

  // --- ACTIONS ---
  async function fetchProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')

      authId.value = user.id
      email.value = user.email

      // CAMBIO: Añadimos 'saldo' a la consulta
      const { data: clientData, error } = await supabase
        .from('clientes')
        .select('id, empresa, saldo, avatar_url') 
        .eq('auth_id', user.id)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error

      if (clientData) {
        clientId.value = clientData.id // <-- CAMBIO: Se asigna a 'clientId'
        name.value = clientData.empresa || ''
        avatarUrl.value = clientData.avatar_url || ''
        balance.value = clientData.saldo || 0 // <-- CAMBIO: Asignamos el saldo
      }
    } catch (error) {
      console.error('Error al cargar el perfil en el store:', error.message)
    }
  }

  // Las demás funciones no necesitan cambios, pero las dejamos por consistencia
  async function updateProfileName(newName) {
    if (!authId.value) return
    const { error } = await supabase
      .from('clientes')
      .upsert({ auth_id: authId.value, empresa: newName }, { onConflict: 'auth_id' })
    
    if (error) throw error
    name.value = newName
  }

  async function updateAvatar(newUrl) {
    if (!authId.value) return
     const { error } = await supabase
      .from('clientes')
      .update({ avatar_url: newUrl })
      .eq('auth_id', authId.value)

    if (error) throw error
    avatarUrl.value = newUrl
  }

  // CAMBIO: Exponemos 'clientId' y 'balance'
  return {
    clientId, 
    authId,
    email,
    name,
    avatarUrl,
    balance,
    initials,
    fetchProfile,
    updateProfileName,
    updateAvatar,
  }
})