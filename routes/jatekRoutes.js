import express from 'express'
import {
  register,
  login,
  getMe,
  getMyRuns,
  patchMeSettings,
  patchMeProfile,
} from '../controllers/gameController.js'
import { authenticateToken } from '../middleware/authMiddleware.js'

const router = express.Router()

router.post('/register', register)
router.post('/login', login)
router.get('/me/runs', authenticateToken, getMyRuns)
router.get('/me', authenticateToken, getMe)
router.patch('/me/settings', authenticateToken, patchMeSettings)
router.patch('/me/profile', authenticateToken, patchMeProfile)

export default router
