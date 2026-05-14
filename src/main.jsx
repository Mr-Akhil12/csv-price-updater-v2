import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import './styles/globals.css'

try {
  const root = document.getElementById('root')
  if (!root) {
    document.body.innerHTML = '<div style="padding:40px;text-align:center"><h1>Error: No root element</h1></div>'
  } else {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <AuthProvider>
          <App />
        </AuthProvider>
      </React.StrictMode>,
    )
  }
} catch (e) {
  document.body.innerHTML = '<div style="padding:40px;text-align:center"><h1 style="color:red">Render Error</h1><pre style="text-align:left;padding:16px;background:#f8fafc;border-radius:8px;overflow:auto">' + e.message + '</pre></div>'
}
