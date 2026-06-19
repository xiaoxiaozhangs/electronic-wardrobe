/* 衣物表单 - 样式重构版 */
import styles from './ClothingForm.module.scss';
import { useState, useCallback } from 'react';
import { View, Text, Image, Input, Picker, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import type {
  WardrobeItem, Category, SubCategory, ColorLabel,
  Pattern, Thickness, Season, Scenario, Style, ItemStatus,
} from '../types';
import {
  ALL_CATEGORIES, ALL_COLORS, ALL_SEASONS, ALL_SCENARIOS, ALL_STYLES, COLOR_MAP,
} from '../types';

const SUB_CATEGORY_MAP: Record<Category, SubCategory[]> = {
  '上衣': ['T恤', '衬衫', '卫衣', '针织衫', '毛衣', '背心', '其他'],
  '下装': ['牛仔裤', '休闲裤', '西裤', '短裤', '半身裙', '长裙', '短裙', '其他'],
  '连衣裙': ['连衣长裙', '连衣短裙', '其他'],
  '外套': ['风衣', '夹克', '西装', '羽绒服', '大衣', '其他'],
  '鞋': ['运动鞋', '皮鞋', '靴子', '凉鞋', '帆布鞋', '其他'],
  '包': ['手拎包', '斜挎包', '双肩包', '其他'],
  '配饰': ['项链', '耳环', '手表', '帽子', '围巾', '腰带', '其他'],
  '其他': ['其他'],
};

const PATTERNS: Pattern[] = ['纯色', '条纹', '格纹', '印花', '拼接', '其他'];
const THICKNESSES: Thickness[] = ['薄', '中', '厚'];
const STATUSES: ItemStatus[] = ['正常', '洗涤中', '闲置', '淘汰'];

interface ClothingFormProps {
  initialData?: Partial<WardrobeItem>;
  onSubmit: (
    data: Omit<WardrobeItem, 'id' | 'createdAt' | 'updatedAt' | 'wearCount' | 'lastWornAt'>
  ) => void;
  onCancel: () => void;
}

export default function ClothingForm({ initialData, onSubmit, onCancel }: ClothingFormProps) {
  const [imageBase64, setImageBase64] = useState(initialData?.imageBase64 ?? '');
  const [category, setCategory] = useState<Category>(initialData?.category ?? '上衣');
  const [subCategory, setSubCategory] = useState<SubCategory>(initialData?.subCategory ?? 'T恤');
  const [primaryColor, setPrimaryColor] = useState<ColorLabel>(initialData?.primaryColor ?? '黑色');
  const [secondaryColors, setSecondaryColors] = useState<ColorLabel[]>(initialData?.secondaryColors ?? []);
  const [pattern, setPattern] = useState<Pattern>(initialData?.pattern ?? '纯色');
  const [thickness, setThickness] = useState<Thickness>(initialData?.thickness ?? '中');
  const [seasons, setSeasons] = useState<Season[]>(initialData?.seasons ?? ['春', '秋']);
  const [scenarios, setScenarios] = useState<Scenario[]>(initialData?.scenarios ?? ['休闲']);
  const [styles, setStyles] = useState<Style[]>(initialData?.styles ?? ['简约']);
  const [temperatureMin, setTemperatureMin] = useState(initialData?.temperatureMin ?? 10);
  const [temperatureMax, setTemperatureMax] = useState(initialData?.temperatureMax ?? 28);
  const [status, setStatus] = useState<ItemStatus>(initialData?.status ?? '正常');
  const [note, setNote] = useState(initialData?.note ?? '');

  const handleChooseImage = useCallback(() => {
    Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const filePath = res.tempFilePaths[0];
        Taro.getFileSystemManager().readFile({
          filePath,
          encoding: 'base64',
          success: (readRes) => {
            const ext = filePath.split('.').pop()?.toLowerCase() || 'jpg';
            const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
            setImageBase64(`data:${mimeType};base64,${readRes.data}`);
          },
          fail: () => {
            Taro.showToast({ title: '图片读取失败，请重试', icon: 'none' });
          },
        });
      },
    });
  }, []);

  const toggleArrayItem = <T,>(arr: T[], item: T, setter: (val: T[]) => void) => {
    if (arr.includes(item)) {
      setter(arr.filter((i) => i !== item));
    } else {
      setter([...arr, item]);
    }
  };

  const handleSubmit = () => {
    if (!imageBase64) {
      Taro.showToast({ title: '请上传衣物图片', icon: 'none' });
      return;
    }
    onSubmit({
      imageBase64,
      category,
      subCategory,
      primaryColor,
      secondaryColors,
      pattern,
      thickness,
      seasons,
      scenarios,
      styles,
      temperatureMin,
      temperatureMax,
      status,
      note,
      isFavorite: initialData?.isFavorite ?? false,
    });
  };

  return (
    <View className={styles.container}>
      {/* Image Upload */}
      <View className={styles.imageSection}>
        <Text className={styles.imageSectionLabel}>
          衣物图片 <Text className={styles.required}>*</Text>
        </Text>
        <View onClick={handleChooseImage} className={styles.imageUpload}>
          {imageBase64 ? (
            <Image src={imageBase64} mode="aspectFit" className={styles.imagePreview} />
          ) : (
            <View className={styles.imagePlaceholder}>
              <Text className={styles.imagePlaceholderIcon}>📷</Text>
              <Text className={styles.imagePlaceholderText}>点击拍照或选择图片</Text>
            </View>
          )}
        </View>
        <Text className={styles.imageHint}>支持拍照或相册选择</Text>
      </View>

      {/* Category & SubCategory */}
      <View className={`${styles.pickerRow} form-section`}>
        <View className={styles.pickerCol}>
          <Text className={styles.fieldLabel}>品类</Text>
          <Picker
            mode="selector"
            range={ALL_CATEGORIES}
            value={ALL_CATEGORIES.indexOf(category)}
            onChange={(e) => {
              const cat = ALL_CATEGORIES[Number(e.detail.value)];
              setCategory(cat);
              setSubCategory(SUB_CATEGORY_MAP[cat][0]);
            }}
          >
            <View className={styles.pickerField}><Text>{category}</Text></View>
          </Picker>
        </View>
        <View className={styles.pickerCol}>
          <Text className={styles.fieldLabel}>子品类</Text>
          <Picker
            mode="selector"
            range={SUB_CATEGORY_MAP[category]}
            value={SUB_CATEGORY_MAP[category].indexOf(subCategory)}
            onChange={(e) => setSubCategory(SUB_CATEGORY_MAP[category][Number(e.detail.value)])}
          >
            <View className={styles.pickerField}><Text>{subCategory}</Text></View>
          </Picker>
        </View>
      </View>

      {/* Primary Color */}
      <View className={styles.colorSection}>
        <Text className={styles.fieldLabel}>主色</Text>
        <View className={styles.colorGrid}>
          {ALL_COLORS.map((c) => (
            <View
              key={c}
              onClick={() => setPrimaryColor(c)}
              className={`${styles.colorOption} ${primaryColor === c ? styles.colorOptionActive : ''}`}
            >
              <View className={styles.colorSwatch}
                style={{ backgroundColor: COLOR_MAP[c] }} />
            </View>
          ))}
        </View>
      </View>

      {/* Secondary Colors */}
      <View className={styles.colorSection}>
        <Text className={styles.fieldLabel}>辅色（可选）</Text>
        <View className={styles.colorGrid}>
          {ALL_COLORS.filter((c) => c !== primaryColor).map((c) => {
            const isActive = secondaryColors.includes(c);
            return (
              <View
                key={c}
                onClick={() => toggleArrayItem(secondaryColors, c, setSecondaryColors)}
                className={`${styles.colorOptionSm} ${isActive ? styles.colorOptionSmActive : styles.colorOptionSmInactive}`}
              >
                <View className={styles.colorSwatchSm}
                  style={{ backgroundColor: COLOR_MAP[c] }} />
              </View>
            );
          })}
        </View>
      </View>

      {/* Pattern & Thickness */}
      <View className={`${styles.pickerRow} form-section`}>
        <View className={styles.pickerCol}>
          <Text className={styles.fieldLabel}>花纹</Text>
          <View className={styles.chipRow}>
            {PATTERNS.map((p) => (
              <View key={p} onClick={() => setPattern(p)}
                className={`${styles.chip} ${pattern === p ? styles.chipActive : ''}`}>
                <Text>{p}</Text>
              </View>
            ))}
          </View>
        </View>
        <View className={styles.pickerCol}>
          <Text className={styles.fieldLabel}>厚薄</Text>
          <View className={styles.chipRow}>
            {THICKNESSES.map((t) => (
              <View key={t} onClick={() => setThickness(t)}
                className={`${styles.chip} ${thickness === t ? styles.chipActive : ''}`}>
                <Text>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Seasons */}
      <View className={styles.colorSection}>
        <Text className={styles.fieldLabel}>适用季节</Text>
        <View className={styles.seasonRow}>
          {ALL_SEASONS.map((s) => (
            <View key={s} onClick={() => toggleArrayItem(seasons, s, setSeasons)}
              className={`${styles.seasonBtn} ${seasons.includes(s) ? styles.seasonBtnActive : ''}`}>
              <Text>{s}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Scenarios */}
      <View className={styles.colorSection}>
        <Text className={styles.fieldLabel}>适用场景</Text>
        <View className={styles.scenarioRow}>
          {ALL_SCENARIOS.map((s) => (
            <View key={s} onClick={() => toggleArrayItem(scenarios, s, setScenarios)}
              className={`${styles.scenarioBtn} ${scenarios.includes(s) ? styles.scenarioBtnActive : ''}`}>
              <Text>{s}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Styles */}
      <View className={styles.colorSection}>
        <Text className={styles.fieldLabel}>风格</Text>
        <View className={styles.styleRow}>
          {ALL_STYLES.map((s) => (
            <View key={s} onClick={() => toggleArrayItem(styles, s, setStyles)}
              className={`${styles.styleBtn} ${styles.includes(s) ? styles.styleBtnActive : ''}`}>
              <Text>{s}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Temperature Range */}
      <View className={styles.colorSection}>
        <Text className={styles.fieldLabel}>
          适合温度区间：{temperatureMin}°C — {temperatureMax}°C
        </Text>
        <View className={styles.tempRow}>
          <Input
            className={styles.tempInput}
            type="number"
            value={String(temperatureMin)}
            onInput={(e) => {
              const v = Number(e.detail.value);
              setTemperatureMin(Math.min(v, temperatureMax));
            }}
          />
          <Text className={styles.tempSeparator}>至</Text>
          <Input
            className={styles.tempInput}
            type="number"
            value={String(temperatureMax)}
            onInput={(e) => {
              const v = Number(e.detail.value);
              setTemperatureMax(Math.max(v, temperatureMin));
            }}
          />
        </View>
      </View>

      {/* Status */}
      <View className={styles.colorSection}>
        <Text className={styles.fieldLabel}>状态</Text>
        <View className={styles.statusRow}>
          {STATUSES.map((s) => (
            <View key={s} onClick={() => setStatus(s)}
              className={`${styles.statusBtn} ${status === s ? styles.statusBtnActive : ''}`}>
              <Text>{s}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Note */}
      <View style={{ marginBottom: '32px' }}>
        <Text className={styles.fieldLabel}>备注</Text>
        <Textarea
          className={styles.textarea}
          value={note}
          onInput={(e) => setNote(e.detail.value)}
          placeholder="例如：优衣库购入、适合通勤..."
          placeholderStyle="color: #94A3B8; font-size: 24px"
          maxlength={200}
        />
      </View>

      {/* Buttons */}
      <View className={styles.actions}>
        <View className={`btn-outline ${styles.actionBtn}`} onClick={onCancel}>
          取消
        </View>
        <View className={`btn-primary ${styles.actionBtn}`} onClick={handleSubmit}>
          保存衣物
        </View>
      </View>
    </View>
  );
}
