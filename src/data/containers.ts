/**
 * 集装箱装载计算工具 - 标准集装箱规格数据
 * 
 * 包含11种标准集装箱类型：
 * - 20GP, 40GP, 40HQ, 45HQ (干货箱)
 * - 20RF, 40RF (冷藏箱)
 * - 20OT, 40OT (开顶箱)
 * - 20FR, 40FR (框架箱)
 * - TK (罐式箱)
 */

import { ContainerSpec, ContainerType, Dimensions } from '../types';

/**
 * 计算体积 (立方米)
 */
const calculateVolume = (dims: Dimensions): number => {
  return (dims.length * dims.width * dims.height) / 1_000_000_000;
};

/**
 * 20英尺标准干货箱 (20GP)
 * 最常用的标准集装箱
 */
export const CONTAINER_20GP: ContainerSpec = {
  id: ContainerType.DRY_20,
  name: '20英尺标准箱',
  description: '20\' Dry Container - 最常用的标准集装箱，适合大多数普通货物',
  innerDimensions: {
    length: 5898,
    width: 2352,
    height: 2393
  },
  doorDimensions: {
    width: 2340,
    height: 2280
  },
  maxPayload: 28230,
  tareWeight: 2200,
  maxWeight: 30480,
  volume: calculateVolume({ length: 5898, width: 2352, height: 2393 }),
  isStandard: true
};

/**
 * 40英尺标准干货箱 (40GP)
 * 大容量标准集装箱
 */
export const CONTAINER_40GP: ContainerSpec = {
  id: ContainerType.DRY_40,
  name: '40英尺标准箱',
  description: '40\' Dry Container - 大容量标准集装箱，适合大批量货物',
  innerDimensions: {
    length: 12032,
    width: 2352,
    height: 2393
  },
  doorDimensions: {
    width: 2340,
    height: 2280
  },
  maxPayload: 28750,
  tareWeight: 3750,
  maxWeight: 32500,
  volume: calculateVolume({ length: 12032, width: 2352, height: 2393 }),
  isStandard: true
};

/**
 * 40英尺高柜 (40HQ/40HC)
 * 高容积集装箱，适合轻泡货
 */
export const CONTAINER_40HQ: ContainerSpec = {
  id: ContainerType.HIGH_CUBE_40,
  name: '40英尺高柜',
  description: '40\' High Cube Container - 高容积集装箱，高度增加30cm，适合轻泡货',
  innerDimensions: {
    length: 12032,
    width: 2352,
    height: 2698
  },
  doorDimensions: {
    width: 2340,
    height: 2585
  },
  maxPayload: 28600,
  tareWeight: 3900,
  maxWeight: 32500,
  volume: calculateVolume({ length: 12032, width: 2352, height: 2698 }),
  isStandard: true
};

/**
 * 45英尺高柜 (45HQ)
 * 超大容积集装箱
 */
export const CONTAINER_45HQ: ContainerSpec = {
  id: ContainerType.HIGH_CUBE_45,
  name: '45英尺高柜',
  description: '45\' High Cube Container - 超大容积集装箱，适合大批量轻泡货',
  innerDimensions: {
    length: 13556,
    width: 2352,
    height: 2698
  },
  doorDimensions: {
    width: 2340,
    height: 2585
  },
  maxPayload: 27700,
  tareWeight: 4800,
  maxWeight: 32500,
  volume: calculateVolume({ length: 13556, width: 2352, height: 2698 }),
  isStandard: true
};

/**
 * 20英尺冷藏箱 (20RF)
 * 带制冷设备的集装箱
 */
export const CONTAINER_20RF: ContainerSpec = {
  id: ContainerType.REEFER_20,
  name: '20英尺冷藏箱',
  description: '20\' Reefer Container - 带制冷设备，适合冷冻/冷藏货物',
  innerDimensions: {
    length: 5428,
    width: 2266,
    height: 2240
  },
  doorDimensions: {
    width: 2256,
    height: 2110
  },
  maxPayload: 27400,
  tareWeight: 2900,
  maxWeight: 30320,
  volume: calculateVolume({ length: 5428, width: 2266, height: 2240 }),
  isStandard: true
};

/**
 * 40英尺冷藏箱 (40RF)
 * 大容量冷藏集装箱
 */
