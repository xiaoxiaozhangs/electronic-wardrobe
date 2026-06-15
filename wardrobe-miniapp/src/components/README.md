# 电子衣橱 - 基础组件库

Taro 4 + React 18 + TypeScript 实现的小程序基础组件库（微信小程序为主，H5 兼容）。

## 设计原则

- **组件 API 用 React 习惯**：函数组件 + Hooks，事件用 `onXxx` 回调，不用 `triggerEvent`。
- **样式走 SCSS Module**：每个组件一个 `*.module.scss`，CSS class 局部作用域。设计 token（颜色、阴影）复用 `app.scss` 内的 CSS 变量（如 `--color-primary`）。
- **交互反馈走 Taro API**：`Taro.vibrateShort()` 实现震动；按下缩放走 Taro `hoverClass` + CSS。
- **滚动穿透阻断**：Modal/ActionSheet 的遮罩层使用 Taro `<View catchMove>`。
- **无外部依赖**：仅依赖 `@tarojs/components` 和 `@tarojs/taro`，未引入额外 UI 库。

## 组件清单

| 组件        | 文件                | 说明                                        |
| ----------- | ------------------- | ------------------------------------------- |
| Button      | `ECButton.tsx`      | 三变体 / 三尺寸 / 缩放反馈 + 震动           |
| Card        | `ECCard.tsx`        | 多比例卡片，圆角 + 轻阴影，支持懒加载       |
| Input       | `ECInput.tsx`       | label / 错误态 / 防抖 / 清除 / 字数统计     |
| Modal       | `ECModal.tsx`       | Transition 动画 + mask 阻止滚动穿透         |
| Toast       | `ECToast.tsx`       | Context + Provider 单例，4 类型             |
| ActionSheet | `ECActionSheet.tsx` | 底部滑起，单/多项，安全区适配               |

---

## 1. ECButton

### Props

| 字段       | 类型                                  | 默认值      | 说明                       |
| ---------- | ------------------------------------- | ----------- | -------------------------- |
| children   | `ReactNode`                           | —           | 按钮文字 / 内容            |
| variant    | `'primary' \| 'secondary' \| 'ghost'` | `'primary'` | 变体                       |
| size       | `'large' \| 'medium' \| 'small'`      | `'medium'`  | 尺寸（56 / 44 / 32 px 高） |
| disabled   | `boolean`                             | `false`     | 禁用                       |
| loading    | `boolean`                             | `false`     | 加载中                     |
| icon       | `string`                              | —           | 左侧图标 emoji 或字符      |
| block      | `boolean`                             | `false`     | 占满父容器宽度             |
| haptic     | `boolean`                             | `true`      | 是否触发震动反馈           |
| onClick    | `() => void`                          | —           | 点击事件                   |
| className  | `string`                              | —           | 透传 class                 |
| style      | `React.CSSProperties`                 | —           | 透传 style                 |

### 用法

```tsx
import ECButton from '@/components/ECButton';

<ECButton variant="primary" size="large" onClick={handleSubmit}>
  提交
</ECButton>

<ECButton variant="secondary" loading>
  保存中
</ECButton>
```

---

## 2. ECCard

### Props

| 字段      | 类型                                | 默认值  | 说明                          |
| --------- | ----------------------------------- | ------- | ----------------------------- |
| imageSrc  | `string`                            | —       | 图片地址（传 `''` 显示占位） |
| title     | `string`                            | —       | 标题                          |
| subtitle  | `string`                            | —       | 副标题                        |
| badge     | `string`                            | —       | 左上角徽标文字                |
| ratio     | `'3:4' \| '1:1' \| '4:3' \| '16:9'` | `'3:4'` | 图片区比例                    |
| rounded   | `boolean`                           | `true`  | 圆角                          |
| shadow    | `boolean`                           | `true`  | 阴影                          |
| children  | `ReactNode`                         | —       | body 区自定义内容             |
| footer    | `ReactNode`                         | —       | 卡片底部区域                  |
| onClick   | `() => void`                        | —       | 点击事件                      |
| className | `string`                            | —       | 透传 class                    |

### 用法

```tsx
import ECCard from '@/components/ECCard';

<ECCard
  imageSrc={item.imageBase64}
  title={item.subCategory}
  subtitle={item.primaryColor}
  badge={`穿${item.wearCount}次`}
  onClick={() => navigateToDetail(item.id)}
/>
```

---

## 3. ECInput

### Props

| 字段        | 类型                                                 | 默认值   | 说明                                |
| ----------- | ---------------------------------------------------- | -------- | ----------------------------------- |
| value       | `string`                                             | —        | 受控值                              |
| onChange    | `(value: string) => void`                            | —        | 值变化（受 `debounce` 影响）        |
| placeholder | `string`                                             | `''`     | 占位                                |
| type        | `'text' \| 'number' \| 'idcard' \| 'digit'`          | `'text'` | 输入类型                            |
| password    | `boolean`                                            | `false`  | 密码模式                            |
| maxlength   | `number`                                             | `140`    | 最大字符（小写，与原生 Input 对齐） |
| disabled    | `boolean`                                            | `false`  | 禁用                                |
| clearable   | `boolean`                                            | `true`   | 显示清除按钮                        |
| showCount   | `boolean`                                            | `false`  | 显示字数统计                        |
| errorText   | `string`                                             | `''`     | 错误文案，非空时进入错误态          |
| helperText  | `string`                                             | `''`     | 辅助文案                            |
| label       | `string`                                             | —        | 顶部 label                          |
| required    | `boolean`                                            | `false`  | label 旁显示 `*`                    |
| debounce    | `number`                                             | `0`      | onChange 防抖（ms），>0 启用        |
| onBlur      | `(value: string) => void`                            | —        | 失焦                                |
| onFocus     | `() => void`                                         | —        | 获焦                                |
| onConfirm   | `(value: string) => void`                            | —        | 软键盘确认                          |

