/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only use static export when building for Capacitor (set STATIC_EXPORT=true)
  // This allows API routes to work in dev mode and on Vercel
  ...(process.env.STATIC_EXPORT === 'true' ? { output: 'export' } : {}),
  trailingSlash: true
}

export default nextConfig
