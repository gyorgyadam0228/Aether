import express from 'express'
import { getGameData } from '../controllers/gameDataController.js'

const router = express.Router()

router.get('/game-data', getGameData)

export default router
