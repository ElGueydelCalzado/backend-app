# 🎯 **EGDC MARKETPLACE EVOLUTION - TODO LIST**

**Phase 1: Supplier Activation (Weeks 1-2)**  
**Goal**: Convert FAMI, Osiel, Molly from dummy data to real paying customers  
**Status**: 🔄 **READY TO START**

---

## 📋 **TASK BREAKDOWN FOR AI AGENTS**

### **🔥 WEEK 1: DATABASE & TENANT FOUNDATION**

#### **Task 1.1: Enhance Tenants Table Structure**
- **Status**: ⏳ **PENDING**
- **Assignable to**: Database Agent
- **Priority**: HIGH
- **Estimated Time**: 2 hours

**SQL File**: `sql/enhance-tenants-for-suppliers.sql`

```sql
-- Add new columns to existing tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_type VARCHAR(20) DEFAULT 'retailer';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS access_mode VARCHAR(20) DEFAULT 'full_access';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS supplier_settings JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_status VARCHAR(20) DEFAULT 'trial';

-- Update existing EGDC tenant
UPDATE tenants 
SET business_type = 'retailer', 
    access_mode = 'full_access',
    billing_status = 'active'
WHERE subdomain = 'egdc';

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_tenants_business_type ON tenants(business_type);
CREATE INDEX IF NOT EXISTS idx_tenants_access_mode ON tenants(access_mode);
```

**Acceptance Criteria**:
- [ ] New columns added without affecting existing data
- [ ] EGDC tenant properly classified as retailer
- [ ] Indexes created for performance
- [ ] No downtime during migration

---

#### **Task 1.2: Create Real Supplier Tenant Accounts**
- **Status**: ⏳ **PENDING**
- **Assignable to**: Database Agent
- **Priority**: HIGH
- **Estimated Time**: 3 hours

**SQL File**: `sql/create-supplier-tenants.sql`

```sql
INSERT INTO tenants (
  id, name, subdomain, email, phone, address,
  business_type, access_mode, plan, status, billing_status,
  supplier_settings, currency, timezone
) VALUES 
-- FAMI Wholesale
(
  'fami-f47e-4b8d-9c12-a8e5f6789abc',
  'FAMI Wholesale', 
  'fami', 
  'admin@fami-wholesale.com',
  '+52-555-0001',
  'Guadalajara, Jalisco, México',
  'wholesaler',
  'inventory_management',
  'professional',
  'active',
  'trial',
  '{
    "wholesale_pricing": true,
    "minimum_order": 5,
    "shipping_zones": ["Mexico", "Central America"],
    "payment_terms": "Net 30",
    "bulk_discounts": {
      "10+": 0.05,
      "50+": 0.10,
      "100+": 0.15
    }
  }',
  'MXN',
  'America/Mexico_City'
),
-- [Additional supplier data continues...]
```

**Acceptance Criteria**:
- [ ] Three real supplier tenants created with unique UUIDs
- [ ] Each supplier has realistic business information
- [ ] Supplier settings JSON contains wholesale pricing rules
- [ ] All tenants marked as 'trial' billing status initially

---

#### **Task 1.3: Create Supplier User Accounts**
- **Status**: ⏳ **PENDING**
- **Assignable to**: Database Agent
- **Priority**: HIGH
- **Estimated Time**: 2 hours

**SQL File**: `sql/create-supplier-users.sql`

**Acceptance Criteria**:
- [ ] Admin user created for each supplier tenant
- [ ] Users have full permissions for their tenant
- [ ] Email addresses are realistic and follow pattern
- [ ] Users can login and access their tenant's data

---

#### **Task 1.4: Add Purchase Order System**
- **Status**: ⏳ **PENDING**
- **Assignable to**: Database Agent
- **Priority**: HIGH
- **Estimated Time**: 4 hours

**SQL File**: `sql/create-purchase-orders.sql`

```sql
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  
  -- Tenant relationships
  retailer_tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Order details
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  items JSONB NOT NULL,
  
  -- Financial calculations
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) GENERATED ALWAYS AS (
    subtotal + COALESCE(tax_amount, 0) + COALESCE(shipping_cost, 0) - COALESCE(discount_amount, 0)
  ) STORED,
  
  -- Timestamps and tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS policies and indexes
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
-- [Additional SQL continues...]
```

**Acceptance Criteria**:
- [ ] Purchase orders table created with proper constraints
- [ ] RLS policies ensure tenant isolation
- [ ] Automatic timestamp updates on status changes
- [ ] Indexes created for query performance
- [ ] Generated column for total_amount calculation

---

### **⚡ WEEK 1: FRONTEND ENHANCEMENTS**

