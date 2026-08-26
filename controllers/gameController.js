import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserPreferences,
  updateUserProfileIcon,
} from '../models/gameModell.js'
import { isValidProfileIconValue } from '../models/avatarThemeWhitelist.js'
import { getRecentRunsForUser } from '../models/scoreModell.js'

export async function register(req, res) {
  console.log(req.body)
  const { email, name, password } = req.body

  if (!email || !name || !password) {
    return res.status(400).json({ error: 'Hiányzó adat' })
  }

  try {
    const password_hash = await bcrypt.hash(password, 10)
    const { data, error } = await createUser(email, name, password_hash)

    if (error) return res.status(400).json({ error: error.message })

    res.status(201).json({
      message: 'Sikeres regisztráció',
      user: {
        id: data.id,
        email: data.email,
        name: data.name,
      },
    })
  } catch {
    res.status(500).json({ error: 'Szerver hiba' })
  }
}

export async function login(req, res) {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Hiányzó adat' })
  }

  try {
    const { data: user, error } = await findUserByEmail(email)

    if (error || !user) {
      return res.status(401).json({ error: 'Hibás email vagy jelszó' })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ error: 'Hibás email vagy jelszó' })
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set in environment (required for login tokens).')
      return res.status(500).json({
        error: 'Szerver konfigurációs hiba (hiányzó JWT_SECRET)',
      })
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' })

    res.json({
      message: 'Sikeres bejelentkezés',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        highscore: user.highscore,
        profile_icon: user.profile_icon ?? null,
      },
    })
  } catch {
    res.status(500).json({ error: 'Szerver hiba' })
  }
}

/** GET /me/runs?lang=hu|en — last 5 runs for the authenticated user */
export async function getMyRuns(req, res) {
  try {
    const q = req.query?.lang
    const lang = q === 'en' || q === 'hu' ? q : 'hu'
    const { data, error } = await getRecentRunsForUser(req.user.userId, 5, lang)
    if (error) {
      const msg = typeof error.message === 'string' ? error.message : 'Runs query failed'
      return res.status(400).json({ error: msg })
    }
    res.json(data ?? [])
  } catch {
    res.status(500).json({ error: 'Szerver hiba' })
  }
}

/** GET /me — requires Authorization: Bearer <token> */
export async function getMe(req, res) {
  try {
    const { data, error } = await findUserById(req.user.userId)
    if (error || !data) {
      return res.status(404).json({ error: 'Felhasználó nem található' })
    }
    res.json({
      id: data.id,
      email: data.email,
      name: data.name,
      highscore: data.highscore,
      profile_icon: data.profile_icon ?? null,
      anonymity_mode: data.anonymity_mode ?? false,
      theme: data.theme ?? 'light',
      language: data.language ?? 'hu',
    })
  } catch {
    res.status(500).json({ error: 'Szerver hiba' })
  }
}

/** PATCH /me/settings — anonymity, theme, language (requires JWT) */
export async function patchMeSettings(req, res) {
  const userId = req.user.userId
  const { anonymity_mode, theme, language } = req.body ?? {}

  const updates = {}
  if (typeof anonymity_mode === 'boolean') updates.anonymity_mode = anonymity_mode
  if (theme === 'light' || theme === 'dark') updates.theme = theme
  if (language === 'en' || language === 'hu') updates.language = language

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Nincs érvényes mező (anonymity_mode, theme, language)' })
  }

  try {
    const { data, error } = await updateUserPreferences(userId, updates)
    if (error) return res.status(400).json({ error: error.message })
    res.json({
      anonymity_mode: data.anonymity_mode,
      theme: data.theme,
      language: data.language,
    })
  } catch {
    res.status(500).json({ error: 'Szerver hiba' })
  }
}

/** PATCH /me/profile — profile_icon (image URL/path, theme:id, or null) */
export async function patchMeProfile(req, res) {
  const userId = req.user.userId
  if (!Object.prototype.hasOwnProperty.call(req.body ?? {}, 'profile_icon')) {
    return res.status(400).json({ error: 'Hiányzó profile_icon mező' })
  }

  let value = req.body.profile_icon
  if (value === null || value === undefined || value === '') {
    value = null
  } else {
    value = String(value).trim()
    if (value === '') value = null
  }

  if (value != null && !isValidProfileIconValue(value)) {
    return res.status(400).json({ error: 'Érvénytelen profile_icon' })
  }

  try {
    const { data, error } = await updateUserProfileIcon(userId, value)
    if (error) return res.status(400).json({ error: error.message })
    res.json({ profile_icon: data.profile_icon ?? null })
  } catch {
    res.status(500).json({ error: 'Szerver hiba' })
  }
}
