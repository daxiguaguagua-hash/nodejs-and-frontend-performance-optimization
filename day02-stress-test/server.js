const express = require('express');
const crypto = require('crypto');
const { Worker } = require('worker_threads');
const path = require('path');

const app = express();
const PORT = 3100;

// 简易 Worker 轮询池
const POOL_SIZE = 8;
const workers = [];
let nextWorker = 0;

for (let i = 0; i < POOL_SIZE; i++) {
  workers.push(new Worker(path.join(__dirname, 'heavy-worker.js')));
}
console.log(`Worker 池就绪: ${POOL_SIZE} 个线程`);

function runOnWorker(iterations) {
  return new Promise((resolve) => {
    const w = workers[nextWorker % POOL_SIZE];
    nextWorker++;
    w.once('message', resolve);
    w.postMessage({ iterations });
  });
}

// 端点1：纯响应 —— 基线性能
app.get('/fast', (req, res) => {
  res.json({ ok: true });
});

// 端点2：CPU 密集型 —— 哈希计算，模拟加密/图片处理
app.get('/cpu-heavy', (req, res) => {
  let hash = '';
  for (let i = 0; i < 100000; i++) {
    hash = crypto.createHash('sha256').update(hash + i).digest('hex');
  }
  res.json({ hash: hash.slice(0, 16) });
});

// 端点2b：CPU 密集型但用异步 crypto（libuv 线程池自动扛）
app.get('/cpu-heavy-async', (req, res) => {
  crypto.pbkdf2('password', 'salt', 100000, 64, 'sha512', (err, derivedKey) => {
    res.json({ hash: derivedKey.toString('hex').slice(0, 16) });
  });
});

// 端点2c：Worker Thread 池 —— 手动管理，通用方案
app.get('/cpu-heavy-worker', async (req, res) => {
  const hash = await runOnWorker(100000);
  res.json({ hash });
});

// 端点3：模拟数据库查询延迟
app.get('/slow-db', async (req, res) => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  res.json({ data: 'from db' });
});

// 端点4：动态分配内存，结合 Day 1 观察
const responses = [];
app.get('/alloc', (req, res) => {
  const size = parseInt(req.query.kb) || 10;
  responses.push(Buffer.alloc(size * 1024, 'x'));
  res.json({ count: responses.length, kb: size });
});

// 端点5：内存状态
app.get('/status', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    heapUsedMB: (mem.heapUsed / 1024 / 1024).toFixed(2),
    rssMB: (mem.rss / 1024 / 1024).toFixed(2),
  });
});

app.listen(PORT, () => {
  console.log(`Day 2 压测目标服务启动: http://localhost:${PORT}`);
  console.log('端点: /fast /cpu-heavy /cpu-heavy-async /cpu-heavy-worker /slow-db /alloc /status');
});
