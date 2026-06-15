/**
 * ============================================================
 * 多机型适配工具集
 *
 * 覆盖：
 *  1. 安全区获取（iPhone 全面屏 / Android 异形屏）
 *  2. rpx ↔ px 双向换算（设计稿基准 750rpx）
 *  3. 设备分级（高/中/低端，用于降级策略）
 *  4. 基础库版本判定（backdrop-filter 等能力检测）
 *
 * 注意：
 *  - getSystemInfoSync 只在初始化时调用一次，结果做模块级缓存
 *  - 横屏切换或后续机型变化场景在本项目暂不考虑（小程序均为竖屏）
 *  - 任何获取失败都给出可接受的兜底值，避免组件渲染崩溃
 * ============================================================
 */

import Taro from '@tarojs/taro';

// ---------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------

export interface SafeAreaInsets {
  /** 顶部安全距离（状态栏 + 刘海/灵动岛），单位 px（rpx 前的物理 px） */
  top: number;
  /** 底部 Home Indicator 安全距离，单位 px */
  bottom: number;
  /** 左侧安全距离（横屏 / 折叠屏） */
  left: number;
  /** 右侧安全距离 */
  right: number;
  /** 状态栏高度，单位 px（独立于 safeArea） */
  statusBarHeight: number;
}

/** 设备性能等级，用于功能降级判断 */
export type DeviceTier = 'high' | 'mid' | 'low';

export interface DeviceInfo {
  /** 屏幕宽度 px（windowWidth） */
  windowWidth: number;
  /** 屏幕高度 px（windowHeight） */
  windowHeight: number;
  /** 设备像素比 */
  pixelRatio: number;
  /** 平台：ios / android / devtools / mac / windows */
  platform: string;
  /** 微信基础库版本，例如 "2.30.4" */
  sdkVersion: string;
  /** 品牌（如 iPhone / HUAWEI / Xiaomi） */
  brand: string;
  /** 设备型号 */
  model: string;
  /** 系统名称（ios/android） */
  system: string;
  /** 是否 iPhone X 及以上全面屏（顶部刘海或灵动岛） */
  isFullScreen: boolean;
  /** 设备性能等级（基于内存与平台综合判定） */
  tier: DeviceTier;
  /** 内存（GB），不可获取时为 0 */
  memorySizeGB: number;
}

// ---------------------------------------------------------------
// 内部缓存
// ---------------------------------------------------------------

/** 设计稿基准宽度，与 Taro 默认一致 */
export const DESIGN_WIDTH_RPX = 750;

let _systemInfo: Taro.getSystemInfoSync.Result | null = null;
let _safeArea: SafeAreaInsets | null = null;
let _deviceInfo: DeviceInfo | null = null;

function getSystemInfoSafe(): Taro.getSystemInfoSync.Result | null {
  if (_systemInfo) return _systemInfo;
  try {
    _systemInfo = Taro.getSystemInfoSync();
    return _systemInfo;
  } catch (err) {
    console.warn('[adapter] getSystemInfoSync 失败:', err);
    return null;
  }
}

// ---------------------------------------------------------------
// 安全区
// ---------------------------------------------------------------

/**
 * 获取安全区插值（带兜底）
 *
 * 计算规则：
 *  - top    = safeArea.top（包含状态栏 + 刘海）
 *  - bottom = screenHeight - safeArea.bottom（底部 Home Indicator）
 *  - left   = safeArea.left
 *  - right  = screenWidth - safeArea.right
 */
export function getSafeAreaInsets(): SafeAreaInsets {
  if (_safeArea) return _safeArea;

  const info = getSystemInfoSafe();
  const fallback: SafeAreaInsets = {
    top: 20,
    bottom: 0,
    left: 0,
    right: 0,
    statusBarHeight: 20,
  };
  if (!info) {
    _safeArea = fallback;
    return fallback;
  }

  const screenW = info.screenWidth || info.windowWidth;
  const screenH = info.screenHeight || info.windowHeight;
  const sa = info.safeArea;
  const statusBarHeight = info.statusBarHeight || 20;

  if (!sa) {
    _safeArea = { ...fallback, statusBarHeight };
    return _safeArea;
  }

  _safeArea = {
    top: Math.max(0, sa.top || statusBarHeight),
    bottom: Math.max(0, screenH - (sa.bottom ?? screenH)),
    left: Math.max(0, sa.left || 0),
    right: Math.max(0, screenW - (sa.right ?? screenW)),
    statusBarHeight,
  };
  return _safeArea;
}

