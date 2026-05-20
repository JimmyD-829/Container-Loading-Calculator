/**
 * 集装箱装载计算工具 - Zustand 状态管理
 * 
 * 功能模块：
 * - 货物管理（添加、编辑、删除、导入）
 * - 集装箱选择（11种标准类型 + 自定义）
 * - 计算设置
 * - 计算结果存储
 * - 导入/导出功能
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import {
  Cargo,
  ContainerSpec,
  ContainerType,
  CargoType,
  Priority,
  PackingResult,
  CalculationSettings,
  ImportConfig,
  ExportConfig,
  RenderConfig
} from '../types';

import {
  STANDARD_CONTAINERS,
  CONTAINER_20GP,
  CONTAINER_40GP,
  CONTAINER_40HQ,
  createCustomContainerSpec
} from '../data/containers';

import { ffdPacking, FFDOptions } from '../algorithms/ffd';

// ==================== 状态类型定义 ====================

interface CargoItem extends Cargo {
  isSelected?: boolean;
}

interface SelectedContainer {
  spec: ContainerSpec;
  quantity: number;
}

interface AppStore {
  // ========== 货物管理 ==========
  cargos: CargoItem[];
  selectedCargoIds: Set<string>;
  
  // ========== 集装箱选择 ==========
  selectedContainers: SelectedContainer[];
  customContainers: ContainerSpec[];
  
  // ========== 计算设置 ==========
  settings: CalculationSettings;
  
  // ========== 计算结果 ==========
  result: PackingResult | null;
  isCalculating: boolean;
  calculationError: string | null;
  
  // ========== 3D渲染设置 ==========
  renderConfig: RenderConfig;
  
  // ========== 货物管理操作 ==========
  addCargo: (cargo: Omit<Cargo, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCargo: (id: string, updates: Partial<Cargo>) => void;
  deleteCargo: (id: string) => void;
  deleteMultipleCargos: (ids: string[]) => void;
  clearAllCargos: () => void;
  selectCargo: (id: string, selected: boolean) => void;
  selectAllCargos: (selected: boolean) => void;
  getSelectedCargos: () => CargoItem[];
  duplicateCargo: (id: string) => void;
  
  // ========== 集装箱选择操作 ==========
  addContainer: (spec: ContainerSpec, quantity?: number) => void;
  removeContainer: (index: number) => void;
  updateContainerQuantity: (index: number, quantity: number) => void;
  clearContainers: () => void;
  addCustomContainer: (
    name: string,
    description: string,
    innerDimensions: { length: number; width: number; height: number },
    maxPayload: number,
    tareWeight: number
  ) => void;
  removeCustomContainer: (index: number) => void;
  getAllSelectedContainerSpecs: () => ContainerSpec[];
  
  // ========== 计算设置操作 ==========
  updateSettings: (settings: Partial<CalculationSettings>) => void;
  resetSettings: () => void;
  
  // ========== 计算操作 ==========
  runCalculation: () => Promise<void>;
  clearResult: () => void;
  
  // ========== 导入/导出操作 ==========
  importCargos: (data: Array<Partial<Cargo>>, config?: Partial<ImportConfig>) => void;
  exportCargos: (format: 'json' | 'csv') => string;
  exportResult: (config: ExportConfig) => Promise<Blob | string>;
  
  // ========== 3D渲染设置操作 ==========
  updateRenderConfig: (config: Partial<RenderConfig>) => void;
  resetRenderConfig: () => void;
  
  // ========== 工具函数 ==========
  getTotalCargoVolume: () => number;
  getTotalCargoWeight: () => number;
  getTotalCargoCount: () => number;
  validateCargo: (cargo: Partial<Cargo>) => { valid: boolean; errors: string[] };
}

// ==================== 默认配置 ====================

const DEFAULT_SETTINGS: CalculationSettings = {
  algorithm: 'FFD',
  allowRotation: true,
  prioritizeWeight: false,
  maxIterations: 1000,
  timeLimit: 60
};

const DEFAULT_RENDER_CONFIG: RenderConfig = {
  showAxes: true,
  showGrid: true,
  showLabels: true,
  transparency: 0.3,
  wireframe: false,
  autoRotate: false,
  backgroundColor: '#1a1a2e'
};

// ==================== 辅助函数 ====================

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const createDefaultCargo = (
  overrides: Partial<Cargo> = {}
): Omit<Cargo, 'id' | 'createdAt' | 'updatedAt'> => ({
  name: '新货物',
  description: '',
  dimensions: { length: 1000, width: 800, height: 600 },
  weight: 10,
  quantity: 1,
  type: CargoType.BOX,
  priority: Priority.MEDIUM,
  stackable: true,
  maxStack: 5,
  rotatable: true,
  fragile: false,
  thisSideUp: false,
  color: `hsl(${Math.random() * 360}, 70%, 60%)`,
  ...overrides
});

// ==================== Store 创建 ====================

export const useAppStore = create<AppStore>()(
  immer(
    persist(
      (set, get) => ({
        // ========== 初始状态 ==========
        cargos: [],
        selectedCargoIds: new Set(),
        selectedContainers: [{ spec: CONTAINER_40HQ, quantity: 1 }],
        customContainers: [],
        settings: { ...DEFAULT_SETTINGS },
        result: null,
        isCalculating: false,
        calculationError: null,
        renderConfig: { ...DEFAULT_RENDER_CONFIG },

        // ========== 货物管理操作 ==========
        addCargo: (cargo) => {
          set((state) => {
            const newCargo: CargoItem = {
              ...createDefaultCargo(),
              ...cargo,
              id: generateId(),
              createdAt: new Date(),
              updatedAt: new Date()
            };
            state.cargos.push(newCargo);
          });
        },

        updateCargo: (id, updates) => {
          set((state) => {
            const cargo = state.cargos.find((c: CargoItem) => c.id === id);
            if (cargo) {
              Object.assign(cargo, updates, { updatedAt: new Date() });
            }
          });
        },

        deleteCargo: (id) => {
          set((state) => {
            state.cargos = state.cargos.filter((c: CargoItem) => c.id !== id);
            state.selectedCargoIds.delete(id);
          });
        },

        deleteMultipleCargos: (ids) => {
          set((state) => {
            state.cargos = state.cargos.filter((c: CargoItem) => !ids.includes(c.id));
            ids.forEach((id) => state.selectedCargoIds.delete(id));
          });
        },

        clearAllCargos: () => {
          set((state) => {
            state.cargos = [];
            state.selectedCargoIds.clear();
          });
        },

        selectCargo: (id, selected) => {
          set((state) => {
            if (selected) {
              state.selectedCargoIds.add(id);
            } else {
              state.selectedCargoIds.delete(id);
            }
          });
        },

        selectAllCargos: (selected) => {
          set((state) => {
            if (selected) {
              state.cargos.forEach((c: CargoItem) => state.selectedCargoIds.add(c.id));
            } else {
              state.selectedCargoIds.clear();
            }
          });
        },

        getSelectedCargos: () => {
          const { cargos, selectedCargoIds } = get();
          return cargos.filter((c: CargoItem) => selectedCargoIds.has(c.id));
        },

        duplicateCargo: (id) => {
          set((state) => {
            const cargo = state.cargos.find((c: CargoItem) => c.id === id);
            if (cargo) {
              const { id: _, createdAt: __, updatedAt: ___, ...cargoData } = cargo;
              const newCargo: CargoItem = {
                ...cargoData,
                id: generateId(),
                name: `${cargo.name} (复制)`,
                createdAt: new Date(),
                updatedAt: new Date()
              };
              state.cargos.push(newCargo);
            }
          });
        },

        // ========== 集装箱选择操作 ==========
        addContainer: (spec, quantity = 1) => {
          set((state) => {
            const existing = state.selectedContainers.find(
              (c: SelectedContainer) => c.spec.id === spec.id
            );
            if (existing) {
              existing.quantity += quantity;
            } else {
              state.selectedContainers.push({ spec, quantity });
            }
          });
        },

        removeContainer: (index) => {
          set((state) => {
            state.selectedContainers.splice(index, 1);
          });
        },

        updateContainerQuantity: (index, quantity) => {
          set((state) => {
            if (quantity <= 0) {
              state.selectedContainers.splice(index, 1);
            } else {
              state.selectedContainers[index].quantity = quantity;
            }
          });
        },

        clearContainers: () => {
          set((state) => {
            state.selectedContainers = [];
          });
        },

        addCustomContainer: (name, description, innerDimensions, maxPayload, tareWeight) => {
          set((state) => {
            const customSpec = createCustomContainerSpec(
              name,
              description,
              innerDimensions,
              maxPayload,
              tareWeight
            );
            state.customContainers.push(customSpec);
            state.selectedContainers.push({ spec: customSpec, quantity: 1 });
          });
        },

        removeCustomContainer: (index) => {
          set((state) => {
            const custom = state.customContainers[index];
            state.customContainers.splice(index, 1);
            state.selectedContainers = state.selectedContainers.filter(
              (c: SelectedContainer) => c.spec.id !== custom.id
            );
          });
        },

        getAllSelectedContainerSpecs: () => {
          const { selectedContainers } = get();
          const specs: ContainerSpec[] = [];
          selectedContainers.forEach(({ spec, quantity }) => {
            for (let i = 0; i < quantity; i++) {
              specs.push(spec);
            }
          });
          return specs;
        },

        // ========== 计算设置操作 ==========
        updateSettings: (settings) => {
          set((state) => {
            Object.assign(state.settings, settings);
          });
        },

        resetSettings: () => {
          set((state) => {
            state.settings = { ...DEFAULT_SETTINGS };
          });
        },

        // ========== 计算操作 ==========
        runCalculation: async () => {
          const { cargos, settings, getAllSelectedContainerSpecs } = get();
          
          set((state) => {
            state.isCalculating = true;
            state.calculationError = null;
            state.result = null;
          });

          try {
            const containerSpecs = getAllSelectedContainerSpecs();
            
            if (cargos.length === 0) {
              throw new Error('没有货物需要装载');
            }
            
            if (containerSpecs.length === 0) {
              throw new Error('没有选择集装箱');
            }

            const options: FFDOptions = {
              allowRotation: settings.allowRotation,
              prioritizeWeight: settings.prioritizeWeight,
              maxContainers: 100
            };

            // 使用 setTimeout 让 UI 有时间更新
            await new Promise((resolve) => setTimeout(resolve, 100));

            const result = ffdPacking(cargos, containerSpecs, options);

            set((state) => {
              state.result = result;
              state.isCalculating = false;
            });
          } catch (error) {
            set((state) => {
              state.isCalculating = false;
              state.calculationError = error instanceof Error ? error.message : '计算失败';
            });
          }
        },

        clearResult: () => {
          set((state) => {
            state.result = null;
            state.calculationError = null;
          });
        },

        // ========== 导入/导出操作 ==========
        importCargos: (data, config = {}) => {
          set((state) => {
            const importedCargos: CargoItem[] = data.map((item) => ({
              ...createDefaultCargo(),
              ...item,
              id: generateId(),
              createdAt: new Date(),
              updatedAt: new Date()
            }));
            state.cargos.push(...importedCargos);
          });
        },

        exportCargos: (format) => {
          const { cargos } = get();
          
          if (format === 'json') {
            return JSON.stringify(cargos, null, 2);
          }
          
          if (format === 'csv') {
            const headers = ['name', 'length', 'width', 'height', 'weight', 'quantity', 'type'];
            const rows = cargos.map((c) => [
              c.name,
              c.dimensions.length,
              c.dimensions.width,
              c.dimensions.height,
              c.weight,
              c.quantity,
              c.type
            ]);
            return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
          }
          
          return '';
        },

        exportResult: async (config) => {
          const { result } = get();
          
          if (!result) {
            throw new Error('没有计算结果可导出');
          }

          if (config.format === 'json') {
            return JSON.stringify(result, null, 2);
          }

          if (config.format === 'excel' || config.format === 'pdf') {
            // 这里应该调用实际的导出服务
            // 简化实现，返回 JSON 字符串
            return JSON.stringify(result, null, 2);
          }

          return '';
        },

        // ========== 3D渲染设置操作 ==========
        updateRenderConfig: (config) => {
          set((state) => {
            Object.assign(state.renderConfig, config);
          });
        },

        resetRenderConfig: () => {
          set((state) => {
            state.renderConfig = { ...DEFAULT_RENDER_CONFIG };
          });
        },

        // ========== 工具函数 ==========
        getTotalCargoVolume: () => {
          const { cargos } = get();
          return cargos.reduce((total, cargo) => {
            const volume = cargo.dimensions.length * cargo.dimensions.width * cargo.dimensions.height;
            return total + (volume * cargo.quantity) / 1_000_000_000; // 转换为立方米
          }, 0);
        },

        getTotalCargoWeight: () => {
          const { cargos } = get();
          return cargos.reduce((total, cargo) => {
            return total + cargo.weight * cargo.quantity;
          }, 0);
        },

        getTotalCargoCount: () => {
          const { cargos } = get();
          return cargos.reduce((total, cargo) => total + cargo.quantity, 0);
        },

        validateCargo: (cargo) => {
          const errors: string[] = [];

          if (!cargo.name || cargo.name.trim() === '') {
            errors.push('货物名称不能为空');
          }

          if (cargo.dimensions) {
            if ((cargo.dimensions.length ?? 0) <= 0) {
              errors.push('长度必须大于0');
            }
            if ((cargo.dimensions.width ?? 0) <= 0) {
              errors.push('宽度必须大于0');
            }
            if ((cargo.dimensions.height ?? 0) <= 0) {
              errors.push('高度必须大于0');
            }
          }

          if ((cargo.weight ?? 0) <= 0) {
            errors.push('重量必须大于0');
          }

          if ((cargo.quantity ?? 0) <= 0) {
            errors.push('数量必须大于0');
          }

          return {
            valid: errors.length === 0,
            errors
          };
        }
      }),
      {
        name: 'container-loading-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          cargos: state.cargos,
          selectedContainers: state.selectedContainers,
          customContainers: state.customContainers,
          settings: state.settings,
          renderConfig: state.renderConfig
        })
      }
    )
  )
);

// ==================== 选择器 Hooks ====================

export const useCargos = () => useAppStore((state) => state.cargos);
export const useSelectedCargoIds = () => useAppStore((state) => state.selectedCargoIds);
export const useSelectedContainers = () => useAppStore((state) => state.selectedContainers);
export const useSettings = () => useAppStore((state) => state.settings);
export const useResult = () => useAppStore((state) => state.result);
export const useIsCalculating = () => useAppStore((state) => state.isCalculating);
export const useCalculationError = () => useAppStore((state) => state.calculationError);
export const useRenderConfig = () => useAppStore((state) => state.renderConfig);

// ==================== 操作 Hooks ====================

export const useCargoActions = () => {
  const store = useAppStore();
  return {
    addCargo: store.addCargo,
    updateCargo: store.updateCargo,
    deleteCargo: store.deleteCargo,
    deleteMultipleCargos: store.deleteMultipleCargos,
    clearAllCargos: store.clearAllCargos,
    selectCargo: store.selectCargo,
    selectAllCargos: store.selectAllCargos,
    getSelectedCargos: store.getSelectedCargos,
    duplicateCargo: store.duplicateCargo
  };
};

export const useContainerActions = () => {
  const store = useAppStore();
  return {
    addContainer: store.addContainer,
    removeContainer: store.removeContainer,
    updateContainerQuantity: store.updateContainerQuantity,
    clearContainers: store.clearContainers,
    addCustomContainer: store.addCustomContainer,
    removeCustomContainer: store.removeCustomContainer,
    getAllSelectedContainerSpecs: store.getAllSelectedContainerSpecs
  };
};

export const useCalculationActions = () => {
  const store = useAppStore();
  return {
    runCalculation: store.runCalculation,
    clearResult: store.clearResult,
    updateSettings: store.updateSettings,
    resetSettings: store.resetSettings
  };
};

export const useImportExportActions = () => {
  const store = useAppStore();
  return {
    importCargos: store.importCargos,
    exportCargos: store.exportCargos,
    exportResult: store.exportResult
  };
};

// ==================== 工具 Hooks ====================

export const useCargoStats = () => {
  const store = useAppStore();
  return {
    totalVolume: store.getTotalCargoVolume(),
    totalWeight: store.getTotalCargoWeight(),
    totalCount: store.getTotalCargoCount()
  };
};

// ==================== 预设数据 ====================

export const PRESET_CARGOS: Array<Partial<Cargo>> = [
  {
    name: '标准纸箱',
    dimensions: { length: 600, width: 400, height: 400 },
    weight: 15,
    quantity: 10,
    type: CargoType.BOX,
    color: '#FF6B6B'
  },
  {
    name: '大托盘',
    dimensions: { length: 1200, width: 1000, height: 1500 },
    weight: 50,
    quantity: 5,
    type: CargoType.PALLET,
    stackable: false,
    color: '#4ECDC4'
  },
  {
    name: '小包裹',
    dimensions: { length: 300, width: 200, height: 150 },
    weight: 2,
    quantity: 50,
    type: CargoType.BOX,
    color: '#45B7D1'
  },
  {
    name: '易碎品',
    dimensions: { length: 500, width: 500, height: 300 },
    weight: 8,
    quantity: 8,
    type: CargoType.BOX,
    fragile: true,
    stackable: false,
    color: '#FFA07A'
  }
];

export const PRESET_CONTAINER_SELECTIONS = [
  { name: '单40HQ', containers: [{ spec: CONTAINER_40HQ, quantity: 1 }] },
  { name: '单20GP', containers: [{ spec: CONTAINER_20GP, quantity: 1 }] },
  { name: '双40GP', containers: [{ spec: CONTAINER_40GP, quantity: 2 }] },
  { name: '40HQ+20GP', containers: [
    { spec: CONTAINER_40HQ, quantity: 1 },
    { spec: CONTAINER_20GP, quantity: 1 }
  ]}
];

export default useAppStore;
