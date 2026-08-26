import { supabase } from '../config/supabase.js'

export async function createUser(email, name, password_hash) {
  return await supabase
    .from('users')
    .insert([{ email, name, password_hash }])
    .select()
    .single()
}

export async function findUserByEmail(email) {
  return await supabase.from('users').select('*').eq('email', email).single()
}

/** Public profile fields only (no password). */
export async function findUserById(id) {
  return await supabase
    .from('users')
    .select('id, email, name, highscore, profile_icon, anonymity_mode, theme, language')
    .eq('id', id)
    .single()
}

export async function updateUserPreferences(userId, updates) {
  return await supabase.from('users').update(updates).eq('id', userId).select('id, anonymity_mode, theme, language').single()
}

export async function updateUserProfileIcon(userId, profile_icon) {
  return await supabase
    .from('users')
    .update({ profile_icon })
    .eq('id', userId)
    .select('id, profile_icon')
    .single()
}
