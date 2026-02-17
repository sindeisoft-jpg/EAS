import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // 原生 Node 模块不参与打包，运行时从 node_modules 加载
  serverExternalPackages: ["better-sqlite3"],
  // 明确指定 Turbopack 的根目录，避免多个 lockfiles 的警告
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig
