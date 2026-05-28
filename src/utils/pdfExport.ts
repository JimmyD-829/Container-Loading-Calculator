import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { LoadingResult } from '../components/ResultViewer';

interface PdfExportOptions {
  result: LoadingResult;
  containerIndex?: number;
  include3DImage?: boolean;
  includeLoadingGuide?: boolean;
}

export const generateLoadingReport = async (options: PdfExportOptions): Promise<void> => {
  const { result, containerIndex = 0, include3DImage = true, includeLoadingGuide = true } = options;
  
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const container = result.containers[containerIndex];
  if (!container) {
    doc.text('未找到集装箱数据', 10, 10);
    doc.save('装柜报告.pdf');
    return;
  }

  doc.setFontSize(20);
  doc.text('物流集装箱装柜测算报告', 10, 20);

  doc.setFontSize(12);
  doc.text(`生成时间: ${new Date().toLocaleString('zh-CN')}`, 10, 35);
  doc.text(`方案ID: ${result.id || 'N/A'}`, 10, 45);
  doc.text(`算法: ${result.algorithm || 'FFD'}`, 10, 55);
  doc.text(`计算耗时: ${result.calculationTime?.toFixed(2) || 0} 秒`, 10, 65);

  doc.setFontSize(14);
  doc.text('一、集装箱信息', 10, 80);
  
  doc.setFontSize(12);
  doc.text(`柜型: ${container.container.name}`, 15, 92);
  doc.text(`尺寸: ${container.container.length} × ${container.container.width} × ${container.container.height} cm`, 15, 102);
  doc.text(`容积: ${container.container.volume?.toFixed(2) || 0} m³`, 15, 112);
  doc.text(`最大载重: ${container.container.maxWeight} kg`, 15, 122);

  doc.text(`装载货物: ${container.loadedCount} 件`, 100, 92);
  doc.text(`总重量: ${container.totalWeight} kg`, 100, 102);
  doc.text(`体积利用率: ${(container.volumeUtilization * 100).toFixed(1)}%`, 100, 112);
  doc.text(`重量利用率: ${(container.weightUtilization * 100).toFixed(1)}%`, 100, 122);

  if (include3DImage) {
    const canvasContainer = document.getElementById('container-3d-canvas');
    if (canvasContainer) {
      try {
        const canvas = await html2canvas(canvasContainer, {
          scale: 2,
          backgroundColor: '#ffffff',
        });
        
        const imgData = canvas.toDataURL('image/png');
        doc.setFontSize(14);
        doc.text('二、3D装柜示意图', 10, 140);
        
        const imgWidth = 150;
        const imgHeight = (canvas.height / canvas.width) * imgWidth;
        const imgX = (doc.internal.pageSize.getWidth() - imgWidth) / 2;
        doc.addImage(imgData, 'PNG', imgX, 150, imgWidth, imgHeight);
      } catch (error) {
        console.error('Failed to capture 3D image:', error);
        doc.text('3D示意图暂不可用', 10, 150);
      }
    }
  }

  doc.addPage('landscape', 'a4');
  
  doc.setFontSize(14);
  doc.text('三、货物装载清单', 10, 20);

  const tableStartY = 35;
  const rowHeight = 8;
  
  doc.setFontSize(10);
  doc.text('序号', 10, tableStartY);
  doc.text('货物名称', 30, tableStartY);
  doc.text('尺寸(cm)', 80, tableStartY);
  doc.text('重量(kg)', 130, tableStartY);
  doc.text('数量', 160, tableStartY);
  doc.text('位置', 180, tableStartY);
  
  container.cargoList.forEach((cargo, index) => {
    const y = tableStartY + (index + 1) * rowHeight;
    if (y > 260) {
      doc.addPage('landscape', 'a4');
      doc.setFontSize(14);
      doc.text('三、货物装载清单（续）', 10, 20);
      doc.setFontSize(10);
      doc.text('序号', 10, 35);
      doc.text('货物名称', 30, 35);
      doc.text('尺寸(cm)', 80, 35);
      doc.text('重量(kg)', 130, 35);
      doc.text('数量', 160, 35);
      doc.text('位置', 180, 35);
      index = 0;
    }
    
    const currentY = tableStartY + (index + 1) * rowHeight;
    doc.text(`${index + 1}`, 10, currentY);
    doc.text(cargo.name, 30, currentY);
    doc.text(`${cargo.length}×${cargo.width}×${cargo.height}`, 80, currentY);
    doc.text(`${cargo.weight}`, 130, currentY);
    doc.text('1', 160, currentY);
    doc.text(`(${cargo.position.x.toFixed(1)}, ${cargo.position.y.toFixed(1)}, ${cargo.position.z.toFixed(1)})`, 180, currentY);
  });

  if (includeLoadingGuide) {
    doc.addPage('landscape', 'a4');
    
    doc.setFontSize(14);
    doc.text('四、装卸顺序指导书', 10, 20);
    
    doc.setFontSize(12);
    doc.text('【装载原则】', 10, 35);
    doc.setFontSize(10);
    doc.text('1. 遵循先重后轻原则，重货置于底部，轻货置于上部', 15, 45);
    doc.text('2. 易碎品单独放置，避免堆叠受压', 15, 53);
    doc.text('3. 相同目的地货物集中放置，便于卸货', 15, 61);
    doc.text('4. 注意货物方向标识，按指定方向放置', 15, 69);
    
    doc.setFontSize(12);
    doc.text('【装载顺序】', 10, 82);
    doc.setFontSize(10);
    
    const sortedByY = [...container.cargoList].sort((a, b) => b.position.y - a.position.y);
    
    sortedByY.forEach((cargo, index) => {
      const y = 92 + index * 8;
      if (y > 260) {
        doc.addPage('landscape', 'a4');
        doc.setFontSize(14);
        doc.text('四、装卸顺序指导书（续）', 10, 20);
        doc.setFontSize(12);
        doc.text('【装载顺序】', 10, 35);
        doc.setFontSize(10);
        index = 0;
      }
      const currentY = 92 + index * 8;
      doc.text(`${index + 1}. ${cargo.name} - 位置: 第${Math.ceil(cargo.position.y / 100)}层`, 15, currentY);
    });
    
    doc.setFontSize(12);
    doc.text('【卸货顺序】（与装载顺序相反）', 10, 92 + sortedByY.length * 8 + 15);
    doc.setFontSize(10);
    
    sortedByY.reverse().forEach((cargo, index) => {
      const y = 102 + sortedByY.length * 8 + 15 + index * 8;
      if (y > 260) {
        doc.addPage('landscape', 'a4');
        doc.setFontSize(14);
        doc.text('四、装卸顺序指导书（续）', 10, 20);
        doc.setFontSize(12);
        doc.text('【卸货顺序】', 10, 35);
        doc.setFontSize(10);
        index = 0;
      }
      const currentY = 102 + sortedByY.length * 8 + 15 + index * 8;
      doc.text(`${index + 1}. ${cargo.name}`, 15, currentY);
    });
  }

  doc.save(`装柜报告_${result.id || Date.now()}.pdf`);
};

