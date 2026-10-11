const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const V3 = path.join(__dirname, 'apply-phase4-completion-v3.js');

const files = [
  path.join(ROOT, 'server', 'server.js'),
  path.join(ROOT, 'src', 'components', 'ClockInOut.js'),
  path.join(ROOT, 'src', 'components', 'ManagementView.js')
];

const originals = new Map();
const eols = new Map();

const restoreOriginals = () => {
  for (const file of files) {
    if (originals.has(file)) {
      fs.writeFileSync(file, originals.get(file), 'utf8');
    }
  }
};

try {
  console.log('Preparing CRLF-safe Phase 4 validation...');

  for (const file of files) {
    const original = fs.readFileSync(file, 'utf8');
    originals.set(file, original);
    eols.set(file, original.includes('\r\n') ? '\r\n' : '\n');

    // v3 uses LF anchors. Normalise only for the duration of the guarded run.
    const normalized = original.replace(/\r\n/g, '\n');
    fs.writeFileSync(file, normalized, 'utf8');
  }

  const result = spawnSync(
    process.execPath,
    [V3],
    {
      cwd: ROOT,
      stdio: 'inherit'
    }
  );

  if (result.status !== 0) {
    console.error('v3 validation failed. Restoring the exact original files...');
    restoreOriginals();
    process.exit(result.status || 1);
  }

  // Restore each file's original line-ending style after successful patching.
  for (const file of files) {
    const patched = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    const eol = eols.get(file);
    const finalText = eol === '\r\n'
      ? patched.replace(/\n/g, '\r\n')
      : patched;
    fs.writeFileSync(file, finalText, 'utf8');
  }

  console.log('Phase 4 completion patch v4 applied successfully with original line endings restored.');

} catch (error) {
  console.error(`ERROR: ${error.message}`);
  try {
    restoreOriginals();
    console.error('Original files restored after the error.');
  } catch (restoreError) {
    console.error(`RESTORE ERROR: ${restoreError.message}`);
  }
  process.exit(1);
}
