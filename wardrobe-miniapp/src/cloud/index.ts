/**
 * ============================================================
 * CloudBase 云开发封装 — HTTP API 模式
 *
 * 按 backend/api-design.md 第6节规范实现：
 *  - JWT 鉴权（Authorization: Bearer <token>）
 *  - 通用 request() 封装
 *  - 所有业务接口通过 HTTP API 调用云函数
 *  - CloudBase SDK 仅用于图片上传（uploadImage / getTempFileURL）
 *  - localStorage 作为离线降级方案
 * ============================================================
 */

import Taro from '@tarojs/taro';
import type {
  WardrobeItem,
  Outfit,
  Category,
  SubCategory,
  ColorLabel,
  Pattern,
  Thickness,
  Season,
  Scenario,
  Style,
  ItemStatus,
  Feedback,
} from '../types';

// ============================================================
// 配置
// ============================================================
const CLOUDBASE_ENV_ID = 'cloud1-d4g6cb3nyf821a7a0';
/**
 * 后端实际部署的 Base URL
 * categories/tags 无鉴权可用，其余需 Bearer token
 */
const BASE_URL = `https://cloud1-d4g6cb3nyf821a7a0-1423744402.ap-shanghai.app.tcloudbase.com/api/v1`;
const TOKEN_KEY = 'ew_token';
const REFRESH_TOKEN_KEY = 'ew_refresh_token';
const USER_KEY = 'ew_user';

// ============================================================
// CloudBase SDK 初始化（仅用于图片上传）
// ============================================================
let cloudInited = false;

export async function initCloud(): Promise<boolean> {
  if (!CLOUDBASE_ENV_ID) {
    console.warn('[CloudBase] 未配置环境 ID');
    return false;
  }

  try {
    if (Taro.cloud) {
      await Taro.cloud.init({
        env: CLOUDBASE_ENV_ID,
        traceUser: true,
      });
      cloudInited = true;
      console.log('[CloudBase] SDK 初始化成功，环境:', CLOUDBASE_ENV_ID);
      return true;
    }
  } catch (err) {
    console.error('[CloudBase] SDK 初始化失败:', err);
  }
  return false;
}

export function isCloudReady(): boolean {
  return cloudInited;
}

