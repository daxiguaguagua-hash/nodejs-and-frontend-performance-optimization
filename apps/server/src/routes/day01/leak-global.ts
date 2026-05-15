import { Hono } from "hono";
import { getMemoryUsage } from "../../lib/memory";

const app = new Hono();

// 泄漏点：全局数组不断 push，GC 永远不收
const leakyArray: string[] = [];

app.get("/", (c) => {
  const data = Buffer.alloc(10 * 1024, "x").toString();
  leakyArray.push(data);

  const mem = process.memoryUsage();
  console.log(
    `heapUsed: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB | arrayLength: ${leakyArray.length}`,
  );

  return c.json({
    count: leakyArray.length,
    heapMB: +(mem.heapUsed / 1024 / 1024).toFixed(2),
  });
});

// 一键批量泄漏
app.get("/batch/:n", (c) => {
  const n = parseInt(c.req.param("n")) || 10;
  for (let i = 0; i < n; i++) {
    leakyArray.push(Buffer.alloc(10 * 1024, "x").toString());
  }
  const mem = process.memoryUsage();
  console.log(
    `batch leak x${n} | heap: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB | arrayLength: ${leakyArray.length}`,
  );
  return c.json({
    leaked: n,
    total: leakyArray.length,
    heapMB: +(mem.heapUsed / 1024 / 1024).toFixed(2),
  });
});

app.get("/status", (c) => {
  const mem = getMemoryUsage();
  return c.json({ ...mem, leakyArrayLength: leakyArray.length });
});

export default app;
