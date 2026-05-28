import React, { useState, useCallback } from 'react';
import { ConfigProvider, theme, Layout, message, Steps } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import {
  InboxOutlined,
  ContainerOutlined,
  CalculatorOutlined,
  EyeOutlined,
  FileTextOutlined,
  ColumnWidthOutlined,
  FolderOutlined,
  SwapOutlined,
  AppstoreOutlined,
  ReadOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import CargoManager, { CargoItem } from './components/CargoManager';
import ContainerSelector, { ContainerType as SelectorContainerType, DEFAULT_CONTAINERS } from './components/ContainerSelector';
import CalculationConfig, { CalculationConfig as ConfigType } from './components/CalculationConfig';
import ResultViewer, { LoadingResult, LoadedCargo } from './components/ResultViewer';
import Container3D, { CargoBox, ContainerDimensions, MultiContainerData } from './components/Container3D';
import NewsMarquee from './components/NewsMarquee';
import WeatherWidget from './components/WeatherWidget';
import ContainerCapacityCalculator from './components/ContainerCapacityCalculator';
import SolutionList from './components/SolutionList';
import SolutionComparison from './components/SolutionComparison';
import CargoTemplateManager from './components/CargoTemplateManager';
import LoadingGuide from './components/LoadingGuide';
import { ffdPacking } from './algorithms/ffd';
import { solutionStorage } from './utils/solutionStorage';
import { Cargo, ContainerSpec, PackingResult, CargoType, Solution } from './types';
import { CONTAINER_40HQ, STANDARD_CONTAINERS, createCustomContainerSpec } from './data/containers';
import './App.css';

const convertTo3DData = (result: LoadingResult, selectedContainerIndex: number = 0): {
  containerDimensions: ContainerDimensions;
  cargoBoxes: CargoBox[];
  centerOfGravity: [number, number, number];
} => {
  const container = result.containers[selectedContainerIndex];
  if (!container) {
    return {
      containerDimensions: { length: 6, width: 2.5, height: 2.6 },
      cargoBoxes: [],
      centerOfGravity: [0, 0, 0],
    };
  }
  return convertContainerTo3DData(container, selectedContainerIndex);
};

const convertContainerTo3DData = (container: LoadingResult['containers'][0], containerIndex: number): {
  containerDimensions: ContainerDimensions;
  cargoBoxes: CargoBox[];
  centerOfGravity: [number, number, number];
} => {
  const containerDimensions: ContainerDimensions = {
    length: container.container.length / 100,
    width: container.container.width / 100,
    height: container.container.height / 100,
  };

  const cargoBoxes: CargoBox[] = container.cargoList.map((cargo) => {
    const halfLength = containerDimensions.length / 2;
    const halfWidth = containerDimensions.width / 2;
    const halfHeight = containerDimensions.height / 2;

    const cargoSizeM = {
      length: cargo.length / 100,
      width: cargo.width / 100,
      height: cargo.height / 100,
    };

    const positionX = (cargo.position.x / 100) + (cargoSizeM.length / 2) - halfLength;
    const positionY = (cargo.position.z / 100) + (cargoSizeM.height / 2) - halfHeight;
    const positionZ = (cargo.position.y / 100) + (cargoSizeM.width / 2) - halfWidth;

    return {
      id: cargo.id,
      name: cargo.name,
      size: [cargoSizeM.length, cargoSizeM.width, cargoSizeM.height],
      position: [positionX, positionY, positionZ],
      color: cargo.color || '#1890ff',
      containerIndex,
    };
  });

  let totalWeight = 0;
  let centerX = 0, centerY = 0, centerZ = 0;

  container.cargoList.forEach((cargo) => {
    const weight = cargo.weight;
    totalWeight += weight;
    const halfLength = containerDimensions.length / 2;
    const halfWidth = containerDimensions.width / 2;
    const halfHeight = containerDimensions.height / 2;
    const cargoSizeM = {
      length: cargo.length / 100,
      width: cargo.width / 100,
      height: cargo.height / 100,
    };

    const posX = (cargo.position.x / 100) + (cargoSizeM.length / 2) - halfLength;
    const posY = (cargo.position.z / 100) + (cargoSizeM.height / 2) - halfHeight;
    const posZ = (cargo.position.y / 100) + (cargoSizeM.width / 2) - halfWidth;

    centerX += posX * weight;
    centerY += posY * weight;
    centerZ += posZ * weight;
  });

  let centerOfGravity: [number, number, number] = [0, 0, 0];
  if (totalWeight > 0) {
    centerOfGravity = [
      centerX / totalWeight,
      centerY / totalWeight,
      centerZ / totalWeight,
    ];
  }

  return { containerDimensions, cargoBoxes, centerOfGravity };
};

const convertToMultiContainer3DData = (result: LoadingResult): MultiContainerData[] => {
  return result.containers.map((container, index) => {
    const { containerDimensions, cargoBoxes, centerOfGravity } = convertContainerTo3DData(container, index);
    return {
      containerDimensions,
      cargoBoxes,
      placedCargos: [],
      centerOfGravity,
      isCogValid: true,
      errorBoxIds: [],
      warningBoxIds: [],
    };
  });
};

const { Content, Footer } = Layout;

const convertToAlgorithmCargo = (cargoItem: CargoItem): Cargo => {
  return {
    id: cargoItem.id,
    name: cargoItem.name,
    dimensions: {
      length: cargoItem.length * 10,
      width: cargoItem.width * 10,
      height: cargoItem.height * 10,
    },
    weight: cargoItem.weight,
    quantity: cargoItem.quantity,
    type: CargoType.BOX,
    priority: 2,
    stackable: cargoItem.stackable,
    maxStack: 10,
    rotatable: true,
    fragile: cargoItem.fragile,
    thisSideUp: false,
    color: cargoItem.color,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

const convertToAlgorithmContainer = (container: SelectorContainerType): ContainerSpec => {
  const standardContainer = STANDARD_CONTAINERS.find(sc => sc.name === container.name);
  if (standardContainer) {
    return standardContainer;
  }

  return createCustomContainerSpec(
    container.name,
    container.description || '',
    {
      length: container.length * 10,
      width: container.width * 10,
      height: container.height * 10,
    },
    container.maxWeight,
    container.tareWeight
  );
};

const convertToViewerResult = (packingResult: PackingResult, originalCargos: CargoItem[]): LoadingResult => {
  const containers = packingResult.containers.map((container, index) => {
    const cargoList: LoadedCargo[] = container.placedCargos.map((placedCargo) => {
      const originalCargo = originalCargos.find(c => c.id === placedCargo.id.split('-')[0]);
      return {
        ...(originalCargo || {
          id: placedCargo.id,
          name: placedCargo.name,
          length: placedCargo.dimensions.length / 10,
          width: placedCargo.dimensions.width / 10,
          height: placedCargo.dimensions.height / 10,
          weight: placedCargo.weight,
          quantity: 1,
          stackable: placedCargo.stackable,
          fragile: placedCargo.fragile,
          color: placedCargo.color,
        }),
        position: {
          x: placedCargo.position.x / 10,
          y: placedCargo.position.y / 10,
          z: placedCargo.position.z / 10,
        },
        rotation: {
          x: placedCargo.rotation.x,
          y: placedCargo.rotation.y,
          z: placedCargo.rotation.z,
        },
        containerIndex: index,
      };
    });

    return {
      container: {
        id: container.spec.id,
        name: container.spec.name,
        code: container.spec.name.substring(0, 8),
        length: container.spec.innerDimensions.length / 10,
        width: container.spec.innerDimensions.width / 10,
        height: container.spec.innerDimensions.height / 10,
        maxWeight: container.spec.maxPayload,
        tareWeight: container.spec.tareWeight,
        volume: container.spec.volume,
        description: container.spec.description,
        isStandard: container.spec.isStandard,
      },
      cargoList,
      volumeUtilization: container.stats.volumeUtilization,
      weightUtilization: container.stats.weightUtilization,
      loadedCount: container.stats.cargoCount,
      totalWeight: container.stats.totalWeight,
    };
  });

  const unplacedCargo: CargoItem[] = packingResult.unplacedCargos.map(upc => ({
    id: upc.id,
    name: upc.name,
    length: upc.dimensions.length / 10,
    width: upc.dimensions.width / 10,
    height: upc.dimensions.height / 10,
    weight: upc.weight,
    quantity: upc.quantity,
    stackable: upc.stackable,
    fragile: upc.fragile,
    color: upc.color,
  }));

  const totalCargoCount = containers.reduce((sum, c) => sum + c.loadedCount, 0);

  return {
    id: packingResult.id,
    timestamp: packingResult.createdAt.getTime(),
    containers,
    unplacedCargo,
    totalCargoCount,
    totalContainers: containers.length,
    averageUtilization: containers.length > 0
      ? containers.reduce((sum, c) => sum + c.volumeUtilization, 0) / containers.length
      : 0,
    calculationTime: packingResult.duration / 1000,
    algorithm: packingResult.algorithm,
  };
};

const navItems = [
  { key: 0, title: '货物管理', icon: <InboxOutlined /> },
  { key: 1, title: '集装箱选择', icon: <ContainerOutlined /> },
  { key: 2, title: '计算配置', icon: <CalculatorOutlined /> },
  { key: 3, title: '查看结果', icon: <FileTextOutlined /> },
  { key: 4, title: '容量测算', icon: <ColumnWidthOutlined /> },
  { key: 5, title: '方案管理', icon: <FolderOutlined /> },
  { key: 6, title: '方案对比', icon: <SwapOutlined /> },
  { key: 7, title: '货物模板', icon: <AppstoreOutlined /> },
  { key: 8, title: '装卸指导', icon: <ReadOutlined /> },
];

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [cargoList, setCargoList] = useState<CargoItem[]>([
    {
      id: '1',
      name: '标准纸箱',
      length: 60,
      width: 40,
      height: 40,
      weight: 15,
      quantity: 10,
      stackable: true,
      fragile: false,
      color: '#1890ff',
    },
    {
      id: '2',
      name: '电子产品',
      length: 30,
      width: 20,
      height: 15,
      weight: 5,
      quantity: 20,
      stackable: true,
      fragile: true,
      color: '#52c41a',
    },
  ]);
  const [selectedContainer, setSelectedContainer] = useState<SelectorContainerType | null>(DEFAULT_CONTAINERS[2]);
  const [customContainers, setCustomContainers] = useState<SelectorContainerType[]>([]);
  const [calculationConfig, setCalculationConfig] = useState<ConfigType>({
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
    gaMutationRate: 0.1,
    gaCrossoverRate: 0.8,
    saInitialTemp: 100,
    saCoolingRate: 0.95,
    saIterations: 100,
    multiObjectiveWeights: {
      volume: 0.4,
      weight: 0.2,
      stability: 0.2,
      balance: 0.2,
    },
  });
  const [isCalculating, setIsCalculating] = useState(false);
  const [loadingResult, setLoadingResult] = useState<LoadingResult | null>(null);
  const [show3DView, setShow3DView] = useState(true);
  const [selected3DContainerIndex, setSelected3DContainerIndex] = useState(0);
  const [selectedCargoIds, setSelectedCargoIds] = useState<string[]>([]);
  const [solutions, setSolutions] = useState<Solution[]>([]);

  const handleCalculate = useCallback(async () => {
    if (!selectedContainer) {
      message.warning('请先选择集装箱');
      return;
    }

    const cargosToCalculate = selectedCargoIds.length > 0
      ? cargoList.filter(c => selectedCargoIds.includes(c.id))
      : cargoList;

    if (cargosToCalculate.length === 0) {
      message.warning('请先添加货物或选择要装载的货物');
      return;
    }

    setIsCalculating(true);

    try {
      const algorithmCargos = cargosToCalculate.map(convertToAlgorithmCargo);
      const algorithmContainer = convertToAlgorithmContainer(selectedContainer);

      const result = await new Promise<PackingResult>((resolve) => {
        setTimeout(() => {
          const ffdResult = ffdPacking(
            algorithmCargos,
            [algorithmContainer],
            {
              allowRotation: calculationConfig.allowRotation,
              prioritizeWeight: calculationConfig.prioritizeWeight,
            }
          );
          resolve(ffdResult);
        }, 1500);
      });

      const viewerResult = convertToViewerResult(result, cargoList);
      setLoadingResult(viewerResult);
      setCurrentStep(3);
      message.success('计算完成！');
    } catch (error) {
      message.error('计算过程出错，请重试');
      console.error(error);
    } finally {
      setIsCalculating(false);
    }
  }, [selectedContainer, cargoList, calculationConfig, selectedCargoIds]);

  const steps = [
    {
      title: '货物管理',
      icon: <InboxOutlined />,
    },
    {
      title: '集装箱选择',
      icon: <ContainerOutlined />,
    },
    {
      title: '计算配置',
      icon: <CalculatorOutlined />,
    },
    {
      title: '查看结果',
      icon: <FileTextOutlined />,
    },
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div>
            <CargoManager
              cargoList={cargoList}
              onCargoListChange={setCargoList}
              selectedCargoIds={selectedCargoIds}
              onSelectedCargoIdsChange={setSelectedCargoIds}
            />
            <div className="actions" style={{ marginTop: '24px' }}>
              <button
                className="btn-primary"
                onClick={() => setCurrentStep(1)}
                disabled={cargoList.length === 0}
              >
                下一步
              </button>
            </div>
          </div>
        );
      case 1:
        return (
          <div>
            <ContainerSelector
              selectedContainer={selectedContainer}
              onContainerSelect={setSelectedContainer}
              customContainers={customContainers}
              onCustomContainersChange={setCustomContainers}
            />
            <div className="actions" style={{ marginTop: '24px' }}>
              <button className="btn-secondary" onClick={() => setCurrentStep(0)}>
                上一步
              </button>
              <button
                className="btn-primary"
                onClick={() => setCurrentStep(2)}
                disabled={!selectedContainer}
              >
                下一步
              </button>
            </div>
          </div>
        );
      case 2:
        return (
          <div>
            <CalculationConfig
              config={calculationConfig}
              onConfigChange={setCalculationConfig}
              cargoList={cargoList}
              selectedContainer={selectedContainer}
              onCalculate={handleCalculate}
              isCalculating={isCalculating}
            />
            <div className="actions" style={{ marginTop: '24px' }}>
              <button className="btn-secondary" onClick={() => setCurrentStep(1)}>
                上一步
              </button>
            </div>
          </div>
        );
      case 3:
        return (
          <div>
            <ResultViewer
              result={loadingResult}
            />
            <div style={{ marginTop: '24px' }}>
              <div className="actions">
                <button className="btn-secondary" onClick={() => setCurrentStep(2)}>
                  重新计算
                </button>
                {loadingResult && (
                  <button
                    className="btn-primary"
                    onClick={() => setShow3DView(!show3DView)}
                  >
                    {show3DView ? '隐藏3D视图' : '查看3D可视化'}
                  </button>
                )}
              </div>
              {show3DView && loadingResult && (
                <div style={{ marginTop: '24px' }}>
                  <div className="step-content">
                    <h2>3D 装载可视化</h2>
                    <Container3D
                      {...convertTo3DData(loadingResult, selected3DContainerIndex)}
                      multiContainerData={convertToMultiContainer3DData(loadingResult)}
                      statistics={{
                        containerName: loadingResult.containers[selected3DContainerIndex]?.container.name || '-',
                        totalVolume: loadingResult.containers[selected3DContainerIndex]?.cargoList.reduce((sum, c) => sum + (c.length * c.width * c.height) / 1000000, 0) || 0,
                        volumeUtilization: loadingResult.containers[selected3DContainerIndex]?.volumeUtilization || 0,
                        totalWeight: loadingResult.containers[selected3DContainerIndex]?.totalWeight || 0,
                        totalWeightWithContainer: (loadingResult.containers[selected3DContainerIndex]?.totalWeight || 0) + (loadingResult.containers[selected3DContainerIndex]?.container.tareWeight || 0),
                        lengthTolerance: (loadingResult.containers[selected3DContainerIndex]?.container.length || 0) * 10 - loadingResult.containers[selected3DContainerIndex]?.cargoList.reduce((max, c) => Math.max(max, c.position.x + c.length), 0) * 10,
                        widthTolerance: (loadingResult.containers[selected3DContainerIndex]?.container.width || 0) * 10 - loadingResult.containers[selected3DContainerIndex]?.cargoList.reduce((max, c) => Math.max(max, c.position.z + c.width), 0) * 10,
                        heightTolerance: (loadingResult.containers[selected3DContainerIndex]?.container.height || 0) * 10 - loadingResult.containers[selected3DContainerIndex]?.cargoList.reduce((max, c) => Math.max(max, c.position.y + c.height), 0) * 10,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case 4:
        return <ContainerCapacityCalculator />;
      case 5:
        return <SolutionList />;
      case 6:
        return <SolutionComparison solutions={solutions} />;
      case 7:
        return <CargoTemplateManager />;
      case 8:
        return <LoadingGuide />;
      default:
        return null;
    }
  };

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#3182ce',
        },
      }}
    >
      <div className="app-container">
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-header">
            <span className="sidebar-icon">🚢</span>
            {!collapsed && <span className="sidebar-title">集装箱装载</span>}
          </div>

          <nav className="sidebar-nav">
            {!collapsed && <div className="nav-label">功能模块</div>}
            {navItems.map((item) => (
              <button
                key={item.key}
                className={`nav-btn ${currentStep === item.key ? 'active' : ''}`}
                onClick={() => setCurrentStep(item.key)}
                title={collapsed ? item.title : undefined}
              >
                <span className="nav-icon">{item.icon}</span>
                {!collapsed && <span className="nav-text">{item.title}</span>}
              </button>
            ))}
          </nav>

          {!collapsed && (
            <div className="sidebar-footer">
              <button
                className="calc-button"
                onClick={handleCalculate}
                disabled={!selectedContainer || cargoList.length === 0 || isCalculating}
              >
                {isCalculating ? (
                  <span>计算中...</span>
                ) : (
                  <>
                    <CalculatorOutlined />
                    <span>开始计算</span>
                  </>
                )}
              </button>
            </div>
          )}

          <button
            className="collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? '展开导航' : '收起导航'}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>
        </aside>

        <main className="main-content">
          <NewsMarquee />
          <header className="main-header">
            <div className="header-title-section">
              <h1>{navItems[currentStep]?.title || '货物管理'}</h1>
              <span className="main-subtitle">智能 3D 装载规划与可视化系统</span>
            </div>
            <WeatherWidget />
          </header>

          <div className="content-area">
            {renderStepContent()}
          </div>
        </main>
      </div>
    </ConfigProvider>
  );
};

export default App;
