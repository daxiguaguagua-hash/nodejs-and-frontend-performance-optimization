import { Hono } from "hono";
import { getMemoryUsage } from "../../lib/memory";

const app = new Hono();

// 泄漏1：闭包持有大缓存引用
function createHandler() {
  const hugeCache = new Array(100_000).fill("some cached data that should expire");

  const handler = () => {
    void hugeCache;
    return new Response(
      JSON.stringify({ item: hugeCache[0], cacheSize: hugeCache.length }),
      { headers: { "content-type": "application/json" } },
    );
  };
  return handler;
}

app.get("/leak", createHandler());

// 泄漏2：定时器回调引用外部大对象
let requestCount = 0;
const bigData = Buffer.alloc(50 * 1024 * 1024); // 50MB — 堆外内存

app.get("/subtle-leak", (c) => {
  requestCount++;

  setTimeout(() => {
    console.log(`request #${requestCount}, bigData size: ${bigData.length}`);
  }, 100);

  return c.text("subtle leak triggered");
});

// 正确做法对比
app.get("/safe", (c) => {
  const tmpData = Buffer.alloc(1024);
  return c.text(`safe, size: ${tmpData.length}`);
});

app.get("/status", (c) => c.json(getMemoryUsage()));

app.get("/", (c) =>
  c.text("GET /day01/leak-closure/leak | /subtle-leak | /safe | /status"),
);

export default app;
