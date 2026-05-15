import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => c.text("perf-server running"));

app.post("/v1/metrics", async (c) => {
  const body = await c.req.json();
  console.log("metrics received:", JSON.stringify(body).slice(0, 200));
  return c.json({ ok: true });
});

export default app;
