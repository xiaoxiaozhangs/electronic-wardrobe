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

// ---- 子品类映射 ----
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

  // 图片选择
  const handleChooseImage = useCallback(() => {
    Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const filePath = res.tempFilePaths[0];
        // 读取为 Base64
        Taro.getFileSystemManager().readFile({
          filePath,
          encoding: 'base64',
          success: (readRes) => {
            const ext = filePath.split('.').pop()?.toLowerCase() || 'jpg';
            const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
            setImageBase64(`data:${mimeType};base64,${readRes.data}`);
          },
          fail: () => {
            // 如果读取失败，临时使用文件路径
            Taro.showToast({ title: '图片读取失败，请重试', icon: 'none' });
          },
        });
      },
    });
  }, []);

  // 多选切换
  const toggleArrayItem = <T,>(arr: T[], item: T, setter: (val: T[]) => void) => {
    if (arr.includes(item)) {
      setter(arr.filter((i) => i !== item));
    } else {
      setter([...arr, item]);
    }
  };

  // 提交
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
    <View style={{ padding: '0 0 120px' }}>
      {/* Image Upload */}
      <View style={{ marginBottom: '32px' }}>
        <Text style={{ fontSize: '28px', fontWeight: 500, color: '#374151', marginBottom: '16px', display: 'block' }}>
          衣物图片 <Text style={{ color: '#ef4444' }}>*</Text>
        </Text>
        <View
          onClick={handleChooseImage}
          style={{
            width: '100%', aspectRatio: '1', borderRadius: '20px',
            border: '2px dashed #d1d5db', backgroundColor: '#f9fafb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {imageBase64 ? (
            <Image src={imageBase64} mode="aspectFit" style={{ width: '100%', height: '100%' }} />
          ) : (
            <View style={{ textAlign: 'center', color: '#9ca3af' }}>
              <Text style={{ fontSize: '64px', display: 'block', marginBottom: '12px' }}>📷</Text>
              <Text style={{ fontSize: '26px', display: 'block' }}>点击拍照或选择图片</Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: '22px', color: '#9ca3af', marginTop: '8px', display: 'block' }}>
          支持拍照或相册选择
        </Text>
      </View>

      {/* Category & SubCategory */}
      <View style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <View style={{ flex: 1 }}>
          <Text style={labelStyle}>品类</Text>
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
            <View style={pickerStyle}><Text>{category}</Text></View>
          </Picker>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={labelStyle}>子品类</Text>
          <Picker
            mode="selector"
            range={SUB_CATEGORY_MAP[category]}
            value={SUB_CATEGORY_MAP[category].indexOf(subCategory)}
            onChange={(e) => setSubCategory(SUB_CATEGORY_MAP[category][Number(e.detail.value)])}
          >
            <View style={pickerStyle}><Text>{subCategory}</Text></View>
          </Picker>
        </View>
      </View>

      {/* Primary Color */}
      <View style={{ marginBottom: '24px' }}>
        <Text style={labelStyle}>主色</Text>
        <View style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {ALL_COLORS.map((c) => (
            <View
              key={c}
              onClick={() => setPrimaryColor(c)}
              style={{
                width: '56px', height: '56px', borderRadius: '50%',
                border: primaryColor === c ? '3px solid #f97316' : '2px solid #e5e7eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transform: primaryColor === c ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              <View style={{
                width: '40px', height: '40px', borderRadius: '50%',
                backgroundColor: COLOR_MAP[c],
              }} />
            </View>
          ))}
        </View>
      </View>

      {/* Secondary Colors */}
      <View style={{ marginBottom: '24px' }}>
        <Text style={labelStyle}>辅色（可选）</Text>
        <View style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {ALL_COLORS.filter((c) => c !== primaryColor).map((c) => (
            <View
              key={c}
              onClick={() => toggleArrayItem(secondaryColors, c, setSecondaryColors)}
              style={{
                width: '48px', height: '48px', borderRadius: '50%',
                border: secondaryColors.includes(c) ? '3px solid #f97316' : '2px solid #e5e7eb',
                opacity: secondaryColors.includes(c) ? 1 : 0.5,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <View style={{
                width: '34px', height: '34px', borderRadius: '50%',
                backgroundColor: COLOR_MAP[c],
              }} />
            </View>
          ))}
        </View>
      </View>

      {/* Pattern & Thickness */}
      <View style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <View style={{ flex: 1 }}>
          <Text style={labelStyle}>花纹</Text>
          <View style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {PATTERNS.map((p) => (
              <View key={p} onClick={() => setPattern(p)}
                style={chipStyle(pattern === p)}>
                <Text style={{ fontSize: '22px' }}>{p}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={labelStyle}>厚薄</Text>
          <View style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {THICKNESSES.map((t) => (
              <View key={t} onClick={() => setThickness(t)}
                style={chipStyle(thickness === t)}>
                <Text style={{ fontSize: '22px' }}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Seasons */}
      <View style={{ marginBottom: '24px' }}>
        <Text style={labelStyle}>适用季节</Text>
        <View style={{ display: 'flex', gap: '12px' }}>
          {ALL_SEASONS.map((s) => (
            <View key={s} onClick={() => toggleArrayItem(seasons, s, setSeasons)}
              style={{
                padding: '12px 24px', borderRadius: '24px',
                backgroundColor: seasons.includes(s) ? '#3b82f6' : '#f3f4f6',
                color: seasons.includes(s) ? '#fff' : '#6b7280',
                fontSize: '26px', fontWeight: 500,
              }}>
              <Text>{s}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Scenarios */}
      <View style={{ marginBottom: '24px' }}>
        <Text style={labelStyle}>适用场景</Text>
        <View style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {ALL_SCENARIOS.map((s) => (
            <View key={s} onClick={() => toggleArrayItem(scenarios, s, setScenarios)}
              style={{
                padding: '10px 18px', borderRadius: '20px',
                backgroundColor: scenarios.includes(s) ? '#22c55e' : '#f3f4f6',
                color: scenarios.includes(s) ? '#fff' : '#6b7280',
                fontSize: '24px', fontWeight: 500,
              }}>
              <Text>{s}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Styles */}
      <View style={{ marginBottom: '24px' }}>
        <Text style={labelStyle}>风格</Text>
        <View style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {ALL_STYLES.map((s) => (
            <View key={s} onClick={() => toggleArrayItem(styles, s, setStyles)}
              style={{
                padding: '10px 18px', borderRadius: '20px',
                backgroundColor: styles.includes(s) ? '#8b5cf6' : '#f3f4f6',
                color: styles.includes(s) ? '#fff' : '#6b7280',
                fontSize: '24px', fontWeight: 500,
              }}>
              <Text>{s}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Temperature Range */}
      <View style={{ marginBottom: '24px' }}>
        <Text style={labelStyle}>
          适合温度区间：{temperatureMin}°C — {temperatureMax}°C
        </Text>
        <View style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '12px' }}>
          <Input
            style={{ flex: 1, height: '64px', backgroundColor: '#f3f4f6', borderRadius: '12px', padding: '0 16px', fontSize: '28px', textAlign: 'center' }}
            type="number"
            value={String(temperatureMin)}
            onInput={(e) => {
              const v = Number(e.detail.value);
              setTemperatureMin(Math.min(v, temperatureMax));
            }}
          />
          <Text style={{ fontSize: '24px', color: '#9ca3af' }}>至</Text>
          <Input
            style={{ flex: 1, height: '64px', backgroundColor: '#f3f4f6', borderRadius: '12px', padding: '0 16px', fontSize: '28px', textAlign: 'center' }}
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
      <View style={{ marginBottom: '24px' }}>
        <Text style={labelStyle}>状态</Text>
        <View style={{ display: 'flex', gap: '12px' }}>
          {STATUSES.map((s) => (
            <View key={s} onClick={() => setStatus(s)}
              style={{
                padding: '10px 20px', borderRadius: '20px',
                backgroundColor: status === s ? '#1f2937' : '#f3f4f6',
                color: status === s ? '#fff' : '#6b7280',
                fontSize: '24px', fontWeight: 500,
              }}>
              <Text>{s}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Note */}
      <View style={{ marginBottom: '32px' }}>
        <Text style={labelStyle}>备注</Text>
        <Textarea
          style={{
            width: '100%', minHeight: '100px', backgroundColor: '#f3f4f6',
            borderRadius: '12px', padding: '16px', fontSize: '26px',
            boxSizing: 'border-box',
          }}
          value={note}
          onInput={(e) => setNote(e.detail.value)}
          placeholder="例如：优衣库购入、适合通勤..."
          placeholderStyle="color: #9ca3af; font-size: 24px"
          maxlength={200}
        />
      </View>

      {/* Buttons */}
      <View style={{ display: 'flex', gap: '16px', paddingTop: '24px', borderTop: '1px solid #f3f4f6' }}>
        <View className="btn-outline" style={{ flex: 1 }} onClick={onCancel}>
          取消
        </View>
        <View className="btn-primary" style={{ flex: 1 }} onClick={handleSubmit}>
          保存衣物
        </View>
      </View>
    </View>
  );
}

// -- 样式常量 --
const labelStyle: React.CSSProperties = {
  fontSize: '28px', fontWeight: 500, color: '#374151',
  marginBottom: '12px', display: 'block',
};

const pickerStyle: React.CSSProperties = {
  padding: '16px 20px',
  backgroundColor: '#f3f4f6',
  borderRadius: '12px',
  fontSize: '28px',
  color: '#374151',
};

const chipStyle = (active: boolean): React.CSSProperties => ({
  padding: '8px 16px',
  borderRadius: '20px',
  backgroundColor: active ? '#f97316' : '#f3f4f6',
  color: active ? '#fff' : '#6b7280',
});
