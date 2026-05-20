import React, { useState } from 'react';
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
} from '@ant-design/icons';
import type { CargoItem } from './CargoManager';
import type { ContainerType } from './ContainerSelector';

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
                <Badge count={item.count} style={{ backgroundColor: '#52c41a' }} />
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
          <Button icon={<DownloadOutlined />} onClick={onExport}>
            导出报告
          </Button>
          <Button icon={<ShareAltOutlined />} onClick={onShare}>
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
  );
};

export default ResultViewer;
