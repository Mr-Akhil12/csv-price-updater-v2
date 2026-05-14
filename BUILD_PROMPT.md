# Build Instructions for CSV Price Updater V2

Read the PROJECT_PLAN.md file in the same directory first. Then build the complete application following these exact specifications.

## Setup Commands
Run these in order:

```powershell
cd C:\Users\pilla\Documents\csv-price-updater-v2

# 1. Initialize Vite + React
npm create vite@latest . -- --template react

# 2. Install dependencies
npm install

# 3. Install Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 4. Install shadcn/ui and its dependencies
npm install -D @shadcn/ui
npx shadcn-ui@latest init

# 5. Install additional packages
npm install papaparse sql.js dexie lucide-react clsx tailwind-merge class-variance-authority

# 6. Install shadcn components
npx shadcn-ui@latest add button card dialog input select table tabs toast badge progress separator tooltip alert-dialog label switch skeleton dropdown-menu
```

## Critical Implementation Details

### 1. Tailwind Config
```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

### 2. PostCSS Config
```js
// postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### 3. Vite Config
```js
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### 4. Environment File
```
# .env
VITE_APP_PASSWORD=Password123!
```

### 5. Global CSS
```css
/* src/styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 84% 4.9%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 84% 4.9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

### 6. Utility Function
```js
// src/lib/utils.js
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatPrice(amount) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(amount)
}

export function parseWixCSV(csvText) {
  // Parse Wix CSV format
  // Returns { products: [], variants: [], categories: [] }
  const lines = csvText.split('\n')
  const headers = lines[0].split(',').map(h => h.trim().replace(/^\uFEFF/, ''))
  
  const products = []
  const variants = []
  const categories = new Set()
  let currentProduct = null
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    const values = line.split(',')
    const row = {}
    headers.forEach((h, idx) => { row[h] = values[idx]?.trim() || '' })
    
    if (row.fieldType === 'Product') {
      currentProduct = {
        handleId: row.handleId,
        name: row.name,
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
  
  return { products, variants, categories: Array.from(categories) }
}

export function generateWixCSV(originalCSV, priceUpdates) {
  // Generate updated CSV with new prices
  // priceUpdates: { sku: { surcharge, visible } }
  const lines = originalCSV.split('\n')
  const headers = lines[0].split(',').map(h => h.trim().replace(/^\uFEFF/, ''))
  
  const updatedLines = [lines[0]]
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    const values = line.split(',')
    const row = {}
    headers.forEach((h, idx) => { row[h] = values[idx]?.trim() || '' })
    
    const sku = row.sku
    if (sku && priceUpdates[sku]) {
      const update = priceUpdates[sku]
      const surchargeIdx = headers.indexOf('surcharge')
      const visibleIdx = headers.indexOf('visible')
      
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
```

## Build Order
1. Set up project scaffold (Vite + React + Tailwind + shadcn)
2. Create all UI components in src/components/ui/
3. Create utility functions in src/lib/
4. Create AuthContext and AuthGate
5. Create CSV parser hook
6. Create ProductGrid with filters
7. Create PriceMatcher component
8. Create SkuDiffModal
9. Create ExportStep
10. Wire everything together in App.jsx
11. Test with the sample CSV file at C:\Users\pilla\Downloads\projects\projects\csv adjusted\catalog_products (13).csv
12. Fix any issues
13. Build for production: npm run build

## Important Notes
- Use functional components with hooks only (no class components)
- Use named exports, not default exports
- Keep components small and focused
- Use the cn() utility for conditional classes
- All text should be clear and non-technical (this is for a website owner)
- The app should handle CSVs with up to 5000 rows smoothly
- Show loading states for all async operations
- Use toast notifications for user feedback
