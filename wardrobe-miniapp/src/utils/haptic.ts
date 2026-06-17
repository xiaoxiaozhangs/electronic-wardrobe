/**
 * 震动反馈封装（haptic.ts）
 *
 * 对微信小程序 wx.vibrateShort / wx.vibrateLong 的轻量封装。
 * 所有方法都是安全的（catch 静默忽略），避免在不支持震动的设备上报错。
 *
 * 使用场景：
 * - 按钮点击反馈 → hapticLight()
 * - 开关切换 → hapticLight()
 * - 操作成功 → hapticMedium()
 * - 错误/警告 → hapticHeavy()
 * - 长按操作 → hapticLong()
 */

/** 短震动 - 轻（默认按钮反馈） */
export function hapticLight(): void {
  try {
    if (typeof wx !== 'undefined' && wx.vibrateShort) {
      wx.vibrateShort({ type: 'light' });
    }
  } catch {
    // 静默忽略
  }
}

/** 短震动 - 中（操作成功） */
export function hapticMedium(): void {
  try {
    if (typeof wx !== 'undefined' && wx.vibrateShort) {
      wx.vibrateShort({ type: 'medium' });
    }
  } catch {
    // 静默忽略
  }
}

/** 短震动 - 重（错误/警告） */
export function hapticHeavy(): void {
  try {
    if (typeof wx !== 'undefined' && wx.vibrateShort) {
      wx.vibrateShort({ type: 'heavy' });
    }
  } catch {
    // 静默忽略
  }
}

/** 长震动（长按操作，如删除确认） */
export function hapticLong(): void {
  try {
    if (typeof wx !== 'undefined' && wx.vibrateLong) {
      wx.vibrateLong();
    }
  } catch {
    // 静默忽略
  }
}

/**
 * 带 selection 变化的震动（用于 picker/滑块等选择变化）
 * 仅在 iOS 上有效
 */
export function hapticSelection(): void {
  try {
    if (typeof wx !== 'undefined' && wx.vibrateShort) {
      // 微信小程序 selectionChanged 触感：使用 light 作为近似替代
      wx.vibrateShort({ type: 'light' });
    }
  } catch {
    // 静默忽略
  }
}
