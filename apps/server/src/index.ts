import { Hono } from "hono";
import day01Basic from "./routes/day01/basic";
import day01LeakGlobal from "./routes/day01/leak-global";
import day01LeakClosure from "./routes/day01/leak-closure";
import day01LeakTimer from "./routes/day01/leak-timer";
import day02StressTest from "./routes/day02/stress-test";
import day03LeakTools from "./routes/day03/leak-tools";

const app = new Hono();

app.get("/", (c) => c.text("perf-server running"));

// BFF metrics ingestion
app.post("/v1/metrics", async (c) => {
  const body = await c.req.json();
  console.log("metrics received:", JSON.stringify(body).slice(0, 200));
  return c.json({ ok: true });
});

// Day 01 — 内存管理 + 内存泄漏
app.route("/day01/basic", day01Basic);
app.route("/day01/leak-global", day01LeakGlobal);
app.route("/day01/leak-closure", day01LeakClosure);
app.route("/day01/leak-timer", day01LeakTimer);

// Day 02 — 压力测试
app.route("/day02", day02StressTest);

// Day 03 — 内存泄漏排查工具
app.route("/day03", day03LeakTools);

import { serve } from "@hono/node-server";

serve({ fetch: app.fetch, port: 3000 });
console.log("perf-server listening on http://localhost:3000");

export default app;
