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
  ExperimentOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  AimOutlined,
} from '@ant-design/icons';
import type { CargoItem } from './CargoManager';
import type { ContainerType } from './ContainerSelector';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { Option } = Select;

export interface CalculationConfig {
  algorithm: 'FFD' | 'GA' | 'SA' | 'MultiObjective';
  allowRotation: boolean;
  prioritizeWeight: boolean;
  stackingLimit: number;
  gapBetweenItems: number;
  maxCalculationTime: number;
  considerFragile: boolean;
  balanceWeight: boolean;
  gaPopulationSize: number;
  gaGenerations: number;
  gaCrossoverRate: number;
  gaMutationRate: number;
  gaElitism: number;
  saInitialTemperature: number;
  saCoolingRate: number;
  saMinTemperature: number;
  saIterationsPerTemp: number;
  moAlgorithm: 'GA' | 'SA';
  moWeightUtilization: number;
  moWeightBalance: number;
  moWeightStacking: number;
  moWeightLoading: number;
}

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

const DEFAULT_CONFIG: CalculationConfig = {
  algorithm: 'FFD',
  allowRotation: true,
  prioritizeWeight: false,
  stackingLimit: 3,
  gapBetweenItems: 0,
  maxCalculationTime: 30,
  considerFragile: true,
  balanceWeight: true,
  gaPopulationSize: 50,
  gaGenerations: 100,
  gaCrossoverRate: 0.8,
  gaMutationRate: 0.1,
  gaElitism: 5,
  saInitialTemperature: 1000,
  saCoolingRate: 0.95,
  saMinTemperature: 1,
  saIterationsPerTemp: 50,
  moAlgorithm: 'GA',
  moWeightUtilization: 0.4,
  moWeightBalance: 0.3,
  moWeightStacking: 0.2,
  moWeightLoading: 0.1,
};

