/**
 * 集装箱装载计算工具 - FFD (First Fit Decreasing) 3D装箱算法
 * 
 * 算法说明：
 * 1. 将货物按体积降序排序（大的先装）
 * 2. 对每个货物，尝试放入第一个能容纳它的集装箱
 * 3. 如果没有集装箱能容纳，则开启新集装箱
 * 4. 在单个集装箱内使用3D空间分割策略
 * 
 * 支持功能：
 * - 6种旋转方向
 * - 重量限制检查
 * - 堆叠限制检查
 * - 易碎品保护
 */

import {
  Cargo,
  Container,
  ContainerSpec,
  PlacedCargo,
  Position,
  Dimensions,
  RotationState,
  Space,
  ContainerStats,
  PackingResult
} from '../types';

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
  
  // 根据旋转角度计算新尺寸
  const dimsArray = [l, w, h];
  
  // X轴旋转 (绕长度轴)
  if (rotation.x === 90 || rotation.x === 270) {
    dimsArray[1] = h;
    dimsArray[2] = w;
  }
  
  // Y轴旋转 (绕宽度轴)
  if (rotation.y === 90 || rotation.y === 270) {
    dimsArray[0] = h;
    dimsArray[2] = l;
  }
  
  // Z轴旋转 (绕高度轴)
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
 * 检查货物是否能放入指定空间
 */
const canFitInSpace = (
  cargoDims: Dimensions,
  space: Space,
  rotation: RotationState
): boolean => {
  const rotatedDims = applyRotation(cargoDims, rotation);
  return (
    rotatedDims.length <= space.dimensions.length &&
    rotatedDims.width <= space.dimensions.width &&
    rotatedDims.height <= space.dimensions.height
  );
};

/**
 * 检查两个空间是否重叠
 */
const spacesOverlap = (space1: Space, space2: Space): boolean => {
  const s1 = {
    minX: space1.position.x,
    maxX: space1.position.x + space1.dimensions.length,
    minY: space1.position.y,
    maxY: space1.position.y + space1.dimensions.width,
    minZ: space1.position.z,
    maxZ: space1.position.z + space1.dimensions.height
  };
  
  const s2 = {
    minX: space2.position.x,
    maxX: space2.position.x + space2.dimensions.length,
    minY: space2.position.y,
    maxY: space2.position.y + space2.dimensions.width,
    minZ: space2.position.z,
    maxZ: space2.position.z + space2.dimensions.height
  };
  
  return !(
    s1.maxX <= s2.minX || s2.maxX <= s1.minX ||
    s1.maxY <= s2.minY || s2.maxY <= s1.minY ||
    s1.maxZ <= s2.minZ || s2.maxZ <= s1.minZ
  );
};

/**
 * 空间分割策略 - 当一个货物放入空间后，分割剩余空间
 */
const splitSpace = (space: Space, cargoDims: Dimensions, position: Position): Space[] => {
  const newSpaces: Space[] = [];
  
  const spaceEnd = {
    x: space.position.x + space.dimensions.length,
    y: space.position.y + space.dimensions.width,
    z: space.position.z + space.dimensions.height
  };
  
  const cargoEnd = {
    x: position.x + cargoDims.length,
    y: position.y + cargoDims.width,
    z: position.z + cargoDims.height
  };
  
  // 右侧空间
  if (cargoEnd.x < spaceEnd.x) {
    newSpaces.push({
      position: { x: cargoEnd.x, y: space.position.y, z: space.position.z },
      dimensions: {
        length: spaceEnd.x - cargoEnd.x,
        width: space.dimensions.width,
        height: space.dimensions.height
      }
    });
  }
  
  // 后侧空间
  if (cargoEnd.y < spaceEnd.y) {
    newSpaces.push({
      position: { x: space.position.x, y: cargoEnd.y, z: space.position.z },
      dimensions: {
        length: cargoEnd.x - space.position.x,
        width: spaceEnd.y - cargoEnd.y,
        height: space.dimensions.height
      }
    });
  }
  
  // 上侧空间
  if (cargoEnd.z < spaceEnd.z) {
    newSpaces.push({
      position: { x: space.position.x, y: space.position.y, z: cargoEnd.z },
      dimensions: {
        length: cargoEnd.x - space.position.x,
        width: cargoEnd.y - space.position.y,
        height: spaceEnd.z - cargoEnd.z
      }
    });
  }
  
  return newSpaces;
};

