import { View, Text } from '@tarojs/components';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { hapticLight, hapticHeavy } from '../utils/haptic';
import styles from './ECToast.module.scss';

export type ECToastType = 'success' | 'warn' | 'error' | 'info';

export interface ECToastOptions {
  message: string;
  type?: ECToastType;
  duration?: number;
}

interface ToastState extends Required<Pick<ECToastOptions, 'message' | 'type' | 'duration'>> {
  visible: boolean;
  key: number;
}

interface ToastContextValue {
  show: (opts: ECToastOptions | string) => void;
  success: (message: string, duration?: number) => void;
  warn: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  hide: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICON_MAP: Record<ECToastType, string> = {
  success: '✓',
  warn: '!',
  error: '✕',
  info: 'i',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'info',
    duration: 2000,
    key: 0,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setState((s) => ({ ...s, visible: false }));
  }, []);

  const show = useCallback((opts: ECToastOptions | string) => {
    const o: ECToastOptions = typeof opts === 'string' ? { message: opts } : opts;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // 错误/警告类型给予重震动反馈
    if (o.type === 'error') {
      hapticHeavy();
    } else if (o.type === 'warn') {
      hapticLight();
    }
    setState((s) => ({
      visible: true,
      message: o.message,
      type: o.type ?? 'info',
      duration: o.duration ?? 2000,
      key: s.key + 1,
    }));
  }, []);

  useEffect(() => {
    if (!state.visible) return;
    timerRef.current = setTimeout(() => {
      setState((s) => ({ ...s, visible: false }));
    }, state.duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state.visible, state.key, state.duration]);

  const value: ToastContextValue = {
    show,
    success: (m, d) => show({ message: m, type: 'success', duration: d }),
    warn: (m, d) => show({ message: m, type: 'warn', duration: d }),
    error: (m, d) => show({ message: m, type: 'error', duration: d }),
    info: (m, d) => show({ message: m, type: 'info', duration: d }),
    hide,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {state.visible && (
        <View className={styles.root}>
          <View className={`${styles.toast} ${styles[state.type]}`}>
            <Text className={styles.icon}>{ICON_MAP[state.type]}</Text>
            <Text className={styles.message}>{state.message}</Text>
          </View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
