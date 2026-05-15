import { Hono } from "hono";
import { EventEmitter } from "events";
import v8 from "v8";
import fs from "fs";
import path from "path";
import { getMemoryUsage } from "../../lib/memory";

const app = new Hono();

const snapshotDir = path.join(import.meta.dirname, "../../snapshots");
if (!fs.existsSync(snapshotDir)) fs.mkdirSync(snapshotDir, { recursive: true });

// 泄漏1：全局数组
const globalLeak: Buffer[] = [];

// 泄漏2：未清理的 EventEmitter 监听器
const bus = new EventEmitter();
let listenerCount = 0;

// 泄漏3：闭包持有大对象
function createLeakyClosure() {
  const bigData = Buffer.alloc(10 * 1024 * 1024);
  return () => bigData.length;
}

// 泄漏4：未销毁的定时器
const timers: { id: NodeJS.Timeout; data: Buffer[] }[] = [];

// 泄漏5：Map 强引用不清理
const strongMap = new Map<number, Buffer>();
let mapKey = 0;

app.get("/leak/1-global", (c) => {
  globalLeak.push(Buffer.alloc(10 * 1024));
  return c.json({ type: "global array", count: globalLeak.length });
});

app.get("/leak/2-listener", (c) => {
  const handler = () => {};
  bus.on("tick", handler);
  listenerCount++;
  return c.json({ type: "event listener leak", listeners: listenerCount });
});

app.get("/leak/3-closure", (c) => {
  const fn = createLeakyClosure();
  return c.json({ type: "closure leak", size: fn() });
});

app.get("/leak/4-timer", (c) => {
  const data: Buffer[] = [];
  const id = setInterval(() => {
    data.push(Buffer.alloc(5 * 1024));
  }, 500);
  timers.push({ id, data });
  return c.json({ type: "timer leak", activeTimers: timers.length });
});

app.get("/leak/5-map", (c) => {
  strongMap.set(++mapKey, Buffer.alloc(10 * 1024));
  return c.json({ type: "Map strong ref", entries: strongMap.size });
});

// 拍快照
app.get("/snapshot", (c) => {
  const filename = `heap-${Date.now()}.heapsnapshot`;
  const filepath = path.join(snapshotDir, filename);
  v8.writeHeapSnapshot(filepath);
  return c.json({ snapshot: filename, dir: snapshotDir });
});

// 一键泄漏：同时触发全部 5 种
app.get("/leak-all/:n", (c) => {
  const n = parseInt(c.req.param("n")) || 10;
  for (let i = 0; i < n; i++) {
    globalLeak.push(Buffer.alloc(10 * 1024));
    bus.on("tick", () => {});
    listenerCount++;
    void createLeakyClosure();
    const data: Buffer[] = [];
    const id = setInterval(() => {
      data.push(Buffer.alloc(1024));
    }, 500);
    timers.push({ id, data });
    strongMap.set(++mapKey, Buffer.alloc(10 * 1024));
  }
  return c.json({ leaked: n, status: "5 leak types triggered simultaneously" });
});

app.get("/status", (c) => {
  const mem = getMemoryUsage();
  return c.json({
    ...mem,
    globalLeak: globalLeak.length,
    listeners: listenerCount,
    timers: timers.length,
    mapEntries: strongMap.size,
  });
});

app.get("/", (c) =>
  c.text(
    "GET /day03/leak/1-global | /leak/2-listener | /leak/3-closure | /leak/4-timer | /leak/5-map | /snapshot | /leak-all/:n | /status",
  ),
);

export default app;
