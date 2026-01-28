import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';

const srcDir = 'src';
const assetsDir = 'assets';

// Parse command line arguments for browser target
const args = process.argv.slice(2);
const targetArg = args.find((arg) => arg.startsWith('--target='));
const target = targetArg ? targetArg.split('=')[1] : 'all';

const validTargets = ['firefox', 'chrome', 'all'];
if (!validTargets.includes(target)) {
  console.error(`Invalid target: ${target}. Valid targets are: ${validTargets.join(', ')}`);
  process.exit(1);
}

const targets = target === 'all' ? ['firefox', 'chrome'] : [target];

/**
 * Copy directory recursively
 */
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  fs.readdirSync(src).forEach((item) => {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);

    if (fs.statSync(srcPath).isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

/**
 * Build extension for a specific browser target
 */
async function buildForTarget(browserTarget) {
  const distDir = `dist/${browserTarget}`;
  const isChrome = browserTarget === 'chrome';

  console.log(`\n🔨 Building for ${browserTarget}...`);

  // Clean and create dist directory
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true });
  }
  fs.mkdirSync(distDir, { recursive: true });

  // Build TypeScript files
  const entryPoints = [
    `${srcDir}/background/background.ts`,
    `${srcDir}/content/content.ts`,
    `${srcDir}/popup/popup.ts`,
  ];

  // Chrome MV3 uses ES modules for service workers, Firefox MV2 uses IIFE
  const format = isChrome ? 'esm' : 'iife';

  try {
    await esbuild.build({
      entryPoints,
      bundle: true,
      outdir: distDir,
      format,
      target: 'es2020',
      minify: process.env.NODE_ENV === 'production',
      sourcemap: process.env.NODE_ENV !== 'production',
    });

    console.log(`  ✓ TypeScript compiled (${format} format)`);
  } catch (error) {
    console.error(`  ✗ TypeScript compilation failed:`, error);
    process.exit(1);
  }

  // Copy static assets
  const staticFiles = [
    { src: `${srcDir}/popup/popup.html`, dest: `${distDir}/popup/popup.html` },
    { src: `${srcDir}/popup/popup.css`, dest: `${distDir}/popup/popup.css` },
  ];

  staticFiles.forEach(({ src, dest }) => {
    const destDirPath = path.dirname(dest);
    if (!fs.existsSync(destDirPath)) {
      fs.mkdirSync(destDirPath, { recursive: true });
    }
    fs.copyFileSync(src, dest);
  });

  console.log('  ✓ Static files copied');

  // Copy browser-specific manifest
  const manifestSrc = `${srcDir}/manifest.${browserTarget}.json`;
  const manifestDest = `${distDir}/manifest.json`;

  if (fs.existsSync(manifestSrc)) {
    fs.copyFileSync(manifestSrc, manifestDest);
    console.log(`  ✓ Manifest copied (${browserTarget}-specific)`);
  } else {
    // Fallback to generic manifest if browser-specific doesn't exist
    fs.copyFileSync(`${srcDir}/manifest.json`, manifestDest);
    console.log('  ✓ Manifest copied (generic)');
  }

  // Copy icons
  const iconsDir = `${assetsDir}/icons`;
  const destIconsDir = `${distDir}/icons`;

  if (fs.existsSync(iconsDir)) {
    if (!fs.existsSync(destIconsDir)) {
      fs.mkdirSync(destIconsDir, { recursive: true });
    }

    fs.readdirSync(iconsDir).forEach((file) => {
      fs.copyFileSync(`${iconsDir}/${file}`, `${destIconsDir}/${file}`);
    });

    console.log('  ✓ Icons copied');
  }

  // Copy locales
  const localesDir = `${srcDir}/_locales`;
  const destLocalesDir = `${distDir}/_locales`;

  if (fs.existsSync(localesDir)) {
    copyDirRecursive(localesDir, destLocalesDir);
    console.log('  ✓ Locales copied');
  }

  console.log(`  ✅ ${browserTarget} build completed → ${distDir}/`);
}

// Build for all targets
console.log('🚀 Extension Build Script');
console.log(`   Target(s): ${targets.join(', ')}`);
console.log(`   Mode: ${process.env.NODE_ENV === 'production' ? 'production' : 'development'}`);

for (const browserTarget of targets) {
  await buildForTarget(browserTarget);
}

console.log('\n✅ All builds completed successfully!');
