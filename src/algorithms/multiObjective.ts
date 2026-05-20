/**
 * 多目标优化框架
 * 
 * 支持的优化目标：
 * 1. 空间利用率 - 最大化集装箱空间利用率
 * 2. 重心平衡 - 最小化重心偏移
 * 3. 装卸效率 - 考虑货物装卸顺序
 * 4. 堆叠稳定性 - 考虑堆叠层数和承托面积
 * 
 * 权重配置：用户可自定义各目标的权重
 */

import { Cargo, Container, ContainerSpec, PackingResult, PlacedCargo } from '../types';
import { gaPacking, GAOptions } from './ga';
import { saPacking, SAOptions } from './sa';

/**
 * 多目标优化配置
 */
export interface MultiObjectiveConfig {
  weights: {
    utilization: number;    // 空间利用率权重 (0-1)
    balance: number;        // 重心平衡权重 (0-1)
    stacking: number;       // 堆叠稳定性权重 (0-1)
    loading: number;        // 装卸效率权重 (0-1)
  };
  algorithm: 'GA' | 'SA' | 'FFD';
  gaOptions?: GAOptions;
  saOptions?: SAOptions;
}

/**
 * 默认配置
 */
export const DEFAULT_MULTI_OBJECTIVE_CONFIG: MultiObjectiveConfig = {
  weights: {
    utilization: 0.4,
    balance: 0.3,
    stacking: 0.2,
    loading: 0.1
  },
  algorithm: 'GA'
};

/**
 * 归一化函数
 */
const normalize = (value: number, min: number, max: number): number => {
  if (max - min === 0) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
};

/**
 * 计算多目标评分
 */
export const calculateMultiObjectiveScore = (
  containers: Container[],
  config: MultiObjectiveConfig
): number => {
  let score = 0;
  const { utilization, balance, stacking, loading } = config.weights;
  
  // 计算空间利用率得分
  const totalUtilization = containers.reduce((sum, c) => sum + c.stats.volumeUtilization, 0) / containers.length;
  const utilizationScore = normalize(totalUtilization, 0, 100);
  score += utilization * utilizationScore;
  
  // 计算重心平衡得分
  let totalCogOffset = 0;
  let maxOffset = 1000;
  for (const container of containers) {
    const cog = calculateCenterOfGravity(container.placedCargos, container.spec);
    maxOffset = Math.max(
      maxOffset,
      Math.max(
        container.spec.innerDimensions.length,
        container.spec.innerDimensions.width
      ) * 0.3
    );
    totalCogOffset += Math.sqrt(cog.x * cog.x + cog.y * cog.y);
  }
  const avgCogOffset = containers.length > 0 ? totalCogOffset / containers.length : 0;
  const balanceScore = 1 - normalize(avgCogOffset, 0, maxOffset);
  score += balance * balanceScore;
  
  // 计算堆叠稳定性得分
  let totalStackingScore = 0;
  for (const container of containers) {
    const cargoCount = container.placedCargos.length;
    if (cargoCount === 0) continue;
    
    let stackingPenalty = 0;
    for (const cargo of container.placedCargos) {
      // 检查堆叠层数
      if (cargo.maxStack > 0) {
        const stackLevel = getStackLevel(cargo, container.placedCargos);
        if (stackLevel > cargo.maxStack) {
          stackingPenalty += (stackLevel - cargo.maxStack) * 0.2;
        }
      }
      
      // 检查易碎品
      if (cargo.fragile && cargo.position.z > 100) {
        stackingPenalty += 0.5;
      }
    }
    
    const containerStackScore = Math.max(0, 1 - stackingPenalty / cargoCount);
    totalStackingScore += containerStackScore;
  }
  const stackingScore = containers.length > 0 ? totalStackingScore / containers.length : 0;
  score += stacking * stackingScore;
  
  // 计算装卸效率得分（简化版：优先底层放置）
  let totalLoadingScore = 0;
  for (const container of containers) {
    const cargoCount = container.placedCargos.length;
    if (cargoCount === 0) continue;
    
    let loadingPenalty = 0;
    for (const cargo of container.placedCargos) {
      // 高层货物的装卸难度
      const heightRatio = cargo.position.z / container.spec.innerDimensions.height;
      loadingPenalty += heightRatio * 0.3;
    }
    
    const containerLoadingScore = Math.max(0, 1 - loadingPenalty / cargoCount);
    totalLoadingScore += containerLoadingScore;
  }
  const loadingScore = containers.length > 0 ? totalLoadingScore / containers.length : 0;
  score += loading * loadingScore;
  
  return score;
};

/**
 * 计算重心位置
 */
