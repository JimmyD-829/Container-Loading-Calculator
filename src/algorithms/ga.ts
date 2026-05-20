/**
 * 遗传算法 (Genetic Algorithm) 装箱优化
 * 
 * 算法原理：
 * 1. 初始化种群：随机生成一组装箱方案
 * 2. 选择：选择适应度高的个体进行繁殖
 * 3. 交叉：随机交换两个个体的部分基因
 * 4. 变异：随机改变个体的某些基因
 * 5. 迭代：重复2-4步骤直到达到终止条件
 * 
 * 适应度函数考虑：
 * - 空间利用率
 * - 重心平衡
 * - 约束满足程度
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
 * 遗传算法参数
 */
export interface GAOptions {
  populationSize?: number;      // 种群大小
  generations?: number;         // 迭代代数
  crossoverRate?: number;       // 交叉概率
  mutationRate?: number;        // 变异概率
  elitism?: number;             // 精英保留数量
  allowRotation?: boolean;      // 是否允许旋转
  timeLimit?: number;           // 时间限制（秒）
}

export const DEFAULT_GA_OPTIONS: GAOptions = {
  populationSize: 50,
  generations: 100,
  crossoverRate: 0.8,
  mutationRate: 0.1,
  elitism: 5,
  allowRotation: true,
  timeLimit: 30
};

/**
 * 个体（装箱方案）
 */
interface Individual {
  genes: Gene[];
  fitness: number;
  containerSpec: ContainerSpec;
}

interface Gene {
  cargoId: string;
  containerIndex: number;
  position: { x: number; y: number; z: number };
  rotation: RotationState;
}

/**
 * 初始化种群
 */
const initializePopulation = (
  cargos: Cargo[],
  containerSpecs: ContainerSpec[],
  options: GAOptions
): Individual[] => {
  const population: Individual[] = [];
  const popSize = (options.populationSize ?? DEFAULT_GA_OPTIONS.populationSize) as number;
  const allowRotation = (options.allowRotation ?? DEFAULT_GA_OPTIONS.allowRotation) as boolean;
  
  for (let i = 0; i < popSize; i++) {
    const genes: Gene[] = [];
    const usedContainers = new Set<number>();
    
    for (const cargo of cargos) {
      for (let j = 0; j < cargo.quantity; j++) {
        const containerIndex = Math.floor(Math.random() * containerSpecs.length);
        usedContainers.add(containerIndex);
        
        const containerSpec = containerSpecs[containerIndex];
        const rotation = allowRotation && cargo.rotatable 
          ? ROTATIONS[Math.floor(Math.random() * ROTATIONS.length)]
          : { x: 0, y: 0, z: 0 };
        
        const dims = applyRotation(cargo.dimensions, rotation);
        
        genes.push({
          cargoId: `${cargo.id}-${j}`,
          containerIndex,
          position: {
            x: Math.random() * (containerSpec.innerDimensions.length - dims.length),
            y: Math.random() * (containerSpec.innerDimensions.width - dims.width),
            z: Math.random() * (containerSpec.innerDimensions.height - dims.height)
          },
          rotation
        });
      }
    }
    
    const individual: Individual = {
      genes,
      fitness: 0,
      containerSpec: containerSpecs[0]
    };
    
    individual.fitness = calculateFitness(individual, cargos, containerSpecs);
    population.push(individual);
  }
  
  return population;
};

/**
 * 计算适应度
 */
