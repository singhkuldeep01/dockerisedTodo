import { useState, useEffect, useRef } from 'react'
import './App.css'

const API = 'http://localhost:3001/api/todos'

interface Todo {
  id: number
  text: string
  done: boolean   // normalized from MySQL TINYINT(1)
  created_at: string
}

type Filter = 'all' | 'active' | 'done'

function App() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Fetch all todos ──────────────────────────────
  useEffect(() => {
    fetch(API)
      .then((r) => r.json())
      // MySQL returns done as 0/1 — normalize to real boolean
      .then((data: Todo[]) => {
        setTodos(data.map((t) => ({ ...t, done: !!t.done })))
        setLoading(false)
      })
      .catch(() => { setError('Cannot reach the server.'); setLoading(false) })
  }, [])

  // ── Add todo ─────────────────────────────────────
  const addTodo = async () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const created: Todo = await res.json()
      setTodos((prev) => [{ ...created, done: !!created.done }, ...prev])
    } catch {
      setError('Failed to add todo.')
    }
    inputRef.current?.focus()
  }

  // ── Toggle done ──────────────────────────────────
  const toggleTodo = async (todo: Todo) => {
    try {
      const res = await fetch(`${API}/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: !todo.done }),
      })
      const updated: Todo = await res.json()
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? { ...updated, done: !!updated.done } : t)))
    } catch {
      setError('Failed to update todo.')
    }
  }

  // ── Delete todo ──────────────────────────────────
  const deleteTodo = async (id: number) => {
    try {
      await fetch(`${API}/${id}`, { method: 'DELETE' })
      setTodos((prev) => prev.filter((t) => t.id !== id))
    } catch {
      setError('Failed to delete todo.')
    }
  }

  // ── Clear completed ──────────────────────────────
  const clearDone = async () => {
    try {
      await fetch(`${API}?clearDone=true`, { method: 'DELETE' })
      setTodos((prev) => prev.filter((t) => !t.done))
    } catch {
      setError('Failed to clear completed todos.')
    }
  }

  const filtered = todos.filter((t) => {
    if (filter === 'active') return !t.done
    if (filter === 'done') return t.done
    return true
  })

  const activeCount = todos.filter((t) => !t.done).length

  return (
    <main id="app">
      <div className="card">
        {/* Header */}
        <header className="todo-header">
          <h1>My Tasks</h1>
          <p className="subtitle">
            {loading
              ? 'Loading…'
              : activeCount === 0
              ? 'All caught up! 🎉'
              : `${activeCount} task${activeCount !== 1 ? 's' : ''} remaining`}
          </p>
        </header>

        {/* Error banner */}
        {error && (
          <div className="error-banner" role="alert">
            ⚠️ {error}
            <button className="error-dismiss" onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {/* Input row */}
        <div className="todo-input-row">
          <input
            id="todo-input"
            ref={inputRef}
            type="text"
            className="todo-input"
            placeholder="Add a new task…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTodo()}
            aria-label="New task"
            disabled={loading}
          />
          <button
            id="add-btn"
            type="button"
            className="btn btn--primary"
            onClick={addTodo}
            disabled={loading}
          >
            Add
          </button>
        </div>

        {/* Filter tabs */}
        <div className="todo-tabs" role="tablist" aria-label="Filter tasks">
          {(['all', 'active', 'done'] as Filter[]).map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              className={`tab ${filter === f ? 'tab--active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Task list */}
        <ul className="todo-list" aria-label="Task list" aria-live="polite">
          {loading ? (
            <li className="todo-empty">Loading tasks…</li>
          ) : filtered.length === 0 ? (
            <li className="todo-empty">
              {filter === 'done'
                ? 'No completed tasks yet.'
                : filter === 'active'
                ? 'No active tasks — add one above!'
                : 'No tasks yet — add one above!'}
            </li>
          ) : (
            filtered.map((todo) => (
              <li
                key={todo.id}
                className={`todo-item ${todo.done ? 'todo-item--done' : ''}`}
              >
                <button
                  type="button"
                  className="todo-check"
                  aria-label={todo.done ? 'Mark incomplete' : 'Mark complete'}
                  onClick={() => toggleTodo(todo)}
                >
                  {todo.done && (
                    <svg viewBox="0 0 12 10" fill="none" aria-hidden="true">
                      <path
                        d="M1 5l3.5 3.5L11 1"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
                <span className="todo-text">{todo.text}</span>
                <button
                  type="button"
                  className="todo-delete"
                  aria-label="Delete task"
                  onClick={() => deleteTodo(todo.id)}
                >
                  <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path
                      d="M2 2l10 10M12 2L2 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </li>
            ))
          )}
        </ul>

        {/* Footer */}
        {todos.some((t) => t.done) && (
          <footer className="todo-footer">
            <button type="button" className="btn btn--ghost" onClick={clearDone}>
              Clear completed
            </button>
          </footer>
        )}
      </div>
    </main>
  )
}

export default App
