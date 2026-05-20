/**
 * 多集装箱联合优化算法
 * 
 * 功能：
 * 1. 自动计算所需集装箱数量
 * 2. 支持混合箱型配置
 * 3. 按重量、体积、目的地等维度分柜
 * 4. 优化整体空间利用率
 */

import { Cargo, Container, ContainerSpec, PackingResult, ContainerType } from '../types';
import { gaPacking, GAOptions } from './ga';
import { ContainerSpecs } from '../data/containerSpecs';

/**
 * 多柜优化配置
 */
export interface MultiContainerConfig {
  containerTypes?: ContainerType[];  // 可用箱型列表
  maxContainers?: number;            // 最大集装箱数量
  optimizationGoal?: 'minContainers' | 'maxUtilization';  // 优化目标
  groupingStrategy?: 'none' | 'weight' | 'destination' | 'priority';  // 分柜策略
  allowMixedTypes?: boolean;         // 是否允许混合箱型
  gaOptions?: GAOptions;
}

/**
 * 默认配置
 */
export const DEFAULT_MULTI_CONTAINER_CONFIG: MultiContainerConfig = {
  containerTypes: [ContainerType.DRY_20, ContainerType.DRY_40, ContainerType.HIGH_CUBE_40],
  maxContainers: 10,
  optimizationGoal: 'minContainers',
  groupingStrategy: 'none',
  allowMixedTypes: true,
  gaOptions: {
    populationSize: 50,
    generations: 50,
    timeLimit: 30
  }
};

/**
 * 计算货物总体积和总重量
 */
const calculateTotalStats = (cargos: Cargo[]): { volume: number; weight: number; count: number } => {
  let totalVolume = 0;
  let totalWeight = 0;
  let totalCount = 0;
  
  for (const cargo of cargos) {
    totalVolume += cargo.dimensions.length * cargo.dimensions.width * cargo.dimensions.height * cargo.quantity;
    totalWeight += cargo.weight * cargo.quantity;
    totalCount += cargo.quantity;
  }
  
  return { volume: totalVolume / 1_000_000_000, weight: totalWeight, count: totalCount };
};

/**
 * 估算所需集装箱数量
 */
const estimateContainerCount = (
  cargos: Cargo[],
  containerTypes: ContainerType[],
  config: MultiContainerConfig
): number => {
  const stats = calculateTotalStats(cargos);
  
  // 获取最小和最大容量的集装箱
  const specs = containerTypes.map(type => ContainerSpecs[type]).filter(Boolean);
  if (specs.length === 0) return 1;
  
  const minVolume = Math.min(...specs.map(s => s.volume));
  const maxVolume = Math.max(...specs.map(s => s.volume));
  const maxPayload = Math.max(...specs.map(s => s.maxPayload));
  
  // 按体积估算
  const volumeBasedCount = Math.ceil(stats.volume / minVolume);
  
  // 按重量估算
  const weightBasedCount = Math.ceil(stats.weight / maxPayload);
  
  // 返回较大值
  const estimatedCount = Math.max(volumeBasedCount, weightBasedCount);
  
  return Math.min(estimatedCount, config.maxContainers || 10);
};

/**
 * 按策略分组货物
 */
