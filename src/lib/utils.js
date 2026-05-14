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

// Parse a CSV line handling quoted fields with commas and newlines
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

// Parse multi-line CSV (handles newlines inside quoted fields)
function parseFullCSV(text) {
  const rows = []
  let currentRow = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') {
      inQuotes = !inQuotes
      currentRow += char
    } else if (char === '\n' && !inQuotes) {
      rows.push(currentRow)
      currentRow = ''
    } else if (char === '\r') {
      // skip
    } else {
      currentRow += char
    }
  }
  if (currentRow) rows.push(currentRow)
  return rows
}

/**
 * Parse Wix Stores product catalog CSV
 * Handles: semicolon-separated images, semicolon-separated collections,
 * products without SKUs, variants with surcharges, HTML descriptions
 */
export function parseWixCSV(csvText) {
  const rows = parseFullCSV(csvText)
  if (rows.length < 2) return { products: [], variants: [], categories: [], totalRows: 0 }

  const headers = parseCSVLine(rows[0]).map(h => h.trim().replace(/^\uFEFF/, ''))

  // Find column indices
  const col = {
    handleId: headers.indexOf('handleId'),
    fieldType: headers.indexOf('fieldType'),
    name: headers.indexOf('name'),
    description: headers.indexOf('description'),
    productImageUrl: headers.indexOf('productImageUrl'),
    collection: headers.indexOf('collection'),
    sku: headers.indexOf('sku'),
    price: headers.indexOf('price'),
    surcharge: headers.indexOf('surcharge'),
    visible: headers.indexOf('visible'),
    inventory: headers.indexOf('inventory'),
    weight: headers.indexOf('weight'),
    brand: headers.indexOf('brand'),
    productOptionName1: headers.indexOf('productOptionName1'),
    productOptionValue1: headers.indexOf('productOptionValue1'),
    productOptionName2: headers.indexOf('productOptionName2'),
    productOptionValue2: headers.indexOf('productOptionValue2'),
    productOptionName3: headers.indexOf('productOptionName3'),
    productOptionValue3: headers.indexOf('productOptionValue3'),
  }

  const products = []
  const variants = []
  const categories = new Set()
  let currentProduct = null
  let parseErrors = 0

  for (let i = 1; i < rows.length; i++) {
    const line = rows[i].trim()
    if (!line) continue

    const values = parseCSVLine(line)
    const row = {}
    headers.forEach((h, idx) => { row[h] = (values[idx] || '').trim() })

    const fieldType = (row.fieldType || '').trim()

    if (fieldType === 'Product') {
      const price = parseFloat((row.price || '0').replace(/[^0-9.]/g, '')) || 0
      const imageUrl = (row.productImageUrl || '').split(';')[0].trim() // First image only
      const collection = (row.collection || '').split(';')[0].trim() // First collection

      currentProduct = {
        handleId: row.handleId || '',
        name: row.name || '',
        description: (row.description || '').replace(/<[^>]*>/g, '').substring(0, 200), // Strip HTML
        productImageUrl: imageUrl,
        collection: collection,
        brand: row.brand || '',
        price: price,
        weight: parseFloat(row.weight) || null,
        visible: row.visible !== 'false',
        variantCount: 0,
        skuCount: 0,
      }
      products.push(currentProduct)

      if (collection) categories.add(collection)
      // Also add secondary collections
      const allCollections = (row.collection || '').split(';').map(c => c.trim()).filter(Boolean)
      allCollections.forEach(c => categories.add(c))

    } else if (fieldType === 'Variant' && currentProduct) {
      const surcharge = parseFloat((row.surcharge || '0').replace(/[^0-9.]/g, '')) || 0
      const sku = (row.sku || '').trim()

      variants.push({
        productHandleId: currentProduct.handleId,
        productName: currentProduct.name,
        productImage: currentProduct.productImageUrl,
        collection: currentProduct.collection,
        sku: sku,
        surcharge: surcharge,
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

      currentProduct.variantCount++
      if (sku) currentProduct.skuCount++
    }
  }

  return {
    products,
    variants,
    categories: Array.from(categories).sort(),
    totalRows: rows.length - 1,
    parseErrors
  }
}

/**
 * Parse reference price list CSV/Excel
 * Handles: empty rows at top, section headers, prices with spaces/commas,
 * SKUs with slashes, multiple header formats
 */
export function parseReferencePrices(csvText) {
  const rows = parseFullCSV(csvText)
  const prices = []
  let headerRowIdx = -1
  let skuCol = -1
  let priceCol = -1
  let nameCol = -1

  // Find the header row by looking for SKU and price/RRP columns
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const values = parseCSVLine(rows[i]).map(v => v.trim().toLowerCase())

    // Check for common header patterns
    const hasSku = values.some(v => v.includes('sku') || v === 'part' || v === 'part number' || v === 'code')
    const hasPrice = values.some(v => v.includes('rrp') || v.includes('price') || v.includes('zar') || v.includes('incl'))

    if (hasSku || hasPrice) {
      headerRowIdx = i
      // Find exact column indices
      for (let j = 0; j < values.length; j++) {
        const v = values[j]
        if (v.includes('sku') || v === 'part' || v === 'code') skuCol = j
        if (v.includes('rrp') || v.includes('price') || v.includes('zar')) priceCol = j
        if (v.includes('description') || v.includes('product') || v.includes('name')) nameCol = j
      }
      break
    }
  }

  // If no header found, assume first column is SKU and look for price column
  if (headerRowIdx === -1) {
    // Try to find first row with data that looks like SKU + price
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const values = parseCSVLine(rows[i]).map(v => v.trim())
      // Look for a row where first col looks like a SKU (alphanumeric with slashes) and another col looks like a price
      for (let j = 0; j < values.length; j++) {
        const priceVal = parseFloat(values[j]?.replace(/[\s,]/g, ''))
        if (!isNaN(priceVal) && priceVal > 100 && values[0]?.match(/^[A-Z0-9\-\/]+$/i)) {
          headerRowIdx = i + 1 // Data starts next row
          skuCol = 0
          priceCol = j
          break
        }
      }
      if (headerRowIdx >= 0) break
    }
  }

  // Default: column 0 = SKU, find price column from first data row
  if (skuCol === -1) skuCol = 0
  if (priceCol === -1) {
    // Find first column that looks like prices in the first few data rows
    for (let i = (headerRowIdx >= 0 ? headerRowIdx + 1 : 0); i < Math.min(rows.length, 10); i++) {
      const values = parseCSVLine(rows[i]).map(v => v.trim())
      for (let j = 1; j < values.length; j++) {
        const pv = parseFloat(values[j]?.replace(/[\s,R]/g, ''))
        if (!isNaN(pv) && pv > 10) { priceCol = j; break }
      }
      if (priceCol >= 0) break
    }
  }
  if (priceCol === -1) priceCol = 1 // Default

  // Parse data rows
  const startRow = headerRowIdx >= 0 ? headerRowIdx + 1 : 0
  let skipped = 0

  for (let i = startRow; i < rows.length; i++) {
    const line = rows[i].trim()
    if (!line) { skipped++; continue }

    const values = parseCSVLine(line).map(v => v.trim())
    const sku = (values[skuCol] || '').toUpperCase().trim()

    // Skip section headers (rows where SKU looks like a category name)
    if (!sku || sku.length < 3) { skipped++; continue }
    if (sku.match(/^(SECTION|CATEGORY|GROUP|ARP_|HEADER)/i)) { skipped++; continue }

    // Parse price - handle formats like "  61,999.00 " or "R 47,999.00" or "47999"
    const rawPrice = values[priceCol] || ''
    const priceClean = rawPrice.replace(/[\s,Rr]/g, '').replace(/,/g, '')
    const price = parseFloat(priceClean)

    if (isNaN(price) || price <= 0) { skipped++; continue }

    const name = nameCol >= 0 ? (values[nameCol] || '').replace(/^["']|["']$/g, '').trim() : ''

    prices.push({ sku, rrp: price, name })
  }

  return { prices, headerRow: headerRowIdx, skipped }
}

/**
 * Generate updated Wix CSV with new pricing
 * Preserves exact original format, only modifies surcharge and visible columns
 */
export function generateWixCSV(originalCSV, priceUpdates) {
  const rows = parseFullCSV(originalCSV)
  if (rows.length === 0) return ''

  const headers = parseCSVLine(rows[0]).map(h => h.trim().replace(/^\uFEFF/, ''))
  const surchargeIdx = headers.indexOf('surcharge')
  const visibleIdx = headers.indexOf('visible')

  const updatedRows = [rows[0]]

  for (let i = 1; i < rows.length; i++) {
    const line = rows[i]
    if (!line.trim()) { updatedRows.push(line); continue }

    const values = parseCSVLine(line)
    const row = {}
    headers.forEach((h, idx) => { row[h] = (values[idx] || '').trim() })

    const sku = (row.sku || '').toUpperCase().trim()
    if (sku && priceUpdates[sku]) {
      const update = priceUpdates[sku]
      if (update.surcharge !== undefined && surchargeIdx >= 0) {
        values[surchargeIdx] = update.surcharge.toString()
      }
      if (update.visible !== undefined && visibleIdx >= 0) {
        values[visibleIdx] = update.visible ? 'true' : 'false'
      }
    }

    updatedRows.push(values.join(','))
  }

  return updatedRows.join('\n')
}