export const CONTAINER_40RF: ContainerSpec = {
  id: ContainerType.REEFER_40,
  name: '40英尺冷藏箱',
  description: '40\' Reefer Container - 大容量冷藏集装箱，适合大批量冷冻货物',
  innerDimensions: {
    length: 11582,
    width: 2294,
    height: 2555
  },
  doorDimensions: {
    width: 2286,
    height: 2420
  },
  maxPayload: 29480,
  tareWeight: 4500,
  maxWeight: 33980,
  volume: calculateVolume({ length: 11582, width: 2294, height: 2555 }),
  isStandard: true
};

/**
 * 20英尺开顶箱 (20OT)
 * 顶部可开启，适合超高货物
 */
export const CONTAINER_20OT: ContainerSpec = {
  id: ContainerType.OPEN_TOP_20,
  name: '20英尺开顶箱',
  description: '20\' Open Top Container - 顶部可开启，适合超高货物和顶部装卸',
  innerDimensions: {
    length: 5898,
    width: 2352,
    height: 2352
  },
  doorDimensions: {
    width: 2340,
    height: 2280
  },
  maxPayload: 28130,
  tareWeight: 2800,
  maxWeight: 30480,
  volume: calculateVolume({ length: 5898, width: 2352, height: 2352 }),
  isStandard: true
};

/**
 * 40英尺开顶箱 (40OT)
 * 大容量开顶集装箱
 */
export const CONTAINER_40OT: ContainerSpec = {
  id: ContainerType.OPEN_TOP_40,
  name: '40英尺开顶箱',
  description: '40\' Open Top Container - 大容量开顶集装箱，适合超高货物',
  innerDimensions: {
    length: 12032,
    width: 2352,
    height: 2352
  },
  doorDimensions: {
    width: 2340,
    height: 2280
  },
  maxPayload: 26500,
  tareWeight: 4300,
  maxWeight: 30800,
  volume: calculateVolume({ length: 12032, width: 2352, height: 2352 }),
  isStandard: true
};

/**
 * 20英尺框架箱 (20FR)
 * 无顶无侧壁，适合超重超大货物
 */
export const CONTAINER_20FR: ContainerSpec = {
  id: ContainerType.FLAT_RACK_20,
  name: '20英尺框架箱',
  description: '20\' Flat Rack Container - 无顶无侧壁，适合超重超大货物',
  innerDimensions: {
    length: 5620,
    width: 2170,
    height: 2150
  },
  maxPayload: 45000,
  tareWeight: 2900,
  maxWeight: 47900,
  volume: calculateVolume({ length: 5620, width: 2170, height: 2150 }),
  isStandard: true
};

/**
 * 40英尺框架箱 (40FR)
 * 大容量框架集装箱
 */
export const CONTAINER_40FR: ContainerSpec = {
  id: ContainerType.FLAT_RACK_40,
  name: '40英尺框架箱',
  description: '40\' Flat Rack Container - 大容量框架集装箱，适合超重超大货物',
  innerDimensions: {
    length: 11700,
    width: 2170,
    height: 2150
  },
  maxPayload: 50000,
  tareWeight: 5800,
  maxWeight: 55800,
  volume: calculateVolume({ length: 11700, width: 2170, height: 2150 }),
  isStandard: true
};

/**
 * 罐式集装箱 (TK)
 * 用于液体货物运输
 */
export const CONTAINER_TK: ContainerSpec = {
  id: ContainerType.TANK,
  name: '罐式集装箱',
  description: 'Tank Container - 用于液体、气体和粉末状货物运输',
  innerDimensions: {
    length: 6058,
    width: 2438,
    height: 2591
  },
  maxPayload: 32000,
  tareWeight: 3650,
  maxWeight: 35650,
  volume: 21000, // 罐式箱以容积计算，单位为升（约21立方米）
  isStandard: true
};

/**
 * 所有标准集装箱规格列表
 */
export const STANDARD_CONTAINERS: ContainerSpec[] = [
  CONTAINER_20GP,
  CONTAINER_40GP,
  CONTAINER_40HQ,
  CONTAINER_45HQ,
  CONTAINER_20RF,
  CONTAINER_40RF,
  CONTAINER_20OT,
  CONTAINER_40OT,
  CONTAINER_20FR,
  CONTAINER_40FR,
  CONTAINER_TK
];

/**
 * 按ID获取集装箱规格
 */
