/**
 * 页面转场动画封装
 *
 * 微信小程序 Taro 框架中，页面跳转默认使用系统动画。
 * 本模块提供自定义页面转场动画能力：
 * - push：右侧滑入（打开新页面）
 * - pop：左侧滑出（返回上一页）
 *
 * 使用方式：
 * 1. 在页面根元素上绑定 className，根据动画状态切换
 * 2. 在页面 onShow/onHide 生命周期中调用对应方法
 *
 * 注意：小程序原生页面转场由框架控制，自定义动画主要用于
 * 页面内组件级别的转场效果（如详情面板展开/收起）。
 * 页面级别的 push/pop 动画由微信原生导航控制，300ms 为默认时长。
 */

/** 动画时长（ms） */
export const TRANSITION_DURATION = 300;

/** 动画缓动函数 */
export const TRANSITION_EASING = 'ease-in-out';

/**
 * 获取页面进入动画样式（push：右侧滑入）
 * 用于新页面挂载时
 */
export function getPushEnterStyle(): React.CSSProperties {
  return {
    animation: `ec-page-push-in ${TRANSITION_DURATION}ms ${TRANSITION_EASING}`,
  };
}

/**
 * 获取页面离开动画样式（pop：左侧滑出）
 * 用于页面卸载前
 */
export function getPopExitStyle(): React.CSSProperties {
  return {
    animation: `ec-page-pop-out ${TRANSITION_DURATION}ms ${TRANSITION_EASING} forwards`,
  };
}

/**
 * 获取组件淡入样式
 */
export function getFadeInStyle(duration = 200): React.CSSProperties {
  return {
    animation: `ec-fade-in ${duration}ms ease`,
  };
}

/**
 * 获取弹入样式（scale bounce）
 */
export function getBounceInStyle(): React.CSSProperties {
  return {
    animation: 'ec-bounce-in 0.4s ease',
  };
}

/**
 * 获取抖动样式（用于错误反馈）
 */
export function getShakeStyle(): React.CSSProperties {
  return {
    animation: 'ec-shake 0.4s ease',
  };
}

/**
 * 获取页面转场 CSS transition 字符串
 * 用于直接设置 style 属性
 */
export function getPageTransitionStyle(): string {
  return `transform ${TRANSITION_DURATION}ms ${TRANSITION_EASING}, opacity ${TRANSITION_DURATION}ms ${TRANSITION_EASING}`;
}

/**
 * 页面转场状态
 */
export type PageTransitionState = 'idle' | 'entering' | 'exiting';

/**
 * 页面转场 Hook 返回类型
 */
export interface PageTransitionResult {
  state: PageTransitionState;
  style: React.CSSProperties;
  /** 触发进入动画 */
  enter: () => void;
  /** 触发离开动画 */
  exit: () => Promise<void>;
}

/**
 * 创建页面转场控制器
 * 返回动画状态和样式，用于绑定到页面根元素
 *
 * @example
 * const { state, style, enter, exit } = usePageTransition();
 * // 在页面根元素上: style={style}
 * // 在 useEffect 中: enter();
 * // 在返回操作前: await exit(); 然后 navigateBack
 */
export function createPageTransition(
  onEnterComplete?: () => void,
  onExitComplete?: () => void,
): PageTransitionResult {
  let state: PageTransitionState = 'idle';

  const getStyle = (): React.CSSProperties => {
    switch (state) {
      case 'entering':
        return getPushEnterStyle();
      case 'exiting':
        return getPopExitStyle();
      default:
        return {};
    }
  };

  const enter = () => {
    state = 'entering';
    setTimeout(() => {
      state = 'idle';
      onEnterComplete?.();
    }, TRANSITION_DURATION);
  };

  const exit = (): Promise<void> => {
    return new Promise((resolve) => {
      state = 'exiting';
      setTimeout(() => {
        state = 'idle';
        onExitComplete?.();
        resolve();
      }, TRANSITION_DURATION);
    });
  };

  return {
    get state() { return state; },
    get style() { return getStyle(); },
    enter,
    exit,
  };
}