/**
 * 合并相邻的相同尺寸空间（简化空间列表）
 */
const mergeSpaces = (spaces: Space[]): Space[] => {
  const merged: Space[] = [];
  
  for (const space of spaces) {
    let wasMerged = false;
    
    for (const existing of merged) {
      // 检查是否可以合并（相邻且尺寸相同）
      const sameWidth = space.dimensions.width === existing.dimensions.width;
      const sameHeight = space.dimensions.height === existing.dimensions.height;
      const sameLength = space.dimensions.length === existing.dimensions.length;
      
      // X方向合并
      if (sameWidth && sameHeight && 
          space.position.y === existing.position.y && 
          space.position.z === existing.position.z) {
        if (space.position.x + space.dimensions.length === existing.position.x) {
          existing.position.x = space.position.x;
          existing.dimensions.length += space.dimensions.length;
          wasMerged = true;
          break;
        } else if (existing.position.x + existing.dimensions.length === space.position.x) {
          existing.dimensions.length += space.dimensions.length;
          wasMerged = true;
          break;
        }
      }
    }
    
    if (!wasMerged) {
      merged.push({ ...space });
    }
  }
  
  return merged;
};

/**
 * 检查货物放置是否违反堆叠限制
 */
const checkStackingConstraint = (
  cargo: Cargo,
  position: Position,
  placedCargos: PlacedCargo[]
): boolean => {
  if (!cargo.stackable) {
    // 不可堆叠的货物，检查下方是否有其他货物
    const hasCargoBelow = placedCargos.some(placed => {
      const placedBottom = placed.position.z;
      const placedTop = placed.position.z + applyRotation(placed.dimensions, placed.rotation).height;
      
      return (
        position.z < placedTop &&
        position.x < placed.position.x + applyRotation(placed.dimensions, placed.rotation).length &&
        position.x + cargo.dimensions.length > placed.position.x &&
        position.y < placed.position.y + applyRotation(placed.dimensions, placed.rotation).width &&
        position.y + cargo.dimensions.width > placed.position.y
      );
    });
    
    if (hasCargoBelow) return false;
  }
  
  // 检查易碎品
  if (cargo.fragile) {
    const hasCargoAbove = placedCargos.some(placed => {
      return (
        placed.position.z > position.z &&
        position.x < placed.position.x + applyRotation(placed.dimensions, placed.rotation).length &&
        position.x + cargo.dimensions.length > placed.position.x &&
        position.y < placed.position.y + applyRotation(placed.dimensions, placed.rotation).width &&
        position.y + cargo.dimensions.width > placed.position.y
      );
    });
    
    if (hasCargoAbove) return false;
  }
  
  return true;
};

/**
 * 在单个集装箱内尝试放置一个货物
 */
