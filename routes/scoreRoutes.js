import express from 'express'
import { saveScore, leaderboard } from '../controllers/scoreController.js'
import { authenticateToken } from '../middleware/authMiddleware.js'

const router = express.Router()

router.post('/score', authenticateToken, saveScore)
router.get('/leaderboard', leaderboard)

export default router
