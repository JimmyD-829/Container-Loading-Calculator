/**
 * 模拟退火算法 (Simulated Annealing) 装箱优化
 * 
 * 算法原理：
 * 1. 从一个初始解开始
 * 2. 随机扰动当前解，生成邻域解
 * 3. 根据Metropolis准则决定是否接受新解
 * 4. 逐渐降低温度，重复步骤2-3直到收敛
 * 
 * 温度衰减策略：指数衰减
 * 终止条件：温度达到阈值或达到最大迭代次数
 */

import { Cargo, Container, ContainerSpec, PlacedCargo, PackingResult, Dimensions, RotationState } from '../types';

/**
 * 生成唯一ID
 */
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 计算体积
 */
const calculateVolume = (dims: Dimensions): number => {
  return dims.length * dims.width * dims.height;
};

/**
 * 6种旋转方向
 */
const ROTATIONS: RotationState[] = [
  { x: 0, y: 0, z: 0 },
  { x: 90, y: 0, z: 0 },
  { x: 0, y: 90, z: 0 },
  { x: 0, y: 0, z: 90 },
  { x: 90, y: 90, z: 0 },
  { x: 90, y: 0, z: 90 }
];

/**
 * 应用旋转变换后的尺寸
 */
const applyRotation = (dims: Dimensions, rotation: RotationState): Dimensions => {
  const { length: l, width: w, height: h } = dims;
  const dimsArray = [l, w, h];
  
  if (rotation.x === 90 || rotation.x === 270) {
    dimsArray[1] = h;
    dimsArray[2] = w;
  }
  
  if (rotation.y === 90 || rotation.y === 270) {
    dimsArray[0] = h;
    dimsArray[2] = l;
  }
  
  if (rotation.z === 90 || rotation.z === 270) {
    dimsArray[0] = w;
    dimsArray[1] = l;
  }
  
  return {
    length: dimsArray[0],
    width: dimsArray[1],
    height: dimsArray[2]
  };
};

/**
 * 检查两个货物是否重叠
 */
const checkOverlap = (cargo1: PlacedCargo, cargo2: PlacedCargo): boolean => {
  const dims1 = applyRotation(cargo1.dimensions, cargo1.rotation);
  const dims2 = applyRotation(cargo2.dimensions, cargo2.rotation);
  
  return !(
    cargo1.position.x + dims1.length <= cargo2.position.x ||
    cargo2.position.x + dims2.length <= cargo1.position.x ||
    cargo1.position.y + dims1.width <= cargo2.position.y ||
    cargo2.position.y + dims2.width <= cargo1.position.y ||
    cargo1.position.z + dims1.height <= cargo2.position.z ||
    cargo2.position.z + dims2.height <= cargo1.position.z
  );
};

/**
 * 检查货物是否超出边界
 */
const checkBoundary = (cargo: PlacedCargo, containerSpec: ContainerSpec): boolean => {
  const dims = applyRotation(cargo.dimensions, cargo.rotation);
  
  return (
    cargo.position.x >= 0 &&
    cargo.position.y >= 0 &&
    cargo.position.z >= 0 &&
    cargo.position.x + dims.length <= containerSpec.innerDimensions.length &&
    cargo.position.y + dims.width <= containerSpec.innerDimensions.width &&
    cargo.position.z + dims.height <= containerSpec.innerDimensions.height
  );
};

/**
 * 计算重心偏移
 */
const calculateCogOffset = (placedCargos: PlacedCargo[], containerSpec: ContainerSpec): number => {
  if (placedCargos.length === 0) return 0;
  
  const center = {
    x: containerSpec.innerDimensions.length / 2,
    y: containerSpec.innerDimensions.width / 2,
    z: containerSpec.innerDimensions.height / 2
  };
  
  let totalWeight = 0;
  let weightedX = 0;
  let weightedY = 0;
  
  for (const cargo of placedCargos) {
    const weight = cargo.weight * cargo.placedQuantity;
    totalWeight += weight;
    const dims = applyRotation(cargo.dimensions, cargo.rotation);
    weightedX += (cargo.position.x + dims.length / 2) * weight;
    weightedY += (cargo.position.y + dims.width / 2) * weight;
  }
  
  const cogX = weightedX / totalWeight - center.x;
  const cogY = weightedY / totalWeight - center.y;
  
  return Math.sqrt(cogX * cogX + cogY * cogY);
};

