import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function getFiles(dir, fileName) {
  const results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      const subFilePath = path.join(fullPath, fileName);
      if (fs.existsSync(subFilePath)) {
        results.push(subFilePath);
      }
    }
  }
  return results;
}

function bumpVersion() {
  const releaseType = process.argv[2];
  if (!['major', 'minor', 'patch'].includes(releaseType)) {
    console.error('Usage: node bump-version.mjs <major|minor|patch>');
    process.exit(1);
  }

  const rootPkgPath = path.join(rootDir, 'package.json');
  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
  const currentVersion = rootPkg.version;

  const parts = currentVersion.split('.').map(Number);
  if (releaseType === 'major') {
    parts[0]++;
    parts[1] = 0;
    parts[2] = 0;
  } else if (releaseType === 'minor') {
    parts[1]++;
    parts[2] = 0;
  } else if (releaseType === 'patch') {
    parts[2]++;
  }

  const newVersion = parts.join('.');
  console.log(`Bumping version from ${currentVersion} to ${newVersion}`);

  // Files to update
  const pkgFiles = [
    rootPkgPath,
    ...getFiles(path.join(rootDir, 'apps'), 'package.json'),
    ...getFiles(path.join(rootDir, 'packages'), 'package.json')
  ];

  for (const file of pkgFiles) {
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    pkg.version = newVersion;
    fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`Updated ${path.relative(rootDir, file)}`);
  }

  // Update manifest.json
  const manifestPath = path.join(rootDir, 'apps/extension/public/manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.version = newVersion;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`Updated ${path.relative(rootDir, manifestPath)}`);
  }
}

bumpVersion();
