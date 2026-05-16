# Day 3 笔记：内存泄漏排查工具

## 最小心智模型速查

| 概念 | 心智模型 | 一句话 |
|------|---------|--------|
| 堆快照 | X 光片 | 某一时刻内存里所有"活着"的对象 |
| 快照对比 | 两张 X 光片对光照 | 看哪些东西不该在却在、变多了 |
| Comparison 视图 | 算 Δ（增量） | 按 #Delta 降序 → 排最前面的就是嫌疑犯 |
| Containment 视图 | 器官结构图 | 按引用链看内存组成，从 GC root 往下追踪 |
| Statistics 视图 | 成分化验单 | 按类型分布：Array 占多少、String 占多少 |

## 5 种泄漏回顾

| # | 类型 | 代码 | 怎么在快照里找到 |
|---|------|------|----------------|
| 1 | 全局数组 | `globalLeak.push(buf)` | 找 `Array` 里 `(object elements)` 大的 |
| 2 | 事件监听器 | `bus.on('tick', fn)` 不移除 | 找 EventEmitter 内部 `_events` 的 listener 数组 |
| 3 | 闭包 | 返回函数握着 10MB Buffer | 找 `Buffer` 对象，追溯谁在引用它 |
| 4 | 定时器 | `setInterval` 不 clear | 找 `Timeout` 对象，看引用链 |
| 5 | Map 强引用 | `Map.set()` 不 delete | 找 `Map` 的 entries 数量 |

## 核心技能：快照对比流程

```
1. 拍基线快照  →  2. 触发泄漏  →  3. 拍第二张快照
         ↓
4. Chrome DevTools Memory → Load 两张 → 选 Comparison 视图
         ↓
5. 按 #Delta 降序 → 排最前的对象 → 追溯引用链 → 找到泄漏源
```

### 如何从快照数据追溯到代码？

这是最关键的技能——快照里看到的 `Array`、`Buffer` 本身不带变量名。追溯方法是：

1. 在 Comparison 视图找到 Δ 大的对象
2. 选中它，下方出现 **Retainers** 面板（保留链）
3. Retainers 显示引用链，从 GC Root 一路追到你的变量名
4. 例如：`globalLeak[16] → Array → (GC root)` → 找到 `globalLeak` 这个变量
5. 切到 **Containment** 视图可以展开完整引用树

**实战例子**：
```
Retainers:
  Array @12345  ← 这是 globalLeak 数组
    in globalLeak  ← 变量名！对应 server.js:13
      in Object / module  ← 模块作用域
```
看到 `globalLeak` 就知道是 server.js 第 13 行的 `const globalLeak = []` 在作祟。

## 关键工具

| 工具 | 用途 |
|------|------|
| `v8.writeHeapSnapshot(filepath)` | 代码里拍快照 |
| Chrome DevTools Memory 面板 | 加载、对比、追引用链（Retainers 面板） |
| `node --inspect` | 实时连 DevTools，可在 Memory 面板直接拍 |
| `kill -USR2 <pid>` | 配合 heapdump 包，信号触发拍快照 |
| `clinic doctor` | 全自动分析，出 HTML 报告 |

## Q&A

### Q1: 打开快照后怎么找到泄漏？

单张快照基本找不到。必须**两张对比**（Comparison 视图），看 `#Delta` 列——数字最大的就是"比之前多出来"的对象。然后看 **Retainers** 面板追溯引用链，找到变量名和对应的代码行。

### Q2: 为什么快照里看到一堆数据但没有变量名？

快照是内存的底层视图，只有对象类型和地址，不直接显示"这是 globalLeak"。需要通过 **Retainers**（保留链）从 GC Root 一路追到变量名。Retainers 面板会显示 `in globalLeak` → 你就知道是 `const globalLeak = []` 了。

### Q3: heapUsed 为什么不涨反跌？泄漏的数据去哪了？

GC 会回收临时对象（请求对象、中间变量），所以 heapUsed 会回落。但泄漏的数据（全局数组、监听器）GC 不收。**看低谷线是否持续抬高**才是判断泄漏的依据。

### Q4: Buffer 泄漏为什么 heapUsed 不怎么涨？

Buffer 走堆外内存（`external` / `arrayBuffers`），不受 `--max-old-space-size` 限制。**rss - heapUsed 的差距**越来越大就是信号。Buffer 泄漏比 JS 对象泄漏更危险——直接吃光物理内存。
