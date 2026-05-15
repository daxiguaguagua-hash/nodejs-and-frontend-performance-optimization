const MAX_HISTORY = 30;

const history: number[] = [];
let lastHeapUsed = 0;

export function recordMemory(): {
  heapMB: number;
  trend: string;
  bars: string;
  minMB: number;
  maxMB: number;
} {
  const mem = process.memoryUsage();
  const heapMB = mem.heapUsed / 1024 / 1024;

  history.push(heapMB);
  if (history.length > MAX_HISTORY) history.shift();

  const trend = heapMB > lastHeapUsed ? "↑ up" : "↓ down (GC)";
  const maxVal = Math.max(...history, 1);
  const minVal = Math.min(...history);

  const bars = history
    .map((v) => {
      const ratio = (v - minVal) / (maxVal - minVal + 1);
      const idx = Math.min(7, Math.round(ratio * 7));
      return "▁▂▃▄▅▆▇█".charAt(idx);
    })
    .join("");

  lastHeapUsed = heapMB;
  return { heapMB, trend, bars, minMB: minVal, maxMB: maxVal };
}

export function getMemoryUsage() {
  const mem = process.memoryUsage();
  return {
    heapUsedMB: +(mem.heapUsed / 1024 / 1024).toFixed(2),
    heapTotalMB: +(mem.heapTotal / 1024 / 1024).toFixed(2),
    rssMB: +(mem.rss / 1024 / 1024).toFixed(2),
    externalMB: +(mem.external / 1024 / 1024).toFixed(2),
  };
}
