import React, { useState, useMemo } from 'react';
import {
  Card,
  Steps,
  Timeline,
  Table,
  Tag,
  Space,
  Button,
  Typography,
  Descriptions,
  Alert,
  Collapse,
  Progress,
  Tooltip,
  Empty,
  Row,
  Col,
  Badge,
} from 'antd';
import {
  FileTextOutlined,
  DownloadOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  ContainerOutlined,
} from '@ant-design/icons';
import type { LoadingResult, LoadedCargo } from './ResultViewer';

const { Title, Text } = Typography;
const { Panel } = Collapse;

interface LoadingGuideProps {
  result: LoadingResult | null;
}

const LoadingGuide = ({ result }: LoadingGuideProps) => {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const sortedCargoByContainer = useMemo(() => {
    if (!result) return [];

    return result.containers.map((containerData, containerIndex) => {
      const sorted = [...containerData.cargoList].sort((a, b) => {
        if (a.position.z !== b.position.z) {
          return b.position.z - a.position.z;
        }
        return a.position.y - b.position.y;
      });

      return {
        containerIndex,
        container: containerData.container,
        cargoList: sorted,
        volumeUtilization: containerData.volumeUtilization,
        weightUtilization: containerData.weightUtilization,
        loadedCount: containerData.loadedCount,
        totalWeight: containerData.totalWeight,
      };
    });
  }, [result]);

  const fragileItems = useMemo(() => {
    if (!result) return [];
    const items: LoadedCargo[] = [];
    result.containers.forEach((containerData) => {
      containerData.cargoList.forEach((cargo) => {
        if (cargo.fragile) {
          items.push(cargo);
        }
      });
    });
    return items;
  }, [result]);

  const hasGravityWarning = useMemo(() => {
    if (!result) return false;
    return result.containers.some((containerData) => {
      if (containerData.cargoList.length === 0) return false;
      let totalWeightedY = 0;
      let totalWeight = 0;
      containerData.cargoList.forEach((cargo) => {
        totalWeightedY += cargo.position.y * cargo.weight;
        totalWeight += cargo.weight;
      });
      const centerY = totalWeightedY / totalWeight;
      const containerHeight = containerData.container.height;
      return centerY > containerHeight * 0.65;
    });
  }, [result]);

  const hasStackingIssue = useMemo(() => {
    if (!result) return false;
    return result.containers.some((containerData) => {
      const nonStackableOnTop = containerData.cargoList.filter(
        (cargo) => !cargo.stackable && cargo.position.y > 0
      );
      return nonStackableOnTop.length > 0;
    });
  }, [result]);

  const toggleStepComplete = (cargoId: string) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(cargoId)) {
        next.delete(cargoId);
      } else {
        next.add(cargoId);
      }
      return next;
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = () => {
    window.print();
  };

  const getPositionLabel = (cargo: LoadedCargo, containerHeight: number, containerDepth: number) => {
    const yRatio = cargo.position.y / containerHeight;
    const zRatio = cargo.position.z / containerDepth;
    const verticalPos = yRatio < 0.33 ? '底部' : yRatio < 0.66 ? '中部' : '顶部';
    const depthPos = zRatio < 0.33 ? '内侧' : zRatio < 0.66 ? '中间' : '门口侧';
    return `${depthPos}·${verticalPos}`;
  };

  const cargoTableColumns = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: '货物名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: LoadedCargo) => (
        <Space>
          <div
            style={{
              width: 14,
              height: 14,
              backgroundColor: record.color || '#1890ff',
              borderRadius: 2,
              flexShrink: 0,
            }}
          />
          <Text strong>{text}</Text>
          {record.fragile && <Tag color="red">易碎</Tag>}
        </Space>
      ),
    },
    {
      title: '尺寸 (cm)',
      key: 'dimensions',
      render: (_: unknown, record: LoadedCargo) =>
        `${record.length}×${record.width}×${record.height}`,
    },
    {
      title: '重量 (kg)',
      dataIndex: 'weight',
      key: 'weight',
    },
    {
      title: '放置位置',
      key: 'position',
      render: (_: unknown, record: LoadedCargo) =>
        `(${record.position.x}, ${record.position.y}, ${record.position.z})`,
    },
    {
      title: '集装箱',
      key: 'container',
      render: (_: unknown, record: LoadedCargo) => `#${record.containerIndex + 1}`,
    },
    {
      title: '状态',
      key: 'status',
      render: (_: unknown, record: LoadedCargo) =>
        completedSteps.has(record.id) ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>已完成</Tag>
        ) : (
          <Tag color="default" icon={<ClockCircleOutlined />}>待装卸</Tag>
        ),
    },
  ];

  if (!result) {
    return (
      <Card>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无装箱结果，请先完成装箱计算"
        />
      </Card>
    );
  }

  const totalVolume = result.containers.reduce((sum, c) => {
    return sum + (c.container.length * c.container.width * c.container.height * c.volumeUtilization) / 100;
  }, 0);

  const totalWeight = result.containers.reduce((sum, c) => sum + c.totalWeight, 0);

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <FileTextOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <Title level={4} style={{ margin: 0 }}>装卸顺序指导书</Title>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button icon={<PrinterOutlined />} onClick={handlePrint}>
                打印
              </Button>
              <Button type="primary" icon={<DownloadOutlined />} onClick={handleExportPdf}>
                导出PDF
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card title="基本信息" size="small">
        <Descriptions column={{ xs: 1, sm: 2, md: 4 }} bordered size="small">
          <Descriptions.Item label="集装箱数量">
            <Badge count={result.totalContainers} style={{ backgroundColor: '#1890ff' }} />
          </Descriptions.Item>
          <Descriptions.Item label="总货物数">
            {result.totalCargoCount} 件
          </Descriptions.Item>
          <Descriptions.Item label="总体积">
            {(totalVolume / 1000000).toFixed(2)} m³
          </Descriptions.Item>
          <Descriptions.Item label="总重量">
            {totalWeight.toFixed(1)} kg
          </Descriptions.Item>
          <Descriptions.Item label="平均利用率">
            <Space>
              <Progress
                type="circle"
                percent={Number(result.averageUtilization.toFixed(1))}
                size={40}
                format={(percent) => `${percent}%`}
              />
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="算法">
            {result.algorithm}
          </Descriptions.Item>
          <Descriptions.Item label="计算耗时">
            {result.calculationTime.toFixed(2)} 秒
          </Descriptions.Item>
          <Descriptions.Item label="未装载货物">
            {result.unplacedCargo.length > 0 ? (
              <Tag color="red">{result.unplacedCargo.length} 种</Tag>
            ) : (
              <Tag color="green">全部装载</Tag>
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {(fragileItems.length > 0 || hasGravityWarning || hasStackingIssue) && (
        <Card title="装卸注意事项" size="small">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {fragileItems.length > 0 && (
              <Alert
                message="易碎品清单"
                description={
                  <div>
                    <Text>以下货物为易碎品，装卸时需特别注意轻拿轻放：</Text>
                    <div style={{ marginTop: 8 }}>
                      {fragileItems.map((item) => (
                        <Tag key={item.id} color="red" style={{ marginBottom: 4 }}>
                          {item.name} ({item.length}×{item.width}×{item.height}cm, {item.weight}kg)
                        </Tag>
                      ))}
                    </div>
                  </div>
                }
                type="warning"
                showIcon
              />
            )}
            {hasGravityWarning && (
              <Alert
                message="重心偏移警告"
                description="部分集装箱货物重心偏高，装卸及运输过程中请注意固定，防止倾倒。建议将重物放置于底部以降低重心。"
                type="error"
                showIcon
              />
            )}
            {hasStackingIssue && (
              <Alert
                message="堆叠限制提醒"
                description="存在不可堆叠货物位于非底层位置的情况，请确认堆叠方案是否合理，避免压坏货物。"
                type="info"
                showIcon
              />
            )}
          </Space>
        </Card>
      )}

      <Card title="装卸步骤" size="small">
        <Collapse defaultActiveKey={sortedCargoByContainer.map((_, i) => `container-${i}`)}>
          {sortedCargoByContainer.map((containerData) => {
            const containerHeight = containerData.container.height;
            const containerDepth = containerData.container.length;

            return (
              <Panel
                header={
                  <Space>
                    <ContainerOutlined />
                    <Text strong>
                      集装箱 #{containerData.containerIndex + 1}
                    </Text>
                    <Tag>{containerData.container.name}</Tag>
                    <Text type="secondary">
                      {containerData.loadedCount} 件 | {containerData.totalWeight.toFixed(1)} kg
                    </Text>
                    <Progress
                      percent={Number(containerData.volumeUtilization.toFixed(1))}
                      size="small"
                      style={{ width: 120, display: 'inline-block' }}
                    />
                  </Space>
                }
                key={`container-${containerData.containerIndex}`}
              >
                <Timeline
                  items={containerData.cargoList.map((cargo, stepIndex) => {
                    const isCompleted = completedSteps.has(cargo.id);
                    const positionLabel = getPositionLabel(cargo, containerHeight, containerDepth);

                    return {
                      color: isCompleted ? 'green' : 'blue',
                      dot: isCompleted ? (
                        <CheckCircleOutlined style={{ fontSize: 16 }} />
                      ) : (
                        <ClockCircleOutlined style={{ fontSize: 16 }} />
                      ),
                      children: (
                        <Card
                          size="small"
                          style={{
                            borderColor: isCompleted ? '#52c41a' : '#d9d9d9',
                            backgroundColor: isCompleted ? '#f6ffed' : '#fff',
                          }}
                        >
                          <Row justify="space-between" align="middle">
                            <Col>
                              <Space direction="vertical" size={4}>
                                <Space>
                                  <Text strong>
                                    步骤 {stepIndex + 1}
                                  </Text>
                                  <Tag color={isCompleted ? 'green' : 'blue'}>
                                    {isCompleted ? '已完成' : '待装卸'}
                                  </Tag>
                                  {cargo.fragile && (
                                    <Tag color="red">易碎品</Tag>
                                  )}
                                </Space>
                                <Space size="large">
                                  <Text>
                                    <Text type="secondary">货物：</Text>
                                    <Text strong>{cargo.name}</Text>
                                  </Text>
                                  <Text>
                                    <Text type="secondary">尺寸：</Text>
                                    {cargo.length}×{cargo.width}×{cargo.height} cm
                                  </Text>
                                  <Text>
                                    <Text type="secondary">重量：</Text>
                                    {cargo.weight} kg
                                  </Text>
                                </Space>
                                <Space size="large">
                                  <Text>
                                    <Text type="secondary">放置位置：</Text>
                                    ({cargo.position.x}, {cargo.position.y}, {cargo.position.z})
                                  </Text>
                                  <Tag
                                    icon={
                                      cargo.position.y > containerHeight * 0.5 ? (
                                        <ArrowUpOutlined />
                                      ) : (
                                        <ArrowDownOutlined />
                                      )
                                    }
                                  >
                                    {positionLabel}
                                  </Tag>
                                </Space>
                                {cargo.fragile && (
                                  <Text type="danger" style={{ fontSize: 12 }}>
                                    ⚠ 注意：此货物为易碎品，请轻拿轻放，避免碰撞
                                  </Text>
                                )}
                              </Space>
                            </Col>
                            <Col>
                              <Tooltip title={isCompleted ? '标记为未完成' : '标记为已完成'}>
                                <Button
                                  size="small"
                                  type={isCompleted ? 'default' : 'primary'}
                                  icon={<CheckCircleOutlined />}
                                  onClick={() => toggleStepComplete(cargo.id)}
                                >
                                  {isCompleted ? '撤销' : '完成'}
                                </Button>
                              </Tooltip>
                            </Col>
                          </Row>
                        </Card>
                      ),
                    };
                  })}
                />

                <div style={{ marginTop: 16, textAlign: 'center' }}>
                  <Space>
                    <Text type="secondary">
                      进度：{completedSteps.size}/{containerData.cargoList.length}
                    </Text>
                    <Progress
                      type="circle"
                      percent={
                        containerData.cargoList.length > 0
                          ? Number(
                              (
                                (completedSteps.size / containerData.cargoList.length) *
                                100
                              ).toFixed(1)
                            )
                          : 0
                      }
                      size={48}
                    />
                  </Space>
                </div>
              </Panel>
            );
          })}
        </Collapse>
      </Card>

      <Card title="货物清单" size="small">
        <Table
          dataSource={result.containers.flatMap((c) => c.cargoList)}
          columns={cargoTableColumns}
          rowKey="id"
          size="small"
          pagination={false}
          scroll={{ x: 800 }}
        />
      </Card>
    </Space>
  );
};

export default LoadingGuide;
