import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Space,
  Typography,
  Tag,
  Badge,
  Tooltip,
  Radio,
  Divider,
  Statistic,
} from 'antd';
import {
  ContainerOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleFilled,
  InfoCircleOutlined,
  BoxPlotOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

// 集装箱类型定义
export interface ContainerType {
  id: string;
  name: string;
  code: string;
  length: number;
  width: number;
  height: number;
  maxWeight: number;
  tareWeight: number;
  volume: number;
  description?: string;
  isStandard?: boolean;
}

// 预设集装箱类型
export const DEFAULT_CONTAINERS: ContainerType[] = [
  {
    id: '20gp',
    name: '20尺标准柜',
    code: '20\'GP',
    length: 589,
    width: 235,
    height: 239,
    maxWeight: 21700,
    tareWeight: 2200,
    volume: 33.2,
    description: '最常用的标准集装箱，适合一般货物',
    isStandard: true,
  },
  {
    id: '40gp',
    name: '40尺标准柜',
    code: '40\'GP',
    length: 1203,
    width: 235,
    height: 239,
    maxWeight: 26500,
    tareWeight: 3700,
    volume: 67.7,
    description: '大容量标准集装箱，适合轻泡货',
    isStandard: true,
  },
  {
    id: '40hq',
    name: '40尺高柜',
    code: '40\'HQ',
    length: 1203,
    width: 235,
    height: 269,
    maxWeight: 26500,
    tareWeight: 3900,
    volume: 76.3,
    description: '高柜集装箱，适合高件货物',
    isStandard: true,
  },
  {
    id: '45hq',
    name: '45尺高柜',
    code: '45\'HQ',
    length: 1358,
    width: 235,
    height: 269,
    maxWeight: 27500,
    tareWeight: 4800,
    volume: 86.0,
    description: '超大容量高柜，适合大批量货物',
    isStandard: true,
  },
];

interface ContainerSelectorProps {
  selectedContainer: ContainerType | null;
  onContainerSelect: (container: ContainerType) => void;
  customContainers?: ContainerType[];
  onCustomContainersChange?: (containers: ContainerType[]) => void;
}

const ContainerSelector: React.FC<ContainerSelectorProps> = ({
  selectedContainer,
  onContainerSelect,
  customContainers = [],
  onCustomContainersChange,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingContainer, setEditingContainer] = useState<ContainerType | null>(null);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState<'standard' | 'custom'>('standard');

  // 打开添加/编辑弹窗
  const showModal = (container?: ContainerType) => {
    if (container) {
      setEditingContainer(container);
      form.setFieldsValue(container);
    } else {
      setEditingContainer(null);
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  // 关闭弹窗
  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingContainer(null);
    form.resetFields();
  };

  // 保存自定义集装箱
  const handleSave = () => {
    form.validateFields().then((values) => {
      const volume = (values.length * values.width * values.height) / 1000000;
      const newContainer: ContainerType = {
        ...values,
        id: editingContainer ? editingContainer.id : `custom-${Date.now()}`,
        volume: parseFloat(volume.toFixed(2)),
        isStandard: false,
      };

      if (editingContainer) {
        onCustomContainersChange?.(
          customContainers.map((item) =>
            item.id === editingContainer.id ? newContainer : item
          )
        );
      } else {
        onCustomContainersChange?.([...customContainers, newContainer]);
      }
      handleCancel();
    });
  };

  // 删除自定义集装箱
  const handleDelete = (id: string) => {
    onCustomContainersChange?.(customContainers.filter((item) => item.id !== id));
  };

  // 渲染集装箱卡片
  const renderContainerCard = (container: ContainerType, isCustom = false) => {
    const isSelected = selectedContainer?.id === container.id;
    const utilization = selectedContainer ? 85 : 0; // 示例利用率

    return (
      <Col xs={24} sm={12} lg={8} key={container.id}>
        <Card
          hoverable
          className={isSelected ? 'container-card-selected' : ''}
          style={{
            border: isSelected ? '2px solid #1890ff' : '1px solid #f0f0f0',
            background: isSelected ? '#e6f7ff' : '#fff',
            height: '100%',
          }}
          onClick={() => onContainerSelect(container)}
          title={
            <Space>
              <ContainerOutlined
                style={{ color: isSelected ? '#1890ff' : '#8c8c8c' }}
              />
              <Text strong>{container.name}</Text>
              {container.isStandard && (
                <Tag color="blue">
                  标准
                </Tag>
              )}
              {isCustom && (
                <Tag color="orange">
                  自定义
                </Tag>
              )}
            </Space>
          }
          extra={
            isSelected && (
              <Badge
                count={<CheckCircleFilled style={{ color: '#52c41a' }} />}
                offset={[0, 0]}
              />
            )
          }
          actions={
            isCustom
              ? [
                  <Tooltip title="编辑">
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        showModal(container);
                      }}
                    />
                  </Tooltip>,
                  <Tooltip title="删除">
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(container.id);
                      }}
                    />
                  </Tooltip>,
                ]
              : undefined
          }
        >
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: 'bold',
                  color: isSelected ? '#1890ff' : '#262626',
                }}
              >
                {container.code}
              </Text>
            </div>

            <Row gutter={[8, 8]}>
              <Col span={12}>
                <Statistic
                  title="内部尺寸"
                  value={`${container.length}×${container.width}×${container.height}`}
                  suffix="cm"
                  valueStyle={{ fontSize: 14 }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="容积"
                  value={container.volume}
                  suffix="m³"
                  valueStyle={{ fontSize: 14, color: '#52c41a' }}
                />
              </Col>
            </Row>

            <Row gutter={[8, 8]}>
              <Col span={12}>
                <Statistic
                  title="最大载重"
                  value={container.maxWeight}
                  suffix="kg"
                  valueStyle={{ fontSize: 14 }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="自重"
                  value={container.tareWeight}
                  suffix="kg"
                  valueStyle={{ fontSize: 14 }}
                />
              </Col>
            </Row>

            {container.description && (
              <Paragraph
                type="secondary"
                style={{ marginTop: 8, fontSize: 12 }}
              >
                <InfoCircleOutlined style={{ marginRight: 4 }} />
                {container.description}
              </Paragraph>
            )}

            {isSelected && (
              <div
                style={{
                  marginTop: 12,
                  padding: '8px 12px',
                  background: '#f6ffed',
                  borderRadius: 4,
                  border: '1px solid #b7eb8f',
                }}
              >
                <Space>
                  <CheckCircleFilled style={{ color: '#52c41a' }} />
                  <Text type="success">已选择此集装箱</Text>
                </Space>
              </div>
            )}
          </Space>
        </Card>
      </Col>
    );
  };

  return (
    <Card
      title={
        <Space>
          <BoxPlotOutlined />
          <Title level={4} style={{ margin: 0 }}>
            集装箱选择
          </Title>
          {selectedContainer && (
            <Tag color="green">已选择: {selectedContainer.name}</Tag>
          )}
        </Space>
      }
    >
      <Radio.Group
        value={activeTab}
        onChange={(e) => setActiveTab(e.target.value)}
        style={{ marginBottom: 16 }}
        buttonStyle="solid"
      >
        <Radio.Button value="standard">标准集装箱</Radio.Button>
        <Radio.Button value="custom">
          自定义集装箱 ({customContainers.length})
        </Radio.Button>
      </Radio.Group>

      {activeTab === 'custom' && (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => showModal()}
          style={{ marginBottom: 16, marginLeft: 16 }}
        >
          添加自定义集装箱
        </Button>
      )}

      <Divider style={{ margin: '12px 0' }} />

      <Row gutter={[16, 16]}>
        {activeTab === 'standard'
          ? DEFAULT_CONTAINERS.map((container) =>
              renderContainerCard(container, false)
            )
          : customContainers.map((container) =>
              renderContainerCard(container, true)
            )}
      </Row>

      {activeTab === 'custom' && customContainers.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <ContainerOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />
          <p style={{ color: '#8c8c8c', marginTop: 16 }}>
            暂无自定义集装箱，点击上方按钮添加
          </p>
        </div>
      )}

      {/* 添加/编辑自定义集装箱弹窗 */}
      <Modal
        title={editingContainer ? '编辑自定义集装箱' : '添加自定义集装箱'}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={handleCancel}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="集装箱名称"
                rules={[{ required: true, message: '请输入集装箱名称' }]}
              >
                <Input placeholder="例如：特制集装箱" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="code"
                label="代码"
                rules={[{ required: true, message: '请输入代码' }]}
              >
                <Input placeholder="例如：CUSTOM" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="length"
                label="长度 (cm)"
                rules={[{ required: true, message: '请输入长度' }]}
              >
                <InputNumber
                  min={100}
                  max={2000}
                  style={{ width: '100%' }}
                  placeholder="长度"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="width"
                label="宽度 (cm)"
                rules={[{ required: true, message: '请输入宽度' }]}
              >
                <InputNumber
                  min={100}
                  max={500}
                  style={{ width: '100%' }}
                  placeholder="宽度"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="height"
                label="高度 (cm)"
                rules={[{ required: true, message: '请输入高度' }]}
              >
                <InputNumber
                  min={100}
                  max={500}
                  style={{ width: '100%' }}
                  placeholder="高度"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="maxWeight"
                label="最大载重 (kg)"
                rules={[{ required: true, message: '请输入最大载重' }]}
              >
                <InputNumber
                  min={1000}
                  max={50000}
                  style={{ width: '100%' }}
                  placeholder="最大载重"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="tareWeight"
                label="自重 (kg)"
                rules={[{ required: true, message: '请输入自重' }]}
              >
                <InputNumber
                  min={100}
                  max={10000}
                  style={{ width: '100%' }}
                  placeholder="自重"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="描述">
            <Input.TextArea
              rows={3}
              placeholder="请输入集装箱描述（可选）"
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ContainerSelector;
