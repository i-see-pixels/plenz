import { existsSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

const blockedDirs = [
  "apps/web/src/components/ui",
  "apps/extension/src/components/ui",
]

function walk(dir) {
  const entries = readdirSync(dir)
  const files = []

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stats = statSync(fullPath)

    if (stats.isDirectory()) {
      files.push(...walk(fullPath))
      continue
    }

    files.push(fullPath)
  }

  return files
}

const violations = blockedDirs.flatMap((dir) => {
  if (!existsSync(dir)) {
    return []
  }

  return walk(dir)
})

if (violations.length > 0) {
  console.error("Found app-local shadcn primitives. Use @promptlens/ui instead:")
  for (const file of violations) {
    console.error(` - ${file}`)
  }
  process.exit(1)
}

console.log("No app-local shadcn primitive files found.")
