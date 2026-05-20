/**
 * 货物模板管理器
 * 
 * 功能：
 * 1. 货物模板的创建、保存、查询、删除
 * 2. 自定义集装箱规格管理
 * 3. 模板版本管理
 * 4. 本地存储持久化
 */

import { Cargo, ContainerSpec, ContainerType, CargoType } from '../types';
import { ContainerSpecs } from '../data/containerSpecs';

/**
 * 货物模板接口
 */
export interface CargoTemplate extends Omit<Cargo, 'id' | 'quantity'> {
  templateId: string;
  name: string;
  category: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
}

/**
 * 自定义集装箱规格
 */
export interface CustomContainerSpec extends Omit<ContainerSpec, 'id'> {
  customId: string;
  createdAt: Date;
}

/**
 * 存储键名
 */
const CARGO_TEMPLATES_KEY = 'cargo_templates';
const CUSTOM_CONTAINERS_KEY = 'custom_containers';

/**
 * 获取所有货物模板
 */
export const getAllCargoTemplates = (): CargoTemplate[] => {
  try {
    const data = localStorage.getItem(CARGO_TEMPLATES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

/**
 * 获取货物模板
 */
export const getCargoTemplate = (templateId: string): CargoTemplate | undefined => {
  const templates = getAllCargoTemplates();
  return templates.find(t => t.templateId === templateId);
};

/**
 * 保存货物模板
 */
export const saveCargoTemplate = (template: Omit<CargoTemplate, 'templateId' | 'createdAt' | 'updatedAt' | 'usageCount'>): CargoTemplate => {
  const templates = getAllCargoTemplates();
  const now = new Date();
  
  const newTemplate: CargoTemplate = {
    ...template,
    templateId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: now,
    updatedAt: now,
    usageCount: 0
  };
  
  templates.push(newTemplate);
  localStorage.setItem(CARGO_TEMPLATES_KEY, JSON.stringify(templates));
  
  return newTemplate;
};

/**
 * 更新货物模板
 */
export const updateCargoTemplate = (templateId: string, updates: Partial<Omit<CargoTemplate, 'templateId' | 'createdAt' | 'updatedAt'>>): boolean => {
  const templates = getAllCargoTemplates();
  const index = templates.findIndex(t => t.templateId === templateId);
  
  if (index === -1) return false;
  
  templates[index] = {
    ...templates[index],
    ...updates,
    updatedAt: new Date()
  };
  
  localStorage.setItem(CARGO_TEMPLATES_KEY, JSON.stringify(templates));
  return true;
};

/**
 * 删除货物模板
 */
export const deleteCargoTemplate = (templateId: string): boolean => {
  const templates = getAllCargoTemplates();
  const filtered = templates.filter(t => t.templateId !== templateId);
  
  if (filtered.length === templates.length) return false;
  
  localStorage.setItem(CARGO_TEMPLATES_KEY, JSON.stringify(filtered));
  return true;
};

/**
 * 从模板创建货物
 */
export const createCargoFromTemplate = (templateId: string, quantity: number = 1): Cargo | null => {
  const template = getCargoTemplate(templateId);
  
  if (!template) return null;
  
  // 更新使用次数
  updateCargoTemplate(templateId, { usageCount: template.usageCount + quantity });
  
  return {
    ...template,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    quantity
  };
};

/**
 * 获取所有自定义集装箱规格
 */
export const getAllCustomContainers = (): CustomContainerSpec[] => {
  try {
    const data = localStorage.getItem(CUSTOM_CONTAINERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

/**
 * 获取自定义集装箱规格
 */
export const getCustomContainer = (customId: string): CustomContainerSpec | undefined => {
  const containers = getAllCustomContainers();
  return containers.find(c => c.customId === customId);
};

/**
 * 保存自定义集装箱规格
 */
export const saveCustomContainer = (spec: Omit<CustomContainerSpec, 'customId' | 'createdAt'>): CustomContainerSpec => {
  const containers = getAllCustomContainers();
  const now = new Date();
  
  const newSpec: CustomContainerSpec = {
    ...spec,
    customId: `custom-${Date.now()}`,
    createdAt: now
  };
  
  containers.push(newSpec);
  localStorage.setItem(CUSTOM_CONTAINERS_KEY, JSON.stringify(containers));
  
  return newSpec;
};

/**
 * 更新自定义集装箱规格
 */
export const updateCustomContainer = (customId: string, updates: Partial<Omit<CustomContainerSpec, 'customId' | 'createdAt'>>): boolean => {
  const containers = getAllCustomContainers();
  const index = containers.findIndex(c => c.customId === customId);
  
  if (index === -1) return false;
  
  containers[index] = {
    ...containers[index],
    ...updates
  };
  
  localStorage.setItem(CUSTOM_CONTAINERS_KEY, JSON.stringify(containers));
  return true;
};

/**
 * 删除自定义集装箱规格
 */
export const deleteCustomContainer = (customId: string): boolean => {
  const containers = getAllCustomContainers();
  const filtered = containers.filter(c => c.customId !== customId);
  
  if (filtered.length === containers.length) return false;
  
  localStorage.setItem(CUSTOM_CONTAINERS_KEY, JSON.stringify(filtered));
  return true;
};

/**
 * 获取所有可用的集装箱规格（标准+自定义）
 */
export const getAllContainerSpecs = (): (ContainerSpec | CustomContainerSpec)[] => {
  const standard = Object.values(ContainerSpecs) as ContainerSpec[];
  const custom = getAllCustomContainers();
  return [...standard, ...custom];
};

/**
 * 获取所有货物分类
 */
export const getCargoCategories = (): string[] => {
  const templates = getAllCargoTemplates();
  const categories = new Set(templates.map(t => t.category));
  return Array.from(categories).sort();
};

/**
 * 按分类获取模板
 */
export const getTemplatesByCategory = (category: string): CargoTemplate[] => {
  const templates = getAllCargoTemplates();
  return templates.filter(t => t.category === category);
};

/**
 * 搜索模板
 */
export const searchTemplates = (keyword: string): CargoTemplate[] => {
  const templates = getAllCargoTemplates();
  const lowerKeyword = keyword.toLowerCase();
  
  return templates.filter(t => 
    t.name.toLowerCase().includes(lowerKeyword) ||
    t.description?.toLowerCase().includes(lowerKeyword) ||
    t.category.toLowerCase().includes(lowerKeyword)
  );
};

/**
 * 预定义模板数据
 */
export const DEFAULT_CARGO_TEMPLATES: Omit<CargoTemplate, 'templateId' | 'createdAt' | 'updatedAt' | 'usageCount'>[] = [
  {
    name: '纸箱 A',
    category: '纸箱',
    description: '标准纸箱，尺寸50x40x30cm',
    dimensions: { length: 500, width: 400, height: 300 },
    weight: 15,
    color: '#4299e1',
    stackable: true,
    maxStack: 5,
    rotatable: true,
    fragile: false,
    priority: 1,
    type: CargoType.BOX,
    thisSideUp: false
  },
  {
    name: '纸箱 B',
    category: '纸箱',
    description: '大型纸箱，尺寸80x60x50cm',
    dimensions: { length: 800, width: 600, height: 500 },
    weight: 30,
    color: '#48bb78',
    stackable: true,
    maxStack: 3,
    rotatable: true,
    fragile: false,
    priority: 1,
    type: CargoType.BOX,
    thisSideUp: false
  },
  {
    name: '木箱',
    category: '木箱',
    description: '实木木箱，尺寸100x80x60cm',
    dimensions: { length: 1000, width: 800, height: 600 },
    weight: 50,
    color: '#d69e2e',
    stackable: true,
    maxStack: 4,
    rotatable: true,
    fragile: false,
    priority: 2,
    type: CargoType.BOX,
    thisSideUp: false
  },
  {
    name: '塑料桶',
    category: '桶装',
    description: '200L塑料桶',
    dimensions: { length: 600, width: 600, height: 900 },
    weight: 250,
    color: '#9f7aea',
    stackable: false,
    maxStack: 1,
    rotatable: false,
    fragile: false,
    priority: 3,
    type: CargoType.CYLINDER,
    thisSideUp: false
  },
  {
    name: '电子产品箱',
    category: '易碎品',
    description: '精密电子产品，需小心轻放',
    dimensions: { length: 400, width: 300, height: 200 },
    weight: 10,
    color: '#f56565',
    stackable: false,
    maxStack: 1,
    rotatable: true,
    fragile: true,
    priority: 1,
    type: CargoType.BOX,
    thisSideUp: true
  },
  {
    name: '纺织品包',
    category: '布包',
    description: '纺织品打包，尺寸100x50x50cm',
    dimensions: { length: 1000, width: 500, height: 500 },
    weight: 20,
    color: '#38b2ac',
    stackable: true,
    maxStack: 10,
    rotatable: true,
    fragile: false,
    priority: 1,
    type: CargoType.BAG,
    thisSideUp: false
  }
];

/**
 * 初始化默认模板（如果没有模板时）
 */
export const initDefaultTemplates = (): void => {
  const templates = getAllCargoTemplates();
  if (templates.length === 0) {
    DEFAULT_CARGO_TEMPLATES.forEach(template => {
      saveCargoTemplate(template);
    });
  }
};

/**
 * 清空所有模板
 */
export const clearAllTemplates = (): void => {
  localStorage.removeItem(CARGO_TEMPLATES_KEY);
  localStorage.removeItem(CUSTOM_CONTAINERS_KEY);
};

export default {
  // 货物模板管理
  getAllCargoTemplates,
  getCargoTemplate,
  saveCargoTemplate,
  updateCargoTemplate,
  deleteCargoTemplate,
  createCargoFromTemplate,
  
  // 自定义集装箱管理
  getAllCustomContainers,
  getCustomContainer,
  saveCustomContainer,
  updateCustomContainer,
  deleteCustomContainer,
  getAllContainerSpecs,
  
  // 辅助函数
  getCargoCategories,
  getTemplatesByCategory,
  searchTemplates,
  initDefaultTemplates,
  clearAllTemplates,
  
  // 常量
  DEFAULT_CARGO_TEMPLATES
};
