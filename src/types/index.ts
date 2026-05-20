/**
 * 集装箱装载计算工具 - TypeScript 类型定义
 */

// ==================== 基础几何类型 ====================

/**
 * 三维尺寸
 */
export interface Dimensions {
  length: number; // 长度 (mm)
  width: number;  // 宽度 (mm)
  height: number; // 高度 (mm)
}

/**
 * 三维位置坐标
 */
export interface Position {
  x: number;
  y: number;
  z: number;
}

/**
 * 旋转方向
 */
export type Rotation = 0 | 90 | 180 | 270;

/**
 * 旋转状态
 */
export interface RotationState {
  x: number;
  y: number;
  z: number;
}

// ==================== 货物类型 ====================

/**
 * 货物类型枚举
 */
export enum CargoType {
  BOX = 'box',           // 纸箱
  PALLET = 'pallet',     // 托盘
  BAG = 'bag',           // 袋装
  ROLL = 'roll',         // 卷状
  CYLINDER = 'cylinder', // 圆柱
  IRREGULAR = 'irregular' // 不规则
}

/**
 * 货物优先级
 */
export enum Priority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

/**
 * 货物基础信息
 */
export interface Cargo {
  id: string;
  name: string;
  description?: string;
  dimensions: Dimensions;
  weight: number; // 重量 (kg)
  quantity: number;
  type: CargoType;
  priority: Priority;
  
  // 装载约束
  stackable: boolean;       // 是否可堆叠
  maxStack: number;         // 最大堆叠层数
  rotatable: boolean;       // 是否可旋转
  fragile: boolean;         // 是否易碎
  thisSideUp: boolean;      // 此面朝上
  
  // 外观
  color?: string;
  
  // 创建时间
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 货物放置结果
 */
export interface PlacedCargo extends Cargo {
  position: Position;
  rotation: RotationState;
  placedQuantity: number;
  containerId: string;
}

// ==================== 集装箱类型 ====================

/**
 * 集装箱类型枚举
 */
export enum ContainerType {
  DRY_20 = '20GP',
  DRY_40 = '40GP',
  HIGH_CUBE_40 = '40HQ',
  HIGH_CUBE_45 = '45HQ',
  REEFER_20 = '20RF',
  REEFER_40 = '40RF',
  OPEN_TOP_20 = '20OT',
  OPEN_TOP_40 = '40OT',
  FLAT_RACK_20 = '20FR',
  FLAT_RACK_40 = '40FR',
  TANK = 'TK',
  CUSTOM = 'CUSTOM'
}

/**
 * 集装箱规格
 */
export interface ContainerSpec {
  id: ContainerType;
  name: string;
  description: string;
  
  // 内部尺寸 (mm)
  innerDimensions: Dimensions;
  
  // 门尺寸 (mm)
  doorDimensions?: {
    width: number;
    height: number;
  };
  
  // 载重限制
  maxPayload: number; // 最大载重 (kg)
  tareWeight: number; // 自重 (kg)
  maxWeight: number;  // 最大总重 (kg)
  
  // 体积
  volume: number; // 立方米
  
  // 是否为标准集装箱
  isStandard: boolean;
}

/**
 * 集装箱实例（用于计算）
 */
export interface Container {
  id: string;
  spec: ContainerSpec;
  
  // 已放置的货物
  placedCargos: PlacedCargo[];
  
  // 剩余空间
  remainingSpace: Space[];
  
  // 统计信息
  stats: ContainerStats;
}

/**
 * 空间定义（用于装箱算法）
 */
export interface Space {
  position: Position;
  dimensions: Dimensions;
}

/**
 * 集装箱统计信息
 */
export interface ContainerStats {
  totalVolume: number;      // 总体积
  usedVolume: number;       // 已使用体积
  volumeUtilization: number; // 体积利用率 (%)
  totalWeight: number;      // 总重量
  weightUtilization: number; // 重量利用率 (%)
  cargoCount: number;       // 货物数量
}

// ==================== 计算结果类型 ====================

/**
 * 装箱计算结果
 */
export interface PackingResult {
  id: string;
  createdAt: Date;
  
  // 使用的集装箱
  containers: Container[];
  
  // 未装载的货物
  unplacedCargos: Cargo[];
  
  // 总体统计
  totalStats: {
    totalContainers: number;
    totalCargos: number;
    placedCargos: number;
    unplacedCargos: number;
    totalVolume: number;
    usedVolume: number;
    volumeUtilization: number;
    totalWeight: number;
  };
  
  // 算法信息
  algorithm: string;
  duration: number; // 计算耗时 (ms)
}

// ==================== 应用状态类型 ====================

/**
 * 货物列表状态
 */
export interface CargoState {
  cargos: Cargo[];
  selectedCargoIds: string[];
}

/**
 * 集装箱选择状态
 */
export interface ContainerSelectionState {
  selectedContainers: {
    spec: ContainerSpec;
    quantity: number;
  }[];
  customContainers: ContainerSpec[];
}

/**
 * 计算设置
 */
export interface CalculationSettings {
  algorithm: 'FFD' | 'BF' | 'GA';
  allowRotation: boolean;
  prioritizeWeight: boolean;
  maxIterations: number;
  timeLimit: number; // 秒
}

/**
 * 应用状态
 */
export interface AppState {
  // 货物管理
  cargo: CargoState;
  
  // 集装箱选择
  containers: ContainerSelectionState;
  
  // 计算设置
  settings: CalculationSettings;
  
  // 计算结果
  result: PackingResult | null;
  
  // UI状态
  isCalculating: boolean;
  error: string | null;
}

// ==================== 导入/导出类型 ====================

/**
 * 支持的导入格式
 */
export type ImportFormat = 'csv' | 'excel' | 'json';

/**
 * 支持的导出格式
 */
export type ExportFormat = 'pdf' | 'excel' | 'json' | 'image';

/**
 * 导入配置
 */
export interface ImportConfig {
  format: ImportFormat;
  mapping: {
    name: string;
    length: string;
    width: string;
    height: string;
    weight: string;
    quantity: string;
    [key: string]: string;
  };
  skipRows: number;
}

/**
 * 导出配置
 */
export interface ExportConfig {
  format: ExportFormat;
  includeImages: boolean;
  include3DView: boolean;
  template?: string;
}

// ==================== 3D 可视化类型 ====================

/**
 * Three.js 渲染配置
 */
export interface RenderConfig {
  showAxes: boolean;
  showGrid: boolean;
  showLabels: boolean;
  transparency: number;
  wireframe: boolean;
  autoRotate: boolean;
  backgroundColor: string;
}

/**
 * 相机位置
 */
export interface CameraPosition {
  x: number;
  y: number;
  z: number;
  target: Position;
}

// ==================== API 响应类型 ====================

/**
 * API 响应包装
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==================== 工具函数类型 ====================

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 尺寸比较结果
 */
export interface DimensionComparison {
  fits: boolean;
  rotated: boolean;
  requiredRotation?: RotationState;
}

// ==================== 事件类型 ====================

/**
 * 计算进度事件
 */
export interface CalculationProgress {
  stage: 'preparing' | 'calculating' | 'optimizing' | 'finalizing';
  progress: number; // 0-100
  message: string;
}

/**
 * 错误信息
 */
export interface AppError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: Date;
}
