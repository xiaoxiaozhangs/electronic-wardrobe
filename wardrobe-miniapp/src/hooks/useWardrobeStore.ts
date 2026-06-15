/**
 * ============================================================
 * 衣橱数据管理 Hook（Taro 版本）
 *
 * 数据策略：CloudBase API 优先 → localStorage 降级
 *  - 已登录且有网络：通过 HTTP API 读写 CloudBase
 *  - 未登录或网络异常：自动降级为 localStorage
 *  - UI 操作立即更新本地状态，API 调用异步执行
 *  - 登录成功后自动重新加载云端数据
 * ============================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { WardrobeItem, WardrobeFilter, Outfit, OutfitGenerateParams, Feedback } from '../types';
import { SAMPLE_ITEMS, generateSampleOutfits } from '../data/sampleData';
import { generateOutfits } from '../engine/outfitEngine';
import {
  // API 函数
  isLoggedIn,
  getToken,
  apiGetItems,
  apiGetCategories,
  apiAddItem,
  apiUpdateItem,
  apiDeleteItem,
  apiGetOutfits,
  apiGenerateOutfits,
  apiGetOutfitTask,
  apiOutfitFeedback,
  apiItemToWardrobeItem,
  apiOutfitToOutfit,
  buildCategoryMaps,
  uploadImage,
  uploadBase64Image,
  wardrobeItemToCreateData,
  // 本地存储降级
  localGetItems,
  localSetItems,
  localGetOutfits,
  localSetOutfits,
  localIsInitialized,
  localSetInitialized,
  localClearAll,
} from '../cloud';
import type { OutfitApiItem } from '../cloud';

// ---- 辅助函数 ----
function generateLocalId(): string {
  // 改为有限长度纯数字以保证兼容性（用于与云端 ID 格式对齐）
  return `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * 从云端加载数据，失败时降级到本地
 */
async function loadFromCloud(): Promise<{ items: WardrobeItem[]; outfits: Outfit[] } | null> {
  try {
    // 先加载品类字典（用于 ID 映射）
    const categories = await apiGetCategories();
    if (categories && categories.length > 0) {
      buildCategoryMaps(categories);
    }

    const itemsData = await apiGetItems({ page: 1, pageSize: 100 });
    const outfitsData = await apiGetOutfits({ page: 1, pageSize: 100 });

    if (itemsData && outfitsData) {
      const items = (itemsData.list || []).map(apiItemToWardrobeItem);
      const outfits = (outfitsData.list || []).map(apiOutfitToOutfit);

      // 同步到本地存储作为缓存
      localSetItems(items);
      localSetOutfits(outfits);
      localSetInitialized();

      console.log(`[Store] 从云端加载: ${items.length} 件衣物, ${outfits.length} 套搭配`);
      return { items, outfits };
    }
  } catch (err) {
    console.warn('[Store] 云端加载失败，降级到本地存储:', err);
  }
  return null;
}

/**
 * 初始化本地数据（含示例数据）
 */
function initializeLocalData(): { items: WardrobeItem[]; outfits: Outfit[] } {
  if (localIsInitialized()) {
    return {
      items: localGetItems(),
      outfits: localGetOutfits(),
    };
  }

  const now = new Date().toISOString();
  const items: WardrobeItem[] = SAMPLE_ITEMS.map((item) => ({
    ...item,
    id: generateLocalId(),
    createdAt: now,
    updatedAt: now,
  }));

  const sampleOutfits = generateSampleOutfits(items);
  const outfits: Outfit[] = sampleOutfits.map((o) => ({
    ...o,
    id: generateLocalId(),
    createdAt: now,
  }));

  localSetItems(items);
  localSetOutfits(outfits);
  localSetInitialized();

  return { items, outfits };
}

