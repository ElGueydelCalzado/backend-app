# 🔄 Automatic Schema Synchronization

This system automatically synchronizes your frontend code with your database schema, eliminating the need to manually update TypeScript interfaces and column configurations when you modify your database.

## 🚀 Quick Start

```bash
npm run sync-schema
```

This single command will:
- ✅ Query your database schema
- ✅ Update TypeScript interfaces
- ✅ Update column configurations
- ✅ Update CSV import templates

## 📁 What Gets Updated

### 1. TypeScript Interfaces (`lib/supabase.ts`)
Automatically generates the `Product` interface based on your database columns:

```typescript
// Database types (auto-generated from database schema)
export interface Product {
  id: number
  categoria: string | null
  marca: string | null
  // ... all your database columns
}
```

### 2. Column Configuration (`app/inventario/page.tsx`)
Updates the `DEFAULT_COLUMNS` array with proper labels and categories:

```typescript
// Column configuration for the inventory table (auto-generated from database schema)
const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'categoria', label: 'Categoría', visible: true, category: 'basic' },
  { key: 'marca', label: 'Marca', visible: true, category: 'basic' },
  // ... all your columns with proper Spanish labels
]
```

### 3. CSV Templates (`components/BulkImportModal.tsx`)
Updates the import template to match your current database fields:

```typescript
const headers = [
  'categoria', 'marca', 'modelo', // ... all editable fields
]
```

## 🎯 When to Use

Run `npm run sync-schema` after any of these database changes:

### ✅ Add New Columns
```sql
ALTER TABLE products ADD COLUMN new_field TEXT;
```

### ✅ Remove Columns
```sql
ALTER TABLE products DROP COLUMN old_field;
```

### ✅ Change Column Types
```sql
ALTER TABLE products ALTER COLUMN price TYPE DECIMAL(10,2);
```

### ✅ Add Generated Columns
```sql
ALTER TABLE products ADD COLUMN total_price DECIMAL(10,2) 
GENERATED ALWAYS AS (price * quantity) STORED;
```

## 🏗️ Column Categories

The system automatically categorizes columns for better UI organization:

| Category | Columns | Purpose |
|----------|---------|---------|
| `basic` | categoria, marca, modelo, sku, ean | Core product information |
| `pricing` | costo, precio_*, *_modifier | Pricing and cost fields |
| `inventory` | inv_*, inventory_total | Stock management |
| `platforms` | shein, meli, shopify, tiktok | Sales channels |
| `other` | Any unmatched columns | Miscellaneous fields |

## 🔧 Column Visibility

Columns are automatically set as visible/hidden based on common usage:

### Always Visible
- Basic info: categoria, marca, modelo, color, talla, sku
- Pricing: costo, precio_shein, precio_shopify, precio_meli
- Inventory: inv_egdc, inv_fami, inventory_total

### Hidden by Default
- Technical: ean, google_drive
- Modifiers: shein_modifier, shopify_modifier, meli_modifier
- Platforms: shein, meli, shopify, tiktok, upseller, go_trendier

## 🎨 Custom Labels

The system provides proper Spanish labels for common fields:

```typescript
const labelMap = {
  'categoria': 'Categoría',
  'precio_shein': 'Precio SHEIN',
  'inv_egdc': 'EGDC',
  'meli_modifier': 'Mod. MercadoLibre',
  // ... comprehensive mapping
}
```

## ⚙️ How It Works

### 1. Schema Detection
The script queries your database using:
```typescript
// Tries to get schema via custom function or information_schema
const columns = await getTableSchema('products')
```

### 2. TypeScript Generation
Converts PostgreSQL types to TypeScript:
```typescript
// PostgreSQL -> TypeScript mapping
'integer' -> 'number'
'text' -> 'string'
'boolean' -> 'boolean'
'timestamp with time zone' -> 'string'
```

### 3. File Updates
Uses regex patterns to find and replace specific sections:
- Product interface in `lib/supabase.ts`
- DEFAULT_COLUMNS in `app/inventario/page.tsx`
- CSV template in `components/BulkImportModal.tsx`

## 🚨 Limitations

### ⚠️ What It Doesn't Handle
- **Complex relationships** - Only handles the `products` table
- **Custom validation logic** - Only generates basic TypeScript types
- **UI layout changes** - Doesn't modify component layouts
- **Migration scripts** - Doesn't create database migrations

### ⚠️ Manual Updates Still Needed For
- **New component props** - If you add new component interfaces
- **Business logic changes** - Custom validation or processing rules
- **UI/UX modifications** - Layout, styling, or user experience changes
- **API endpoint changes** - Custom endpoints or complex queries

## 🔄 Development Workflow

```bash
# 1. Make database changes
psql -h your-host -d your-db -f migration.sql

# 2. Sync frontend code
npm run sync-schema

# 3. Restart development server
npm run dev

# 4. Test the changes
# Your frontend now matches the database!
```

## 🛠️ Troubleshooting

### Database Connection Issues
```bash
# Check environment variables
cat .env.local

# Test connection manually
npx tsx scripts/test-connection.ts
```

### Generation Problems
```bash
# Run with verbose output
npm run sync-schema -- --verbose

# Check the generated files manually
git diff lib/supabase.ts
git diff app/inventario/page.tsx
```

### Sync Conflicts
If the script can't find the right patterns to replace:
1. Check that the files haven't been manually modified
2. Look for the comment markers in each file
3. Manually fix any syntax errors before re-running

## 🎯 Best Practices

### ✅ Do
- Run `npm run sync-schema` immediately after database changes
- Commit the generated changes to version control
- Test the application after running the sync
- Use descriptive column names that translate well to labels

### ❌ Don't
- Manually edit the auto-generated sections
- Skip running the sync after database changes
- Ignore sync warnings or errors
- Use column names that don't match the labeling system

## 🚀 Future Enhancements

Planned improvements to the schema sync system:

- **Multi-table support** - Handle relationships and joins
- **Custom field mappings** - User-defined label and category mappings
- **Validation generation** - Auto-generate form validation rules
- **Migration integration** - Run sync automatically after migrations
- **Type safety** - Generate more precise TypeScript types from constraints

---

*The schema sync system keeps your frontend and database perfectly aligned, eliminating the most common source of TypeScript errors and UI mismatches!* 🎯