# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EGDC** is a production-ready Next.js 15 inventory management system for footwear products, built with TypeScript and Supabase. It replaces a legacy Google Apps Script/Sheets system with a modern, scalable web application featuring real-time inventory tracking, automated pricing calculations, and comprehensive multi-location stock management.

## Current Project Status

✅ **FULLY FUNCTIONAL** - Complete inventory management system  
✅ **PRODUCTION READY** - All core features implemented and working  
✅ **DATABASE COMPLETE** - Automated pricing, triggers, and audit trails  
✅ **UI/UX COMPLETE** - Modern, responsive interface with advanced filtering  
✅ **API ENDPOINTS** - REST API for inventory operations  
✅ **SCRIPTS READY** - Database management and testing utilities  

## Development Commands

```bash
# Development (recommended)
npm run dev          # Start development server on port 3000
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint linter
npm run type-check   # Run TypeScript type checking

# Database Management Scripts
npx tsx scripts/test-connection.ts      # Test Supabase connection
npx tsx scripts/check-schema.ts         # Verify database schema
npx tsx scripts/setup-db.ts             # Setup database from scratch
npx tsx scripts/database-examples.ts    # Example database operations
npx tsx scripts/force-update.ts         # Force database schema update
npx tsx scripts/update-database.ts      # Update database with fixes
npx tsx scripts/final-update.ts         # Final database configuration
npx tsx scripts/db-direct.ts            # Direct database operations
```

## **🔥 CRITICAL: Git Workflow Requirements**

**⚠️ ALWAYS FOLLOW PROPER GITHUB WORKFLOW - NO EXCEPTIONS ⚠️**

### **Required Git Workflow for All Development:**

```bash
# 1. ALWAYS create feature branches for new work
git checkout main
git pull origin main
git checkout -b feature/descriptive-name
git checkout -b hotfix/urgent-fix
git checkout -b improvement/optimization-name

# 2. Develop and commit on feature branch
git add .
git commit -m "feat: descriptive commit message"

# 3. Push feature branch to remote
git push -u origin feature/descriptive-name

# 4. Create Pull Request for code review
# 5. After approval, merge to main
git checkout main
git pull origin main
git merge feature/descriptive-name
git push origin main

# 6. Clean up feature branch
git branch -d feature/descriptive-name
git push origin --delete feature/descriptive-name
```

### **Git Workflow Rules:**
- 🚫 **NEVER commit directly to main branch**
- ✅ **ALWAYS create feature branches for new work**
- ✅ **ALWAYS test builds before committing** (`npm run build` && `npm run type-check`)
- ✅ **ALWAYS use descriptive branch names** (feature/oauth-auth, hotfix/login-bug)
- ✅ **ALWAYS use conventional commits** (feat:, fix:, docs:, style:, refactor:, test:)
- ✅ **ALWAYS create Pull Requests for code review**
- ✅ **ALWAYS merge to main only after testing and approval**

### **Branch Naming Convention:**
- `feature/` - New features (feature/barcode-scanning)
- `hotfix/` - Urgent production fixes (hotfix/auth-login-bug)
- `improvement/` - Enhancements (improvement/mobile-optimization)
- `docs/` - Documentation updates (docs/update-readme)

### **Protection Rules:**
- Main branch should be protected in production
- Require Pull Request reviews before merging
- Require status checks to pass before merging
- Require branches to be up to date before merging

## Architecture

### Tech Stack
- **Frontend**: Next.js 15.3.4 (App Router), React 19.1.0, TypeScript 5.8.3
- **Styling**: Tailwind CSS 3.4.0 with responsive design system
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Icons**: Lucide React 0.525.0
- **Development**: ESLint, PostCSS, Autoprefixer

### Key Features Implemented

#### 🔥 **Core Inventory Management**
- **Real-time Table Editing**: Direct cell editing with immediate visual feedback
- **Automated Pricing System**: Database-calculated prices with platform-specific formulas
- **Multi-location Inventory**: Track stock across 7 different locations with auto-totaling
- **Comprehensive Audit Trail**: All changes logged with timestamps and old/new values

#### 🎯 **Advanced Filtering & Search**
- **Hierarchical Filtering**: Categories → Brands → Models cascade filtering
- **Real-time Search**: Search across product names, SKUs, brands, models
- **Multi-select Filters**: Filter by multiple categories, brands, models simultaneously
- **Quick Filter Tags**: Visual filter tags with easy removal

#### 📊 **Dashboard & Analytics**
- **Real-time Statistics**: Product counts, inventory totals, low stock alerts
- **Inventory by Location**: Visual breakdown of stock distribution
- **Platform Distribution**: Track products across sales channels
- **Value Analysis**: Total inventory value, average costs, value per unit

