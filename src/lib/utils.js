import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatPrice(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return "R0.00"
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(amount)
}

export function parseWixCSV(csvText) {
  const lines = csvText.split('\n')
  if (lines.length < 2) return { products: [], variants: [], categories: [] }
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^\uFEFF/, ''))
  
  const products = []
  const variants = []
  const categories = new Set()
  let currentProduct = null
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    const values = parseCSVLine(line)
    const row = {}
    headers.forEach((h, idx) => { row[h] = values[idx]?.trim() || '' })
    
    if (row.fieldType === 'Product') {
      currentProduct = {
        handleId: row.handleId || '',
        name: row.name || '',
        description: row.description || '',
        productImageUrl: row.productImageUrl || '',
        collection: row.collection || '',
        brand: row.brand || '',
        price: parseFloat(row.price) || 0,
        weight: parseFloat(row.weight) || null,
        visible: row.visible !== 'false',
      }
      products.push(currentProduct)
      if (row.collection) categories.add(row.collection)
    } else if (row.fieldType === 'Variant' && currentProduct) {
      variants.push({
        productHandleId: currentProduct.handleId,
        sku: row.sku || '',
        surcharge: parseFloat(row.surcharge) || 0,
        weight: parseFloat(row.weight) || null,
        visible: row.visible !== 'false',
        inventory: row.inventory || 'InStock',
        option1Name: row.productOptionName1 || '',
        option1Value: row.productOptionValue1 || '',
        option2Name: row.productOptionName2 || '',
        option2Value: row.productOptionValue2 || '',
        option3Name: row.productOptionName3 || '',
        option3Value: row.productOptionValue3 || '',
      })
    }
  }
  
  return { products, variants, categories: Array.from(categories).sort() }
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

export function generateWixCSV(originalCSV, priceUpdates) {
  const lines = originalCSV.split('\n')
  if (lines.length === 0) return ''
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^\uFEFF/, ''))
  const surchargeIdx = headers.indexOf('surcharge')
  const visibleIdx = headers.indexOf('visible')
  const skuIdx = headers.indexOf('sku')
  
  const updatedLines = [lines[0]]
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    const values = parseCSVLine(line)
    const row = {}
    headers.forEach((h, idx) => { row[h] = values[idx]?.trim() || '' })
    
    const sku = row.sku
    if (sku && priceUpdates[sku]) {
      const update = priceUpdates[sku]
      if (update.surcharge !== undefined && surchargeIdx >= 0) {
        values[surchargeIdx] = update.surcharge.toString()
      }
      if (update.visible !== undefined && visibleIdx >= 0) {
        values[visibleIdx] = update.visible ? 'true' : 'false'
      }
    }
    
    updatedLines.push(values.join(','))
  }
  
  return updatedLines.join('\n')
}

export function matchPrices(variants, referencePrices) {
  const refMap = {}
  referencePrices.forEach(rp => {
    if (rp.sku) refMap[rp.sku.toUpperCase().trim()] = rp
  })
  
  const matched = []
  const unmatched = []
  
  variants.forEach(v => {
    const sku = (v.sku || '').toUpperCase().trim()
    if (!sku) return
    
    const ref = refMap[sku]
    if (ref) {
      const currentPrice = (v.basePrice || 0) + (v.surcharge || 0)
      const suggestedSurcharge = ref.rrp - (v.basePrice || 0)
      matched.push({
        ...v,
        referencePrice: ref.rrp,
        currentPrice,
        suggestedSurcharge,
        priceDifference: currentPrice - ref.rrp,
      })
    } else {
      unmatched.push(v)
    }
  })
  
  return { matched, unmatched }
}

export function findSkuDiscrepancies(variants, referencePrices) {
  const refSkus = new Set(referencePrices.map(rp => (rp.sku || '').toUpperCase().trim()))
  
  return variants.filter(v => {
    const sku = (v.sku || '').toUpperCase().trim()
    return sku && !refSkus.has(sku)
  })
}
