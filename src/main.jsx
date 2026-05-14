import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/globals.css'

function SimpleApp() {
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h1>CSV Price Updater V2</h1>
      <p>Password: Password123!</p>
      <p>If you can see this, React is working!</p>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SimpleApp />
  </React.StrictMode>,
)