### 用法

```tsx
import ECInput from '@/components/ECInput';

<ECInput
  label="衣物名称"
  required
  value={name}
  onChange={setName}
  placeholder="请输入名称"
  maxlength={20}
  showCount
  errorText={nameError}
  debounce={300}
/>
```

---

## 4. ECModal

> 受控组件：调用方持有 `visible` state 自行控制。当前未提供 `useModal` hook。

### Props

| 字段         | 类型           | 默认值   | 说明                        |
| ------------ | -------------- | -------- | --------------------------- |
| visible      | `boolean`      | —        | 是否显示                    |
| title        | `string`       | —        | 标题                        |
| content      | `ReactNode`    | —        | 主体内容                    |
| children     | `ReactNode`    | —        | body 自定义内容（与 content 二选一） |
| confirmText  | `string`       | `'确定'` | 确认按钮文字                |
| cancelText   | `string`       | `'取消'` | 取消按钮文字                |
| showCancel   | `boolean`      | `true`   | 显示取消按钮                |
| showConfirm  | `boolean`      | `true`   | 显示确认按钮                |
| maskClosable | `boolean`      | `true`   | 点击遮罩关闭                |
| onConfirm    | `() => void`   | —        | 确认回调                    |
| onCancel     | `() => void`   | —        | 取消回调                    |
| onClose      | `() => void`   | —        | 关闭回调（确认/取消都会触发） |
| zIndex       | `number`       | `1000`   | 层级                        |

### 用法

```tsx
import { useState } from 'react';
import ECModal from '@/components/ECModal';

const [visible, setVisible] = useState(false);

<ECModal
  visible={visible}
  title="确认删除"
  content="该操作不可撤销，确定继续？"
  onConfirm={() => {
    deleteItem();
    setVisible(false);
  }}
  onCancel={() => setVisible(false)}
/>
```

---

## 5. ECToast

### 接入

在 app 根挂载一次 `ToastProvider`：

```tsx
// src/app.tsx
import { ToastProvider } from '@/components/ECToast';

class App extends Component<PropsWithChildren> {
  render() {
    return <ToastProvider>{this.props.children}</ToastProvider>;
  }
}
```

### Hook API

```tsx
import { useToast } from '@/components/ECToast';

const toast = useToast();

toast.success('已保存');
toast.warn('网络较慢', 3000);
toast.error('保存失败');
toast.info('提示信息');

// 通用入口
toast.show({ message: '自定义', type: 'success', duration: 1500 });
toast.show('快捷字符串');

toast.hide(); // 主动关闭
```

签名：

```ts
success(message: string, duration?: number): void
warn(message: string, duration?: number): void
error(message: string, duration?: number): void
info(message: string, duration?: number): void
show(opts: ECToastOptions | string): void
hide(): void
```

---

## 6. ECActionSheet

### Props

| 字段       | 类型                            | 默认值   | 说明                      |
| ---------- | ------------------------------- | -------- | ------------------------- |
| visible    | `boolean`                       | —        | 是否显示                  |
| items      | `ECActionSheetItem[]`           | —        | 菜单项                    |
| cancelText | `string`                        | `'取消'` | 取消按钮文字              |
| showCancel | `boolean`                       | `true`   | 显示取消按钮              |
| zIndex     | `number`                        | `1000`   | 层级                      |
| onSelect   | `(key: string) => void`         | —        | 选择某项的回调（传 key）  |
| onCancel   | `() => void`                    | —        | 取消 / 点击遮罩           |

### Item

```ts
interface ECActionSheetItem {
  key: string;       // 唯一 key，会传给 onSelect
  label: string;     // 文字
  danger?: boolean;  // 红色危险项
  disabled?: boolean;
  divider?: boolean; // 当前项渲染为分隔条
}
```

### 用法

```tsx
import { useState } from 'react';
import ECActionSheet from '@/components/ECActionSheet';

const [visible, setVisible] = useState(false);

<ECActionSheet
  visible={visible}
  items={[
    { key: 'edit', label: '编辑' },
    { key: 'share', label: '分享' },
    { key: 'd1', label: '', divider: true },
    { key: 'delete', label: '删除', danger: true },
  ]}
  onSelect={(key) => {
    setVisible(false);
    if (key === 'edit') openEditor();
    if (key === 'delete') confirmDelete();
  }}
  onCancel={() => setVisible(false)}
/>
```

---

## 设计 token

颜色 / 字号 / 圆角统一来自 `src/app.scss` 的 CSS 变量（`page` 选择器下声明）：

- `--color-primary` `#f97316`
- `--color-primary-dark` `#ea580c`
- `--color-text` `#111827`
- `--color-text-secondary` `#6b7280`
- `--color-text-tertiary` `#9ca3af`
- `--color-border` `#e5e7eb`
- `--color-border-light` `#f3f4f6`
- `--color-danger` `#ef4444`
- `--color-success` `#22c55e`
- `--color-warning` `#f59e0b`

组件内 `.module.scss` 用 `var(--color-primary)` 直接消费，无需重复定义。

## 触摸区域

所有可点击元素均保证最小尺寸 ≥ 44 × 44 px（微信审核规范），通过 `min-width` / `min-height` 或 padding 实现。

## 安全区

ECActionSheet 容器使用 `padding-bottom: env(safe-area-inset-bottom)` 适配全面屏。

## 单元 / 视觉验证

- 编译通过：`npm run build:weapp`
- 真机预览：在微信开发者工具中打开 `dist/` 即可
