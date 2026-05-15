第一阶段：核心骨架（3–5天）
事件循环（不用背细节，但要懂 setTimeout vs setImmediate vs nextTick）

Buffer / Stream（尤其是背压 & pipe，和 AI 流式输出强相关）

EventEmitter（Node 版发布订阅）

错误处理：try-catch / process.on('uncaughtException') / 域（Domain）

第二阶段：一个能替代你想象中“后端做的事”（5–7天）
http / express / fastify（三选一，建议 fastify 或 express）

中间件机制（和 Koa 洋葱模型对比理解）

路由 + 参数校验

一个简单的 MVC 结构（哪怕只有 controller + service）

第三阶段：和前端最相关的“后端能力”（重点）
处理大模型流式接口：fetch + ReadableStream → 透传给前端 SSE

代理 / 聚合多个 API（用 Promise.all 或 p-limit 做并发控制）

简单的 token 限流 / 重试 / 超时（AI 接口必备）

日志（pino / winston） → 查问题用，不要 fancy

第四阶段：不学但要知道（应付面试/对话）
cluster / worker_threads（知道存在即可）

event loop 深度细节（知道 libuv 这个词）

进程管理（PM2 概念）
