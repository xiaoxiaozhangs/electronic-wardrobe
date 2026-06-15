export default {
  pages: [
    'pages/index/index',
    'pages/wardrobe/wardrobe',
    'pages/outfit/outfit',
    'pages/settings/settings',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: '智搭衣橱',
    navigationBarTextStyle: 'black',
  },
  // tabBar 图标待添加后启用
  // 当前使用页面内导航按钮跳转，后续替换为 PNG 图标文件即可启用底部标签栏
  /*
  tabBar: {
    color: '#9ca3af',
    selectedColor: '#f97316',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: 'assets/icons/home.png',
        selectedIconPath: 'assets/icons/home-active.png',
      },
      {
        pagePath: 'pages/wardrobe/wardrobe',
        text: '衣橱',
        iconPath: 'assets/icons/wardrobe.png',
        selectedIconPath: 'assets/icons/wardrobe-active.png',
      },
      {
        pagePath: 'pages/outfit/outfit',
        text: '搭配',
        iconPath: 'assets/icons/outfit.png',
        selectedIconPath: 'assets/icons/outfit-active.png',
      },
      {
        pagePath: 'pages/settings/settings',
        text: '我的',
        iconPath: 'assets/icons/settings.png',
        selectedIconPath: 'assets/icons/settings-active.png',
      },
    ],
  },
  */
};
