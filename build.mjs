import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { TOPICS } from './src/words/topics.js';
import { WORDS } from './src/words/index.js';
import { validateWords } from './tools/validate-words.js';

// 拼接顺序：被依赖的模块在前；app.js 最后
const ORDER = [
  'src/dates.js',
  'src/words/topics.js',
  ...TOPICS.map(t => `src/words/${t.key}.js`),
  'src/words/index.js',
  'src/srs.js',
  'src/daily.js',
  'src/rewards.js',
  'src/session.js',
  'src/distractors.js',
  'src/storage.js',
  'src/speech.js',
  'src/sound.js',
  'src/ui/dom.js',
  'src/ui/celebrate.js',
  'src/ui/home.js',
  'src/ui/quiz.js',
  'src/ui/screen.js',
  'src/ui/review.js',
  'src/app.js',
];

const DECL_RE = /^(?:export\s+)?(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/;

export function bundleSources(sources) {
  const seen = new Map();
  return sources.map(({ file, text }) => {
    const out = [];
    for (const line of text.split('\n')) {
      if (/^import\s/.test(line)) continue;
      const m = line.match(DECL_RE);
      if (m) {
        if (seen.has(m[1])) throw new Error(`顶层名字重复：${m[1]}（${seen.get(m[1])} 和 ${file}）`);
        seen.set(m[1], file);
      }
      out.push(line.replace(/^export\s+/, ''));
    }
    return `// ---- ${file} ----\n${out.join('\n')}`;
  }).join('\n');
}

function main() {
  const allSrc = readdirSync('src', { recursive: true })
    .filter(f => f.endsWith('.js'))
    .map(f => 'src/' + f.split(sep).join('/'));
  const missing = allSrc.filter(f => !ORDER.includes(f));
  if (missing.length) throw new Error(`build.mjs 的 ORDER 里缺少：${missing.join(', ')}`);

  const errors = validateWords(WORDS, TOPICS);
  if (errors.length) throw new Error(`词库有 ${errors.length} 处问题：\n${errors.join('\n')}`);
  if (WORDS.length < 1400 || WORDS.length > 1600) console.warn(`提示：当前 ${WORDS.length} 词，目标 1400–1600 词`);

  const script = bundleSources(ORDER.map(file => ({ file, text: readFileSync(file, 'utf8') })));
  new Function(script); // 只做语法检查，不执行
  if (script.includes('</script')) throw new Error('脚本里不能出现 </script');

  const html = readFileSync('src/index.html', 'utf8')
    .replace('/*STYLE*/', () => readFileSync('src/styles.css', 'utf8'))
    .replace('/*SCRIPT*/', () => script);
  mkdirSync('dist', { recursive: true });
  writeFileSync('dist/ket-vocab.html', html);
  console.log(`已生成 dist/ket-vocab.html（${WORDS.length} 词，${Math.round(html.length / 1024)} KB）`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
