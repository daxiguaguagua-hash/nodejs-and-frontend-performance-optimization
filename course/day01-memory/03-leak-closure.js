const express = require('express');

const app = express();
const PORT = 3002;

// 泄漏点1：闭包持有大缓存引用，导致无法释放
function createHandler() {
  // 这个大缓存被闭包引用，永远无法被 GC
  const hugeCache = new Array(100000).fill('some cached data that should expire');

  return function handleRequest(req, res) {
    // hugeCache 在闭包作用域链中，只要 handleRequest 活着就不会释放
    const item = hugeCache[0]; // 实际上只用了一点点
    res.json({ item, cacheSize: hugeCache.length });
  };
}

app.get('/leak', createHandler());

// 泄漏点2：事件回调中引用外部大对象
let requestCount = 0;
const bigData = Buffer.alloc(50 * 1024 * 1024); // 50MB 大缓存

app.get('/subtle-leak', (req, res) => {
  requestCount++;

  // 定时器闭包引用了 bigData，即使只用了一小部分
  setTimeout(() => {
    console.log(`处理第 ${requestCount} 个请求，缓存大小: ${bigData.length}`);
  }, 100);

  res.send('subtle leak triggered');
});

// 正确做法对比：局部创建，用完即释放
app.get('/safe', (req, res) => {
  const tmpData = Buffer.alloc(1024);
  res.send(`safe, size: ${tmpData.length}`);
});

app.get('/status', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    heapUsedMB: (mem.heapUsed / 1024 / 1024).toFixed(2),
    rssMB: (mem.rss / 1024 / 1024).toFixed(2),
  });
});

app.listen(PORT, () => {
  console.log(`闭包泄漏示例: http://localhost:${PORT}/leak`);
  console.log(`隐蔽泄漏示例: http://localhost:${PORT}/subtle-leak`);
  console.log(`状态查看: http://localhost:${PORT}/status`);
});
