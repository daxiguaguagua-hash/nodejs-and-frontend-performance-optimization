// @perf/browser-sdk — 前端性能监控 SDK
// D7 起开发，逐步添加 Web Vitals、错误追踪、用户行为、自定义事件

export interface PerfOptions {
  appId: string;
  endpoint: string;
}

// TODO(D7): 实现 initPerf — 自动采集 LCP/INP/CLS
// TODO(D9): 添加错误追踪、页面访问追踪、track() API
export function initPerf(_options: PerfOptions): void {
  // skeleton — D7 实现
}