const calculateFitness = (
  individual: Individual,
  cargos: Cargo[],
  containerSpecs: ContainerSpec[]
): number => {
  let fitness = 0;
  let totalVolume = 0;
  let usedVolume = 0;
  let constraintPenalty = 0;
  
  const containers: PlacedCargo[][] = containerSpecs.map(() => []);
  
  for (const gene of individual.genes) {
    const cargo = cargos.find(c => gene.cargoId.startsWith(c.id));
    if (!cargo) continue;
    
    const placedCargo: PlacedCargo = {
      ...cargo,
      id: gene.cargoId,
      position: gene.position,
      rotation: gene.rotation,
      placedQuantity: 1,
      containerId: `container-${gene.containerIndex}`
    };
    
    containers[gene.containerIndex].push(placedCargo);
  }
  
  for (let i = 0; i < containers.length; i++) {
    const placedCargos = containers[i];
    const spec = containerSpecs[i];
    
    totalVolume += spec.volume * 1_000_000_000;
    
    for (const cargo of placedCargos) {
      usedVolume += calculateVolume(cargo.dimensions);
      
      // 边界约束惩罚
      if (!checkBoundary(cargo, spec)) {
        constraintPenalty += 1000;
      }
      
      // 重叠约束惩罚
      for (const other of placedCargos) {
        if (cargo.id !== other.id && checkOverlap(cargo, other)) {
          constraintPenalty += 500;
        }
      }
    }
    
    // 重心偏移惩罚
    const cogOffset = calculateCogOffset(placedCargos, spec);
    constraintPenalty += cogOffset * 10;
  }
  
  const utilization = totalVolume > 0 ? usedVolume / totalVolume : 0;
  fitness = utilization * 1000 - constraintPenalty;
  
  return Math.max(0, fitness);
};

/**
 * 选择操作（轮盘赌法）
 */
const select = (population: Individual[]): Individual => {
  const totalFitness = population.reduce((sum, ind) => sum + ind.fitness, 0);
  let random = Math.random() * totalFitness;
  
  for (const individual of population) {
    random -= individual.fitness;
    if (random <= 0) {
      return individual;
    }
  }
  
  return population[population.length - 1];
};

/**
 * 交叉操作
 */
const crossover = (parent1: Individual, parent2: Individual): Individual => {
  const child: Individual = {
    genes: [],
    fitness: 0,
    containerSpec: parent1.containerSpec
  };
  
  const crossoverPoint = Math.floor(Math.random() * Math.min(parent1.genes.length, parent2.genes.length));
  
  for (let i = 0; i < parent1.genes.length; i++) {
    if (i < crossoverPoint) {
      child.genes.push({ ...parent1.genes[i] });
    } else if (i < parent2.genes.length) {
      child.genes.push({ ...parent2.genes[i] });
    }
  }
  
  return child;
};

/**
 * 变异操作
 */
const mutate = (
  individual: Individual,
  containerSpecs: ContainerSpec[],
  options: GAOptions
): void => {
  const mutRate = (options.mutationRate ?? DEFAULT_GA_OPTIONS.mutationRate) as number;
  const allowRotationVal = (options.allowRotation ?? DEFAULT_GA_OPTIONS.allowRotation) as boolean;
  
  for (const gene of individual.genes) {
    if (Math.random() < mutRate) {
      // 随机改变容器索引
      gene.containerIndex = Math.floor(Math.random() * containerSpecs.length);
      
      const spec = containerSpecs[gene.containerIndex];
      
      // 随机改变位置
      if (Math.random() < 0.5) {
        const cargo = { dimensions: { length: 1000, width: 1000, height: 1000 } };
        gene.position = {
          x: Math.random() * (spec.innerDimensions.length - 1000),
          y: Math.random() * (spec.innerDimensions.width - 1000),
          z: Math.random() * (spec.innerDimensions.height - 1000)
        };
      }
      
      // 随机改变旋转
      if (allowRotationVal && Math.random() < 0.5) {
        gene.rotation = ROTATIONS[Math.floor(Math.random() * ROTATIONS.length)];
      }
    }
  }
};

/**
 * 创建集装箱实例
 */
