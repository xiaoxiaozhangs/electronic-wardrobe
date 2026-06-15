/**
 * 衣橱业务 Store
 *
 *  - 列表数据按页追加（pageSize=20）
 *  - 当前选中衣物详情（详情页/弹层使用）
 *  - 筛选/排序条件
 *  - 三种加载状态：firstLoad / loadingMore / refreshing
 */
import type { ColorLabel, ItemStatus, Scenario, Season, Style, WardrobeItem } from '../types';
import { useStore, createStore, shallowEqual, type Store } from './createStore';

export type WardrobeListPhase = 'idle' | 'firstLoad' | 'loadingMore' | 'refreshing' | 'error';

export type WardrobeSortBy = 'createdAt' | 'wearCount' | 'lastWornAt';
export type SortOrder = 'asc' | 'desc';

export interface WardrobeFilterState {
  category: string | '全部';
  primaryColor: ColorLabel | '全部';
  season: Season | '全部';
  scenario: Scenario | '全部';
  style: Style | '全部';
  status: ItemStatus | '全部';
  search: string;
  favoriteOnly: boolean;
}

export interface WardrobeSortState {
  sortBy: WardrobeSortBy;
  order: SortOrder;
}

export interface WardrobeState {
  /** 全量加载到本地的衣物（按页追加） */
  items: WardrobeItem[];
  /** 当前选中的衣物 id（详情页使用） */
  selectedId: string | null;
  /** 分页页码（已加载到的页） */
  page: number;
  pageSize: number;
  /** 已知的总条数；后端响应后回填 */
  total: number;
  /** 是否还有下一页 */
  hasMore: boolean;
  /** 列表加载阶段 */
  phase: WardrobeListPhase;
  /** 错误信息 */
  errorMessage: string | null;
  /** 筛选条件 */
  filter: WardrobeFilterState;
  /** 排序条件 */
  sort: WardrobeSortState;
}

export const DEFAULT_PAGE_SIZE = 20;

export const DEFAULT_FILTER: WardrobeFilterState = {
  category: '全部',
  primaryColor: '全部',
  season: '全部',
  scenario: '全部',
  style: '全部',
  status: '全部',
  search: '',
  favoriteOnly: false,
};

export const DEFAULT_SORT: WardrobeSortState = {
  sortBy: 'createdAt',
  order: 'desc',
};

const initial: WardrobeState = {
  items: [],
  selectedId: null,
  page: 0,
  pageSize: DEFAULT_PAGE_SIZE,
  total: 0,
  hasMore: true,
  phase: 'idle',
  errorMessage: null,
  filter: DEFAULT_FILTER,
  sort: DEFAULT_SORT,
};

export const wardrobeStore: Store<WardrobeState> = createStore<WardrobeState>(initial);

// ---------------- Selectors ----------------

export function selectItems(s: WardrobeState): WardrobeItem[] {
  return s.items;
}

export function selectSelectedItem(s: WardrobeState): WardrobeItem | null {
  if (!s.selectedId) return null;
  return s.items.find((i) => i.id === s.selectedId) ?? null;
}

// ---------------- Actions ----------------

/** 进入首屏加载阶段：清空旧数据、置 phase=firstLoad */
export function startFirstLoad(): void {
  wardrobeStore.setState((s) => ({
    ...s,
    items: [],
    page: 0,
    total: 0,
    hasMore: true,
    phase: 'firstLoad',
    errorMessage: null,
  }));
}

/** 进入下拉刷新阶段：保留旧数据，phase=refreshing */
export function startRefresh(): void {
  wardrobeStore.setState((s) =>
    s.phase === 'refreshing' ? s : { ...s, phase: 'refreshing', errorMessage: null },
  );
}

/** 进入加载更多阶段；若已无更多或正在加载，原样返回 */
export function startLoadMore(): boolean {
  const s = wardrobeStore.getState();
  if (!s.hasMore) return false;
  if (s.phase === 'loadingMore' || s.phase === 'firstLoad') return false;
  wardrobeStore.setState((cur) => ({ ...cur, phase: 'loadingMore', errorMessage: null }));
  return true;
}

export interface PageResult {
  list: WardrobeItem[];
  page: number;
  pageSize?: number;
  total: number;
}

/**
 * 加载成功 — 根据 page=1 还是 page>1 决定替换或追加
 * 同 id 出现时以新数据为准（去重避免重复加载）
 */
