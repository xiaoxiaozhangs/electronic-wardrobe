import { useState, useEffect, useCallback } from "react";
import type {
  WardrobeItem,
  Outfit,
  WardrobeFilter,
  OutfitGenerateParams,
  Feedback,
} from "../types";
import { SAMPLE_ITEMS, generateSampleOutfits } from "../data/sampleData";
import { generateOutfits } from "../engine/outfitEngine";

// ---- localStorage keys ----
const STORAGE_KEY_ITEMS = "ew_items";
const STORAGE_KEY_OUTFITS = "ew_outfits";
const STORAGE_KEY_INIT = "ew_initialized";

// ---- Helpers ----
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // corrupted data — fall through
  }
  return fallback;
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Failed to save to localStorage (${key}):`, e);
  }
}

/**
 * 初始化示例数据（仅首次）
 */
function initializeData(): { items: WardrobeItem[]; outfits: Outfit[] } {
  const alreadyInitialized = localStorage.getItem(STORAGE_KEY_INIT);
  if (alreadyInitialized) {
    return {
      items: loadFromStorage<WardrobeItem[]>(STORAGE_KEY_ITEMS, []),
      outfits: loadFromStorage<Outfit[]>(STORAGE_KEY_OUTFITS, []),
    };
  }

  const now = new Date().toISOString();
  const items: WardrobeItem[] = SAMPLE_ITEMS.map((item) => ({
    ...item,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  }));

  const sampleOutfits = generateSampleOutfits(items);
  const outfits: Outfit[] = sampleOutfits.map((o) => ({
    ...o,
    id: generateId(),
    createdAt: now,
  }));

  saveToStorage(STORAGE_KEY_ITEMS, items);
  saveToStorage(STORAGE_KEY_OUTFITS, outfits);
  localStorage.setItem(STORAGE_KEY_INIT, "true");

  return { items, outfits };
}

// ---- Hook ----
export function useWardrobeStore() {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize
  useEffect(() => {
    const { items: initItems, outfits: initOutfits } = initializeData();
    setItems(initItems);
    setOutfits(initOutfits);
    setLoading(false);
  }, []);

  // ---- Items CRUD ----

  const addItem = useCallback(
    (data: Omit<WardrobeItem, "id" | "createdAt" | "updatedAt" | "wearCount" | "lastWornAt">) => {
      const now = new Date().toISOString();
      const newItem: WardrobeItem = {
        ...data,
        id: generateId(),
        wearCount: 0,
        lastWornAt: null,
        createdAt: now,
        updatedAt: now,
      };
      setItems((prev) => {
        const next = [newItem, ...prev];
        saveToStorage(STORAGE_KEY_ITEMS, next);
        return next;
      });
      return newItem;
    },
    []
  );

  const updateItem = useCallback(
    (id: string, updates: Partial<WardrobeItem>) => {
      setItems((prev) => {
        const next = prev.map((item) =>
          item.id === id
            ? { ...item, ...updates, updatedAt: new Date().toISOString() }
            : item
        );
        saveToStorage(STORAGE_KEY_ITEMS, next);
        return next;
      });
    },
    []
  );

  const deleteItem = useCallback(
    (id: string) => {
      setItems((prev) => {
        const next = prev.filter((item) => item.id !== id);
        saveToStorage(STORAGE_KEY_ITEMS, next);
        return next;
      });
      // Also remove from outfits
      setOutfits((prev) => {
        const next = prev.map((o) => ({
          ...o,
          itemIds: o.itemIds.filter((iid) => iid !== id),
        }));
        saveToStorage(STORAGE_KEY_OUTFITS, next);
        return next;
      });
    },
    []
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      setItems((prev) => {
        const next = prev.map((item) =>
          item.id === id ? { ...item, isFavorite: !item.isFavorite, updatedAt: new Date().toISOString() } : item
        );
        saveToStorage(STORAGE_KEY_ITEMS, next);
        return next;
      });
    },
    []
  );

  const incrementWearCount = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.map((item) =>
        item.id === id
          ? {
              ...item,
              wearCount: item.wearCount + 1,
              lastWornAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : item
      );
      saveToStorage(STORAGE_KEY_ITEMS, next);
      return next;
    });
  }, []);

  // ---- Outfits ----

  const generateAndSaveOutfits = useCallback(
    (params: OutfitGenerateParams): Outfit[] => {
      const now = new Date().toISOString();
      const results = generateOutfits(items, params);
      const newOutfits: Outfit[] = results.map((r) => ({
        ...r,
        id: generateId(),
        isFavorite: false,
        feedback: null,
        createdAt: now,
      }));

      setOutfits((prev) => {
        const next = [...newOutfits, ...prev];
        saveToStorage(STORAGE_KEY_OUTFITS, next);
        return next;
      });

      return newOutfits;
    },
    [items]
  );

  const toggleOutfitFavorite = useCallback((id: string) => {
    setOutfits((prev) => {
      const next = prev.map((o) =>
        o.id === id ? { ...o, isFavorite: !o.isFavorite } : o
      );
      saveToStorage(STORAGE_KEY_OUTFITS, next);
      return next;
    });
  }, []);

  const setOutfitFeedback = useCallback((id: string, feedback: Feedback) => {
    setOutfits((prev) => {
      const next = prev.map((o) =>
        o.id === id ? { ...o, feedback } : o
      );
      saveToStorage(STORAGE_KEY_OUTFITS, next);
      return next;
    });
  }, []);

  const deleteOutfit = useCallback((id: string) => {
    setOutfits((prev) => {
      const next = prev.filter((o) => o.id !== id);
      saveToStorage(STORAGE_KEY_OUTFITS, next);
      return next;
    });
  }, []);

  // ---- Reset (clear all data) ----
  const resetAllData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_ITEMS);
    localStorage.removeItem(STORAGE_KEY_OUTFITS);
    localStorage.removeItem(STORAGE_KEY_INIT);
    const { items: initItems, outfits: initOutfits } = initializeData();
    setItems(initItems);
    setOutfits(initOutfits);
  }, []);

  // ---- Stats ----
  const getStats = useCallback(() => {
    const available = items.filter((i) => i.status === "正常");
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
  };
}
