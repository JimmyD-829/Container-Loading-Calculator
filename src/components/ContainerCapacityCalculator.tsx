import { useState } from 'react';
import {
  Card,
  Form,
  InputNumber,
  Select,
  Button,
  Table,
  Row,
  Col,
  Statistic,
  Tag,
  Space,
  Divider,
  Typography,
  Alert,
  Radio,
  Tooltip,
  Descriptions,
} from 'antd';
import {
  CalculatorOutlined,
  ContainerOutlined,
  ThunderboltOutlined,
  CheckCircleFilled,
  InfoCircleOutlined,
  SwapOutlined,
  ColumnHeightOutlined,
  AppstoreOutlined,
  TrophyOutlined,
  BoxPlotOutlined,
} from '@ant-design/icons';
import { STANDARD_CONTAINERS } from '../data/containers';
import { calculateContainerCapacity } from '../algorithms/containerCapacity';
import type { ContainerSpec, ContainerCapacityResult, ContainerCapacityInput } from '../types';

const { Title, Text } = Typography;

interface PresetItem {
  label: string;
  length: number;
  width: number;
  height: number;
  perPallet: number;
}

const PRESETS: PresetItem[] = [
  { label: '1240×910×1293 (12pcs/pallet)', length: 1240, width: 910, height: 1293, perPallet: 12 },
  { label: '1240×910×902 (8pcs/pallet)', length: 1240, width: 910, height: 902, perPallet: 8 },
  { label: '600×400×400', length: 600, width: 400, height: 400, perPallet: 1 },
  { label: '1200×1000×1500', length: 1200, width: 1000, height: 1500, perPallet: 1 },
];

const containerOptions = STANDARD_CONTAINERS.map((c) => ({
  value: c.id,
  label: `${c.id} - ${c.name} (${c.innerDimensions.length}×${c.innerDimensions.width}×${c.innerDimensions.height}mm)`,
}));