export function pageLoaded(result: PageResult): void {
  const pageSize = result.pageSize ?? DEFAULT_PAGE_SIZE;
  wardrobeStore.setState((s) => {
    const isFirstPage = result.page <= 1;
    const merged = isFirstPage
      ? result.list.slice()
      : mergeUnique(s.items, result.list);
    const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
    return {
      ...s,
      items: merged,
      page: result.page,
      pageSize,
      total: result.total,
      hasMore: result.page < totalPages && merged.length < result.total,
      phase: 'idle',
      errorMessage: null,
    };
  });
}

function mergeUnique(prev: WardrobeItem[], next: WardrobeItem[]): WardrobeItem[] {
  if (next.length === 0) return prev;
  const map = new Map<string, WardrobeItem>();
  prev.forEach((it) => map.set(it.id, it));
  next.forEach((it) => map.set(it.id, it));
  return Array.from(map.values());
}

export function pageFailed(message: string): void {
  wardrobeStore.setState((s) => ({ ...s, phase: 'error', errorMessage: message }));
}

/** 上层乐观更新：插入新衣物到首位 */
export function insertItem(item: WardrobeItem): void {
  wardrobeStore.setState((s) => ({
    ...s,
    items: [item, ...s.items.filter((i) => i.id !== item.id)],
    total: s.total + 1,
  }));
}

export function patchItem(id: string, patch: Partial<WardrobeItem>): void {
  wardrobeStore.setState((s) => {
    const idx = s.items.findIndex((i) => i.id === id);
    if (idx < 0) return s;
    const next = s.items.slice();
    next[idx] = { ...next[idx], ...patch };
    return { ...s, items: next };
  });
}

/** 替换某条记录的 id（本地乐观插入后 → 云端返回真实 id 时使用） */
export function replaceItemId(localId: string, realId: string): void {
  wardrobeStore.setState((s) => {
    const idx = s.items.findIndex((i) => i.id === localId);
    if (idx < 0) return s;
    const next = s.items.slice();
    next[idx] = { ...next[idx], id: realId };
    return {
      ...s,
      items: next,
      selectedId: s.selectedId === localId ? realId : s.selectedId,
    };
  });
}

export function removeItem(id: string): void {
  wardrobeStore.setState((s) => {
    const next = s.items.filter((i) => i.id !== id);
    if (next.length === s.items.length) return s;
    return {
      ...s,
      items: next,
      total: Math.max(0, s.total - 1),
      selectedId: s.selectedId === id ? null : s.selectedId,
    };
  });
}

export function selectItem(id: string | null): void {
  wardrobeStore.setState((s) => (s.selectedId === id ? s : { ...s, selectedId: id }));
}

// ---------------- Filter / Sort ----------------

/**
 * 修改筛选条件（合并）— 不直接清空列表；调用方决定是否触发首屏重载
 */
export function setFilter(patch: Partial<WardrobeFilterState>): void {
  wardrobeStore.setState((s) => {
    const next = { ...s.filter, ...patch };
    if (shallowEqual(s.filter, next)) return s;
    return { ...s, filter: next };
  });
}

export function resetFilter(): void {
  wardrobeStore.setState((s) =>
    shallowEqual(s.filter, DEFAULT_FILTER) ? s : { ...s, filter: DEFAULT_FILTER },
  );
}

export function setSort(patch: Partial<WardrobeSortState>): void {
  wardrobeStore.setState((s) => {
    const next = { ...s.sort, ...patch };
    if (shallowEqual(s.sort, next)) return s;
    return { ...s, sort: next };
  });
}

// ---------------- Hooks ----------------

export function useWardrobeItems(): WardrobeItem[] {
  return useStore(wardrobeStore, selectItems, shallowEqual);
}

export function useWardrobeFilter(): WardrobeFilterState {
  return useStore(wardrobeStore, (s) => s.filter, shallowEqual);
}

export function useWardrobeSort(): WardrobeSortState {
  return useStore(wardrobeStore, (s) => s.sort, shallowEqual);
}

export interface WardrobeLoadState {
  phase: WardrobeListPhase;
  hasMore: boolean;
  page: number;
  total: number;
  errorMessage: string | null;
}

export function useWardrobeLoadState(): WardrobeLoadState {
  return useStore(
    wardrobeStore,
    (s) => ({
      phase: s.phase,
      hasMore: s.hasMore,
      page: s.page,
      total: s.total,
      errorMessage: s.errorMessage,
    }),
    shallowEqual,
  );
}

export function useSelectedItem(): WardrobeItem | null {
  return useStore(wardrobeStore, selectSelectedItem);
}
