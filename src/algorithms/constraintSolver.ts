/**
 * 集装箱装载约束求解器
 * 
 * 支持的约束类型：
 * 1. 重心约束 - 确保装载重心在安全范围内
 * 2. 堆码约束 - 检查堆叠层数和承托面积
 * 3. 方向约束 - 支持6种摆放方向的独立控制
 * 4. 重量约束 - 检查总重量不超过限制
 * 5. 边界约束 - 检查货物不超出集装箱边界
 */

import { Cargo, Container, ContainerSpec, PlacedCargo, Position, Dimensions, RotationState } from '../types';

/**
 * 约束验证结果
 */
export interface ConstraintResult {
  valid: boolean;
  violations: ConstraintViolation[];
  warnings: ConstraintWarning[];
}

export interface ConstraintViolation {
  type: ConstraintType;
  message: string;
  cargoId?: string;
  details?: Record<string, unknown>;
}

export interface ConstraintWarning {
  type: ConstraintType;
  message: string;
  cargoId?: string;
  severity: 'low' | 'medium' | 'high';
}

export type ConstraintType = 
  | 'centerOfGravity'
  | 'stacking'
  | 'orientation'
  | 'weight'
  | 'boundary'
  | 'overlap';

/**
 * 重心约束配置
 */
export interface CenterOfGravityConfig {
  maxOffsetX: number; // X轴最大偏移比例 (0-1)
  maxOffsetY: number; // Y轴最大偏移比例 (0-1)
  maxOffsetZ: number; // Z轴最大偏移比例 (0-1)
  warningOffsetX: number; // X轴警告偏移比例
  warningOffsetY: number; // Y轴警告偏移比例
}

/**
 * 默认重心配置
 */
export const DEFAULT_COG_CONFIG: CenterOfGravityConfig = {
  maxOffsetX: 0.15,   // 最大X偏移15%
  maxOffsetY: 0.15,   // 最大Y偏移15%
  maxOffsetZ: 0.3,    // 最大Z偏移30%
  warningOffsetX: 0.1, // 警告X偏移10%
  warningOffsetY: 0.1  // 警告Y偏移10%
};

/**
 * 计算货物的重心位置（相对于集装箱中心）
 */
export const calculateCenterOfGravity = (
  placedCargos: PlacedCargo[],
  containerSpec: ContainerSpec
): Position => {
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

    const rotatedDims = applyRotation(cargo.dimensions, cargo.rotation);
    
    // 货物重心位置（绝对坐标）
    const cargoCenterX = cargo.position.x + rotatedDims.length / 2;
    const cargoCenterY = cargo.position.y + rotatedDims.width / 2;
    const cargoCenterZ = cargo.position.z + rotatedDims.height / 2;

    weightedX += cargoCenterX * weight;
    weightedY += cargoCenterY * weight;
    weightedZ += cargoCenterZ * weight;
  }

  // 相对于集装箱中心的偏移
  return {
    x: (weightedX / totalWeight) - containerCenter.x,
    y: (weightedY / totalWeight) - containerCenter.y,
    z: (weightedZ / totalWeight) - containerCenter.z
  };
};

/**
 * 验证重心约束
 */
