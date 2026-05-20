/**
 * 报表导出工具
 * 
 * 支持的导出格式：
 * 1. Excel (.xlsx) - 装柜清单
 * 2. CSV (.csv) - 数据导出
 * 3. JSON (.json) - 完整数据结构
 * 4. 文本报告 (.txt) - 装卸指导书
 */

import { PackingResult, Container, PlacedCargo } from '../types';

/**
 * 导出格式类型
 */
export type ExportFormat = 'xlsx' | 'csv' | 'json' | 'txt';

/**
 * 导出配置
 */
export interface ExportConfig {
  format: ExportFormat;
  includeStats?: boolean;
  includeCargoDetails?: boolean;
  includeContainerLayout?: boolean;
}

/**
 * 生成装柜清单HTML表格
 */
const generateCargoTable = (containers: Container[]): string => {
  let html = '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">';
  
  // 表头
  html += `
    <thead>
      <tr style="background-color: #f5f5f5;">
        <th style="text-align: left;">集装箱</th>
        <th style="text-align: left;">货物名称</th>
        <th style="text-align: center;">尺寸 (mm)</th>
        <th style="text-align: center;">重量 (kg)</th>
        <th style="text-align: center;">数量</th>
        <th style="text-align: center;">位置</th>
        <th style="text-align: center;">旋转</th>
      </tr>
    </thead>
    <tbody>
  `;
  
  // 数据行
  containers.forEach((container, containerIndex) => {
    container.placedCargos.forEach((cargo, cargoIndex) => {
      html += `
        <tr ${cargoIndex % 2 === 0 ? 'style="background-color: #ffffff;"' : 'style="background-color: #fafafa;"'}>
          ${cargoIndex === 0 ? `<td rowspan="${container.placedCargos.length}" style="vertical-align: top;">${container.spec.name}</td>` : ''}
          <td>${cargo.name}</td>
          <td style="text-align: center;">${cargo.dimensions.length}×${cargo.dimensions.width}×${cargo.dimensions.height}</td>
          <td style="text-align: center;">${cargo.weight}</td>
          <td style="text-align: center;">${cargo.placedQuantity}</td>
          <td style="text-align: center;">(${cargo.position.x.toFixed(0)}, ${cargo.position.y.toFixed(0)}, ${cargo.position.z.toFixed(0)})</td>
          <td style="text-align: center;">(${cargo.rotation.x}, ${cargo.rotation.y}, ${cargo.rotation.z})</td>
        </tr>
      `;
    });
  });
  
  html += '</tbody></table>';
  
  return html;
};

/**
 * 生成统计信息HTML
 */
const generateStatsSection = (result: PackingResult): string => {
  const stats = result.totalStats;
  
  return `
    <div style="margin-bottom: 20px;">
      <h3 style="margin-bottom: 10px;">装柜统计</h3>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
        <tr style="background-color: #f5f5f5;">
          <th style="text-align: left;">指标</th>
          <th style="text-align: right;">数值</th>
        </tr>
        <tr><td>使用集装箱数</td><td style="text-align: right;">${stats.totalContainers}</td></tr>
        <tr><td>货物总件数</td><td style="text-align: right;">${stats.totalCargos}</td></tr>
        <tr><td>已装载件数</td><td style="text-align: right;">${stats.placedCargos}</td></tr>
        <tr><td>未装载件数</td><td style="text-align: right;">${stats.unplacedCargos}</td></tr>
        <tr><td>总体积利用率</td><td style="text-align: right;">${stats.volumeUtilization.toFixed(2)}%</td></tr>
        <tr><td>总重量</td><td style="text-align: right;">${stats.totalWeight.toFixed(2)} kg</td></tr>
        <tr><td>计算时间</td><td style="text-align: right;">${(result.duration / 1000).toFixed(2)} 秒</td></tr>
        <tr><td>算法类型</td><td style="text-align: right;">${result.algorithm}</td></tr>
      </table>
    </div>
  `;
};

/**
 * 生成单个集装箱布局图
 */
