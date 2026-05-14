import { useState, useCallback, useMemo } from 'react'
import { useAuth } from './context/AuthContext'
import { parseWixCSV, generateWixCSV, formatPrice } from './lib/utils'

// ─── Step Indicator ───
function StepIndicator({ currentStep }) {
  const steps = [
    { num: 1, label: 'Upload CSV' },
    { num: 2, label: 'Review' },
    { num: 3, label: 'Match' },
    { num: 4, label: 'Export' },
  ]
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, padding: '20px 0' }}>
      {steps.map((s, i) => (
        <div key={s.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 14, zIndex: 1,
            backgroundColor: currentStep >= s.num ? '#3b82f6' : '#e2e8f0',
            color: currentStep >= s.num ? 'white' : '#94a3b8',
          }}>
            {s.num}
          </div>
          <span style={{ fontSize: 12, marginTop: 6, fontWeight: 500, color: currentStep >= s.num ? '#1e293b' : '#94a3b8' }}>{s.label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Toast ───
function Toast({ message, type, onClose }) {
  if (!message) return null
  const colors = type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : '#3b82f6'
  return (
    <div style={{ position: 'fixed', top: 20, right: 20, backgroundColor: colors, color: 'white', padding: '12px 20px', borderRadius: 8, zIndex: 9999, fontSize: 14, fontWeight: 500 }}>
      {message}
      <button onClick={onClose} style={{ marginLeft: 12, background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 16 }}>x</button>
    </div>
  )
}

// ─── Main App ───
export default function App() {
  const { authenticated, login, logout } = useAuth()
  const [step, setStep] = useState(1)
  const [toast, setToast] = useState({ message: '', type: 'info' })
  const [originalCSV, setOriginalCSV] = useState('')
  const [products, setProducts] = useState([])
  const [variants, setVariants] = useState([])
  const [categories, setCategories] = useState([])
  const [referencePrices, setReferencePrices] = useState([])
  const [priceUpdates, setPriceUpdates] = useState({})

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast({ message: '', type: 'info' }), 4000)
  }

  const handleCatalogUpload = useCallback((content, filename) => {
    try {
      setOriginalCSV(content)
      const parsed = parseWixCSV(content)
      setProducts(parsed.products)
      setVariants(parsed.variants)
      setCategories(parsed.categories)
      showToast('Loaded ' + parsed.products.length + ' products and ' + parsed.variants.length + ' variants', 'success')
      setStep(2)
    } catch (err) {
      showToast('Error: ' + err.message, 'error')
    }
  }, [])

  if (!authenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 40, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center', maxWidth: 400, width: '100%' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>CSV Price Updater</h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 24px' }}>Enter password to continue</p>
          <form onSubmit={(e) => { e.preventDefault(); const pwd = e.target.password.value; if (!login(pwd)) showToast('Incorrect password', 'error') }}>
            <input name="password" type="password" placeholder="Password" style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 16, marginBottom: 12, boxSizing: 'border-box' }} />
            <button type="submit" style={{ width: '100%', padding: 12, backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>Unlock</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />

      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>CSV Price Updater</h1>
        <button onClick={logout} style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: 6, backgroundColor: 'white', cursor: 'pointer', fontSize: 13 }}>Logout</button>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
        <StepIndicator currentStep={step} />

        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Upload Product Catalog</h2>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>Upload the CSV file exported from your Wix store</p>
            <div style={{ border: '2px dashed #cbd5e1', borderRadius: 12, padding: '40px 20px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
              <p style={{ fontSize: 16, fontWeight: 600, color: '#334155', margin: '0 0 4px' }}>Upload Wix Product CSV</p>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 12px' }}>Drag & drop or click to browse</p>
              <input type="file" accept=".csv" onChange={(e) => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onload = (ev) => handleCatalogUpload(ev.target.result, f.name); r.readAsText(f) } }} />
            </div>
          </div>
        )}

        {step === 2 && products.length > 0 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Products ({products.length})</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {products.slice(0, 20).map(p => (
                <div key={p.handleId} style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', backgroundColor: 'white' }}>
                  {p.productImageUrl && (
                    <div style={{ width: '100%', height: 160, backgroundColor: '#f1f5f9', overflow: 'hidden' }}>
                      <img src={p.productImageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ padding: 12 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: '0 0 4px' }}>{p.name}</h3>
                    {p.collection && <span style={{ fontSize: 11, padding: '2px 8px', backgroundColor: '#eff6ff', color: '#3b82f6', borderRadius: 4 }}>{p.collection}</span>}
                    <div style={{ marginTop: 8, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{formatPrice(p.price)}</div>
                  </div>
                </div>
              ))}
            </div>
            {products.length > 20 && <p style={{ textAlign: 'center', color: '#64748b', marginTop: 16 }}>Showing 20 of {products.length} products</p>}
            <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
              <button onClick={() => setStep(1)} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: 8, backgroundColor: 'white', cursor: 'pointer' }}>Back</button>
              <button onClick={() => setStep(3)} style={{ padding: '10px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Continue</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Match Prices</h2>
            {referencePrices.length === 0 ? (
              <div>
                <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>Upload your reference price list</p>
                <input type="file" accept=".csv,.xlsx" onChange={(e) => {
                  const f = e.target.files[0]
                  if (!f) return
                  const reader = new FileReader()
                  reader.onload = (ev) => {
                    try {
                      const lines = ev.target.result.split('\n')
                      if (lines.length < 2) { showToast('File is empty', 'error'); return }
                      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
                      let skuIdx = headers.findIndex(h => h.includes('sku'))
                      let rrpIdx = headers.findIndex(h => h.includes('rrp') || h.includes('price'))
                      if (skuIdx === -1 || rrpIdx === -1) { showToast('Could not find SKU/price columns', 'error'); return }
                      const prices = []
                      for (let i = 1; i < lines.length; i++) {
                        const vals = lines[i].split(',').map(v => v.trim())
                        const sku = vals[skuIdx]
                        const rrp = parseFloat(vals[rrpIdx]?.replace(/[^0-9.]/g, ''))
                        if (sku && !isNaN(rrp)) prices.push({ sku: sku.toUpperCase().trim(), rrp })
                      }
                      setReferencePrices(prices)
                      showToast('Loaded ' + prices.length + ' reference prices', 'success')
                    } catch (err) { showToast('Error: ' + err.message, 'error') }
                  }
                  reader.readAsText(f)
                }} />
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 14, color: '#22c55e' }}>Loaded {referencePrices.length} reference prices</p>
                <button onClick={() => setStep(4)} style={{ marginTop: 16, padding: '10px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Continue to Export</button>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Export</h2>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>Download your updated catalog</p>
            <button onClick={() => {
              if (!originalCSV) { showToast('No CSV loaded', 'error'); return }
              const csv = generateWixCSV(originalCSV, priceUpdates)
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'updated_catalog.csv'
              a.click()
              URL.revokeObjectURL(url)
              showToast('Downloaded!', 'success')
            }} style={{ padding: '14px 32px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16, fontWeight: 600 }}>
              Download Updated CSV
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
