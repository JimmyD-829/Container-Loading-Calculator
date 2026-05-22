import { Solution, SolutionComparison, PackingResult } from '../types';

export interface ComparisonMetric {
  label: string;
  values: number[];
  unit?: string;
  bestIndex?: number;
  worstIndex?: number;
}

export interface ComparisonResult {
  solutions: Solution[];
  metrics: ComparisonMetric[];
  summary: {
    bestVolumeUtilization: Solution | null;
    bestWeightUtilization: Solution | null;
    leastContainers: Solution | null;
    fastestCalculation: Solution | null;
  };
  differences: string[];
}

const calculateTotalVolumeUtilization = (result: PackingResult | null): number => {
  if (!result) return 0;
  return result.totalStats.volumeUtilization || 0;
};

const calculateTotalWeightUtilization = (result: PackingResult | null): number => {
  if (!result) return 0;
  return (result.totalStats.totalWeight / (result.totalStats.totalContainers * 30000)) * 100 || 0;
};

const getTotalContainers = (result: PackingResult | null): number => {
  if (!result) return 0;
  return result.totalStats.totalContainers || 0;
};

const getCalculationTime = (result: PackingResult | null): number => {
  if (!result) return 0;
  return result.duration || 0;
};

const getCargoCount = (result: PackingResult | null): number => {
  if (!result) return 0;
  return result.totalStats.placedCargos || 0;
};

const getUnplacedCargos = (result: PackingResult | null): number => {
  if (!result) return 0;
  return result.totalStats.unplacedCargos || 0;
};

export const compareSolutions = (solutions: Solution[]): ComparisonResult => {
  if (solutions.length < 2) {
    return {
      solutions,
      metrics: [],
      summary: {
        bestVolumeUtilization: null,
        bestWeightUtilization: null,
        leastContainers: null,
        fastestCalculation: null,
      },
      differences: [],
    };
  }

  const metrics: ComparisonMetric[] = [];

  const volumeUtilizations = solutions.map(s => calculateTotalVolumeUtilization(s.result));
  const weightUtilizations = solutions.map(s => calculateTotalWeightUtilization(s.result));
  const containerCounts = solutions.map(s => getTotalContainers(s.result));
  const calculationTimes = solutions.map(s => getCalculationTime(s.result));
  const cargoCounts = solutions.map(s => getCargoCount(s.result));
  const unplacedCounts = solutions.map(s => getUnplacedCargos(s.result));

  metrics.push({
    label: '体积利用率',
    values: volumeUtilizations,
    unit: '%',
    bestIndex: volumeUtilizations.indexOf(Math.max(...volumeUtilizations)),
    worstIndex: volumeUtilizations.indexOf(Math.min(...volumeUtilizations)),
  });

  metrics.push({
    label: '重量利用率',
    values: weightUtilizations,
    unit: '%',
    bestIndex: weightUtilizations.indexOf(Math.max(...weightUtilizations)),
    worstIndex: weightUtilizations.indexOf(Math.min(...weightUtilizations)),
  });

  metrics.push({
    label: '集装箱数量',
    values: containerCounts,
    unit: '个',
    bestIndex: containerCounts.indexOf(Math.min(...containerCounts)),
    worstIndex: containerCounts.indexOf(Math.max(...containerCounts)),
  });

  metrics.push({
    label: '计算耗时',
    values: calculationTimes,
    unit: 'ms',
    bestIndex: calculationTimes.indexOf(Math.min(...calculationTimes)),
    worstIndex: calculationTimes.indexOf(Math.max(...calculationTimes)),
  });

  metrics.push({
    label: '已装货物数',
    values: cargoCounts,
    unit: '件',
    bestIndex: cargoCounts.indexOf(Math.max(...cargoCounts)),
    worstIndex: cargoCounts.indexOf(Math.min(...cargoCounts)),
  });

  metrics.push({
    label: '未装货物数',
    values: unplacedCounts,
    unit: '件',
    bestIndex: unplacedCounts.indexOf(Math.min(...unplacedCounts)),
    worstIndex: unplacedCounts.indexOf(Math.max(...unplacedCounts)),
  });

  const bestVolumeIndex = volumeUtilizations.indexOf(Math.max(...volumeUtilizations));
  const bestWeightIndex = weightUtilizations.indexOf(Math.max(...weightUtilizations));
  const bestContainerIndex = containerCounts.indexOf(Math.min(...containerCounts));
  const bestTimeIndex = calculationTimes.indexOf(Math.min(...calculationTimes));

  const differences: string[] = [];

  solutions.forEach((sol, index) => {
    const other = solutions[(index + 1) % solutions.length];
    const volDiff = Math.abs(volumeUtilizations[index] - volumeUtilizations[(index + 1) % solutions.length]);
    const contDiff = Math.abs(containerCounts[index] - containerCounts[(index + 1) % solutions.length]);
    
    if (volDiff > 5) {
      differences.push(`${sol.name} 与 ${other.name} 的体积利用率差异较大 (${volDiff.toFixed(1)}%)`);
    }
    if (contDiff > 0) {
      differences.push(`${sol.name} 比 ${other.name} ${containerCounts[index] > containerCounts[(index + 1) % solutions.length] ? '多' : '少'} 使用 ${contDiff} 个集装箱`);
    }
  });

  return {
    solutions,
    metrics,
    summary: {
      bestVolumeUtilization: solutions[bestVolumeIndex],
      bestWeightUtilization: solutions[bestWeightIndex],
      leastContainers: solutions[bestContainerIndex],
      fastestCalculation: solutions[bestTimeIndex],
    },
    differences,
  };
};