const generateContainerLayout = (container: Container): string => {
  const spec = container.spec;
  const scale = 10; // 缩放比例
  
  let html = `<div style="margin-bottom: 20px;">`;
  html += `<h4>${spec.name} - 俯视图</h4>`;
  
  // 创建SVG布局图
  const width = spec.innerDimensions.width / scale;
  const height = spec.innerDimensions.length / scale;
  
  html += `<svg width="${width}" height="${height}" style="border: 2px solid #333; background-color: #fff;">`;
  
  // 绘制货物
  container.placedCargos.forEach(cargo => {
    const dims = getRotatedDimensions(cargo);
    const x = cargo.position.y / scale;
    const y = cargo.position.x / scale;
    const w = dims.width / scale;
    const h = dims.length / scale;
    
    html += `
      <rect
        x="${x}" y="${y}" width="${w}" height="${h}"
        fill="${cargo.color || '#4299e1'}"
        stroke="#333"
        stroke-width="1"
        opacity="0.8"
      />
      <text
        x="${x + w/2}" y="${y + h/2}"
        text-anchor="middle" dominant-baseline="middle"
        font-size="8" fill="#fff" font-weight="bold"
      >${cargo.name}</text>
    `;
  });
  
  html += `</svg>`;
  html += '</div>';
  
  return html;
};

/**
 * 获取旋转后的尺寸
 */
const getRotatedDimensions = (cargo: PlacedCargo) => {
  const { length, width, height } = cargo.dimensions;
  const { x, y, z } = cargo.rotation;
  
  let l = length, w = width, h = height;
  
  if (x === 90) {
    [w, h] = [h, w];
  }
  if (y === 90) {
    [l, h] = [h, l];
  }
  if (z === 90) {
    [l, w] = [w, l];
  }
  
  return { length: l, width: w, height: h };
};

/**
 * 生成装卸指导书
 */
const generateLoadingGuide = (containers: Container[]): string => {
  let guide = '# 装卸指导书\n\n';
  guide += `生成时间: ${new Date().toLocaleString()}\n\n`;
  guide += '='.repeat(50) + '\n\n';
  
  containers.forEach((container, index) => {
    guide += `## ${index + 1}. ${container.spec.name}\n\n`;
    guide += `### 规格参数\n`;
    guide += `- 内部尺寸: ${container.spec.innerDimensions.length} × ${container.spec.innerDimensions.width} × ${container.spec.innerDimensions.height} mm\n`;
    guide += `- 最大载重: ${container.spec.maxPayload} kg\n`;
    guide += `- 容积: ${container.spec.volume} m³\n\n`;
    
    guide += `### 装载清单\n`;
    guide += `| 序号 | 货物名称 | 尺寸(mm) | 重量(kg) | 数量 | 位置 |\n`;
    guide += `|------|----------|----------|----------|------|------|\n`;
    
    // 按Z坐标排序（从下到上）
    const sortedCargos = [...container.placedCargos].sort((a, b) => a.position.z - b.position.z);
    
    sortedCargos.forEach((cargo, i) => {
      guide += `| ${i + 1} | ${cargo.name} | ${cargo.dimensions.length}×${cargo.dimensions.width}×${cargo.dimensions.height} | ${cargo.weight} | ${cargo.placedQuantity} | (${cargo.position.x.toFixed(0)}, ${cargo.position.y.toFixed(0)}, ${cargo.position.z.toFixed(0)}) |\n`;
    });
    
    guide += '\n';
    
    guide += `### 装卸顺序\n`;
    guide += `1. 先装载底部货物（Z坐标较小）\n`;
    guide += `2. 按从后到前、从左到右的顺序装载\n`;
    guide += `3. 注意货物是否易碎，易碎品请小心轻放\n`;
    
    guide += '\n' + '='.repeat(50) + '\n\n';
  });
  
  return guide;
};

/**
 * 导出为HTML（可用于打印或生成PDF）
 */
