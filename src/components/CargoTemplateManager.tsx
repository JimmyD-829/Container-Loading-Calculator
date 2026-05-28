import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Tag,
  Popconfirm,
  Empty,
  Typography,
  Row,
  Col,
  Tooltip,
  ColorPicker,
  message,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CopyOutlined,
  SaveOutlined,
  AppstoreOutlined,
  SearchOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface CargoTemplateItem {
  id: string;
  name: string;
  category: string;
  dimensions: { length: number; width: number; height: number };
  weight: number;
  type: string;
  stackable: boolean;
  fragile: boolean;
  color: string;
  usageCount: number;
  createdAt: Date;
}

interface CargoTemplateManagerProps {
  onApplyTemplate?: (template: CargoTemplateItem) => void;
  visible?: boolean;
}

const STORAGE_KEY = 'cargo-templates';

const CATEGORIES = [
  { label: '全部', value: 'all' },
  { label: '纸箱', value: '纸箱' },
  { label: '托盘', value: '托盘' },
  { label: '袋装', value: '袋装' },
  { label: '其他', value: '其他' },
];

const CATEGORY_COLORS: Record<string, string> = {
  '纸箱': 'blue',
  '托盘': 'green',
  '袋装': 'orange',
  '其他': 'default',
};

const TYPE_OPTIONS = [
  { label: '纸箱', value: 'box' },
  { label: '托盘', value: 'pallet' },
  { label: '袋装', value: 'bag' },
  { label: '木箱', value: 'wooden' },
  { label: '桶装', value: 'barrel' },
  { label: '其他', value: 'other' },
];

const PRESET_TEMPLATES: CargoTemplateItem[] = [
  {
    id: 'preset-standard-box',
    name: '标准纸箱',
    category: '纸箱',
    dimensions: { length: 600, width: 400, height: 400 },
    weight: 15,
    type: 'box',
    stackable: true,
    fragile: false,
    color: '#1890ff',
    usageCount: 0,
    createdAt: new Date(),
  },
  {
    id: 'preset-large-box',
    name: '大纸箱',
    category: '纸箱',
    dimensions: { length: 800, width: 600, height: 500 },
    weight: 30,
    type: 'box',
    stackable: true,
    fragile: false,
    color: '#52c41a',
    usageCount: 0,
    createdAt: new Date(),
  },
  {
    id: 'preset-eu-pallet',
    name: '欧标托盘',
    category: '托盘',
    dimensions: { length: 1200, width: 800, height: 1500 },
    weight: 500,
    type: 'pallet',
    stackable: false,
    fragile: false,
    color: '#722ed1',
    usageCount: 0,
    createdAt: new Date(),
  },
  {
    id: 'preset-us-pallet',
    name: '美标托盘',
    category: '托盘',
    dimensions: { length: 1200, width: 1000, height: 1500 },
    weight: 600,
    type: 'pallet',
    stackable: false,
    fragile: false,
    color: '#13c2c2',
    usageCount: 0,
    createdAt: new Date(),
  },
  {
    id: 'preset-small-parcel',
    name: '小包裹',
    category: '其他',
    dimensions: { length: 300, width: 200, height: 150 },
    weight: 3,
    type: 'box',
    stackable: true,
    fragile: false,
    color: '#faad14',
    usageCount: 0,
    createdAt: new Date(),
  },
];

function loadTemplates(): CargoTemplateItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch {
    // ignore
  }
  return [];
}

