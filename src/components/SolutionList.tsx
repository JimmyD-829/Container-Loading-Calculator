import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Input,
  Select,
  DatePicker,
  Tag,
  Button,
  Space,
  Card,
  Empty,
  Tooltip,
  Popconfirm,
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  DownloadOutlined,
  EyeOutlined,
  EditOutlined,
  CopyOutlined,
  FolderOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { ColumnType } from 'antd/es/table';
import { solutionStorage } from '../utils/solutionStorage';
import { Solution, SolutionStatus } from '../types';
import dayjs from 'dayjs';

interface SolutionListProps {
  onSelect: (solution: Solution) => void;
}

const { RangePicker } = DatePicker;

const statusColors: Record<SolutionStatus, string> = {
  [SolutionStatus.DRAFT]: 'gold',
  [SolutionStatus.CALCULATED]: 'blue',
  [SolutionStatus.APPROVED]: 'green',
  [SolutionStatus.DEPLOYED]: 'purple',
  [SolutionStatus.ARCHIVED]: 'gray',
};

const statusLabels: Record<SolutionStatus, string> = {
  [SolutionStatus.DRAFT]: '草稿',
  [SolutionStatus.CALCULATED]: '已计算',
  [SolutionStatus.APPROVED]: '已批准',
  [SolutionStatus.DEPLOYED]: '已部署',
  [SolutionStatus.ARCHIVED]: '已归档',
};

const SolutionList: React.FC<SolutionListProps> = ({ onSelect }) => {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });
  
  const [filters, setFilters] = useState({
    keywords: '',
    status: [] as SolutionStatus[],
    tags: [] as string[],
    dateRange: null as [dayjs.Dayjs, dayjs.Dayjs] | null,
  });

  const loadSolutions = useMemo(() => {
    return async () => {
      setLoading(true);
      try {
        const query = {
          keywords: filters.keywords || undefined,
          status: filters.status.length > 0 ? filters.status : undefined,
          tags: filters.tags.length > 0 ? filters.tags : undefined,
          dateRange: filters.dateRange
            ? {
                start: filters.dateRange[0].toDate(),
                end: filters.dateRange[1].toDate(),
              }
            : undefined,
          page: pagination.page,
          pageSize: pagination.pageSize,
          sortBy: 'createdAt' as const,
          sortOrder: 'desc' as const,
        };

        const result = solutionStorage.searchSolutions(query);
        setSolutions(result.data);
        setPagination(prev => ({ ...prev, total: result.total }));
      } finally {
        setLoading(false);
      }
    };
  }, [filters, pagination.page, pagination.pageSize]);

  useEffect(() => {
    loadSolutions();
  }, [loadSolutions]);

  const handlePageChange = (page: number, pageSize?: number) => {
    setPagination(prev => ({
      ...prev,
      page,
      pageSize: pageSize || prev.pageSize,
    }));
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleClearFilters = () => {
    setFilters({
      keywords: '',
      status: [],
      tags: [],
      dateRange: null,
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleDuplicate = (solution: Solution) => {
    const newName = `${solution.name} (副本)`;
    solutionStorage.duplicateSolution(solution.id, newName);
    loadSolutions();
  };

  const handleArchive = (solution: Solution) => {
    solutionStorage.changeStatus(solution.id, SolutionStatus.ARCHIVED);
    loadSolutions();
  };

  const handleDelete = (solutionId: string) => {
    solutionStorage.deleteSolution(solutionId);
    loadSolutions();
  };

  const columns: ColumnType<Solution>[] = [
    {
      title: '方案名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      width: 200,
      render: (text: string, record: Solution) => (
        <Tooltip title={text}>
          <span className="font-medium">{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      width: 200,
      render: (text?: string) => text || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: SolutionStatus) => (
        <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
      ),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 150,
      render: (tags: { id: string; name: string; color: string }[]) => (
        <Space wrap>
          {tags.map(tag => (
            <Tag key={tag.id} color={tag.color}>{tag.name}</Tag>
          ))}
          {tags.length === 0 && '-'}
        </Space>
      ),
    },
    {
      title: '版本',
      dataIndex: 'currentVersion',
      key: 'currentVersion',
      width: 80,
    },
    {
      title: '货物数量',
      dataIndex: 'cargoIds',
      key: 'cargoCount',
      width: 100,
      render: (cargoIds: string[]) => cargoIds.length,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record: Solution) => (
        <Space size="small">
          <Tooltip title="查看">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => onSelect(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button size="small" icon={<EditOutlined />} />
          </Tooltip>
          <Tooltip title="复制">
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleDuplicate(record)}
            />
          </Tooltip>
          {record.status !== SolutionStatus.ARCHIVED && (
            <Tooltip title="归档">
              <Button
                size="small"
                icon={<FolderOutlined />}
                onClick={() => handleArchive(record)}
              />
            </Tooltip>
          )}
          <Popconfirm
            title="确定删除该方案？"
            okText="确定"
            cancelText="取消"
            onConfirm={() => handleDelete(record.id)}
          >
            <Tooltip title="删除">
              <Button size="small" icon={<DeleteOutlined />} danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const allTags = useMemo(() => {
    const allSolutions = solutionStorage.getAllSolutions();
    const tagSet = new Set<string>();
    allSolutions.forEach(sol => {
      sol.tags.forEach(tag => tagSet.add(tag.name));
    });
    return Array.from(tagSet);
  }, []);

  return (
    <Card title="方案列表" className="h-full">
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="搜索方案名称或描述"
            prefix={<SearchOutlined />}
            value={filters.keywords}
            onChange={e => handleFilterChange('keywords', e.target.value)}
          />
        </div>
        
        <Select
          mode="multiple"
          placeholder="选择状态"
          style={{ width: 200 }}
          value={filters.status}
          onChange={value => handleFilterChange('status', value)}
          options={Object.entries(statusLabels).map(([value, label]) => ({
            value,
            label,
          }))}
        />

        <Select
          mode="multiple"
          placeholder="选择标签"
          style={{ width: 200 }}
          value={filters.tags}
          onChange={value => handleFilterChange('tags', value)}
          options={allTags.map(tag => ({ value: tag, label: tag }))}
        />

        <RangePicker
          placeholder={['开始日期', '结束日期']}
          value={filters.dateRange}
          onChange={value => handleFilterChange('dateRange', value)}
        />

        <div className="flex gap-2">
          <Button
            icon={<FilterOutlined />}
            onClick={loadSolutions}
            loading={loading}
          >
            筛选
          </Button>
          <Button onClick={handleClearFilters}>重置</Button>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={solutions}
        rowKey="id"
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: handlePageChange,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条记录`,
        }}
        loading={loading}
        locale={{
          emptyText: (
            <Empty
              description="暂无方案"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ),
        }}
      />
    </Card>
  );
};

export default SolutionList;