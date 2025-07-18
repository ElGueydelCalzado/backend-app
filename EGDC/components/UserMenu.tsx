'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { User, LogOut, Shield } from 'lucide-react'

export default function UserMenu() {
  const { data: session } = useSession()
  const [showMenu, setShowMenu] = useState(false)

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  if (!session?.user) return null

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
      >
        <User className="h-4 w-4 text-gray-600" />
        <div className="text-left">
          <div className="text-sm font-medium text-gray-700">{session.user.name}</div>
          <div className="text-xs text-gray-500">{session.user.tenant_name}</div>
        </div>
        <Shield className={`h-3 w-3 ${session.user.role === 'admin' ? 'text-red-500' : 'text-blue-500'}`} />
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border z-50">
          <div className="px-4 py-3 border-b">
            <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
            <p className="text-xs text-gray-500">{session.user.email}</p>
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-xs text-blue-600 font-medium">{session.user.tenant_name}</p>
              <p className="text-xs text-gray-500">{session.user.tenant_subdomain}.egdc.app</p>
              <p className="text-xs text-green-600 capitalize">{session.user.role}</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      )}
      
      {showMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  )
}