/**
 * 模拟退火参数
 */
export interface SAOptions {
  initialTemperature?: number;  // 初始温度
  coolingRate?: number;         // 冷却速率
  minTemperature?: number;      // 最低温度
  iterationsPerTemp?: number;   // 每温度迭代次数
  allowRotation?: boolean;      // 是否允许旋转
  timeLimit?: number;           // 时间限制（秒）
}

export const DEFAULT_SA_OPTIONS: SAOptions = {
  initialTemperature: 1000,
  coolingRate: 0.95,
  minTemperature: 1,
  iterationsPerTemp: 50,
  allowRotation: true,
  timeLimit: 30
};

/**
 * 装箱状态
 */
interface PackingState {
  containers: Container[];
  fitness: number;
}

/**
 * 计算适应度
 */
const calculateFitness = (containers: Container[], containerSpecs: ContainerSpec[]): number => {
  let fitness = 0;
  let totalVolume = 0;
  let usedVolume = 0;
  let constraintPenalty = 0;
  
  for (let i = 0; i < containers.length; i++) {
    const container = containers[i];
    const spec = containerSpecs[i];
    
    totalVolume += spec.volume * 1_000_000_000;
    
    for (const cargo of container.placedCargos) {
      usedVolume += calculateVolume(cargo.dimensions) * cargo.placedQuantity;
      
      // 边界约束惩罚
      if (!checkBoundary(cargo, spec)) {
        constraintPenalty += 1000;
      }
      
      // 重叠约束惩罚
      for (const other of container.placedCargos) {
        if (cargo.id !== other.id && checkOverlap(cargo, other)) {
          constraintPenalty += 500;
        }
      }
    }
    
    // 重心偏移惩罚
    const cogOffset = calculateCogOffset(container.placedCargos, spec);
    constraintPenalty += cogOffset * 10;
  }
  
  const utilization = totalVolume > 0 ? usedVolume / totalVolume : 0;
  fitness = utilization * 1000 - constraintPenalty;
  
  return Math.max(0, fitness);
};

/**
 * 创建初始解
 */
const createInitialSolution = (
  cargos: Cargo[],
  containerSpecs: ContainerSpec[],
  options: SAOptions
): Container[] => {
  const containers: Container[] = containerSpecs.map(spec => ({
    id: generateId(),
    spec,
    placedCargos: [],
    remainingSpace: [{
      position: { x: 0, y: 0, z: 0 },
      dimensions: { ...spec.innerDimensions }
    }],
    stats: {
      totalVolume: spec.volume,
      usedVolume: 0,
      volumeUtilization: 0,
      totalWeight: 0,
      weightUtilization: 0,
      cargoCount: 0
    }
  }));
  
  // 展开货物
  const expandedCargos: Cargo[] = [];
  for (const cargo of cargos) {
    for (let i = 0; i < cargo.quantity; i++) {
      expandedCargos.push({ ...cargo, id: `${cargo.id}-${i}`, quantity: 1 });
    }
  }
  
  // 随机分配货物到容器
  for (const cargo of expandedCargos) {
    const containerIndex = Math.floor(Math.random() * containerSpecs.length);
    const container = containers[containerIndex];
    const spec = containerSpecs[containerIndex];
    
    const rotation = options.allowRotation && cargo.rotatable
      ? ROTATIONS[Math.floor(Math.random() * ROTATIONS.length)]
      : { x: 0, y: 0, z: 0 };
    
    const dims = applyRotation(cargo.dimensions, rotation);
    
    const placedCargo: PlacedCargo = {
      ...cargo,
      id: cargo.id,
      position: {
        x: Math.random() * Math.max(0, spec.innerDimensions.length - dims.length),
        y: Math.random() * Math.max(0, spec.innerDimensions.width - dims.width),
        z: Math.random() * Math.max(0, spec.innerDimensions.height - dims.height)
      },
      rotation,
      placedQuantity: 1,
      containerId: container.id
    };
    
    container.placedCargos.push(placedCargo);
  }
  
  // 更新统计信息
  for (const container of containers) {
    updateContainerStats(container);
  }
  
  return containers;
};

