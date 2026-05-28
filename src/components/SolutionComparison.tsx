import React, { useState, useMemo } from 'react';
import {
  Card,
  Table,
  Row,
  Col,
  Statistic,
  Tag,
  Space,
  Button,
  Select,
  Typography,
  Divider,
  Progress,
  Empty,
  Tooltip,
} from 'antd';
import {
  TrophyOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
  SwapOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { Solution } from '../types';
import { compareSolutions } from '../utils/solutionComparison';

const { Title, Text, Paragraph } = Typography;

interface SolutionComparisonProps {
  solutions: Solution[];
  onClose?: () => void;
}

const algorithmLabels: Record<string, string> = {
  FFD: '首次适应递减',
  GA: '遗传算法',
  SA: '模拟退火',
  MultiObjective: '多目标优化',
};

const radarDimensions = [
  { key: 'volumeUtilization', label: '空间利用率', weight: 1 },
  { key: 'weightUtilization', label: '重量利用率', weight: 1 },
  { key: 'cargoEfficiency', label: '装载效率', weight: 1 },
  { key: 'calculationSpeed', label: '计算速度', weight: 1 },
  { key: 'stability', label: '稳定性', weight: 1 },
];

const getMetricValue = (solution: Solution, key: string): number => {
  if (!solution.result) return 0;
  const { totalStats, duration } = solution.result;

  switch (key) {
    case 'volumeUtilization':
      return totalStats.volumeUtilization || 0;
    case 'weightUtilization': {
      if (!totalStats.totalContainers || totalStats.totalContainers === 0) return 0;
      return (totalStats.totalWeight / (totalStats.totalContainers * 30000)) * 100;
    }
    case 'cargoEfficiency': {
      if (!totalStats.totalCargos || totalStats.totalCargos === 0) return 0;
      return (totalStats.placedCargos / totalStats.totalCargos) * 100;
    }
    case 'calculationSpeed': {
      if (!duration || duration === 0) return 100;
      return Math.max(0, 100 - duration / 50);
    }
    case 'stability': {
      const volUtil = totalStats.volumeUtilization || 0;
      const weightUtil = totalStats.totalContainers
        ? (totalStats.totalWeight / (totalStats.totalContainers * 30000)) * 100
        : 0;
      return 100 - Math.abs(volUtil - weightUtil);
    }
    default:
      return 0;
  }
};

const generateDifferences = (selectedSolutions: Solution[]): string[] => {
  if (selectedSolutions.length < 2) return [];

  const differences: string[] = [];

  for (let i = 0; i < selectedSolutions.length; i++) {
    for (let j = i + 1; j < selectedSolutions.length; j++) {
      const a = selectedSolutions[i];
      const b = selectedSolutions[j];
      const resultA = a.result;
      const resultB = b.result;

      if (!resultA || !resultB) continue;

      const cargoDiff = resultA.totalStats.placedCargos - resultB.totalStats.placedCargos;
      if (cargoDiff !== 0) {
        const more = cargoDiff > 0 ? a.name : b.name;
        const less = cargoDiff > 0 ? b.name : a.name;
        differences.push(
          `${more} 比 ${less} 多装了 ${Math.abs(cargoDiff)} 件货物`
        );
      }

      const volDiff = resultA.totalStats.volumeUtilization - resultB.totalStats.volumeUtilization;
      if (Math.abs(volDiff) > 1) {
        const higher = volDiff > 0 ? a.name : b.name;
        const lower = volDiff > 0 ? b.name : a.name;
        differences.push(
          `${higher} 的体积利用率比 ${lower} 高 ${Math.abs(volDiff).toFixed(1)}%`
        );
      }

      const containerDiff = resultA.totalStats.totalContainers - resultB.totalStats.totalContainers;
      if (containerDiff !== 0) {
        const more = containerDiff > 0 ? a.name : b.name;
        const less = containerDiff > 0 ? b.name : a.name;
        differences.push(
          `${more} 比 ${less} 多使用了 ${Math.abs(containerDiff)} 个集装箱`
        );
      }

      const timeDiff = resultA.duration - resultB.duration;
      if (Math.abs(timeDiff) > 100) {
        const slower = timeDiff > 0 ? a.name : b.name;
        const faster = timeDiff > 0 ? b.name : a.name;
        const diffSeconds = (Math.abs(timeDiff) / 1000).toFixed(1);
        differences.push(
          `${slower} 的计算时间比 ${faster} 多了 ${diffSeconds} 秒`
        );
      }
    }
  }

  return differences;
};

function SolutionComparison({ solutions, onClose }: SolutionComparisonProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const availableSolutions = useMemo(
    () => solutions.filter((s) => s.result !== null),
    [solutions]
  );

  const selectedSolutions = useMemo(
    () => availableSolutions.filter((s) => selectedIds.includes(s.id)),
    [availableSolutions, selectedIds]
  );

  const comparisonResult = useMemo(
    () => (selectedSolutions.length >= 2 ? compareSolutions(selectedSolutions) : null),
    [selectedSolutions]
  );

  const differences = useMemo(
    () => generateDifferences(selectedSolutions),
    [selectedSolutions]
  );

  const handleSelectionChange = (ids: string[]) => {
    if (ids.length <= 4) {
      setSelectedIds(ids);
    }
  };

  const comparisonTableColumns = useMemo(() => {
    if (selectedSolutions.length === 0) return null;

    const metrics = [
      {
        key: 'containers',
        label: '集装箱数量',
        getValue: (s: Solution) => s.result?.totalStats.totalContainers ?? 0,
        unit: '个',
        lowerIsBetter: true,
      },
      {
        key: 'volumeUtil',
        label: '体积利用率',
        getValue: (s: Solution) => s.result?.totalStats.volumeUtilization ?? 0,
        unit: '%',
        lowerIsBetter: false,
        format: (v: number) => v.toFixed(1),
      },
      {
        key: 'weightUtil',
        label: '重量利用率',
        getValue: (s: Solution) => {
          if (!s.result || !s.result.totalStats.totalContainers) return 0;
          return (
            (s.result.totalStats.totalWeight /
              (s.result.totalStats.totalContainers * 30000)) *
            100
          );
        },
        unit: '%',
        lowerIsBetter: false,
        format: (v: number) => v.toFixed(1),
      },
      {
        key: 'placedCargos',
        label: '装载货物数',
        getValue: (s: Solution) => s.result?.totalStats.placedCargos ?? 0,
        unit: '件',
        lowerIsBetter: false,
      },
      {
        key: 'duration',
        label: '计算耗时',
        getValue: (s: Solution) => s.result?.duration ?? 0,
        unit: 'ms',
        lowerIsBetter: true,
        format: (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(2)}s` : `${v.toFixed(0)}ms`),
      },
      {
        key: 'algorithm',
        label: '算法类型',
        getValue: (s: Solution) => s.result?.algorithm ?? '-',
        isText: true,
      },
    ];

    const dataItem: Record<string, unknown> = { key: 'row' };

    metrics.forEach((metric) => {
      if (metric.isText) {
        dataItem[metric.key] = selectedSolutions.map((s) =>
          algorithmLabels[metric.getValue(s) as string] || (metric.getValue(s) as string)
        );
        return;
      }

      const values = selectedSolutions.map((s) => metric.getValue(s) as number);
      const bestVal = metric.lowerIsBetter
        ? Math.min(...values)
        : Math.max(...values);
      const worstVal = metric.lowerIsBetter
        ? Math.max(...values)
        : Math.min(...values);

      dataItem[metric.key] = values.map((val, idx) => ({
        value: metric.format ? metric.format(val) : val,
        rawValue: val,
        isBest: val === bestVal && values.filter((v) => v === bestVal).length === 1,
        isWorst: val === worstVal && values.filter((v) => v === worstVal).length === 1,
        unit: metric.unit,
      }));
    });

    const columns: Array<{
      title: React.ReactNode;
      dataIndex: string;
      key: string;
      width?: number;
      align?: 'center' | 'left' | 'right';
      render?: (cellData: unknown, record?: unknown, idx?: number) => React.ReactNode;
    }> = [
      {
        title: '指标',
        dataIndex: 'metric',
        key: 'metric',
        width: 120,
        render: (text: unknown) => (
          <Text strong>{String(text)}</Text>
        ),
      },
      ...selectedSolutions.map((sol, colIdx) => ({
        title: (
          <Space>
            <Tag
              color={
                ['blue', 'green', 'orange', 'purple'][colIdx % 4]
              }
            >
              {sol.name}
            </Tag>
          </Space>
        ),
        dataIndex: sol.id,
        key: sol.id,
        align: 'center' as const,
        render: (cellData: unknown) => {
          if (!cellData) return '-';

          if (Array.isArray(cellData) && typeof (cellData as unknown[])[0] === 'string') {
            return <Text>{(cellData as string[])[colIdx]}</Text>;
          }

          const item = (cellData as Array<{value: string; rawValue: number; isBest: boolean; isWorst: boolean; unit: string}>)[colIdx];
          if (!item) return '-';

          if (typeof item === 'object' && 'value' in item) {
            return (
              <Space>
                <span
                  style={{
                    color: item.isBest
                      ? '#52c41a'
                      : item.isWorst
                      ? '#ff4d4f'
                      : undefined,
                    fontWeight: item.isBest || item.isWorst ? 600 : 400,
                  }}
                >
                  {item.value}
                  {item.unit && item.unit !== 'ms' && item.unit !== 's'
                    ? item.unit
                    : ''}
                </span>
                {item.isBest && (
                  <TrophyOutlined style={{ color: '#52c41a' }} />
                )}
                {item.isWorst && !item.isBest && (
                  <ArrowDownOutlined style={{ color: '#ff4d4f', fontSize: 12 }} />
                )}
              </Space>
            );
          }

          return String(item);
        },
      })),
    ];

    return { columns, metrics, dataItem };
  }, [selectedSolutions]);

  const tableData = useMemo(() => {
    if (!comparisonTableColumns || selectedSolutions.length === 0) return [];

    const { metrics, dataItem } = comparisonTableColumns;

    return metrics.map((metric) => {
      const row: Record<string, unknown> = {
        key: metric.key,
        metric: metric.label,
      };
      selectedSolutions.forEach((sol) => {
        row[sol.id] = dataItem[metric.key];
      });
      return row;
    });
  }, [comparisonTableColumns, selectedSolutions]);

  const radarData = useMemo(() => {
    if (selectedSolutions.length === 0) return [];

    return radarDimensions.map((dim) => {
      const values = selectedSolutions.map((s) => getMetricValue(s, dim.key));
      return {
        dimension: dim.label,
        values,
        max: 100,
      };
    });
  }, [selectedSolutions]);

  const solutionColors = ['#1890ff', '#52c41a', '#fa8c16', '#722ed1'];

  return (
    <div style={{ padding: 0 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Space>
          <SwapOutlined style={{ fontSize: 20, color: '#1890ff' }} />
          <Title level={4} style={{ margin: 0 }}>
            方案对比分析
          </Title>
        </Space>
        {onClose && (
          <Button onClick={onClose}>关闭对比</Button>
        )}
      </div>

      <Card
        size="small"
        style={{ marginBottom: 16 }}
        title={
          <Space>
            <BarChartOutlined />
            <span>选择对比方案</span>
            <Text type="secondary" style={{ fontSize: 12 }}>
              （选择 2-4 个方案进行对比）
            </Text>
          </Space>
        }
      >
        <Select
          mode="multiple"
          placeholder="请选择要对比的方案"
          value={selectedIds}
          onChange={handleSelectionChange}
          style={{ width: '100%' }}
          maxCount={4}
          options={availableSolutions.map((s) => ({
            value: s.id,
            label: `${s.name} - ${algorithmLabels[s.settings.algorithm] || s.settings.algorithm}`,
          }))}
          notFoundContent="暂无可对比的方案（需已完成计算）"
        />
        {selectedIds.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">
              已选择 {selectedIds.length}/4 个方案
            </Text>
          </div>
        )}
      </Card>

      {selectedSolutions.length < 2 ? (
        <Empty
          description="请至少选择 2 个方案进行对比"
          style={{ padding: '60px 0' }}
        />
      ) : (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            {selectedSolutions.map((sol, idx) => {
              const color = solutionColors[idx % solutionColors.length];
              const result = sol.result;
              return (
                <Col key={sol.id} xs={24} sm={12} md={6}>
                  <Card
                    size="small"
                    style={{
                      borderTop: `3px solid ${color}`,
                    }}
                  >
                    <div style={{ marginBottom: 8 }}>
                      <Text strong style={{ color }}>{sol.name}</Text>
                    </div>
                    <Row gutter={8}>
                      <Col span={12}>
                        <Statistic
                          title="体积利用率"
                          value={result?.totalStats.volumeUtilization ?? 0}
                          precision={1}
                          suffix="%"
                          valueStyle={{
                            fontSize: 16,
                            color,
                          }}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="集装箱数"
                          value={result?.totalStats.totalContainers ?? 0}
                          suffix="个"
                          valueStyle={{
                            fontSize: 16,
                            color,
                          }}
                        />
                      </Col>
                    </Row>
                  </Card>
                </Col>
              );
            })}
          </Row>

          <Card
            size="small"
            style={{ marginBottom: 16 }}
            title="对比详情"
          >
            {comparisonTableColumns && (
              <Table
                columns={comparisonTableColumns.columns}
                dataSource={tableData}
                pagination={false}
                size="small"
                bordered
              />
            )}
          </Card>

          {comparisonResult && (
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={24} md={12}>
                <Card
                  size="small"
                  title={
                    <Space>
                      <BarChartOutlined />
                      <span>综合评分</span>
                    </Space>
                  }
                >
                  {radarData.map((dim) => (
                    <div
                      key={dim.dimension}
                      style={{ marginBottom: 12 }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 4,
                        }}
                      >
                        <Text style={{ fontSize: 13 }}>{dim.dimension}</Text>
                      </div>
                      {selectedSolutions.map((sol, idx) => (
                        <div
                          key={sol.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: 4,
                          }}
                        >
                          <Tag
                            color={solutionColors[idx % solutionColors.length]}
                            style={{
                              width: 16,
                              height: 16,
                              minWidth: 16,
                              padding: 0,
                              marginRight: 8,
                              borderRadius: 4,
                            }}
                          />
                          <Progress
                            percent={Math.min(100, Math.max(0, dim.values[idx]))}
                            strokeColor={solutionColors[idx % solutionColors.length]}
                            size="small"
                            format={(percent) =>
                              `${percent?.toFixed(1)}%`
                            }
                            style={{ flex: 1 }}
                          />
                        </div>
                      ))}
                      {dim.dimension !== radarDimensions[radarDimensions.length - 1].label && (
                        <Divider style={{ margin: '8px 0' }} />
                      )}
                    </div>
                  ))}
                </Card>
              </Col>

              <Col xs={24} md={12}>
                <Card
                  size="small"
                  title="最优方案"
                >
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    {comparisonResult.summary.bestVolumeUtilization && (
                      <div>
                        <Tooltip title="体积利用率最高">
                          <Tag color="green" icon={<TrophyOutlined />}>
                            最佳体积利用率
                          </Tag>
                        </Tooltip>
                        <Text strong style={{ marginLeft: 8 }}>
                          {comparisonResult.summary.bestVolumeUtilization.name}
                        </Text>
                        <Text type="secondary" style={{ marginLeft: 4 }}>
                          ({comparisonResult.summary.bestVolumeUtilization.result?.totalStats.volumeUtilization.toFixed(1)}%)
                        </Text>
                      </div>
                    )}
                    {comparisonResult.summary.bestWeightUtilization && (
                      <div>
                        <Tooltip title="重量利用率最高">
                          <Tag color="green" icon={<TrophyOutlined />}>
                            最佳重量利用率
                          </Tag>
                        </Tooltip>
                        <Text strong style={{ marginLeft: 8 }}>
                          {comparisonResult.summary.bestWeightUtilization.name}
                        </Text>
                      </div>
                    )}
                    {comparisonResult.summary.leastContainers && (
                      <div>
                        <Tooltip title="使用集装箱最少">
                          <Tag color="blue" icon={<ArrowUpOutlined />}>
                            最少集装箱
                          </Tag>
                        </Tooltip>
                        <Text strong style={{ marginLeft: 8 }}>
                          {comparisonResult.summary.leastContainers.name}
                        </Text>
                        <Text type="secondary" style={{ marginLeft: 4 }}>
                          ({comparisonResult.summary.leastContainers.result?.totalStats.totalContainers}个)
                        </Text>
                      </div>
                    )}
                    {comparisonResult.summary.fastestCalculation && (
                      <div>
                        <Tooltip title="计算速度最快">
                          <Tag color="orange" icon={<ArrowUpOutlined />}>
                            最快计算速度
                          </Tag>
                        </Tooltip>
                        <Text strong style={{ marginLeft: 8 }}>
                          {comparisonResult.summary.fastestCalculation.name}
                        </Text>
                        <Text type="secondary" style={{ marginLeft: 4 }}>
                          ({comparisonResult.summary.fastestCalculation.result?.duration?.toFixed(0)}ms)
                        </Text>
                      </div>
                    )}
                  </Space>
                </Card>
              </Col>
            </Row>
          )}

          {differences.length > 0 && (
            <Card
              size="small"
              style={{ marginBottom: 16 }}
              title="差异分析"
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                {differences.map((diff, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: '8px 12px',
                      background: idx % 2 === 0 ? '#fafafa' : 'transparent',
                      borderRadius: 6,
                    }}
                  >
                    <Tag
                      color={
                        diff.includes('多装') || diff.includes('高')
                          ? 'green'
                          : diff.includes('多使用') || diff.includes('多')
                          ? 'red'
                          : 'blue'
                      }
                      style={{ marginTop: 2 }}
                    >
                      {diff.includes('多装') || diff.includes('高')
                        ? '优势'
                        : diff.includes('多使用') || diff.includes('多')
                        ? '劣势'
                        : '差异'}
                    </Tag>
                    <Text>{diff}</Text>
                  </div>
                ))}
              </Space>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default SolutionComparison;
