# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Docs Lookup Priority

**查库/框架文档时，context7 优先于 WebSearch：**

1. `mcp__plugin_everything-claude-code_context7__resolve-library-id` → 解析库名得到 library ID
2. `mcp__plugin_everything-claude-code_context7__query-docs` → 用 library ID 查文档
3. 以上两步都查不到时，才 fallback 到 WebSearch

context7 的代码示例质量、响应速度、结构化程度都优于通用搜索引擎。

## Project Purpose

A 7-day intensive learning curriculum for Node.js + frontend performance optimization, covering memory management, stress testing, leak detection, Buffer/Stream, browser rendering, and Core Web Vitals.

The README.md defines the full syllabus. Code exercises and project files are built incrementally day-by-day.

## Mental Models (最小必知概念)

Teaching this project relies on two simple analogies. Use them whenever explaining GC or leaks.

### 1. V8 分代 GC = 草稿纸 + 档案柜

| | 新生代 (New Space) | 老生代 (Old Space) |
|---|---|---|
| 类比 | 考场的草稿纸 | 家里的档案柜 |
| 大小 | 几 MB | 用户设定（如 16MB） |
| 放什么 | 刚创建、活不久的对象 | 活过两次 GC 的老对象 |
| GC 方式 | Scavenge：抄一遍存活的，扔掉草稿纸（快） | Mark-Sweep：遍历标记、清理（慢） |
| 触发频率 | 常触发 | 满了才触发 |

一个对象的旅程：`new → 草稿纸 → GC 还活着 → 晋升到档案柜 → GC 不活着了 → 扔掉`

### 2. 内存泄漏 = 引用忘了断

GC 只有一个判断标准：**这个对象还有没有引用链？**

- 有引用 → 留着（GC 认为是"活对象"）
- 没引用 → 回收

泄漏 = 你不再需要它了，但引用链还在，GC 以为它有用。
三种典型：全局变量活着不释放、闭包握住了大对象、定时器没 clear。

## Teaching Mode

This is a **learning project**, not production code. The user is studying under a teacher.

- **最小心智模型优先**：讲任何新概念之前，先用一句话 + 一个生活类比给出最小可用的心智模型，帮用户建立直觉，然后再展开细节。
- Write code, but explain it step by step. Don't just dump files.
- Ask questions to check understanding. Keep it interactive.
- After each day's work, save Q&A notes to `dayXX-<topic>/notes.md` — every question the user asked and the answer given.
- Let the user run the code and observe before moving on.
- The teacher expects the user to build a **frontend SDK** and **backend performance optimization** — keep these end goals in mind.

## Mental Models Already Taught

## Monorepo Structure

```
perf-monorepo/
├── apps/
│   ├── server/          # @perf/server — Hono BFF, metrics ingestion, dashboard API
│   └── dashboard/       # @perf/dashboard — React SPA, performance monitoring UI
├── packages/
│   └── browser-sdk/     # @perf/browser-sdk — frontend performance monitoring SDK
├── course/              # 学习资料 day01~day17
│   ├── day01-memory/
│   ├── day02-stress-test/
│   ├── day03-leak-tools/
│   └── TODO.md
├── demos/               # 故意制造性能问题的测试页面
├── bts.jsonc            # better-t-stack 技术栈声明
├── .mcp.json            # BTS MCP + context7 — 将项目暴露为 MCP server
├── turbo.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Tech Stack

- **Package manager**: pnpm (workspaces)
- **Build system**: Turborepo
- **Backend**: Hono (BFF) + Drizzle ORM + PostgreSQL (Docker)
- **Frontend**: React 19 + React Router 7 + Vite
- **SDK**: TypeScript, zero framework dependencies
- **Formatting/Lint**: Biome (when available)
- **MCP**: better-t-stack (`pnpm dlx create-better-t-stack@latest mcp`) + context7 (docs lookup)

## Course Plan (17 Days)

| D | Topic | Package |
|---|-------|---------|
| D1 | 内存管理 + GC | course/ |
| D2 | 压力测试 wrk | course/ |
| D3 | 内存泄漏排查 | course/ |
| D4 | EventEmitter + 错误处理 | browser-sdk (插件系统) |
| D5 | Buffer & Stream | server (高吞吐ingestion) |
| D6 | Hono + 中间件 | server (BFF骨架) |
| D7 | 前端性能原理 | browser-sdk (采集层) |
| D8 | Web Vitals 实现 | browser-sdk (核心采集) |
| D9 | 错误追踪 + 行为 + 自定义事件 | browser-sdk (完整功能) |
| D10 | React Dashboard | dashboard |
| D11 | SSE 实时推送 | server + dashboard |
| D12 | 限流 + 重试 + 超时 | server |
| D13 | 日志系统 pino | server |
| D14 | 测试 + 文档 | 全项目 |
| D15 | worker_threads | server |
| D16 | 全链路优化实战 | 全项目 |
| D17 | 面试冲刺 + 知识整合 | course/ |

## Key Tools for This Domain

- **Node profiling**: `node --inspect`, Chrome DevTools Memory panel, `clinic doctor`
- **Heap analysis**: `heapdump`, `memwatch`, DevTools heap snapshots (compare/containment/statistics views)
- **Load testing**: `wrk` (quick), JMeter (complex scenarios)
- **Frontend**: Lighthouse, Chrome Performance panel, Core Web Vitals (LCP/FID/CLS)

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
