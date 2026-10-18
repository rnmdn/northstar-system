const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..'), output = path.join(root, 'public');
fs.mkdirSync(output, { recursive: true });
// Explicit public files only. Never copy grading, storage, model artifacts or secrets.
for (const entry of fs.readdirSync(root)) if (entry.endsWith('.html')) fs.copyFileSync(path.join(root, entry), path.join(output, entry));
for (const directory of ['assets', 'styles', 'scripts']) {
  const walk = relative => {
    for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
      const name = path.join(relative, entry.name);
      if (entry.isSymbolicLink()) throw Error('Public assets must not be symlinks.');
      if (entry.isDirectory()) walk(name);
      else if (/\.(?:js|html|css|webp|png|jpe?g|svg|woff2|mp4)$/.test(entry.name)) {
        fs.mkdirSync(path.dirname(path.join(output, name)), { recursive: true });
        fs.copyFileSync(path.join(root, name), path.join(output, name));
      }
    }
  };
  walk(directory);
}
console.log('Built public NorthStar pages and assets.');