const groupCargos = (
  cargos: Cargo[],
  strategy: MultiContainerConfig['groupingStrategy']
): Cargo[][] => {
  if (strategy === 'none') {
    return [cargos];
  }
  
  if (strategy === 'weight') {
    // 按重量分组，每组不超过20000kg
    const groups: Cargo[][] = [];
    let currentGroup: Cargo[] = [];
    let currentWeight = 0;
    
    const sortedCargos = [...cargos].sort((a, b) => b.weight - a.weight);
    
    for (const cargo of sortedCargos) {
      const cargoWeight = cargo.weight * cargo.quantity;
      
      if (currentWeight + cargoWeight > 20000 && currentGroup.length > 0) {
        groups.push(currentGroup);
        currentGroup = [];
        currentWeight = 0;
      }
      
      currentGroup.push(cargo);
      currentWeight += cargoWeight;
    }
    
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    
    return groups;
  }
  
  if (strategy === 'destination') {
    // 按目的地分组（假设cargo有destination属性）
    const groups: Cargo[][] = [];
    const destinations = new Set<string>();
    
    cargos.forEach(cargo => {
      const dest = (cargo as unknown as { destination?: string }).destination || 'unknown';
      destinations.add(dest);
    });
    
    for (const dest of destinations) {
      groups.push(cargos.filter(c => {
        const cargoDest = (c as unknown as { destination?: string }).destination || 'unknown';
        return cargoDest === dest;
      }));
    }
    
    return groups;
  }
  
  if (strategy === 'priority') {
    // 按优先级分组
    const priorities = new Set<number>();
    cargos.forEach(cargo => priorities.add(cargo.priority || 0));
    
    const sortedPriorities = Array.from(priorities).sort((a, b) => b - a);
    
    return sortedPriorities.map(p => cargos.filter(c => c.priority === p));
  }
  
  return [cargos];
};

/**
 * 选择最佳箱型组合
 */
const selectBestContainerMix = (
  cargos: Cargo[],
  containerTypes: ContainerType[],
  targetCount: number
): ContainerSpec[] => {
  const stats = calculateTotalStats(cargos);
  
  // 如果只有一种箱型，直接返回
  if (containerTypes.length === 1) {
    return Array(targetCount).fill(ContainerSpecs[containerTypes[0]]);
  }
  
  // 尝试不同的箱型组合
  const combinations = generateCombinations(containerTypes, targetCount);
  let bestCombination: ContainerSpec[] = [];
  let bestScore = -Infinity;
  
  for (const combination of combinations) {
    const totalVolume = combination.reduce((sum, spec) => sum + spec.volume, 0);
    const totalPayload = combination.reduce((sum, spec) => sum + spec.maxPayload, 0);
    
    // 检查是否能装下所有货物
    if (totalVolume >= stats.volume && totalPayload >= stats.weight) {
      // 计算得分：优先使用大箱子（40HQ > 40GP > 20GP）
      const score = combination.reduce((sum, spec) => {
        if (spec.id === '40HQ') return sum + 3;
        if (spec.id === '40GP') return sum + 2;
        if (spec.id === '20GP') return sum + 1;
        return sum + 1;
      }, 0);
      
      if (score > bestScore) {
        bestScore = score;
        bestCombination = combination;
      }
    }
  }
  
  // 如果没有找到合适的组合，使用默认配置
  if (bestCombination.length === 0) {
    bestCombination = Array(targetCount).fill(ContainerSpecs[containerTypes[0]]);
  }
  
  return bestCombination;
};

/**
 * 生成箱型组合
 */
const generateCombinations = (types: ContainerType[], count: number): ContainerSpec[][] => {
  const combinations: ContainerSpec[][] = [];
  
  const generate = (current: ContainerSpec[], remaining: number) => {
    if (remaining === 0) {
      combinations.push([...current]);
      return;
    }
    
    for (const type of types) {
      current.push(ContainerSpecs[type]);
      generate(current, remaining - 1);
      current.pop();
    }
  };
  
  generate([], count);
  return combinations;
};

/**
 * 多柜联合优化主函数
 */
