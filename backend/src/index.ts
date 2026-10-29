import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import pool from './db'
import todosRouter from './routes/todos'

dotenv.config()

const app = express()
const PORT = Number(process.env.PORT) || 3001

// ── Middleware ────────────────────────────────────
app.use(cors()); 
app.use(express.json())

// ── Health check ──────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── Routes ────────────────────────────────────────
app.use('/api/todos', todosRouter)

// ── Boot ──────────────────────────────────────────
async function start() {
  try {
    // Verify DB connection and ensure table exists
    const conn = await pool.getConnection()

    await conn.query(`
      CREATE DATABASE IF NOT EXISTS \`myTodo\`
    `)
    await conn.query(`USE \`myTodo\``)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        text       VARCHAR(500)  NOT NULL,
        done       BOOLEAN       NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `)

    conn.release()
    console.log('✅ MySQL connected — database & table ready')

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    })
  } catch (err) {
    console.error('❌ Failed to connect to MySQL:', err)
    process.exit(1)
  }
}

start()
