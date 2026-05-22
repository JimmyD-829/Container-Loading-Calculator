import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Table,
  Card,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Space,
  Upload,
  message,
  Popconfirm,
  Typography,
  Row,
  Col,
  Statistic,
  Tag,
  Tooltip,
  Checkbox,
} from 'antd';
import {
  PlusOutlined,
  UploadOutlined,
  DeleteOutlined,
  EditOutlined,
  FileExcelOutlined,
  DownloadOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload';

const { Title, Text } = Typography;

// 货物数据类型定义
export interface CargoItem {
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  quantity: number;
  stackable: boolean;
  fragile: boolean;
  color?: string;
}

// 默认货物颜色
const CARGO_COLORS = [
  '#1890ff',
  '#52c41a',
  '#faad14',
  '#f5222d',
  '#722ed1',
  '#13c2c2',
  '#eb2f96',
  '#fa541c',
];

interface CargoManagerProps {
  cargoList: CargoItem[];
  onCargoListChange: (list: CargoItem[]) => void;
  selectedCargoIds?: string[];
  onSelectedCargoIdsChange?: (ids: string[]) => void;
}

const CargoManager: React.FC<CargoManagerProps> = ({
  cargoList,
  onCargoListChange,
  selectedCargoIds = [],
  onSelectedCargoIdsChange,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCargo, setEditingCargo] = useState<CargoItem | null>(null);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 计算总体积和总重量
  const totalVolume = cargoList.reduce(
    (sum, item) => sum + item.length * item.width * item.height * item.quantity,
    0
  );
  const totalWeight = cargoList.reduce(
    (sum, item) => sum + item.weight * item.quantity,
    0
  );
  const totalQuantity = cargoList.reduce((sum, item) => sum + item.quantity, 0);

  // 计算已选择货物的统计信息
  const selectedCargos = cargoList.filter((item) => selectedCargoIds.includes(item.id));
  const selectedVolume = selectedCargos.reduce(
    (sum, item) => sum + item.length * item.width * item.height * item.quantity,
    0
  );
  const selectedWeight = selectedCargos.reduce(
    (sum, item) => sum + item.weight * item.quantity,
    0
  );
  const selectedQuantity = selectedCargos.reduce((sum, item) => sum + item.quantity, 0);

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (onSelectedCargoIdsChange) {
      if (checked) {
        onSelectedCargoIdsChange(cargoList.map((item) => item.id));
      } else {
        onSelectedCargoIdsChange([]);
      }
    }
  };

  // 单选/取消单选
  const handleSelectOne = (id: string, checked: boolean) => {
    if (onSelectedCargoIdsChange) {
      if (checked) {
        onSelectedCargoIdsChange([...selectedCargoIds, id]);
      } else {
        onSelectedCargoIdsChange(selectedCargoIds.filter((cid) => cid !== id));
      }
    }
  };

  // 打开添加/编辑弹窗
  const showModal = (cargo?: CargoItem) => {
    if (cargo) {
      setEditingCargo(cargo);
      form.setFieldsValue(cargo);
    } else {
      setEditingCargo(null);
      form.resetFields();
      form.setFieldsValue({
        stackable: true,
        fragile: false,
        quantity: 1,
      });
    }
    setIsModalVisible(true);
  };

  // 关闭弹窗
  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingCargo(null);
    form.resetFields();
  };

  // 保存货物
  const handleSave = () => {
    form.validateFields().then((values) => {
      const colorIndex = cargoList.length % CARGO_COLORS.length;
      const newCargo: CargoItem = {
        ...values,
        id: editingCargo ? editingCargo.id : Date.now().toString(),
        color: editingCargo ? editingCargo.color : CARGO_COLORS[colorIndex],
      };

      if (editingCargo) {
        onCargoListChange(
          cargoList.map((item) => (item.id === editingCargo.id ? newCargo : item))
        );
        message.success('货物更新成功');
      } else {
        onCargoListChange([...cargoList, newCargo]);
        message.success('货物添加成功');
      }
      handleCancel();
    });
  };

  // 删除货物
  const handleDelete = (id: string) => {
    onCargoListChange(cargoList.filter((item) => item.id !== id));
    message.success('货物删除成功');
  };

  // 复制货物
  const handleCopy = (cargo: CargoItem) => {
    const colorIndex = cargoList.length % CARGO_COLORS.length;
    const newCargo: CargoItem = {
      ...cargo,
      id: Date.now().toString(),
      name: `${cargo.name} (复制)`,
      color: CARGO_COLORS[colorIndex],
    };
    onCargoListChange([...cargoList, newCargo]);
    message.success('货物复制成功');
  };

  // 清空所有货物
  const handleClearAll = () => {
    onCargoListChange([]);
    message.success('已清空所有货物');
  };

  // 处理Excel导入
  const handleExcelImport: UploadProps['onChange'] = (info) => {
    if (info.file.status === 'done') {
      const file = info.file.originFileObj;
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: ['name', 'length', 'width', 'height', 'weight', 'quantity', 'stackable', 'fragile'] });
            
            jsonData.shift();
            
            const importedCargos: CargoItem[] = jsonData
              .filter((row: any) => row.name && row.length && row.width && row.height && row.weight && row.quantity)
              .map((row: any, index: number) => ({
                id: `imported-${Date.now()}-${index}`,
                name: String(row.name).trim(),
                length: Number(row.length),
                width: Number(row.width),
                height: Number(row.height),
                weight: Number(row.weight),
                quantity: Number(row.quantity),
                stackable: String(row.stackable).trim() === '是',
                fragile: String(row.fragile).trim() === '是',
                color: CARGO_COLORS[(cargoList.length + index) % CARGO_COLORS.length],
              }));
            
            if (importedCargos.length > 0) {
              onCargoListChange([...cargoList, ...importedCargos]);
              message.success(`成功导入 ${importedCargos.length} 条货物数据`);
            } else {
              message.warning('未找到有效的货物数据');
            }
          } catch (error) {
            message.error('解析文件失败，请确保文件格式正确');
          }
        };
        reader.readAsArrayBuffer(file);
      }
    } else if (info.file.status === 'error') {
      message.error(`${info.file.name} 导入失败`);
    }
    setFileList(info.fileList.slice(-1));
  };

  // 导出Excel模板
  const handleDownloadTemplate = () => {
    const templateData = [
      ['货物名称', '长度(cm)', '宽度(cm)', '高度(cm)', '重量(kg)', '数量', '可堆叠', '易碎'],
      ['电子产品箱', '50', '40', '30', '20', '5', '是', '否'],
      ['服装纸箱', '60', '50', '40', '15', '10', '是', '否'],
      ['食品包装盒', '40', '30', '25', '8', '20', '是', '否'],
      ['易碎品箱', '35', '35', '35', '5', '3', '否', '是'],
      ['大型设备箱', '120', '80', '60', '100', '2', '是', '否'],
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '货物模板');
    
    worksheet['!cols'] = [
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 8 },
      { wch: 10 },
      { wch: 10 },
    ];
    
    XLSX.writeFile(workbook, '货物导入模板.xlsx');
    message.success('模板下载成功，请填写数据后导入');
  };

  // 表格列定义
  const columns = [
    {
      title: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Checkbox
            indeterminate={selectedCargoIds.length > 0 && selectedCargoIds.length < cargoList.length}
            checked={selectedCargoIds.length === cargoList.length && cargoList.length > 0}
            onChange={(e) => handleSelectAll(e.target.checked)}
          />
          <span>选择</span>
        </div>
      ),
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id: string) => (
        <Checkbox
          checked={selectedCargoIds.includes(id)}
          onChange={(e) => handleSelectOne(id, e.target.checked)}
        />
      ),
    },
    {
      title: '颜色',
      dataIndex: 'color',
      key: 'color',
      width: 60,
      render: (color: string) => (
        <div
          style={{
            width: 24,
            height: 24,
            backgroundColor: color,
            borderRadius: 4,
            border: '1px solid #d9d9d9',
          }}
        />
      ),
    },
    {
      title: '货物名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: CargoItem) => (
        <Space>
          <Text strong>{text}</Text>
          {record.fragile && <Tag color="red">易碎</Tag>}
          {!record.stackable && <Tag color="orange">不可堆叠</Tag>}
        </Space>
      ),
    },
    {
      title: '尺寸 (L×W×H)',
      key: 'dimensions',
      render: (_: any, record: CargoItem) =>
        `${record.length}×${record.width}×${record.height} cm`,
    },
    {
      title: '单件重量',
      dataIndex: 'weight',
      key: 'weight',
      render: (weight: number) => `${weight} kg`,
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: '总体积',
      key: 'volume',
      render: (_: any, record: CargoItem) => {
        const volume =
          (record.length * record.width * record.height * record.quantity) /
          1000000;
        return `${volume.toFixed(3)} m³`;
      },
    },
    {
      title: '总重量',
      key: 'totalWeight',
      render: (_: any, record: CargoItem) =>
        `${(record.weight * record.quantity).toFixed(1)} kg`,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: CargoItem) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => showModal(record)}
            />
          </Tooltip>
          <Tooltip title="复制">
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={() => handleCopy(record)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Popconfirm
              title="确定删除此货物?"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <Title level={4} style={{ margin: 0 }}>
            货物管理
          </Title>
          <Tag color="blue">{cargoList.length} 种货物</Tag>
        </Space>
      }
      extra={
        <Space>
          <Upload
            accept=".xlsx,.xls"
            fileList={fileList}
            onChange={handleExcelImport}
            customRequest={({ onSuccess }) => {
              setTimeout(() => {
                onSuccess?.('ok');
              }, 0);
            }}
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />}>Excel导入</Button>
          </Upload>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleDownloadTemplate}
          >
            下载模板
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => showModal()}
          >
            添加货物
          </Button>
          {cargoList.length > 0 && (
            <Popconfirm
              title="确定清空所有货物?"
              onConfirm={handleClearAll}
              okText="确定"
              cancelText="取消"
            >
              <Button danger>清空</Button>
            </Popconfirm>
          )}
        </Space>
      }
    >
      {/* 统计信息 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card bordered={false} style={{ background: '#f0f5ff' }}>
            <Statistic
              title="货物种类"
              value={cargoList.length}
              suffix="种"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ background: '#f6ffed' }}>
            <Statistic
              title="总件数"
              value={totalQuantity}
              suffix="件"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ background: '#fff7e6' }}>
            <Statistic
              title="总体积"
              value={(totalVolume / 1000000).toFixed(3)}
              suffix="m³"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ background: '#fff2f0' }}>
            <Statistic
              title="总重量"
              value={totalWeight.toFixed(1)}
              suffix="kg"
            />
          </Card>
        </Col>
      </Row>

      {/* 已选择货物统计 */}
      {selectedCargoIds.length > 0 && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={24}>
            <Card bordered={true} title="已选择货物" style={{ borderColor: '#3182ce', borderWidth: 2 }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="选择种类"
                    value={selectedCargos.length}
                    suffix="种"
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="选择件数"
                    value={selectedQuantity}
                    suffix="件"
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="选择体积"
                    value={(selectedVolume / 1000000).toFixed(3)}
                    suffix="m³"
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="选择重量"
                    value={selectedWeight.toFixed(1)}
                    suffix="kg"
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      )}

      {/* 货物表格 */}
      <Table
        columns={columns}
        dataSource={cargoList}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        scroll={{ x: 800 }}
        locale={{
          emptyText: (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <FileExcelOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />
              <p>暂无货物数据，请添加货物或导入Excel</p>
            </div>
          ),
        }}
      />

      {/* 添加/编辑弹窗 */}
      <Modal
        title={editingCargo ? '编辑货物' : '添加货物'}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={handleCancel}
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            stackable: true,
            fragile: false,
            quantity: 1,
          }}
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="name"
                label="货物名称"
                rules={[{ required: true, message: '请输入货物名称' }]}
              >
                <Input placeholder="请输入货物名称" />
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
                  min={1}
                  max={1000}
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
                  min={1}
                  max={1000}
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
                  min={1}
                  max={1000}
                  style={{ width: '100%' }}
                  placeholder="高度"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="weight"
                label="单件重量 (kg)"
                rules={[{ required: true, message: '请输入重量' }]}
              >
                <InputNumber
                  min={0.1}
                  max={10000}
                  step={0.1}
                  style={{ width: '100%' }}
                  placeholder="重量"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="quantity"
                label="数量"
                rules={[{ required: true, message: '请输入数量' }]}
              >
                <InputNumber
                  min={1}
                  max={10000}
                  style={{ width: '100%' }}
                  placeholder="数量"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="stackable"
                valuePropName="checked"
                style={{ marginBottom: 0 }}
              >
                <Input.Group compact>
                  <span style={{ marginRight: 8 }}>可堆叠:</span>
                  <Input type="checkbox" style={{ width: 'auto' }} />
                </Input.Group>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="fragile"
                valuePropName="checked"
                style={{ marginBottom: 0 }}
              >
                <Input.Group compact>
                  <span style={{ marginRight: 8 }}>易碎:</span>
                  <Input type="checkbox" style={{ width: 'auto' }} />
                </Input.Group>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="stackable"
                label="堆叠属性"
                initialValue={true}
              >
                <Input.Group compact>
                  <Button
                    type={form.getFieldValue('stackable') ? 'primary' : 'default'}
                    onClick={() => form.setFieldsValue({ stackable: true })}
                  >
                    可堆叠
                  </Button>
                  <Button
                    type={!form.getFieldValue('stackable') ? 'primary' : 'default'}
                    onClick={() => form.setFieldsValue({ stackable: false })}
                  >
                    不可堆叠
                  </Button>
                </Input.Group>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="fragile"
                label="易碎属性"
                initialValue={false}
              >
                <Input.Group compact>
                  <Button
                    type={form.getFieldValue('fragile') ? 'primary' : 'default'}
                    danger={form.getFieldValue('fragile')}
                    onClick={() => form.setFieldsValue({ fragile: true })}
                  >
                    易碎
                  </Button>
                  <Button
                    type={!form.getFieldValue('fragile') ? 'primary' : 'default'}
                    onClick={() => form.setFieldsValue({ fragile: false })}
                  >
                    普通
                  </Button>
                </Input.Group>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Card>
  );
};

export default CargoManager;