// ---------------------------------------------------------------
// rpx / px 换算
// ---------------------------------------------------------------

/**
 * px → rpx
 * @param px 物理像素
 */
export function px2rpx(px: number): number {
  const info = getSystemInfoSafe();
  const windowWidth = info?.windowWidth || 375;
  const factor = DESIGN_WIDTH_RPX / windowWidth;
  return Math.round(px * factor);
}

/**
 * rpx → px
 * @param rpx 设计稿单位
 */
export function rpx2px(rpx: number): number {
  const info = getSystemInfoSafe();
  const windowWidth = info?.windowWidth || 375;
  const factor = windowWidth / DESIGN_WIDTH_RPX;
  return Math.round(rpx * factor * 100) / 100;
}

/** 当前 rpx → px 的换算系数 */
export function getRpxFactor(): number {
  const info = getSystemInfoSafe();
  const windowWidth = info?.windowWidth || 375;
  return windowWidth / DESIGN_WIDTH_RPX;
}

// ---------------------------------------------------------------
// 基础库版本 / 能力检测
// ---------------------------------------------------------------

/**
 * 比较两个语义化版本字符串
 * @returns -1 / 0 / 1
 */
export function compareVersion(v1: string, v2: string): number {
  const a = String(v1 || '0').split('.').map((x) => parseInt(x, 10) || 0);
  const b = String(v2 || '0').split('.').map((x) => parseInt(x, 10) || 0);
  const len = Math.max(a.length, b.length);
  while (a.length < len) a.push(0);
  while (b.length < len) b.push(0);
  for (let i = 0; i < len; i++) {
    if (a[i] > b[i]) return 1;
    if (a[i] < b[i]) return -1;
  }
  return 0;
}

/** 项目最低支持基础库 */
export const MIN_SDK_VERSION = '2.25.0';

/** 当前基础库是否满足最低版本 */
export function isSdkSupported(min: string = MIN_SDK_VERSION): boolean {
  const info = getSystemInfoSafe();
  const version = info?.SDKVersion || '0.0.0';
  return compareVersion(version, min) >= 0;
}

/**
 * backdrop-filter 在小程序里支持度差，且开启会显著消耗性能。
 * 仅 iOS + 基础库 ≥ 2.18.0 时启用，其余一律关闭。
 */
export function supportsBackdropFilter(): boolean {
  const info = getSystemInfoSafe();
  if (!info) return false;
  if (info.platform !== 'ios') return false;
  return compareVersion(info.SDKVersion || '0.0.0', '2.18.0') >= 0;
}

// ---------------------------------------------------------------
// 设备分级
// ---------------------------------------------------------------

/**
 * 解析机型内存（GB）。微信基础库 ≥ 2.10.4 在 Android 上提供 benchmarkLevel
 * 与 memorySize（KB）。iOS 不暴露内存，统一按 high 处理。
 */
function getMemorySizeGB(info: Taro.getSystemInfoSync.Result | null): number {
  if (!info) return 0;
  // 微信小程序 Android 端提供 memorySize（单位 KB / 字符串）
  // Taro 类型可能不带该字段，做容错读取
  const raw = (info as unknown as { memorySize?: number | string }).memorySize;
  if (raw == null) return 0;
  const num = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
  if (!Number.isFinite(num) || num <= 0) return 0;
  // 微信文档：memorySize 单位为 KB
  return Math.round((num / 1024 / 1024) * 10) / 10;
}

/**
 * 设备分级判定：
 *  - low : Android 且内存 < 4GB（无法跑双列流畅）
 *  - mid : 其它 Android、devtools
 *  - high: iOS 全部、内存 ≥ 6GB 的 Android
 */
