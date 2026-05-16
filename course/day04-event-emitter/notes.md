# Day 4 笔记：EventEmitter + 错误处理

## 最小心智模型速查

| 概念 | 心智模型 | 一句话 |
|------|---------|--------|
| EventEmitter | **广播站** | on=调频道，emit=喊话，once=听完就关，off=关频道 |
| error 事件 | **烟雾报警器** | emit('error') 没人监听 → 进程崩溃，必须 .on('error', fn) |
| maxListeners | **防火系统** | 同事件 >10 个监听器就警告，帮你防 Day 3 泄漏 2 |
| 插件系统 | **广播站 + 分工** | 核心 emit 生命周期事件，插件各 on 各的 |
| try-catch | **当场拦截** | 同步代码里出错 → catch 消化，不往外冒 |
| uncaughtException | **最后的安全网** | 前两层都没接住的错误，落到这里 |

## EventEmitter 7 招全览

| 招 | API | 关键点 |
|----|-----|--------|
| 1 | `on(event, fn)` | 订阅，每次 emit 都触发 |
| 2 | `emit(event, data)` | 发布，触发所有监听器 |
| 3 | `once(event, fn)` | 只听一次，触发后自动 removeListener |
| 4 | `off(event, fn)` | 手动取消，**必须传同一个函数引用** |
| 5 | `on('error', fn)` | **必须**有，否则 emit('error') 崩进程 |
| 6 | `setMaxListeners(n)` | 提高/取消上限，但正确做法是及时 removeListener |
| 7 | 插件模式 | 核心 emit 生命周期 → 插件 on 各自采集 |

## Q&A

### Q1: EventEmitter 和浏览器里的 addEventListener 是什么关系？

本质上一样——都是**发布订阅模式**。

| | Node EventEmitter | 浏览器 addEventListener |
|---|---|---|
| 订阅 | `bus.on('click', fn)` | `btn.addEventListener('click', fn)` |
| 取消 | `bus.off('click', fn)` | `btn.removeEventListener('click', fn)` |
| 触发 | `bus.emit('click', data)` | 用户点击（浏览器触发） |
| 只听一次 | `bus.once('click', fn)` | `{ once: true }` |

区别：浏览器的事件源是 DOM 元素（用户交互），EventEmitter 的事件源是你自己 new 出来的对象。

### Q2: off 为什么要传同一个函数引用？

```js
bus.on('tick', onTick);
bus.off('tick', onTick);  // ✅ 同一个函数引用

bus.on('tick', () => { ... });
bus.off('tick', () => { ... });  // ❌ 不同引用，删不掉
```

`off` 内部用 `===` 比较函数引用。两个箭头函数虽然长得一样，但是不同对象。

### Q3: 为什么 emit('error') 没人听会崩进程？

这是 Node.js 的**特殊规则**。普通事件没人听就静默忽略，但 `error` 事件例外——如果没人监听，Node 把 error 当成未处理异常抛出，进程崩溃。

```js
bus.emit('hello');  // 没人听 → 没事
bus.emit('error', new Error('...'));  // 没人听 → 进程挂
```

**铁律**：只要用了 EventEmitter，就必须 `.on('error', fn)`。

### Q4: 错误处理三层防线各管什么？

```
第1层 try-catch           → 同步代码当场抓住（JSON.parse、同步计算）
第2层 .on('error')         → EventEmitter 异步事件流的错误
第3层 uncaughtException    → 前两层都没接住的，最后的网
```

**执行流程**：错误发生 → 有 try-catch → catch 块消化 → 结束。没有 try-catch → 往上冒 → 有 .on('error') → 监听器接住。还没有 → uncaughtException 兜底。

**try-catch 不是触发事件，是当场拦截**。错误在 catch 块里就被消化了，不会往外冒，不会触发任何事件。

**uncaughtException 是最后的手段**，不应该依赖它来正常处理错误。生产环境：记日志 → 优雅退出 → PM2 自动重启。

### Q5: setTimeout 里 throw 为什么 try-catch 抓不住？

```js
try {
  setTimeout(() => {
    throw new Error('炸了');  // ❌ catch 抓不到
  }, 10);
} catch (err) {
  // 永远不会执行
}
```

因为 `setTimeout` 的回调不是"此刻"执行的。try-catch 执行时，setTimeout 只是注册了一个回调然后立即返回。10ms 后回调执行时，try-catch 早就跑完了。

**规则**：try-catch 只能抓同步错误。异步回调里的错误需要 .on('error') 或 uncaughtException。

### Q6: 迷你插件系统怎么变成 browser-sdk？

`createPlugin()` 就是一个简化版 EventEmitter：

