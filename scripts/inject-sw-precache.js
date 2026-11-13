import crypto from 'node:crypto'
import fs from 'fs'
import path from 'path'

const distDir = path.resolve('dist')
const swPath = path.resolve('public/sw.js')
const distSwPath = path.join(distDir, 'sw.js')

// Read all files in dist/assets
const assetsDir = path.join(distDir, 'assets')
if (!fs.existsSync(assetsDir)) {
  console.log('No assets dir yet, skipping SW precache injection')
  process.exit(0)
}

const assetFiles = fs.readdirSync(assetsDir).map(f => `/assets/${f}`)

// Read the SW template
let swContent = fs.readFileSync(swPath, 'utf-8')

// Build the ASSETS array
const staticAssets = [
  '/',
  '/index.html',
  '/favicon.png',
  '/manifest.json',
]

const allAssets = [...staticAssets, ...assetFiles]
  .map(p => `  '${p}'`)
  .join(',\n')

const newAssetsBlock = `const ASSETS = [\n${allAssets}\n];`

// Replace the ASSETS block
swContent = swContent.replace(
  /const ASSETS = \[[\s\S]*?\n\];/,
  newAssetsBlock
)

// Stamp the cache with a per-build hash so a new deploy never reuses old entries
const hash = crypto.createHash('sha1').update(allAssets).digest('hex').slice(0, 8)
swContent = swContent.replace(
  /const CACHE_NAME = '[^']*';/,
  `const CACHE_NAME = 'aghsat-${hash}';`
)

fs.writeFileSync(swPath, swContent)
// dist/sw.js is what actually ships — Vite copies public/ before this script runs
fs.writeFileSync(distSwPath, swContent)
console.log(`Injected ${assetFiles.length + staticAssets.length} assets into SW (cache aghsat-${hash}): ${assetFiles.length} from dist/assets + ${staticAssets.length} static`)