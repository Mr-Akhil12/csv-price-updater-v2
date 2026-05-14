# CSV Price Updater V2 — Project Plan

## Overview
A React-based web application for managing Wix Stores product pricing. Replaces the current Streamlit app with a modern, component-based UI that any website owner can use without technical knowledge. The app is gated with a password and runs entirely in the browser with a lightweight backend.

## Tech Stack
- **Frontend**: React 18+ with Vite
- **Component Library**: shadcn/ui (based on Radix UI + Tailwind CSS)
- **Styling**: Tailwind CSS
- **Backend/DB**: SQLite via better-sqlite3 (Node.js) or sql.js (browser-side)
- **State Management**: React hooks + Context API
- **File Handling**: PapaParse for CSV parsing
- **Deployment**: Vercel
- **Auth**: Simple password gate via .env

## Project Structure
```
csv-price-updater-v2/
├── .env                    # PASSWORD=Password123!
├── .gitignore
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── public/
│   └── favicon.ico
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── components/
│   │   ├── AuthGate.jsx          # Password gate
│   │   ├── Layout.jsx            # Main layout wrapper
│   │   ├── Header.jsx            # App header with logo/title
│   │   ├── StepIndicator.jsx     # Visual step progress (1-2-3-4)
│   │   ├── UploadStep.jsx        # Step 1: Upload CSV / Pull live
│   │   ├── ReviewStep.jsx        # Step 2: Review product grid
│   │   ├── MatchStep.jsx         # Step 3: Price matching & SKU diff
│   │   ├── ExportStep.jsx        # Step 4: Export & download
│   │   ├── ProductGrid.jsx       # Main product grid with filters
│   │   ├── ProductCard.jsx       # Individual product card
│   │   ├── CategoryFilter.jsx    # Category/collection filter sidebar
│   │   ├── PriceEditor.jsx       # Inline price editing
│   │   ├── SkuDiffModal.jsx      # Modal for SKU discrepancies
│   │   ├── UploadDropzone.jsx    # Drag-and-drop CSV upload
│   │   └── ui/                   # shadcn/ui components
│   │       ├── button.jsx
│   │       ├── card.jsx
│   │       ├── dialog.jsx
│   │       ├── input.jsx
│   │       ├── select.jsx
│   │       ├── table.jsx
│   │       ├── tabs.jsx
│   │       ├── toast.jsx
│   │       ├── badge.jsx
│   │       ├── progress.jsx
│   │       ├── separator.jsx
│   │       ├── tooltip.jsx
│   │       ├── alert-dialog.jsx
│   │       ├── label.jsx
│   │       ├── switch.jsx
│   │       ├── skeleton.jsx
│   │       └── dropdown-menu.jsx
│   ├── hooks/
│   │   ├── useCSVParser.js       # CSV upload & parsing logic
│   │   ├── useProductData.js     # Product state management
│   │   ├── usePriceMatcher.js    # Price matching engine
│   │   └── useExport.js          # CSV export logic
│   ├── lib/
│   │   ├── csvParser.js          # Wix CSV format parser
│   │   ├── priceEngine.js        # Price matching & diff logic
│   │   ├── exportCSV.js          # Generate Wix-compatible CSV
│   │   ├── wixAPI.js             # Wix Stores API integration (future)
│   │   └── utils.js              # Helper functions
│   └── styles/
│       └── globals.css           # Tailwind imports + custom CSS
└── README.md
```

## Wix CSV Format (Critical)
The Wix Stores CSV export has these key columns:
- `handleId` — Product identifier
- `fieldType` — "Product" or "Variant"
- `name` — Product name
- `description` — HTML description
- `productImageUrl` — Product image URL
- `collection` — Product collection/category
- `sku` — SKU (primarily on variants)
- `price` — Base price (on Product rows)
- `surcharge` — Price surcharge (on Variant rows)
- `visible` — "true"/"false"
- `inventory` — Stock status ("InStock", etc.)
- `weight` — Product weight
- `brand` — Brand name
- `productOptionName1-6` — Option names (Size, Color, etc.)
- `productOptionValue1-6` — Option values

**Parsing Logic:**
- Rows with `fieldType == "Product"` define parent products
- Rows with `fieldType == "Variant"` belong to the preceding Product
- `handleId` links variants to products
- Image URLs are on Product rows, not Variant rows
- SKUs are on Variant rows (and sometimes Product rows for simple products)

## Application Flow

