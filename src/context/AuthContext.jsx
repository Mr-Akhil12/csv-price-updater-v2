import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')

  const login = (pwd) => {
    const correctPwd = import.meta.env.VITE_APP_PASSWORD || 'Password123!'
    if (pwd === correctPwd) {
      setAuthenticated(true)
      sessionStorage.setItem('auth', 'true')
      return true
    }
    return false
  }

  const logout = () => {
    setAuthenticated(false)
    sessionStorage.removeItem('auth')
  }

  useEffect(() => {
    if (sessionStorage.getItem('auth') === 'true') {
      setAuthenticated(true)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ authenticated, login, logout, password, setPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
