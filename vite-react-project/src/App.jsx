import { useEffect, useRef, useState } from 'react'
import './App.css'

const API_BASE = '/api'

function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isOnline, setIsOnline] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((res) => res.ok && setIsOnline(true))
      .catch(() => setIsOnline(false))
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  async function sendMessage(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return

    setInput('')
    setError(null)
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setIsLoading(true)

    try {
      const res = await fetch(`${API_BASE}/chat/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, session_id: sessionId }),
      })

      if (!res.ok) {
        const detail = await res.json().catch(() => ({}))
        throw new Error(detail.detail || `Request failed (${res.status})`)
      }

      const data = await res.json()
      setSessionId(data.session_id)
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response }])
      setIsOnline(true)
    } catch (err) {
      setError(err.message || 'Something went wrong. Is the backend running?')
      setIsOnline(false)
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  function startNewChat() {
    setMessages([])
    setSessionId(null)
    setError(null)
    inputRef.current?.focus()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(e)
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-brand">
          <h1>Ollama Chat</h1>
          <p>Powered by FastAPI, LangChain &amp; Ollama</p>
        </div>
        <div className="header-actions">
          <span className={`status ${isOnline === null ? 'checking' : isOnline ? 'online' : 'offline'}`}>
            {isOnline === null ? 'Checking…' : isOnline ? 'Connected' : 'Offline'}
          </span>
          <button type="button" className="btn-secondary" onClick={startNewChat} disabled={isLoading}>
            New chat
          </button>
        </div>
      </header>

      <main className="chat">
        {messages.length === 0 && !isLoading && (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h2>Start a conversation</h2>
            <p>Ask anything — your messages are sent to a local Ollama model via the FastAPI backend.</p>
            <div className="suggestions">
              {['Tell me a joke', 'Explain React hooks', 'Write a haiku about coding'].map((s) => (
                <button
                  key={s}
                  type="button"
                  className="suggestion"
                  onClick={() => setInput(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <ul className="messages">
          {messages.map((msg, i) => (
            <li key={i} className={`message message--${msg.role}`}>
              <span className="message-label">{msg.role === 'user' ? 'You' : 'Assistant'}</span>
              <div className="message-bubble">{msg.content}</div>
            </li>
          ))}
          {isLoading && (
            <li className="message message--assistant">
              <span className="message-label">Assistant</span>
              <div className="message-bubble message-bubble--loading">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            </li>
          )}
          <li ref={messagesEndRef} />
        </ul>

        {error && (
          <div className="error-banner" role="alert">
            {error}
            <span className="error-hint">Run <code>uvicorn main:app --reload</code> from the project root.</span>
          </div>
        )}
      </main>

      <footer className="composer">
        <form onSubmit={sendMessage}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
            rows={1}
            disabled={isLoading}
          />
          <button type="submit" className="btn-primary" disabled={isLoading || !input.trim()}>
            Send
          </button>
        </form>
      </footer>
    </div>
  )
}

export default App
