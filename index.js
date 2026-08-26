import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import jatekRoutes from './routes/jatekRoutes.js'
import scoreRoutes from './routes/scoreRoutes.js'
import gameDataRoutes from './routes/gameDataRoutes.js'
import path from 'path'
import { fileURLToPath } from 'url'

const app = express()
app.use(cors())
app.use(express.json())
app.use(jatekRoutes)
app.use(scoreRoutes)
app.use(gameDataRoutes)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
app.use(express.static(path.join(__dirname, 'Public')))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Public', 'login', 'login.html'))
})

app.listen(3000, () => {
  console.log('A szerver fut: http://localhost:3000')
})