#### **Task 1.5: Enhance WarehouseTabs Component**
- **Status**: ⏳ **PENDING**
- **Assignable to**: Frontend Agent
- **Priority**: HIGH
- **Estimated Time**: 4 hours

**File**: `components/WarehouseTabs.tsx`

**Key Changes**:
- Add supplier indicators and badges
- Display supplier information (minimum order, payment terms)
- Use real tenant IDs instead of dummy data
- Preserve existing functionality

**Acceptance Criteria**:
- [ ] Component shows supplier vs own warehouse badges
- [ ] Supplier information (minimum order, payment terms) displayed
- [ ] Real tenant IDs used instead of dummy data
- [ ] Existing functionality preserved
- [ ] No breaking changes to parent components

---

#### **Task 1.6: Create Supplier Catalog View Component**
- **Status**: ⏳ **PENDING**
- **Assignable to**: Frontend Agent
- **Priority**: HIGH
- **Estimated Time**: 8 hours

**File**: `components/SupplierCatalogView.tsx`

**Features**:
- Product catalog with wholesale pricing
- Shopping cart functionality
- Bulk discounts display
- Purchase order creation

**Acceptance Criteria**:
- [ ] Shows supplier products with wholesale pricing
- [ ] Shopping cart functionality works
- [ ] Bulk discounts and minimum orders displayed
- [ ] Purchase order creation integrated
- [ ] Responsive design for mobile/desktop

---

#### **Task 1.7: Create Purchase Order API Endpoint**
- **Status**: ⏳ **PENDING**
- **Assignable to**: Backend Agent
- **Priority**: HIGH
- **Estimated Time**: 6 hours

**File**: `app/api/purchase-orders/route.ts`

**Features**:
- POST endpoint for creating orders
- GET endpoint for fetching orders
- Automatic tax and shipping calculation
- Tenant validation and security

**Acceptance Criteria**:
- [ ] Creates purchase orders with proper validation
- [ ] Calculates taxes and shipping automatically
- [ ] Maintains tenant isolation with RLS
- [ ] Returns proper error messages
- [ ] Supports fetching orders with filters

---

### **🔥 WEEK 2: INTEGRATION & TESTING**

#### **Task 2.1: Update Main Inventory Page**
- **Status**: ⏳ **PENDING**
- **Assignable to**: Frontend Agent
- **Priority**: MEDIUM
- **Estimated Time**: 4 hours

**File**: `app/inventario/page.tsx`

**Changes**:
- Switch between inventory table and supplier catalog views
- Handle purchase order creation
- Maintain existing inventory functionality

**Acceptance Criteria**:
- [ ] Switches between inventory table and supplier catalog views
- [ ] Loads appropriate data based on warehouse type
- [ ] Handles purchase order creation
- [ ] Maintains existing inventory editing functionality
- [ ] Shows proper loading states

---

#### **Task 2.2: Update Inventory API for Supplier Filtering**
- **Status**: ⏳ **PENDING**
- **Assignable to**: Backend Agent
- **Priority**: MEDIUM
- **Estimated Time**: 3 hours

**File**: `app/api/inventory/route.ts`

**Enhancement**: Add supplier tenant filtering to existing API

**Acceptance Criteria**:
- [ ] Returns supplier products when supplier_tenant_id provided
- [ ] Maintains existing functionality for own inventory
- [ ] Filters products with available inventory only
- [ ] Maintains tenant isolation through RLS
- [ ] Returns appropriate metadata

---

#### **Task 2.3: Create Product Counts API Endpoint**
- **Status**: ⏳ **PENDING**
- **Assignable to**: Backend Agent
- **Priority**: MEDIUM
- **Estimated Time**: 2 hours

**File**: `app/api/inventory/counts/route.ts`

**Purpose**: Get product counts for warehouse tabs

**Acceptance Criteria**:
- [ ] Returns accurate counts for each warehouse tab
- [ ] Includes own inventory and supplier catalogs  
- [ ] Fast performance with optimized queries
- [ ] Respects tenant isolation
- [ ] Returns consistent format

---

## 🧪 **TESTING & VALIDATION TASKS**

#### **Task 3.1: Database Integration Test**
- **Status**: ⏳ **PENDING**
- **Assignable to**: Testing Agent
- **Priority**: HIGH
- **Estimated Time**: 2 hours

**File**: `scripts/test-supplier-integration.ts`

**Tests**:
- Verify supplier tenants exist
- Test user access to tenants
- Test purchase order creation
- Cleanup test data

**Acceptance Criteria**:
- [ ] All supplier tenants verified
- [ ] User access confirmed
- [ ] Purchase order flow tested
- [ ] Test data properly cleaned up

---

