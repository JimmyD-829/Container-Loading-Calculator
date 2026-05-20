/**
 * 算法模块导出索引
 * 
 * 提供统一的算法接口，支持动态选择不同的装箱算法
 */

export { ffdPacking, DEFAULT_FFD_CONFIG } from './ffd';
export { gaPacking, DEFAULT_GA_OPTIONS } from './ga';
export { saPacking, DEFAULT_SA_OPTIONS } from './sa';
export { 
  multiObjectivePacking, 
  calculateMultiObjectiveScore, 
  compareAlgorithms,
  DEFAULT_MULTI_OBJECTIVE_CONFIG 
} from './multiObjective';

export * from './constraintSolver';

/**
 * 算法类型
 */
export type AlgorithmType = 'FFD' | 'GA' | 'SA' | 'MultiObjective';

/**
 * 算法配置
 */
export interface AlgorithmConfig {
  type: AlgorithmType;
  options?: Record<string, unknown>;
}

/**
 * 算法元信息
 */
export interface AlgorithmInfo {
  id: AlgorithmType;
  name: string;
  description: string;
  parameters: AlgorithmParameter[];
}

export interface AlgorithmParameter {
  name: string;
  key: string;
  type: 'number' | 'boolean' | 'select';
  default: unknown;
  min?: number;
  max?: number;
  options?: string[];
  description?: string;
}

/**
 * 获取算法列表
 */
export const getAlgorithmList = (): AlgorithmInfo[] => [
  {
    id: 'FFD',
    name: 'FFD算法',
    description: '首次适应递减算法，经典的装箱算法，计算速度快',
    parameters: [
      {
        name: '排序方式',
        key: 'sortBy',
        type: 'select',
        default: 'volume',
        options: ['volume', 'weight', 'height'],
        description: '货物排序依据'
      },
      {
        name: '允许旋转',
        key: 'allowRotation',
        type: 'boolean',
        default: true,
        description: '是否允许货物旋转'
      }
    ]
  },
  {
    id: 'GA',
    name: '遗传算法',
    description: '基于生物进化的智能优化算法，能找到全局最优解',
    parameters: [
      {
        name: '种群大小',
        key: 'populationSize',
        type: 'number',
        default: 50,
        min: 10,
        max: 200,
        description: '每代种群中的个体数量'
      },
      {
        name: '迭代代数',
        key: 'generations',
        type: 'number',
        default: 100,
        min: 10,
        max: 500,
        description: '进化迭代次数'
      },
      {
        name: '交叉概率',
        key: 'crossoverRate',
        type: 'number',
        default: 0.8,
        min: 0.1,
        max: 1,
        description: '遗传交叉概率'
      },
      {
        name: '变异概率',
        key: 'mutationRate',
        type: 'number',
        default: 0.1,
        min: 0.01,
        max: 0.5,
        description: '基因突变概率'
      },
      {
        name: '精英数量',
        key: 'elitism',
        type: 'number',
        default: 5,
        min: 1,
        max: 20,
        description: '每代保留的最优个体数量'
      },
      {
        name: '允许旋转',
        key: 'allowRotation',
        type: 'boolean',
        default: true,
        description: '是否允许货物旋转'
      },
      {
        name: '时间限制',
        key: 'timeLimit',
        type: 'number',
        default: 30,
        min: 1,
        max: 120,
        description: '最大计算时间（秒）'
      }
    ]
  },
  {
    id: 'SA',
    name: '模拟退火',
    description: '基于金属退火原理的优化算法，能跳出局部最优',
    parameters: [
      {
        name: '初始温度',
        key: 'initialTemperature',
        type: 'number',
        default: 1000,
        min: 100,
        max: 5000,
        description: '模拟退火初始温度'
      },
      {
        name: '冷却速率',
        key: 'coolingRate',
        type: 'number',
        default: 0.95,
        min: 0.8,
        max: 0.99,
        description: '温度衰减系数'
      },
      {
        name: '最低温度',
        key: 'minTemperature',
        type: 'number',
        default: 1,
        min: 0.1,
        max: 100,
        description: '终止温度'
      },
      {
        name: '每温迭代',
        key: 'iterationsPerTemp',
        type: 'number',
        default: 50,
        min: 10,
        max: 200,
        description: '每个温度下的迭代次数'
      },
      {
        name: '允许旋转',
        key: 'allowRotation',
        type: 'boolean',
        default: true,
        description: '是否允许货物旋转'
      },
      {
        name: '时间限制',
        key: 'timeLimit',
        type: 'number',
        default: 30,
        min: 1,
        max: 120,
        description: '最大计算时间（秒）'
      }
    ]
  },
  {
    id: 'MultiObjective',
    name: '多目标优化',
    description: '综合考虑空间利用率、重心平衡、堆叠稳定性等多个目标',
    parameters: [
      {
        name: '基础算法',
        key: 'algorithm',
        type: 'select',
        default: 'GA',
        options: ['GA', 'SA'],
        description: '选择底层算法'
      },
      {
        name: '空间利用率权重',
        key: 'weights.utilization',
        type: 'number',
        default: 0.4,
        min: 0,
        max: 1,
        description: '空间利用率在综合评分中的权重'
      },
      {
        name: '重心平衡权重',
        key: 'weights.balance',
        type: 'number',
        default: 0.3,
        min: 0,
        max: 1,
        description: '重心平衡在综合评分中的权重'
      },
      {
        name: '堆叠稳定性权重',
        key: 'weights.stacking',
        type: 'number',
        default: 0.2,
        min: 0,
        max: 1,
        description: '堆叠稳定性在综合评分中的权重'
      },
      {
        name: '装卸效率权重',
        key: 'weights.loading',
        type: 'number',
        default: 0.1,
        min: 0,
        max: 1,
        description: '装卸效率在综合评分中的权重'
      }
    ]
  }
];

/**
 * 执行装箱计算
 */
import { Cargo, ContainerSpec, PackingResult } from '../types';
import { ffdPacking } from './ffd';
import { gaPacking } from './ga';
import { saPacking } from './sa';
import { multiObjectivePacking, DEFAULT_MULTI_OBJECTIVE_CONFIG } from './multiObjective';

export const runPacking = (
  cargos: Cargo[],
  containerSpecs: ContainerSpec[],
  config: AlgorithmConfig
): PackingResult => {
  switch (config.type) {
    case 'GA':
      return gaPacking(cargos, containerSpecs, config.options as Record<string, unknown>);
    
    case 'SA':
      return saPacking(cargos, containerSpecs, config.options as Record<string, unknown>);
    
    case 'MultiObjective':
      return multiObjectivePacking(cargos, containerSpecs, {
        ...DEFAULT_MULTI_OBJECTIVE_CONFIG,
        ...config.options
      });
    
    case 'FFD':
    default:
      return ffdPacking(cargos, containerSpecs, config.options as Record<string, unknown>);
  }
};