/**
 * 更新集装箱统计信息
 */
const updateContainerStats = (container: Container): void => {
  const usedVolume = container.placedCargos.reduce((sum, cargo) => {
    return sum + calculateVolume(cargo.dimensions) * cargo.placedQuantity;
  }, 0);
  
  const totalWeight = container.placedCargos.reduce((sum, cargo) => {
    return sum + cargo.weight * cargo.placedQuantity;
  }, 0);
  
  container.stats = {
    totalVolume: container.spec.volume,
    usedVolume,
    volumeUtilization: (usedVolume / (container.spec.volume * 1_000_000_000)) * 100,
    totalWeight,
    weightUtilization: (totalWeight / container.spec.maxPayload) * 100,
    cargoCount: container.placedCargos.length
  };
};

/**
 * 生成邻域解（随机扰动）
 */
const generateNeighbor = (
  containers: Container[],
  containerSpecs: ContainerSpec[],
  options: SAOptions
): Container[] => {
  const newContainers = containers.map(container => ({
    ...container,
    placedCargos: container.placedCargos.map(cargo => ({ ...cargo }))
  }));
  
  // 随机选择一个操作
  const operation = Math.random();
  
  if (operation < 0.4) {
    // 移动货物到不同位置
    const containerIndex = Math.floor(Math.random() * newContainers.length);
    const container = newContainers[containerIndex];
    
    if (container.placedCargos.length > 0) {
      const cargoIndex = Math.floor(Math.random() * container.placedCargos.length);
      const cargo = container.placedCargos[cargoIndex];
      const spec = containerSpecs[containerIndex];
      const dims = applyRotation(cargo.dimensions, cargo.rotation);
      
      cargo.position = {
        x: Math.random() * Math.max(0, spec.innerDimensions.length - dims.length),
        y: Math.random() * Math.max(0, spec.innerDimensions.width - dims.width),
        z: Math.random() * Math.max(0, spec.innerDimensions.height - dims.height)
      };
    }
  } else if (operation < 0.7) {
    // 改变货物旋转
    if (options.allowRotation) {
      const containerIndex = Math.floor(Math.random() * newContainers.length);
      const container = newContainers[containerIndex];
      
      if (container.placedCargos.length > 0) {
        const cargoIndex = Math.floor(Math.random() * container.placedCargos.length);
        const cargo = container.placedCargos[cargoIndex];
        
        if (cargo.rotatable) {
          cargo.rotation = ROTATIONS[Math.floor(Math.random() * ROTATIONS.length)];
        }
      }
    }
  } else {
    // 移动货物到另一个容器
    if (newContainers.length > 1) {
      const sourceIndex = Math.floor(Math.random() * newContainers.length);
      let targetIndex = Math.floor(Math.random() * newContainers.length);
      
      while (targetIndex === sourceIndex && newContainers.length > 1) {
        targetIndex = Math.floor(Math.random() * newContainers.length);
      }
      
      const sourceContainer = newContainers[sourceIndex];
      const targetContainer = newContainers[targetIndex];
      
      if (sourceContainer.placedCargos.length > 0) {
        const cargoIndex = Math.floor(Math.random() * sourceContainer.placedCargos.length);
        const cargo = sourceContainer.placedCargos.splice(cargoIndex, 1)[0];
        
        const spec = containerSpecs[targetIndex];
        const dims = applyRotation(cargo.dimensions, cargo.rotation);
        
        cargo.position = {
          x: Math.random() * Math.max(0, spec.innerDimensions.length - dims.length),
          y: Math.random() * Math.max(0, spec.innerDimensions.width - dims.width),
          z: Math.random() * Math.max(0, spec.innerDimensions.height - dims.height)
        };
        cargo.containerId = targetContainer.id;
        
        targetContainer.placedCargos.push(cargo);
      }
    }
  }
  
  return newContainers;
};