export const validateCenterOfGravity = (
  placedCargos: PlacedCargo[],
  containerSpec: ContainerSpec,
  config: CenterOfGravityConfig = DEFAULT_COG_CONFIG
): { valid: boolean; violations: ConstraintViolation[]; warnings: ConstraintWarning[]; cog: Position } => {
  const violations: ConstraintViolation[] = [];
  const warnings: ConstraintWarning[] = [];

  if (placedCargos.length === 0) {
    return { valid: true, violations, warnings, cog: { x: 0, y: 0, z: 0 } };
  }

  const cog = calculateCenterOfGravity(placedCargos, containerSpec);
  
  const maxAbsX = containerSpec.innerDimensions.length * config.maxOffsetX;
  const maxAbsY = containerSpec.innerDimensions.width * config.maxOffsetY;
  const warnAbsX = containerSpec.innerDimensions.length * config.warningOffsetX;
  const warnAbsY = containerSpec.innerDimensions.width * config.warningOffsetY;

  // 检查X轴偏移
  if (Math.abs(cog.x) > maxAbsX) {
    violations.push({
      type: 'centerOfGravity',
      message: `重心X轴偏移超限: ${Math.abs(cog.x).toFixed(2)}mm > ${maxAbsX.toFixed(2)}mm`,
      details: { offset: cog.x, limit: maxAbsX }
    });
  } else if (Math.abs(cog.x) > warnAbsX) {
    warnings.push({
      type: 'centerOfGravity',
      message: `重心X轴偏移接近限值: ${Math.abs(cog.x).toFixed(2)}mm`,
      severity: 'medium'
    });
  }

  // 检查Y轴偏移
  if (Math.abs(cog.y) > maxAbsY) {
    violations.push({
      type: 'centerOfGravity',
      message: `重心Y轴偏移超限: ${Math.abs(cog.y).toFixed(2)}mm > ${maxAbsY.toFixed(2)}mm`,
      details: { offset: cog.y, limit: maxAbsY }
    });
  } else if (Math.abs(cog.y) > warnAbsY) {
    warnings.push({
      type: 'centerOfGravity',
      message: `重心Y轴偏移接近限值: ${Math.abs(cog.y).toFixed(2)}mm`,
      severity: 'medium'
    });
  }

  // 检查Z轴偏移（重心高度）
  const maxAbsZ = containerSpec.innerDimensions.height * config.maxOffsetZ;
  if (Math.abs(cog.z) > maxAbsZ) {
    violations.push({
      type: 'centerOfGravity',
      message: `重心Z轴偏移超限: ${Math.abs(cog.z).toFixed(2)}mm > ${maxAbsZ.toFixed(2)}mm`,
      details: { offset: cog.z, limit: maxAbsZ }
    });
  }

  return {
    valid: violations.length === 0,
    violations,
    warnings,
    cog
  };
};

/**
 * 检查单个货物的堆叠约束
 */
export interface StackingResult {
  valid: boolean;
  violations: ConstraintViolation[];
  stackLevel: number;
  supportingCargoIds: string[];
  unsupportedAreaRatio: number;
}

