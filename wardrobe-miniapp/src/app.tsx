import { Component, PropsWithChildren } from 'react';
import { initCloud, performLogin, isLoggedIn, clearToken } from './cloud';
import { getDeviceInfo, getSafeAreaInsets, injectSafeAreaCssVars } from './utils/adapter';
import './app.scss';

class App extends Component<PropsWithChildren> {
  /** 上次登录检查时间 */
  private lastLoginCheck = 0;
  /** 登录检查间隔：5分钟 */
  private readonly LOGIN_CHECK_INTERVAL = 5 * 60 * 1000;

  componentDidMount() {
    console.log('智搭衣橱 小程序启动');

    // 0. 预热设备 / 安全区信息（缓存 systemInfo，注入 H5 CSS 变量）
    try {
      const device = getDeviceInfo();
      const insets = getSafeAreaInsets();
      injectSafeAreaCssVars();
      console.log(
        `[App] 设备适配: ${device.platform}/${device.brand} ${device.model} ` +
          `tier=${device.tier} fullScreen=${device.isFullScreen} ` +
          `safeArea=top:${insets.top} bottom:${insets.bottom}`
      );
    } catch (err) {
      console.warn('[App] 设备适配初始化失败:', err);
    }

    // 1. 初始化 CloudBase SDK（用于图片上传等需要 SDK 的场景）
    initCloud()
      .then((success) => {
        if (success) {
          console.log('[App] CloudBase SDK 初始化成功');
        } else {
          console.warn('[App] CloudBase SDK 初始化失败，图片上传功能不可用');
        }
      })
      .catch((err) => {
        console.error('[App] CloudBase SDK 初始化异常:', err);
      });

    // 2. 首次启动立即执行登录（componentDidShow 不一定被触发）
    this.checkAndRefreshLogin();
  }

  componentDidShow() {
    // 小程序切前台：检查登录态
    this.checkAndRefreshLogin();
  }

  componentDidHide() {
    // 小程序切后台
  }

  /**
   * 检查登录态，过期则重新登录
   * 限流：5分钟内不重复检查
   */
  private async checkAndRefreshLogin() {
    const now = Date.now();
    if (now - this.lastLoginCheck < this.LOGIN_CHECK_INTERVAL) {
      return;
    }
    this.lastLoginCheck = now;

    // 如果已有 token，认为登录有效（token 刷新由 request() 自动处理）
    if (isLoggedIn()) {
      console.log('[App] 登录态有效');
      return;
    }

    // 未登录，执行登录流程
    console.log('[App] 未登录，开始登录流程...');
    try {
      const user = await performLogin();
      if (user) {
        console.log('[App] 登录成功:', user.nickname || `用户#${user.id}`, user.isNewUser ? '(新用户)' : '');
      } else {
        console.warn('[App] 登录失败，将以离线模式运行');
        // 清除可能存在的过期 token
        clearToken();
      }
    } catch (err) {
      console.error('[App] 登录流程异常:', err);
    }
  }

  render() {
    return this.props.children;
  }
}

export default App;
