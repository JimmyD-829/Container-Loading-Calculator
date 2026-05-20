/**
 * 集装箱规格数据
 */

import { ContainerSpec, ContainerType } from '../types';

export const ContainerSpecs: Record<ContainerType, ContainerSpec> = {
  [ContainerType.DRY_20]: {
    id: ContainerType.DRY_20,
    name: '20GP',
    description: '20英尺标准干货集装箱',
    innerDimensions: {
      length: 5898,
      width: 2352,
      height: 2393
    },
    doorDimensions: {
      width: 2340,
      height: 2280
    },
    maxPayload: 28200,
    tareWeight: 2200,
    maxWeight: 30480,
    volume: 33.2,
    isStandard: true
  },
  [ContainerType.DRY_40]: {
    id: ContainerType.DRY_40,
    name: '40GP',
    description: '40英尺标准干货集装箱',
    innerDimensions: {
      length: 12032,
      width: 2352,
      height: 2393
    },
    doorDimensions: {
      width: 2340,
      height: 2280
    },
    maxPayload: 26780,
    tareWeight: 3800,
    maxWeight: 30580,
    volume: 67.7,
    isStandard: true
  },
  [ContainerType.HIGH_CUBE_40]: {
    id: ContainerType.HIGH_CUBE_40,
    name: '40HQ',
    description: '40英尺高柜集装箱',
    innerDimensions: {
      length: 12032,
      width: 2352,
      height: 2698
    },
    doorDimensions: {
      width: 2340,
      height: 2590
    },
    maxPayload: 26500,
    tareWeight: 4000,
    maxWeight: 30500,
    volume: 76.3,
    isStandard: true
  },
  [ContainerType.HIGH_CUBE_45]: {
    id: ContainerType.HIGH_CUBE_45,
    name: '45HQ',
    description: '45英尺高柜集装箱',
    innerDimensions: {
      length: 13556,
      width: 2352,
      height: 2698
    },
    doorDimensions: {
      width: 2340,
      height: 2590
    },
    maxPayload: 29900,
    tareWeight: 4800,
    maxWeight: 34700,
    volume: 86.0,
    isStandard: true
  },
  [ContainerType.REEFER_20]: {
    id: ContainerType.REEFER_20,
    name: '20RF',
    description: '20英尺冷藏集装箱',
    innerDimensions: {
      length: 5400,
      width: 2280,
      height: 2260
    },
    doorDimensions: {
      width: 2240,
      height: 2180
    },
    maxPayload: 21600,
    tareWeight: 3000,
    maxWeight: 24600,
    volume: 27.5,
    isStandard: true
  },
  [ContainerType.REEFER_40]: {
    id: ContainerType.REEFER_40,
    name: '40RF',
    description: '40英尺冷藏集装箱',
    innerDimensions: {
      length: 11550,
      width: 2280,
      height: 2500
    },
    doorDimensions: {
      width: 2240,
      height: 2400
    },
    maxPayload: 27600,
    tareWeight: 4900,
    maxWeight: 32500,
    volume: 64.0,
    isStandard: true
  },
  [ContainerType.OPEN_TOP_20]: {
    id: ContainerType.OPEN_TOP_20,
    name: '20OT',
    description: '20英尺开顶集装箱',
    innerDimensions: {
      length: 5898,
      width: 2352,
      height: 2393
    },
    doorDimensions: {
      width: 2340,
      height: 2280
    },
    maxPayload: 28200,
    tareWeight: 2300,
    maxWeight: 30500,
    volume: 33.2,
    isStandard: true
  },
  [ContainerType.OPEN_TOP_40]: {
    id: ContainerType.OPEN_TOP_40,
    name: '40OT',
    description: '40英尺开顶集装箱',
    innerDimensions: {
      length: 12032,
      width: 2352,
      height: 2393
    },
    doorDimensions: {
      width: 2340,
      height: 2280
    },
    maxPayload: 26780,
    tareWeight: 4000,
    maxWeight: 30780,
    volume: 67.7,
    isStandard: true
  },
  [ContainerType.FLAT_RACK_20]: {
    id: ContainerType.FLAT_RACK_20,
    name: '20FR',
    description: '20英尺框架集装箱',
    innerDimensions: {
      length: 5848,
      width: 2438,
      height: 2150
    },
    maxPayload: 30480,
    tareWeight: 2000,
    maxWeight: 32480,
    volume: 30.0,
    isStandard: true
  },
  [ContainerType.FLAT_RACK_40]: {
    id: ContainerType.FLAT_RACK_40,
    name: '40FR',
    description: '40英尺框架集装箱',
    innerDimensions: {
      length: 12192,
      width: 2438,
      height: 2150
    },
    maxPayload: 40000,
    tareWeight: 4000,
    maxWeight: 44000,
    volume: 64.0,
    isStandard: true
  },
  [ContainerType.TANK]: {
    id: ContainerType.TANK,
    name: 'TK',
    description: '罐式集装箱',
    innerDimensions: {
      length: 12000,
      width: 2300,
      height: 2300
    },
    maxPayload: 30000,
    tareWeight: 6000,
    maxWeight: 36000,
    volume: 26.0,
    isStandard: true
  },
  [ContainerType.CUSTOM]: {
    id: ContainerType.CUSTOM,
    name: '自定义',
    description: '自定义集装箱规格',
    innerDimensions: {
      length: 6000,
      width: 2400,
      height: 2400
    },
    maxPayload: 25000,
    tareWeight: 2500,
    maxWeight: 27500,
    volume: 34.6,
    isStandard: false
  }
};

export default ContainerSpecs;
