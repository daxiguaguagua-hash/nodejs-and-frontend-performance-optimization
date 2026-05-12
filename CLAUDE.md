# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## No Build System Yet

This repo currently has no `package.json`, dependencies, or source files. When code is added:
- Prefer `npm` as package manager
- Use `node --inspect` + Chrome DevTools for memory profiling
- Use `wrk` for HTTP benchmarking, `clinic.js` for performance diagnostics

## Key Tools for This Domain

- **Node profiling**: `node --inspect`, Chrome DevTools Memory panel, `clinic doctor`
- **Heap analysis**: `heapdump`, `memwatch`, DevTools heap snapshots (compare/containment/statistics views)
- **Load testing**: `wrk` (quick), JMeter (complex scenarios)
- **Frontend**: Lighthouse, Chrome Performance panel, Core Web Vitals (LCP/FID/CLS)
