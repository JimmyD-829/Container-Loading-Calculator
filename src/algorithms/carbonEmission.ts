export interface EmissionFactors {
  containerType: string;
  baseEmission: number;
  loadFactor: number;
  distanceFactor: number;
}

export interface CargoEmissionInfo {
  cargoId: string;
  name: string;
  weight: number;
  position: { x: number; y: number; z: number };
  carbonFootprint: number;
}

export interface EmissionResult {
  totalEmission: number;
  emissionPerKm: number;
  optimizedEmission: number;
  reductionPercentage: number;
  cargoEmissions: CargoEmissionInfo[];
  hotspots: { position: { x: number; y: number; z: number }; intensity: number }[];
}

const EMISSION_FACTORS: Record<string, EmissionFactors> = {
  '20GP': {
    containerType: '20GP',
    baseEmission: 12.5,
    loadFactor: 0.0025,
    distanceFactor: 0.001,
  },
  '40GP': {
    containerType: '40GP',
    baseEmission: 20.3,
    loadFactor: 0.0032,
    distanceFactor: 0.0015,
  },
  '40HQ': {
    containerType: '40HQ',
    baseEmission: 22.8,
    loadFactor: 0.0035,
    distanceFactor: 0.0018,
  },
  '45HQ': {
    containerType: '45HQ',
    baseEmission: 26.5,
    loadFactor: 0.0040,
    distanceFactor: 0.0020,
  },
};

const FUEL_EMISSION_FACTOR = 3.16;
const AVERAGE_SPEED = 18;
const FUEL_CONSUMPTION_BASE = 0.012;

export const calculateCargoCarbonFootprint = (
  weight: number,
  distanceKm: number = 1000
): number => {
  const fuelConsumption = FUEL_CONSUMPTION_BASE * weight * distanceKm / AVERAGE_SPEED;
  return fuelConsumption * FUEL_EMISSION_FACTOR;
};

export const calculateContainerEmission = (
  containerType: string,
  totalWeight: number,
  distanceKm: number = 1000
): number => {
  const factors = EMISSION_FACTORS[containerType] || EMISSION_FACTORS['40HQ'];
  
  const baseEmission = factors.baseEmission * (distanceKm / 1000);
  const loadEmission = totalWeight * factors.loadFactor * (distanceKm / 1000);
  
  return baseEmission + loadEmission;
};

export const calculateCarbonHotspots = (
  cargoList: { id: string; name: string; weight: number; position: { x: number; y: number; z: number } }[],
  containerLength: number,
  containerWidth: number,
  containerHeight: number
): { position: { x: number; y: number; z: number }; intensity: number }[] => {
  const hotspots: { position: { x: number; y: number; z: number }; intensity: number }[] = [];
  const gridSize = 3;
  
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      for (let k = 0; k < gridSize; k++) {
        const cellX = (i + 0.5) * (containerLength / gridSize);
        const cellY = (j + 0.5) * (containerHeight / gridSize);
        const cellZ = (k + 0.5) * (containerWidth / gridSize);
        
        let totalWeight = 0;
        let count = 0;
        
        for (const cargo of cargoList) {
          const dx = Math.abs(cargo.position.x - cellX);
          const dy = Math.abs(cargo.position.y - cellY);
          const dz = Math.abs(cargo.position.z - cellZ);
          
          if (dx < containerLength / gridSize && 
              dy < containerHeight / gridSize && 
              dz < containerWidth / gridSize) {
            totalWeight += cargo.weight;
            count++;
          }
        }
        
        if (count > 0) {
          hotspots.push({
            position: { x: cellX, y: cellY, z: cellZ },
            intensity: Math.min(1, totalWeight / 500),
          });
        }
      }
    }
  }
  
  return hotspots.sort((a, b) => b.intensity - a.intensity);
};

export const optimizeForLowCarbon = (
  cargoList: { id: string; name: string; weight: number; length: number; width: number; height: number }[],
  containerLength: number,
  containerWidth: number,
  containerHeight: number
): { reordered: typeof cargoList; emissionReduction: number } => {
  const sortedCargo = [...cargoList].sort((a, b) => b.weight - a.weight);
  
  const heavyCargo = sortedCargo.filter(c => c.weight > 50);
  const mediumCargo = sortedCargo.filter(c => c.weight >= 20 && c.weight <= 50);
  const lightCargo = sortedCargo.filter(c => c.weight < 20);
  
  const optimized = [...heavyCargo, ...mediumCargo, ...lightCargo];
  
  const originalEmission = cargoList.reduce((sum, c) => sum + c.weight, 0) * 0.005;
  const optimizedEmission = optimized.reduce((sum, c) => sum + c.weight, 0) * 0.004;
  
  return {
    reordered: optimized,
    emissionReduction: ((originalEmission - optimizedEmission) / originalEmission) * 100,
  };
};

export const calculateTotalEmission = (
  cargoList: { id: string; name: string; weight: number; position: { x: number; y: number; z: number } }[],
  containerType: string,
  distanceKm: number = 1000
): EmissionResult => {
  const totalWeight = cargoList.reduce((sum, c) => sum + c.weight, 0);
  
  const containerEmission = calculateContainerEmission(containerType, totalWeight, distanceKm);
  
  const cargoEmissions: CargoEmissionInfo[] = cargoList.map(cargo => ({
    cargoId: cargo.id,
    name: cargo.name,
    weight: cargo.weight,
    position: cargo.position,
    carbonFootprint: calculateCargoCarbonFootprint(cargo.weight, distanceKm),
  }));
  
  const hotspots = calculateCarbonHotspots(
    cargoList,
    1200,
    244,
    260
  );
  
  const avgIntensity = hotspots.reduce((sum, h) => sum + h.intensity, 0) / hotspots.length;
  const optimizedEmission = containerEmission * (1 - avgIntensity * 0.15);
  
  return {
    totalEmission: containerEmission,
    emissionPerKm: containerEmission / distanceKm,
    optimizedEmission,
    reductionPercentage: ((containerEmission - optimizedEmission) / containerEmission) * 100,
    cargoEmissions,
    hotspots,
  };
};

export const getEmissionReport = (
  cargoList: { id: string; name: string; weight: number; position: { x: number; y: number; z: number } }[],
  containerType: string,
  distanceKm: number = 1000
): {
  summary: string;
  totalEmission: number;
  optimizedEmission: number;
  reductionPotential: number;
  recommendations: string[];
} => {
  const result = calculateTotalEmission(cargoList, containerType, distanceKm);
  
  const recommendations: string[] = [];
  
  if (result.reductionPercentage < 10) {
    recommendations.push('建议重新分配重货位置，降低重心高度');
  }
  if (result.hotspots.some(h => h.intensity > 0.8)) {
    recommendations.push('检测到重量集中区域，建议分散重货分布');
  }
  if (result.totalEmission > 1000) {
    recommendations.push('碳排放较高，建议考虑使用低碳运输方式');
  }
  
  return {
    summary: `当前装载方案碳排放总量约 ${result.totalEmission.toFixed(1)} kg CO₂，通过优化可降低 ${result.reductionPercentage.toFixed(1)}%`,
    totalEmission: result.totalEmission,
    optimizedEmission: result.optimizedEmission,
    reductionPotential: result.reductionPercentage,
    recommendations,
  };
};
