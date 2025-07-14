import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: 'admin' | 'manager' | 'employee'
    }
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    role: 'admin' | 'manager' | 'employee'
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: 'admin' | 'manager' | 'employee'
  }
}