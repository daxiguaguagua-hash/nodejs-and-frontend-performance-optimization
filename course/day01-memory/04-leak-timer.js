const express = require('express');

const app = express();
const PORT = 3003;

// 泄漏点1：setInterval 未被清除，持续增长
const intervalData = [];

// 每秒往数组追加数据，永远不会停止
const intervalId = setInterval(() => {
  intervalData.push({
    timestamp: Date.now(),
    payload: Buffer.alloc(5 * 1024).toString('hex'), // 每次 5KB
  });
  const mem = process.memoryUsage();
  console.log(`定时器泄漏 | 堆: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB | 条目: ${intervalData.length}`);
}, 1000);

// 泄漏点2：请求中的定时器未清除
app.get('/leak', (req, res) => {
  // 这个 interval 永远不会被清除！每次请求都创建一个新的
  const perRequestData = [];

  setInterval(() => {
    perRequestData.push(Buffer.alloc(1024));
  }, 500);

  res.send('leak: new interval created');
});

// 正确做法：保存引用，提供清理端点
app.get('/safe', (req, res) => {
  const data = [];
  const id = setInterval(() => {
    data.push(Date.now());
  }, 500);

  // 5秒后清理
  setTimeout(() => {
    clearInterval(id);
    console.log('定时器已清理');
  }, 5000);

  res.send('safe: timer will be cleaned after 5s');
});

// 停止主泄漏的端点
app.get('/stop-main-leak', (req, res) => {
  clearInterval(intervalId);
  console.log(`主泄漏已停止，最终条目: ${intervalData.length}`);
  res.json({ stopped: true, totalEntries: intervalData.length });
});

app.get('/status', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    heapUsedMB: (mem.heapUsed / 1024 / 1024).toFixed(2),
    rssMB: (mem.rss / 1024 / 1024).toFixed(2),
    intervalEntries: intervalData.length,
  });
});

app.listen(PORT, () => {
  console.log('定时器泄漏示例启动');
  console.log(`  /leak           - 每次请求创建永不清理的 interval`);
  console.log(`  /safe           - 5秒后自动清理的 interval（正确做法）`);
  console.log(`  /status         - 查看内存状态`);
  console.log(`  /stop-main-leak - 停止主泄漏`);
  console.log('');
  console.log('注意：启动后内存就会持续上涨（主 interval 每秒写入 5KB）');
});