const ALGORITHM_INFO: Record<CalculationConfig['algorithm'], { label: string; tag: string; tagColor: string; desc: string; icon: React.ReactNode }> = {
  FFD: {
    label: 'FFD 快速装箱',
    tag: '快速',
    tagColor: 'blue',
    desc: '经典装箱算法，计算速度快，适合快速预估',
    icon: <ThunderboltOutlined />,
  },
  GA: {
    label: 'GA 遗传算法',
    tag: '全局优化',
    tagColor: 'orange',
    desc: '基于生物进化的智能优化算法，能找到全局最优解，计算时间较长',
    icon: <ExperimentOutlined />,
  },
  SA: {
    label: 'SA 模拟退火',
    tag: '平衡',
    tagColor: 'purple',
    desc: '基于金属退火原理的优化算法，能跳出局部最优，适合中等规模问题',
    icon: <CalculatorOutlined />,
  },
  MultiObjective: {
    label: '多目标优化',
    tag: '综合',
    tagColor: 'green',
    desc: '综合考虑空间利用率、重心平衡、堆叠稳定性等多个目标',
    icon: <AimOutlined />,
  },
};

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

    const containerVolume = selectedContainer.volume * 1000000;
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

  const handleReset = () => {
    onConfigChange({ ...DEFAULT_CONFIG });
    form.setFieldsValue(DEFAULT_CONFIG);
  };

  const updateConfig = (partial: Partial<CalculationConfig>) => {
    onConfigChange({ ...config, ...partial });
  };

  const getCapacityColor = (value: number) => {
    if (value >= 90) return '#f5222d';
    if (value >= 70) return '#faad14';
    return '#52c41a';
  };

  const getCapacityStatus = (value: number) => {
    if (value >= 90) return '紧张';
    if (value >= 70) return '适中';
    return '充裕';
  };

  const renderFFDParams = () => (
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item label={
          <Space>
            <span>允许旋转</span>
            <Tooltip title="允许货物旋转以获得更好的装载效果">
              <InfoCircleOutlined style={{ color: '#999' }} />
            </Tooltip>
          </Space>
        }>
          <Switch
            checked={config.allowRotation}
            onChange={(v) => updateConfig({ allowRotation: v })}
            checkedChildren="开启"
            unCheckedChildren="关闭"
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label={
          <Space>
            <span>优先重量分布</span>
            <Tooltip title="优先将重货放在底部">
              <InfoCircleOutlined style={{ color: '#999' }} />
            </Tooltip>
          </Space>
        }>
          <Switch
            checked={config.prioritizeWeight}
            onChange={(v) => updateConfig({ prioritizeWeight: v })}
            checkedChildren="开启"
            unCheckedChildren="关闭"
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label={
          <Space>
            <span>考虑易碎品</span>
            <Tooltip title="易碎品将被放置在顶部">
              <InfoCircleOutlined style={{ color: '#999' }} />
            </Tooltip>
          </Space>
        }>
          <Switch
            checked={config.considerFragile}
            onChange={(v) => updateConfig({ considerFragile: v })}
            checkedChildren="开启"
            unCheckedChildren="关闭"
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label={
          <Space>
            <span>平衡重量分布</span>
            <Tooltip title="尽量使重量均匀分布">
              <InfoCircleOutlined style={{ color: '#999' }} />
            </Tooltip>
          </Space>
        }>
          <Switch
            checked={config.balanceWeight}
            onChange={(v) => updateConfig({ balanceWeight: v })}
            checkedChildren="开启"
            unCheckedChildren="关闭"
          />
        </Form.Item>
      </Col>
    </Row>
  );

  const renderGAParams = () => (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={
            <Space>
              <span>种群大小</span>
              <Tooltip title="遗传算法中每代的个体数量，越大搜索范围越广">
                <InfoCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
          }>
            <InputNumber
              min={10}
              max={200}
              value={config.gaPopulationSize}
              onChange={(v) => v != null && updateConfig({ gaPopulationSize: v })}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={
            <Space>
              <span>迭代代数</span>
              <Tooltip title="遗传算法运行的最大代数">
                <InfoCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
          }>
            <InputNumber
              min={10}
              max={500}
              value={config.gaGenerations}
              onChange={(v) => v != null && updateConfig({ gaGenerations: v })}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={
            <Space>
              <span>交叉概率</span>
              <Tooltip title="两个个体交换基因的概率 (0.1-1.0)">
                <InfoCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
          }>
            <Slider
              min={0.1}
              max={1.0}
              step={0.05}
              value={config.gaCrossoverRate}
              onChange={(v) => updateConfig({ gaCrossoverRate: v })}
              marks={{ 0.1: '0.1', 0.5: '0.5', 1.0: '1.0' }}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={
            <Space>
              <span>变异概率</span>
              <Tooltip title="个体基因发生变异的概率 (0.01-0.5)">
                <InfoCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
          }>
            <Slider
              min={0.01}
              max={0.5}
              step={0.01}
              value={config.gaMutationRate}
              onChange={(v) => updateConfig({ gaMutationRate: v })}
              marks={{ 0.01: '0.01', 0.25: '0.25', 0.5: '0.5' }}
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={
            <Space>
              <span>精英数量</span>
              <Tooltip title="每代直接保留到下一代的优秀个体数 (1-20)">
                <InfoCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
          }>
            <InputNumber
              min={1}
              max={20}
              value={config.gaElitism}
              onChange={(v) => v != null && updateConfig({ gaElitism: v })}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={
            <Space>
              <span>允许旋转</span>
              <Tooltip title="允许货物旋转以获得更好的装载效果">
                <InfoCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
          }>
            <Switch
              checked={config.allowRotation}
              onChange={(v) => updateConfig({ allowRotation: v })}
              checkedChildren="开启"
              unCheckedChildren="关闭"
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={
            <Space>
              <span>时间限制 (秒)</span>
              <Tooltip title="算法运行的最长时间">
                <InfoCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
          }>
            <InputNumber
              min={1}
              max={300}
              value={config.maxCalculationTime}
              onChange={(v) => v != null && updateConfig({ maxCalculationTime: v })}
              style={{ width: '100%' }}
              suffix="秒"
            />
          </Form.Item>
        </Col>
      </Row>
    </Space>
  );

  const renderSAParams = () => (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={
            <Space>
              <span>初始温度</span>
              <Tooltip title="模拟退火的起始温度，越高初期搜索越随机 (100-5000)">
                <InfoCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
          }>
            <InputNumber
              min={100}
              max={5000}
              value={config.saInitialTemperature}
              onChange={(v) => v != null && updateConfig({ saInitialTemperature: v })}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={
            <Space>
              <span>冷却速率</span>
              <Tooltip title="温度下降的速率，越接近1降温越慢 (0.8-0.99)">
                <InfoCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
          }>
            <Slider
              min={0.8}
              max={0.99}
              step={0.01}
              value={config.saCoolingRate}
              onChange={(v) => updateConfig({ saCoolingRate: v })}
              marks={{ 0.8: '0.8', 0.9: '0.9', 0.99: '0.99' }}
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={
            <Space>
              <span>最低温度</span>
              <Tooltip title="算法停止的温度阈值 (0.1-100)">
                <InfoCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
          }>
            <InputNumber
              min={0.1}
              max={100}
              step={0.1}
              value={config.saMinTemperature}
              onChange={(v) => v != null && updateConfig({ saMinTemperature: v })}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={
            <Space>
              <span>每温迭代次数</span>
              <Tooltip title="每个温度下的迭代次数 (10-200)">
                <InfoCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
          }>
            <InputNumber
              min={10}
              max={200}
              value={config.saIterationsPerTemp}
              onChange={(v) => v != null && updateConfig({ saIterationsPerTemp: v })}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={
            <Space>
              <span>允许旋转</span>
              <Tooltip title="允许货物旋转以获得更好的装载效果">
                <InfoCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
          }>
            <Switch
              checked={config.allowRotation}
              onChange={(v) => updateConfig({ allowRotation: v })}
              checkedChildren="开启"
              unCheckedChildren="关闭"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={
            <Space>
              <span>时间限制 (秒)</span>
              <Tooltip title="算法运行的最长时间">
                <InfoCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
          }>
            <InputNumber
              min={1}
              max={300}
              value={config.maxCalculationTime}
              onChange={(v) => v != null && updateConfig({ maxCalculationTime: v })}
              style={{ width: '100%' }}
              suffix="秒"
            />
          </Form.Item>
        </Col>
      </Row>
    </Space>
  );

  const renderMultiObjectiveParams = () => (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Form.Item label={
        <Space>
          <span>基础算法</span>
          <Tooltip title="多目标优化所基于的搜索算法">
            <InfoCircleOutlined style={{ color: '#999' }} />
          </Tooltip>
        </Space>
      }>
        <Radio.Group
          value={config.moAlgorithm}
          onChange={(e) => updateConfig({ moAlgorithm: e.target.value })}
          optionType="button"
          buttonStyle="solid"
        >
          <Radio.Button value="GA">
            <Space>
              <ExperimentOutlined />
              遗传算法
            </Space>
          </Radio.Button>
          <Radio.Button value="SA">
            <Space>
              <CalculatorOutlined />
              模拟退火
            </Space>
          </Radio.Button>
        </Radio.Group>
      </Form.Item>

      <Divider orientation="left" style={{ margin: '8px 0', fontSize: 13 }}>
        目标权重配置
      </Divider>

      <Form.Item label={
        <Space>
          <span>空间利用率权重</span>
          <Tooltip title="优化集装箱空间利用率的权重 (0-1)">
            <InfoCircleOutlined style={{ color: '#999' }} />
          </Tooltip>
        </Space>
      }>
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={config.moWeightUtilization}
          onChange={(v) => updateConfig({ moWeightUtilization: v })}
          marks={{ 0: '0', 0.5: '0.5', 1: '1.0' }}
        />
      </Form.Item>

      <Form.Item label={
        <Space>
          <span>重心平衡权重</span>
          <Tooltip title="优化货物重心平衡的权重 (0-1)">
            <InfoCircleOutlined style={{ color: '#999' }} />
          </Tooltip>
        </Space>
      }>
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={config.moWeightBalance}
          onChange={(v) => updateConfig({ moWeightBalance: v })}
          marks={{ 0: '0', 0.5: '0.5', 1: '1.0' }}
        />
      </Form.Item>

      <Form.Item label={
        <Space>
          <span>堆叠稳定性权重</span>
          <Tooltip title="优化货物堆叠稳定性的权重 (0-1)">
            <InfoCircleOutlined style={{ color: '#999' }} />
          </Tooltip>
        </Space>
      }>
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={config.moWeightStacking}
          onChange={(v) => updateConfig({ moWeightStacking: v })}
          marks={{ 0: '0', 0.5: '0.5', 1: '1.0' }}
        />
      </Form.Item>

      <Form.Item label={
        <Space>
          <span>装卸效率权重</span>
          <Tooltip title="优化装卸效率的权重 (0-1)">
            <InfoCircleOutlined style={{ color: '#999' }} />
          </Tooltip>
        </Space>
      }>
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={config.moWeightLoading}
          onChange={(v) => updateConfig({ moWeightLoading: v })}
          marks={{ 0: '0', 0.5: '0.5', 1: '1.0' }}
        />
      </Form.Item>

      {(() => {
        const total = config.moWeightUtilization + config.moWeightBalance + config.moWeightStacking + config.moWeightLoading;
        return (
          <Alert
            message={`权重总和: ${total.toFixed(2)}`}
            description={Math.abs(total - 1) < 0.01 ? '权重已归一化' : '建议将权重总和调整为 1.0 以获得均衡的优化效果'}
            type={Math.abs(total - 1) < 0.01 ? 'success' : 'warning'}
            showIcon
          />
        );
      })()}
    </Space>
  );

  const renderAlgorithmParams = () => {
    switch (config.algorithm) {
      case 'FFD':
        return renderFFDParams();
      case 'GA':
        return renderGAParams();
      case 'SA':
        return renderSAParams();
      case 'MultiObjective':
        return renderMultiObjectiveParams();
      default:
        return null;
    }
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
        <Col xs={24} lg={14}>
          <Form layout="vertical">
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text strong style={{ marginBottom: 8, display: 'block' }}>
                  选择算法
                </Text>
                <Radio.Group
                  value={config.algorithm}
                  onChange={(e) => updateConfig({ algorithm: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {(Object.keys(ALGORITHM_INFO) as Array<keyof typeof ALGORITHM_INFO>).map((key) => {
                      const info = ALGORITHM_INFO[key];
                      return (
                        <Radio key={key} value={key} style={{ width: '100%' }}>
                          <Card
                            size="small"
                            style={{
                              border: config.algorithm === key ? `1px solid ${info.tagColor === 'blue' ? '#1890ff' : info.tagColor === 'orange' ? '#fa8c16' : info.tagColor === 'purple' ? '#722ed1' : '#52c41a'}` : '1px solid #d9d9d9',
                              background: config.algorithm === key ? (info.tagColor === 'blue' ? '#e6f7ff' : info.tagColor === 'orange' ? '#fff7e6' : info.tagColor === 'purple' ? '#f9f0ff' : '#f6ffed') : '#fff',
                            }}
                            bodyStyle={{ padding: '8px 12px' }}
                          >
                            <Space>
                              {info.icon}
                              <Text strong>{info.label}</Text>
                              <Tag color={info.tagColor}>{info.tag}</Tag>
                            </Space>
                            <div style={{ marginTop: 4 }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>{info.desc}</Text>
                            </div>
                          </Card>
                        </Radio>
                      );
                    })}
                  </Space>
                </Radio.Group>
              </div>

              <Collapse
                defaultActiveKey={['params']}
                ghost
                style={{ marginTop: 8 }}
              >
                <Panel
                  header={
                    <Space>
                      {ALGORITHM_INFO[config.algorithm].icon}
                      <Text strong>{ALGORITHM_INFO[config.algorithm].label} 参数配置</Text>
                    </Space>
                  }
                  key="params"
                >
                  {renderAlgorithmParams()}
                </Panel>

                <Panel
                  header={
                    <Space>
                      <SettingOutlined />
                      <Text strong>通用配置</Text>
                    </Space>
                  }
                  key="common"
                >
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item label={
                        <Space>
                          <span>最大堆叠层数</span>
                          <Tooltip title="限制货物堆叠的最大层数">
                            <InfoCircleOutlined style={{ color: '#999' }} />
                          </Tooltip>
                        </Space>
                      }>
                        <Slider
                          min={1}
                          max={10}
                          value={config.stackingLimit}
                          onChange={(v) => updateConfig({ stackingLimit: v })}
                          marks={{ 1: '1层', 5: '5层', 10: '10层' }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label={
                        <Space>
                          <span>货物间隙 (cm)</span>
                          <Tooltip title="货物之间的间隙，用于固定材料">
                            <InfoCircleOutlined style={{ color: '#999' }} />
                          </Tooltip>
                        </Space>
                      }>
                        <InputNumber
                          min={0}
                          max={50}
                          value={config.gapBetweenItems}
                          onChange={(v) => v != null && updateConfig({ gapBetweenItems: v })}
                          style={{ width: '100%' }}
                          suffix="cm"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label={
                        <Space>
                          <span>最大计算时间 (秒)</span>
                          <Tooltip title="算法运行的最长时间">
                            <InfoCircleOutlined style={{ color: '#999' }} />
                          </Tooltip>
                        </Space>
                      }>
                        <InputNumber
                          min={1}
                          max={300}
                          value={config.maxCalculationTime}
                          onChange={(v) => v != null && updateConfig({ maxCalculationTime: v })}
                          style={{ width: '100%' }}
                          suffix="秒"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </Panel>
              </Collapse>
            </Space>
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

                {analysis.isWeightLimited && (
                  <Alert
                    message="重量限制"
                    description="当前配置受重量限制，建议优化货物分布"
                    type="warning"
                    showIcon
                    icon={<WarningOutlined />}
                  />
                )}

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

          <Card style={{ marginTop: 16 }} size="small">
            <Title level={5}>算法说明</Title>
            <Space direction="vertical" size="small">
              <div>
                <Tag color="blue">FFD 快速装箱</Tag>
                <Text type="secondary">经典装箱算法，计算速度快，适合快速预估</Text>
              </div>
              <div>
                <Tag color="orange">GA 遗传算法</Tag>
                <Text type="secondary">基于生物进化的智能优化算法，能找到全局最优解，计算时间较长</Text>
              </div>
              <div>
                <Tag color="purple">SA 模拟退火</Tag>
                <Text type="secondary">基于金属退火原理的优化算法，能跳出局部最优，适合中等规模问题</Text>
              </div>
              <div>
                <Tag color="green">多目标优化</Tag>
                <Text type="secondary">综合考虑空间利用率、重心平衡、堆叠稳定性等多个目标</Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </Card>
  );
};

export default CalculationConfigComponent;
