/**
 * 缓存 Store — 列表数据 / 图片 URL / 用户偏好
 *
 *  - listCache：以筛选条件 hash 为 key，缓存分页结果，5min 过期
 *  - imageUrlCache：cloud:// fileID → 临时 https URL 映射，永不过期（重启清空）
 *  - prefs：用户偏好（默认排序、默认场景、暗色模式等），永久持久化
 *
 * 五分钟过期通过 cacheUtil 的 wrapped {v, t} 机制实现，读取时统一校验。
 * 内存层（state）做快路径，磁盘层（storage）做冷启动恢复。
 */
import {
  DEFAULT_TTL,
  getCache,
  removeCache,
  setCache,
} from './cacheUtil';
import { createStore, shallowEqual, useStore, type Store } from './createStore';
import type { WardrobeItem } from '../types';

// ---------------- Types ----------------

export interface ListCacheEntry {
  /** 命中此 key 的衣物列表 */
  list: WardrobeItem[];
  /** 总数 */
  total: number;
  /** 缓存写入时间戳，用于 UI 提示（可选） */
  cachedAt: number;
}

export interface UserPrefs {
  /** 默认搭配场景 */
  defaultScenario: string;
  /** 默认季节，'auto' 表示按当前月份推断 */
  defaultSeason: string;
  /** 主题：light/dark/system */
  theme: 'light' | 'dark' | 'system';
  /** 列表默认排序方式 */
  defaultSortBy: string;
  /** 是否启用震动反馈 */
  haptic: boolean;
}

export const DEFAULT_PREFS: UserPrefs = {
  defaultScenario: '通勤',
  defaultSeason: 'auto',
  theme: 'system',
  defaultSortBy: 'createdAt',
  haptic: true,
};

export interface CacheState {
  /** 列表缓存（key → entry）；过期由 listCacheTimestamp 兜底校验 */
  listCache: Record<string, ListCacheEntry>;
  /** fileID → 临时 URL */
  imageUrlCache: Record<string, string>;
  /** 用户偏好 */
  prefs: UserPrefs;
}

// ---------------- Storage Keys ----------------

const KEY_LIST_PREFIX = 'ew_list_cache:';
const KEY_IMAGE_URL = 'ew_image_url_cache';
const KEY_PREFS = 'ew_user_prefs';

// 5min 过期：只对列表数据生效；图片 URL 不主动过期（cloud token 失效时再清理）；偏好永不过期
const LIST_TTL = DEFAULT_TTL;

// ---------------- Store ----------------

const initial: CacheState = {
  listCache: {},
  imageUrlCache: hydrateImageUrls(),
  prefs: hydratePrefs(),
};

export const cacheStore: Store<CacheState> = createStore<CacheState>(initial);

function hydrateImageUrls(): Record<string, string> {
  // 图片 URL 缓存按整体读写，永不过期
  const cached = getCache<Record<string, string>>(KEY_IMAGE_URL);
  return cached ?? {};
}

function hydratePrefs(): UserPrefs {
  const cached = getCache<UserPrefs>(KEY_PREFS);
  return cached ? { ...DEFAULT_PREFS, ...cached } : DEFAULT_PREFS;
}

// ---------------- List Cache ----------------

/**
 * 生成稳定的列表缓存 key
 * 规则：将筛选 + 排序 + 页码扁平化为字符串，避免对象顺序差异导致 miss
 */
export function buildListCacheKey(parts: Record<string, unknown>): string {
  const keys = Object.keys(parts).sort();
  const pairs = keys
    .filter((k) => parts[k] !== undefined && parts[k] !== null && parts[k] !== '')
    .map((k) => `${k}=${String(parts[k])}`);
  return pairs.join('&');
}

/** 写入列表缓存（内存 + 持久化），TTL 5 分钟 */
export function setListCache(key: string, entry: Omit<ListCacheEntry, 'cachedAt'>): void {
  const fullEntry: ListCacheEntry = { ...entry, cachedAt: Date.now() };
  cacheStore.setState((s) => ({
    ...s,
    listCache: { ...s.listCache, [key]: fullEntry },
  }));
  setCache(KEY_LIST_PREFIX + key, fullEntry, LIST_TTL);
}

