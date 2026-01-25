/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',        // <-- forces Next.js to export static HTML
  trailingSlash: true      // optional, helps with routing for static files
}

export default nextConfig
