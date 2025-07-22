# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EGDC** is a production-ready Next.js 15 SaaS multi-tenant inventory management platform for footwear businesses, built with TypeScript and PostgreSQL. It replaces a legacy Google Apps Script/Sheets system with a modern, scalable B2B platform featuring real-time inventory tracking, automated pricing calculations, supplier integration, and comprehensive multi-business warehouse management.

## Current Project Status

✅ **FULLY FUNCTIONAL** - Complete SaaS multi-tenant platform  
✅ **PRODUCTION DEPLOYED** - Live at inv.lospapatos.com with all core features  
✅ **DATABASE COMPLETE** - PostgreSQL with automated pricing, triggers, and audit trails  
✅ **UI/UX COMPLETE** - Modern, responsive interface with warehouse switching  
✅ **API ENDPOINTS** - REST API for inventory operations and supplier integration  
✅ **SUPPLIER INTEGRATION** - Multi-business warehouse architecture with BUY functionality  
✅ **BULK OPERATIONS** - UPSERT functionality for efficient bulk import/export  
✅ **IMAGE PREVIEW** - Google Drive API integration for product image galleries  
✅ **CODEBASE CLEAN** - Removed 3,500+ lines of legacy code and backup files  

## Development Commands

```bash
# Development (recommended)
npm run dev          # Start development server on port 3000
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint linter
npm run type-check   # Run TypeScript type checking

# Database Management Scripts
npx tsx scripts/test-connection.ts      # Test PostgreSQL connection
npx tsx scripts/check-schema.ts         # Verify database schema
npx tsx scripts/setup-db.ts             # Setup database from scratch
npx tsx scripts/database-examples.ts    # Example database operations
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
- **Database**: PostgreSQL (GCP Cloud SQL) with Row Level Security
- **Icons**: Lucide React 0.525.0
- **Development**: ESLint, PostCSS, Autoprefixer

### Key Features Implemented

#### 🔥 **Core Inventory Management**
- **Real-time Table Editing**: Direct cell editing with auto-save functionality
- **Automated Pricing System**: Database-calculated prices with platform-specific formulas
- **Multi-business Warehouse System**: Independent warehouses for EGDC + supplier integration
- **Supplier Integration**: Read-only catalogs with BUY functionality for purchase orders
- **Comprehensive Audit Trail**: All changes logged with timestamps and old/new values
- **Bulk Operations**: UPSERT-based bulk import/export with conflict resolution
- **Image Preview System**: Google Drive API integration for product photo galleries

#### 🎯 **Advanced Filtering & Search**
- **Hierarchical Filtering**: Categories → Brands → Models cascade filtering
- **Real-time Search**: Search across product names, SKUs, brands, models
- **Multi-select Filters**: Filter by multiple categories, brands, models simultaneously
- **Warehouse Switching**: Independent filtering for each business warehouse
- **Quick Filter Tags**: Visual filter tags with easy removal

#### 📊 **SaaS Multi-Tenant Architecture**
- **Independent Business Warehouses**: EGDC (own), FAMI/Osiel/Molly (suppliers)
- **Supplier Catalogs**: Read-only product views with wholesale pricing
- **Purchase Order System**: BUY buttons with quantity selection and order creation
- **Visual Business Distinctions**: Clear indicators for own vs supplier products
- **Real-time Product Counts**: Dynamic badges showing inventory per warehouse

#### 🎨 **Modern UI/UX**
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Warehouse Tabs**: Professional business switching interface with icons and badges
- **Auto-save Functionality**: Real-time saving without manual save buttons
- **Loading States**: Smooth loading animations and states
- **Toast Notifications**: Non-intrusive success/error feedback system

### Database Schema

#### **Products Table** (Complete)
- **Basic Info**: fecha, categoria, marca, modelo, color, talla, sku, ean
- **Pricing**: costo, shein_modifier, shopify_modifier, meli_modifier
- **Auto-Calculated Prices**: precio_shein, precio_shopify, precio_meli (generated columns)
- **Multi-warehouse Inventory**: inv_egdc, inv_fami, inv_osiel, inv_molly
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
   - Auto-save functionality with real-time updates
   - Supplier view mode with BUY buttons
   - Real-time price calculations display
   - Visual distinctions for own vs supplier products
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

8. **`WarehouseTabs.tsx`** - Business warehouse switching
   - Independent business tabs (EGDC, FAMI, Osiel, Molly)
   - Visual indicators for own vs supplier businesses
   - Real-time product count badges
   - Demo mode indicators for supplier catalogs
   - Responsive design for desktop and mobile

9. **`ToastNotification.tsx`** - Modern feedback system
   - Non-intrusive success/error notifications
   - Auto-dismissing with customizable duration
   - Multiple toast support with queue management

10. **`ImagePreviewModal.tsx`** - Google Drive integration
    - Preview product images from Google Drive folders
    - Navigation between multiple images
    - Fallback to Drive when images fail to load
    - Comprehensive error handling with debugging

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

#### **`POST /api/inventory/bulk-import`** - Bulk Import Products
- UPSERT functionality for efficient bulk operations
- Handles conflicts with existing products
- Batch processing to prevent 504 timeouts
- Comprehensive error reporting and rollback

#### **`GET /api/drive-images/[folderId]`** - Google Drive Images
- Fetches image lists from Google Drive folders
- Converts to proxy URLs for CSP compliance
- Environment-aware API key handling
- Comprehensive debugging and error handling

#### **`GET /api/drive-proxy/[fileId]`** - Image Proxy
- Serves Google Drive images through our domain
- Bypasses CSP restrictions
- Multiple fallback URL strategies
- Proper caching and content-type handling

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

Required in `.env.local` and production:
```bash
# PostgreSQL Database (GCP Cloud SQL)
DATABASE_URL=postgresql://username:password@host:port/database
POSTGRES_USER=your_postgres_user
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_HOST=your_postgres_host
POSTGRES_PORT=5432
POSTGRES_DATABASE=your_database_name

