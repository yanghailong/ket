// 启动 headless Chrome 运行 tools/smoke.html，等待结果并打印。用法：npm run build && node tools/run-smoke.mjs
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;
const profile = mkdtempSync(join(tmpdir(), 'ket-smoke-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--allow-file-access-from-files',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      target = list.find(t => t.type === 'page');
    } catch { /* Chrome 还没起来 */ }
  }
  if (!target) throw new Error('无法连接 Chrome');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let nextId = 1;
  const pending = new Map();
  ws.addEventListener('message', e => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  });
  const send = (method, params = {}) => new Promise(r => {
    const id = nextId++;
    pending.set(id, r);
    ws.send(JSON.stringify({ id, method, params }));
  });
  const url = pathToFileURL(resolve('tools/smoke.html')).href + (process.argv[2] ? `#${process.argv[2]}` : '');
  await send('Page.navigate', { url });
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    await sleep(500);
    const r = await send('Runtime.evaluate', { expression: 'document.getElementById("log") ? document.getElementById("log").textContent : ""', returnByValue: true });
    const text = r.result && r.result.result ? r.result.result.value : '';
    if (text.includes('== ')) {
      console.log(text);
      return text.includes(', 0 failed') ? 0 : 1;
    }
  }
  throw new Error('冒烟测试超时');
}

main()
  .then(code => { process.exitCode = code; })
  .catch(err => { console.error(err.message); process.exitCode = 1; })
  .finally(() => { chrome.kill(); setTimeout(() => rmSync(profile, { recursive: true, force: true }), 500); });