const createContainer = (spec: ContainerSpec): Container => {
  return {
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
  };
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
 * GA装箱算法主函数
 */
export const gaPacking = (
  cargos: Cargo[],
  containerSpecs: ContainerSpec[],
  options: GAOptions = {}
): PackingResult => {
  const startTime = Date.now();
  const opts = { ...DEFAULT_GA_OPTIONS, ...options };
  
  // 展开货物列表
  const expandedCargos: Cargo[] = [];
  for (const cargo of cargos) {
    for (let i = 0; i < cargo.quantity; i++) {
      expandedCargos.push({ ...cargo, id: `${cargo.id}-${i}`, quantity: 1 });
    }
  }
  
  // 初始化种群
  let population = initializePopulation(expandedCargos, containerSpecs, opts);
  
  // 进化迭代
  const startTimeMs = Date.now();
  const generations = opts.generations!;
  const elitism = opts.elitism!;
  const populationSize = opts.populationSize!;
  const crossoverRate = opts.crossoverRate!;
  
  for (let gen = 0; gen < generations; gen++) {
    // 检查时间限制
    if (opts.timeLimit && (Date.now() - startTimeMs) / 1000 > opts.timeLimit) {
      break;
    }
    
    // 排序种群
    population.sort((a, b) => b.fitness - a.fitness);
    
    // 保留精英
    const newPopulation = population.slice(0, elitism);
    
    // 生成新个体
    while (newPopulation.length < populationSize) {
      const parent1 = select(population);
      const parent2 = select(population);
      
      let child: Individual;
      if (Math.random() < crossoverRate) {
        child = crossover(parent1, parent2);
      } else {
        child = { ...parent1, genes: parent1.genes.map(g => ({ ...g })) };
      }
      
      mutate(child, containerSpecs, opts);
      child.fitness = calculateFitness(child, expandedCargos, containerSpecs);
      
      newPopulation.push(child);
    }
    
    population = newPopulation;
  }
  
  // 获取最优个体
  population.sort((a, b) => b.fitness - a.fitness);
  const bestIndividual = population[0];
  
  // 转换为装箱结果
  const containers: Container[] = containerSpecs.map(spec => createContainer(spec));
  const unplacedCargos: Cargo[] = [];
  
  const cargoMap = new Map<string, Cargo>();
  expandedCargos.forEach(c => cargoMap.set(c.id, c));
  
  for (const gene of bestIndividual.genes) {
    const cargo = cargoMap.get(gene.cargoId);
    if (!cargo) continue;
    
    const placedCargo: PlacedCargo = {
      ...cargo,
      id: gene.cargoId,
      position: gene.position,
      rotation: gene.rotation,
      placedQuantity: 1,
      containerId: containers[gene.containerIndex].id
    };
    
    // 验证约束
    const isValid = checkBoundary(placedCargo, containers[gene.containerIndex].spec);
    if (isValid) {
      containers[gene.containerIndex].placedCargos.push(placedCargo);
    } else {
      unplacedCargos.push(cargo);
    }
  }
  
  // 更新统计信息
  for (const container of containers) {
    updateContainerStats(container);
  }
  
  // 过滤空容器
  const usedContainers = containers.filter(c => c.placedCargos.length > 0);
  
  const totalVolume = usedContainers.reduce((sum, c) => sum + c.stats.totalVolume, 0);
  const usedVolume = usedContainers.reduce((sum, c) => sum + c.stats.usedVolume, 0);
  const totalWeight = usedContainers.reduce((sum, c) => sum + c.stats.totalWeight, 0);
  
  const duration = Date.now() - startTime;
  
  return {
    id: generateId(),
    createdAt: new Date(),
    containers: usedContainers,
    unplacedCargos,
    totalStats: {
      totalContainers: usedContainers.length,
      totalCargos: expandedCargos.length,
      placedCargos: expandedCargos.length - unplacedCargos.length,
      unplacedCargos: unplacedCargos.length,
      totalVolume,
      usedVolume,
      volumeUtilization: totalVolume > 0 ? (usedVolume / (totalVolume * 1_000_000_000)) * 100 : 0,
      totalWeight
    },
    algorithm: 'GA (Genetic Algorithm)',
    duration
  };
};

export default {
  gaPacking,
  DEFAULT_GA_OPTIONS
};