```js
// SDK 核心
const perf = createPlugin('performance');

// 插件注册
perf.on('page-load', (data) => { /* 采集 LCP */ });
perf.on('error',     (data) => { /* 采集错误 */ });

// SDK 核心在浏览器生命周期触发
window.addEventListener('load', () => perf.emit('page-load', { lcp, fid }));
window.addEventListener('error', (e) => perf.emit('error', { message: e.message }));
```

**分工**：SDK 核心只负责 emit 生命周期事件，插件负责 on 对应事件做采集。扩展一个新能力 = 加一个 on 监听器，不改核心代码。

### Q7: maxListeners 警告是错误吗？

不是错误，是**警告**。Node 发现同一个事件挂了 >10 个监听器，提醒你可能忘了 removeListener（Day 3 泄漏 2）。

- 默认上限：10
- `bus.setMaxListeners(20)` 可以提高
- 更正确的做法：确保用完后 `removeListener`

## 错误处理三层防线图解

```
同步错误                          异步错误
   │                                │
   ▼                                ▼
try-catch  ← 第1层             无 try-catch
   │                                │
   ▼                                ▼
在 catch 中消化                 bus.on('error')  ← 第2层
                                   │
                                   ▼
                              接住了 / 没接住
                                   │
                                   ▼
                         process.on('uncaughtException')  ← 第3层
                                   │
                                   ▼
                          记日志 → 优雅退出 → PM2 重启
```

### Q8: try-catch 有性能开销吗？TanStack 怎么做的？

**有。** V8 对包含 try-catch 的函数会**去优化（deopt）**，而且每次 `throw` 都要生成 Error 对象 + 捕获调用栈。

**TanStack 的方案：declarative error handling（声明式错误处理）**

不在调用点 try-catch，而是让错误变成**状态值**或冒到**边界**：

```ts
// ❌ 传统：每个调用点 try-catch
try { const data = await fetch('/api'); }
catch (err) { /* 重复 N 次 */ }

// ✅ TanStack Query：{ error } 是状态，只是读值
const { data, error, isError } = useQuery({ queryFn: ... });
if (isError) return <ErrorFallback />;

// ✅ TanStack Router：loader 不 catch，errorComponent 自动接住
createFileRoute('/posts')({
  loader: () => fetchPosts(),  // 不 try-catch
  errorComponent: ({ error }) => <div>{error.message}</div>,
});
```

**TanStack 不能直接用在后端 Node.js**：
- `@tanstack/react-query` → 依赖 React
- `@tanstack/router` → 纯前端路由
- `@tanstack/query-core` 在 Node 可用但主要是缓存层，不做错误边界

**但 Hono 提供了等价模式 — `app.onError()`：**

```ts
// Hono 的 ErrorBoundary = app.onError()
// 路由层：不 try-catch，让错误往上冒
app.get('/v1/metrics', async (c) => {
  const body = await c.req.json();  // 不检查，炸了交给边界
  // ... 处理逻辑
});

// 边界层：一处兜底，统一处理所有路由的错误
app.onError((err, c) => {
  console.error('[error boundary]', err.message);
  return c.json({ error: err.message }, 500);
});
```

**对应关系**：

| TanStack（前端） | Hono（后端） |
|-----------------|-------------|
| `throwOnError: true` | 故意不 catch，错误冒泡 |
| `ErrorBoundary` 组件 | `app.onError()` 中间件 |
| `{ error }` 状态值 | 函数返回 `{ data, error }` 而非 throw |
| `errorComponent` | 统一 JSON 错误响应格式 |

**本质一样**：调用点不写 try-catch → 错误变成数据或冒到边界 → 边界统一处理。前端边界是组件，后端边界是中间件。

## Day 4 代码文件

| 文件 | 内容 |
|------|------|
| `server.js` | EventEmitter 教学服务（9 个端点，7 招 + 2 错误处理） |

## 关键命令

```bash
# 启动服务（会看到 MaxListenersExceededWarning — 故意的）
node course/day04-event-emitter/server.js

# 查看所有端点
curl http://localhost:3300/status

# 体验 error 崩溃（需先解除 server.js:78 的注释）
curl http://localhost:3300/5-error-crash

# 体验全局兜底
curl http://localhost:3300/9-uncaught-test
```

## 前端视角对应

| Day 4 概念 | 前端对应 |
|-----------|---------|
| EventEmitter on/emit | React 里的自定义事件、状态管理库的订阅 |
| maxListeners | useEffect 里没清理的事件监听 |
| 插件系统 | 微前端、模块化架构的基础模式 |
| error 三层防线 | ErrorBoundary + try-catch + window.onerror |
| uncaughtException | 前端的 window.onerror / unhandledrejection |