export const checkStackingConstraint = (
  cargo: PlacedCargo,
  allPlacedCargos: PlacedCargo[],
  containerSpec: ContainerSpec
): StackingResult => {
  const violations: ConstraintViolation[] = [];
  const supportingCargoIds: string[] = [];
  
  const rotatedDims = applyRotation(cargo.dimensions, cargo.rotation);
  
  // 货物底部位置
  const cargoBottom = cargo.position.z;
  const cargoTop = cargo.position.z + rotatedDims.height;
  
  // 货物占据的底面区域
  const cargoArea = {
    minX: cargo.position.x,
    maxX: cargo.position.x + rotatedDims.length,
    minY: cargo.position.y,
    maxY: cargo.position.y + rotatedDims.width
  };

  // 找到支撑当前货物的货物
  let supportedArea = 0;
  
  for (const other of allPlacedCargos) {
    if (other.id === cargo.id) continue;
    
    const otherDims = applyRotation(other.dimensions, other.rotation);
    const otherTop = other.position.z + otherDims.height;
    
    // 检查是否在正下方
    if (Math.abs(otherTop - cargoBottom) < 1) {
      const otherArea = {
        minX: other.position.x,
        maxX: other.position.x + otherDims.length,
        minY: other.position.y,
        maxY: other.position.y + otherDims.width
      };
      
      // 计算重叠面积
      const overlapX = Math.max(0, Math.min(cargoArea.maxX, otherArea.maxX) - Math.max(cargoArea.minX, otherArea.minX));
      const overlapY = Math.max(0, Math.min(cargoArea.maxY, otherArea.maxY) - Math.max(cargoArea.minY, otherArea.minY));
      const overlapArea = overlapX * overlapY;
      
      if (overlapArea > 0) {
        supportedArea += overlapArea;
        supportingCargoIds.push(other.id);
      }
    }
  }

  const totalArea = rotatedDims.length * rotatedDims.width;
  const unsupportedAreaRatio = totalArea > 0 ? (totalArea - supportedArea) / totalArea : 0;

  // 检查是否直接放在地面上（z=0）
  const isOnGround = cargo.position.z < 1;
  
  if (!isOnGround && unsupportedAreaRatio > 0.3) {
    violations.push({
      type: 'stacking',
      message: `货物 ${cargo.name || cargo.id} 承托面积不足: ${((1 - unsupportedAreaRatio) * 100).toFixed(0)}%`,
      cargoId: cargo.id,
      details: { supportedArea, totalArea, unsupportedAreaRatio }
    });
  }

  // 检查最大堆叠层数
  if (!cargo.stackable && !isOnGround) {
    violations.push({
      type: 'stacking',
      message: `货物 ${cargo.name || cargo.id} 不可堆叠，但放置在其他货物上方`,
      cargoId: cargo.id
    });
  }

  // 计算堆叠层数
  let stackLevel = 1;
  if (!isOnGround) {
    // 统计下方有多少层货物
    let currentZ = cargo.position.z;
    for (let level = 2; level <= cargo.maxStack; level++) {
      const hasSupport = allPlacedCargos.some(other => {
        if (other.id === cargo.id) return false;
        const otherDims = applyRotation(other.dimensions, other.rotation);
        return other.position.z + otherDims.height > currentZ - 10 && 
               other.position.z < currentZ + 10;
      });
      if (hasSupport) {
        stackLevel = level;
        currentZ -= 100; // 向下查找
      } else {
        break;
      }
    }
  }

  if (stackLevel > cargo.maxStack) {
    violations.push({
      type: 'stacking',
      message: `货物 ${cargo.name || cargo.id} 堆叠层数超限: ${stackLevel} > ${cargo.maxStack}`,
      cargoId: cargo.id,
      details: { currentLevel: stackLevel, maxLevel: cargo.maxStack }
    });
  }

  // 检查易碎品是否被压在下面
  if (cargo.fragile && !isOnGround) {
    violations.push({
      type: 'stacking',
      message: `易碎品 ${cargo.name || cargo.id} 不能放置在其他货物上方`,
      cargoId: cargo.id
    });
  }

  return {
    valid: violations.length === 0,
    violations,
    stackLevel,
    supportingCargoIds,
    unsupportedAreaRatio
  };
};

/**
 * 验证方向约束
 */
export interface OrientationConfig {
  allowedRotations: RotationState[];
  thisSideUpRequired: boolean;
}

export const DEFAULT_ORIENTATION_CONFIG: OrientationConfig = {
  allowedRotations: [
    { x: 0, y: 0, z: 0 },
    { x: 90, y: 0, z: 0 },
    { x: 0, y: 90, z: 0 },
    { x: 0, y: 0, z: 90 },
    { x: 90, y: 90, z: 0 },
    { x: 90, y: 0, z: 90 }
  ],
  thisSideUpRequired: false
};

export const validateOrientation = (
  cargo: PlacedCargo,
  config: OrientationConfig = DEFAULT_ORIENTATION_CONFIG
): { valid: boolean; violations: ConstraintViolation[] } => {
  const violations: ConstraintViolation[] = [];

  // 检查此面朝上约束
  if (cargo.thisSideUp && cargo.rotation.x !== 0) {
    violations.push({
      type: 'orientation',
      message: `货物 ${cargo.name || cargo.id} 要求此面朝上，但被旋转了`,
      cargoId: cargo.id,
      details: { rotation: cargo.rotation }
    });
  }

  // 检查是否在允许的旋转列表中
  const isAllowed = config.allowedRotations.some(
    r => r.x === cargo.rotation.x && r.y === cargo.rotation.y && r.z === cargo.rotation.z
  );

  if (!isAllowed) {
    violations.push({
      type: 'orientation',
      message: `货物 ${cargo.name || cargo.id} 的旋转方向不被允许`,
      cargoId: cargo.id,
      details: { rotation: cargo.rotation, allowedRotations: config.allowedRotations }
    });
  }

  return {
    valid: violations.length === 0,
    violations
  };
};

/**
 * 验证重量约束
 */