// ============================================================
// JWT Token 管理
// ============================================================
export function getToken(): string {
  try {
    return Taro.getStorageSync(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setToken(token: string): void {
  Taro.setStorageSync(TOKEN_KEY, token);
}

export function getRefreshToken(): string {
  try {
    return Taro.getStorageSync(REFRESH_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setRefreshToken(token: string): void {
  Taro.setStorageSync(REFRESH_TOKEN_KEY, token);
}

export function clearToken(): void {
  Taro.removeStorageSync(TOKEN_KEY);
  Taro.removeStorageSync(REFRESH_TOKEN_KEY);
  Taro.removeStorageSync(USER_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

// ============================================================
// 通用 HTTP 请求封装
// ============================================================

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  header?: Record<string, string>;
  /** 是否需要鉴权，默认 true（除登录接口外） */
  auth?: boolean;
}

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  requestId?: string;
}

/**
 * 通用请求函数
 * 自动带 JWT Header，统一错误处理，请求追踪 ID
 */
export async function request<T = any>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', data, header = {}, auth = true } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Request-ID': `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
    ...header,
  };

  if (auth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    const res = await Taro.request({
      url: `${BASE_URL}${path}`,
      method: method as any,
      header: headers,
      data: data,
      timeout: 15000,
    });

    if (res.statusCode === 200) {
      const body = res.data as ApiResponse<T>;
      if (body.code === 0) {
        return body;
      }
      // Token 过期，尝试刷新
      if (body.code === 1002 && auth) {
        const refreshed = await refreshLogin();
        if (refreshed) {
          // 重试原请求
          headers['Authorization'] = `Bearer ${getToken()}`;
          const retryRes = await Taro.request({
            url: `${BASE_URL}${path}`,
            method: method as any,
            header: headers,
            data: data,
            timeout: 15000,
          });
          if (retryRes.statusCode === 200) {
            return retryRes.data as ApiResponse<T>;
          }
        }
      }
      // 返回错误响应，让调用方处理
      return body;
    }

    // HTTP 错误
    const errorBody = res.data as ApiResponse<T> | undefined;
    return {
      code: res.statusCode || 2001,
      message: errorBody?.message || `请求失败: ${res.statusCode}`,
      data: errorBody?.data || ({} as T),
    };
  } catch (err: any) {
    console.error(`[API] ${method} ${path} 请求异常:`, err);
    return {
      code: 2001,
      message: err?.errMsg || '网络异常，请检查网络连接',
      data: {} as T,
    };
  }
}

// ============================================================
// 登录相关
// ============================================================

export interface LoginUser {
  id: number;
  nickname: string;
  avatarUrl: string;
  stylePreferences: string[];
  commonScenarios: string[];
  isNewUser: boolean;
}

export interface LoginResult {
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: LoginUser;
}

/**
 * 微信登录 → 换取 JWT
 * 调用 POST /api/v1/auth/login
 */
export async function apiLogin(
  code: string,
  userInfo?: { nickname?: string; avatarUrl?: string }
): Promise<LoginResult | null> {
  const res = await request<LoginResult>('/auth/login', {
    method: 'POST',
    data: { code, userInfo },
    auth: false,
  });

  if (res.code === 0 && res.data) {
    setToken(res.data.token);
    setRefreshToken(res.data.refreshToken);
    try {
      Taro.setStorageSync(USER_KEY, JSON.stringify(res.data.user));
    } catch {}
    return res.data;
  }

  console.error('[Login] 登录失败:', res.message);
  return null;
}

/**
 * 刷新 Token
 */
async function refreshLogin(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await Taro.request({
      url: `${BASE_URL}/auth/refresh`,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: { refreshToken },
      timeout: 10000,
    });

    if (res.statusCode === 200) {
      const body = res.data as ApiResponse<{ token: string; refreshToken: string }>;
      if (body.code === 0 && body.data) {
        setToken(body.data.token);
        setRefreshToken(body.data.refreshToken);
        return true;
      }
    }
  } catch (err) {
    console.error('[Auth] Token 刷新失败:', err);
  }

  clearToken();
  return false;
}

/**
 * 完整登录流程：wx.login → code → JWT
 * 登录成功后返回 user 信息，外部可据此触发 Store 重载
 */
export async function performLogin(): Promise<LoginUser | null> {
  try {
    // 1. 调用 wx.login 获取 code
    const loginRes = await Taro.login();
    if (!loginRes.code) {
      console.error('[Login] wx.login 失败');
      return null;
    }

    // 2. 获取用户信息（可选）
    let userInfo: { nickname?: string; avatarUrl?: string } | undefined;
    try {
      // Taro 4.x 获取用户信息方式
      const settingRes = await Taro.getSetting();
      if (settingRes.authSetting['scope.userInfo']) {
        const infoRes = await Taro.getUserInfo();
        userInfo = {
          nickname: infoRes.userInfo.nickName,
          avatarUrl: infoRes.userInfo.avatarUrl,
        };
      }
    } catch {
      // 用户未授权，使用默认值
    }

    // 3. 调后端登录接口换取 JWT
    const result = await apiLogin(loginRes.code, userInfo);
    return result?.user || null;
  } catch (err) {
    console.error('[Login] 登录流程异常:', err);
    return null;
  }
}

// ============================================================
// 品类 & 标签字典
// ============================================================

export interface CategoryNode {
  id: string;
  name: string;
  level: number;
  parentId?: string;
  children?: CategoryNode[];
}

export interface TagItem {
  id: string;
  name: string;
  aliases?: string[];
}

/**
 * GET /categories — 获取品类字典
 */
export async function apiGetCategories(): Promise<CategoryNode[]> {
  const res = await request<{ categories: CategoryNode[] }>('/categories');
  return res.code === 0 && res.data ? res.data.categories : [];
}

/**
 * GET /tags — 获取标签字典
 */
export async function apiGetTags(
  types?: string[]
): Promise<Record<string, TagItem[]>> {
  const query = types ? `?type=${types.join(',')}` : '';
  const res = await request<Record<string, TagItem[]>>(`/tags${query}`);
  return res.code === 0 && res.data ? res.data : {};
}

// ============================================================
// 衣橱 CRUD
// ============================================================

export interface WardrobeApiItem {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  category: { id: string; name: string; parentId?: string; parentName?: string };
  primaryColor: string;
  secondaryColors: string[];
  pattern: string;
  fabric?: string;
  thickness: string;
  seasons: string[];
  scenarios: string[];
  styles: string[];
  temperatureMin?: number;
  temperatureMax?: number;
  status: string;
  isFavorite: boolean;
  aiTags?: any;
  manualEdited?: boolean;
  brand?: string;
  purchaseDate?: string;
  note?: string;
  wearCount: number;
  lastWornAt: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface WardrobeListData {
  list: WardrobeApiItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface WardrobeQueryParams {
  page?: number;
  pageSize?: number;
  categoryId?: string;
  primaryColor?: string;
  season?: string;
  scenario?: string;
  style?: string;
  status?: string;
  search?: string;
  favoriteOnly?: boolean;
  sortBy?: string;
  sortOrder?: string;
}

/**
 * GET /wardrobe — 获取衣橱列表
 */
export async function apiGetItems(
  params: WardrobeQueryParams = {}
): Promise<WardrobeListData | null> {
  const queryParts: string[] = [];
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParts.push(`${key}=${encodeURIComponent(String(value))}`);
    }
  });
  const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

  const res = await request<WardrobeListData>(`/wardrobe${query}`);
  if (res.code === 0 && res.data) {
    return res.data;
  }
  console.error('[API] 获取衣橱列表失败:', res.message);
  return null;
}

/**
 * GET /wardrobe/{id} — 获取衣物详情
 */
export async function apiGetItemDetail(
  id: string
): Promise<WardrobeApiItem | null> {
  const res = await request<WardrobeApiItem>(`/wardrobe/${encodeURIComponent(id)}`);
  return res.code === 0 && res.data ? res.data : null;
}

export interface CreateWardrobeItemData {
  imageFileId: string;
  thumbnailFileId?: string;
  categoryId: string;
  primaryColor: string;
  secondaryColors?: string[];
  pattern?: string;
  thickness?: string;
  seasons?: string[];
  scenarios?: string[];
  styles?: string[];
  temperatureMin?: number;
  temperatureMax?: number;
  fabric?: string;
  brand?: string;
  purchaseDate?: string;
  note?: string;
}

export interface UpdateWardrobeItemData {
  categoryId?: string;
  primaryColor?: string;
  secondaryColors?: string[];
  pattern?: string;
  thickness?: string;
  seasons?: string[];
  scenarios?: string[];
  styles?: string[];
  temperatureMin?: number;
  temperatureMax?: number;
  fabric?: string;
  brand?: string;
  purchaseDate?: string;
  note?: string;
  status?: string;
  isFavorite?: boolean;
  expectedVersion?: string;
}

/**
 * POST /wardrobe — 创建衣物
 */
export async function apiAddItem(
  data: CreateWardrobeItemData
): Promise<{ id: string } | null> {
  const res = await request<{ id: string }>('/wardrobe', {
    method: 'POST',
    data,
  });
  if (res.code === 0 && res.data) {
    return res.data;
  }
  console.error('[API] 创建衣物失败:', res.message);
  return null;
}

/**
 * PUT /wardrobe/{id} — 编辑衣物
 */
export async function apiUpdateItem(
  id: string,
  updates: UpdateWardrobeItemData
): Promise<boolean> {
  const res = await request(`/wardrobe/${encodeURIComponent(id)}`, {
    method: 'PUT',
    data: updates,
  });
  return res.code === 0;
}

/**
 * DELETE /wardrobe/{id} — 删除衣物
 */
export async function apiDeleteItem(id: string): Promise<boolean> {
  const res = await request(`/wardrobe/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return res.code === 0;
}

/**
 * POST /wardrobe/batch-delete — 批量删除
 */
export async function apiBatchDeleteItems(
  ids: string[]
): Promise<{ deletedCount: number; failedIds: string[] } | null> {
  const res = await request<{ deletedCount: number; failedIds: string[] }>(
    '/wardrobe/batch-delete',
    { method: 'POST', data: { ids } }
  );
  return res.code === 0 && res.data ? res.data : null;
}

// ============================================================
// 搭配相关
// ============================================================

export interface OutfitApiItem {
  id: string;
  name: string;
  items: OutfitItemRef[];
  scenario: string;
  season: string;
  style: string;
  score: number;
  reason: string;
  isFavorite: boolean;
  feedback: string | null;
  source: string;
  createdAt: string;
}

export interface OutfitItemRef {
  itemId: string;
  categoryId: string;
  categoryName: string;
  primaryColor: string;
  thumbnailUrl: string;
  position: string;
}

export interface OutfitListData {
  list: OutfitApiItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface OutfitGenerateParams {
  scenario: string;
  season?: string;
  style?: string;
  temperature?: number;
  weather?: string;
  mustIncludeItemId?: string;
  excludeItemIds?: string[];
  count?: number;
}

/**
 * GET /outfits — 获取搭配列表
 */
export async function apiGetOutfits(
  params: { page?: number; pageSize?: number; favoriteOnly?: boolean; scenario?: string } = {}
): Promise<OutfitListData | null> {
  const queryParts: string[] = [];
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParts.push(`${key}=${encodeURIComponent(String(value))}`);
    }
  });
  const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

  const res = await request<OutfitListData>(`/outfits${query}`);
  if (res.code === 0 && res.data) {
    return res.data;
  }
  console.error('[API] 获取搭配列表失败:', res.message);
  return null;
}

/**
 * GET /outfits/{id} — 获取搭配详情
 */
export async function apiGetOutfitDetail(
  id: string
): Promise<OutfitApiItem | null> {
  const res = await request<OutfitApiItem>(`/outfits/${encodeURIComponent(id)}`);
  return res.code === 0 && res.data ? res.data : null;
}

export interface GenerateTask {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  estimatedSeconds?: number;
}

export interface GenerateResult {
  taskId: string;
  status: 'completed' | 'failed';
  outfits?: OutfitApiItem[];
  errorMessage?: string;
  processingTimeMs?: number;
}

/**
 * POST /outfits/generate — 生成搭配（异步）
 * 返回 taskId，需轮询获取结果
 */
export async function apiGenerateOutfits(
  params: OutfitGenerateParams
): Promise<GenerateTask | null> {
  const res = await request<GenerateTask>('/outfits/generate', {
    method: 'POST',
    data: params,
  });
  return res.code === 0 && res.data ? res.data : null;
}

/**
 * GET /outfits/generate/{taskId} — 轮询搭配结果
 */
export async function apiGetOutfitTask(
  taskId: string
): Promise<GenerateResult | null> {
  const res = await request<GenerateResult>(
    `/outfits/generate/${encodeURIComponent(taskId)}`
  );
  return res.code === 0 && res.data ? res.data : null;
}

/**
 * POST /outfits/{id}/feedback — 搭配反馈
 */
export async function apiOutfitFeedback(
  id: string,
  feedback: string,
  isFavorite?: boolean
): Promise<boolean> {
  const res = await request(`/outfits/${encodeURIComponent(id)}/feedback`, {
    method: 'POST',
    data: { feedback, isFavorite },
  });
  return res.code === 0;
}

// ============================================================
// 统计
// ============================================================

export interface WardrobeStats {
  totalItems: number;
  activeItems: number;
  byCategory: { categoryId: string; categoryName: string; count: number }[];
  byColor: { color: string; count: number }[];
  bySeason: { season: string; count: number }[];
  byStatus: { status: string; count: number }[];
  mostWorn: { itemId: string; categoryName: string; primaryColor: string; wearCount: number }[];
  leastWorn: { itemId: string; categoryName: string; primaryColor: string; wearCount: number }[];
  outfitStats: {
    totalOutfits: number;
    favoriteOutfits: number;
    feedbackLike: number;
    feedbackDislike: number;
  };
}

/**
 * GET /stats/wardrobe — 获取衣橱统计
 */
export async function apiGetStats(): Promise<WardrobeStats | null> {
  const res = await request<WardrobeStats>('/stats/wardrobe');
  return res.code === 0 && res.data ? res.data : null;
}

// ============================================================
// 图片上传（CloudBase SDK）
// ============================================================

/**
 * POST /wardrobe/upload — 获取上传凭证（预留，当前直接使用 SDK 上传）
 */
export async function apiGetUploadToken(
  fileName: string,
  ext: string
): Promise<{ uploadToken: string; cloudPath: string; expiresIn: number } | null> {
  const res = await request<{
    uploadToken: string;
    cloudPath: string;
    expiresIn: number;
  }>('/wardrobe/upload', {
    method: 'POST',
    data: { fileName, ext },
  });
  return res.code === 0 && res.data ? res.data : null;
}

/**
 * 上传图片到 CloudBase 云存储（使用 SDK）
 * 返回 cloud:// fileID
 */
export async function uploadImage(filePath: string): Promise<string> {
  if (!cloudInited || !Taro.cloud) {
    throw new Error('CloudBase 未初始化');
  }
  const ext = filePath.split('.').pop() || 'jpg';
  const cloudPath = `wardrobe-images/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;
  const { fileID } = await Taro.cloud.uploadFile({
    cloudPath,
    filePath,
  });
  return fileID;
}

/**
 * 将 Base64 图片数据上传到 CloudBase 云存储
 *
 * 流程：Base64 → 临时文件 → uploadFile → cloud://fileID
 * 上传失败时会 throw，调用方需处理降级
 */
export async function uploadBase64Image(base64Data: string): Promise<string> {
  if (!cloudInited || !Taro.cloud) {
    throw new Error('CloudBase 未初始化');
  }

  // 1. 解析 data:image/xxx;base64, 格式
  const matches = base64Data.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!matches) throw new Error('无效的 Base64 图片数据');

  const mimeType = matches[1];
  const ext = mimeType.split('/')[1] === 'png' ? 'png' : 'jpg';
  const base64Content = matches[2];

  // 2. Base64 → 临时文件（写入用户数据目录）
  const fs = Taro.getFileSystemManager();
  const tmpPath = `${Taro.env.USER_DATA_PATH}/wardrobe_upload_${Date.now()}.${ext}`;
  fs.writeFileSync(tmpPath, base64Content, 'base64');

  // 3. 上传到云存储
  return uploadImage(tmpPath);
}

/**
 * 获取临时文件访问链接
 */
export async function getTempFileURL(fileID: string): Promise<string> {
  if (!cloudInited || !Taro.cloud) {
    return fileID;
  }
  try {
    const { fileList } = await Taro.cloud.getTempFileURL({
      fileList: [fileID],
    });
    return fileList[0]?.tempFileURL || fileID;
  } catch {
    return fileID;
  }
}

// ============================================================
// 品类 ID 映射表（根据 /categories API 实际数据结构）
// CloudBase 文档数据库使用字符串 ID，如 "ae09feb36a2e8aba000db40f60e2d92d"
// ============================================================
let _categoryIdMap: Record<string, string> | null = null;
let _categoryNameMap: Record<string, string> | null = null;

/**
 * 从 /categories API 的返回数据构建 subCategoryName → categoryId 映射
 */
export function buildCategoryMaps(categories: CategoryNode[]): void {
  const idMap: Record<string, string> = {};
  const nameMap: Record<string, string> = {};

  for (const parent of categories) {
    if (parent.children) {
      for (const child of parent.children) {
        idMap[child.name] = child.id;
        nameMap[child.id] = child.name;
      }
    }
  }
  _categoryIdMap = idMap;
  _categoryNameMap = nameMap;
}

/**
 * 根据二级品类名称获取 categoryId
 */
export function getCategoryIdByName(subCategoryName: string): string | undefined {
  return _categoryIdMap?.[subCategoryName];
}

/**
 * 根据 categoryId 获取品类名称
 */
export function getCategoryNameById(categoryId: string): string | undefined {
  return _categoryNameMap?.[categoryId];
}

// ============================================================
// 数据转换：API 格式 ↔ 应用内部格式
// ============================================================

/**
 * 将 API 返回的衣物数据转换为应用内部 WardrobeItem 类型
 */
export function apiItemToWardrobeItem(api: WardrobeApiItem): WardrobeItem {
  const subCategory = api.category?.name || '其他';
  const parentCategory = api.category?.parentName;

  return {
    id: api.id, // 直接使用字符串 ID
    imageBase64: api.imageUrl || '',
    category: (parentCategory as Category) || mapToCategory(subCategory),
    subCategory: subCategory as SubCategory,
    primaryColor: api.primaryColor as ColorLabel,
    secondaryColors: (api.secondaryColors || []) as ColorLabel[],
    pattern: (api.pattern || '纯色') as Pattern,
    thickness: (api.thickness || '中') as Thickness,
    seasons: (api.seasons || []) as Season[],
    scenarios: (api.scenarios || []) as Scenario[],
    styles: (api.styles || []) as Style[],
    temperatureMin: api.temperatureMin ?? 10,
    temperatureMax: api.temperatureMax ?? 30,
    status: (api.status || '正常') as ItemStatus,
    note: api.note || '',
    isFavorite: api.isFavorite || false,
    wearCount: api.wearCount || 0,
    lastWornAt: api.lastWornAt,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt || api.createdAt,
  };
}

/**
 * 将应用内部 WardrobeItem 转为创建 API 请求体
 * 需要先通过 buildCategoryMaps 加载品类字典
 * imageBase64 需要先通过 uploadImage 转为 cloud fileID
 */
export function wardrobeItemToCreateData(
  item: Omit<WardrobeItem, 'id' | 'createdAt' | 'updatedAt' | 'wearCount' | 'lastWornAt'> & {
    imageFileId: string;
    thumbnailFileId?: string;
  }
): CreateWardrobeItemData {
  // 通过品类映射表获取真实 categoryId
  const categoryId = getCategoryIdByName(item.subCategory) || '';

  return {
    imageFileId: item.imageFileId,
    thumbnailFileId: item.thumbnailFileId,
    categoryId,
    primaryColor: item.primaryColor,
    secondaryColors: item.secondaryColors,
    pattern: item.pattern,
    thickness: item.thickness,
    seasons: item.seasons,
    scenarios: item.scenarios,
    styles: item.styles,
    temperatureMin: item.temperatureMin,
    temperatureMax: item.temperatureMax,
    note: item.note,
  };
}

/**
 * 将 API 返回的搭配数据转换为应用内部 Outfit 类型
 */
export function apiOutfitToOutfit(api: OutfitApiItem): Outfit {
  return {
    id: api.id, // 直接使用字符串 ID
    itemIds: (api.items || []).map((i) => i.itemId),
    scenario: api.scenario as Scenario,
    style: (api.style as Style) || '简约',
    title: api.name || '',
    reason: api.reason || '',
    season: (api.season as Season) || '春',
    isFavorite: api.isFavorite || false,
    feedback: (api.feedback as Feedback) || null,
    createdAt: api.createdAt,
  };
}

// ============================================================
// 辅助：二级品类 → 一级品类映射
// ============================================================
const SUBCATEGORY_TO_CATEGORY: Record<string, Category> = {
  T恤: '上衣', 衬衫: '上衣', 卫衣: '上衣', 针织衫: '上衣', 毛衣: '上衣', 背心: '上衣',
  牛仔裤: '下装', 休闲裤: '下装', 西裤: '下装', 短裤: '下装', 半身裙: '下装', 长裙: '下装', 短裙: '下装',
  连衣长裙: '连衣裙', 连衣短裙: '连衣裙',
  风衣: '外套', 夹克: '外套', 西装: '外套', 羽绒服: '外套', 大衣: '外套',
  运动鞋: '鞋', 皮鞋: '鞋', 靴子: '鞋', 凉鞋: '鞋', 帆布鞋: '鞋',
  手拎包: '包', 斜挎包: '包', 双肩包: '包',
  项链: '配饰', 耳环: '配饰', 手表: '配饰', 帽子: '配饰', 围巾: '配饰', 腰带: '配饰',
};

function mapToCategory(subCategory: string): Category {
  return SUBCATEGORY_TO_CATEGORY[subCategory] || '其他';
}

// ============================================================
// 本地存储降级（离线/未登录时使用）
// ============================================================

const STORAGE_KEY_ITEMS = 'ew_items';
const STORAGE_KEY_OUTFITS = 'ew_outfits';
const STORAGE_KEY_INIT = 'ew_initialized';

export function localGetItems(): any[] {
  try {
    const raw = Taro.getStorageSync(STORAGE_KEY_ITEMS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function localSetItems(items: any[]): void {
  Taro.setStorageSync(STORAGE_KEY_ITEMS, JSON.stringify(items));
}

export function localGetOutfits(): any[] {
  try {
    const raw = Taro.getStorageSync(STORAGE_KEY_OUTFITS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function localSetOutfits(outfits: any[]): void {
  Taro.setStorageSync(STORAGE_KEY_OUTFITS, JSON.stringify(outfits));
}

export function localIsInitialized(): boolean {
  return !!Taro.getStorageSync(STORAGE_KEY_INIT);
}

export function localSetInitialized(): void {
  Taro.setStorageSync(STORAGE_KEY_INIT, 'true');
}

export function localClearAll(): void {
  Taro.removeStorageSync(STORAGE_KEY_ITEMS);
  Taro.removeStorageSync(STORAGE_KEY_OUTFITS);
  Taro.removeStorageSync(STORAGE_KEY_INIT);
}
