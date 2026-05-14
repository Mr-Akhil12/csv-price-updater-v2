import { useState, useCallback, useMemo } from 'react'
import { useAuth } from './context/AuthContext'
import { parseWixCSV, parseReferencePrices, generateWixCSV, formatPrice } from './lib/utils'

/* ─── Step Indicator ─── */
function StepIndicator({ currentStep }) {
  const steps = [
    { num: 1, label: 'Upload CSV' },
    { num: 2, label: 'Review' },
    { num: 3, label: 'Match' },
    { num: 4, label: 'Export' },
  ]
  return (
    <div style={si.wrap}>
      {steps.map((s, i) => (
        <div key={s.num} style={si.stepWrap}>
          <div style={{
            ...si.circle,
            backgroundColor: currentStep >= s.num ? '#3b82f6' : '#e2e8f0',
            color: currentStep >= s.num ? 'white' : '#94a3b8',
          }}>
            {currentStep > s.num ? '✓' : s.num}
          </div>
          <span style={{ ...si.label, color: currentStep >= s.num ? '#1e293b' : '#94a3b8' }}>{s.label}</span>
          {i < steps.length - 1 && <div style={{ ...si.line, backgroundColor: currentStep > s.num ? '#3b82f6' : '#e2e8f0' }} />}
        </div>
      ))}
    </div>
  )
}
const si = {
  wrap: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 0' },
  stepWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative' },
  circle: { width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, zIndex: 1 },
  label: { fontSize: 12, marginTop: 6, fontWeight: 500 },
  line: { position: 'absolute', top: 17, left: '60%', width: '80%', height: 2, zIndex: 0 },
}

