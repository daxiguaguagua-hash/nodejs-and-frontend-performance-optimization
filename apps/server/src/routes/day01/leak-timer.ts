import { Hono } from "hono";
import { getMemoryUsage } from "../../lib/memory";

const app = new Hono();

// 泄漏1：setInterval 永不停止
const intervalData: { timestamp: number; payload: string }[] = [];

const mainIntervalId = setInterval(() => {
  intervalData.push({
    timestamp: Date.now(),
    payload: Buffer.alloc(5 * 1024).toString("hex"),
  });
  const mem = process.memoryUsage();
  console.log(
    `timer leak | heap: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB | entries: ${intervalData.length}`,
  );
}, 1000);

// 泄漏2：每次请求创建永不清理的 interval
app.get("/leak", (c) => {
  const perRequestData: Buffer[] = [];

  setInterval(() => {
    perRequestData.push(Buffer.alloc(1024));
  }, 500);

  return c.text("leak: new interval created (never cleaned)");
});

// 正确做法
app.get("/safe", (c) => {
  const data: number[] = [];
  const id = setInterval(() => {
    data.push(Date.now());
  }, 500);

  setTimeout(() => {
    clearInterval(id);
    console.log("interval cleaned");
  }, 5_000);

  return c.text("safe: timer will be cleaned after 5s");
});

// 停止主泄漏
app.get("/stop-main-leak", (c) => {
  clearInterval(mainIntervalId);
  console.log(`main leak stopped, final entries: ${intervalData.length}`);
  return c.json({ stopped: true, totalEntries: intervalData.length });
});

app.get("/status", (c) => {
  const mem = getMemoryUsage();
  return c.json({ ...mem, intervalEntries: intervalData.length });
});

app.get("/", (c) =>
  c.text(
    "GET /day01/leak-timer/leak | /safe | /status | /stop-main-leak",
  ),
);

export default app;