export function useWardrobeStore() {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlineMode, setOnlineMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 记录初始化时的 login token — 登录变化时重载
  const tokenRef = useRef(getToken());
  const loadingRef = useRef(false);

  useEffect(() => {
    initStore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 监听 isLoggedIn 变化 — 登录成功后重新从云端加载
  useEffect(() => {
    const interval = setInterval(() => {
      const currentToken = getToken();
      if (currentToken && currentToken !== tokenRef.current && !loadingRef.current) {
        tokenRef.current = currentToken;
        console.log('[Store] 检测到登录状态变化，重新加载云端数据...');
        initStore();
      }
    }, 2000); // 2秒轮询检测登录状态变化
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function initStore() {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    const loggedIn = isLoggedIn();

    if (loggedIn) {
      const cloudData = await loadFromCloud();
      if (cloudData) {
        setItems(cloudData.items);
        setOutfits(cloudData.outfits);
        setOnlineMode(true);
        setLoading(false);
        loadingRef.current = false;
        return;
      }
      console.warn('[Store] 云端不可用，使用本地数据');
    }

    // 未登录或云端不可用：使用本地数据
    const localData = initializeLocalData();
    setItems(localData.items);
    setOutfits(localData.outfits);
    setOnlineMode(false);
    setLoading(false);
    loadingRef.current = false;
  }

  /**
   * 刷新 Store 数据（可供外部调用）
   */
  const reinitialize = useCallback(async () => {
    await initStore();
  }, []);

  // ---- Items CRUD ----

  const addItem = useCallback(
    async (
      data: Omit<WardrobeItem, 'id' | 'createdAt' | 'updatedAt' | 'wearCount' | 'lastWornAt'> & {
        imagePath?: string;
      }
    ): Promise<WardrobeItem | null> => {
      const now = new Date().toISOString();
      const localId = generateLocalId();

      let imageFileId = '';
      let imageBase64 = data.imageBase64 || '';

      // 如果有相册选择图片，直接上传文件路径
      if (data.imagePath) {
        try {
          imageFileId = await uploadImage(data.imagePath);
          console.log('[Store] 图片上传成功:', imageFileId);
        } catch (uploadErr) {
          console.warn('[Store] 文件上传失败:', uploadErr);
        }
      }

      // 如果有 Base64 图片且还没有 fileID（相册图片也不需要再上传），尝试上传到云存储
      if (!imageFileId && imageBase64 && onlineMode) {
        try {
          imageFileId = await uploadBase64Image(imageBase64);
          console.log('[Store] Base64 图片上传到云存储成功:', imageFileId);
        } catch (uploadErr) {
          console.warn('[Store] Base64 上传失败，保留本地 Base64:', uploadErr);
        }
      }

      const newItem: WardrobeItem = {
        ...data,
        id: localId,
        imageBase64: imageFileId || imageBase64,
        wearCount: 0,
        lastWornAt: null,
        createdAt: now,
        updatedAt: now,
      };

      // 立即更新本地状态
      setItems((prev) => {
        const next = [newItem, ...prev];
        localSetItems(next);
        return next;
      });

      // 异步同步到云端
      if (onlineMode) {
        try {
          // 如果没有上传成功，用 base64 数据作为图片（不强制上传到云存储）
          const fileIdForApi = imageFileId;
          if (!fileIdForApi) {
            // 没有 fileID，只保存到本地，不同步云端
            console.log('[Store] 无云存储文件ID，仅保存到本地');
            return newItem;
          }
          const createData = wardrobeItemToCreateData({
            ...data,
            imageBase64: '',
            imageFileId: fileIdForApi,
          });

          const result = await apiAddItem(createData);

          if (result && result.id) {
            // 用云端 ID 替换本地 ID
            setItems((prev) => {
              const next = prev.map((item) =>
                item.id === localId ? { ...item, id: result.id, updatedAt: now } : item
              );
              localSetItems(next);
              return next;
            });
          } else {
            setError('云端创建失败，数据仅保存到本地');
          }
        } catch (apiErr) {
          console.warn('[Store] 云端创建失败，数据仅保存在本地:', apiErr);
          setError('网络异常，数据已保存到本地，联网后将自动同步');
        }
      }

      return newItem;
    },
    [onlineMode]
  );

  const updateItem = useCallback(
    async (id: string, updates: Partial<WardrobeItem>) => {
      const now = new Date().toISOString();

      let prevItem: WardrobeItem | undefined;

      // 立即更新本地状态
      setItems((prev) => {
        prevItem = prev.find((item) => item.id === id);
        const next = prev.map((item) =>
          item.id === id ? { ...item, ...updates, updatedAt: now } : item
        );
        localSetItems(next);
        return next;
      });

      // 异步同步到云端
      if (onlineMode && !id.startsWith('local_')) {
        try {
          await apiUpdateItem(id, {
            primaryColor: updates.primaryColor,
            pattern: updates.pattern,
            thickness: updates.thickness,
            seasons: updates.seasons,
            scenarios: updates.scenarios,
            styles: updates.styles,
            temperatureMin: updates.temperatureMin,
            temperatureMax: updates.temperatureMax,
            status: updates.status,
            isFavorite: updates.isFavorite,
            note: updates.note,
          });
        } catch (apiErr) {
          console.warn('[Store] 云端更新失败:', apiErr);
          setError('网络异常，更新可能未同步到云端');
        }
      }
    },
    [onlineMode]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      // 立即更新本地状态
      setItems((prev) => {
        const next = prev.filter((item) => item.id !== id);
        localSetItems(next);
        return next;
      });
      setOutfits((prev) => {
        const next = prev.map((o) => ({
          ...o,
          itemIds: o.itemIds.filter((iid) => iid !== id),
        }));
        localSetOutfits(next);
        return next;
      });

      // 异步同步到云端
      if (onlineMode && !id.startsWith('local_')) {
        try {
          await apiDeleteItem(id);
        } catch (apiErr) {
          console.warn('[Store] 云端删除失败:', apiErr);
        }
      }
    },
    [onlineMode]
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      setItems((prev) => {
        const item = prev.find((i) => i.id === id);
        const newFavorite = item ? !item.isFavorite : false;
        const next = prev.map((item) =>
          item.id === id
            ? { ...item, isFavorite: newFavorite, updatedAt: new Date().toISOString() }
            : item
        );
        localSetItems(next);
        return next;
      });

      // 异步同步到云端
      if (onlineMode && !id.startsWith('local_')) {
        apiUpdateItem(id, {}).catch((err) =>
          console.warn('[Store] 云端收藏更新失败:', err)
        );
      }
    },
    [onlineMode]
  );

  const incrementWearCount = useCallback((id: string) => {
    const now = new Date().toISOString();
    setItems((prev) => {
      const next = prev.map((item) =>
        item.id === id
          ? {
              ...item,
              wearCount: item.wearCount + 1,
              lastWornAt: now,
              updatedAt: now,
            }
          : item
      );
      localSetItems(next);
      return next;
    });
  }, []);

  // ---- Outfits ----

  const generateAndSaveOutfits = useCallback(
    async (params: OutfitGenerateParams): Promise<Outfit[]> => {
      // 如果在线，尝试云端生成
      if (onlineMode) {
        try {
          const task = await apiGenerateOutfits({
            scenario: params.scenario,
            season: params.season,
            style: params.style,
            mustIncludeItemId: params.mustIncludeItemId || undefined,
            excludeItemIds: params.excludeItemIds || [],
            count: 4,
          });

          if (task) {
            // 轮询等待结果（最多 15 次，每次 1 秒）
            for (let i = 0; i < 15; i++) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
              const result = await apiGetOutfitTask(task.taskId);
              if (!result) break;

              if (result.status === 'completed' && result.outfits) {
                const now = new Date().toISOString();
                const newOutfits: Outfit[] = result.outfits.map((o: OutfitApiItem) => ({
                  ...apiOutfitToOutfit(o),
                  createdAt: now,
                }));

                setOutfits((prev) => {
                  const next = [...newOutfits, ...prev];
                  localSetOutfits(next);
                  return next;
                });

                return newOutfits;
              }

              if (result.status === 'failed') {
                console.warn('[Store] 云端搭配生成失败:', result.errorMessage);
                break;
              }
            }
          }
        } catch (apiErr) {
          console.warn('[Store] 云端搭配生成异常，降级到本地引擎:', apiErr);
        }
      }

      // 本地引擎生成（离线降级）
      const now = new Date().toISOString();
      const results = generateOutfits(items, {
        ...params,
        scenario: params.scenario,
        season: params.season,
        style: params.style,
        mustIncludeItemId: params.mustIncludeItemId,
        excludeItemIds: params.excludeItemIds,
      });
      const newOutfits: Outfit[] = results.map((r) => ({
        ...r,
        id: generateLocalId(),
        isFavorite: false,
        feedback: null,
        createdAt: now,
      }));

      setOutfits((prev) => {
        const next = [...newOutfits, ...prev];
        localSetOutfits(next);
        return next;
      });

      return newOutfits;
    },
    [items, onlineMode]
  );

  const toggleOutfitFavorite = useCallback(
    (id: string) => {
      setOutfits((prev) => {
        const next = prev.map((o) =>
          o.id === id ? { ...o, isFavorite: !o.isFavorite } : o
        );
        localSetOutfits(next);
        return next;
      });

      // 同步到云端
      if (onlineMode && !id.startsWith('local_')) {
        apiOutfitFeedback(id, '').catch((err) =>
          console.warn('[Store] 云端搭配收藏更新失败:', err)
        );
      }
    },
    [onlineMode]
  );

  const setOutfitFeedback = useCallback(
    (id: string, feedback: Feedback) => {
      setOutfits((prev) => {
        const next = prev.map((o) =>
          o.id === id ? { ...o, feedback } : o
        );
        localSetOutfits(next);
        return next;
      });

      if (onlineMode && !id.startsWith('local_')) {
        apiOutfitFeedback(id, feedback).catch((err) =>
          console.warn('[Store] 云端反馈更新失败:', err)
        );
      }
    },
    [onlineMode]
  );

  const deleteOutfit = useCallback(
    (id: string) => {
      setOutfits((prev) => {
        const next = prev.filter((o) => o.id !== id);
        localSetOutfits(next);
        return next;
      });
      // API 设计中无 DELETE /outfits/{id}，仅本地生效
    },
    []
  );

  // ---- Reset ----
  const resetAllData = useCallback(() => {
    localClearAll();
    const localData = initializeLocalData();
    setItems(localData.items);
    setOutfits(localData.outfits);
    setError(null);
  }, []);

  // ---- Stats ----
  const getStats = useCallback(() => {
    const available = items.filter((i) => i.status === '正常');
    const byCategory: Record<string, number> = {};
    available.forEach((i) => {
      byCategory[i.category] = (byCategory[i.category] || 0) + 1;
    });

    return {
      total: available.length,
      favorites: available.filter((i) => i.isFavorite).length,
      byCategory,
      totalOutfits: outfits.length,
      favoriteOutfits: outfits.filter((o) => o.isFavorite).length,
    };
  }, [items, outfits]);

  return {
    items,
    outfits,
    loading,
    onlineMode,
    error,
    addItem,
    updateItem,
    deleteItem,
    toggleFavorite,
    incrementWearCount,
    generateAndSaveOutfits,
    toggleOutfitFavorite,
    setOutfitFeedback,
    deleteOutfit,
    resetAllData,
    getStats,
    reinitialize,
  };
}
