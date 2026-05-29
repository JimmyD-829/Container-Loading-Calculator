import React from 'react';
import { Card, Row, Col, Progress, Tag, Statistic, Typography, Space, Divider } from 'antd';
import { 
  ArrowUpOutlined, 
  ArrowDownOutlined, 
  WarningFilled, 
  CheckCircleFilled,
  BarChartOutlined,
  PieChartOutlined,
  CompassOutlined,
  BoxPlotOutlined,
} from '@ant-design/icons';
import { ObjectiveScore, MultiObjectiveWeights } from '../algorithms/multiObjective';
import { EmissionResult } from '../algorithms/carbonEmission';

const { Title, Text } = Typography;

interface ExplainableAIProps {
  objectiveScores: ObjectiveScore | null;
  weights: MultiObjectiveWeights;
  emissionResult: EmissionResult | null;
  algorithmName: string;
  calculationTime: number;
}

export const ExplainableAI: React.FC<ExplainableAIProps> = ({
  objectiveScores,
  weights,
  emissionResult,
  algorithmName,
  calculationTime,
}) => {
  if (!objectiveScores) {
    return (
      <Card title="AI决策解释" bordered={false}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <BarChart2 style={{ fontSize: '48px', color: '#ccc' }} />
          <p style={{ marginTop: '16px', color: '#999' }}>请先执行装柜计算</p>
        </div>
      </Card>
    );
  }

  const scoreItems = [
    {
      key: 'spaceUtilization',
      label: '空间利用率',
      score: objectiveScores.spaceUtilization,
      weight: weights.spaceUtilization,
      icon: <BoxPlotOutlined />,
      color: '#1890ff',
      description: '货物占据集装箱空间的比例',
    },
    {
      key: 'centerOfGravityScore',
      label: '重心平衡',
      score: objectiveScores.centerOfGravityScore,
      weight: weights.centerOfGravity,
      icon: <CompassOutlined />,
      color: '#52c41a',
      description: '重心接近理想位置的程度',
    },
    {
      key: 'stackingStability',
      label: '堆码稳定性',
      score: objectiveScores.stackingStability,
      weight: weights.stackingStability,
      icon: <PieChartOutlined />,
      color: '#faad14',
      description: '货物堆叠的稳定性评分',
    },
    {
      key: 'loadingCost',
      label: '装载成本',
      score: objectiveScores.loadingCost,
      weight: weights.loadingCost,
      icon: <BarChartOutlined />,
      color: '#722ed1',
      description: '装载操作的便捷程度',
    },
    {
      key: 'unloadingOrder',
      label: '卸货顺序',
      score: objectiveScores.unloadingOrder,
      weight: weights.unloadingOrder,
      icon: <ArrowUpOutlined />,
      color: '#13c2c2',
      description: '优先货物靠近舱门的程度',
    },
  ];

  const getScoreLevel = (score: number) => {
    if (score >= 0.8) return { level: '优秀', color: 'green', icon: <CheckCircleFilled /> };
    if (score >= 0.6) return { level: '良好', color: 'blue', icon: <CheckCircleFilled /> };
    if (score >= 0.4) return { level: '一般', color: 'orange', icon: <WarningFilled /> };
    return { level: '较差', color: 'red', icon: <WarningFilled /> };
  };

  const sortedItems = [...scoreItems].sort((a, b) => b.score - a.score);
  const topContributor = sortedItems[0];
  const lowestContributor = sortedItems[sortedItems.length - 1];

  return (
    <Card title="AI决策解释" bordered={false}>
      <Row gutter={16}>
        <Col span={12}>
          <Statistic
            title="综合评分"
            value={objectiveScores.weightedScore * 100}
            precision={1}
            suffix="分"
            valueStyle={{ color: '#1890ff', fontSize: '32px', fontWeight: 'bold' }}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="计算耗时"
            value={calculationTime}
            precision={2}
            suffix="秒"
            valueStyle={{ color: '#52c41a' }}
          />
        </Col>
      </Row>

      <Divider />

      <Title level={5}>算法决策因素分析</Title>
      <Space direction="vertical" style={{ width: '100%' }}>
        {scoreItems.map((item) => {
          const levelInfo = getScoreLevel(item.score);
          return (
            <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: item.color }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text>{item.label}</Text>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Tag color={levelInfo.color}>{levelInfo.level}</Tag>
                    <Text strong>{(item.score * 100).toFixed(1)}%</Text>
                  </div>
                </div>
                <Progress
                  percent={item.score * 100}
                  strokeColor={item.color}
                  size="small"
                  style={{ marginTop: '4px' }}
                />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  权重: {(item.weight * 100).toFixed(0)}% · {item.description}
                </Text>
              </div>
            </div>
          );
        })}
      </Space>

      <Divider />

      <Title level={5}>决策影响分析</Title>
      <Row gutter={16}>
        <Col span={12}>
          <Card size="small" title="最大贡献因素">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: topContributor.color, fontSize: '24px' }}>
                {topContributor.icon}
              </span>
              <div>
                <Text strong>{topContributor.label}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  贡献度: {(topContributor.score * topContributor.weight * 100).toFixed(1)}%
                </Text>
              </div>
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="待优化因素">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: lowestContributor.color, fontSize: '24px' }}>
                {lowestContributor.icon}
              </span>
              <div>
                <Text strong>{lowestContributor.label}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  当前评分: {(lowestContributor.score * 100).toFixed(1)}%
                </Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {emissionResult && (
        <>
          <Divider />
          <Title level={5}>碳排放分析</Title>
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title="总碳排放"
                value={emissionResult.totalEmission}
                precision={1}
                suffix="kg CO₂"
                valueStyle={{ color: '#f5222d' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="优化后排放"
                value={emissionResult.optimizedEmission}
                precision={1}
                suffix="kg CO₂"
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="减排潜力"
                value={emissionResult.reductionPercentage}
                precision={1}
                suffix="%"
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
          </Row>

          {emissionResult.reductionPercentage < 10 && (
            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fff7e6', borderRadius: '4px' }}>
              <WarningFilled style={{ color: '#faad14', marginRight: '8px' }} />
              <Text type="warning">当前方案碳排放较高，建议重新优化装载布局</Text>
            </div>
          )}
        </>
      )}

      <Divider />

      <Title level={5}>算法信息</Title>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Tag color="purple">{algorithmName}</Tag>
        <Text type="secondary">
          采用多目标优化算法，综合考虑空间利用率、重心平衡、堆码稳定性等因素
        </Text>
      </div>
    </Card>
  );
};

export default ExplainableAI;
