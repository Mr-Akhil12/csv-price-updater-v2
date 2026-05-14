import { useState, useCallback, useMemo } from 'react'
import { useAuth } from './context/AuthContext'
import { parseWixCSV, generateWixCSV, formatPrice, matchPrices, findSkuDiscrepancies } from './lib/utils'
import { Upload, FileText, CheckCircle, Download, Search, Filter, ArrowRight, ArrowLeft, LogOut, AlertTriangle, Eye, EyeOff, Trash2 } from 'lucide-react'

// ─── Step Indicator ───
function StepIndicator({ currentStep }) {
  const steps = [
    { num: 1, label: 'Upload CSV' },
    { num: 2, label: 'Review Products' },
    { num: 3, label: 'Match Prices' },
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
            {currentStep > s.num ? <CheckCircle size={16} /> : s.num}
          </div>
          <span style={{ ...si.label, color: currentStep >= s.num ? '#1e293b' : '#94a3b8' }}>{s.label}</span>
          {i < steps.length - 1 && <div style={{ ...si.line, backgroundColor: currentStep > s.num ? '#3b82f6' : '#e2e8f0' }} />}
        </div>
      ))}
    </div>
  )
}

const si = {
  wrap: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, padding: '20px 0', position: 'relative' },
  stepWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', flex: 1 },
  circle: { width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, zIndex: 1 },
  label: { fontSize: 12, marginTop: 6, fontWeight: 500 },
  line: { position: 'absolute', top: 17, left: '50%', width: '100%', height: 2, zIndex: 0 },
}

