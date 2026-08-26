import jwt from 'jsonwebtoken'
import { updateHighscore, getLeaderboard, createRun } from '../models/scoreModell.js'

/** Optional Bearer token: returns userId if valid, else null (leaderboard stays public). */
function getOptionalUserIdFromRequest(req) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token || !process.env.JWT_SECRET) return null
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    return payload.userId ?? null
  } catch {
    return null
  }
}

export async function saveScore(req, res) {
  const userId = req.user.userId
  const { score, classId } = req.body

  if (score == null) {
    return res.status(400).json({ error: 'Pontszám hiányzik' })
  }

  const { error: runError } = await createRun({
    userId,
    classId,
    score,
  })
  if (runError) {
    return res.status(400).json({ error: runError.message ?? runError })
  }

  const { error } = await updateHighscore(userId, score)

  if (error) {
    return res.status(400).json({ error })
  }

  res.json({ message: 'Pontszám mentve' })
}

export async function leaderboard(req, res) {
  const currentUserId = getOptionalUserIdFromRequest(req)
  const { data, error } = await getLeaderboard(currentUserId)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.json(data)
}