export const validateWeightConstraint = (
  placedCargos: PlacedCargo[],
  containerSpec: ContainerSpec
): { valid: boolean; violations: ConstraintViolation[]; totalWeight: number } => {
  const violations: ConstraintViolation[] = [];

  const totalWeight = placedCargos.reduce(
    (sum, cargo) => sum + cargo.weight * cargo.placedQuantity,
    0
  );

  if (totalWeight > containerSpec.maxPayload) {
    violations.push({
      type: 'weight',
      message: `总重量超限: ${totalWeight.toFixed(2)}kg > ${containerSpec.maxPayload.toFixed(2)}kg`,
      details: { totalWeight, maxPayload: containerSpec.maxPayload }
    });
  }

  // 检查单个货物重量是否超过承载能力
  for (const cargo of placedCargos) {
    if (cargo.weight > containerSpec.maxPayload * 0.5) {
      violations.push({
        type: 'weight',
        message: `货物 ${cargo.name || cargo.id} 单件重量过大: ${cargo.weight.toFixed(2)}kg`,
        cargoId: cargo.id,
        details: { weight: cargo.weight, maxPayload: containerSpec.maxPayload }
      });
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    totalWeight
  };
};

/**
 * 验证边界约束
 */
export const validateBoundaryConstraint = (
  placedCargos: PlacedCargo[],
  containerSpec: ContainerSpec
): { valid: boolean; violations: ConstraintViolation[] } => {
  const violations: ConstraintViolation[] = [];

  for (const cargo of placedCargos) {
    const rotatedDims = applyRotation(cargo.dimensions, cargo.rotation);
    
    const endX = cargo.position.x + rotatedDims.length;
    const endY = cargo.position.y + rotatedDims.width;
    const endZ = cargo.position.z + rotatedDims.height;

    // 检查是否超出边界
    if (cargo.position.x < 0) {
      violations.push({
        type: 'boundary',
        message: `货物 ${cargo.name || cargo.id} X坐标为负: ${cargo.position.x.toFixed(2)}mm`,
        cargoId: cargo.id,
        details: { position: cargo.position }
      });
    }
    if (cargo.position.y < 0) {
      violations.push({
        type: 'boundary',
        message: `货物 ${cargo.name || cargo.id} Y坐标为负: ${cargo.position.y.toFixed(2)}mm`,
        cargoId: cargo.id,
        details: { position: cargo.position }
      });
    }
    if (cargo.position.z < 0) {
      violations.push({
        type: 'boundary',
        message: `货物 ${cargo.name || cargo.id} Z坐标为负: ${cargo.position.z.toFixed(2)}mm`,
        cargoId: cargo.id,
        details: { position: cargo.position }
      });
    }

    // 检查是否超出集装箱边界
    if (endX > containerSpec.innerDimensions.length) {
      violations.push({
        type: 'boundary',
        message: `货物 ${cargo.name || cargo.id} 超出长度边界: ${endX.toFixed(2)}mm > ${containerSpec.innerDimensions.length}mm`,
        cargoId: cargo.id,
        details: { endX, maxLength: containerSpec.innerDimensions.length }
      });
    }
    if (endY > containerSpec.innerDimensions.width) {
      violations.push({
        type: 'boundary',
        message: `货物 ${cargo.name || cargo.id} 超出宽度边界: ${endY.toFixed(2)}mm > ${containerSpec.innerDimensions.width}mm`,
        cargoId: cargo.id,
        details: { endY, maxWidth: containerSpec.innerDimensions.width }
      });
    }
    if (endZ > containerSpec.innerDimensions.height) {
      violations.push({
        type: 'boundary',
        message: `货物 ${cargo.name || cargo.id} 超出高度边界: ${endZ.toFixed(2)}mm > ${containerSpec.innerDimensions.height}mm`,
        cargoId: cargo.id,
        details: { endZ, maxHeight: containerSpec.innerDimensions.height }
      });
    }
  }

  return {
    valid: violations.length === 0,
    violations
  };
};

/**
 * 检查货物重叠
 */
export const checkOverlap = (placedCargos: PlacedCargo[]): ConstraintViolation[] => {
  const violations: ConstraintViolation[] = [];

  for (let i = 0; i < placedCargos.length; i++) {
    for (let j = i + 1; j < placedCargos.length; j++) {
      const cargo1 = placedCargos[i];
      const cargo2 = placedCargos[j];

      const dims1 = applyRotation(cargo1.dimensions, cargo1.rotation);
      const dims2 = applyRotation(cargo2.dimensions, cargo2.rotation);

      // 检查是否重叠
      const overlapX = !(
        cargo1.position.x + dims1.length <= cargo2.position.x ||
        cargo2.position.x + dims2.length <= cargo1.position.x
      );

      const overlapY = !(
        cargo1.position.y + dims1.width <= cargo2.position.y ||
        cargo2.position.y + dims2.width <= cargo1.position.y
      );

      const overlapZ = !(
        cargo1.position.z + dims1.height <= cargo2.position.z ||
        cargo2.position.z + dims2.height <= cargo1.position.z
      );

      if (overlapX && overlapY && overlapZ) {
        violations.push({
          type: 'overlap',
          message: `货物 ${cargo1.name || cargo1.id} 和 ${cargo2.name || cargo2.id} 重叠`,
          details: { cargo1: cargo1.id, cargo2: cargo2.id }
        });
      }
    }
  }

  return violations;
};

/**
 * 验证整个集装箱的所有约束
 */
export const validateContainerConstraints = (
  container: Container
): ConstraintResult => {
  const violations: ConstraintViolation[] = [];
  const warnings: ConstraintWarning[] = [];

  // 验证重量约束
  const weightResult = validateWeightConstraint(container.placedCargos, container.spec);
  violations.push(...weightResult.violations);

  // 验证边界约束
  const boundaryResult = validateBoundaryConstraint(container.placedCargos, container.spec);
  violations.push(...boundaryResult.violations);

  // 验证重心约束
  const cogResult = validateCenterOfGravity(container.placedCargos, container.spec);
  violations.push(...cogResult.violations);
  warnings.push(...cogResult.warnings);

  // 检查堆叠约束
  for (const cargo of container.placedCargos) {
    const stackingResult = checkStackingConstraint(cargo, container.placedCargos, container.spec);
    violations.push(...stackingResult.violations);
    
    // 添加堆叠警告
    if (stackingResult.unsupportedAreaRatio > 0.1 && stackingResult.unsupportedAreaRatio <= 0.3) {
      warnings.push({
        type: 'stacking',
        message: `货物 ${cargo.name || cargo.id} 承托面积较小: ${((1 - stackingResult.unsupportedAreaRatio) * 100).toFixed(0)}%`,
        cargoId: cargo.id,
        severity: 'low'
      });
    }
  }

  // 检查方向约束
  for (const cargo of container.placedCargos) {
    const orientationResult = validateOrientation(cargo);
    violations.push(...orientationResult.violations);
  }

  // 检查货物重叠
  const overlapViolations = checkOverlap(container.placedCargos);
  violations.push(...overlapViolations);

  return {
    valid: violations.length === 0,
    violations,
    warnings
  };
};

/**
 * 验证整个装箱结果
 */
export const validatePackingResult = (
  containers: Container[]
): { valid: boolean; violations: ConstraintViolation[]; warnings: ConstraintWarning[] } => {
  const violations: ConstraintViolation[] = [];
  const warnings: ConstraintWarning[] = [];

  for (const container of containers) {
    const result = validateContainerConstraints(container);
    violations.push(...result.violations);
    warnings.push(...result.warnings);
  }

  return {
    valid: violations.length === 0,
    violations,
    warnings
  };
};

/**
 * 应用旋转变换后的尺寸（从ffd.ts导入）
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

export default {
  calculateCenterOfGravity,
  validateCenterOfGravity,
  checkStackingConstraint,
  validateOrientation,
  validateWeightConstraint,
  validateBoundaryConstraint,
  checkOverlap,
  validateContainerConstraints,
  validatePackingResult,
  DEFAULT_COG_CONFIG,
  DEFAULT_ORIENTATION_CONFIG
};