const tryPlaceCargoInContainer = (
  cargo: Cargo,
  container: Container,
  allowRotation: boolean
): { success: boolean; placedCargo?: PlacedCargo; updatedSpaces?: Space[] } => {
  // 检查重量限制
  const currentWeight = container.placedCargos.reduce((sum, c) => sum + c.weight * c.placedQuantity, 0);
  if (currentWeight + cargo.weight > container.spec.maxPayload) {
    return { success: false };
  }
  
  const rotationsToTry = allowRotation && cargo.rotatable ? ROTATIONS : [{ x: 0, y: 0, z: 0 }];
  
  // 按空间位置排序（优先装填靠近原点的空间）
  const sortedSpaces = [...container.remainingSpace].sort((a, b) => {
    if (a.position.z !== b.position.z) return a.position.z - b.position.z;
    if (a.position.x !== b.position.x) return a.position.x - b.position.x;
    return a.position.y - b.position.y;
  });
  
  for (const space of sortedSpaces) {
    for (const rotation of rotationsToTry) {
      if (canFitInSpace(cargo.dimensions, space, rotation)) {
        const rotatedDims = applyRotation(cargo.dimensions, rotation);
        
        // 检查堆叠约束
        if (!checkStackingConstraint(cargo, space.position, container.placedCargos)) {
          continue;
        }
        
        // 创建放置的货物
        const placedCargo: PlacedCargo = {
          ...cargo,
          position: { ...space.position },
          rotation: { ...rotation },
          placedQuantity: 1,
          containerId: container.id
        };
        
        // 分割空间
        const newSpaces = splitSpace(space, rotatedDims, space.position);
        
        // 更新剩余空间列表
        const updatedSpaces = container.remainingSpace
          .filter(s => s !== space)
          .concat(newSpaces);
        
        return { success: true, placedCargo, updatedSpaces: mergeSpaces(updatedSpaces) };
      }
    }
  }
  
  return { success: false };
};

/**
 * 创建新的集装箱实例
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
 * FFD 装箱算法主函数
 */
export interface FFDOptions {
  allowRotation?: boolean;
  prioritizeWeight?: boolean;
  maxContainers?: number;
}

export const ffdPacking = (
  cargos: Cargo[],
  containerSpecs: ContainerSpec[],
  options: FFDOptions = {}
): PackingResult => {
  const startTime = Date.now();
  
  const {
    allowRotation = true,
    prioritizeWeight = false,
    maxContainers = 100
  } = options;
  
  // 按优先级和体积排序（大的先装）
  const sortedCargos = [...cargos].sort((a, b) => {
    // 首先按优先级降序
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    
    // 然后按体积降序
    const volumeA = calculateVolume(a.dimensions);
    const volumeB = calculateVolume(b.dimensions);
    
    if (prioritizeWeight) {
      // 如果优先重量，按重量密度排序
      const densityA = a.weight / volumeA;
      const densityB = b.weight / volumeB;
      return densityB - densityA;
    }
    
    return volumeB - volumeA;
  });
  
  // 展开货物列表（将quantity展开为多个单独货物）
  const expandedCargos: Cargo[] = [];
  for (const cargo of sortedCargos) {
    for (let i = 0; i < cargo.quantity; i++) {
      expandedCargos.push({
        ...cargo,
        id: `${cargo.id}-${i}`,
        quantity: 1
      });
    }
  }
  
  const containers: Container[] = [];
  const unplacedCargos: Cargo[] = [];
  
  // 尝试放置每个货物
  for (const cargo of expandedCargos) {
    let placed = false;
    
    // 尝试放入现有的集装箱
    for (const container of containers) {
      const result = tryPlaceCargoInContainer(cargo, container, allowRotation);
      
      if (result.success && result.placedCargo && result.updatedSpaces) {
        container.placedCargos.push(result.placedCargo);
        container.remainingSpace = result.updatedSpaces;
        placed = true;
        break;
      }
    }
    
    // 如果没有放入现有集装箱，尝试创建新集装箱
    if (!placed && containers.length < maxContainers) {
      for (const spec of containerSpecs) {
        const newContainer = createContainer(spec);
        const result = tryPlaceCargoInContainer(cargo, newContainer, allowRotation);
        
        if (result.success && result.placedCargo && result.updatedSpaces) {
          newContainer.placedCargos.push(result.placedCargo);
          newContainer.remainingSpace = result.updatedSpaces;
          containers.push(newContainer);
          placed = true;
          break;
        }
      }
    }
    
    // 如果还是无法放置，加入未放置列表
    if (!placed) {
      unplacedCargos.push(cargo);
    }
  }
  
  // 更新所有集装箱的统计信息
  for (const container of containers) {
    updateContainerStats(container);
  }
  
  // 计算总体统计
  const totalVolume = containers.reduce((sum, c) => sum + c.stats.totalVolume, 0);
  const usedVolume = containers.reduce((sum, c) => sum + c.stats.usedVolume, 0);
  const totalWeight = containers.reduce((sum, c) => sum + c.stats.totalWeight, 0);
  
  const duration = Date.now() - startTime;
  
  return {
    id: generateId(),
    createdAt: new Date(),
    containers,
    unplacedCargos,
    totalStats: {
      totalContainers: containers.length,
      totalCargos: expandedCargos.length,
      placedCargos: expandedCargos.length - unplacedCargos.length,
      unplacedCargos: unplacedCargos.length,
      totalVolume,
      usedVolume,
      volumeUtilization: totalVolume > 0 ? (usedVolume / (totalVolume * 1_000_000_000)) * 100 : 0,
      totalWeight
    },
    algorithm: 'FFD (First Fit Decreasing)',
    duration
  };
};