export const exportToHtml = (result: PackingResult, config: ExportConfig = { format: 'xlsx' }): string => {
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>装柜清单 - ${new Date().toLocaleDateString()}</title>
      <style>
        body { font-family: 'Microsoft YaHei', 'SimHei', sans-serif; margin: 20px; }
        h1 { text-align: center; color: #2d3748; }
        h2 { color: #4a5568; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; }
        h3 { color: #4a5568; }
        .page-break { page-break-after: always; }
      </style>
    </head>
    <body>
      <h1>集装箱装柜清单</h1>
      <p style="text-align: center; color: #718096;">生成时间: ${new Date().toLocaleString()}</p>
  `;
  
  // 添加统计信息
  if (config.includeStats !== false) {
    html += generateStatsSection(result);
  }
  
  // 添加装柜清单表格
  if (config.includeCargoDetails !== false) {
    html += `
      <div>
        <h2>装柜清单</h2>
        ${generateCargoTable(result.containers)}
      </div>
    `;
  }
  
  // 添加集装箱布局图
  if (config.includeContainerLayout !== false) {
    html += `
      <div class="page-break"></div>
      <h2>集装箱布局图</h2>
    `;
    
    result.containers.forEach(container => {
      html += generateContainerLayout(container);
    });
  }
  
  html += `
    </body>
    </html>
  `;
  
  return html;
};

/**
 * 导出为CSV
 */
export const exportToCsv = (result: PackingResult): string => {
  let csv = '\uFEFF'; // BOM for Excel compatibility
  
  // 表头
  csv += '集装箱,货物名称,长度(mm),宽度(mm),高度(mm),重量(kg),数量,X坐标,Y坐标,Z坐标,旋转X,旋转Y,旋转Z\n';
  
  // 数据
  result.containers.forEach(container => {
    container.placedCargos.forEach(cargo => {
      csv += `${container.spec.name},`;
      csv += `"${cargo.name}",`;
      csv += `${cargo.dimensions.length},`;
      csv += `${cargo.dimensions.width},`;
      csv += `${cargo.dimensions.height},`;
      csv += `${cargo.weight},`;
      csv += `${cargo.placedQuantity},`;
      csv += `${cargo.position.x.toFixed(0)},`;
      csv += `${cargo.position.y.toFixed(0)},`;
      csv += `${cargo.position.z.toFixed(0)},`;
      csv += `${cargo.rotation.x},`;
      csv += `${cargo.rotation.y},`;
      csv += `${cargo.rotation.z}\n`;
    });
  });
  
  return csv;
};

/**
 * 导出为JSON
 */
export const exportToJson = (result: PackingResult): string => {
  return JSON.stringify(result, null, 2);
};

/**
 * 导出为文本报告（装卸指导书）
 */
export const exportToText = (result: PackingResult): string => {
  return generateLoadingGuide(result.containers);
};

/**
 * 下载文件
 */
export const downloadFile = (content: string, filename: string, type: string): void => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * 统一导出函数
 */
export const exportPackingResult = (
  result: PackingResult,
  config: ExportConfig
): void => {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  let content: string;
  let filename: string;
  let mimeType: string;
  
  switch (config.format) {
    case 'xlsx':
      content = exportToHtml(result, config);
      filename = `装柜清单_${timestamp}.html`;
      mimeType = 'text/html';
      break;
    
    case 'csv':
      content = exportToCsv(result);
      filename = `装柜清单_${timestamp}.csv`;
      mimeType = 'text/csv';
      break;
    
    case 'json':
      content = exportToJson(result);
      filename = `装柜结果_${timestamp}.json`;
      mimeType = 'application/json';
      break;
    
    case 'txt':
      content = exportToText(result);
      filename = `装卸指导书_${timestamp}.txt`;
      mimeType = 'text/plain';
      break;
    
    default:
      content = exportToHtml(result, config);
      filename = `装柜清单_${timestamp}.html`;
      mimeType = 'text/html';
  }
  
  downloadFile(content, filename, mimeType);
};

export default {
  exportPackingResult,
  exportToHtml,
  exportToCsv,
  exportToJson,
  exportToText,
  downloadFile
};
