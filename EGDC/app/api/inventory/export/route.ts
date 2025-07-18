// TENANT-SAFE Export API
// 🔒 All exports validate tenant ownership before data access

import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-context'
import { TenantSafePostgresManager } from '@/lib/postgres-tenant-safe'
import * as XLSX from 'xlsx'

interface ExportRequest {
  products: number[]
  format: 'csv' | 'xlsx'
}

export async function POST(request: NextRequest) {
  try {
    // 🔒 STEP 1: Validate tenant context
    const tenantContext = await getTenantContext(request)
    
    if (!tenantContext) {
      return NextResponse.json({
        success: false,
        error: 'No tenant context found. Please login.',
        code: 'TENANT_CONTEXT_MISSING'
      }, { status: 401 })
    }

    console.log('🔒 Processing export for tenant:', {
      tenant_id: tenantContext.user.tenant_id,
      tenant_name: tenantContext.user.tenant_name,
      user_email: tenantContext.user.email
    })

    const body: ExportRequest = await request.json()
    const { products, format = 'csv' } = body

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Product IDs array is required' },
        { status: 400 }
      )
    }

    console.log(`🔒 Exporting ${products.length} products in ${format} format for tenant ${tenantContext.user.tenant_name}`)

    // 🔒 STEP 2: Get tenant-filtered products
    const productData = []
    
    // Validate each product belongs to the tenant
    for (const productId of products) {
      const product = await TenantSafePostgresManager.getProductById(productId, tenantContext.user.tenant_id)
      if (product) {
        productData.push(product)
      } else {
        console.log(`⚠️ Product ${productId} not found or access denied for tenant ${tenantContext.user.tenant_name}`)
      }
    }

    if (productData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No products found or access denied' },
        { status: 404 }
      )
    }

    console.log(`✅ Validated access to ${productData.length} products for tenant ${tenantContext.user.tenant_name}`)

    // Define export columns with Spanish labels
    const exportColumns = [
      { key: 'id', label: 'ID' },
      { key: 'categoria', label: 'Categoría' },
      { key: 'marca', label: 'Marca' },
      { key: 'modelo', label: 'Modelo' },
      { key: 'color', label: 'Color' },
      { key: 'talla', label: 'Talla' },
      { key: 'sku', label: 'SKU' },
      { key: 'ean', label: 'EAN' },
      // Physical dimensions and weight
      { key: 'height_cm', label: 'Alto (cm)' },
      { key: 'length_cm', label: 'Largo (cm)' },
      { key: 'thickness_cm', label: 'Grosor (cm)' },
      { key: 'weight_grams', label: 'Peso (g)' },
      { key: 'costo', label: 'Costo' },
      { key: 'shein_modifier', label: 'Mod. SHEIN' },
      { key: 'shopify_modifier', label: 'Mod. Shopify' },
      { key: 'meli_modifier', label: 'Mod. MercadoLibre' },
      { key: 'precio_shein', label: 'Precio SHEIN' },
      { key: 'precio_shopify', label: 'Precio Shopify' },
      { key: 'precio_meli', label: 'Precio MercadoLibre' },
      { key: 'inv_egdc', label: 'Inv. EGDC' },
      { key: 'inv_fami', label: 'Inv. FAMI' },
      { key: 'inv_osiel', label: 'Inv. Osiel' },
      { key: 'inv_molly', label: 'Inv. Molly' },
      { key: 'inventory_total', label: 'Total Inventario' },
      { key: 'shein', label: 'SHEIN' },
      { key: 'meli', label: 'MercadoLibre' },
      { key: 'shopify', label: 'Shopify' },
      { key: 'tiktok', label: 'TikTok' },
      { key: 'upseller', label: 'Upseller' },
      { key: 'go_trendier', label: 'Go Trendier' },
      { key: 'created_at', label: 'Creado' },
      { key: 'updated_at', label: 'Actualizado' }
    ]

    // Format data for export
    const exportData = productData.map(product => {
      const row: any = {}
      exportColumns.forEach(col => {
        let value = product[col.key]
        
        // Format special values
        if (col.key.includes('_at') && value) {
          value = new Date(value).toLocaleDateString('es-ES')
        } else if (typeof value === 'boolean') {
          value = value ? 'Sí' : 'No'
        } else if (value === null || value === undefined) {
          value = ''
        }
        
        row[col.label] = value
      })
      return row
    })

    // Generate file based on format
    if (format === 'xlsx') {
      // Create Excel file
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Inventario')
      
      // Set column widths
      const colWidths = exportColumns.map(col => ({ wch: col.label.length + 5 }))
      ws['!cols'] = colWidths
      
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="inventario-${new Date().toISOString().split('T')[0]}.xlsx"`
        }
      })
    } else {
      // Create CSV file
      const headers = exportColumns.map(col => col.label)
      const csvRows = [headers.join(',')]
      
      exportData.forEach(row => {
        const values = exportColumns.map(col => {
          const value = row[col.label]
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        })
        csvRows.push(values.join(','))
      })
      
      const csvContent = csvRows.join('\n')
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="inventario-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

  } catch (error) {
    console.error('❌ Error in tenant-safe export:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to export products',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}