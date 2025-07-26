import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: 'admin' | 'manager' | 'employee'
      tenant_id: string
      tenant_name: string
      tenant_subdomain: string
    }
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    role: 'admin' | 'manager' | 'employee'
    tenant_id: string
    tenant_name: string
    tenant_subdomain: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: 'admin' | 'manager' | 'employee'
    tenant_id: string
    tenant_name: string
    tenant_subdomain: string
  }
}