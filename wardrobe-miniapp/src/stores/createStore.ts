/**
 * 极简 Store 原语 — 基于 React 18 useSyncExternalStore
 *
 * Pinia 是 Vue 生态，本项目（Taro + React）等价实现：
 *  - createStore() 创建可订阅的全局状态容器
 *  - useStore() 在组件中订阅状态切片，自动收敛 re-render
 *
 * 选择 useSyncExternalStore 的原因：
 *  - React 18 内置，无需引入 zustand/jotai 等额外依赖
 *  - 天然支持并发渲染，不会出现 tearing
 *  - 兼容 Taro 微信小程序运行时
 */
import { useRef } from 'react';
import { useSyncExternalStore } from 'react';

type Listener = () => void;
type Updater<T> = T | ((prev: T) => T);

export interface Store<T> {
  /** 同步获取当前状态 */
  getState: () => T;
  /** 替换或基于上一状态更新；引用未变时不通知订阅者 */
  setState: (updater: Updater<T>) => void;
  /** 订阅状态变化，返回取消订阅函数 */
  subscribe: (listener: Listener) => () => void;
}

export function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<Listener>();

  return {
    getState: () => state,
    setState: (updater) => {
      const next =
        typeof updater === 'function' ? (updater as (p: T) => T)(state) : updater;
      if (Object.is(next, state)) return;
      state = next;
      listeners.forEach((l) => l());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/**
 * 订阅 Store 切片
 *
 * @param store    目标 store
 * @param selector 选取函数，默认返回整个 state
 * @param isEqual  相等比较，默认 Object.is；选取数组/对象时建议传浅比较
 */
export function useStore<T, S = T>(
  store: Store<T>,
  selector: (state: T) => S = (s) => s as unknown as S,
  isEqual: (a: S, b: S) => boolean = Object.is,
): S {
  const cacheRef = useRef<{ source: T; result: S } | null>(null);

  const getSnapshot = () => {
    const source = store.getState();
    const cache = cacheRef.current;
    if (cache && cache.source === source) {
      return cache.result;
    }
    const result = selector(source);
    if (cache && isEqual(cache.result, result)) {
      cacheRef.current = { source, result: cache.result };
      return cache.result;
    }
    cacheRef.current = { source, result };
    return result;
  };

  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

/** 数组/对象选取时使用的浅相等比较 */
export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false;
  }
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!Object.is((a as any)[k], (b as any)[k])) return false;
  }
  return true;
}
