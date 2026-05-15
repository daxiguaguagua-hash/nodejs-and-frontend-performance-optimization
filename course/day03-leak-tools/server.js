const express = require('express');
const v8 = require('v8');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3200;

const snapshotDir = path.join(__dirname, 'snapshots');
if (!fs.existsSync(snapshotDir)) fs.mkdirSync(snapshotDir);

// 泄漏1：全局数组
const globalLeak = [];

// 泄漏2：未清理的 EventEmitter 监听器
const EventEmitter = require('events');
const bus = new EventEmitter();
let listenerCount = 0;

// 泄漏3：闭包持有大对象
function createLeakyClosure() {
  const bigData = Buffer.alloc(10 * 1024 * 1024);
  return () => bigData.length;
}

// 泄漏4：未销毁的定时器
const timers = [];

// 泄漏5：Map 强引用不清理
const strongMap = new Map();
let mapKey = 0;

// ---------- 路由 ----------

app.get('/leak/1-global', (req, res) => {
  globalLeak.push(Buffer.alloc(10 * 1024));
  res.json({ type: '全局数组', count: globalLeak.length });
});

app.get('/leak/2-listener', (req, res) => {
  const handler = () => {};
  bus.on('tick', handler);
  listenerCount++;
  res.json({ type: '事件监听器泄漏', listeners: listenerCount });
});

app.get('/leak/3-closure', (req, res) => {
  const fn = createLeakyClosure(); // 每次创建 10MB Buffer
  res.json({ type: '闭包泄漏', size: fn() });
});

app.get('/leak/4-timer', (req, res) => {
  const data = [];
  const id = setInterval(() => {
    data.push(Buffer.alloc(5 * 1024));
  }, 500);
  timers.push({ id, data });
  res.json({ type: '定时器泄漏', activeTimers: timers.length });
});

app.get('/leak/5-map', (req, res) => {
  strongMap.set(++mapKey, Buffer.alloc(10 * 1024));
  res.json({ type: 'Map强引用', entries: strongMap.size });
});

// 拍快照
app.get('/snapshot', (req, res) => {
  const filename = `heap-${Date.now()}.heapsnapshot`;
  const filepath = path.join(snapshotDir, filename);
  v8.writeHeapSnapshot(filepath);
  res.json({ snapshot: filename, dir: snapshotDir });
});

app.get('/status', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    // heapUsed — V8 堆已用内存（JS对象、闭包、数组等），泄漏直接体现在这里
    heapUsedMB: (mem.heapUsed / 1024 / 1024).toFixed(2),
    // rss — 进程占用的物理内存总量（堆 + 栈 + 原生内存 + 代码段），比 heapUsed 大
    rssMB: (mem.rss / 1024 / 1024).toFixed(2),
    // 泄漏1：全局数组没有被释放，length 持续增长
    globalLeak: globalLeak.length,
    // 泄漏2：EventEmitter 监听器没 removeListener，数量只增不减
    listeners: listenerCount,
    // 泄漏4：setInterval 未被 clearInterval，定时器数组持续增长
    timers: timers.length,
    // 泄漏5：Map 保持强引用，key 永不过期，size 只增不减
    mapEntries: strongMap.size
  });
});

// 一键泄漏：访问一次触发全部 5 种
app.get('/leak-all/:n', (req, res) => {
  const n = parseInt(req.params.n) || 10;
  for (let i = 0; i < n; i++) {
    globalLeak.push(Buffer.alloc(10 * 1024));
    bus.on('tick', () => {});
    listenerCount++;
    const fn = createLeakyClosure();
    const data = [];
    const id = setInterval(() => { data.push(Buffer.alloc(1024)); }, 500);
    timers.push({ id, data });
    strongMap.set(++mapKey, Buffer.alloc(10 * 1024));
  }
  res.json({ leaked: n, status: '5 种泄漏同时触发' });
});

app.listen(PORT, () => {
  console.log(`Day 3 泄漏排查服务: http://localhost:${PORT}`);
  console.log('5 种泄漏: /leak/1-global /leak/2-listener /leak/3-closure /leak/4-timer /leak/5-map');
  console.log('拍快照: /snapshot');
  console.log('一键泄漏: /leak-all/:n');
});