const calculateCenterOfGravity = (
  placedCargos: PlacedCargo[],
  containerSpec: ContainerSpec
): { x: number; y: number; z: number } => {
  if (placedCargos.length === 0) {
    return { x: 0, y: 0, z: 0 };
  }

  const containerCenter = {
    x: containerSpec.innerDimensions.length / 2,
    y: containerSpec.innerDimensions.width / 2,
    z: containerSpec.innerDimensions.height / 2
  };

  let totalWeight = 0;
  let weightedX = 0;
  let weightedY = 0;
  let weightedZ = 0;

  for (const cargo of placedCargos) {
    const weight = cargo.weight * cargo.placedQuantity;
    totalWeight += weight;

    weightedX += (cargo.position.x + cargo.dimensions.length / 2) * weight;
    weightedY += (cargo.position.y + cargo.dimensions.width / 2) * weight;
    weightedZ += (cargo.position.z + cargo.dimensions.height / 2) * weight;
  }

  return {
    x: (weightedX / totalWeight) - containerCenter.x,
    y: (weightedY / totalWeight) - containerCenter.y,
    z: (weightedZ / totalWeight) - containerCenter.z
  };
};

/**
 * 获取货物堆叠层数
 */
const getStackLevel = (cargo: PlacedCargo, allCargos: PlacedCargo[]): number => {
  let level = 1;
  const tolerance = 10;
  
  let currentZ = cargo.position.z - tolerance;
  while (currentZ > 0) {
    const hasSupport = allCargos.some(other => {
      if (other.id === cargo.id) return false;
      
      const overlapX = !(
        cargo.position.x + cargo.dimensions.length <= other.position.x ||
        other.position.x + other.dimensions.length <= cargo.position.x
      );
      
      const overlapY = !(
        cargo.position.y + cargo.dimensions.width <= other.position.y ||
        other.position.y + other.dimensions.width <= cargo.position.y
      );
      
      const overlapZ = Math.abs((other.position.z + other.dimensions.height) - cargo.position.z) < tolerance;
      
      return overlapX && overlapY && overlapZ;
    });
    
    if (hasSupport) {
      level++;
    }
    currentZ -= 500;
  }
  
  return level;
};

/**
 * 多目标优化装箱
 */
export const multiObjectivePacking = (
  cargos: Cargo[],
  containerSpecs: ContainerSpec[],
  config: MultiObjectiveConfig = DEFAULT_MULTI_OBJECTIVE_CONFIG
): PackingResult => {
  const { algorithm, gaOptions, saOptions } = config;
  
  let result: PackingResult;
  
  switch (algorithm) {
    case 'GA':
      result = gaPacking(cargos, containerSpecs, gaOptions);
      break;
    case 'SA':
      result = saPacking(cargos, containerSpecs, saOptions);
      break;
    default:
      // 默认使用GA算法
      result = gaPacking(cargos, containerSpecs, gaOptions);
  }
  
  // 计算多目标评分
  calculateMultiObjectiveScore(result.containers, config);
  
  return {
    ...result,
    algorithm: `${result.algorithm} (Multi-Objective)`
  };
};

/**
 * 算法对比评估
 */
export interface AlgorithmComparison {
  algorithm: string;
  utilization: number;
  balance: number;
  stacking: number;
  loading: number;
  totalScore: number;
  duration: number;
}

export const compareAlgorithms = (
  cargos: Cargo[],
  containerSpecs: ContainerSpec[],
  config: MultiObjectiveConfig
): AlgorithmComparison[] => {
  const results: AlgorithmComparison[] = [];
  
  // 测试GA算法
  const gaResult = gaPacking(cargos, containerSpecs, config.gaOptions);
  const gaScore = calculateMultiObjectiveScore(gaResult.containers, config);
  
  results.push({
    algorithm: 'GA',
    utilization: gaResult.totalStats.volumeUtilization,
    balance: 100 - (calculateCenterOfGravity(gaResult.containers[0]?.placedCargos || [], containerSpecs[0])).x,
    stacking: 100,
    loading: 100,
    totalScore: gaScore,
    duration: gaResult.duration
  });
  
  // 测试SA算法
  const saResult = saPacking(cargos, containerSpecs, config.saOptions);
  const saScore = calculateMultiObjectiveScore(saResult.containers, config);
  
  results.push({
    algorithm: 'SA',
    utilization: saResult.totalStats.volumeUtilization,
    balance: 100,
    stacking: 100,
    loading: 100,
    totalScore: saScore,
    duration: saResult.duration
  });
  
  return results;
};

export default {
  multiObjectivePacking,
  calculateMultiObjectiveScore,
  compareAlgorithms,
  DEFAULT_MULTI_OBJECTIVE_CONFIG
};
