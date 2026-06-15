/**
 * UI 全局状态 Store
 *
 *  - Modal z-index 栈：多弹层叠加时按入栈顺序分配 z-index，关闭时出栈
 *  - Toast 队列：FIFO 单条显示，自动消失后弹出下一条
 *  - Loading 计数器：多请求并行 loading 时，全部结束后才隐藏 loading
 *  - 页面转场状态：标记当前是否处于 push/pop 过渡中
 */
import { useStore, createStore, shallowEqual, type Store } from './createStore';

// ---------------- Types ----------------

export type ToastType = 'success' | 'warn' | 'error' | 'info';
export type TransitionState = 'idle' | 'push' | 'pop';

export interface ModalEntry {
  /** 唯一 id（业务方传入或自动生成） */
  id: string;
  /** 计算出的 z-index，按入栈顺序递增 */
  zIndex: number;
}

export interface ToastEntry {
  id: string;
  type: ToastType;
  message: string;
  /** 显示时长，默认 2000ms */
  duration: number;
}

export interface UiState {
  /** Modal 栈，栈顶为最新弹层 */
  modalStack: ModalEntry[];
  /** Toast 队列，队首为正在显示的 Toast */
  toastQueue: ToastEntry[];
  /** Loading 引用计数；> 0 时显示 loading */
  loadingCount: number;
  /** 当前页面转场状态 */
  transition: TransitionState;
}

// ---------------- Constants ----------------

/** Modal 起始 z-index，每入栈一层 +10 */
const MODAL_BASE_Z_INDEX = 1000;
const MODAL_Z_INDEX_STEP = 10;
const DEFAULT_TOAST_DURATION = 2000;

// ---------------- Store ----------------

const initial: UiState = {
  modalStack: [],
  toastQueue: [],
  loadingCount: 0,
  transition: 'idle',
};

export const uiStore: Store<UiState> = createStore<UiState>(initial);

let _modalAutoId = 0;
let _toastAutoId = 0;

function genModalId(): string {
  _modalAutoId += 1;
  return `modal_${Date.now().toString(36)}_${_modalAutoId}`;
}

function genToastId(): string {
  _toastAutoId += 1;
  return `toast_${Date.now().toString(36)}_${_toastAutoId}`;
}

// ---------------- Modal ----------------

/**
 * 弹层入栈，返回分配的 zIndex 与 id
 * 同 id 重复 push 会被忽略，复用已有 zIndex
 */
export function pushModal(id?: string): ModalEntry {
  const state = uiStore.getState();
  const useId = id ?? genModalId();
  const exist = state.modalStack.find((m) => m.id === useId);
  if (exist) return exist;

  const zIndex = MODAL_BASE_Z_INDEX + state.modalStack.length * MODAL_Z_INDEX_STEP;
  const entry: ModalEntry = { id: useId, zIndex };
  uiStore.setState((s) => ({ ...s, modalStack: [...s.modalStack, entry] }));
  return entry;
}

/** 弹层出栈 */
export function popModal(id: string): void {
  uiStore.setState((s) => {
    const next = s.modalStack.filter((m) => m.id !== id);
    if (next.length === s.modalStack.length) return s;
    return { ...s, modalStack: next };
  });
}

/** 清空所有弹层（路由切换时使用） */
export function clearModals(): void {
  uiStore.setState((s) => (s.modalStack.length === 0 ? s : { ...s, modalStack: [] }));
}

// ---------------- Toast ----------------

export interface ShowToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

/** 入队一个 Toast，返回 id；外部不需要 id 时可忽略 */
export function showToast(opts: ShowToastOptions | string): string {
  const o: ShowToastOptions = typeof opts === 'string' ? { message: opts } : opts;
  const entry: ToastEntry = {
    id: genToastId(),
    message: o.message,
    type: o.type ?? 'info',
    duration: o.duration ?? DEFAULT_TOAST_DURATION,
  };
  uiStore.setState((s) => ({ ...s, toastQueue: [...s.toastQueue, entry] }));
  return entry.id;
}

/** 弹出队首 Toast（动画结束后由 UI 层调用） */
export function dismissToast(id?: string): void {
  uiStore.setState((s) => {
    if (s.toastQueue.length === 0) return s;
    if (id) {
      const next = s.toastQueue.filter((t) => t.id !== id);
      return next.length === s.toastQueue.length ? s : { ...s, toastQueue: next };
    }
    return { ...s, toastQueue: s.toastQueue.slice(1) };
  });
}

export function clearToasts(): void {
  uiStore.setState((s) => (s.toastQueue.length === 0 ? s : { ...s, toastQueue: [] }));
}

// ---------------- Loading ----------------

/**
 * 引入一个 loading 引用。返回释放函数。
 * 多次 incrLoading 必须由对应数量的 release() 来抵消。
 */
export function incrLoading(): () => void {
  uiStore.setState((s) => ({ ...s, loadingCount: s.loadingCount + 1 }));
  let released = false;
  return () => {
    if (released) return;
    released = true;
    uiStore.setState((s) => ({
      ...s,
      loadingCount: Math.max(0, s.loadingCount - 1),
    }));
  };
}

/** 强制重置 loading（页面卸载/异常恢复时使用） */
export function resetLoading(): void {
  uiStore.setState((s) => (s.loadingCount === 0 ? s : { ...s, loadingCount: 0 }));
}

// ---------------- Transition ----------------

export function setTransition(state: TransitionState): void {
  uiStore.setState((s) => (s.transition === state ? s : { ...s, transition: state }));
}

// ---------------- Hooks ----------------

/** 订阅顶层弹层 zIndex（不存在时返回 null） */
export function useTopModal(): ModalEntry | null {
  return useStore(uiStore, (s) =>
    s.modalStack.length > 0 ? s.modalStack[s.modalStack.length - 1] : null,
  );
}

/** 订阅整个弹层栈 */
export function useModalStack(): ModalEntry[] {
  return useStore(uiStore, (s) => s.modalStack, shallowEqual);
}

/** 订阅当前队首 Toast（即正在显示的 Toast） */
export function useCurrentToast(): ToastEntry | null {
  return useStore(uiStore, (s) => (s.toastQueue.length > 0 ? s.toastQueue[0] : null));
}

/** 订阅 loading 是否显示 */
export function useLoading(): boolean {
  return useStore(uiStore, (s) => s.loadingCount > 0);
}

export function useTransition(): TransitionState {
  return useStore(uiStore, (s) => s.transition);
}