#### 🎨 **Modern UI/UX**
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Visual Indicators**: Stock status, price calculations, change highlighting
- **Loading States**: Smooth loading animations and states
- **Error Handling**: User-friendly error messages and recovery

### Database Schema

#### **Products Table** (Complete)
- **Basic Info**: fecha, categoria, marca, modelo, color, talla, sku, ean
- **Pricing**: costo, shein_modifier, shopify_modifier, meli_modifier
- **Auto-Calculated Prices**: precio_shein, precio_egdc, precio_meli (generated columns)
- **Multi-location Inventory**: inv_egdc, inv_fami, inv_bodega_principal, inv_tienda_centro, inv_tienda_norte, inv_tienda_sur, inv_online
- **Auto-Calculated Total**: inventory_total (database trigger)
- **Platform Flags**: shein, meli, shopify, tiktok, upseller, go_trendier, google_drive
- **Timestamps**: created_at, updated_at (auto-managed)

#### **Change Logs Table** (Complete)
- **Audit Trail**: product_id, field_name, old_value, new_value, change_type, created_at
- **Full History**: Every field change tracked with timestamps

#### **Database Features**
- **Automatic Pricing**: Database-generated columns with business logic
- **Inventory Triggers**: Auto-calculate totals when individual locations change
- **Comprehensive Indexes**: Optimized for search and filtering performance
- **Row Level Security**: Proper access control policies

### Component Architecture

#### **Main Application** (`app/page.tsx`)
- **State Management**: React hooks for inventory, filters, and editing states
- **Data Flow**: Centralized state with prop drilling to components
- **API Integration**: Fetch and update inventory data
- **Change Tracking**: Track edited products and manage save/cancel operations

#### **Core Components**

1. **`InventoryTable.tsx`** - Main editing interface
   - Direct cell editing with input validation
   - Real-time price calculations display
   - Visual change indicators
   - Responsive table with sticky headers

2. **`ProductCard.tsx`** - Detailed product view
   - Expandable product details
   - Inline editing for all fields
   - Visual price breakdown
   - Stock status indicators

3. **`QuickStats.tsx`** - Dashboard overview
   - Real-time inventory statistics
   - Location-based stock distribution
   - Platform availability metrics
   - Low stock and out-of-stock alerts

4. **`SearchAndFilters.tsx`** - Advanced filtering
   - Real-time search across multiple fields
   - Multi-select hierarchical filters
   - Visual filter tags
   - Filter clearing functionality

5. **`ProductList.tsx`** - List view interface
   - Compact product listing
   - Quick edit capabilities
   - Expandable details

6. **`FilterSection.tsx`** - Filter controls
   - Category, brand, model filtering
   - Dynamic filter options based on data

7. **`LoadingScreen.tsx`** - Loading states
   - Smooth loading animations
   - User feedback during operations

8. **`MessageArea.tsx`** - User feedback
   - Success/error notifications
   - Operation status updates

### API Endpoints

#### **`GET /api/inventory`** - Fetch Products
- Returns all products ordered by categoria, marca, modelo
- Includes all calculated fields and inventory totals
- Error handling for connection and data issues

#### **`POST /api/inventory/update`** - Update Products
- Accepts array of product changes
- Validates all input data
- Logs all changes to audit trail
- Returns operation status and error details

### Database Management Scripts

The project includes 8 utility scripts for comprehensive database management:

1. **`test-connection.ts`** - Test Supabase connection and data integrity
2. **`check-schema.ts`** - Verify database schema and structure
3. **`setup-db.ts`** - Complete database setup from scratch
4. **`database-examples.ts`** - Example operations and API usage
5. **`force-update.ts`** - Force database schema updates
6. **`update-database.ts`** - Apply incremental database updates
7. **`final-update.ts`** - Final database configuration
8. **`db-direct.ts`** - Direct database operations utility

### Database Setup Options

Choose the appropriate SQL script based on your needs:

1. **`database-setup.sql`** - Standard setup with sample data
2. **`database-complete-setup.sql`** - Complete setup with advanced features
3. **`fix-database.sql`** - Fix existing database issues

## Environment Variables

Required in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_public_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Pricing System (Automated)

The system automatically calculates prices using database-generated columns:

- **SHEIN**: `CEILING((costo * shein_modifier * 1.2) / 5) * 5`
  - Includes 20% tax
  - Rounds up to nearest 5

- **EGDC/Shopify**: `CEILING(((costo * shopify_modifier + 100) * 1.25) / 5) * 5`
  - Includes $100 shipping cost
  - Includes 25% markup
  - Rounds up to nearest 5

- **MercadoLibre**: `CEILING(((costo * meli_modifier + 100) * 1.395) / 5) * 5`
  - Includes $100 shipping cost
  - Includes 39.5% fees
  - Rounds up to nearest 5

