const express = require('express');
const EventEmitter = require('events');

const app = express();
const PORT = 3300;
const bus = new EventEmitter();

// ============================================================
// 第1招：on + emit — 订阅和发布
// ============================================================
let emitLog = [];
bus.on('user-login', (data) => {
  emitLog.push(`[${new Date().toISOString()}] ${data.user} 登录了`);
});

app.get('/1-on', (req, res) => {
  const subs = bus.listenerCount('user-login');
  res.json({ topic: '订阅 user-login', subscribers: subs, hint: '去 /2-emit 触发' });
});

app.get('/2-emit', (req, res) => {
  bus.emit('user-login', { user: 'alice' });
  bus.emit('user-login', { user: 'bob' });
  res.json({ emitted: 2, log: emitLog });
});

// ============================================================
// 第2招：once — 只听一次就自动销毁
// ============================================================
let onceCount = 0;
bus.once('one-shot', () => { onceCount++; });

app.get('/3-once', (req, res) => {
  bus.emit('one-shot');
  bus.emit('one-shot');
  bus.emit('one-shot');
  res.json({
    emitted: 3,
    received: onceCount,
    why: 'once 监听器收到第一次就自动 removeListener'
  });
});

// ============================================================
// 第3招：off — 手动取消订阅
// ============================================================
let tickCount = 0;
function onTick() { tickCount++; }
bus.on('tick', onTick);

app.get('/4-off', (req, res) => {
  bus.emit('tick');
  bus.emit('tick');
  const before = tickCount;

  bus.off('tick', onTick);

  bus.emit('tick');
  bus.emit('tick');
  res.json({
    beforeOff: before,
    afterOff: tickCount,
    why: 'off 之后监听器被移除，后面的 emit 收不到了'
  });
});

// ============================================================
// 第4招：error 事件没人听的后果 — 进程崩溃
// ============================================================

app.get('/5-error-crash', (req, res) => {
  res.json({
    warning: '访问这个端点会导致进程崩溃！',
    reason: 'emit("error") 但没有 .on("error") 监听器 → Node 把 error 当成未处理异常 → 进程挂',
    how: '试试 curl http://localhost:3300/5-error-crash ，然后看终端里进程是不是挂了，curl 会收到空响应（连接被重置）'
  });
  // 注释掉实际触发——让学生手动解除注释后体验
  // bus.emit('error', new Error('没人监听 error 事件！'));
});

// ============================================================
// 第5招：正确的 error 处理
// ============================================================
bus.on('error', (err) => {
  console.error('[bus error 被捕获]', err.message);
});

app.get('/5-error-safe', (req, res) => {
  bus.emit('error', new Error('这是一个正常的错误，被 bus.on("error") 接住了'));
  res.json({ ok: true, reason: 'bus.on("error") 接住了这个错误，进程没挂' });
});

// ============================================================
// 第6招：maxListeners 警告
// ============================================================
const leakyBus = new EventEmitter();
for (let i = 0; i < 12; i++) {
  leakyBus.on('boom', () => {});
}

app.get('/6-max-warning', (req, res) => {
  res.json({
    listeners: leakyBus.listenerCount('boom'),
    defaultMax: EventEmitter.defaultMaxListeners,
    warning: '终端里应该有一条 MaxListenersExceededWarning',
    why: '防止不小心泄漏监听器（就是我们 Day 3 的泄漏2）',
    fix: '用 bus.setMaxListeners(n) 或确保 removeListener'
  });
});

// ============================================================
// 第7招：迷你插件系统 — browser-sdk 的基石
// ============================================================
function createPlugin(name) {
  const hooks = {};
  return {
    name,
    on(hook, fn) {
      if (!hooks[hook]) hooks[hook] = [];
      hooks[hook].push(fn);
      return this;
    },
    emit(hook, data) {
      (hooks[hook] || []).forEach(fn => fn(data));
    }
  };
}

app.get('/7-plugin', (req, res) => {
  const perf = createPlugin('performance');

  perf.on('page-load', (data) => console.log('[perf] 记录 LCP:', data.lcp));
  perf.on('page-load', (data) => console.log('[perf] 记录 FID:', data.fid));
  perf.on('error', (data) => console.log('[perf] 捕获错误:', data.message));

  perf.emit('page-load', { lcp: 120, fid: 8 });
  perf.emit('error', { message: 'Uncaught TypeError: x is not a function' });

  res.json({
    pattern: '插件系统 = EventEmitter 的模式应用',
    arch: 'SDK 核心负责 emit 生命周期事件，插件负责 on 对应事件做采集',
    how: '看终端输出——perf.on 注册了3个监听器，emit 触发了它们'
  });
});

// ============================================================
// 错误处理三层防线
// ============================================================
app.get('/8-layers', (req, res) => {
  res.json({
    layer1: 'try-catch — 同步代码当场抓住',
    layer2: 'EventEmitter .on("error") — 异步事件流的错误',
    layer3: 'process.on("uncaughtException") — 最后的网，兜住后优雅退出',
    demo: { layer1: '/9-try-catch', layer3: '/9-uncaught-test' }
  });
});

app.get('/9-try-catch', (req, res) => {
  try {
    JSON.parse('这不是合法JSON{{{');
  } catch (err) {
    return res.json({ ok: true, caught: err.message, rule: 'JSON.parse 是同步的，try-catch 能抓住' });
  }
});

// 全局兜底
app.get('/9-uncaught-test', (req, res) => {
  res.json({
    warning: '这个端点会触发一个未被 try-catch 包裹的异步错误',
    how: '错误不会被请求处理函数捕获，但会被全局 process.on("uncaughtException") 兜住'
  });
  setTimeout(() => {
    throw new Error('一个未被 try-catch 包裹的异步错误');
  }, 10);
});

process.on('uncaughtException', (err) => {
  console.error('[全局兜底 uncaughtException]', err.message);
  console.error('  生产环境应该：1)记日志 2)优雅退出 3)PM2自动重启');
});

// ============================================================
// 状态汇总
// ============================================================
app.get('/status', (req, res) => {
  res.json({
    bus: {
      'user-login': bus.listenerCount('user-login'),
      'error': bus.listenerCount('error'),
      'tick': bus.listenerCount('tick')
    },
    endpoints: {
      '1-on': '订阅',
      '2-emit': '发布',
      '3-once': '只听一次',
      '4-off': '取消订阅',
      '5-error-crash': 'error没人听→崩溃（试试看）',
      '5-error-safe': 'error有人听→安全',
      '6-max-warning': '监听器上限警告',
      '7-plugin': '迷你插件系统',
      '8-layers': '错误处理三层防线',
      '9-try-catch': '同步 try-catch',
      '9-uncaught-test': '全局兜底测试'
    }
  });
});

app.listen(PORT, () => {
  console.log(`Day 4 EventEmitter 服务: http://localhost:${PORT}`);
  console.log('先看 /status 了解所有端点');
  if (leakyBus.listenerCount('boom') > 10) {
    console.log('  注意终端上面的 MaxListenersExceededWarning ↑ — /6-max-warning 故意触发的');
  }
});