function classifyDeviceTier(info: Taro.getSystemInfoSync.Result | null): DeviceTier {
  if (!info) return 'mid';
  const platform = (info.platform || '').toLowerCase();
  if (platform === 'ios' || platform === 'mac') return 'high';
  const memGB = getMemorySizeGB(info);
  if (platform === 'android') {
    if (memGB > 0 && memGB < 4) return 'low';
    if (memGB >= 6) return 'high';
    return 'mid';
  }
  return 'mid';
}

/**
 * 全面屏判定：iPhone X 及以上 / Android 安全区底部 > 0
 */
function detectFullScreen(info: Taro.getSystemInfoSync.Result | null): boolean {
  if (!info) return false;
  const sa = info.safeArea;
  if (!sa) return false;
  const screenH = info.screenHeight || info.windowHeight || 0;
  const bottomInset = screenH - (sa.bottom ?? screenH);
  // 顶部 ≥ 44 通常意味着刘海/灵动岛；底部 inset > 0 即异形屏
  return (sa.top || 0) >= 44 || bottomInset > 0;
}

/** 获取规整后的设备信息（带缓存） */
export function getDeviceInfo(): DeviceInfo {
  if (_deviceInfo) return _deviceInfo;
  const info = getSystemInfoSafe();

  if (!info) {
    _deviceInfo = {
      windowWidth: 375,
      windowHeight: 667,
      pixelRatio: 2,
      platform: 'unknown',
      sdkVersion: '0.0.0',
      brand: 'unknown',
      model: 'unknown',
      system: 'unknown',
      isFullScreen: false,
      tier: 'mid',
      memorySizeGB: 0,
    };
    return _deviceInfo;
  }

  _deviceInfo = {
    windowWidth: info.windowWidth,
    windowHeight: info.windowHeight,
    pixelRatio: info.pixelRatio,
    platform: info.platform,
    sdkVersion: info.SDKVersion || '0.0.0',
    brand: info.brand || '',
    model: info.model || '',
    system: info.system || '',
    isFullScreen: detectFullScreen(info),
    tier: classifyDeviceTier(info),
    memorySizeGB: getMemorySizeGB(info),
  };
  return _deviceInfo;
}

// ---------------------------------------------------------------
// 降级策略快捷判断
// ---------------------------------------------------------------

/** 是否使用单列布局（低端 Android 强制单列） */
export function shouldUseSingleColumn(): boolean {
  return getDeviceInfo().tier === 'low';
}

/** 是否启用模糊背景（毛玻璃） */
export function shouldEnableBlur(): boolean {
  if (!supportsBackdropFilter()) return false;
  return getDeviceInfo().tier !== 'low';
}

/** 是否启用复杂动画（低端机关闭过渡动画） */
export function shouldEnableAnimation(): boolean {
  return getDeviceInfo().tier !== 'low';
}

// ---------------------------------------------------------------
// CSS 变量注入（在 app.tsx 启动时调用一次）
// ---------------------------------------------------------------

/**
 * 把安全区与设备分级写入页面根元素的 CSS 变量中，
 * 这样 SCSS 可通过 `var(--safe-area-inset-top)` 直接消费。
 *
 * 仅 H5 / devtools 生效（小程序无 document），小程序端通过
 * inline style 在组件层消费安全区即可。
 */
export function injectSafeAreaCssVars(): void {
  // 小程序无 document，跳过
  if (typeof document === 'undefined') return;
  const insets = getSafeAreaInsets();
  const device = getDeviceInfo();
  const root = document.documentElement;
  root.style.setProperty('--safe-area-inset-top', `${insets.top}px`);
  root.style.setProperty('--safe-area-inset-bottom', `${insets.bottom}px`);
  root.style.setProperty('--safe-area-inset-left', `${insets.left}px`);
  root.style.setProperty('--safe-area-inset-right', `${insets.right}px`);
  root.style.setProperty('--status-bar-height', `${insets.statusBarHeight}px`);
  root.setAttribute('data-device-tier', device.tier);
  root.setAttribute('data-platform', device.platform);
  if (device.isFullScreen) root.setAttribute('data-full-screen', '1');
}

// ---------------------------------------------------------------
// 测试 / 调试辅助：清缓存重新读取（仅开发使用）
// ---------------------------------------------------------------

export function __resetAdapterCache(): void {
  _systemInfo = null;
  _safeArea = null;
  _deviceInfo = null;
}
