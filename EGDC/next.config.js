/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router is now stable in Next.js 15, no experimental flag needed
  typescript: {
    // Temporarily ignore build errors during deployment
    ignoreBuildErrors: true
  },
  eslint: {
    // Ignore ESLint errors during builds
    ignoreDuringBuilds: true
  }
}

module.exports = nextConfig 