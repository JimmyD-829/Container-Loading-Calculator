import { Solution, SolutionStatus, SolutionVersion, SolutionQuery, ContainerSpec, CalculationSettings, PackingResult } from '../types';

const STORAGE_KEY = 'container-loading-solutions';

let solutions: Solution[] = [];

const loadSolutions = (): Solution[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return parsed.map((s: any) => ({
        ...s,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
        lastCalculatedAt: s.lastCalculatedAt ? new Date(s.lastCalculatedAt) : undefined,
        approvedAt: s.approvedAt ? new Date(s.approvedAt) : undefined,
        versions: s.versions.map((v: any) => ({
          ...v,
          createdAt: new Date(v.createdAt),
        })),
      }));
    }
  } catch (error) {
    console.error('Failed to load solutions:', error);
  }
  return [];
};

const saveSolutions = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(solutions));
  } catch (error) {
    console.error('Failed to save solutions:', error);
  }
};

solutions = loadSolutions();

export const solutionStorage = {
  getAllSolutions(): Solution[] {
    return [...solutions];
  },

  getSolutionById(id: string): Solution | undefined {
    return solutions.find(s => s.id === id);
  },

  createSolution(
    name: string,
    description: string,
    cargoIds: string[],
    containerSpecs: ContainerSpec[],
    settings: CalculationSettings
  ): Solution {
    const now = new Date();
    const solution: Solution = {
      id: `solution-${Date.now()}`,
      name,
      description,
      status: SolutionStatus.DRAFT,
      tags: [],
      cargoIds,
      containerSpecs,
      settings,
      result: null,
      currentVersion: '1.0.0',
      versions: [
        {
          id: `version-${Date.now()}`,
          versionNumber: '1.0.0',
          createdAt: now,
          createdBy: 'user',
          comment: 'Initial version',
          changes: ['Initial creation'],
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    solutions.push(solution);
    saveSolutions();
    return solution;
  },

  updateSolution(id: string, updates: Partial<Solution>): Solution | undefined {
    const index = solutions.findIndex(s => s.id === id);
    if (index === -1) return undefined;

    solutions[index] = {
      ...solutions[index],
      ...updates,
      updatedAt: new Date(),
    };
    saveSolutions();
    return solutions[index];
  },

  updateSolutionResult(id: string, result: PackingResult): Solution | undefined {
    const index = solutions.findIndex(s => s.id === id);
    if (index === -1) return undefined;

    const solution = solutions[index];
    const newVersionNumber = this.generateVersionNumber(solution.currentVersion);
    const now = new Date();

    const newVersion: SolutionVersion = {
      id: `version-${Date.now()}`,
      versionNumber: newVersionNumber,
      createdAt: now,
      createdBy: 'user',
      comment: 'Calculation completed',
      changes: ['Recalculated packing result'],
    };

    solutions[index] = {
      ...solution,
      result,
      currentVersion: newVersionNumber,
      versions: [...solution.versions, newVersion],
      status: SolutionStatus.CALCULATED,
      lastCalculatedAt: now,
      updatedAt: now,
    };
    saveSolutions();
    return solutions[index];
  },

  deleteSolution(id: string): boolean {
    const index = solutions.findIndex(s => s.id === id);
    if (index === -1) return false;

    solutions.splice(index, 1);
    saveSolutions();
    return true;
  },

  searchSolutions(query: SolutionQuery): { data: Solution[]; total: number } {
    let filtered = [...solutions];

    if (query.keywords) {
      const keywords = query.keywords.toLowerCase();
      filtered = filtered.filter(
        s => s.name.toLowerCase().includes(keywords) ||
             s.description?.toLowerCase().includes(keywords)
      );
    }

    if (query.status && query.status.length > 0) {
      filtered = filtered.filter(s => query.status!.includes(s.status));
    }

    if (query.tags && query.tags.length > 0) {
      filtered = filtered.filter(s =>
        s.tags.some(t => query.tags!.includes(t.id))
      );
    }

    if (query.dateRange) {
      filtered = filtered.filter(s => {
        const createdAt = s.createdAt.getTime();
        return createdAt >= query.dateRange!.start.getTime() &&
               createdAt <= query.dateRange!.end.getTime();
      });
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    filtered.sort((a, b) => {
      const aValue = a[sortBy as keyof Solution] as string | number | Date;
      const bValue = b[sortBy as keyof Solution] as string | number | Date;

      let comparison = 0;
      if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    const start = (query.page - 1) * query.pageSize;
    const end = start + query.pageSize;
    const paginated = filtered.slice(start, end);

    return {
      data: paginated,
      total: filtered.length,
    };
  },

  addTag(solutionId: string, tagName: string, color: string): Solution | undefined {
    const index = solutions.findIndex(s => s.id === solutionId);
    if (index === -1) return undefined;

    const tag = {
      id: `tag-${Date.now()}`,
      name: tagName,
      color,
    };

    solutions[index].tags.push(tag);
    solutions[index].updatedAt = new Date();
    saveSolutions();
    return solutions[index];
  },

  removeTag(solutionId: string, tagId: string): Solution | undefined {
    const index = solutions.findIndex(s => s.id === solutionId);
    if (index === -1) return undefined;

    solutions[index].tags = solutions[index].tags.filter(t => t.id !== tagId);
    solutions[index].updatedAt = new Date();
    saveSolutions();
    return solutions[index];
  },

  changeStatus(solutionId: string, status: SolutionStatus): Solution | undefined {
    const index = solutions.findIndex(s => s.id === solutionId);
    if (index === -1) return undefined;

    solutions[index].status = status;
    solutions[index].updatedAt = new Date();

    if (status === SolutionStatus.APPROVED) {
      solutions[index].approvedBy = 'user';
      solutions[index].approvedAt = new Date();
    }

    saveSolutions();
    return solutions[index];
  },

  duplicateSolution(id: string, newName: string): Solution | undefined {
    const original = solutions.find(s => s.id === id);
    if (!original) return undefined;

    const now = new Date();
    const newVersionNumber = this.generateVersionNumber(original.currentVersion);

    const duplicated: Solution = {
      ...original,
      id: `solution-${Date.now()}`,
      name: newName,
      status: SolutionStatus.DRAFT,
      result: null,
      currentVersion: newVersionNumber,
      versions: [
        {
          id: `version-${Date.now()}`,
          versionNumber: newVersionNumber,
          createdAt: now,
          createdBy: 'user',
          comment: `Duplicated from ${original.name}`,
          changes: ['Duplicated solution'],
        },
      ],
      createdAt: now,
      updatedAt: now,
      lastCalculatedAt: undefined,
      approvedBy: undefined,
      approvedAt: undefined,
    };

    solutions.push(duplicated);
    saveSolutions();
    return duplicated;
  },

  generateVersionNumber(currentVersion: string): string {
    const parts = currentVersion.split('.').map(Number);
    parts[parts.length - 1] += 1;
    return parts.join('.');
  },

  clearAll(): void {
    solutions = [];
    localStorage.removeItem(STORAGE_KEY);
  },
};