function saveTemplates(templates: CargoTemplateItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

function generateId(): string {
  return `tpl-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

const CargoTemplateManager = ({ onApplyTemplate, visible }: CargoTemplateManagerProps) => {
  const [templates, setTemplates] = useState<CargoTemplateItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CargoTemplateItem | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    const stored = loadTemplates();
    if (stored.length === 0) {
      const initialized = [...PRESET_TEMPLATES];
      saveTemplates(initialized);
      setTemplates(initialized);
    } else {
      setTemplates(stored);
    }
  }, []);

  const filteredTemplates = templates.filter((t) => {
    const matchCategory = activeCategory === 'all' || t.category === activeCategory;
    const matchSearch =
      !searchText ||
      t.name.toLowerCase().includes(searchText.toLowerCase()) ||
      t.category.toLowerCase().includes(searchText.toLowerCase());
    return matchCategory && matchSearch;
  });

  const updateTemplates = useCallback((newTemplates: CargoTemplateItem[]) => {
    setTemplates(newTemplates);
    saveTemplates(newTemplates);
  }, []);

  const handleAdd = () => {
    setEditingTemplate(null);
    form.resetFields();
    form.setFieldsValue({
      category: '纸箱',
      type: 'box',
      stackable: true,
      fragile: false,
      color: '#1890ff',
    });
    setIsModalVisible(true);
  };

  const handleEdit = (template: CargoTemplateItem) => {
    setEditingTemplate(template);
    form.setFieldsValue({
      name: template.name,
      category: template.category,
      length: template.dimensions.length,
      width: template.dimensions.width,
      height: template.dimensions.height,
      weight: template.weight,
      type: template.type,
      stackable: template.stackable,
      fragile: template.fragile,
      color: template.color,
    });
    setIsModalVisible(true);
  };

  const handleCopy = (template: CargoTemplateItem) => {
    const newTemplate: CargoTemplateItem = {
      ...template,
      id: generateId(),
      name: `${template.name} (复制)`,
      usageCount: 0,
      createdAt: new Date(),
    };
    updateTemplates([...templates, newTemplate]);
    message.success('模板复制成功');
  };

  const handleDelete = (id: string) => {
    const newTemplates = templates.filter((t) => t.id !== id);
    updateTemplates(newTemplates);
    message.success('模板删除成功');
  };

  const handleApply = (template: CargoTemplateItem) => {
    if (onApplyTemplate) {
      const updated = templates.map((t) =>
        t.id === template.id ? { ...t, usageCount: t.usageCount + 1 } : t
      );
      updateTemplates(updated);
      onApplyTemplate({ ...template, usageCount: template.usageCount + 1 });
      message.success(`已应用模板「${template.name}」`);
    }
  };

  const handleModalOk = () => {
    form.validateFields().then((values) => {
      const templateData: CargoTemplateItem = {
        id: editingTemplate ? editingTemplate.id : generateId(),
        name: values.name,
        category: values.category,
        dimensions: {
          length: values.length,
          width: values.width,
          height: values.height,
        },
        weight: values.weight,
        type: values.type,
        stackable: values.stackable,
        fragile: values.fragile,
        color: values.color || '#1890ff',
        usageCount: editingTemplate ? editingTemplate.usageCount : 0,
        createdAt: editingTemplate ? editingTemplate.createdAt : new Date(),
      };

      if (editingTemplate) {
        const newTemplates = templates.map((t) =>
          t.id === editingTemplate.id ? templateData : t
        );
        updateTemplates(newTemplates);
        message.success('模板更新成功');
      } else {
        updateTemplates([...templates, templateData]);
        message.success('模板添加成功');
      }

      setIsModalVisible(false);
      setEditingTemplate(null);
      form.resetFields();
    });
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    setEditingTemplate(null);
    form.resetFields();
  };

  const handleResetPresets = () => {
    const newTemplates = [...PRESET_TEMPLATES];
    updateTemplates(newTemplates);
    message.success('已重置为预设模板');
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: CargoTemplateItem) => (
        <Space>
          <div
            style={{
              width: 14,
              height: 14,
              backgroundColor: record.color,
              borderRadius: 3,
              border: '1px solid #d9d9d9',
              flexShrink: 0,
            }}
          />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category: string) => (
        <Tag color={CATEGORY_COLORS[category] || 'default'}>{category}</Tag>
      ),
    },
    {
      title: '尺寸 (L×W×H mm)',
      key: 'dimensions',
      width: 200,
      render: (_: unknown, record: CargoTemplateItem) =>
        `${record.dimensions.length}×${record.dimensions.width}×${record.dimensions.height}`,
    },
    {
      title: '重量',
      dataIndex: 'weight',
      key: 'weight',
      width: 100,
      render: (weight: number) => `${weight} kg`,
    },
    {
      title: '属性',
      key: 'attributes',
      width: 140,
      render: (_: unknown, record: CargoTemplateItem) => (
        <Space size={4}>
          {record.stackable ? (
            <Tag color="green" style={{ margin: 0 }}>可堆叠</Tag>
          ) : (
            <Tag color="orange" style={{ margin: 0 }}>不可堆叠</Tag>
          )}
          {record.fragile && (
            <Tag color="red" style={{ margin: 0 }}>易碎</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '使用次数',
      dataIndex: 'usageCount',
      key: 'usageCount',
      width: 90,
      sorter: (a: CargoTemplateItem, b: CargoTemplateItem) => a.usageCount - b.usageCount,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: CargoTemplateItem) => (
        <Space size="small">
          <Tooltip title="应用模板">
            <Button
              type="link"
              icon={<AppstoreOutlined />}
              onClick={() => handleApply(record)}
              disabled={!onApplyTemplate}
              style={{ padding: 0 }}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              style={{ padding: 0 }}
            />
          </Tooltip>
          <Tooltip title="复制">
            <Button
              type="link"
              icon={<CopyOutlined />}
              onClick={() => handleCopy(record)}
              style={{ padding: 0 }}
            />
          </Tooltip>
          <Popconfirm
            title="确定删除此模板?"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                style={{ padding: 0 }}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      style={visible === false ? { display: 'none' } : undefined}
      title={
        <Space>
          <AppstoreOutlined style={{ fontSize: 20, color: '#1890ff' }} />
          <Title level={4} style={{ margin: 0 }}>货物模板管理</Title>
          <Tag color="blue">{templates.length} 个模板</Tag>
        </Space>
      }
      extra={
        <Space>
          <Button icon={<SaveOutlined />} onClick={handleResetPresets}>
            重置预设
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加模板
          </Button>
        </Space>
      }
    >
      <Row gutter={16} style={{ marginBottom: 16 }} align="middle">
        <Col flex="auto">
          <Input
            placeholder="搜索模板名称或分类..."
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ maxWidth: 320 }}
          />
        </Col>
      </Row>

      <div style={{ marginBottom: 16 }}>
        <Space wrap>
          {CATEGORIES.map((cat) => (
            <Tag
              key={cat.value}
              color={activeCategory === cat.value ? '#1890ff' : undefined}
              style={{
                cursor: 'pointer',
                padding: '4px 12px',
                fontSize: 13,
                borderRadius: 16,
                border: activeCategory === cat.value ? '1px solid #1890ff' : '1px solid #d9d9d9',
                userSelect: 'none',
              }}
              onClick={() => setActiveCategory(cat.value)}
            >
              {cat.label}
            </Tag>
          ))}
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={filteredTemplates}
        rowKey="id"
        pagination={{
          pageSize: 8,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 个模板`,
        }}
        scroll={{ x: 900 }}
        locale={{
          emptyText: (
            <Empty
              description="暂无模板数据"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ),
        }}
        size="middle"
      />

      <Modal
        title={editingTemplate ? '编辑模板' : '添加模板'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={640}
        destroyOnClose
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            category: '纸箱',
            type: 'box',
            stackable: true,
            fragile: false,
            color: '#1890ff',
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="模板名称"
                rules={[{ required: true, message: '请输入模板名称' }]}
              >
                <Input placeholder="请输入模板名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="category"
                label="分类"
                rules={[{ required: true, message: '请选择分类' }]}
              >
                <Select placeholder="请选择分类">
                  {CATEGORIES.filter((c) => c.value !== 'all').map((cat) => (
                    <Select.Option key={cat.value} value={cat.value}>
                      {cat.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="length"
                label="长度 (mm)"
                rules={[{ required: true, message: '请输入长度' }]}
              >
                <InputNumber min={1} max={50000} style={{ width: '100%' }} placeholder="长度" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="width"
                label="宽度 (mm)"
                rules={[{ required: true, message: '请输入宽度' }]}
              >
                <InputNumber min={1} max={50000} style={{ width: '100%' }} placeholder="宽度" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="height"
                label="高度 (mm)"
                rules={[{ required: true, message: '请输入高度' }]}
              >
                <InputNumber min={1} max={50000} style={{ width: '100%' }} placeholder="高度" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="weight"
                label="重量 (kg)"
                rules={[{ required: true, message: '请输入重量' }]}
              >
                <InputNumber
                  min={0.1}
                  max={50000}
                  step={0.1}
                  style={{ width: '100%' }}
                  placeholder="重量"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="type"
                label="货物类型"
                rules={[{ required: true, message: '请选择类型' }]}
              >
                <Select placeholder="请选择类型">
                  {TYPE_OPTIONS.map((opt) => (
                    <Select.Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="stackable" label="可堆叠" valuePropName="checked">
                <Select>
                  <Select.Option value={true}>可堆叠</Select.Option>
                  <Select.Option value={false}>不可堆叠</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="fragile" label="易碎" valuePropName="checked">
                <Select>
                  <Select.Option value={false}>普通</Select.Option>
                  <Select.Option value={true}>易碎</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="color" label="颜色">
                <ColorPicker format="hex" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Card>
  );
};

export default CargoTemplateManager;
export type { CargoTemplateItem, CargoTemplateManagerProps };
