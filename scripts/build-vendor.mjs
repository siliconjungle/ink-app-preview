import {build} from 'esbuild';
import {readFile, readdir, writeFile, mkdir, rm} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';

const output = 'public/vendor';
await rm(output, {recursive: true, force: true});
await mkdir(output, {recursive: true});
const result = await build({
  entryPoints: {markdown: 'scripts/vendor/markdown.mjs', mermaid: 'scripts/vendor/mermaid.mjs'},
  outdir: output, bundle: true, splitting: true, format: 'esm', minify: true,
  target: 'es2024', outExtension: {'.js': '.mjs'}, chunkNames: 'chunks/[name]-[hash]',
  legalComments: 'linked', metafile: true,
});
// Keep the upstream license text for every package included in the browser bundles.
const packages = new Map();
for (const input of Object.keys(result.metafile.inputs)) {
  if (!input.startsWith('node_modules/')) continue;
  let directory = dirname(resolve(input));
  while (directory.includes('/node_modules/')) {
    try {
      const pkg = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
      if (pkg.name && pkg.version) {packages.set(pkg.name, {directory, pkg}); break;}
    } catch {}
    directory = dirname(directory);
  }
}
const notices = ['Bundled browser dependencies. Rebuild with npm ci && npm run build.'];
for (const [name, {directory, pkg}] of [...packages].sort(([a], [b]) => a.localeCompare(b))) {
  notices.push(`\n## ${name} ${pkg.version} (${pkg.license || 'see license'})\n`);
  for (const file of await readdir(directory)) {
    if (/^(licen[cs]e|copying|notice)(\.|$)/i.test(file)) {
      try {notices.push(await readFile(join(directory, file), 'utf8'));} catch {}
    }
  }
}
await writeFile(join(output, 'THIRD-PARTY-NOTICES.txt'), notices.join('\n'));
console.log(`Bundled ${packages.size} packages locally (${Object.keys(result.metafile.outputs).length} files).`);