**Only cost and modifier fields are user-editable** - prices recalculate automatically.

## Multi-location Inventory (Automated)

Tracks stock across 7 locations with automatic totaling:
- **inv_egdc** - Main EGDC inventory
- **inv_fami** - FAMI inventory
- **inv_bodega_principal** - Main warehouse
- **inv_tienda_centro** - Centro store
- **inv_tienda_norte** - Norte store
- **inv_tienda_sur** - Sur store
- **inv_online** - Online inventory

**Total inventory auto-calculated** via database trigger when any location changes.

## Development Workflow

1. **Setup**: Run database script in Supabase SQL Editor
2. **Install**: `npm install` to install dependencies
3. **Configure**: Add environment variables to `.env.local`
4. **Test**: Run `npx tsx scripts/test-connection.ts` to verify setup
5. **Develop**: Run `npm run dev` to start development server
6. **Build**: Run `npm run build` to create production build

## Key Files Structure

```
EGDC/
├── app/
│   ├── api/inventory/
│   │   ├── route.ts                 # GET inventory endpoint
│   │   └── update/route.ts          # POST update endpoint
│   ├── globals.css                  # Global styles
│   ├── layout.tsx                   # Root layout
│   └── page.tsx                     # Main application
├── components/
│   ├── InventoryTable.tsx           # Main editing interface
│   ├── ProductCard.tsx              # Detailed product view
│   ├── QuickStats.tsx               # Dashboard overview
│   ├── SearchAndFilters.tsx         # Advanced filtering
│   ├── ProductList.tsx              # List view
│   ├── FilterSection.tsx            # Filter controls
│   ├── LoadingScreen.tsx            # Loading states
│   └── MessageArea.tsx              # User feedback
├── lib/
│   ├── supabase.ts                  # Client-side Supabase client
│   └── database.ts                  # Server-side database manager
├── scripts/
│   ├── test-connection.ts           # Test database connection
│   ├── setup-db.ts                  # Database setup
│   ├── check-schema.ts              # Schema verification
│   └── [5 more database scripts]    # Additional utilities
├── database-setup.sql               # Main database setup
├── database-complete-setup.sql      # Complete setup with views
├── fix-database.sql                 # Database fixes
└── package.json                     # Dependencies and scripts
```

## Production Considerations

- **Security**: Row Level Security enabled on all tables
- **Performance**: Comprehensive database indexes for optimal query performance
- **Scalability**: Designed for multi-user environments
- **Audit**: Complete change tracking for compliance
- **Backup**: Regular database backups recommended
- **Monitoring**: Built-in error handling and logging

## Testing

- **Manual Testing**: Use web interface for comprehensive testing
- **Database Testing**: Use provided scripts for connection and schema verification
- **API Testing**: Test endpoints with sample data
- **No Unit Tests**: Currently relies on manual testing and TypeScript type checking

## 4-Phase Improvement Plan

### Phase 1: Stability & Security (Week 1) - ✅ COMPLETED
- [x] **CRITICAL**: Fix environment variable validation (`lib/supabase.ts`) ✅ COMPLETED
- [x] **CRITICAL**: Fix state mutation bug (`components/FilterSection.tsx`) ✅ COMPLETED
- [x] Add comprehensive input validation to API routes ✅ COMPLETED
- [x] Standardize error handling across all endpoints ✅ COMPLETED
- [x] Implement error boundaries for component protection ✅ COMPLETED

### Phase 2: Performance & UX (Week 2) - ✅ COMPLETED
- [x] Optimize database queries (batch updates in API routes) ✅ COMPLETED
- [x] Add memoization to expensive calculations (QuickStats, FilterSection) ✅ COMPLETED
- [x] Implement proper loading states throughout app ✅ COMPLETED
- [x] Add accessibility improvements (ARIA labels, keyboard navigation) ✅ COMPLETED

### Phase 3: Feature Enhancements (Week 3-4)
- [ ] Enhanced Dashboard: Real-time analytics, inventory alerts
- [ ] Advanced Search: Full-text search, barcode scanning
- [ ] Mobile Optimization: Responsive design improvements
- [ ] User Management: Authentication, role-based access

### Phase 4: Advanced Features (Month 2)
- [ ] Reporting System: Custom reports, data export (CSV/Excel)
- [ ] Real-time Updates: WebSocket/Supabase subscriptions
- [ ] Mobile App: React Native companion
- [ ] Notifications: Email/SMS alerts for low stock

### Critical Issues Identified (16 total: 2 Critical, 3 High, 4 Medium, 7 Low)
**Status**: Currently addressing Phase 1 critical issues before proceeding

---

**Status**: Production-ready inventory management system with full CRUD operations, automated pricing, and comprehensive audit trails.