/* ─── Toast ─── */
function Toast({ message, type, onClose }) {
  if (!message) return null
  const bg = type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : '#3b82f6'
  return (
    <div style={{ position: 'fixed', top: 20, right: 20, backgroundColor: bg, color: 'white', padding: '12px 20px', borderRadius: 8, zIndex: 9999, fontSize: 14, fontWeight: 500, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
      {message}
      <button onClick={onClose} style={{ marginLeft: 12, background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>×</button>
    </div>
  )
}

/* ─── SKU Diff Modal ─── */
function SkuDiffModal({ discrepancies, onClose, onResolve }) {
  const [actions, setActions] = useState({})

  const handleAction = (sku, action) => setActions(prev => ({ ...prev, [sku]: action }))

  const handleApplyAll = () => {
    const resolved = {}
    discrepancies.forEach(d => { resolved[d.sku] = actions[d.sku] || 'ignore' })
    onResolve(resolved)
  }

  const setAll = (action) => {
    const all = {}
    discrepancies.forEach(d => { all[d.sku] = action })
    setActions(all)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ backgroundColor: 'white', borderRadius: 12, maxWidth: 600, width: '100%', maxHeight: '80vh', overflow: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 24 }}>⚠️</span>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{discrepancies.length} SKUs Not in Price List</h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>These products are on your website but not in the reference price list</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button onClick={() => setAll('ignore')} style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, cursor: 'pointer', backgroundColor: 'white' }}>All: Ignore</button>
          <button onClick={() => setAll('hide')} style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, cursor: 'pointer', backgroundColor: 'white' }}>All: Hide</button>
          <button onClick={() => setAll('delete')} style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, cursor: 'pointer', backgroundColor: 'white' }}>All: Delete</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflow: 'auto' }}>
          {discrepancies.map(d => (
            <div key={d.sku} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name || d.sku}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>SKU: {d.sku} · {formatPrice(d.currentPrice)}</div>
              </div>
              <div style={{ display: 'flex', gap: 4, marginLeft: 12 }}>
                <button onClick={() => handleAction(d.sku, 'ignore')} title="Ignore - keep as is" style={{ padding: 6, border: `1px solid ${actions[d.sku] === 'ignore' ? '#3b82f6' : '#e2e8f0'}`, borderRadius: 4, backgroundColor: actions[d.sku] === 'ignore' ? '#eff6ff' : 'white', cursor: 'pointer', fontSize: 11 }}>Ignore</button>
                <button onClick={() => handleAction(d.sku, 'hide')} title="Hide from store" style={{ padding: 6, border: `1px solid ${actions[d.sku] === 'hide' ? '#f59e0b' : '#e2e8f0'}`, borderRadius: 4, backgroundColor: actions[d.sku] === 'hide' ? '#fffbeb' : 'white', cursor: 'pointer', fontSize: 11 }}>Hide</button>
                <button onClick={() => handleAction(d.sku, 'delete')} title="Remove from export" style={{ padding: 6, border: `1px solid ${actions[d.sku] === 'delete' ? '#ef4444' : '#e2e8f0'}`, borderRadius: 4, backgroundColor: actions[d.sku] === 'delete' ? '#fef2f2' : 'white', cursor: 'pointer', fontSize: 11 }}>Delete</button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: 8, backgroundColor: 'white', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
          <button onClick={handleApplyAll} style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Apply Actions</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main App ─── */
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
  const [showSkuDiff, setShowSkuDiff] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast({ message: '', type: 'info' }), 4000)
  }

  // Parse catalog CSV
  const handleCatalogUpload = useCallback((content, filename) => {
    try {
      setOriginalCSV(content)
      const parsed = parseWixCSV(content)
      setProducts(parsed.products)
      setVariants(parsed.variants)
      setCategories(parsed.categories)
      showToast('Loaded ' + parsed.products.length + ' products, ' + parsed.variants.length + ' variants, ' + parsed.categories.length + ' categories', 'success')
      setStep(2)
    } catch (err) {
      showToast('Error parsing CSV: ' + err.message, 'error')
    }
  }, [])

  // Parse reference prices (CSV or Excel converted to CSV)
  const handleReferenceUpload = useCallback((content, filename) => {
    try {
      const result = parseReferencePrices(content)
      if (result.prices.length === 0) {
        showToast('No valid price data found. Make sure the file has SKU and price columns.', 'error')
        return
      }
      setReferencePrices(result.prices)
      showToast('Loaded ' + result.prices.length + ' reference prices' + (result.skipped > 0 ? ' (' + result.skipped + ' rows skipped)' : ''), 'success')
    } catch (err) {
      showToast('Error: ' + err.message, 'error')
    }
  }, [])

  // Price matching
  const matchedData = useMemo(() => {
    if (!variants.length || !referencePrices.length) return { matched: [], unmatchedVariants: [] }

    const refMap = {}
    referencePrices.forEach(rp => { if (rp.sku) refMap[rp.sku] = rp })

    const matched = []
    const unmatchedVariants = []

    variants.forEach(v => {
      const sku = (v.sku || '').toUpperCase().trim()
      if (!sku) return
      const product = products.find(p => p.handleId === v.productHandleId)
      const basePrice = product ? product.price : 0
      const currentPrice = basePrice + (v.surcharge || 0)
      const ref = refMap[sku]

      if (ref) {
        matched.push({
          sku, productName: product ? product.name : '',
          productImage: product ? product.productImageUrl : '',
          collection: product ? product.collection : '',
          basePrice, currentPrice,
          referencePrice: ref.rrp,
          suggestedSurcharge: Math.round((ref.rrp - basePrice) * 100) / 100,
          priceDifference: Math.round((currentPrice - ref.rrp) * 100) / 100,
        })
      } else {
        unmatchedVariants.push({ sku, productName: product ? product.name : '', currentPrice })
      }
    })

    return { matched, unmatchedVariants }
  }, [variants, referencePrices, products])

  // SKU discrepancies (website SKUs not in pricelist)
  const discrepancies = useMemo(() => {
    if (!variants.length || !referencePrices.length) return []
    const refSkus = new Set(referencePrices.map(rp => (rp.sku || '').toUpperCase().trim()))
    return variants
      .filter(v => { const s = (v.sku || '').toUpperCase().trim(); return s && !refSkus.has(s) })
      .map(v => {
        const product = products.find(p => p.handleId === v.productHandleId)
        return { ...v, name: product ? product.name : '', currentPrice: (product ? product.price : 0) + (v.surcharge || 0) }
      })
  }, [variants, referencePrices, products])

  // Handle SKU diff resolution
  const handleSkuDiffResolve = (actions) => {
    const updates = { ...priceUpdates }
    Object.entries(actions).forEach(([sku, action]) => {
      if (action === 'hide') updates[sku] = { ...updates[sku], visible: false }
      else if (action === 'delete') updates[sku] = { ...updates[sku], visible: false, delete: true }
    })
    setPriceUpdates(updates)
    setShowSkuDiff(false)
    showToast('SKU actions applied', 'success')
  }

  // Apply all suggested prices
  const handleApplyAll = () => {
    const updates = { ...priceUpdates }
    matchedData.matched.forEach(m => { updates[m.sku] = { surcharge: m.suggestedSurcharge } })
    setPriceUpdates(updates)
    showToast('Applied ' + matchedData.matched.length + ' price adjustments', 'success')
  }

  // Export CSV
  const handleExport = () => {
    if (!originalCSV) { showToast('No CSV loaded', 'error'); return }
    const updates = { ...priceUpdates }
    matchedData.matched.forEach(m => { if (!updates[m.sku]) updates[m.sku] = { surcharge: m.suggestedSurcharge } })
    const csv = generateWixCSV(originalCSV, updates)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'updated_catalog.csv'
    a.click()
    URL.revokeObjectURL(url)
    showToast('CSV downloaded!', 'success')
  }

  // Filtered products for grid
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      if (category !== 'all' && p.collection !== category) return false
      return true
    })
  }, [products, search, category])

  // ─── Auth Gate ───
  if (!authenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: 20 }}>
        <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 40, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center', maxWidth: 400, width: '100%' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <span style={{ fontSize: 28 }}>🔒</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>CSV Price Updater</h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 24px' }}>Enter password to continue</p>
          <form onSubmit={(e) => { e.preventDefault(); if (!login(e.target.password.value)) showToast('Incorrect password', 'error') }}>
            <input name="password" type="password" placeholder="Password" autoFocus style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 16, marginBottom: 12, boxSizing: 'border-box' }} />
            <button type="submit" style={{ width: '100%', padding: 12, backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>Unlock</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
      {showSkuDiff && <SkuDiffModal discrepancies={discrepancies} onClose={() => setShowSkuDiff(false)} onResolve={handleSkuDiffResolve} />}

      {/* Header */}
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>CSV Price Updater</h1>
          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Update your Wix store pricing</p>
        </div>
        <button onClick={logout} style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: 6, backgroundColor: 'white', cursor: 'pointer', fontSize: 13, color: '#64748b' }}>Logout</button>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
        <StepIndicator currentStep={step} />

        {/* ─── Step 1: Upload ─── */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Upload Product Catalog</h2>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>Upload the CSV file exported from your Wix store products</p>
            <div style={{ border: '2px dashed #cbd5e1', borderRadius: 12, padding: '40px 20px', textAlign: 'center', backgroundColor: '#f8fafc', cursor: 'pointer' }}>
              <span style={{ fontSize: 40, display: 'block', marginBottom: 12 }}>📄</span>
              <p style={{ fontSize: 16, fontWeight: 600, color: '#334155', margin: '0 0 4px' }}>Upload Wix Product CSV</p>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 12px' }}>Drag & drop or click to browse</p>
              <input type="file" accept=".csv" onChange={(e) => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onload = (ev) => handleCatalogUpload(ev.target.result, f.name); r.readAsText(f) } }} style={{ display: 'inline-block' }} />
            </div>
            {products.length > 0 && (
              <div style={{ marginTop: 20, padding: 16, backgroundColor: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, color: '#166534', fontWeight: 600 }}>✅ {products.length} products, {variants.length} variants loaded</span>
                <button onClick={() => setStep(2)} style={{ padding: '10px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Continue →</button>
              </div>
            )}
          </div>
        )}

        {/* ─── Step 2: Review ─── */}
        {step === 2 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: 0 }}>Products ({products.length})</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setStep(1)} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: 8, backgroundColor: 'white', cursor: 'pointer', fontSize: 14 }}>← Back</button>
                <button onClick={() => setStep(3)} style={{ padding: '10px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Continue →</button>
              </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <span style={{ position: 'absolute', left: 12, top: 10 }}>🔍</span>
                <input type="text" placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, minWidth: 160 }}>
                <option value="all">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>{filteredProducts.length} products found</div>

            {/* Product Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {filteredProducts.slice(0, 50).map(p => {
                const pVars = variants.filter(v => v.productHandleId === p.handleId)
                return (
                  <div key={p.handleId} style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', backgroundColor: 'white' }}>
                    {p.productImageUrl && (
                      <div style={{ width: '100%', height: 150, backgroundColor: '#f1f5f9', overflow: 'hidden' }}>
                        <img src={p.productImageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none' }} />
                      </div>
                    )}
                    <div style={{ padding: 12 }}>
                      <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: '0 0 4px', lineHeight: 1.3 }}>{p.name}</h3>
                      {p.collection && <span style={{ display: 'inline-block', fontSize: 10, padding: '2px 6px', backgroundColor: '#eff6ff', color: '#3b82f6', borderRadius: 4, marginBottom: 6 }}>{p.collection}</span>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{formatPrice(p.price)}</span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{pVars.length} vars</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {filteredProducts.length > 50 && <p style={{ textAlign: 'center', color: '#64748b', marginTop: 16, fontSize: 13 }}>Showing 50 of {filteredProducts.length}</p>}
          </div>
        )}

        {/* ─── Step 3: Match ─── */}
        {step === 3 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: 0 }}>Match Prices</h2>
              <button onClick={() => setStep(2)} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: 8, backgroundColor: 'white', cursor: 'pointer', fontSize: 14 }}>← Back</button>
            </div>

            {referencePrices.length === 0 ? (
              <div>
                <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>Upload your reference price list (CSV with SKU and price columns)</p>
                <input type="file" accept=".csv,.xlsx" onChange={(e) => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onload = (ev) => handleReferenceUpload(ev.target.result); r.readAsText(f) } }} />
              </div>
            ) : (
              <div>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
                  <div style={{ padding: 16, backgroundColor: 'white', borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>{matchedData.matched.length}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Matched</div>
                  </div>
                  <div style={{ padding: 16, backgroundColor: 'white', borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b' }}>{discrepancies.length}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Not in Pricelist</div>
                  </div>
                  <div style={{ padding: 16, backgroundColor: 'white', borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#22c55e' }}>{referencePrices.length}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Reference Prices</div>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                  <button onClick={handleApplyAll} style={{ padding: '10px 20px', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Apply All Suggested Prices</button>
                  {discrepancies.length > 0 && (
                    <button onClick={() => setShowSkuDiff(true)} style={{ padding: '10px 20px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>⚠️ Review {discrepancies.length} Discrepancies</button>
                  )}
                  <button onClick={() => setStep(4)} style={{ padding: '10px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, marginLeft: 'auto' }}>Continue to Export →</button>
                </div>

                {/* Matched table */}
                <div style={{ backgroundColor: 'white', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 600, fontSize: 14 }}>Matched Products ({matchedData.matched.length})</div>
                  <div style={{ maxHeight: 400, overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', position: 'sticky', top: 0 }}>
                          <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Product</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>SKU</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Current</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>RRP</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Diff</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>New Surcharge</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matchedData.matched.slice(0, 100).map((m, i) => (
                          <tr key={m.sku + i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 12px', color: '#1e293b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.productName}</td>
                            <td style={{ padding: '8px 12px', color: '#64748b', fontFamily: 'monospace', fontSize: 11 }}>{m.sku}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{formatPrice(m.currentPrice)}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{formatPrice(m.referencePrice)}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', color: m.priceDifference > 0 ? '#ef4444' : m.priceDifference < 0 ? '#22c55e' : '#64748b' }}>
                              {m.priceDifference > 0 ? '+' : ''}{formatPrice(m.priceDifference)}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', color: '#3b82f6', fontWeight: 600 }}>{formatPrice(m.suggestedSurcharge)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Step 4: Export ─── */}
        {step === 4 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: 0 }}>Export</h2>
              <button onClick={() => setStep(3)} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: 8, backgroundColor: 'white', cursor: 'pointer', fontSize: 14 }}>← Back</button>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: 40, textAlign: 'center' }}>
              <span style={{ fontSize: 48, display: 'block', marginBottom: 16 }}>📥</span>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Ready to Export</h3>
              <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>Your updated catalog CSV is ready for Wix import</p>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
                <button onClick={handleExport} style={{ padding: '14px 32px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16, fontWeight: 600 }}>📥 Download Updated CSV</button>
              </div>

              <div style={{ padding: 16, backgroundColor: '#f8fafc', borderRadius: 8, textAlign: 'left', maxWidth: 400, margin: '0 auto' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: '0 0 8px' }}>Summary:</p>
                <ul style={{ fontSize: 13, color: '#64748b', margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
                  <li>{matchedData.matched.length} products with matched prices</li>
                  <li>{Object.keys(priceUpdates).filter(k => priceUpdates[k]?.visible === false).length} products hidden</li>
                  <li>{Object.keys(priceUpdates).filter(k => priceUpdates[k]?.delete).length} products marked for deletion</li>
                  <li>Original CSV format preserved for Wix import</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
