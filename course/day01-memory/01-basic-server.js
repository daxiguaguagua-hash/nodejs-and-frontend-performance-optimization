const express = require('express');

const app = express();
const PORT = 3000;

// 记录最近 30 次内存值，用于画趋势图
const history = [];
let lastHeapUsed = 0;

setInterval(() => {
  const mem = process.memoryUsage();
  const heapMB = mem.heapUsed / 1024 / 1024;

  history.push(heapMB);
  if (history.length > 30) history.shift();

  // 计算趋势
  const trend = heapMB > lastHeapUsed ? '↑ 涨' : '↓ 降 (可能GC回收了)';

  // 用 ASCII 画简易柱状图（基于最近30次记录）
  const maxVal = Math.max(...history, 1);
  const minVal = Math.min(...history);
  const bars = history.map((v) => {
    const ratio = (v - minVal) / (maxVal - minVal + 1);
    const len = Math.max(1, Math.round(ratio * 20));
    return '▁▂▃▄▅▆▇█'.charAt(Math.min(7, Math.round(ratio * 7)));
  }).join('');

  console.clear();
  console.log('===== 内存监控 (堆已用) =====');
  console.log(`当前: ${heapMB.toFixed(2)} MB  ${trend}`);
  console.log(`最低: ${minVal.toFixed(2)} MB  最高: ${maxVal.toFixed(2)} MB`);
  console.log('');
  console.log('走势图 (最近30次快照，每列是一次采样):');
  console.log(bars);
  console.log('');
  console.log('正常情况：涨涨涨跌涨涨涨跌 → 锯齿状 (GC在工作)');
  console.log('泄漏信号：涨涨涨涨涨涨涨涨 → 只涨不跌');

  lastHeapUsed = heapMB;
}, 3000);

// 加一个制造临时垃圾的端点，让锯齿更明显
app.get('/stress', (req, res) => {
  // 分配 5MB 临时数据，函数结束就被 GC 回收
  const tempGarbage = Buffer.alloc(5 * 1024 * 1024, 'x');
  res.json({ allocated: '5MB temporary', length: tempGarbage.length });
});

app.get('/', (req, res) => {
  res.send('访问 /stress 制造临时垃圾，观察 GC 锯齿');
});

app.listen(PORT, () => {
  console.log(`服务启动: http://localhost:${PORT}`);
  console.log(`访问 http://localhost:${PORT}/stress 几次，观察走势图变化`);
});
