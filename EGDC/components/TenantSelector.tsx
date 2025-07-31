'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface TenantData {
  id: string
  name: string
  subdomain: string
  icon: string
  isSupplier: boolean
  minOrder?: number
  paymentTerms?: string
  isActive: boolean
}

interface TenantSelectorProps {
  currentTenant?: string
  businessType?: 'supplier' | 'retailer'
  onTenantChange?: (tenantId: string) => void
}

export default function TenantSelector({ currentTenant, businessType, onTenantChange }: TenantSelectorProps) {
  const router = useRouter()
  const { data: session } = useSession()

  // Mock tenant data based on old app screenshots
  const tenants: TenantData[] = [
    {
      id: 'egdc',
      name: 'EGDC',
      subdomain: 'egdc',
      icon: '🏢',
      isSupplier: false,
      isActive: currentTenant === 'egdc'
    },
    {
      id: 'fami',
      name: 'FAMI',
      subdomain: 'fami',
      icon: '👤',
      isSupplier: true,
      minOrder: 5,
      paymentTerms: 'Net 30 4',
      isActive: currentTenant === 'fami'
    },
    {
      id: 'osiel',
      name: 'Osiel',
      subdomain: 'osiel',
      icon: '👤',
      isSupplier: true,
      isActive: currentTenant === 'osiel'
    },
    {
      id: 'molly',
      name: 'Molly',
      subdomain: 'molly',
      icon: '👤',
      isSupplier: true,
      isActive: currentTenant === 'molly'
    }
  ]

  const handleTenantClick = (tenant: TenantData) => {
    if (tenant.subdomain !== currentTenant) {
      if (onTenantChange) {
        onTenantChange(tenant.id)
      } else {
        // Navigate to the new tenant
        router.push(`/${tenant.subdomain}/dashboard`)
      }
    }
  }

  return (
    <div className="px-6 py-3 bg-white border-b border-gray-200">
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
        {tenants.map((tenant) => (
          <div
            key={tenant.id}
            onClick={() => handleTenantClick(tenant)}
            className={`egdc-tenant-card ${tenant.isActive ? 'active' : ''}`}
          >
            {/* Tenant Icon */}
            <span className="text-lg">{tenant.icon}</span>
            
            {/* Tenant Name */}
            <span className="whitespace-nowrap">
              {tenant.name}
              {tenant.id === 'egdc' && ' 0'}
            </span>
            
            {/* Supplier Badge */}
            {tenant.isSupplier && (
              <span className="egdc-tenant-badge supplier">
                SUPPLIER
              </span>
            )}
            
            {/* Additional Info for FAMI */}
            {tenant.id === 'fami' && tenant.minOrder && tenant.paymentTerms && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span>Min: {tenant.minOrder}</span>
                <span>|</span>
                <span>{tenant.paymentTerms}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}