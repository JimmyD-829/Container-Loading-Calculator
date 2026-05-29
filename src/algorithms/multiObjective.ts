import { CargoItem, ContainerType, PackingResult } from '../types';

export interface MultiObjectiveWeights {
  spaceUtilization: number;
  centerOfGravity: number;
  stackingStability: number;
  loadingCost: number;
  unloadingOrder: number;
}

export interface ObjectiveScore {
  spaceUtilization: number;
  centerOfGravityScore: number;
  stackingStability: number;
  loadingCost: number;
  unloadingOrder: number;
  weightedScore: number;
}

export interface MultiObjectiveResult {
  result: PackingResult;
  scores: ObjectiveScore;
  paretoRank: number;
}

export const DEFAULT_WEIGHTS: MultiObjectiveWeights = {
  spaceUtilization: 0.35,
  centerOfGravity: 0.25,
  stackingStability: 0.15,
  loadingCost: 0.15,
  unloadingOrder: 0.10,
};

export const calculateCenterOfGravityScore = (
  cargoList: { position: { x: number; y: number; z: number }; weight: number }[],
  container: ContainerType
): number => {
  if (cargoList.length === 0) return 0;

  const totalWeight = cargoList.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return 0;

  const cx = cargoList.reduce((sum, c) => sum + c.position.x * c.weight, 0) / totalWeight;
  const cy = cargoList.reduce((sum, c) => sum + c.position.y * c.weight, 0) / totalWeight;
  const cz = cargoList.reduce((sum, c) => sum + c.position.z * c.weight, 0) / totalWeight;

  const idealX = container.length / 2;
  const idealY = container.height / 3;
  const idealZ = container.width / 2;

  const dx = Math.abs(cx - idealX) / (container.length / 2);
  const dy = Math.abs(cy - idealY) / (container.height / 2);
  const dz = Math.abs(cz - idealZ) / (container.width / 2);

  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) / Math.sqrt(3);
  
  return Math.max(0, 1 - distance);
};

export const calculateStackingStability = (
  cargoList: { position: { x: number; y: number; z: number }; weight: number; length: number; width: number }[],
  container: ContainerType
): number => {
  if (cargoList.length === 0) return 0;

  let stabilityScore = 0;
  let validStacks = 0;

  const sortedByY = [...cargoList].sort((a, b) => b.position.y - a.position.y);

  for (let i = 0; i < sortedByY.length; i++) {
    const cargo = sortedByY[i];
    const baseCargoes = sortedByY.filter(c => 
      c.position.y < cargo.position.y - cargo.height * 0.5 &&
      Math.abs(c.position.x - cargo.position.x) < (c.length + cargo.length) / 2 &&
      Math.abs(c.position.z - cargo.position.z) < (c.width + cargo.width) / 2
    );

    if (baseCargoes.length > 0) {
      const baseWeight = baseCargoes.reduce((sum, c) => sum + c.weight, 0);
      const stability = Math.min(1, baseWeight / (cargo.weight * 2));
      stabilityScore += stability;
      validStacks++;
    } else if (cargo.position.y < container.height * 0.1) {
      stabilityScore += 1;
      validStacks++;
    }
  }

  return validStacks > 0 ? stabilityScore / validStacks : 0;
};

export const calculateLoadingCost = (
  cargoList: { position: { x: number; y: number; z: number }; weight: number }[],
  container: ContainerType
): number => {
  if (cargoList.length === 0) return 0;

  const avgDistance = cargoList.reduce((sum, c) => {
    const distance = Math.sqrt(
      Math.pow(c.position.x, 2) + 
      Math.pow(c.position.y, 2) + 
      Math.pow(c.position.z, 2)
    );
    return sum + distance;
  }, 0) / cargoList.length;

  const maxDistance = Math.sqrt(
    Math.pow(container.length, 2) + 
    Math.pow(container.height, 2) + 
    Math.pow(container.width, 2)
  );

  return 1 - (avgDistance / maxDistance);
};

export const calculateUnloadingOrderScore = (
  cargoList: { position: { x: number; y: number; z: number }; id: string }[],
  priorityOrders: string[] = []
): number => {
  if (cargoList.length === 0) return 0;

  const prioritySet = new Set(priorityOrders);
  let score = 0;
  let matched = 0;

  for (const cargo of cargoList) {
    if (prioritySet.has(cargo.id)) {
      const distanceFromDoor = cargo.position.x;
      const isNearDoor = distanceFromDoor < 100;
      score += isNearDoor ? 1 : 0.5;
      matched++;
    }
  }

  return matched > 0 ? score / matched : 0;
};

export const calculateMultiObjectiveScore = (
  cargoList: { position: { x: number; y: number; z: number }; weight: number; length: number; width: number; id: string }[],
  container: ContainerType,
  weights: MultiObjectiveWeights = DEFAULT_WEIGHTS,
  spaceUtilization: number,
  priorityOrders: string[] = []
): ObjectiveScore => {
  const centerOfGravityScore = calculateCenterOfGravityScore(
    cargoList,
    container
  );

  const stackingStability = calculateStackingStability(
    cargoList,
    container
  );

  const loadingCost = calculateLoadingCost(
    cargoList,
    container
  );

  const unloadingOrder = calculateUnloadingOrderScore(
    cargoList,
    priorityOrders
  );

  const weightedScore =
    spaceUtilization * weights.spaceUtilization +
    centerOfGravityScore * weights.centerOfGravity +
    stackingStability * weights.stackingStability +
    loadingCost * weights.loadingCost +
    unloadingOrder * weights.unloadingOrder;

  return {
    spaceUtilization,
    centerOfGravityScore,
    stackingStability,
    loadingCost,
    unloadingOrder,
    weightedScore,
  };
};

export const findParetoFrontier = (
  results: PackingResult[],
  container: ContainerType,
  weights: MultiObjectiveWeights = DEFAULT_WEIGHTS
): MultiObjectiveResult[] => {
  const scoredResults: MultiObjectiveResult[] = results.map((result, index) => {
    const totalCargoList = result.containers.flatMap(c => 
      c.cargoList.map(cargo => ({
        ...cargo,
        position: cargo.position || { x: 0, y: 0, z: 0 },
      }))
    );

    const avgUtilization = result.containers.reduce(
      (sum, c) => sum + c.volumeUtilization,
      0
    ) / result.containers.length;

    const scores = calculateMultiObjectiveScore(
      totalCargoList,
      container,
      weights,
      avgUtilization
    );

    return {
      result,
      scores,
      paretoRank: 0,
    };
  });

  scoredResults.sort((a, b) => b.scores.weightedScore - a.scores.weightedScore);

  let rank = 1;
  for (let i = 0; i < scoredResults.length; i++) {
    if (i === 0 || scoredResults[i].scores.weightedScore < scoredResults[i - 1].scores.weightedScore - 0.01) {
      rank++;
    }
    scoredResults[i].paretoRank = rank;
  }

  return scoredResults;
};

export const normalizeWeights = (weights: MultiObjectiveWeights): MultiObjectiveWeights => {
  const total = 
    weights.spaceUtilization +
    weights.centerOfGravity +
    weights.stackingStability +
    weights.loadingCost +
    weights.unloadingOrder;

  if (total === 0) return DEFAULT_WEIGHTS;

  return {
    spaceUtilization: weights.spaceUtilization / total,
    centerOfGravity: weights.centerOfGravity / total,
    stackingStability: weights.stackingStability / total,
    loadingCost: weights.loadingCost / total,
    unloadingOrder: weights.unloadingOrder / total,
  };
};