export const multiContainerPacking = (
  cargos: Cargo[],
  config: MultiContainerConfig = DEFAULT_MULTI_CONTAINER_CONFIG
): PackingResult => {
  const startTime = Date.now();
  const opts = { ...DEFAULT_MULTI_CONTAINER_CONFIG, ...config };
  
  // 获取可用箱型
  const availableTypes = opts.containerTypes || [ContainerType.DRY_20, ContainerType.DRY_40, ContainerType.HIGH_CUBE_40];
  
  // 估算所需集装箱数量
  const estimatedCount = estimateContainerCount(cargos, availableTypes, opts);
  
  // 选择最佳箱型组合
  const containerSpecs = selectBestContainerMix(cargos, availableTypes, estimatedCount);
  
  // 如果需要分组
  const cargoGroups = groupCargos(cargos, opts.groupingStrategy);
  
  // 执行装箱计算
  let results: PackingResult[] = [];
  
  if (cargoGroups.length > 1) {
    // 分组处理
    for (let i = 0; i < cargoGroups.length; i++) {
      const group = cargoGroups[i];
      const groupSpecs = containerSpecs.slice(i * Math.ceil(containerSpecs.length / cargoGroups.length));
      
      if (groupSpecs.length > 0) {
        const result = gaPacking(group, groupSpecs, opts.gaOptions);
        results.push(result);
      }
    }
  } else {
    // 整体处理
    const result = gaPacking(cargos, containerSpecs, opts.gaOptions);
    results.push(result);
  }
  
  // 合并结果
  const allContainers: Container[] = [];
  const allUnplacedCargos: Cargo[] = [];
  
  for (const result of results) {
    allContainers.push(...result.containers);
    allUnplacedCargos.push(...result.unplacedCargos);
  }
  
  // 计算总体统计
  const totalVolume = allContainers.reduce((sum, c) => sum + c.stats.totalVolume, 0);
  const usedVolume = allContainers.reduce((sum, c) => sum + c.stats.usedVolume, 0);
  const totalWeight = allContainers.reduce((sum, c) => sum + c.stats.totalWeight, 0);
  
  const totalCargos = cargos.reduce((sum, c) => sum + c.quantity, 0);
  
  const duration = Date.now() - startTime;
  
  return {
    id: `${Date.now()}-multi-container`,
    createdAt: new Date(),
    containers: allContainers,
    unplacedCargos: allUnplacedCargos,
    totalStats: {
      totalContainers: allContainers.length,
      totalCargos,
      placedCargos: totalCargos - allUnplacedCargos.length,
      unplacedCargos: allUnplacedCargos.length,
      totalVolume,
      usedVolume,
      volumeUtilization: totalVolume > 0 ? (usedVolume / (totalVolume * 1_000_000_000)) * 100 : 0,
      totalWeight
    },
    algorithm: `Multi-Container (${opts.optimizationGoal})`,
    duration
  };
};

/**
 * 获取推荐的集装箱配置
 */
export const getRecommendedContainers = (
  cargos: Cargo[],
  config: MultiContainerConfig = DEFAULT_MULTI_CONTAINER_CONFIG
): { containers: { type: ContainerType; count: number }[]; estimate: number } => {
  const opts = { ...DEFAULT_MULTI_CONTAINER_CONFIG, ...config };
  const availableTypes = opts.containerTypes || [ContainerType.DRY_20, ContainerType.DRY_40, ContainerType.HIGH_CUBE_40];
  const estimatedCount = estimateContainerCount(cargos, availableTypes, opts);
  
  // 推荐配置
  const recommendation: { type: ContainerType; count: number }[] = [];
  
  if (estimatedCount <= 2) {
    // 少量货物，推荐20GP或40GP
    recommendation.push({ type: estimatedCount === 1 ? ContainerType.DRY_20 : ContainerType.DRY_40, count: 1 });
  } else {
    // 大量货物，优先使用40HQ
    const hqCount = Math.floor(estimatedCount * 0.7);
    const gpCount = estimatedCount - hqCount;
    
    if (hqCount > 0) {
      recommendation.push({ type: ContainerType.HIGH_CUBE_40, count: hqCount });
    }
    if (gpCount > 0) {
      recommendation.push({ type: ContainerType.DRY_40, count: gpCount });
    }
  }
  
  return {
    containers: recommendation,
    estimate: estimatedCount
  };
};

export default {
  multiContainerPacking,
  getRecommendedContainers,
  DEFAULT_MULTI_CONTAINER_CONFIG
};