### Step 1: Data Source Selection
Two options presented clearly:
1. **Upload CSV** — Drag-and-drop or file picker for Wix product export CSV
2. **Pull Live** — (Future) Connect via Wix Stores API to fetch current products

On CSV upload:
- Parse using PapaParse
- Validate required columns exist
- Show preview: total products, variants, categories detected
- Display any parsing warnings

### Step 2: Product Grid Review
A clean, filterable product grid showing:
- Product image (from `productImageUrl`)
- Product name
- Collection/Category badge
- Current price
- Variant count
- SKU count

**Filters:**
- Category/Collection dropdown
- Search by name or SKU
- Filter by price range
- Filter by visibility status
- Show/hide products without SKUs

**Product Card Expands to show:**
- All variants with their SKUs, surcharges, current final prices
- Option values (Size: M, Color: Blue, etc.)
- Inventory status
- Inline price editing

### Step 3: Price Matching
Two sub-steps:

#### 3a: Upload Reference Price List
- Upload CSV/Excel with SKU → RRP mapping
- Auto-detect SKU and RRP columns
- Show match statistics: matched, unmatched, total

#### 3b: Review & Apply
For each matched product:
- Show current price vs RRP
- Calculate suggested surcharge adjustment
- Allow bulk apply or individual override
- Highlight price differences

**SKU Discrepancy Detection:**
After matching, identify:
- SKUs on the website (in CSV) that are NOT in the reference price list
- For each, show: product name, SKU, current price
- Actions per SKU:
  - **Ignore** — Keep as-is, no change
  - **Hide** — Set visible=false in export
  - **Delete** — Mark for removal from export

Show a clear summary modal:
```
⚠️ 23 SKUs on your website are not in the reference price list

[Product Name] SKU: ABC123 — Current: R450.00
  [Ignore] [Hide] [Delete]

[Product Name] SKU: DEF456 — Current: R890.00
  [Ignore] [Hide] [Delete]

[Apply All: Ignore] [Apply All: Hide] [Apply All: Delete]
```

### Step 4: Export
Two buttons side by side:

1. **📥 Download CSV** — Downloads the updated CSV file in exact Wix import format
2. **📤 Upload to Wix** — (Future) Direct upload via Wix Stores API

The exported CSV:
- Maintains exact original column structure
- Only modifies price/surcharge/visible columns
- Preserves all other data exactly
- Ready for direct Wix import

## Database Approach
Use **sql.js** (SQLite compiled to WebAssembly) for browser-side data storage:
- No server required
- All data stays in the user's browser
- Import CSV → Parse → Store in SQLite → Query for display → Export CSV
- Enables fast filtering, sorting, and matching on large datasets
- Data persists during session (lost on page refresh — acceptable for this use case)

Alternative: Use **IndexedDB** via a wrapper like Dexie.js for simpler key-value storage if sql.js is too heavy.

## Password Gate
- Simple password check against `VITE_APP_PASSWORD` env variable
- Default password: `Password123!`
- Stored in `.env` file, injected at build time
- Session-based: once authenticated, stays authenticated until browser close
- No server-side auth needed

## UI/UX Principles
- **Clean & minimal** — No clutter, no floating elements
- **Step-by-step flow** — Clear 1-2-3-4 step indicator
- **Logical progression** — Each step naturally leads to the next
- **Smart defaults** — Auto-detect columns, suggest actions
- **Clear feedback** — Toast notifications for all actions
- **Responsive** — Works on desktop and tablet
- **Fast** — No unnecessary re-renders, virtualized lists for large datasets

## Component Library: shadcn/ui
Install via:
```bash
npx shadcn-ui@latest init
```

Key components needed:
- Button, Card, Dialog, Input, Select, Table, Tabs, Toast, Badge, Progress, Separator, Tooltip, Alert, Label, Switch, Skeleton, DropdownMenu

## Deployment
1. Push to GitHub repo `Mr-Akhil12/csv-price-updater-v2`
2. Connect to Vercel
3. Set env variable: `VITE_APP_PASSWORD=Password123!`
4. Deploy — Vercel auto-detects Vite config

## Implementation Order
1. Scaffold Vite + React + Tailwind + shadcn/ui
2. Auth gate component
3. CSV parser (Wix format)
4. Product grid with filters
5. Price matching engine
6. SKU discrepancy modal
7. Export CSV generator
8. Polish, testing, deployment

## Future Enhancements (Post-V2)
- Wix Stores API integration for live product pull
- Direct Wix upload via API
- Price history tracking
- Multi-user support
- Scheduled price updates
- Email notifications for price changes
