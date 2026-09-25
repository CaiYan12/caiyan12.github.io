import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const minify = !process.argv.includes('--dev');
const res = await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  minify,
  write: false,
  target: ['es2020'],
  legalComments: 'none',
  logLevel: 'warning',
});
let js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
let html = readFileSync('index.template.html', 'utf8');
const og = process.env.OG_IMAGE ? `<meta property="og:image" content="${process.env.OG_IMAGE}" />` : '';
html = html.replace('<!--OG_IMAGE-->', og).replace('/*APP_JS*/', () => js);
// 产物落点锚定脚本自身位置（import.meta.dirname），不依赖 process.cwd()：
// 无论从仓库根还是本目录调用 `node build.mjs`，都写到 public/pelican-bike/index.html。
const outDir = join(import.meta.dirname, '..', '..', 'public', 'pelican-bike');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'index.html'), html);
console.log(`dist/index.html ${(html.length / 1024).toFixed(1)} KB (js ${(js.length / 1024).toFixed(1)} KB)`);
