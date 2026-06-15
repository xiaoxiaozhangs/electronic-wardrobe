/**
 * 全局状态管理 — Pinia 等价方案（基于 React 18 useSyncExternalStore）
 *
 * 三大 Store：
 *   - uiStore       全局弹层栈 / Toast 队列 / Loading 计数 / 转场状态
 *   - wardrobeStore 衣橱列表数据（分页追加） / 选中衣物 / 筛选 + 排序
 *   - cacheStore    列表缓存（5min TTL） / 图片 URL 映射 / 用户偏好（持久）
 *
 * 使用约定：
 *   - 业务侧只通过暴露的 hooks（useXxx）订阅状态切片，自动收敛 re-render
 *   - 修改状态使用具名 actions（pushModal / pageLoaded 等），不直接 setState
 *   - cacheStore 的列表缓存统一由 buildListCacheKey() 生成 key
 */
export {
  createStore,
  useStore,
  shallowEqual,
  type Store,
} from './createStore';

export {
  DEFAULT_TTL,
  setCache,
  getCache,
  removeCache,
  isCacheValid,
  getCacheTTL,
} from './cacheUtil';

export * from './uiStore';
export * from './wardrobeStore';
export * from './cacheStore';