export const generateComparisonReport = async (results: LoadingResult[]): Promise<void> => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  doc.setFontSize(20);
  doc.text('装柜方案对比报告', 10, 20);
  doc.setFontSize(12);
  doc.text(`生成时间: ${new Date().toLocaleString('zh-CN')}`, 10, 35);
  doc.text(`对比方案数: ${results.length}`, 10, 45);

  const tableStartY = 60;
  const colWidths = [20, 60, 40, 40, 40, 40];
  
  doc.setFontSize(10);
  doc.text('方案', 10, tableStartY);
  doc.text('算法', 30, tableStartY);
  doc.text('柜数', 90, tableStartY);
  doc.text('体积利用率', 130, tableStartY);
  doc.text('重量利用率', 170, tableStartY);
  doc.text('计算时间(s)', 210, tableStartY);

  results.forEach((result, index) => {
    const y = tableStartY + (index + 1) * 10;
    if (y > 260) {
      doc.addPage('landscape', 'a4');
      doc.setFontSize(14);
      doc.text('装柜方案对比报告（续）', 10, 20);
      doc.setFontSize(10);
      doc.text('方案', 10, 35);
      doc.text('算法', 30, 35);
      doc.text('柜数', 90, 35);
      doc.text('体积利用率', 130, 35);
      doc.text('重量利用率', 170, 35);
      doc.text('计算时间(s)', 210, 35);
      index = 0;
    }
    const currentY = tableStartY + (index + 1) * 10;
    
    const avgVolume = result.containers.reduce((sum, c) => sum + c.volumeUtilization, 0) / result.containers.length;
    const avgWeight = result.containers.reduce((sum, c) => sum + c.weightUtilization, 0) / result.containers.length;
    
    doc.text(`${index + 1}`, 10, currentY);
    doc.text(result.algorithm || 'N/A', 30, currentY);
    doc.text(`${result.totalContainers}`, 90, currentY);
    doc.text(`${(avgVolume * 100).toFixed(1)}%`, 130, currentY);
    doc.text(`${(avgWeight * 100).toFixed(1)}%`, 170, currentY);
    doc.text(`${result.calculationTime?.toFixed(2) || 0}`, 210, currentY);
  });

  doc.save(`方案对比报告_${Date.now()}.pdf`);
};
