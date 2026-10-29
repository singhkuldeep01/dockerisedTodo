import { Router, Request, Response } from 'express'
import pool from '../db'
import { ResultSetHeader, RowDataPacket } from 'mysql2'

const router = Router()

// ── GET /api/todos ────────────────────────────────
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM todos ORDER BY created_at DESC'
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch todos' })
  }
})

// ── POST /api/todos ───────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const { text } = req.body as { text?: string }
  if (!text || !text.trim()) {
    res.status(400).json({ error: 'text is required' })
    return
  }
  try {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO todos (text) VALUES (?)',
      [text.trim()]
    )
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM todos WHERE id = ?',
      [result.insertId]
    )
    res.status(201).json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create todo' })
  }
})

// ── PATCH /api/todos/:id ──────────────────────────
router.patch('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const { done, text } = req.body as { done?: boolean; text?: string }

  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' })
    return
  }

  try {
    // Build dynamic update
    const fields: string[] = []
    const values: (boolean | string | number)[] = []

    if (done !== undefined) { fields.push('done = ?'); values.push(done) }
    if (text !== undefined) { fields.push('text = ?'); values.push(text.trim()) }

    if (fields.length === 0) {
      res.status(400).json({ error: 'Nothing to update' })
      return
    }

    values.push(id)
    await pool.query<ResultSetHeader>(
      `UPDATE todos SET ${fields.join(', ')} WHERE id = ?`,
      values
    )

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM todos WHERE id = ?',
      [id]
    )

    if ((rows as RowDataPacket[]).length === 0) {
      res.status(404).json({ error: 'Todo not found' })
      return
    }

    res.json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update todo' })
  }
})

// ── DELETE /api/todos/:id ─────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' })
    return
  }
  try {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM todos WHERE id = ?',
      [id]
    )
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Todo not found' })
      return
    }
    res.json({ message: 'Deleted successfully' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete todo' })
  }
})

// ── DELETE /api/todos/done (clear completed) ──────
router.delete('/', async (req: Request, res: Response) => {
  const { clearDone } = req.query
  if (clearDone !== 'true') {
    res.status(400).json({ error: 'Use ?clearDone=true to clear completed todos' })
    return
  }
  try {
    await pool.query('DELETE FROM todos WHERE done = TRUE')
    res.json({ message: 'Cleared completed todos' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to clear todos' })
  }
})

export default router
