import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  webpack: (config) => {
    config.externals.push('bufferutil', 'utf-8-validate')
    return config
  },
}

export default nextConfig
