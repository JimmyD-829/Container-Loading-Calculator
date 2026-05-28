/**
 * 集装箱容量计算算法
 *
 * 给定集装箱尺寸和固定尺寸货物，计算最多能装多少个该货物。
 *
 * 算法逻辑：
 * 1. 考虑6种摆放方向（L×W×H, L×H×W, W×L×H, W×H×L, H×L×W, H×W×L）
 * 2. 对每种方向，计算沿集装箱长/宽/高方向能放多少个
 * 3. 计算每层能放多少个，能堆叠多少层
 * 4. 选择总数最多的方案
 * 5. 如果允许旋转，尝试所有方向取最优
 * 6. 如果考虑重量限制，检查总重量是否超过集装箱最大载重
 * 7. 如果有堆叠限制，限制层数
 */

import { ContainerSpec, Dimensions, ContainerCapacityInput, ContainerCapacityResult } from '../types';

interface OrientationLayout {
  name: string;
  lengthCount: number;
  widthCount: number;
  heightCount: number;
  totalPerLayer: number;
  layers: number;
  total: number;
  utilization: number;
  remainingLength: number;
  remainingWidth: number;
  remainingHeight: number;
}

const ORIENTATION_NAMES = [
  'L×W×H',
  'L×H×W',
  'W×L×H',
  'W×H×L',
  'H×L×W',
  'H×W×L',
];

const generateOrientations = (dims: Dimensions): Dimensions[] => {
  const { length: l, width: w, height: h } = dims;
  return [
    { length: l, width: w, height: h },
    { length: l, width: h, height: w },
    { length: w, width: l, height: h },
    { length: w, width: h, height: l },
    { length: h, width: l, height: w },
    { length: h, width: w, height: l },
  ];
};

export const calculateContainerCapacity = (
  input: ContainerCapacityInput
): ContainerCapacityResult => {
  const {
    containerSpec,
    cargoDimensions,
    allowRotation,
    considerWeight,
    cargoWeight,
    maxStackLayers,
  } = input;

  const containerDims = containerSpec.innerDimensions;
  const containerVolumeMm3 = containerDims.length * containerDims.width * containerDims.height;

  const orientations = allowRotation
    ? generateOrientations(cargoDimensions)
    : [{ ...cargoDimensions }];

  const layouts: OrientationLayout[] = [];

  for (let i = 0; i < orientations.length; i++) {
    const orient = orientations[i];
    const name = allowRotation ? ORIENTATION_NAMES[i] : 'L×W×H';

    const lengthCount = Math.floor(containerDims.length / orient.length);
    const widthCount = Math.floor(containerDims.width / orient.width);
    const heightCount = Math.floor(containerDims.height / orient.height);

    if (lengthCount === 0 || widthCount === 0 || heightCount === 0) continue;

    let layers = heightCount;

    if (maxStackLayers > 0) {
      layers = Math.min(layers, maxStackLayers);
    }

    const totalPerLayer = lengthCount * widthCount;
    let total = totalPerLayer * layers;

    if (considerWeight && cargoWeight > 0) {
      const maxByWeight = Math.floor(containerSpec.maxPayload / cargoWeight);
      if (total > maxByWeight) {
        const maxLayersByWeight = Math.floor(maxByWeight / totalPerLayer);
        layers = Math.max(0, Math.min(layers, maxLayersByWeight));
        total = totalPerLayer * layers;

        if (layers === 0) continue;
      }
    }

    if (total === 0) continue;

    const cargoVolumeMm3 = orient.length * orient.width * orient.height;
    const utilization = (total * cargoVolumeMm3) / containerVolumeMm3 * 100;

    const remainingLength = containerDims.length - lengthCount * orient.length;
    const remainingWidth = containerDims.width - widthCount * orient.width;
    const remainingHeight = containerDims.height - layers * orient.height;

    layouts.push({
      name,
      lengthCount,
      widthCount,
      heightCount: layers,
      totalPerLayer,
      layers,
      total,
      utilization: Math.round(utilization * 100) / 100,
      remainingLength,
      remainingWidth,
      remainingHeight,
    });
  }

  layouts.sort((a, b) => b.total - a.total || b.utilization - a.utilization);

  const bestLayout = layouts[0];

  if (!bestLayout) {
    return {
      totalQuantity: 0,
      layoutOptions: [],
      volumeUtilization: 0,
      weightUtilization: 0,
      remainingSpace: { ...containerDims },
    };
  }

  const cargoVolumeMm3 = cargoDimensions.length * cargoDimensions.width * cargoDimensions.height;
  const volumeUtilization = (bestLayout.total * cargoVolumeMm3) / containerVolumeMm3 * 100;

  const weightUtilization =
    considerWeight && cargoWeight > 0
      ? (bestLayout.total * cargoWeight) / containerSpec.maxPayload * 100
      : 0;

  return {
    totalQuantity: bestLayout.total,
    layoutOptions: layouts.map(({ name, lengthCount, widthCount, heightCount, totalPerLayer, layers, total, utilization }) => ({
      name,
      lengthCount,
      widthCount,
      heightCount,
      totalPerLayer,
      layers,
      total,
      utilization,
    })),
    volumeUtilization: Math.round(volumeUtilization * 100) / 100,
    weightUtilization: Math.round(weightUtilization * 100) / 100,
    remainingSpace: {
      length: bestLayout.remainingLength,
      width: bestLayout.remainingWidth,
      height: bestLayout.remainingHeight,
    },
  };
};

export default { calculateContainerCapacity };
