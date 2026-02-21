import fs from 'node:fs';
import path from 'node:path';

const ALLOWED_BUMP_TYPES = new Set(['major', 'minor', 'bugfix']);

const VERSION_TARGETS = [
  {
    filePath: 'package.json',
    getVersions(content) {
      return [['package.json.version', content.version]];
    },
    setVersion(content, nextVersion) {
      content.version = nextVersion;
    },
  },
  {
    filePath: 'package-lock.json',
    getVersions(content) {
      return [
        ['package-lock.json.version', content.version],
        ['package-lock.json.packages[""].version', content.packages?.['']?.version],
      ];
    },
    setVersion(content, nextVersion) {
      content.version = nextVersion;
      if (!content.packages || !content.packages['']) {
        throw new Error('Missing "packages[\"\"]" in package-lock.json.');
      }
      content.packages[''].version = nextVersion;
    },
  },
  {
    filePath: 'src/manifest.chrome.json',
    getVersions(content) {
      return [['src/manifest.chrome.json.version', content.version]];
    },
    setVersion(content, nextVersion) {
      content.version = nextVersion;
    },
  },
  {
    filePath: 'src/manifest.firefox.json',
    getVersions(content) {
      return [['src/manifest.firefox.json.version', content.version]];
    },
    setVersion(content, nextVersion) {
      content.version = nextVersion;
    },
  },
];

function readJson(filePath) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function writeJson(filePath, content) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  fs.writeFileSync(absolutePath, `${JSON.stringify(content, null, 2)}\n`, 'utf8');
}

function parseSemver(version, label) {
  if (typeof version !== 'string') {
    throw new Error(`Expected ${label} to be a version string.`);
  }

  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Expected ${label} to use x.y.z semver format.`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function getNextVersion(currentVersion, bumpType) {
  const parsed = parseSemver(currentVersion, 'current version');
  if (bumpType === 'major') {
    return `${parsed.major + 1}.0.0`;
  }
  if (bumpType === 'minor') {
    return `${parsed.major}.${parsed.minor + 1}.0`;
  }
  return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
}

function printUsageAndExit() {
  console.error('Usage: npm run bump -- <major|minor|bugfix>');
  process.exit(1);
}

const bumpType = process.argv[2];
if (!ALLOWED_BUMP_TYPES.has(bumpType)) {
  printUsageAndExit();
}

const targets = VERSION_TARGETS.map((target) => ({
  ...target,
  content: readJson(target.filePath),
}));

const versionEntries = [];
for (const target of targets) {
  for (const [label, version] of target.getVersions(target.content)) {
    parseSemver(version, label);
    versionEntries.push({
      label,
      version,
    });
  }
}

const uniqueVersions = [...new Set(versionEntries.map((entry) => entry.version))];
if (uniqueVersions.length !== 1) {
  console.error('Version mismatch detected across files:');
  for (const entry of versionEntries) {
    console.error(`- ${entry.label}: ${entry.version}`);
  }
  process.exit(1);
}

const currentVersion = uniqueVersions[0];
const nextVersion = getNextVersion(currentVersion, bumpType);

for (const target of targets) {
  target.setVersion(target.content, nextVersion);
  writeJson(target.filePath, target.content);
}

console.log(`Version bumped: ${currentVersion} -> ${nextVersion}`);
console.log('Updated files:');
for (const target of targets) {
  console.log(`- ${target.filePath}`);
}
