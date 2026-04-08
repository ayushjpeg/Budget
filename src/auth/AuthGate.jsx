import { useEffect, useMemo, useState } from 'react'

const DEFAULT_BASE_URL = 'https://common-backend.ayux.in/api'
const stripTrailingSlash = (value) => value.replace(/\/$/, '')
const API_BASE_URL = stripTrailingSlash(import.meta.env.VITE_BACKEND_URL || DEFAULT_BASE_URL)

const authStyles = {
  shell: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    padding: '24px',
    background: 'radial-gradient(circle at top, rgba(190, 242, 100, 0.18), transparent 36%), linear-gradient(180deg, #f4f7ec 0%, #edf4e4 100%)',
  },
  card: {
    width: 'min(440px, 100%)',
    padding: '28px',
    borderRadius: '24px',
    background: 'rgba(252, 255, 246, 0.94)',
    boxShadow: '0 22px 60px rgba(68, 87, 38, 0.15)',
    color: '#243018',
  },
  button: {
    width: '100%',
    border: 'none',
    borderRadius: '999px',
    padding: '14px 18px',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    background: '#2f4f20',
    color: '#f7fde9',
  },
  bar: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    padding: '10px 14px',
    borderRadius: '999px',
    background: 'rgba(47, 79, 32, 0.92)',
    color: '#f7fde9',
    boxShadow: '0 12px 30px rgba(68, 87, 38, 0.18)',
  },
  barShell: {
    padding: '12px 12px 0',
  },
  logout: {
    border: '1px solid rgba(247,253,233,0.25)',
    background: 'transparent',
    color: '#f7fde9',
    borderRadius: '999px',
    padding: '8px 12px',
    cursor: 'pointer',
  },
}

async function fetchCurrentUser() {
  const response = await fetch(`${API_BASE_URL}/auth/me`, { credentials: 'include' })
  if (response.status === 401) return null
  if (!response.ok) throw new Error('Failed to load session')
  return response.json()
}

function startGoogleLogin() {
  const origin = window.location.origin
  window.location.href = `${API_BASE_URL}/auth/google/start?redirect_origin=${encodeURIComponent(origin)}`
}

async function logout() {
  await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' })
}

export function AuthGate({ children }) {
  const [status, setStatus] = useState('loading')
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const authError = useMemo(() => new URLSearchParams(window.location.search).get('auth_error') || '', [])

  useEffect(() => {
    let canceled = false
    const load = async () => {
      try {
        const currentUser = await fetchCurrentUser()
        if (canceled) return
        if (!currentUser) {
          setStatus('unauthenticated')
          return
        }
        setUser(currentUser)
        setStatus('authenticated')
      } catch (err) {
        if (canceled) return
        setError(err.message || 'Unable to verify your session.')
        setStatus('unauthenticated')
      }
    }
    load()
    return () => {
      canceled = true
    }
  }, [])

  const handleLogout = async () => {
    await logout()
    setUser(null)
    setStatus('unauthenticated')
  }

  if (status === 'loading') {
    return <div style={authStyles.shell}>Checking your session...</div>
  }

  if (status !== 'authenticated') {
    return (
      <div style={authStyles.shell}>
        <div style={authStyles.card}>
          <p style={{ margin: 0, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.72 }}>
            Budget
          </p>
          <h1 style={{ marginBottom: 8 }}>Sign in to your monthly budget board</h1>
          <p style={{ marginTop: 0, marginBottom: 20, lineHeight: 1.5 }}>
            Your monthly spend, category breakdowns, and every saved entry stay tied to your account.
          </p>
          {(authError || error) && <p style={{ color: '#b42318' }}>{authError || error}</p>}
          <button style={authStyles.button} onClick={startGoogleLogin}>Continue with Google</button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div style={authStyles.barShell}>
        <div style={authStyles.bar}>
          <span style={{ overflowWrap: 'anywhere' }}>{user?.email}</span>
          <button style={authStyles.logout} onClick={handleLogout}>Log out</button>
        </div>
      </div>
      {children}
    </>
  )
}