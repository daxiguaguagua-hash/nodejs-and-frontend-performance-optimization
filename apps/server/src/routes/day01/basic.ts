import { Hono } from "hono";
import { recordMemory, getMemoryUsage } from "../../lib/memory";

const app = new Hono();

// 启动内存监控（每 3 秒记录一次）
let lastLog = "";
setInterval(() => {
  const { heapMB, trend, bars, minMB, maxMB } = recordMemory();
  lastLog = [
    "===== Memory Monitor (heapUsed) =====",
    `Current: ${heapMB.toFixed(2)} MB  ${trend}`,
    `Min: ${minMB.toFixed(2)} MB  Max: ${maxMB.toFixed(2)} MB`,
    "",
    bars,
    "",
    "Normal: up-up-down-up-up-down → sawtooth (GC working)",
    "Leak signal: up-up-up-up-up-up → only rises",
  ].join("\n");
  console.clear();
  console.log(lastLog);
}, 3000);

// 制造临时垃圾，观察 GC 锯齿
app.get("/stress", (c) => {
  const tempGarbage = Buffer.alloc(5 * 1024 * 1024, "x");
  return c.json({ allocated: "5MB temporary", length: tempGarbage.length });
});

// 查看日志
app.get("/monitor-log", (c) => c.text(lastLog));

// 内存快照
app.get("/status", (c) => c.json(getMemoryUsage()));

app.get("/", (c) =>
  c.text("GET /day01/stress → allocate 5MB temp garbage, observe GC sawtooth"),
);

export default app;