function ContainerCapacityCalculator() {
  const [form] = Form.useForm();
  const [containerMode, setContainerMode] = useState<'standard' | 'custom'>('standard');
  const [result, setResult] = useState<ContainerCapacityResult | null>(null);
  const [selectedContainerSpec, setSelectedContainerSpec] = useState<ContainerSpec | null>(null);

  const handleContainerChange = (value: string) => {
    const spec = STANDARD_CONTAINERS.find((c) => c.id === value);
    setSelectedContainerSpec(spec || null);
  };

  const handlePresetClick = (preset: PresetItem) => {
    form.setFieldsValue({
      cargoLength: preset.length,
      cargoWidth: preset.width,
      cargoHeight: preset.height,
      perPallet: preset.perPallet,
    });
  };

  const handleCalculate = () => {
    form.validateFields().then((values) => {
      let containerSpec: ContainerSpec;

      if (containerMode === 'standard') {
        if (!selectedContainerSpec) {
          return;
        }
        containerSpec = selectedContainerSpec;
      } else {
        containerSpec = {
          id: 'CUSTOM' as ContainerSpec['id'],
          name: '自定义集装箱',
          description: '用户自定义尺寸集装箱',
          innerDimensions: {
            length: values.customLength,
            width: values.customWidth,
            height: values.customHeight,
          },
          maxPayload: values.customMaxPayload || 28000,
          tareWeight: values.customTareWeight || 3000,
          maxWeight: (values.customMaxPayload || 28000) + (values.customTareWeight || 3000),
          volume:
            (values.customLength * values.customWidth * values.customHeight) / 1_000_000_000,
          isStandard: false,
        };
      }

      const input: ContainerCapacityInput = {
        containerSpec,
        cargoDimensions: {
          length: values.cargoLength,
          width: values.cargoWidth,
          height: values.cargoHeight,
        },
        allowRotation: values.allowRotation ?? true,
        considerWeight: values.considerWeight ?? true,
        cargoWeight: values.cargoWeight || 0,
        maxStackLayers: values.maxStackLayers ?? 99,
      };

      const calcResult = calculateContainerCapacity(input);
      setResult(calcResult);
    });
  };

  const bestOptionIndex = result
    ? result.layoutOptions.reduce(
        (bestIdx, opt, idx, arr) =>
          opt.total > arr[bestIdx].total ? idx : bestIdx,
        0,
      )
    : -1;

  const columns = [
    {
      title: '摆放方向',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, _: unknown, index: number) => (
        <Space>
          {index === bestOptionIndex && <TrophyOutlined style={{ color: '#faad14' }} />}
          <Text strong={index === bestOptionIndex}>{text}</Text>
        </Space>
      ),
    },
    {
      title: '长方向数量',
      dataIndex: 'lengthCount',
      key: 'lengthCount',
      align: 'center' as const,
    },
    {
      title: '宽方向数量',
      dataIndex: 'widthCount',
      key: 'widthCount',
      align: 'center' as const,
    },
    {
      title: '高度方向层数',
      dataIndex: 'layers',
      key: 'layers',
      align: 'center' as const,
    },
    {
      title: '每层数量',
      dataIndex: 'totalPerLayer',
      key: 'totalPerLayer',
      align: 'center' as const,
    },
    {
      title: '总数量',
      dataIndex: 'total',
      key: 'total',
      align: 'center' as const,
      render: (val: number, _: unknown, index: number) => (
        <Text strong style={{ fontSize: index === bestOptionIndex ? 16 : 14, color: index === bestOptionIndex ? '#1890ff' : undefined }}>
          {val}
        </Text>
      ),
    },
    {
      title: '利用率',
      dataIndex: 'utilization',
      key: 'utilization',
      align: 'center' as const,
      render: (val: number) => (
        <Tag color={val >= 80 ? 'green' : val >= 60 ? 'blue' : val >= 40 ? 'orange' : 'red'}>
          {val.toFixed(1)}%
        </Tag>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 0 24px' }}>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <ContainerOutlined />
                <Title level={4} style={{ margin: 0 }}>
                  集装箱容量测算
                </Title>
              </Space>
            }
          >
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                allowRotation: true,
                considerWeight: true,
                maxStackLayers: 99,
                perPallet: 1,
                cargoWeight: 0,
              }}
            >
              <Divider orientation="left" style={{ fontSize: 14, margin: '0 0 16px' }}>
                集装箱选择
              </Divider>

              <Form.Item label="选择方式">
                <Radio.Group
                  value={containerMode}
                  onChange={(e) => setContainerMode(e.target.value)}
                  buttonStyle="solid"
                  size="small"
                >
                  <Radio.Button value="standard">标准集装箱</Radio.Button>
                  <Radio.Button value="custom">自定义尺寸</Radio.Button>
                </Radio.Group>
              </Form.Item>

              {containerMode === 'standard' ? (
                <Form.Item
                  name="containerType"
                  label="集装箱类型"
                  rules={[{ required: true, message: '请选择集装箱类型' }]}
                >
                  <Select
                    placeholder="请选择集装箱类型"
                    onChange={handleContainerChange}
                    options={containerOptions}
                    showSearch
                    optionFilterProp="label"
                  />
                </Form.Item>
              ) : (
                <>
                  <Row gutter={12}>
                    <Col span={8}>
                      <Form.Item
                        name="customLength"
                        label="长 (mm)"
                        rules={[{ required: containerMode === 'custom', message: '请输入长度' }]}
                      >
                        <InputNumber min={1} style={{ width: '100%' }} placeholder="长" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        name="customWidth"
                        label="宽 (mm)"
                        rules={[{ required: containerMode === 'custom', message: '请输入宽度' }]}
                      >
                        <InputNumber min={1} style={{ width: '100%' }} placeholder="宽" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        name="customHeight"
                        label="高 (mm)"
                        rules={[{ required: containerMode === 'custom', message: '请输入高度' }]}
                      >
                        <InputNumber min={1} style={{ width: '100%' }} placeholder="高" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item name="customMaxPayload" label="最大载重 (kg)">
                        <InputNumber min={1} style={{ width: '100%' }} placeholder="默认28000" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="customTareWeight" label="自重 (kg)">
                        <InputNumber min={0} style={{ width: '100%' }} placeholder="默认3000" />
                      </Form.Item>
                    </Col>
                  </Row>
                </>
              )}

              {selectedContainerSpec && containerMode === 'standard' && (
                <Alert
                  type="info"
                  showIcon
                  icon={<ContainerOutlined />}
                  style={{ marginBottom: 16 }}
                  message={
                    <Descriptions size="small" column={2} colon={false}>
                      <Descriptions.Item label="内部尺寸">
                        {selectedContainerSpec.innerDimensions.length}×
                        {selectedContainerSpec.innerDimensions.width}×
                        {selectedContainerSpec.innerDimensions.height} mm
                      </Descriptions.Item>
                      <Descriptions.Item label="容积">
                        {selectedContainerSpec.volume.toFixed(2)} m³
                      </Descriptions.Item>
                      <Descriptions.Item label="最大载重">
                        {selectedContainerSpec.maxPayload.toLocaleString()} kg
                      </Descriptions.Item>
                      <Descriptions.Item label="自重">
                        {selectedContainerSpec.tareWeight.toLocaleString()} kg
                      </Descriptions.Item>
                    </Descriptions>
                  }
                />
              )}

              <Divider orientation="left" style={{ fontSize: 14, margin: '8px 0 16px' }}>
                货物尺寸
              </Divider>

              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item
                    name="cargoLength"
                    label="长 (mm)"
                    rules={[{ required: true, message: '请输入长度' }]}
                  >
                    <InputNumber min={1} style={{ width: '100%' }} placeholder="长" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="cargoWidth"
                    label="宽 (mm)"
                    rules={[{ required: true, message: '请输入宽度' }]}
                  >
                    <InputNumber min={1} style={{ width: '100%' }} placeholder="宽" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="cargoHeight"
                    label="高 (mm)"
                    rules={[{ required: true, message: '请输入高度' }]}
                  >
                    <InputNumber min={1} style={{ width: '100%' }} placeholder="高" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="perPallet"
                    label="每托数量"
                    tooltip="每托/每件包含的产品数量，用于计算总件数"
                  >
                    <InputNumber
                      min={1}
                      style={{ width: '100%' }}
                      placeholder="如 12 或 8"
                      addonAfter="pcs/托"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="cargoWeight"
                    label="货物重量 (kg)"
                    tooltip="单个货物（托/箱）的重量"
                  >
                    <InputNumber
                      min={0}
                      style={{ width: '100%' }}
                      placeholder="重量"
                      addonAfter="kg"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left" style={{ fontSize: 14, margin: '8px 0 16px' }}>
                计算选项
              </Divider>

              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item
                    name="allowRotation"
                    valuePropName="checked"
                    label={
                      <Space size={4}>
                        <SwapOutlined />
                        <span>允许旋转</span>
                        <Tooltip title="允许货物旋转以获得更好的装载效果">
                          <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                        </Tooltip>
                      </Space>
                    }
                  >
                    <Radio.Group size="small">
                      <Radio.Button value={true}>是</Radio.Button>
                      <Radio.Button value={false}>否</Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="considerWeight"
                    valuePropName="checked"
                    label={
                      <Space size={4}>
                        <ThunderboltOutlined />
                        <span>重量限制</span>
                        <Tooltip title="考虑集装箱最大载重限制">
                          <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                        </Tooltip>
                      </Space>
                    }
                  >
                    <Radio.Group size="small">
                      <Radio.Button value={true}>是</Radio.Button>
                      <Radio.Button value={false}>否</Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="maxStackLayers"
                    label={
                      <Space size={4}>
                        <ColumnHeightOutlined />
                        <span>堆叠层数</span>
                        <Tooltip title="货物最大堆叠层数限制">
                          <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                        </Tooltip>
                      </Space>
                    }
                  >
                    <InputNumber min={1} max={999} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left" style={{ fontSize: 14, margin: '8px 0 16px' }}>
                <Space>
                  <AppstoreOutlined />
                  <span>快捷预设</span>
                </Space>
              </Divider>

              <Space wrap style={{ marginBottom: 16 }}>
                {PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    size="small"
                    onClick={() => handlePresetClick(preset)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </Space>

              <Button
                type="primary"
                size="large"
                icon={<CalculatorOutlined />}
                onClick={handleCalculate}
                block
              >
                计算容量
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          {result ? (
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              <Card>
                <Row gutter={[16, 16]}>
                  <Col xs={12} sm={6}>
                    <Statistic
                      title={
                        <Space size={4}>
                          <BoxPlotOutlined />
                          <span>总数量</span>
                        </Space>
                      }
                      value={result.totalQuantity}
                      suffix="托/箱"
                      valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
                    />
                  </Col>
                  <Col xs={12} sm={6}>
                    <Statistic
                      title="总件数"
                      value={result.totalQuantity * (form.getFieldValue('perPallet') || 1)}
                      suffix="pcs"
                      valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
                    />
                  </Col>
                  <Col xs={12} sm={6}>
                    <Statistic
                      title="体积利用率"
                      value={result.volumeUtilization}
                      precision={1}
                      suffix="%"
                      valueStyle={{
                        color: result.volumeUtilization >= 80 ? '#52c41a' : result.volumeUtilization >= 60 ? '#faad14' : '#f5222d',
                      }}
                    />
                  </Col>
                  <Col xs={12} sm={6}>
                    <Statistic
                      title="重量利用率"
                      value={result.weightUtilization}
                      precision={1}
                      suffix="%"
                      valueStyle={{
                        color: result.weightUtilization >= 90 ? '#f5222d' : result.weightUtilization >= 70 ? '#faad14' : '#52c41a',
                      }}
                    />
                  </Col>
                </Row>
              </Card>

              {result.remainingSpace && (
                <Alert
                  type="info"
                  showIcon
                  icon={<InfoCircleOutlined />}
                  message="剩余空间"
                  description={
                    <Text>
                      长: {result.remainingSpace.length}mm × 宽: {result.remainingSpace.width}mm × 高: {result.remainingSpace.height}mm
                    </Text>
                  }
                />
              )}

              <Card
                title={
                  <Space>
                    <TrophyOutlined style={{ color: '#faad14' }} />
                    <Title level={5} style={{ margin: 0 }}>
                      摆放方案对比
                    </Title>
                    <Tag color="gold">最优方案已高亮</Tag>
                  </Space>
                }
              >
                <Table
                  dataSource={result.layoutOptions.map((opt, idx) => ({
                    ...opt,
                    key: idx,
                  }))}
                  columns={columns}
                  pagination={false}
                  size="middle"
                  rowClassName={(record, index) =>
                    index === bestOptionIndex ? 'best-option-row' : ''
                  }
                  style={{
                    border: '1px solid #f0f0f0',
                    borderRadius: 6,
                  }}
                />
              </Card>

              {bestOptionIndex >= 0 && (
                <Card
                  size="small"
                  style={{
                    background: 'linear-gradient(135deg, #e6f7ff 0%, #f6ffed 100%)',
                    border: '1px solid #91d5ff',
                  }}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Space>
                      <CheckCircleFilled style={{ color: '#52c41a', fontSize: 18 }} />
                      <Text strong style={{ fontSize: 15 }}>
                        推荐方案: {result.layoutOptions[bestOptionIndex].name}
                      </Text>
                    </Space>
                    <Descriptions size="small" column={4} bordered>
                      <Descriptions.Item label="长方向">
                        {result.layoutOptions[bestOptionIndex].lengthCount} 个
                      </Descriptions.Item>
                      <Descriptions.Item label="宽方向">
                        {result.layoutOptions[bestOptionIndex].widthCount} 个
                      </Descriptions.Item>
                      <Descriptions.Item label="层数">
                        {result.layoutOptions[bestOptionIndex].layers} 层
                      </Descriptions.Item>
                      <Descriptions.Item label="每层">
                        {result.layoutOptions[bestOptionIndex].totalPerLayer} 个
                      </Descriptions.Item>
                    </Descriptions>
                    <Row gutter={16}>
                      <Col>
                        <Text>
                          总装载量: <Text strong style={{ color: '#1890ff', fontSize: 16 }}>{result.layoutOptions[bestOptionIndex].total}</Text> 托/箱
                        </Text>
                      </Col>
                      <Col>
                        <Text>
                          总件数: <Text strong style={{ color: '#52c41a', fontSize: 16 }}>
                            {result.layoutOptions[bestOptionIndex].total * (form.getFieldValue('perPallet') || 1)}
                          </Text> pcs
                        </Text>
                      </Col>
                      <Col>
                        <Text>
                          利用率: <Text strong style={{ color: '#faad14', fontSize: 16 }}>
                            {result.layoutOptions[bestOptionIndex].utilization.toFixed(1)}%
                          </Text>
                        </Text>
                      </Col>
                    </Row>
                  </Space>
                </Card>
              )}
            </Space>
          ) : (
            <Card style={{ textAlign: 'center', padding: '80px 24px' }}>
              <CalculatorOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />
              <Title level={4} type="secondary" style={{ marginTop: 24 }}>
                集装箱容量测算工具
              </Title>
              <Text type="secondary" style={{ fontSize: 14, display: 'block', maxWidth: 400, margin: '0 auto' }}>
                选择集装箱类型并输入货物尺寸，快速计算单个集装箱的最大装载量，对比不同摆放方案的效率
              </Text>
              <Divider style={{ maxWidth: 300, margin: '24px auto' }} />
              <Space direction="vertical" size={4}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  <CheckCircleFilled style={{ color: '#52c41a', marginRight: 6 }} />
                  支持标准集装箱 (20GP / 40GP / 40HQ / 45HQ)
                </Text>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  <SwapOutlined style={{ color: '#1890ff', marginRight: 6 }} />
                  支持货物旋转摆放优化
                </Text>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  <TrophyOutlined style={{ color: '#faad14', marginRight: 6 }} />
                  自动推荐最优摆放方案
                </Text>
              </Space>
            </Card>
          )}
        </Col>
      </Row>

      <style>{`
        .best-option-row td {
          background: #fffbe6 !important;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}

export default ContainerCapacityCalculator;