#### **Task 3.2: API Endpoint Test**
- **Status**: ⏳ **PENDING**
- **Assignable to**: Testing Agent
- **Priority**: HIGH
- **Estimated Time**: 2 hours

**File**: `scripts/test-api-endpoints.ts`

**Tests**:
- Inventory API with supplier filtering
- Product counts API
- Purchase orders API

**Acceptance Criteria**:
- [ ] All API endpoints respond correctly
- [ ] Supplier filtering works
- [ ] Error handling tested
- [ ] Performance acceptable

---

## 📊 **PROGRESS TRACKING**

### **Overall Progress**
- **Total Tasks**: 10 main tasks + 2 testing tasks
- **Completed**: 0/12 (0%)
- **In Progress**: 0/12 (0%)
- **Pending**: 12/12 (100%)

### **Week 1 Progress** (Database & Frontend Foundation)
- **Tasks**: 7/7 pending
- **Estimated Total Time**: 29 hours
- **Critical Path**: Tasks 1.1 → 1.2 → 1.3 → 1.4 (Database first)

### **Week 2 Progress** (Integration & Testing)
- **Tasks**: 5/5 pending
- **Estimated Total Time**: 13 hours
- **Dependencies**: Requires Week 1 completion

---

## 🎯 **SUCCESS CRITERIA & DELIVERABLES**

### **Week 1 Deliverables**
- [ ] Enhanced tenants table with business_type and access_mode
- [ ] Three real supplier tenant accounts (FAMI, Osiel, Molly)
- [ ] Purchase orders table with RLS policies
- [ ] Enhanced WarehouseTabs component with supplier indicators
- [ ] SupplierCatalogView component with shopping cart
- [ ] Purchase orders API endpoint (POST and GET)

### **Week 2 Deliverables**  
- [ ] Updated inventory page with supplier catalog view
- [ ] Enhanced inventory API with supplier filtering
- [ ] Product counts API for warehouse tabs
- [ ] Integration tests passing
- [ ] Documentation updated

### **Final Acceptance Criteria**
- [ ] FAMI, Osiel, Molly can login and manage their inventory
- [ ] EGDC can browse supplier catalogs and create purchase orders
- [ ] All warehouse tabs show accurate product counts
- [ ] Purchase orders are created with proper tenant isolation
- [ ] No breaking changes to existing functionality
- [ ] System performance maintained

---

## 🚨 **RISK MITIGATION**

### **Technical Risks**
- [ ] Database migrations tested on staging environment
- [ ] Rollback plan available for each component
- [ ] Existing EGDC functionality fully preserved
- [ ] Performance impact assessed

### **Business Risks**
- [ ] Gradual rollout plan for suppliers
- [ ] Fallback to dummy data if issues arise
- [ ] Customer communication plan ready
- [ ] Support documentation prepared

---

## 🚀 **EXECUTION SEQUENCE**

### **Day 1-2: Database Foundation** (Critical Path)
1. ✅ Task 1.1: Enhance Tenants Table Structure
2. ✅ Task 1.2: Create Real Supplier Tenant Accounts  
3. ✅ Task 1.3: Create Supplier User Accounts
4. ✅ Task 1.4: Add Purchase Order System
5. ✅ Task 3.1: Database Integration Test

### **Day 3-4: Frontend Components**
1. ✅ Task 1.5: Enhance WarehouseTabs Component
2. ✅ Task 1.6: Create Supplier Catalog View Component
3. ✅ Task 1.7: Create Purchase Order API Endpoint

### **Day 5-7: Integration**
1. ✅ Task 2.1: Update Main Inventory Page
2. ✅ Task 2.2: Update Inventory API for Supplier Filtering
3. ✅ Task 2.3: Create Product Counts API Endpoint
4. ✅ Task 3.2: API Endpoint Test

### **Day 8-10: Testing & Polish**
1. End-to-end testing
2. Performance optimization
3. User documentation
4. Supplier onboarding preparation

---

## 📝 **NOTES & UPDATES**

### **Latest Updates**
- **[Date]**: Task list created and prioritized
- **[Date]**: Ready for AI agent assignment
- **[Date]**: Execution sequence finalized

### **Key Decisions**
- ✅ Keep existing single products table (no separate retailer/wholesaler tables)
- ✅ Use tenant-based warehouse tabs for supplier access
- ✅ Implement purchase orders as simple cross-tenant orders
- ✅ Preserve all existing EGDC functionality

### **Next Phase Preview** (Phase 2: Marketplace Integration)
- Shopify API integration
- MercadoLibre API integration  
- Automated price synchronization
- Advanced order management
- Billing and invoicing system

**This todo list transforms your existing system into a working B2B marketplace while preserving all current functionality. Each task is specific, measurable, and builds on your proven foundation!** 