export const generateComparisonReport = (solutions: Solution[]): string => {
  const comparison = compareSolutions(solutions);
  
  let report = `方案对比报告\n`;
  report += `================================\n\n`;
  
  report += `参与对比的方案:\n`;
  solutions.forEach((sol, index) => {
    report += `${index + 1}. ${sol.name} (版本: ${sol.currentVersion})\n`;
    report += `   状态: ${sol.status}\n`;
    report += `   创建时间: ${sol.createdAt.toLocaleString()}\n`;
    report += `\n`;
  });
  
  report += `对比指标:\n`;
  report += `--------------------------------\n`;
  
  comparison.metrics.forEach(metric => {
    report += `${metric.label}:\n`;
    solutions.forEach((sol, index) => {
      const value = metric.values[index];
      const unit = metric.unit || '';
      let marker = '';
      if (metric.bestIndex === index) marker = ' ★ 最佳';
      if (metric.worstIndex === index) marker = ' ✗ 最差';
      report += `   ${sol.name}: ${value.toFixed(2)}${unit}${marker}\n`;
    });
    report += `\n`;
  });
  
  report += `总结:\n`;
  report += `--------------------------------\n`;
  
  if (comparison.summary.bestVolumeUtilization) {
    report += `• 最佳体积利用率: ${comparison.summary.bestVolumeUtilization.name}\n`;
  }
  if (comparison.summary.bestWeightUtilization) {
    report += `• 最佳重量利用率: ${comparison.summary.bestWeightUtilization.name}\n`;
  }
  if (comparison.summary.leastContainers) {
    report += `• 使用集装箱最少: ${comparison.summary.leastContainers.name}\n`;
  }
  if (comparison.summary.fastestCalculation) {
    report += `• 计算速度最快: ${comparison.summary.fastestCalculation.name}\n`;
  }
  
  if (comparison.differences.length > 0) {
    report += `\n主要差异:\n`;
    report += `--------------------------------\n`;
    comparison.differences.forEach((diff, index) => {
      report += `${index + 1}. ${diff}\n`;
    });
  }
  
  report += `\n================================\n`;
  report += `报告生成时间: ${new Date().toLocaleString()}`;
  
  return report;
};

export const findBestSolution = (solutions: Solution[]): Solution | null => {
  if (solutions.length === 0) return null;
  if (solutions.length === 1) return solutions[0];

  const comparison = compareSolutions(solutions);
  
  const scores: number[] = solutions.map((_, index) => {
    let score = 0;
    
    comparison.metrics.forEach(metric => {
      if (metric.bestIndex === index) score += 10;
      if (metric.worstIndex === index) score -= 5;
    });
    
    return score;
  });

  const bestIndex = scores.indexOf(Math.max(...scores));
  return solutions[bestIndex];
};