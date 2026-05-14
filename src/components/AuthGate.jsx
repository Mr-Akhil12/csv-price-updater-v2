import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Lock } from 'lucide-react'

export default function AuthGate({ children }) {
  const { authenticated, login } = useAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  if (authenticated) return children

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!login(password)) {
      setError(true)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconWrap}>
          <Lock size={32} color="#3b82f6" />
        </div>
        <h1 style={styles.title}>CSV Price Updater</h1>
        <p style={styles.subtitle}>Enter password to continue</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false) }}
            placeholder="Password"
            style={{ ...styles.input, borderColor: error ? '#ef4444' : '#d1d5db' }}
            autoFocus
          />
          {error && <p style={styles.error}>Incorrect password</p>}
          <button type="submit" style={styles.button}>Unlock</button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    padding: '20px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '40px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    textAlign: 'center',
    maxWidth: '400px',
    width: '100%',
  },
  iconWrap: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
  },
  title: { fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: '0 0 8px' },
  subtitle: { fontSize: '14px', color: '#64748b', margin: '0 0 24px' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: {
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  button: {
    padding: '12px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  error: { color: '#ef4444', fontSize: '13px', margin: 0 },
}
