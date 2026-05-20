import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Card,
  Table,
  Row,
  Col,
  Space,
  Typography,
  Tag,
  Progress,
  Statistic,
  Tabs,
  List,
  Timeline,
  Badge,
  Button,
  Tooltip,
  Empty,
  Divider,
  Descriptions,
  Alert,
  Collapse,
  Modal,
  Select,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  ContainerOutlined,
  BoxPlotOutlined,
  FileTextOutlined,
  BarChartOutlined,
  EyeOutlined,
  DownloadOutlined,
  ShareAltOutlined,
  CheckCircleFilled,
  WarningFilled,
  InfoCircleOutlined,
  ClockCircleOutlined,
  CalculatorOutlined,
  FileExcelOutlined,
  FileTextOutlined as FileTextIcon,
  CodeOutlined,
} from '@ant-design/icons';
import type { CargoItem } from './CargoManager';
import type { ContainerType } from './ContainerSelector';

const { Option } = Select;

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Panel } = Collapse;

// 装载结果类型定义
export interface LoadedCargo extends CargoItem {
  position: {
    x: number;
    y: number;
    z: number;
  };
  rotation: {
    x: number;
    y: number;
    z: number;
  };
  containerIndex: number;
}

export interface LoadingResult {
  id: string;
  timestamp: number;
  containers: {
    container: ContainerType;
    cargoList: LoadedCargo[];
    volumeUtilization: number;
    weightUtilization: number;
    loadedCount: number;
    totalWeight: number;
  }[];
  unplacedCargo: CargoItem[];
  totalCargoCount: number;
  totalContainers: number;
  averageUtilization: number;
  calculationTime: number;
  algorithm: string;
}

interface ResultViewerProps {
  result: LoadingResult | null;
  onExport?: () => void;
  onShare?: () => void;
}

