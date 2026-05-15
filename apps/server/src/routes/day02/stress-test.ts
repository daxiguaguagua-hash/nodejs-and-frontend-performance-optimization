import { Hono } from "hono";
import crypto from "crypto";
import { Worker } from "worker_threads";
import path from "path";
import { getMemoryUsage } from "../../lib/memory";

const app = new Hono();

// Worker 轮询池
const POOL_SIZE = 8;
const workers: Worker[] = [];
let nextWorker = 0;

const workerPath = path.join(import.meta.dirname, "../../workers/heavy-worker.cjs");

for (let i = 0; i < POOL_SIZE; i++) {
  workers.push(new Worker(workerPath));
}
console.log(`Worker pool ready: ${POOL_SIZE} threads`);

function runOnWorker(iterations: number): Promise<string> {
  return new Promise((resolve) => {
    const w = workers[nextWorker % POOL_SIZE];
    nextWorker++;
    w.once("message", resolve);
    w.postMessage({ iterations });
  });
}

// 端点1：纯响应基线
app.get("/fast", (c) => c.json({ ok: true }));

// 端点2：CPU 密集型（同步，阻塞主线程）
app.get("/cpu-heavy", (c) => {
  let hash = "";
  for (let i = 0; i < 100_000; i++) {
    hash = crypto.createHash("sha256").update(hash + i).digest("hex");
  }
  return c.json({ hash: hash.slice(0, 16) });
});

// 端点2b：CPU 密集型异步版（libuv 线程池）
app.get("/cpu-heavy-async", async (c) => {
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.pbkdf2(
      "password",
      "salt",
      100_000,
      64,
      "sha512",
      (err, key) => (err ? reject(err) : resolve(key)),
    );
  });
  return c.json({ hash: derivedKey.toString("hex").slice(0, 16) });
});

// 端点2c：Worker Thread 池版本
app.get("/cpu-heavy-worker", async (c) => {
  const hash = await runOnWorker(100_000);
  return c.json({ hash });
});

// 端点3：模拟数据库查询延迟（IO 密集）
app.get("/slow-db", async (c) => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return c.json({ data: "from db" });
});

// 端点4：动态分配内存
const responses: Buffer[] = [];
app.get("/alloc", (c) => {
  const size = parseInt(c.req.query("kb") || "10");
  responses.push(Buffer.alloc(size * 1024, "x"));
  return c.json({ count: responses.length, kb: size });
});

// 端点5：内存状态
app.get("/status", (c) => c.json(getMemoryUsage()));

app.get("/", (c) =>
  c.text(
    "GET /day02/fast | /cpu-heavy | /cpu-heavy-async | /cpu-heavy-worker | /slow-db | /alloc | /status",
  ),
);

export default app;