/**
 * SA装箱算法主函数
 */
export const saPacking = (
  cargos: Cargo[],
  containerSpecs: ContainerSpec[],
  options: SAOptions = {}
): PackingResult => {
  const startTime = Date.now();
  const opts = { ...DEFAULT_SA_OPTIONS, ...options };
  
  // 创建初始解
  let currentSolution = createInitialSolution(cargos, containerSpecs, opts);
  let currentFitness = calculateFitness(currentSolution, containerSpecs);
  
  let bestSolution = currentSolution.map(c => ({
    ...c,
    placedCargos: c.placedCargos.map(cargo => ({ ...cargo }))
  }));
  let bestFitness = currentFitness;
  
  const temperature = opts.initialTemperature!;
  const minTemperature = opts.minTemperature!;
  const iterationsPerTemp = opts.iterationsPerTemp!;
  const coolingRate = opts.coolingRate!;
  
  let currentTemp = temperature;
  
  const startTimeMs = Date.now();
  
  // 模拟退火主循环
  while (currentTemp > minTemperature) {
    // 检查时间限制
    if (opts.timeLimit && (Date.now() - startTimeMs) / 1000 > opts.timeLimit) {
      break;
    }
    
    for (let i = 0; i < iterationsPerTemp; i++) {
      // 生成邻域解
      const newSolution = generateNeighbor(currentSolution, containerSpecs, opts);
      const newFitness = calculateFitness(newSolution, containerSpecs);
      
      // 计算能量差
      const delta = newFitness - currentFitness;
      
      // Metropolis准则
      if (delta > 0 || Math.random() < Math.exp(delta / currentTemp)) {
        currentSolution = newSolution;
        currentFitness = newFitness;
        
        // 更新最优解
        if (currentFitness > bestFitness) {
          bestSolution = currentSolution.map(c => ({
            ...c,
            placedCargos: c.placedCargos.map(cargo => ({ ...cargo }))
          }));
          bestFitness = currentFitness;
        }
      }
    }
    
    // 温度衰减
    currentTemp *= coolingRate;
  }
  
  // 过滤空容器
  const usedContainers = bestSolution.filter(c => c.placedCargos.length > 0);
  
  // 更新统计信息
  for (const container of usedContainers) {
    updateContainerStats(container);
  }
  
  const totalVolume = usedContainers.reduce((sum, c) => sum + c.stats.totalVolume, 0);
  const usedVolume = usedContainers.reduce((sum, c) => sum + c.stats.usedVolume, 0);
  const totalWeight = usedContainers.reduce((sum, c) => sum + c.stats.totalWeight, 0);
  
  // 展开货物列表用于统计
  let totalCargos = 0;
  for (const cargo of cargos) {
    totalCargos += cargo.quantity;
  }
  
  const duration = Date.now() - startTime;
  
  return {
    id: generateId(),
    createdAt: new Date(),
    containers: usedContainers,
    unplacedCargos: [],
    totalStats: {
      totalContainers: usedContainers.length,
      totalCargos,
      placedCargos: totalCargos,
      unplacedCargos: 0,
      totalVolume,
      usedVolume,
      volumeUtilization: totalVolume > 0 ? (usedVolume / (totalVolume * 1_000_000_000)) * 100 : 0,
      totalWeight
    },
    algorithm: 'SA (Simulated Annealing)',
    duration
  };
};

export default {
  saPacking,
  DEFAULT_SA_OPTIONS
};
