/**
 * 本地缓存工具封装 — wx.setStorageSync + 5min TTL
 *
 * 通过 Taro.setStorageSync / Taro.getStorageSync 在微信小程序、H5 中通用。
 * 写入时附带过期时间戳，读取时自动校验并清理过期数据。
 */
import Taro from '@tarojs/taro';

/** 默认 TTL 5 分钟 */
export const DEFAULT_TTL = 5 * 60 * 1000;
/** 永不过期标记 */
const NEVER_EXPIRE = -1;

interface Wrapped<T> {
  /** 实际数据 */
  v: T;
  /** 过期时间戳（毫秒），-1 表示永不过期 */
  t: number;
}

/**
 * 写入缓存
 * @param ttl 毫秒；传 Infinity 表示永不过期
 */
export function setCache<T>(key: string, value: T, ttl: number = DEFAULT_TTL): void {
  try {
    const expiresAt = ttl === Infinity ? NEVER_EXPIRE : Date.now() + ttl;
    const wrapped: Wrapped<T> = { v: value, t: expiresAt };
    Taro.setStorageSync(key, JSON.stringify(wrapped));
  } catch (err) {
    console.warn('[cache] setCache failed:', key, err);
  }
}

/**
 * 读取缓存；过期或不存在返回 null
 */
export function getCache<T>(key: string): T | null {
  try {
    const raw = Taro.getStorageSync(key);
    if (!raw || typeof raw !== 'string') return null;
    const wrapped = JSON.parse(raw) as Wrapped<T>;
    if (wrapped.t !== NEVER_EXPIRE && Date.now() > wrapped.t) {
      Taro.removeStorageSync(key);
      return null;
    }
    return wrapped.v;
  } catch (err) {
    console.warn('[cache] getCache failed:', key, err);
    return null;
  }
}

/** 移除指定缓存 */
export function removeCache(key: string): void {
  try {
    Taro.removeStorageSync(key);
  } catch {
    /* noop */
  }
}

/** 仅校验缓存是否存在且未过期，不读取数据 */
export function isCacheValid(key: string): boolean {
  try {
    const raw = Taro.getStorageSync(key);
    if (!raw || typeof raw !== 'string') return false;
    const wrapped = JSON.parse(raw) as Wrapped<unknown>;
    return wrapped.t === NEVER_EXPIRE || Date.now() <= wrapped.t;
  } catch {
    return false;
  }
}

/**
 * 获取剩余 TTL（毫秒），过期/不存在返回 0，永不过期返回 Infinity
 */
export function getCacheTTL(key: string): number {
  try {
    const raw = Taro.getStorageSync(key);
    if (!raw || typeof raw !== 'string') return 0;
    const wrapped = JSON.parse(raw) as Wrapped<unknown>;
    if (wrapped.t === NEVER_EXPIRE) return Infinity;
    const remaining = wrapped.t - Date.now();
    return remaining > 0 ? remaining : 0;
  } catch {
    return 0;
  }
}
