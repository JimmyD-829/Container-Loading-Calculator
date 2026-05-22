import { Solution, Cargo, ContainerSpec, CalculationSettings } from '../types';
import { solutionStorage } from './solutionStorage';

export interface SimilarityResult {
  solution: Solution;
  similarityScore: number;
  matches: {
    cargoMatch: number;
    containerMatch: number;
    settingsMatch: number;
  };
  reasons: string[];
}

export interface ReuseOptions {
  ignoreCargoQuantity?: boolean;
  ignoreCargoWeight?: boolean;
  allowContainerVariants?: boolean;
}

const calculateCargoSimilarity = (
  targetCargos: Cargo[],
  solutionCargoIds: string[],
  options: ReuseOptions = {}
): number => {
  if (targetCargos.length === 0 || solutionCargoIds.length === 0) {
    return 0;
  }

  const targetCargoNames = new Set(targetCargos.map(c => c.name.toLowerCase()));
  const targetCargoTypes = new Set(targetCargos.map(c => c.type));
  
  let matchCount = 0;
  let totalScore = 0;

  solutionCargoIds.forEach(id => {
    const cargo = targetCargos.find(c => c.id === id);
    if (cargo) {
      matchCount++;
      totalScore += 100;
    } else {
      const cargoName = id.split('-')[0]?.toLowerCase();
      if (cargoName && targetCargoNames.has(cargoName)) {
        totalScore += 70;
      }
    }
  });

  const typeMatchScore = targetCargoTypes.size > 0
    ? (matchCount / targetCargoTypes.size) * 50
    : 0;

  return Math.min(100, (totalScore / solutionCargoIds.length) + typeMatchScore);
};

const calculateContainerSimilarity = (
  targetContainers: ContainerSpec[],
  solutionContainers: ContainerSpec[],
  options: ReuseOptions = {}
): number => {
  if (targetContainers.length === 0 || solutionContainers.length === 0) {
    return 0;
  }

  let score = 0;
  let matched = 0;

  targetContainers.forEach(target => {
    solutionContainers.forEach(solution => {
      const lengthMatch = Math.abs(target.innerDimensions.length - solution.innerDimensions.length) < 1000 ? 1 : 0;
      const widthMatch = Math.abs(target.innerDimensions.width - solution.innerDimensions.width) < 500 ? 1 : 0;
      const heightMatch = Math.abs(target.innerDimensions.height - solution.innerDimensions.height) < 500 ? 1 : 0;

      if (lengthMatch && widthMatch && heightMatch) {
        matched++;
        score += 100;
      } else if (options.allowContainerVariants && lengthMatch && widthMatch) {
        score += 75;
      }
    });
  });

  return matched > 0 ? Math.min(100, score / solutionContainers.length) : 0;
};

const calculateSettingsSimilarity = (
  targetSettings: CalculationSettings,
  solutionSettings: CalculationSettings
): number => {
  let score = 0;
  let checks = 0;

  if (targetSettings.algorithm === solutionSettings.algorithm) score += 33;
  checks++;

  if (targetSettings.allowRotation === solutionSettings.allowRotation) score += 33;
  checks++;

  if (targetSettings.prioritizeWeight === solutionSettings.prioritizeWeight) score += 34;
  checks++;

  return (score / checks) * 100;
};

export const findSimilarSolutions = (
  cargos: Cargo[],
  containers: ContainerSpec[],
  settings: CalculationSettings,
  options: ReuseOptions = {},
  limit: number = 5
): SimilarityResult[] => {
  const allSolutions = solutionStorage.getAllSolutions();
  
  if (allSolutions.length === 0) return [];

  const results: SimilarityResult[] = allSolutions.map(solution => {
    const cargoMatch = calculateCargoSimilarity(cargos, solution.cargoIds, options);
    const containerMatch = calculateContainerSimilarity(containers, solution.containerSpecs, options);
    const settingsMatch = solution.settings ? calculateSettingsSimilarity(settings, solution.settings) : 0;

    const similarityScore = (cargoMatch * 0.5) + (containerMatch * 0.3) + (settingsMatch * 0.2);

    const reasons: string[] = [];
    if (cargoMatch >= 80) reasons.push('货物配置高度匹配');
    if (cargoMatch >= 50 && cargoMatch < 80) reasons.push('货物配置部分匹配');
    if (containerMatch >= 80) reasons.push('集装箱规格高度匹配');
    if (containerMatch >= 50 && containerMatch < 80) reasons.push('集装箱规格部分匹配');
    if (settingsMatch >= 75) reasons.push('计算配置相似');

    return {
      solution,
      similarityScore,
      matches: {
        cargoMatch,
        containerMatch,
        settingsMatch,
      },
      reasons,
    };
  });

  return results
    .filter(r => r.similarityScore >= 30)
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, limit);
};

export const adaptSolution = (
  sourceSolution: Solution,
  newCargos: Cargo[],
  newContainers?: ContainerSpec[],
  newSettings?: Partial<CalculationSettings>
): Partial<Solution> => {
  const adaptedCargoIds = newCargos.map(c => c.id);
  
  const adaptedContainers = newContainers || sourceSolution.containerSpecs;
  
  const adaptedSettings: CalculationSettings = {
    ...sourceSolution.settings,
    ...newSettings,
  };

  return {
    name: `${sourceSolution.name} - 复用`,
    description: `基于 "${sourceSolution.name}" 复用生成`,
    cargoIds: adaptedCargoIds,
    containerSpecs: adaptedContainers,
    settings: adaptedSettings,
    tags: [...sourceSolution.tags],
  };
};

export const generateReuseSuggestion = (
  similarSolutions: SimilarityResult[]
): string => {
  if (similarSolutions.length === 0) {
    return '未找到相似方案，建议从头开始创建装载方案。';
  }

  const bestMatch = similarSolutions[0];
  const suggestions: string[] = [];

  if (bestMatch.similarityScore >= 80) {
    suggestions.push(`强烈建议复用方案「${bestMatch.solution.name}」，相似度高达 ${bestMatch.similarityScore.toFixed(1)}%`);
  } else if (bestMatch.similarityScore >= 60) {
    suggestions.push(`建议参考方案「${bestMatch.solution.name}」，相似度 ${bestMatch.similarityScore.toFixed(1)}%`);
  } else {
    suggestions.push(`找到相似方案「${bestMatch.solution.name}」，可作为参考`);
  }

  if (bestMatch.matches.cargoMatch < 70) {
    suggestions.push('提示：货物配置差异较大，建议检查货物清单');
  }

  if (bestMatch.matches.containerMatch < 70) {
    suggestions.push('提示：集装箱规格存在差异，请注意核对');
  }

  if (similarSolutions.length > 1) {
    suggestions.push(`共找到 ${similarSolutions.length} 个相似方案可供选择`);
  }

  return suggestions.join(' ');
};

export const analyzeReusePotential = (
  cargos: Cargo[],
  containers: ContainerSpec[],
  settings: CalculationSettings
): {
  hasPotential: boolean;
  bestMatch: SimilarityResult | null;
  suggestion: string;
} => {
  const similar = findSimilarSolutions(cargos, containers, settings);
  
  if (similar.length === 0) {
    return {
      hasPotential: false,
      bestMatch: null,
      suggestion: '未找到可复用的历史方案',
    };
  }

  const bestMatch = similar[0];
  
  return {
    hasPotential: bestMatch.similarityScore >= 50,
    bestMatch,
    suggestion: generateReuseSuggestion(similar),
  };
};