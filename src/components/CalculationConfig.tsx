import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  InputNumber,
  Switch,
  Slider,
  Row,
  Col,
  Space,
  Typography,
  Tag,
  Progress,
  Alert,
  Divider,
  Tooltip,
  Button,
  Radio,
  Select,
  Collapse,
  Statistic,
  Badge,
} from 'antd';
import {
  SettingOutlined,
  CalculatorOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExperimentOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { CargoItem } from './CargoManager';
import type { ContainerType } from './ContainerSelector';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { Option } = Select;

// 计算配置类型定义
export interface CalculationConfig {
  algorithm: 'greedy' | 'genetic' | 'brute-force';
  allowRotation: boolean;
  prioritizeWeight: boolean;
  stackingLimit: number;
  gapBetweenItems: number;
  maxCalculationTime: number;
  considerFragile: boolean;
  balanceWeight: boolean;
}

// 容量分析结果类型
export interface CapacityAnalysis {
  volumeUtilization: number;
  weightUtilization: number;
  estimatedContainers: number;
  isWeightLimited: boolean;
  remainingVolume: number;
  remainingWeight: number;
  recommendations: string[];
}

interface CalculationConfigProps {
  config: CalculationConfig;
  onConfigChange: (config: CalculationConfig) => void;
  cargoList: CargoItem[];
  selectedContainer: ContainerType | null;
  onCalculate: () => void;
  isCalculating: boolean;
}

const CalculationConfigComponent: React.FC<CalculationConfigProps> = ({
  config,
  onConfigChange,
  cargoList,
  selectedContainer,
  onCalculate,
  isCalculating,
}) => {
  const [form] = Form.useForm();
  const [analysis, setAnalysis] = useState<CapacityAnalysis | null>(null);

  // 计算容量分析
  useEffect(() => {
    if (selectedContainer && cargoList.length > 0) {
      performAnalysis();
    } else {
      setAnalysis(null);
    }
  }, [cargoList, selectedContainer, config]);

  const performAnalysis = () => {
    if (!selectedContainer) return;

    const totalCargoVolume = cargoList.reduce(
      (sum, item) => sum + item.length * item.width * item.height * item.quantity,
      0
    );
    const totalCargoWeight = cargoList.reduce(
      (sum, item) => sum + item.weight * item.quantity,
      0
    );

    const containerVolume = selectedContainer.volume * 1000000; // 转换为 cm³
    const containerWeightCapacity = selectedContainer.maxWeight;

    const volumeBasedContainers = Math.ceil(totalCargoVolume / containerVolume);
    const weightBasedContainers = Math.ceil(totalCargoWeight / containerWeightCapacity);
    const estimatedContainers = Math.max(volumeBasedContainers, weightBasedContainers);

    const volumeUtilization = Math.min(
      (totalCargoVolume / (containerVolume * estimatedContainers)) * 100,
      100
    );
    const weightUtilization = Math.min(
      (totalCargoWeight / (containerWeightCapacity * estimatedContainers)) * 100,
      100
    );

    const isWeightLimited = weightBasedContainers > volumeBasedContainers;
    const remainingVolume = containerVolume * estimatedContainers - totalCargoVolume;
    const remainingWeight = containerWeightCapacity * estimatedContainers - totalCargoWeight;

    const recommendations: string[] = [];
    if (isWeightLimited) {
      recommendations.push('货物较重，建议关注重量限制');
    }
    if (volumeUtilization < 70) {
      recommendations.push('体积利用率较低，考虑优化包装');
    }
    if (estimatedContainers > 1) {
      recommendations.push(`预计需要 ${estimatedContainers} 个集装箱`);
    }
    if (cargoList.some((item) => !item.stackable)) {
      recommendations.push('包含不可堆叠货物，可能影响装载效率');
    }

    setAnalysis({
      volumeUtilization,
      weightUtilization,
      estimatedContainers,
      isWeightLimited,
      remainingVolume,
      remainingWeight,
      recommendations,
    });
  };

  // 重置配置
  const handleReset = () => {
    const defaultConfig: CalculationConfig = {
      algorithm: 'greedy',
      allowRotation: true,
      prioritizeWeight: false,
      stackingLimit: 3,
      gapBetweenItems: 0,
      maxCalculationTime: 30,
      considerFragile: true,
      balanceWeight: true,
    };
    onConfigChange(defaultConfig);
    form.setFieldsValue(defaultConfig);
  };

  // 获取容量状态颜色
  const getCapacityColor = (value: number) => {
    if (value >= 90) return '#f5222d';
    if (value >= 70) return '#faad14';
    return '#52c41a';
  };

  // 获取容量状态文字
  const getCapacityStatus = (value: number) => {
    if (value >= 90) return '紧张';
    if (value >= 70) return '适中';
    return '充裕';
  };

  return (
    <Card
      title={
        <Space>
          <SettingOutlined />
          <Title level={4} style={{ margin: 0 }}>
            计算配置
          </Title>
        </Space>
      }
      extra={
        <Button icon={<ReloadOutlined />} onClick={handleReset}>
          重置配置
        </Button>
      }
    >
      <Row gutter={[24, 24]}>
        {/* 左侧：配置表单 */}
        <Col xs={24} lg={14}>
          <Form
            form={form}
            layout="vertical"
            initialValues={config}
            onValuesChange={(_, allValues) => onConfigChange(allValues)}
          >
            <Collapse defaultActiveKey={['basic', 'advanced']} ghost>
              <Panel
                header={
                  <Space>
                    <CalculatorOutlined />
                    <Text strong>基础配置</Text>
                  </Space>
                }
                key="basic"
              >
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item
                      name="algorithm"
                      label="装载算法"
                      tooltip="选择不同的装载算法会影响计算速度和装载效率"
                    >
                      <Select>
                        <Option value="greedy">
                          <Space>
                            贪心算法
                            <Tag color="blue">快速</Tag>
                          </Space>
                        </Option>
                        <Option value="genetic">
                          <Space>
                            遗传算法
                            <Tag color="orange">平衡</Tag>
                          </Space>
                        </Option>
                        <Option value="brute-force">
                          <Space>
                            穷举算法
                            <Tag color="red">精确但慢</Tag>
                          </Space>
                        </Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="allowRotation"
                      valuePropName="checked"
                      label="允许旋转"
                      tooltip="允许货物旋转以获得更好的装载效果"
                    >
                      <Switch
                        checkedChildren="开启"
                        unCheckedChildren="关闭"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="prioritizeWeight"
                      valuePropName="checked"
                      label="优先重量分布"
                      tooltip="优先将重货放在底部"
                    >
                      <Switch
                        checkedChildren="开启"
                        unCheckedChildren="关闭"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="considerFragile"
                      valuePropName="checked"
                      label="考虑易碎品"
                      tooltip="易碎品将被放置在顶部"
                    >
                      <Switch
                        checkedChildren="开启"
                        unCheckedChildren="关闭"
                        defaultChecked
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="balanceWeight"
                      valuePropName="checked"
                      label="平衡重量分布"
                      tooltip="尽量使重量均匀分布"
                    >
                      <Switch
                        checkedChildren="开启"
                        unCheckedChildren="关闭"
                        defaultChecked
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Panel>

              <Panel
                header={
                  <Space>
                    <ExperimentOutlined />
                    <Text strong>高级配置</Text>
                  </Space>
                }
                key="advanced"
              >
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item
                      name="stackingLimit"
                      label="最大堆叠层数"
                      tooltip="限制货物堆叠的最大层数"
                    >
                      <Slider
                        min={1}
                        max={10}
                        marks={{
                          1: '1层',
                          5: '5层',
                          10: '10层',
                        }}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="gapBetweenItems"
                      label="货物间隙 (cm)"
                      tooltip="货物之间的间隙，用于固定材料"
                    >
                      <InputNumber
                        min={0}
                        max={50}
                        style={{ width: '100%' }}
                        suffix="cm"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="maxCalculationTime"
                      label="最大计算时间 (秒)"
                      tooltip="算法运行的最长时间"
                    >
                      <InputNumber
                        min={1}
                        max={300}
                        style={{ width: '100%' }}
                        suffix="秒"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Panel>
            </Collapse>
          </Form>

          <Divider />

          <Button
            type="primary"
            size="large"
            icon={<CalculatorOutlined />}
            onClick={onCalculate}
            loading={isCalculating}
            disabled={!selectedContainer || cargoList.length === 0}
            block
          >
            {isCalculating ? '计算中...' : '开始计算'}
          </Button>

          {!selectedContainer && (
            <Alert
              message="请先选择集装箱"
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
          {selectedContainer && cargoList.length === 0 && (
            <Alert
              message="请先添加货物"
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </Col>

        {/* 右侧：容量分析 */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <InfoCircleOutlined />
                <Text strong>容量分析</Text>
              </Space>
            }
            bordered={false}
            style={{ background: '#f6ffed' }}
          >
            {analysis ? (
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                {/* 预估集装箱数量 */}
                <div style={{ textAlign: 'center' }}>
                  <Text type="secondary">预估所需集装箱</Text>
                  <div style={{ marginTop: 8 }}>
                    <Badge
                      count={analysis.estimatedContainers}
                      style={{
                        backgroundColor:
                          analysis.estimatedContainers > 1 ? '#faad14' : '#52c41a',
                        fontSize: 24,
                        padding: '0 16px',
                        height: 40,
                        lineHeight: '40px',
                      }}
                    />
                    <Text style={{ marginLeft: 8, fontSize: 16 }}>个</Text>
                  </div>
                </div>

                <Divider style={{ margin: '12px 0' }} />

                {/* 体积利用率 */}
                <div>
                  <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                    <Text>体积利用率</Text>
                    <Tag color={getCapacityColor(analysis.volumeUtilization)}>
                      {getCapacityStatus(analysis.volumeUtilization)}
                    </Tag>
                  </Space>
                  <Progress
                    percent={parseFloat(analysis.volumeUtilization.toFixed(1))}
                    status={
                      analysis.volumeUtilization > 90 ? 'exception' : 'success'
                    }
                    strokeColor={getCapacityColor(analysis.volumeUtilization)}
                    style={{ marginTop: 8 }}
                  />
                </div>

                {/* 重量利用率 */}
                <div>
                  <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                    <Text>重量利用率</Text>
                    <Tag color={getCapacityColor(analysis.weightUtilization)}>
                      {getCapacityStatus(analysis.weightUtilization)}
                    </Tag>
                  </Space>
                  <Progress
                    percent={parseFloat(analysis.weightUtilization.toFixed(1))}
                    status={
                      analysis.weightUtilization > 90 ? 'exception' : 'success'
                    }
                    strokeColor={getCapacityColor(analysis.weightUtilization)}
                    style={{ marginTop: 8 }}
                  />
                </div>

                <Divider style={{ margin: '12px 0' }} />

                {/* 剩余容量 */}
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="剩余体积"
                      value={(analysis.remainingVolume / 1000000).toFixed(2)}
                      suffix="m³"
                      valueStyle={{ fontSize: 16, color: '#52c41a' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="剩余载重"
                      value={analysis.remainingWeight.toFixed(0)}
                      suffix="kg"
                      valueStyle={{ fontSize: 16, color: '#52c41a' }}
                    />
                  </Col>
                </Row>

                {/* 限制因素 */}
                {analysis.isWeightLimited && (
                  <Alert
                    message="重量限制"
                    description="当前配置受重量限制，建议优化货物分布"
                    type="warning"
                    showIcon
                    icon={<WarningOutlined />}
                  />
                )}

                {/* 建议 */}
                {analysis.recommendations.length > 0 && (
                  <div>
                    <Text strong>
                      <InfoCircleOutlined style={{ marginRight: 8 }} />
                      优化建议
                    </Text>
                    <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                      {analysis.recommendations.map((rec, index) => (
                        <li key={index}>
                          <Text type="secondary">{rec}</Text>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Space>
            ) : (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <InfoCircleOutlined
                  style={{ fontSize: 48, color: '#d9d9d9' }}
                />
                <p style={{ color: '#8c8c8c', marginTop: 16 }}>
                  选择集装箱并添加货物后，将显示容量分析
                </p>
              </div>
            )}
          </Card>

          {/* 算法说明 */}
          <Card style={{ marginTop: 16 }} size="small">
            <Title level={5}>算法说明</Title>
            <Space direction="vertical" size="small">
              <div>
                <Tag color="blue">贪心算法</Tag>
                <Text type="secondary">速度快，适合大批量货物</Text>
              </div>
              <div>
                <Tag color="orange">遗传算法</Tag>
                <Text type="secondary">平衡效率与质量</Text>
              </div>
              <div>
                <Tag color="red">穷举算法</Tag>
                <Text type="secondary">最优解，但计算时间长</Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </Card>
  );
};

export default CalculationConfigComponent;