# Google Drive API (Required for image preview)
GOOGLE_DRIVE_API_KEY=your_google_drive_api_key

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# NextAuth Configuration
NEXTAUTH_URL=your_app_url
NEXTAUTH_SECRET=your_nextauth_secret

# Optional - Preview environment skip auth
SKIP_AUTH=true
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

## Multi-Business Warehouse System

### **SaaS Architecture Model**

**EGDC Retailer (Your Business)**
- **inv_egdc** - EGDC inventory (real PostgreSQL database)
- Full editing capabilities with auto-save functionality
- Real-time inventory management and pricing calculations

**Supplier Businesses (Future SaaS Customers)**
- **inv_fami** - FAMI wholesale inventory (dummy data for now)
- **inv_osiel** - Osiel wholesale inventory (dummy data for now)  
- **inv_molly** - Molly wholesale inventory (dummy data for now)
- Read-only catalogs with BUY functionality for purchase orders
- Wholesale pricing visible to EGDC for procurement decisions

**Future Integration Plan**
- Each supplier will have their own warehouse management software (your SaaS product)
- EGDC connects to supplier APIs for real-time catalog access
- Purchase orders automatically sync between retailer and supplier systems
- Inventory transfers update both databases upon order fulfillment

**Total inventory auto-calculated** via database trigger when any location changes.

## Development Workflow

1. **Setup**: Run database script in PostgreSQL (GCP Cloud SQL)
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
│   ├── InventoryTable.tsx           # Main editing interface with supplier support
│   ├── WarehouseTabs.tsx            # Multi-business warehouse switching
│   ├── ProductCard.tsx              # Detailed product view
│   ├── QuickStats.tsx               # Dashboard overview
│   ├── SearchAndFilters.tsx         # Advanced filtering
│   ├── ToastNotification.tsx        # Modern feedback system
│   ├── ProductList.tsx              # List view
│   ├── FilterSection.tsx            # Filter controls
│   └── LoadingScreen.tsx            # Loading states
├── lib/
│   ├── postgres.ts                  # PostgreSQL database manager
│   ├── dummy-warehouse-data.ts      # Supplier catalog dummy data
│   ├── supabase.ts                  # Legacy Supabase client (migration compatibility)
│   └── types.ts                     # TypeScript type definitions
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