/**
 * 优化算法 - 尝试改进装箱结果
 */
export const optimizePacking = (
  result: PackingResult,
  iterations: number = 100
): PackingResult => {
  // 简化的优化：尝试重新排列货物以获得更好的利用率
  // 实际应用中可以实现更复杂的优化策略，如遗传算法、模拟退火等
  
  let bestResult = result;
  
  for (let i = 0; i < iterations; i++) {
    // 这里可以实现更复杂的优化逻辑
    // 例如：交换货物位置、尝试不同的旋转等
  }
  
  return bestResult;
};

/**
 * 验证装箱结果
 */
export const validatePacking = (result: PackingResult): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  for (const container of result.containers) {
    // 检查重量限制
    if (container.stats.totalWeight > container.spec.maxPayload) {
      errors.push(`集装箱 ${container.id} 超重: ${container.stats.totalWeight}kg > ${container.spec.maxPayload}kg`);
    }
    
    // 检查货物是否超出边界
    for (const cargo of container.placedCargos) {
      const rotatedDims = applyRotation(cargo.dimensions, cargo.rotation);
      const endX = cargo.position.x + rotatedDims.length;
      const endY = cargo.position.y + rotatedDims.width;
      const endZ = cargo.position.z + rotatedDims.height;
      
      if (endX > container.spec.innerDimensions.length) {
        errors.push(`货物 ${cargo.id} 超出长度边界`);
      }
      if (endY > container.spec.innerDimensions.width) {
        errors.push(`货物 ${cargo.id} 超出宽度边界`);
      }
      if (endZ > container.spec.innerDimensions.height) {
        errors.push(`货物 ${cargo.id} 超出高度边界`);
      }
    }
    
    // 检查货物之间是否重叠
    for (let i = 0; i < container.placedCargos.length; i++) {
      for (let j = i + 1; j < container.placedCargos.length; j++) {
        const cargo1 = container.placedCargos[i];
        const cargo2 = container.placedCargos[j];
        
        const dims1 = applyRotation(cargo1.dimensions, cargo1.rotation);
        const dims2 = applyRotation(cargo2.dimensions, cargo2.rotation);
        
        const space1: Space = {
          position: cargo1.position,
          dimensions: dims1
        };
        const space2: Space = {
          position: cargo2.position,
          dimensions: dims2
        };
        
        if (spacesOverlap(space1, space2)) {
          errors.push(`货物 ${cargo1.id} 和 ${cargo2.id} 重叠`);
        }
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

export const DEFAULT_FFD_CONFIG: FFDOptions = {
  allowRotation: true,
  prioritizeWeight: false,
  maxContainers: 100
};

export default {
  ffdPacking,
  optimizePacking,
  validatePacking,
  applyRotation,
  canFitInSpace,
  DEFAULT_FFD_CONFIG
};