// ─── Toast ───
function Toast({ message, type, onClose }) {
  if (!message) return null
  const colors = type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : '#3b82f6'
  return (
    <div style={{ position: 'fixed', top: 20, right: 20, backgroundColor: colors, color: 'white', padding: '12px 20px', borderRadius: 8, zIndex: 9999, fontSize: 14, fontWeight: 500, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
      {message}
      <button onClick={onClose} style={{ marginLeft: 12, background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 16 }}>×</button>
    </div>
  )
}

// ─── Upload Dropzone ───
function UploadDropzone({ onUpload, accept, label, icon: Icon }) {
  const [dragOver, setDragOver] = useState(false)

  const handleFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => onUpload(e.target.result, file.name)
    reader.readAsText(file)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
      style={{
        border: `2px dashed ${dragOver ? '#3b82f6' : '#cbd5e1'}`,
        borderRadius: 12,
        padding: '40px 20px',
        textAlign: 'center',
        backgroundColor: dragOver ? '#eff6ff' : '#f8fafc',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <Icon size={40} color={dragOver ? '#3b82f6' : '#94a3b8'} style={{ marginBottom: 12 }} />
      <p style={{ fontSize: 16, fontWeight: 600, color: '#334155', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Drag & drop or click to browse</p>
      <input type="file" accept={accept} onChange={(e) => handleFile(e.target.files[0])} style={{ display: 'none' }} id={`file-${label}`} />
      <label htmlFor={`file-${label}`} style={{ display: 'inline-block', marginTop: 12, padding: '8px 20px', backgroundColor: '#3b82f6', color: 'white', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
        Choose File
      </label>
    </div>
  )
}

// ─── Product Grid ───
function ProductGrid({ products, variants, onSelectProduct, selectedHandleId }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [priceRange, setPriceRange] = useState('all')

  const categories = useMemo(() => {
    const cats = new Set()
    products.forEach(p => { if (p.collection) cats.add(p.collection) })
    return ['all', ...Array.from(cats).sort()]
  }, [products])

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      if (category !== 'all' && p.collection !== category) return false
      if (priceRange !== 'all') {
        const price = p.price
        if (priceRange === 'under500' && price >= 500) return false
        if (priceRange === '500-1000' && (price < 500 || price >= 1000)) return false
        if (priceRange === '1000-5000' && (price < 1000 || price >= 5000)) return false
        if (priceRange === 'over5000' && price < 5000) return false
      }
      return true
    })
  }, [products, search, category, priceRange])

  const getVariantsForProduct = (handleId) => variants.filter(v => v.productHandleId === handleId)

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, minWidth: 150 }}>
          {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
        </select>
        <select value={priceRange} onChange={(e) => setPriceRange(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, minWidth: 150 }}>
          <option value="all">All Prices</option>
          <option value="under500">Under R500</option>
          <option value="500-1000">R500 - R1,000</option>
          <option value="1000-5000">R1,000 - R5,000</option>
          <option value="over5000">Over R5,000</option>
        </select>
      </div>

      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>{filtered.length} products found</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {filtered.map(product => {
          const pVariants = getVariantsForProduct(product.handleId)
          const isSelected = selectedHandleId === product.handleId
          return (
            <div
              key={product.handleId}
              onClick={() => onSelectProduct(isSelected ? null : product.handleId)}
              style={{
                border: `2px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`,
                borderRadius: 10,
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backgroundColor: 'white',
              }}
            >
              {product.productImageUrl && (
                <div style={{ width: '100%', height: 160, backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <img src={product.productImageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none' }} />
                </div>
              )}
              <div style={{ padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0, flex: 1, lineHeight: 1.3 }}>{product.name}</h3>
                </div>
                {product.collection && (
                  <span style={{ display: 'inline-block', fontSize: 11, padding: '2px 8px', backgroundColor: '#eff6ff', color: '#3b82f6', borderRadius: 4, marginBottom: 6 }}>{product.collection}</span>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{formatPrice(product.price)}</span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{pVariants.length} variant{pVariants.length !== 1 ? 's' : ''}</span>
                </div>
                {pVariants.length > 0 && (
                  <div style={{ marginTop: 6, fontSize: 11, color: '#94a3b8' }}>
                    SKUs: {pVariants.map(v => v.sku).filter(Boolean).slice(0, 3).join(', ')}{pVariants.length > 3 ? '...' : ''}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── SKU Diff Modal ───
function SkuDiffModal({ discrepancies, onClose, onResolve }) {
  const [actions, setActions] = useState({})

  const handleAction = (sku, action) => {
    setActions(prev => ({ ...prev, [sku]: action }))
  }

  const handleApplyAll = () => {
    const resolved = {}
    discrepancies.forEach(d => {
      resolved[d.sku] = actions[d.sku] || 'ignore'
    })
    onResolve(resolved)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ backgroundColor: 'white', borderRadius: 12, maxWidth: 600, width: '100%', maxHeight: '80vh', overflow: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <AlertTriangle size={24} color="#f59e0b" />
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{discrepancies.length} SKUs Not in Price List</h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>These products are on your website but not in the reference price list</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button onClick={() => { const all = {}; discrepancies.forEach(d => { all[d.sku] = 'ignore' }); setActions(all) }} style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, cursor: 'pointer', backgroundColor: 'white' }}>All: Ignore</button>
          <button onClick={() => { const all = {}; discrepancies.forEach(d => { all[d.sku] = 'hide' }); setActions(all) }} style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, cursor: 'pointer', backgroundColor: 'white' }}>All: Hide</button>
          <button onClick={() => { const all = {}; discrepancies.forEach(d => { all[d.sku] = 'delete' }); setActions(all) }} style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, cursor: 'pointer', backgroundColor: 'white' }}>All: Delete</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {discrepancies.map(d => (
            <div key={d.sku} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{d.name || d.sku}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>SKU: {d.sku} · Current: {formatPrice(d.currentPrice)}</div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => handleAction(d.sku, 'ignore')} title="Ignore" style={{ padding: 6, border: `1px solid ${actions[d.sku] === 'ignore' ? '#3b82f6' : '#e2e8f0'}`, borderRadius: 4, backgroundColor: actions[d.sku] === 'ignore' ? '#eff6ff' : 'white', cursor: 'pointer' }}><Eye size={14} /></button>
                <button onClick={() => handleAction(d.sku, 'hide')} title="Hide" style={{ padding: 6, border: `1px solid ${actions[d.sku] === 'hide' ? '#f59e0b' : '#e2e8f0'}`, borderRadius: 4, backgroundColor: actions[d.sku] === 'hide' ? '#fffbeb' : 'white', cursor: 'pointer' }}><EyeOff size={14} /></button>
                <button onClick={() => handleAction(d.sku, 'delete')} title="Delete" style={{ padding: 6, border: `1px solid ${actions[d.sku] === 'delete' ? '#ef4444' : '#e2e8f0'}`, borderRadius: 4, backgroundColor: actions[d.sku] === 'delete' ? '#fef2f2' : 'white', cursor: 'pointer' }}><Trash2 size={14} /></button>
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

// ─── Main App ───
export default function App() {
  const { authenticated, logout } = useAuth()
  const [step, setStep] = useState(1)
  const [toast, setToast] = useState({ message: '', type: 'info' })
  const [originalCSV, setOriginalCSV] = useState('')
  const [products, setProducts] = useState([])
  const [variants, setVariants] = useState([])
  const [categories, setCategories] = useState([])
  const [referencePrices, setReferencePrices] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [priceUpdates, setPriceUpdates] = useState({})
  const [showSkuDiff, setShowSkuDiff] = useState(false)
  const [skuDiscrepancies, setSkuDiscrepancies] = useState([])

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast({ message: '', type: 'info' }), 4000)
  }

  // ─── Step 1: Upload ───
  const handleCatalogUpload = useCallback((content, filename) => {
    try {
      setOriginalCSV(content)
      const parsed = parseWixCSV(content)
      setProducts(parsed.products)
      setVariants(parsed.variants)
      setCategories(parsed.categories)
      showToast(`Loaded ${parsed.products.length} products and ${parsed.variants.length} variants`, 'success')
      setStep(2)
    } catch (err) {
      showToast('Error parsing CSV: ' + err.message, 'error')
    }
  }, [])

  const handleReferenceUpload = useCallback((content, filename) => {
    try {
      const lines = content.split('\n')
      if (lines.length < 2) { showToast('File is empty', 'error'); return }
      
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      let skuIdx = headers.findIndex(h => h.includes('sku'))
      let rrpIdx = headers.findIndex(h => h.includes('rrp') || (h.includes('zar') && h.includes('incl')) || h.includes('price'))
      
      if (skuIdx === -1 || rrpIdx === -1) {
        // Try semicolon separator
        const headers2 = lines[0].split(';').map(h => h.trim().toLowerCase())
        skuIdx = headers2.findIndex(h => h.includes('sku'))
        rrpIdx = headers2.findIndex(h => h.includes('rrp') || h.includes('price'))
      }
      
      if (skuIdx === -1) { showToast('Could not find SKU column', 'error'); return }
      if (rrpIdx === -1) { showToast('Could not find price/RRP column', 'error'); return }

      const sep = lines[0].includes(';') ? ';' : ','
      const prices = []
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(sep).map(v => v.trim())
        const sku = vals[skuIdx]
        const rrp = parseFloat(vals[rrpIdx]?.replace(/[^0-9.]/g, ''))
        if (sku && !isNaN(rrp)) prices.push({ sku: sku.toUpperCase().trim(), rrp })
      }
      
      setReferencePrices(prices)
      showToast(`Loaded ${prices.length} reference prices`, 'success')
    } catch (err) {
      showToast('Error parsing reference file: ' + err.message, 'error')
    }
  }, [])

  // ─── Step 3: Matching ───
  const matchedData = useMemo(() => {
    if (!variants.length || !referencePrices.length) return { matched: [], unmatched: [] }
    
    const refMap = {}
    referencePrices.forEach(rp => { if (rp.sku) refMap[rp.sku] = rp })
    
    const matched = []
    const unmatched = []
    
    variants.forEach(v => {
      const sku = (v.sku || '').toUpperCase().trim()
      if (!sku) return
      
      const product = products.find(p => p.handleId === v.productHandleId)
      const basePrice = product ? product.price : 0
      const currentPrice = basePrice + (v.surcharge || 0)
      const ref = refMap[sku]
      
      if (ref) {
        matched.push({
          ...v,
          productName: product ? product.name : '',
          productImage: product ? product.productImageUrl : '',
          basePrice,
          currentPrice,
          referencePrice: ref.rrp,
          suggestedSurcharge: Math.round((ref.rrp - basePrice) * 100) / 100,
          priceDifference: Math.round((currentPrice - ref.rrp) * 100) / 100,
        })
      } else {
        unmatched.push({ ...v, productName: product ? product.name : '', currentPrice })
      }
    })
    
    return { matched, unmatched }
  }, [variants, referencePrices, products])

  const discrepancies = useMemo(() => {
    if (!variants.length || !referencePrices.length) return []
    const refSkus = new Set(referencePrices.map(rp => (rp.sku || '').toUpperCase().trim()))
    return variants
      .filter(v => {
        const sku = (v.sku || '').toUpperCase().trim()
        return sku && !refSkus.has(sku)
      })
      .map(v => {
        const product = products.find(p => p.handleId === v.productHandleId)
        return {
          ...v,
          name: product ? product.name : '',
          currentPrice: (product ? product.price : 0) + (v.surcharge || 0),
        }
      })
  }, [variants, referencePrices, products])

  const handleSkuDiffResolve = (actions) => {
    const updates = { ...priceUpdates }
    Object.entries(actions).forEach(([sku, action]) => {
      if (action === 'hide') {
        updates[sku] = { ...updates[sku], visible: false }
      } else if (action === 'delete') {
        updates[sku] = { ...updates[sku], visible: false, delete: true }
      }
      // 'ignore' needs no action
    })
    setPriceUpdates(updates)
    setShowSkuDiff(false)
    showToast('SKU actions applied', 'success')
  }

  const handleApplyAllMatches = () => {
    const updates = { ...priceUpdates }
    matchedData.matched.forEach(m => {
      updates[m.sku] = { surcharge: m.suggestedSurcharge }
    })
    setPriceUpdates(updates)
    showToast(`Applied ${matchedData.matched.length} price adjustments`, 'success')
  }

  const handleExport = () => {
    if (!originalCSV) { showToast('No original CSV to export', 'error'); return }
    
    const updates = {}
    Object.entries(priceUpdates).forEach(([sku, update]) => {
      if (update.delete) return // Skip deleted items
      updates[sku] = update
    })
    
    // Apply matched prices that haven't been manually overridden
    matchedData.matched.forEach(m => {
      if (!updates[m.sku]) {
        updates[m.sku] = { surcharge: m.suggestedSurcharge }
      }
    })
    
    const csv = generateWixCSV(originalCSV, updates)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'updated_catalog.csv'
    a.click()
    URL.revokeObjectURL(url)
    showToast('CSV downloaded successfully', 'success')
  }

  if (!authenticated) {
    return <AuthGate><div /></AuthGate>
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
      
      {showSkuDiff && (
        <SkuDiffModal
          discrepancies={discrepancies}
          onClose={() => setShowSkuDiff(false)}
          onResolve={handleSkuDiffResolve}
        />
      )}

      {/* Header */}
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>CSV Price Updater</h1>
          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Update your Wix store pricing</p>
        </div>
        <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: 6, backgroundColor: 'white', cursor: 'pointer', fontSize: 13, color: '#64748b' }}>
          <LogOut size={14} /> Logout
        </button>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
        <StepIndicator currentStep={step} />

        {/* Step 1: Upload */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Upload Your Product Catalog</h2>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>Upload the CSV file exported from your Wix store products</p>
            <UploadDropzone onUpload={handleCatalogUpload} accept=".csv" label="Upload Wix Product CSV" icon={Upload} />
            {products.length > 0 && (
              <div style={{ marginTop: 20, padding: 16, backgroundColor: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                <p style={{ fontSize: 14, color: '#166534', margin: 0, fontWeight: 600 }}>
                  ✅ Loaded: {products.length} products, {variants.length} variants, {categories.length} categories
                </p>
                <button onClick={() => setStep(2)} style={{ marginTop: 12, padding: '10px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Review */}
        {step === 2 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Review Products</h2>
                <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>{products.length} products loaded</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setStep(1)} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: 8, backgroundColor: 'white', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ArrowLeft size={16} /> Back
                </button>
                <button onClick={() => setStep(3)} style={{ padding: '10px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            </div>
            <ProductGrid
              products={products}
              variants={variants}
              onSelectProduct={setSelectedProduct}
              selectedHandleId={selectedProduct}
            />
          </div>
        )}

        {/* Step 3: Match */}
        {step === 3 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Match Prices</h2>
                <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Upload reference price list and match to products</p>
              </div>
              <button onClick={() => setStep(2)} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: 8, backgroundColor: 'white', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ArrowLeft size={16} /> Back
              </button>
            </div>

            {referencePrices.length === 0 ? (
              <UploadDropzone onUpload={handleReferenceUpload} accept=".csv,.xlsx" label="Upload Reference Price List (CSV)" icon={FileText} />
            ) : (
              <div>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
                  <div style={{ padding: 16, backgroundColor: 'white', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>{matchedData.matched.length}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Matched</div>
                  </div>
                  <div style={{ padding: 16, backgroundColor: 'white', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>{discrepancies.length}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Not in Pricelist</div>
                  </div>
                  <div style={{ padding: 16, backgroundColor: 'white', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#22c55e' }}>{referencePrices.length}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Reference Prices</div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                  <button onClick={handleApplyAllMatches} style={{ padding: '10px 20px', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                    Apply All Suggested Prices
                  </button>
                  {discrepancies.length > 0 && (
                    <button onClick={() => setShowSkuDiff(true)} style={{ padding: '10px 20px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle size={16} /> Review {discrepancies.length} Discrepancies
                    </button>
                  )}
                  <button onClick={() => setStep(4)} style={{ padding: '10px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                    Continue <ArrowRight size={16} />
                  </button>
                </div>

                {/* Matched table */}
                <div style={{ backgroundColor: 'white', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
                    Matched Products ({matchedData.matched.length})
                  </div>
                  <div style={{ maxHeight: 400, overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc' }}>
                          <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Product</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>SKU</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Current</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>RRP</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Difference</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>New Surcharge</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matchedData.matched.slice(0, 50).map((m, i) => (
                          <tr key={m.sku + i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 12px', color: '#1e293b' }}>{m.productName}</td>
                            <td style={{ padding: '10px 12px', color: '#64748b', fontFamily: 'monospace', fontSize: 12 }}>{m.sku}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#1e293b' }}>{formatPrice(m.currentPrice)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#1e293b', fontWeight: 600 }}>{formatPrice(m.referencePrice)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: m.priceDifference > 0 ? '#ef4444' : m.priceDifference < 0 ? '#22c55e' : '#64748b' }}>
                              {m.priceDifference > 0 ? '+' : ''}{formatPrice(m.priceDifference)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#3b82f6', fontWeight: 600 }}>{formatPrice(m.suggestedSurcharge)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {matchedData.matched.length > 50 && (
                      <div style={{ padding: 12, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                        Showing 50 of {matchedData.matched.length} matched products
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Export */}
        {step === 4 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Export Updated Catalog</h2>
                <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Download the updated CSV ready for Wix import</p>
              </div>
              <button onClick={() => setStep(3)} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: 8, backgroundColor: 'white', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ArrowLeft size={16} /> Back
              </button>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: 32, textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Download size={28} color="#3b82f6" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Ready to Export</h3>
              <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
                Your updated catalog CSV is ready. It maintains the exact Wix import format with your new pricing applied.
              </p>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={handleExport} style={{ padding: '14px 32px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Download size={18} /> Download Updated CSV
                </button>
              </div>

              <div style={{ marginTop: 24, padding: 16, backgroundColor: '#f8fafc', borderRadius: 8, textAlign: 'left' }}>
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