### Phase 1: Stability & Security (Week 1) - ✅ COMPLETED & DEPLOYED
- [x] **CRITICAL**: Fix environment variable validation (`lib/supabase.ts`) ✅ COMPLETED
- [x] **CRITICAL**: Fix state mutation bug (`components/FilterSection.tsx`) ✅ COMPLETED
- [x] Add comprehensive input validation to API routes ✅ COMPLETED
- [x] Standardize error handling across all endpoints ✅ COMPLETED
- [x] Implement error boundaries for component protection ✅ COMPLETED
- [x] **PRODUCTION DEPLOYMENT**: Live at inv.lospapatos.com ✅ COMPLETED
- [x] **GOOGLE DRIVE INTEGRATION**: Image preview functionality ✅ COMPLETED
- [x] **BULK OPERATIONS**: UPSERT functionality for import/export ✅ COMPLETED
- [x] **CODEBASE CLEANUP**: Removed 3,500+ lines of legacy code ✅ COMPLETED

### Phase 2: Performance & UX (Week 2) - ✅ COMPLETED & DEPLOYED
- [x] Optimize database queries (batch updates in API routes) ✅ COMPLETED
- [x] Add memoization to expensive calculations (QuickStats, FilterSection) ✅ COMPLETED
- [x] Implement proper loading states throughout app ✅ COMPLETED
- [x] Add accessibility improvements (ARIA labels, keyboard navigation) ✅ COMPLETED
- [x] **PRODUCTION OPTIMIZATION**: 504 timeout fixes and performance improvements ✅ COMPLETED

### Phase 3: Feature Enhancements (Week 3-4)
- [ ] Enhanced Dashboard: Real-time analytics, inventory alerts
- [ ] Advanced Search: Full-text search, barcode scanning
- [ ] Mobile Optimization: Responsive design improvements
- [ ] User Management: Authentication, role-based access

### Phase 4: SaaS Platform Expansion (Month 2)
- [ ] **Wholesaler Software Development**: Build supplier-side warehouse management
- [ ] **Real Supplier API Integration**: Replace dummy data with live supplier connections
- [ ] **Purchase Order Management**: Full order lifecycle tracking and fulfillment
- [ ] **Bulk Purchase System**: Multi-product purchase orders with quantity management
- [ ] **Reporting System**: Custom reports, data export (CSV/Excel)
- [ ] **Real-time Updates**: WebSocket connections for live inventory sync
- [ ] **Mobile App**: React Native companion for both retailers and suppliers

## SaaS Business Model Implementation

### **Platform Strategy**
This system implements a **B2B SaaS marketplace model** where:

**Current Status:**
- **EGDC** = Primary retailer customer (production system)
- **FAMI, Osiel, Molly** = Target wholesale customers (demo/development phase)

**Revenue Model:**
- **Retailer Software**: Subscription-based inventory management (EGDC)
- **Wholesaler Software**: SaaS subscriptions for suppliers (FAMI, Osiel, Molly)
- **Transaction Fees**: Optional commission on purchase orders between businesses

**Technical Architecture:**
- **Independent Databases**: Each business maintains their own data
- **API Integrations**: Cross-business catalog access and purchase orders
- **Role-Based Access**: Retailers can view supplier catalogs, suppliers manage their own inventory
- **Purchase Order System**: Automated inventory transfers between businesses

**Implementation Phases:**
1. ✅ **Retailer MVP** (EGDC system - completed)
2. ✅ **Multi-tenant Architecture** (warehouse tabs + supplier integration - completed)
3. 🔄 **Supplier Software Development** (next phase)
4. 🔄 **Real API Integration** (replace dummy data with live connections)
5. 🔄 **Platform Launch** (onboard real suppliers as SaaS customers)

### Development Status Summary

**✅ PHASE 1 & 2 COMPLETED - PRODUCTION DEPLOYED**
- **Live URL**: inv.lospapatos.com
- **Status**: Fully functional multi-tenant SaaS platform
- **Codebase**: Clean, optimized, and production-ready
- **Performance**: 504 timeout fixes and bulk operation optimization
- **Features**: Complete inventory management with Google Drive integration

**🚀 READY FOR PHASE 3: FEATURE ENHANCEMENTS**

---

**Current Status**: Production-deployed SaaS multi-tenant platform with complete retailer inventory management, supplier integration, bulk operations, image preview system, and foundation for B2B marketplace expansion. Phase 1-2 completed successfully with 3,500+ lines of legacy code removed and performance optimizations deployed.

**🔄 ACTIVE MIGRATION**: Currently implementing multi-tenant transformation. See `MULTI-TENANT-MIGRATION.md` for detailed progress tracking, critical issues, and migration roadmap. Phase 1 (Critical Security Fixes) in progress.