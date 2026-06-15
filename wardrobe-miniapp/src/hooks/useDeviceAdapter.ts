/**
 * ============================================================
 * 设备 / 安全区适配 Hook
 *
 * 在组件中消费 utils/adapter 提供的能力：
 *  - useSafeArea  : 顶部 / 底部 / 左右安全区（px）
 *  - useDeviceTier: 当前设备分级 + 常用降级开关
 *  - useDeviceInfo: 完整设备信息（必要时使用）
 *
 * 这些值在小程序生命周期内是不变的，因此只在首次渲染时读取一次，
 * 后续 re-render 直接返回缓存对象。
 * ============================================================
 */

import { useMemo } from 'react';
import {
  getSafeAreaInsets,
  getDeviceInfo,
  shouldEnableAnimation,
  shouldEnableBlur,
  shouldUseSingleColumn,
  type SafeAreaInsets,
  type DeviceInfo,
  type DeviceTier,
} from '../utils/adapter';

/** 安全区 hook，返回顶部 / 底部 / 左右像素值 */
export function useSafeArea(): SafeAreaInsets {
  return useMemo(() => getSafeAreaInsets(), []);
}

/** 设备分级 hook，返回 tier + 常用降级开关 */
export function useDeviceTier(): {
  tier: DeviceTier;
  singleColumn: boolean;
  enableBlur: boolean;
  enableAnimation: boolean;
} {
  return useMemo(() => {
    const { tier } = getDeviceInfo();
    return {
      tier,
      singleColumn: shouldUseSingleColumn(),
      enableBlur: shouldEnableBlur(),
      enableAnimation: shouldEnableAnimation(),
    };
  }, []);
}

/** 完整设备信息 hook（按需使用，常规场景用上面两个即可） */
export function useDeviceInfo(): DeviceInfo {
  return useMemo(() => getDeviceInfo(), []);
}
