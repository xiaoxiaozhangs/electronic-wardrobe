import { View, Text, Input } from '@tarojs/components';
import { useEffect, useRef, useState } from 'react';
import styles from './ECInput.module.scss';

export interface ECInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'number' | 'idcard' | 'digit';
  password?: boolean;
  maxlength?: number;
  disabled?: boolean;
  clearable?: boolean;
  showCount?: boolean;
  errorText?: string;
  helperText?: string;
  label?: string;
  required?: boolean;
  /** 防抖时间（ms），>0 时 onChange 会被防抖；默认 0 不防抖 */
  debounce?: number;
  onBlur?: (value: string) => void;
  onFocus?: () => void;
  onConfirm?: (value: string) => void;
  className?: string;
}

export default function ECInput({
  value,
  onChange,
  placeholder = '',
  type = 'text',
  password = false,
  maxlength = 140,
  disabled = false,
  clearable = true,
  showCount = false,
  errorText = '',
  helperText = '',
  label,
  required = false,
  debounce = 0,
  onBlur,
  onFocus,
  onConfirm,
  className = '',
}: ECInputProps) {
  const [innerValue, setInnerValue] = useState(value);
  const [focused, setFocused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setInnerValue(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleInput = (e: { detail: { value: string } }) => {
    const v = e.detail.value;
    setInnerValue(v);
    if (debounce > 0) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onChange(v), debounce);
    } else {
      onChange(v);
    }
  };

  const handleClear = () => {
    setInnerValue('');
    onChange('');
  };

  const hasError = !!errorText;

  const wrapCls = [
    styles.wrap,
    focused ? styles.focused : '',
    hasError ? styles.error : '',
    disabled ? styles.disabled : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <View className={styles.field}>
      {label && (
        <View className={styles.label}>
          <Text className={styles.labelText}>{label}</Text>
          {required && <Text className={styles.required}>*</Text>}
        </View>
      )}
      <View className={wrapCls}>
        <Input
          className={styles.input}
          value={innerValue}
          type={type}
          password={password}
          placeholder={placeholder}
          placeholderClass={styles.placeholder}
          maxlength={maxlength}
          disabled={disabled}
          onInput={handleInput}
          onFocus={() => {
            setFocused(true);
            onFocus?.();
          }}
          onBlur={() => {
            setFocused(false);
            onBlur?.(innerValue);
          }}
          onConfirm={(e) => onConfirm?.(e.detail.value)}
        />
        {clearable && innerValue && !disabled && (
          <View className={styles.clearBtn} onClick={handleClear}>
            <Text className={styles.clearIcon}>✕</Text>
          </View>
        )}
      </View>
      <View className={styles.foot}>
        <Text className={hasError ? styles.errorText : styles.helperText}>
          {errorText || helperText}
        </Text>
        {showCount && (
          <Text className={styles.count}>
            {innerValue.length}/{maxlength}
          </Text>
        )}
      </View>
    </View>
  );
}