export const getContainerSpecById = (id: ContainerType): ContainerSpec | undefined => {
  return STANDARD_CONTAINERS.find(c => c.id === id);
};

/**
 * 按类型筛选集装箱
 */
export const getContainersByCategory = (category: 'dry' | 'reefer' | 'special'): ContainerSpec[] => {
  switch (category) {
    case 'dry':
      return [CONTAINER_20GP, CONTAINER_40GP, CONTAINER_40HQ, CONTAINER_45HQ];
    case 'reefer':
      return [CONTAINER_20RF, CONTAINER_40RF];
    case 'special':
      return [CONTAINER_20OT, CONTAINER_40OT, CONTAINER_20FR, CONTAINER_40FR, CONTAINER_TK];
    default:
      return [];
  }
};

/**
 * 创建自定义集装箱规格
 */
export const createCustomContainerSpec = (
  name: string,
  description: string,
  innerDimensions: Dimensions,
  maxPayload: number,
  tareWeight: number,
  doorDimensions?: { width: number; height: number }
): ContainerSpec => {
  const maxWeight = maxPayload + tareWeight;
  
  return {
    id: ContainerType.CUSTOM,
    name,
    description,
    innerDimensions,
    doorDimensions,
    maxPayload,
    tareWeight,
    maxWeight,
    volume: calculateVolume(innerDimensions),
    isStandard: false
  };
};

/**
 * 获取集装箱推荐
 * 根据货物总体积和总重量推荐合适的集装箱
 */
export const getRecommendedContainers = (
  totalVolume: number, // 立方米
  totalWeight: number  // 千克
): ContainerSpec[] => {
  const recommendations: ContainerSpec[] = [];
  
  // 根据体积推荐
  if (totalVolume <= 30 && totalWeight <= 28000) {
    recommendations.push(CONTAINER_20GP);
  }
  if (totalVolume <= 60 && totalWeight <= 28000) {
    recommendations.push(CONTAINER_40GP);
  }
  if (totalVolume <= 70 && totalWeight <= 28000) {
    recommendations.push(CONTAINER_40HQ);
  }
  if (totalVolume <= 80 && totalWeight <= 27000) {
    recommendations.push(CONTAINER_45HQ);
  }
  
  // 如果没有匹配的，返回最常用的
  if (recommendations.length === 0) {
    recommendations.push(CONTAINER_40HQ, CONTAINER_40GP);
  }
  
  return recommendations;
};

/**
 * 集装箱规格比较
 */
export const compareContainers = (
  containerA: ContainerSpec,
  containerB: ContainerSpec
): {
  volumeDiff: number;
  payloadDiff: number;
  lengthDiff: number;
} => {
  return {
    volumeDiff: containerA.volume - containerB.volume,
    payloadDiff: containerA.maxPayload - containerB.maxPayload,
    lengthDiff: containerA.innerDimensions.length - containerB.innerDimensions.length
  };
};

/**
 * 验证货物是否能装入集装箱
 */
export const canFitInContainer = (
  cargoDims: Dimensions,
  container: ContainerSpec
): boolean => {
  const { length, width, height } = container.innerDimensions;
  
  // 检查所有可能的旋转方向
  const orientations = [
    { l: cargoDims.length, w: cargoDims.width, h: cargoDims.height },
    { l: cargoDims.length, w: cargoDims.height, h: cargoDims.width },
    { l: cargoDims.width, w: cargoDims.length, h: cargoDims.height },
    { l: cargoDims.width, w: cargoDims.height, h: cargoDims.length },
    { l: cargoDims.height, w: cargoDims.length, h: cargoDims.width },
    { l: cargoDims.height, w: cargoDims.width, h: cargoDims.length }
  ];
  
  return orientations.some(
    o => o.l <= length && o.w <= width && o.h <= height
  );
};

export default {
  STANDARD_CONTAINERS,
  CONTAINER_20GP,
  CONTAINER_40GP,
  CONTAINER_40HQ,
  CONTAINER_45HQ,
  CONTAINER_20RF,
  CONTAINER_40RF,
  CONTAINER_20OT,
  CONTAINER_40OT,
  CONTAINER_20FR,
  CONTAINER_40FR,
  CONTAINER_TK,
  getContainerSpecById,
  getContainersByCategory,
  createCustomContainerSpec,
  getRecommendedContainers,
  compareContainers,
  canFitInContainer
};