const ResultViewer: React.FC<ResultViewerProps> = ({
  result,
  onExport,
  onShare,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedContainer, setSelectedContainer] = useState(0);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv' | 'json' | 'txt'>('excel');

  const handleExport = () => {
    setExportModalVisible(true);
  };

  const handleConfirmExport = () => {
    if (!result) return;
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    
    switch (exportFormat) {
      case 'excel':
        exportToExcel(result, timestamp);
        break;
      case 'csv':
        exportToCsv(result, timestamp);
        break;
      case 'json':
        exportToJson(result, timestamp);
        break;
      case 'txt':
        exportToTxt(result, timestamp);
        break;
    }
    
    setExportModalVisible(false);
    message.success('导出成功');
  };

  const getFeasibilityAnalysis = (data: LoadingResult) => {
    const isFeasible = data.unplacedCargo.length === 0;
    const utilization = data.averageUtilization;
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    if (data.unplacedCargo.length > 0) {
      warnings.push(`${data.unplacedCargo.length} 种货物未能装载，建议增加集装箱数量或调整货物尺寸`);
    }
    if (utilization < 50) {
      warnings.push('空间利用率较低，建议减少集装箱数量或增加货物');
      suggestions.push('考虑使用更小尺寸的集装箱');
      suggestions.push('检查是否有过多的空隙浪费');
    } else if (utilization > 95) {
      warnings.push('空间利用率过高，装载可能过于紧密');
      suggestions.push('建议预留适当空隙便于装卸');
    }
    
    data.containers.forEach((container, idx) => {
      if (container.weightUtilization > 90) {
        warnings.push(`集装箱 #${idx + 1} 重量接近满载，需注意载重限制`);
      }
      if (container.weightUtilization < 30) {
        suggestions.push(`集装箱 #${idx + 1} 重量利用率较低，可考虑增加重货`);
      }
    });
    
    return {
      isFeasible,
      status: isFeasible ? '可行' : '部分可行',
      warnings,
      suggestions,
    };
  };

  const exportToExcel = (data: LoadingResult, timestamp: string) => {
    const analysis = getFeasibilityAnalysis(data);
    const worksheetData: any[][] = [];
    
    worksheetData.push(['装柜清单报告', '', '', '', '', '', '', '']);
    worksheetData.push(['生成时间:', new Date().toLocaleString(), '', '', '', '', '', '']);
    worksheetData.push(['算法:', data.algorithm, '', '', '', '', '', '']);
    worksheetData.push(['计算耗时:', `${data.calculationTime.toFixed(2)}秒`, '', '', '', '', '', '']);
    worksheetData.push(['可行性:', analysis.status, '', '', '', '', '', '']);
    worksheetData.push(['', '', '', '', '', '', '', '']);
    
    worksheetData.push(['=== 可行性分析 ===', '', '', '', '', '', '', '']);
    if (analysis.warnings.length > 0) {
      worksheetData.push(['警告:', '', '', '', '', '', '', '']);
      analysis.warnings.forEach(warning => {
        worksheetData.push(['', warning, '', '', '', '', '', '']);
      });
    }
    if (analysis.suggestions.length > 0) {
      worksheetData.push(['建议:', '', '', '', '', '', '', '']);
      analysis.suggestions.forEach(suggestion => {
        worksheetData.push(['', suggestion, '', '', '', '', '', '']);
      });
    }
    worksheetData.push(['', '', '', '', '', '', '', '']);
    
    worksheetData.push(['=== 统计信息 ===', '', '', '', '', '', '', '']);
    worksheetData.push(['使用集装箱数', data.totalContainers, '个', '', '', '', '', '']);
    worksheetData.push(['装载货物总数', data.totalCargoCount, '件', '', '', '', '', '']);
    worksheetData.push(['未装载货物', data.unplacedCargo.length, '种', '', '', '', '', '']);
    worksheetData.push(['平均利用率', `${data.averageUtilization.toFixed(1)}`, '%', '', '', '', '', '']);
    worksheetData.push(['', '', '', '', '', '', '', '']);
    
    worksheetData.push(['=== 各集装箱装载详情 ===', '', '', '', '', '', '', '']);
    worksheetData.push(['', '', '', '', '', '', '', '']);
    
    data.containers.forEach((container, containerIndex) => {
      worksheetData.push([`集装箱 #${containerIndex + 1}`, container.container.name, '', '', '', '', '', '']);
      worksheetData.push(['货物名称', '长度(cm)', '宽度(cm)', '高度(cm)', '重量(kg)', '数量', '位置X', '位置Y', '位置Z']);
      
      container.cargoList.forEach(cargo => {
        worksheetData.push([
          cargo.name,
          cargo.length,
          cargo.width,
          cargo.height,
          cargo.weight,
          1,
          cargo.position.x,
          cargo.position.y,
          cargo.position.z,
        ]);
      });
      
      worksheetData.push(['', '', '', '', '', '', '', '']);
      worksheetData.push(['体积利用率', `${container.volumeUtilization.toFixed(1)}%`, '', '', '', '', '', '']);
      worksheetData.push(['重量利用率', `${container.weightUtilization.toFixed(1)}%`, '', '', '', '', '', '']);
      worksheetData.push(['装载货物', `${container.loadedCount}件`, '', '', '', '', '', '']);
      worksheetData.push(['总重量', `${container.totalWeight.toFixed(1)}kg`, '', '', '', '', '', '']);
      worksheetData.push(['', '', '', '', '', '', '', '']);
    });
    
    if (data.unplacedCargo.length > 0) {
      worksheetData.push(['=== 未装载货物 ===', '', '', '', '', '', '', '']);
      worksheetData.push(['货物名称', '长度(cm)', '宽度(cm)', '高度(cm)', '重量(kg)', '数量', '', '']);
      data.unplacedCargo.forEach(cargo => {
        worksheetData.push([
          cargo.name,
          cargo.length,
          cargo.width,
          cargo.height,
          cargo.weight,
          cargo.quantity,
          '',
        ]);
      });
    }
    
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '装柜清单');
    XLSX.writeFile(workbook, `装柜清单_${timestamp}.xlsx`);
  };

  const exportToCsv = (data: LoadingResult, timestamp: string) => {
    let csv = '\uFEFF';
    csv += '集装箱,货物名称,长度(cm),宽度(cm),高度(cm),重量(kg),数量,位置X,位置Y,位置Z\n';
    
    data.containers.forEach((container, containerIndex) => {
      container.cargoList.forEach(cargo => {
        csv += `${container.container.name},`;
        csv += `"${cargo.name}",`;
        csv += `${cargo.length},`;
        csv += `${cargo.width},`;
        csv += `${cargo.height},`;
        csv += `${cargo.weight},`;
        csv += `1,`;
        csv += `${cargo.position.x},`;
        csv += `${cargo.position.y},`;
        csv += `${cargo.position.z}\n`;
      });
    });
    
    downloadFile(csv, `装柜清单_${timestamp}.csv`, 'text/csv');
  };

  const exportToJson = (data: LoadingResult, timestamp: string) => {
    const analysis = getFeasibilityAnalysis(data);
    const exportData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        algorithm: data.algorithm,
        calculationTime: data.calculationTime,
      },
      feasibility: analysis,
      statistics: {
        totalContainers: data.totalContainers,
        totalCargoCount: data.totalCargoCount,
        unplacedCargoCount: data.unplacedCargo.length,
        averageUtilization: data.averageUtilization,
      },
      containers: data.containers.map(container => ({
        type: container.container,
        volumeUtilization: container.volumeUtilization,
        weightUtilization: container.weightUtilization,
        loadedCount: container.loadedCount,
        totalWeight: container.totalWeight,
        cargoList: container.cargoList,
      })),
      unplacedCargo: data.unplacedCargo,
    };
    
    downloadFile(JSON.stringify(exportData, null, 2), `装柜清单_${timestamp}.json`, 'application/json');
  };

  const exportToTxt = (data: LoadingResult, timestamp: string) => {
    const analysis = getFeasibilityAnalysis(data);
    let txt = '='.repeat(60) + '\n';
    txt += '          集装箱装柜清单报告\n';
    txt += '='.repeat(60) + '\n\n';
    
    txt += `生成时间: ${new Date().toLocaleString()}\n`;
    txt += `算法类型: ${data.algorithm}\n`;
    txt += `计算耗时: ${data.calculationTime.toFixed(2)} 秒\n`;
    txt += `可行性: ${analysis.status}\n\n`;
    
    txt += '【可行性分析】\n';
    txt += '-'.repeat(40) + '\n';
    if (analysis.warnings.length > 0) {
      txt += '  ⚠️ 警告:\n';
      analysis.warnings.forEach(warning => {
        txt += `    - ${warning}\n`;
      });
      txt += '\n';
    }
    if (analysis.suggestions.length > 0) {
      txt += '  💡 建议:\n';
      analysis.suggestions.forEach(suggestion => {
        txt += `    - ${suggestion}\n`;
      });
      txt += '\n';
    }
    
    txt += '【统计信息】\n';
    txt += '-'.repeat(40) + '\n';
    txt += `  使用集装箱数: ${data.totalContainers} 个\n`;
    txt += `  装载货物总数: ${data.totalCargoCount} 件\n`;
    txt += `  未装载货物: ${data.unplacedCargo.length} 种\n`;
    txt += `  平均体积利用率: ${data.averageUtilization.toFixed(1)}%\n\n`;
    
    data.containers.forEach((container, containerIndex) => {
      txt += `【集装箱 #${containerIndex + 1} - ${container.container.name}】\n`;
      txt += '-'.repeat(40) + '\n';
      txt += `  规格: ${container.container.length}×${container.container.width}×${container.container.height} cm\n`;
      txt += `  体积利用率: ${container.volumeUtilization.toFixed(1)}%\n`;
      txt += `  重量利用率: ${container.weightUtilization.toFixed(1)}%\n`;
      txt += `  装载货物: ${container.loadedCount} 件\n`;
      txt += `  总重量: ${container.totalWeight.toFixed(1)} kg\n\n`;
      
      txt += '  装载明细:\n';
      container.cargoList.forEach((cargo, idx) => {
        txt += `    ${idx + 1}. ${cargo.name} | ${cargo.length}×${cargo.width}×${cargo.height}cm | ${cargo.weight}kg\n`;
      });
      txt += '\n';
    });
    
    if (data.unplacedCargo.length > 0) {
      txt += '【未装载货物】\n';
      txt += '-'.repeat(40) + '\n';
      data.unplacedCargo.forEach((cargo, idx) => {
        txt += `  ${idx + 1}. ${cargo.name} | 数量: ${cargo.quantity}\n`;
      });
      txt += '\n';
    }
    
    txt += '='.repeat(60) + '\n';
    txt += '                    报告结束\n';
    txt += '='.repeat(60);
    
    downloadFile(txt, `装柜清单_${timestamp}.txt`, 'text/plain');
  };

  const downloadFile = (content: string, filename: string, type: string) => {
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

  const handleShare = () => {
    if (!result) return;
    
    const shareData = {
      title: '集装箱装载优化结果',
      text: `装载了 ${result.totalCargoCount} 件货物到 ${result.totalContainers} 个集装箱，平均利用率 ${result.averageUtilization.toFixed(1)}%`,
    };
    
    if (navigator.share) {
      navigator.share(shareData).catch(() => {
        message.info('分享已取消');
      });
    } else {
      const textToCopy = `集装箱装载优化结果\n\n装载货物: ${result.totalCargoCount} 件\n使用集装箱: ${result.totalContainers} 个\n平均利用率: ${result.averageUtilization.toFixed(1)}%\n算法: ${result.algorithm}`;
      
      navigator.clipboard.writeText(textToCopy).then(() => {
        message.success('分享信息已复制到剪贴板');
      }).catch(() => {
        message.info('分享信息:\n' + textToCopy);
      });
    }
  };

  if (!result) {
    return (
      <Card
        title={
          <Space>
            <CheckCircleOutlined />
            <Title level={4} style={{ margin: 0 }}>
              计算结果
            </Title>
          </Space>
        }
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无计算结果，请先配置货物和集装箱，然后点击开始计算"
        />
      </Card>
    );
  }

  // 获取利用率颜色
  const getUtilizationColor = (value: number) => {
    if (value >= 85) return '#52c41a';
    if (value >= 60) return '#faad14';
    return '#f5222d';
  };

  // 获取利用率评价
  const getUtilizationRating = (value: number) => {
    if (value >= 85) return '优秀';
    if (value >= 60) return '良好';
    return '需优化';
  };

  // 渲染概览统计
  const renderOverview = () => (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      {/* 总体统计 */}
      <Row gutter={[16, 16]}>
        <Col xs={12} lg={6}>
          <Card bordered={false} style={{ background: '#e6f7ff' }}>
            <Statistic
              title="使用集装箱"
              value={result.totalContainers}
              suffix="个"
              valueStyle={{ color: '#1890ff' }}
              prefix={<ContainerOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card bordered={false} style={{ background: '#f6ffed' }}>
            <Statistic
              title="装载货物"
              value={result.totalCargoCount}
              suffix="件"
              valueStyle={{ color: '#52c41a' }}
              prefix={<BoxPlotOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card bordered={false} style={{ background: '#fff7e6' }}>
            <Statistic
              title="平均利用率"
              value={result.averageUtilization.toFixed(1)}
              suffix="%"
              valueStyle={{
                color: getUtilizationColor(result.averageUtilization),
              }}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card bordered={false} style={{ background: '#f9f0ff' }}>
            <Statistic
              title="计算耗时"
              value={result.calculationTime.toFixed(2)}
              suffix="秒"
              valueStyle={{ color: '#722ed1' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 未放置货物警告 */}
      {result.unplacedCargo.length > 0 && (
        <Alert
          message={`有 ${result.unplacedCargo.length} 种货物未能装载`}
          description="可能是由于集装箱容量不足或货物尺寸过大"
          type="warning"
          showIcon
          icon={<WarningFilled />}
        />
      )}

      {/* 各集装箱详情 */}
      <Card title="各集装箱装载详情" size="small">
        <Row gutter={[16, 16]}>
          {result.containers.map((container, index) => (
            <Col xs={24} sm={12} lg={8} key={index}>
              <Card
                hoverable
                size="small"
                onClick={() => {
                  setSelectedContainer(index);
                  setActiveTab('containers');
                }}
                title={
                  <Space>
                    <ContainerOutlined />
                    <Text strong>集装箱 #{index + 1}</Text>
                    <Tag>{container.container.code}</Tag>
                  </Space>
                }
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Row>
                    <Col span={12}>
                      <Text type="secondary">装载货物:</Text>
                      <div>
                        <Text strong>{container.loadedCount}</Text>
                        <Text type="secondary"> 件</Text>
                      </div>
                    </Col>
                    <Col span={12}>
                      <Text type="secondary">总重量:</Text>
                      <div>
                        <Text strong>{container.totalWeight.toFixed(1)}</Text>
                        <Text type="secondary"> kg</Text>
                      </div>
                    </Col>
                  </Row>

                  <Divider style={{ margin: '8px 0' }} />

                  <div>
                    <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                      <Text type="secondary">体积利用率</Text>
                      <Tag color={getUtilizationColor(container.volumeUtilization)}>
                        {getUtilizationRating(container.volumeUtilization)}
                      </Tag>
                    </Space>
                    <Progress
                      percent={parseFloat(container.volumeUtilization.toFixed(1))}
                      size="small"
                      strokeColor={getUtilizationColor(container.volumeUtilization)}
                    />
                  </div>

                  <div>
                    <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                      <Text type="secondary">重量利用率</Text>
                      <Tag color={getUtilizationColor(container.weightUtilization)}>
                        {getUtilizationRating(container.weightUtilization)}
                      </Tag>
                    </Space>
                    <Progress
                      percent={parseFloat(container.weightUtilization.toFixed(1))}
                      size="small"
                      strokeColor={getUtilizationColor(container.weightUtilization)}
                    />
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 计算信息 */}
      <Card size="small" title="计算信息">
        <Descriptions size="small" column={2}>
          <Descriptions.Item label="算法">{result.algorithm}</Descriptions.Item>
          <Descriptions.Item label="计算时间">
            {new Date(result.timestamp).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="货物总数">{result.totalCargoCount} 件</Descriptions.Item>
          <Descriptions.Item label="未装载货物">
            {result.unplacedCargo.length} 种
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </Space>
  );

  // 渲染集装箱详情
  const renderContainerDetail = () => {
    const container = result.containers[selectedContainer];
    if (!container) return null;

    const columns = [
      {
        title: '货物名称',
        dataIndex: 'name',
        key: 'name',
        render: (text: string, record: LoadedCargo) => (
          <Space>
            <div
              style={{
                width: 16,
                height: 16,
                backgroundColor: record.color,
                borderRadius: 2,
              }}
            />
            <Text strong>{text}</Text>
            {record.fragile && <Tag color="red">易碎</Tag>}
          </Space>
        ),
      },
      {
        title: '尺寸',
        key: 'dimensions',
        render: (_: any, record: LoadedCargo) =>
          `${record.length}×${record.width}×${record.height}`,
      },
      {
        title: '重量',
        dataIndex: 'weight',
        key: 'weight',
        render: (weight: number) => `${weight} kg`,
      },
      {
        title: '位置 (X,Y,Z)',
        key: 'position',
        render: (_: any, record: LoadedCargo) =>
          `${record.position.x}, ${record.position.y}, ${record.position.z}`,
      },
      {
        title: '旋转',
        key: 'rotation',
        render: (_: any, record: LoadedCargo) =>
          `${record.rotation.x}°, ${record.rotation.y}°, ${record.rotation.z}°`,
      },
    ];

    return (
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 集装箱选择 */}
        <Card size="small">
          <Space>
            <Text>选择集装箱:</Text>
            {result.containers.map((_, index) => (
              <Button
                key={index}
                type={selectedContainer === index ? 'primary' : 'default'}
                size="small"
                onClick={() => setSelectedContainer(index)}
              >
                #{index + 1}
              </Button>
            ))}
          </Space>
        </Card>

        {/* 当前集装箱统计 */}
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="集装箱类型"
              value={container.container.name}
              valueStyle={{ fontSize: 16 }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="装载货物数"
              value={container.loadedCount}
              suffix="件"
              valueStyle={{ fontSize: 16 }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="总重量"
              value={container.totalWeight.toFixed(1)}
              suffix="kg"
              valueStyle={{ fontSize: 16 }}
            />
          </Col>
        </Row>

        {/* 利用率 */}
        <Row gutter={16}>
          <Col span={12}>
            <Card size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                  <Text strong>体积利用率</Text>
                  <Tag color={getUtilizationColor(container.volumeUtilization)}>
                    {container.volumeUtilization.toFixed(1)}%
                  </Tag>
                </Space>
                <Progress
                  percent={parseFloat(container.volumeUtilization.toFixed(1))}
                  strokeColor={getUtilizationColor(container.volumeUtilization)}
                />
              </Space>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                  <Text strong>重量利用率</Text>
                  <Tag color={getUtilizationColor(container.weightUtilization)}>
                    {container.weightUtilization.toFixed(1)}%
                  </Tag>
                </Space>
                <Progress
                  percent={parseFloat(container.weightUtilization.toFixed(1))}
                  strokeColor={getUtilizationColor(container.weightUtilization)}
                />
              </Space>
            </Card>
          </Col>
        </Row>

        {/* 货物列表 */}
        <Card title="装载货物明细" size="small">
          <Table
            columns={columns}
            dataSource={container.cargoList}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
            }}
            size="small"
            scroll={{ x: 600 }}
          />
        </Card>
      </Space>
    );
  };

  // 渲染货物统计
  const renderCargoStats = () => {
    const cargoStats: Record<string, { count: number; totalWeight: number; color: string }> = {};

    result.containers.forEach((container) => {
      container.cargoList.forEach((cargo) => {
        if (!cargoStats[cargo.name]) {
          cargoStats[cargo.name] = {
            count: 0,
            totalWeight: 0,
            color: cargo.color || '#1890ff',
          };
        }
        cargoStats[cargo.name].count += 1;
        cargoStats[cargo.name].totalWeight += cargo.weight;
      });
    });

    const data = Object.entries(cargoStats).map(([name, stats]) => ({
      name,
      ...stats,
    }));

    return (
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Card title="货物装载统计" size="small">
          <List
            dataSource={data}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        backgroundColor: item.color,
                        borderRadius: 4,
                      }}
                    />
                  }
                  title={item.name}
                  description={`总重量: ${item.totalWeight.toFixed(1)} kg`}
                />
                <Badge count={item.count} style={{ backgroundColor: '#52c41a' }} overflowCount={999} />
              </List.Item>
            )}
          />
        </Card>

        {result.unplacedCargo.length > 0 && (
          <Card title="未装载货物" size="small" style={{ borderColor: '#ff4d4f' }}>
            <List
              dataSource={result.unplacedCargo}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          backgroundColor: item.color || '#ff4d4f',
                          borderRadius: 4,
                        }}
                      />
                    }
                    title={item.name}
                    description={`数量: ${item.quantity} | 体积: ${
                      (item.length * item.width * item.height) / 1000000
                    } m³`}
                  />
                  <Tag color="red">未装载</Tag>
                </List.Item>
              )}
            />
          </Card>
        )}
      </Space>
    );
  };

    return (
      <>
        <Card
          title={
            <Space>
              <CheckCircleOutlined />
              <Title level={4} style={{ margin: 0 }}>
                计算结果
              </Title>
              <Tag color="green">完成</Tag>
            </Space>
          }
          extra={
            <Space>
              <Button icon={<DownloadOutlined />} onClick={handleExport}>
                导出报告
              </Button>
              <Button icon={<ShareAltOutlined />} onClick={handleShare}>
                分享
              </Button>
            </Space>
          }
        >
          <Tabs activeKey={activeTab} onChange={setActiveTab} type="card">
            <TabPane
              tab={
                <Space>
                  <BarChartOutlined />
                  概览
                </Space>
              }
              key="overview"
            >
              {renderOverview()}
            </TabPane>
            <TabPane
              tab={
                <Space>
                  <ContainerOutlined />
                  集装箱详情
                  <Badge count={result.totalContainers} style={{ backgroundColor: '#1890ff' }} />
                </Space>
              }
              key="containers"
            >
              {renderContainerDetail()}
            </TabPane>
            <TabPane
              tab={
                <Space>
                  <BoxPlotOutlined />
                  货物统计
                </Space>
              }
              key="cargo"
            >
              {renderCargoStats()}
            </TabPane>
          </Tabs>
        </Card>

        <Modal
          title="导出报告"
          visible={exportModalVisible}
          onCancel={() => setExportModalVisible(false)}
          onOk={handleConfirmExport}
          okText="导出"
          cancelText="取消"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>选择导出格式：</Text>
              <Select
                value={exportFormat}
                onChange={(value) => setExportFormat(value as any)}
                style={{ width: '100%', marginTop: 8 }}
              >
                <Option value="excel">
                  <Space>
                    <FileExcelOutlined />
                    Excel (.xlsx)
                  </Space>
                </Option>
                <Option value="csv">
                  <Space>
                    <FileTextIcon />
                    CSV (.csv)
                  </Space>
                </Option>
                <Option value="json">
                  <Space>
                    <CodeOutlined />
                    JSON (.json)
                  </Space>
                </Option>
                <Option value="txt">
                  <Space>
                    <FileTextIcon />
                    文本报告 (.txt)
                  </Space>
                </Option>
              </Select>
            </div>
            
            <Divider />
            
            <div>
              <Text type="secondary">导出内容包含：</Text>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                <li>统计信息（集装箱数量、货物总数、利用率等）</li>
                <li>各集装箱装载详情</li>
                <li>货物明细列表</li>
                <li>未装载货物列表（如有）</li>
              </ul>
            </div>
          </Space>
        </Modal>
      </>
    );
  };

export default ResultViewer;
