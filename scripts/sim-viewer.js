#!/usr/bin/env node
/**
 * 模拟器实时查看器（headless 环境下的「有头」替代方案）
 *
 * 这台机器的 Xcode 是精简安装，没有 Simulator.app，所以没有原生设备窗口。
 * 这个脚本用 simctl 定时抓屏，做成一个本地网页，把模拟器画面投到浏览器里；
 * 如果装了 idb-companion，还能把网页上的点击/输入转发回模拟器，实现真实交互。
 *
 * 用法：
 *     node scripts/sim-viewer.js          # 默认 8088 端口，自动打开浏览器
 *     node scripts/sim-viewer.js --port 9000
 *     node scripts/sim-viewer.js --udid <UDID>
 */

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile, spawn } = require('child_process');

const args = process.argv.slice(2);
function arg(flag, fallback) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const PORT = parseInt(arg('--port', '8088'), 10);
const BUNDLE_ID = 'com.kunweisu.todolist';
const SHOT_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'simview-'));

// ---------------------------------------------------------------- 设备信息

function run(cmd, cmdArgs) {
  return new Promise((resolve, reject) => {
    execFile(cmd, cmdArgs, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || err.message));
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

function bootedUdid() {
  const out = require('child_process')
    .execSync('xcrun simctl list devices booted')
    .toString();
  const match = out.match(/\(([0-9A-Fa-f-]{20,})\)/);
  if (!match) {
    throw new Error('没有已启动的模拟器，请先运行 ./scripts/run-sim.sh');
  }
  return match[1];
}

const UDID = arg('--udid', bootedUdid());

/** 设备的点数尺寸（不是像素）。拿不到时先占位，拿到截图后再校正。 */
let pointsWidth = 402;
let pointsHeight = 874;

async function detectScreenSize() {
  try {
    const out = await run('idb', ['list-targets', '--json']);
    const targets = JSON.parse(out);
    const target = targets.find(t => t.udid === UDID);
    if (target && target.screenWidth && target.screenHeight) {
      pointsWidth = target.screenWidth;
      pointsHeight = target.screenHeight;
      console.log(`[尺寸] 来自 idb：${pointsWidth}x${pointsHeight} pt`);
      return;
    }
  } catch {
    // idb 没装就走默认推断
  }
  console.log('[尺寸] idb 不可用，稍后按截图分辨率推断');
}

// ---------------------------------------------------------------- 抓屏循环

let screenshot = null;
let capturing = false;

function captureLoop() {
  if (capturing) {
    return;
  }
  capturing = true;
  const tmp = path.join(SHOT_DIR, `shot-${Date.now()}.png`);
  execFile('xcrun', ['simctl', 'io', UDID, 'screenshot', tmp], err => {
    capturing = false;
    if (!err) {
      try {
        const buf = fs.readFileSync(tmp);
        screenshot = buf;
        // 首次抓到截图后，用像素尺寸反推点数（假设 2x/3x 屏）
        const width = buf.readUInt32BE(16);
        const height = buf.readUInt32BE(20);
        const scale = Math.round(width / pointsWidth);
        if (scale >= 2 && scale <= 3) {
          pointsWidth = Math.round(width / scale);
          pointsHeight = Math.round(height / scale);
        }
      } catch (e) {
        // 忽略读取失败
      }
    }
    try {
      fs.unlinkSync(tmp);
    } catch (e) {
      // 忽略
    }
    setTimeout(captureLoop, 250);
  });
}

// ---------------------------------------------------------------- 交互转发

async function hasIdb() {
  try {
    await run('idb', ['list-targets', '--json']);
    return true;
  } catch {
    return false;
  }
}

async function sendTap(fx, fy) {
  const x = Math.round(fx * pointsWidth);
  const y = Math.round(fy * pointsHeight);
  await run('idb', [
    'ui',
    'tap',
    '--udid',
    UDID,
    String(x),
    String(y),
  ]);
  return { x, y };
}

async function sendSwipe(fx1, fy1, fx2, fy2) {
  const x1 = Math.round(fx1 * pointsWidth);
  const y1 = Math.round(fy1 * pointsHeight);
  const x2 = Math.round(fx2 * pointsWidth);
  const y2 = Math.round(fy2 * pointsHeight);
  await run('idb', [
    'ui',
    'swipe',
    '--udid',
    UDID,
    '--duration',
    '0.3',
    String(x1),
    String(y1),
    String(x2),
    String(y2),
  ]);
  return { x1, y1, x2, y2 };
}

async function sendText(text) {
  await run('idb', ['ui', 'text', '--udid', UDID, text]);
  return text;
}

async function sendKey(keyCode) {
  await run('idb', ['ui', 'key', '--udid', UDID, String(keyCode)]);
  return keyCode;
}

// ---------------------------------------------------------------- HTTP 服务

const PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>TODOLIST 模拟器</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: #0d0f14; color: #e5e7eb;
    font: 14px/1.5 -apple-system, "PingFang SC", system-ui, sans-serif;
    display: flex; flex-direction: column; align-items: center;
    min-height: 100vh; padding: 20px 12px 40px;
  }
  header { width: 100%; max-width: 460px; margin-bottom: 14px;
    display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  h1 { font-size: 15px; font-weight: 600; margin: 0; letter-spacing: .3px; }
  .badge { font-size: 11px; padding: 3px 8px; border-radius: 999px;
    background: #1b2c47; color: #7fb3ff; border: 1px solid #24405f; }
  .badge.bad { background: #3b1d1d; color: #f8a3a3; border-color: #5a2b2b; }
  .frame { position: relative; width: 402px; max-width: 100%;
    border-radius: 44px; padding: 10px; background: #1a1d23;
    box-shadow: 0 24px 70px rgba(0,0,0,.65), 0 0 0 1px #2a2e37; }
  .screen { position: relative; border-radius: 34px; overflow: hidden;
    background: #000; aspect-ratio: 402 / 874; }
  .screen img { width: 100%; display: block; user-select: none; -webkit-user-drag: none; }
  .screen.busy::after { content: ''; position: absolute; inset: 0;
    background: rgba(13,15,20,.35); }
  .bar { width: 100%; max-width: 402px; margin-top: 16px;
    display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  input[type=text] { flex: 1; min-width: 160px; padding: 9px 12px; border-radius: 9px;
    border: 1px solid #2a2e37; background: #15181e; color: #e5e7eb; font-size: 13px; }
  button { padding: 9px 14px; border-radius: 9px; border: 1px solid #2a2e37;
    background: #1e222a; color: #e5e7eb; font-size: 13px; cursor: pointer; }
  button:hover { background: #262b35; }
  button.primary { background: #2563eb; border-color: #2563eb; color: #fff; }
  .hint { width: 100%; max-width: 402px; margin-top: 10px; color: #6b7280; font-size: 12px; }
  #log { width: 100%; max-width: 402px; margin-top: 8px; color: #9ca3af;
    font-size: 11px; font-family: ui-monospace, Menlo, monospace;
    white-space: pre-wrap; min-height: 16px; }
</style>
</head>
<body>
  <header>
    <h1>TODOLIST · iPhone 18 Pro 模拟器</h1>
    <span class="badge" id="status">连接中…</span>
  </header>

  <div class="frame">
    <div class="screen" id="screen">
      <img id="shot" alt="模拟器画面" />
    </div>
  </div>

  <div class="bar">
    <input type="text" id="text" placeholder="输入文字后回车，发给模拟器" />
    <button id="return">回车</button>
    <button id="home">主屏</button>
  </div>

  <div class="hint">点击画面 = 模拟器点击 · 拖动 = 滑动 · 需要 idb-companion 支持</div>
  <div id="log"></div>

<script>
const shot = document.getElementById('shot');
const status = document.getElementById('status');
const screen = document.getElementById('screen');
const log = document.getElementById('log');

function say(msg) { log.textContent = msg; }

// 刷新画面
function refresh() {
  const img = new Image();
  img.onload = () => {
    shot.src = img.src;
    status.textContent = '实时画面';
    status.className = 'badge';
  };
  img.onerror = () => {
    status.textContent = '等待画面…';
    status.className = 'badge bad';
  };
  img.src = '/screen.png?t=' + Date.now();
}
refresh();
setInterval(refresh, 400);

// 点击
let down = null;
shot.addEventListener('mousedown', e => {
  const r = shot.getBoundingClientRect();
  down = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
});
shot.addEventListener('mouseup', async e => {
  if (!down) return;
  const r = shot.getBoundingClientRect();
  const up = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  const dx = Math.abs(up.x - down.x), dy = Math.abs(up.y - down.y);
  down = null;
  if (dx < 0.02 && dy < 0.02) {
    await fetch('/tap', { method: 'POST', body: JSON.stringify({ x: up.x, y: up.y }) })
      .then(r => r.text()).then(say).catch(err => say('点击失败: ' + err));
  } else {
    await fetch('/swipe', { method: 'POST', body: JSON.stringify({ x1: up.x, y1: up.y, x2: down.x, y2: down.y }) })
      .then(r => r.text()).then(say).catch(err => say('滑动失败: ' + err));
  }
});

document.getElementById('text').addEventListener('keydown', async e => {
  if (e.key !== 'Enter') return;
  const v = e.target.value;
  e.target.value = '';
  await fetch('/text', { method: 'POST', body: v })
    .then(r => r.text()).then(say).catch(err => say('输入失败: ' + err));
});
document.getElementById('return').onclick = async () => {
  await fetch('/key/40').then(r => r.text()).then(say);
};
document.getElementById('home').onclick = async () => {
  await fetch('/home').then(r => r.text()).then(say);
};
</script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(PAGE);
    return;
  }

  if (url.pathname === '/screen.png') {
    if (!screenshot) {
      res.writeHead(503);
      res.end('no frame yet');
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
    });
    res.end(screenshot);
    return;
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', async () => {
      try {
        let result;
        if (url.pathname === '/tap') {
          const { x, y } = JSON.parse(body);
          result = await sendTap(x, y);
        } else if (url.pathname === '/swipe') {
          const p = JSON.parse(body);
          result = await sendSwipe(p.x1, p.y1, p.x2, p.y2);
        } else if (url.pathname === '/text') {
          result = await sendText(body);
        } else if (url.pathname.startsWith('/key/')) {
          result = await sendKey(url.pathname.split('/')[2]);
        } else if (url.pathname === '/home') {
          await run('xcrun', ['simctl', 'terminate', UDID, BUNDLE_ID]).catch(() => {});
          result = '已回到主屏';
        } else {
          res.writeHead(404);
          res.end('unknown');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('OK ' + JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('失败：' + err.message);
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('not found');
});

server.listen(PORT, async () => {
  console.log(`模拟器查看器已启动：http://localhost:${PORT}`);
  console.log(`设备 UDID：${UDID}`);
  const idbOk = await hasIdb();
  console.log(idbOk ? 'idb 可用 → 支持点击 / 滑动 / 输入' : 'idb 不可用 → 仅能看，不能点');
  await detectScreenSize();
  captureLoop();

  if (process.platform === 'darwin') {
    spawn('open', [`http://localhost:${PORT}`], { stdio: 'ignore' });
  }
});
