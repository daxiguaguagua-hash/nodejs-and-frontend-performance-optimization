const express = require('express');

const app = express();
const PORT = 3001;

// 泄漏点：全局数组不断 push 数据，永远不会被 GC 回收
const leakyArray = [];

app.get('/leak', (req, res) => {
  // 每次请求塞入 10KB 数据
  const data = Buffer.alloc(10 * 1024, 'x').toString();
  leakyArray.push(data);

  const mem = process.memoryUsage();
  console.log(`堆已用: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB | 数组长度: ${leakyArray.length}`);

  res.json({ count: leakyArray.length, heapMB: (mem.heapUsed / 1024 / 1024).toFixed(2) });
});

app.get('/status', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    leakyArrayLength: leakyArray.length,
    heapUsedMB: (mem.heapUsed / 1024 / 1024).toFixed(2),
    rssMB: (mem.rss / 1024 / 1024).toFixed(2),
  });
});

// 一键批量请求：访问一次等于访问 N 次 /leak
app.get('/batch/:n', (req, res) => {
  const n = parseInt(req.params.n) || 10;
  for (let i = 0; i < n; i++) {
    const data = Buffer.alloc(10 * 1024, 'x').toString();
    leakyArray.push(data);
  }
  const mem = process.memoryUsage();
  console.log(`批量子泄露 ${n} 次 | 堆: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB | 数组长度: ${leakyArray.length}`);
  res.json({ leaked: n, total: leakyArray.length, heapMB: (mem.heapUsed / 1024 / 1024).toFixed(2) });
});

app.listen(PORT, () => {
  console.log(`全局数组泄漏示例: http://localhost:${PORT}/leak`);
  console.log(`状态查看: http://localhost:${PORT}/status`);
  console.log('用 wrk 压测 /leak 端点会看到内存持续上涨');
});
