import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';

const distDir = 'dist';
const srcDir = 'src';
const assetsDir = 'assets';

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

try {
  await esbuild.build({
    entryPoints,
    bundle: true,
    outdir: distDir,
    format: 'iife',
    target: 'es2020',
    minify: process.env.NODE_ENV === 'production',
    sourcemap: process.env.NODE_ENV !== 'production',
  });

  console.log('✓ TypeScript compiled successfully');
} catch (error) {
  console.error('✗ TypeScript compilation failed:', error);
  process.exit(1);
}

// Copy static assets
const staticFiles = [
  { src: `${srcDir}/popup/popup.html`, dest: `${distDir}/popup/popup.html` },
  { src: `${srcDir}/popup/popup.css`, dest: `${distDir}/popup/popup.css` },
  { src: `${srcDir}/manifest.json`, dest: `${distDir}/manifest.json` },
];

staticFiles.forEach(({ src, dest }) => {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
});

console.log('✓ Static files copied');

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

  console.log('✓ Icons copied');
}

// Copy locales
const localesDir = `${srcDir}/_locales`;
const destLocalesDir = `${distDir}/_locales`;

if (fs.existsSync(localesDir)) {
  const copyDirRecursive = (src, dest) => {
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
  };

  copyDirRecursive(localesDir, destLocalesDir);
  console.log('✓ Locales copied');
}

console.log('\n✅ Build completed successfully!');
console.log(`   Output directory: ${distDir}/`);
