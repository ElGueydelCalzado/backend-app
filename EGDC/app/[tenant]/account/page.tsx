import { Suspense } from 'react'
import { Metadata } from 'next'
import AccountSettings from '../../../components/AccountSettings'

export const metadata: Metadata = {
  title: 'Account Settings | Los Papatos',
  description: 'Manage your account name and display settings',
}

export default function AccountPage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Loading account settings...</span>
          </div>
        </div>
      }
    >
      <AccountSettings />
    </Suspense>
  )
}