'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { ChevronDown, User, Settings, LogOut, Building } from 'lucide-react'

export default function UserAccountDropdown() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    setIsOpen(false)
    await signOut({ callbackUrl: '/login' })
  }

  if (!session) return null

  const userInitials = session.user?.name 
    ? session.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : session.user?.email?.[0]?.toUpperCase() || 'U'

  return (
    <div className="relative" ref={dropdownRef}>
      {/* User Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-medium">{userInitials}</span>
        </div>
        <div className="hidden md:block text-left">
          <div className="text-sm text-gray-700 font-medium">
            {session.user?.name || 'User'}
          </div>
          <div className="text-xs text-gray-500">
            {session.user?.tenant_name || 'Business'}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">{userInitials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {session.user?.name}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {session.user?.email}
                </div>
                <div className="text-xs text-blue-600 truncate flex items-center mt-1">
                  <Building className="w-3 h-3 mr-1" />
                  {session.user?.tenant_name}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <button
              onClick={() => {
                setIsOpen(false)
                // TODO: Navigate to profile settings
                console.log('Navigate to profile settings')
              }}
              className="w-full px-4 py-2 text-left flex items-center space-x-3 hover:bg-gray-50 transition-colors"
            >
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">Mi Perfil</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false)
                // TODO: Navigate to business settings
                console.log('Navigate to business settings')
              }}
              className="w-full px-4 py-2 text-left flex items-center space-x-3 hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">Configuración</span>
            </button>
          </div>

          {/* Logout */}
          <div className="border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left flex items-center space-x-3 hover:bg-red-50 transition-colors text-red-600"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}