/**
 * 读取列表缓存：先看内存，未命中或已过期则从存储读取
 * 过期数据自动清理
 */
export function getListCache(key: string): ListCacheEntry | null {
  const memory = cacheStore.getState().listCache[key];
  if (memory && Date.now() - memory.cachedAt < LIST_TTL) {
    return memory;
  }
  const fromDisk = getCache<ListCacheEntry>(KEY_LIST_PREFIX + key);
  if (fromDisk) {
    // 回填内存
    cacheStore.setState((s) => ({
      ...s,
      listCache: { ...s.listCache, [key]: fromDisk },
    }));
    return fromDisk;
  }
  // 内存有但已过期 → 清理
  if (memory) {
    cacheStore.setState((s) => {
      const next = { ...s.listCache };
      delete next[key];
      return { ...s, listCache: next };
    });
  }
  return null;
}

/** 主动失效列表缓存（如新增/删除衣物后） */
export function invalidateListCache(keyPrefix?: string): void {
  cacheStore.setState((s) => {
    if (!keyPrefix) {
      // 清空所有内存缓存；磁盘按 prefix 扫描清理代价高，留给 5min TTL
      Object.keys(s.listCache).forEach((k) => removeCache(KEY_LIST_PREFIX + k));
      return { ...s, listCache: {} };
    }
    const next: Record<string, ListCacheEntry> = {};
    Object.entries(s.listCache).forEach(([k, v]) => {
      if (k.startsWith(keyPrefix)) {
        removeCache(KEY_LIST_PREFIX + k);
      } else {
        next[k] = v;
      }
    });
    return { ...s, listCache: next };
  });
}

// ---------------- Image URL Cache ----------------

export function getImageUrl(fileId: string): string | null {
  return cacheStore.getState().imageUrlCache[fileId] ?? null;
}

export function setImageUrl(fileId: string, url: string): void {
  cacheStore.setState((s) => {
    if (s.imageUrlCache[fileId] === url) return s;
    const next = { ...s.imageUrlCache, [fileId]: url };
    setCache(KEY_IMAGE_URL, next, Infinity);
    return { ...s, imageUrlCache: next };
  });
}

export function setImageUrls(map: Record<string, string>): void {
  if (Object.keys(map).length === 0) return;
  cacheStore.setState((s) => {
    const next = { ...s.imageUrlCache, ...map };
    setCache(KEY_IMAGE_URL, next, Infinity);
    return { ...s, imageUrlCache: next };
  });
}

export function clearImageUrls(): void {
  cacheStore.setState((s) => {
    if (Object.keys(s.imageUrlCache).length === 0) return s;
    removeCache(KEY_IMAGE_URL);
    return { ...s, imageUrlCache: {} };
  });
}

// ---------------- User Prefs ----------------

export function getPrefs(): UserPrefs {
  return cacheStore.getState().prefs;
}

export function setPrefs(patch: Partial<UserPrefs>): void {
  cacheStore.setState((s) => {
    const next = { ...s.prefs, ...patch };
    if (shallowEqual(s.prefs, next)) return s;
    setCache(KEY_PREFS, next, Infinity);
    return { ...s, prefs: next };
  });
}

export function resetPrefs(): void {
  cacheStore.setState((s) => {
    if (shallowEqual(s.prefs, DEFAULT_PREFS)) return s;
    setCache(KEY_PREFS, DEFAULT_PREFS, Infinity);
    return { ...s, prefs: DEFAULT_PREFS };
  });
}

// ---------------- Hooks ----------------

export function usePrefs(): UserPrefs {
  return useStore(cacheStore, (s) => s.prefs, shallowEqual);
}

export function useImageUrl(fileId: string | undefined | null): string | null {
  return useStore(cacheStore, (s) => (fileId ? s.imageUrlCache[fileId] ?? null : null));
}
