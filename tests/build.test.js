import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { bundleSources } from '../build.mjs';

test('构建生成单个可解析、无外部地址的 HTML', () => {
  execFileSync(process.execPath, ['build.mjs'], { stdio: 'pipe' });
  const html = readFileSync('dist/ket-vocab.html', 'utf8');
  assert.match(html, /<div id="app"><\/div>/);
  assert.doesNotMatch(html, /https?:\/\//);
  const script = html.split('<script>')[1].split('</script>')[0];
  assert.doesNotMatch(script, /^import\s/m);
  assert.doesNotMatch(script, /^export\s/m);
  assert.doesNotThrow(() => new Function(script));
  assert.match(script, /function renderHome/);
  assert.match(script, /boot\(\);/);
  assert.equal(readFileSync('index.html', 'utf8'), html, '根目录 index.html 供 GitHub Pages 使用，需与 dist 一致');
});

test('顶层名字重复时构建失败', () => {
  assert.throws(
    () => bundleSources([{ file: 'a.js', text: 'export function foo() {}' }, { file: 'b.js', text: 'const foo = 1;' }]),
    /顶层名字重复：foo/,
  );
});

test('bundleSources 去掉 import 行和 export 前缀', () => {
  const out = bundleSources([{ file: 'a.js', text: "import { x } from './x.js';\nexport const y = 1;" }]);
  assert.doesNotMatch(out, /import/);
  assert.match(out, /^const y = 1;$/m);
});
