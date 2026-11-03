import { build } from 'esbuild';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { PACKAGE_ID } from '../src/core.mjs';
await mkdir('lib', { recursive: true });
await build({ entryPoints: ['src/host.mjs'], outfile: 'lib/index.js', bundle: true, format: 'esm', platform: 'node', target: 'node22', external: ['@deepseek-ai/schemastery'], legalComments: 'none' });
const result = await build({ entryPoints: ['src/client.jsx'], bundle: true, format: 'cjs', platform: 'browser', target: 'es2022', jsx: 'automatic', external: ['react', 'react/jsx-runtime'], loader: { '.css': 'text' }, write: false, legalComments: 'none' });
await writeFile('lib/client.js', `window.__ModuleLoader__.load({id:${JSON.stringify(PACKAGE_ID)},factory:(require)=>{var module={exports:{}};var exports=module.exports;\n${result.outputFiles[0].text}\nreturn module.exports;}});\n`);
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
console.log(`Built ${pkg.name}@${pkg.version}`);
