import { supabase } from '../config/supabase.js'

export async function updateHighscore(userId, newScore) {
  const { data: user } = await supabase
    .from('users')
    .select('highscore')
    .eq('id', userId)
    .single()

  if (!user) return { error: 'Felhasználó nem található' }

  if (newScore > user.highscore) {
    return await supabase.from('users').update({ highscore: newScore }).eq('id', userId)
  }

  return { data: user }
}

export async function createRun({ userId, classId, score }) {
  return await supabase
    .from('runs')
    .insert([
      {
        users_id: userId,
        classes_id: classId ?? null,
        score,
      },
    ])
    .select()
    .single()
}

function pickClassDisplayName(row, lang) {
  if (!row) return null
  const en = row.name_en != null ? String(row.name_en).trim() : ''
  const hu = row.name_hu != null ? String(row.name_hu).trim() : ''
  if (lang === 'en') return en || hu || null
  return hu || en || null
}

/**
 * Latest runs for a user (newest first), with localized class label from `classes.name_hu` / `name_en`.
 * @param {number|string} userId
 * @param {number} [limit]
 * @param {'hu'|'en'} [lang]
 * @returns {Promise<{ data: Array<{ score: number, date: string|null, className: string|null }>|null, error: { message: string }|null }>}
 */
export async function getRecentRunsForUser(userId, limit = 5, lang = 'hu') {
  const lim = Math.min(Math.max(Number(limit) || 5, 1), 20)
  const uid = Number(userId)
  const { data: runs, error } = await supabase
    .from('runs')
    .select('id, score, date, classes_id')
    .eq('users_id', Number.isFinite(uid) ? uid : userId)
    .order('id', { ascending: false })
    .limit(lim)

  if (error) return { data: null, error }

  const list = runs ?? []
  const classIds = [...new Set(list.map((r) => r.classes_id).filter((id) => id != null))]
  /** @type {Record<number, string|null>} */
  const nameById = {}
  const locale = lang === 'en' ? 'en' : 'hu'
  if (classIds.length > 0) {
    const { data: classes, error: cErr } = await supabase
      .from('classes')
      .select('id, name_en, name_hu')
      .in('id', classIds)
    if (cErr) return { data: null, error: cErr }
    for (const c of classes ?? []) {
      nameById[c.id] = pickClassDisplayName(c, locale)
    }
  }

  const data = list.map((r) => ({
    score: r.score,
    date: r.date ?? null,
    className: r.classes_id != null ? nameById[r.classes_id] ?? null : null,
  }))
  return { data, error: null }
}

/**
 * Top 10 by highscore. If anonymity_mode is true, name is masked as {ClassName}_User
 * using the class from the user's most recent run (runs.classes_id → classes.name_en / name_hu).
 */
/**
 * @param {number|null|undefined} currentUserId - if set (from optional JWT), matching row gets isYou: true
 */
export async function getLeaderboard(currentUserId) {
  const { data: rows, error } = await supabase
    .from('users')
    .select('id, name, highscore, anonymity_mode')
    .order('highscore', { ascending: false })
    .limit(10)

  if (error) return { data: null, error }

  const selfId = currentUserId != null ? Number(currentUserId) : null

  const out = []
  for (const u of rows ?? []) {
    let displayName = u.name
    if (u.anonymity_mode === true) {
      const className = await fetchLatestRunClassName(u.id)
      const slug = (className || 'Unknown').replace(/\s+/g, '')
      displayName = `${slug}_User`
    }
    const isYou = selfId !== null && !Number.isNaN(selfId) && Number(u.id) === selfId
    out.push({ name: displayName, highscore: u.highscore, isYou })
  }
  return { data: out, error: null }
}

async function fetchLatestRunClassName(userId) {
  const { data: run } = await supabase
    .from('runs')
    .select('classes_id')
    .eq('users_id', userId)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!run?.classes_id) return null

  const { data: cls } = await supabase
    .from('classes')
    .select('name_en, name_hu')
    .eq('id', run.classes_id)
    .single()

  return pickClassDisplayName(cls, 'en')
}
