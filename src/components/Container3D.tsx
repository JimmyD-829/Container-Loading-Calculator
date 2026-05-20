import React, { useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Line, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Button, Slider, Tooltip, Alert, Radio } from 'antd';
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  TableOutlined,
  TagOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ZoomInOutlined,
  RestOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { calculateCenterOfGravity, validateCenterOfGravity, DEFAULT_COG_CONFIG, ConstraintViolation } from '../algorithms/constraintSolver';
import { ContainerSpec, PlacedCargo } from '../types';

interface CargoBox {
  id: string;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  name: string;
  containerIndex: number;
}

interface ContainerDimensions {
  length: number;
  width: number;
  height: number;
}

interface ContainerProps {
  dimensions: ContainerDimensions;
  opacity?: number;
  containerIndex?: number;
}

const ContainerFrame: React.FC<ContainerProps> = ({ dimensions, opacity = 0.8, containerIndex = 0 }) => {
  const { length, width, height } = dimensions;
  
  const colors = ['#4299e1', '#48bb78', '#ed8936', '#9f7aea', '#f56565', '#38b2ac'];
  const frameColor = colors[containerIndex % colors.length];
  
  const points = useMemo(() => {
    const l = length / 2;
    const w = width / 2;
    const h = height / 2;
    
    const vertices = [
      [-l, -h, -w], [l, -h, -w], [l, -h, w], [-l, -h, w],
      [-l, h, -w], [l, h, -w], [l, h, w], [-l, h, w],
    ];
    
    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ];
    
    return edges.map(edge => [
      new THREE.Vector3(...vertices[edge[0]]),
      new THREE.Vector3(...vertices[edge[1]]),
    ]);
  }, [length, width, height]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -height / 2, 0]}>
        <planeGeometry args={[length, width]} />
        <meshStandardMaterial color="#4a5568" transparent opacity={0.3} />
      </mesh>
      
      {points.map((linePoints, index) => (
        <Line key={index} points={linePoints} color={frameColor} lineWidth={2} />
      ))}
      
      <mesh position={[length / 2, 0, 0]}>
        <planeGeometry args={[height, width]} />
        <meshStandardMaterial color="#2d3748" transparent opacity={opacity * 0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-length / 2, 0, 0]}>
        <planeGeometry args={[height, width]} />
        <meshStandardMaterial color="#2d3748" transparent opacity={opacity * 0.2} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[0, 0, width / 2]}>
        <planeGeometry args={[length, height]} />
        <meshStandardMaterial color="#2d3748" transparent opacity={opacity * 0.2} side={THREE.DoubleSide} />
      </mesh>
      
      <Html distanceFactor={5} position={[0, height / 2 + 0.3, 0]} center>
        <div style={{
          background: 'rgba(0,0,0,0.9)',
          color: 'white',
          padding: '4px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          border: `2px solid ${frameColor}`,
        }}>
          集装箱 #{containerIndex + 1}
        </div>
      </Html>
    </group>
  );
};

const CargoBoxMesh: React.FC<{ box: CargoBox; isSelected: boolean; onClick: () => void; showLabels: boolean; isWarning?: boolean; isError?: boolean }> = ({ box, isSelected, onClick, showLabels, isWarning, isError }) => {
  const meshRef = React.useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame(() => {
    if (meshRef.current && isSelected) {
      meshRef.current.rotation.y += 0.02;
    }
  });

  const emissiveColor = isError ? '#e53e3e' : isWarning ? '#ed8936' : box.color;
  const emissiveIntensity = (isSelected || hovered || isError || isWarning) ? 0.4 : 0;

  return (
    <group position={box.position}>
      <Box
        ref={meshRef}
        args={box.size}
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
      >
        <meshStandardMaterial 
          color={isError ? '#fc8181' : isWarning ? '#fbd38d' : box.color} 
          transparent 
          opacity={isSelected || hovered ? 0.9 : 0.8}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </Box>
      
      <Box args={box.size}>
        <meshBasicMaterial wireframe color={isSelected ? '#ffffff' : (isError ? '#e53e3e' : '#2d3748')} transparent opacity={isSelected ? 1 : (isError ? 0.8 : 0.5)} />
      </Box>
      
      {showLabels && (isSelected || hovered) && (
        <Html distanceFactor={5} position={[0, box.size[1] / 2 + 0.15, 0]} center>
          <div style={{
            background: 'rgba(0,0,0,0.9)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            border: `1px solid ${isError ? '#e53e3e' : (isWarning ? '#ed8936' : 'rgba(255,255,255,0.2')}`,
          }}>
            {box.name}
          </div>
        </Html>
      )}
    </group>
  );
};

const CenterOfGravity: React.FC<{ position: [number, number, number]; isValid: boolean; containerDimensions: ContainerDimensions }> = ({ position, isValid, containerDimensions }) => {
  const { length, width, height } = containerDimensions;
  
  const safeZoneSize = useMemo(() => {
    const config = DEFAULT_COG_CONFIG;
    return {
      x: length * config.maxOffsetX * 2,
      y: width * config.maxOffsetY * 2,
      z: height * config.maxOffsetZ * 2
    };
  }, [length, width, height]);

  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[safeZoneSize.x, safeZoneSize.y, safeZoneSize.z]} />
        <meshStandardMaterial 
          color={isValid ? '#48bb78' : '#e53e3e'} 
          transparent 
          opacity={0.2} 
          wireframe 
        />
      </mesh>
      
      <Sphere args={[0.15]}>
        <meshStandardMaterial 
          color={isValid ? '#48bb78' : '#e53e3e'} 
          emissive={isValid ? '#38a169' : '#c53030'} 
          emissiveIntensity={0.6} 
        />
      </Sphere>
      
      <Line points={[new THREE.Vector3(-0.8, 0, 0), new THREE.Vector3(0.8, 0, 0)]} color={isValid ? '#48bb78' : '#e53e3e'} lineWidth={3} />
      <Line points={[new THREE.Vector3(0, -0.8, 0), new THREE.Vector3(0, 0.8, 0)]} color={isValid ? '#48bb78' : '#e53e3e'} lineWidth={3} />
      <Line points={[new THREE.Vector3(0, 0, -0.8), new THREE.Vector3(0, 0, 0.8)]} color={isValid ? '#48bb78' : '#e53e3e'} lineWidth={3} />
      
      <Html distanceFactor={5} position={[0, 0.5, 0]} center>
        <div style={{
          background: isValid ? 'rgba(72, 187, 120, 0.95)' : 'rgba(229, 62, 62, 0.95)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}>
          {isValid ? '✓ 重心正常' : '✗ 重心超限'}
        </div>
      </Html>
    </group>
  );
};

const GridFloor: React.FC = () => {
  return <gridHelper args={[50, 50, '#4a5568', '#718096']} position={[0, -2.5, 0]} />;
};

interface Container3DSceneProps {
  containerDimensions: ContainerDimensions;
  cargoBoxes: CargoBox[];
  centerOfGravity: [number, number, number];
  isCogValid: boolean;
  selectedBoxId: string | null;
  onBoxSelect: (id: string | null) => void;
  showGrid: boolean;
  showCenterOfGravity: boolean;
  showLabels: boolean;
  containerOpacity: number;
  autoRotate: boolean;
  errorBoxIds: string[];
  warningBoxIds: string[];
  containerIndex: number;
  positionOffset: [number, number, number];
}

const Container3DScene: React.FC<Container3DSceneProps> = ({
  containerDimensions,
  cargoBoxes,
  centerOfGravity,
  isCogValid,
  selectedBoxId,
  onBoxSelect,
  showGrid,
  showCenterOfGravity,
  showLabels,
  containerOpacity,
  autoRotate,
  errorBoxIds,
  warningBoxIds,
  containerIndex,
  positionOffset,
}) => {
  return (
    <group position={positionOffset}>
      <ContainerFrame dimensions={containerDimensions} opacity={containerOpacity} containerIndex={containerIndex} />
      
      {cargoBoxes.map((box) => (
        <CargoBoxMesh
          key={box.id}
          box={box}
          isSelected={selectedBoxId === box.id}
          onClick={() => onBoxSelect(selectedBoxId === box.id ? null : box.id)}
          showLabels={showLabels}
          isError={errorBoxIds.includes(box.id)}
          isWarning={warningBoxIds.includes(box.id)}
        />
      ))}
      
      {showCenterOfGravity && cargoBoxes.length > 0 && (
        <CenterOfGravity 
          position={centerOfGravity} 
          isValid={isCogValid}
          containerDimensions={containerDimensions}
        />
      )}
    </group>
  );
};

interface MultiContainerData {
  containerDimensions: ContainerDimensions;
  cargoBoxes: CargoBox[];
  placedCargos: PlacedCargo[];
  containerSpec?: ContainerSpec;
  centerOfGravity: [number, number, number];
  isCogValid: boolean;
  errorBoxIds: string[];
  warningBoxIds: string[];
}

interface Container3DProps {
  containerDimensions?: ContainerDimensions;
  cargoBoxes?: CargoBox[];
  placedCargos?: PlacedCargo[];
  containerSpec?: ContainerSpec;
  className?: string;
  multiContainerData?: MultiContainerData[];
  statistics?: {
    containerName?: string;
    totalVolume?: number;
    volumeUtilization?: number;
    totalWeight?: number;
    totalWeightWithContainer?: number;
    lengthTolerance?: number;
    widthTolerance?: number;
    heightTolerance?: number;
  };
}

const Container3D: React.FC<Container3DProps> = ({
  containerDimensions = { length: 6, width: 2.5, height: 2.6 },
  cargoBoxes = [],
  placedCargos = [],
  containerSpec,
  className = '',
  multiContainerData = [],
  statistics,
}) => {
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showCenterOfGravity, setShowCenterOfGravity] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [containerOpacity, setContainerOpacity] = useState(0.8);
  const [autoRotate, setAutoRotate] = useState(false);
  const [containerHeight, setContainerHeight] = useState(700);
  const [viewMode, setViewMode] = useState<'single' | 'multi'>('single');
  const [constraintViolations, setConstraintViolations] = useState<ConstraintViolation[]>([]);
  const [constraintWarnings, setConstraintWarnings] = useState<ConstraintViolation[]>([]);
  
  useEffect(() => {
    const updateHeight = () => {
      const width = window.innerWidth;
      if (width < 480) {
        setContainerHeight(350);
      } else if (width < 768) {
        setContainerHeight(400);
      } else if (width < 1024) {
        setContainerHeight(500);
      } else {
        setContainerHeight(700);
      }
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);
  
  useEffect(() => {
    if (placedCargos.length > 0 && containerSpec) {
      const result = validateCenterOfGravity(placedCargos, containerSpec);
      setConstraintViolations(result.violations);
      setConstraintWarnings(result.warnings as unknown as ConstraintViolation[]);
    }
  }, [placedCargos, containerSpec]);
  
  useEffect(() => {
    if (multiContainerData.length > 1) {
      setViewMode('multi');
    }
  }, [multiContainerData]);
  
  const centerOfGravity = useMemo(() => {
    if (placedCargos.length === 0 || !containerSpec) {
      const centerX = containerDimensions.length / 2;
      const centerY = containerDimensions.width / 2;
      const centerZ = containerDimensions.height / 2;
      return [centerX, centerZ, centerY] as [number, number, number];
    }
    
    const cog = calculateCenterOfGravity(placedCargos, containerSpec);
    const centerX = containerDimensions.length / 2 + cog.x / 1000;
    const centerY = containerDimensions.height / 2 + cog.z / 1000;
    const centerZ = containerDimensions.width / 2 + cog.y / 1000;
    
    return [centerX, centerY, centerZ] as [number, number, number];
  }, [placedCargos, containerSpec, containerDimensions]);
  
  const isCogValid = constraintViolations.filter(v => v.type === 'centerOfGravity').length === 0;
  const errorBoxIds = constraintViolations.map(v => v.cargoId).filter(Boolean) as string[];
  const warningBoxIds = constraintWarnings.map(v => v.cargoId).filter(Boolean) as string[];
  
  const selectedBox = cargoBoxes.find(box => box.id === selectedBoxId);
  
  const handleResetView = () => {
    setSelectedBoxId(null);
  };
  
  const maxContainers = Math.max(multiContainerData.length, 1);
  const spacing = 3;
  const totalWidth = maxContainers * (containerDimensions.length + spacing) - spacing;
  const startOffset = -totalWidth / 2 + containerDimensions.length / 2;
  
  const getContainerOffset = (index: number): [number, number, number] => {
    const x = startOffset + index * (containerDimensions.length + spacing);
    return [x, 0, 0];
  };

  return (
    <div className={`w-full ${className} container3d-container`} style={{ minHeight: `${containerHeight + 180}px` }}>
      {multiContainerData.length > 1 && (
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: '500', color: '#2d3748' }}>
            共 {multiContainerData.length} 个集装箱
          </span>
          <Radio.Group 
            value={viewMode} 
            onChange={(e) => setViewMode(e.target.value as 'single' | 'multi')}
            buttonStyle="solid"
            style={{ marginLeft: '16px' }}
          >
            <Radio.Button value="single">逐个查看</Radio.Button>
            <Radio.Button value="multi">并排展示</Radio.Button>
          </Radio.Group>
        </div>
      )}
      
      <div 
        className="container3d-canvas"
        style={{ 
          height: `${containerHeight}px`, 
          borderRadius: '12px', 
          overflow: 'hidden', 
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)' 
        }}
      >
        <Canvas
          camera={{ position: viewMode === 'multi' ? [18 + maxContainers * 3, 12, 18 + maxContainers * 3] : [12, 10, 12], fov: Math.max(30, 40 - maxContainers * 2) }}
          style={{ background: 'linear-gradient(180deg, #1a202c 0%, #2d3748 50%, #4a5568 100%)', width: '100%', height: '100%' }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[15, 12, 10]} intensity={1} castShadow shadow-mapSize={[2048, 2048]} />
          <pointLight position={[-10, 10, -10]} intensity={0.4} />
          <pointLight position={[5, -5, 10]} intensity={0.3} />
          
          {multiContainerData.length > 0 && viewMode === 'multi' ? (
            multiContainerData.map((data, index) => (
              <Container3DScene
                key={index}
                containerDimensions={data.containerDimensions}
                cargoBoxes={data.cargoBoxes}
                centerOfGravity={data.centerOfGravity}
                isCogValid={data.isCogValid}
                selectedBoxId={selectedBoxId}
                onBoxSelect={setSelectedBoxId}
                showGrid={showGrid}
                showCenterOfGravity={showCenterOfGravity}
                showLabels={showLabels}
                containerOpacity={containerOpacity}
                autoRotate={autoRotate}
                errorBoxIds={data.errorBoxIds}
                warningBoxIds={data.warningBoxIds}
                containerIndex={index}
                positionOffset={getContainerOffset(index)}
              />
            ))
          ) : (
            <Container3DScene
              containerDimensions={containerDimensions}
              cargoBoxes={cargoBoxes}
              centerOfGravity={centerOfGravity}
              isCogValid={isCogValid}
              selectedBoxId={selectedBoxId}
              onBoxSelect={setSelectedBoxId}
              showGrid={showGrid}
              showCenterOfGravity={showCenterOfGravity}
              showLabels={showLabels}
              containerOpacity={containerOpacity}
              autoRotate={autoRotate}
              errorBoxIds={errorBoxIds}
              warningBoxIds={warningBoxIds}
              containerIndex={0}
              positionOffset={[0, 0, 0]}
            />
          )}
          
          {showGrid && <GridFloor />}
          
          <OrbitControls
            enableZoom={true}
            enablePan={true}
            enableRotate={true}
            minDistance={3}
            maxDistance={40}
            minPolarAngle={0}
            maxPolarAngle={Math.PI}
            enableDamping={true}
            dampingFactor={0.05}
            autoRotate={autoRotate}
            autoRotateSpeed={2}
          />
        </Canvas>
      </div>
      
      {(constraintViolations.length > 0 || constraintWarnings.length > 0) && (
        <div style={{ marginTop: '12px' }}>
          {constraintViolations.length > 0 && (
            <Alert
              message="约束违规"
              description={
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {constraintViolations.slice(0, 5).map((v, i) => (
                    <li key={i} style={{ fontSize: '13px', marginBottom: '4px' }}>{v.message}</li>
                  ))}
                  {constraintViolations.length > 5 && (
                    <li style={{ fontSize: '13px', color: '#a0aec0' }}>还有 {constraintViolations.length - 5} 条违规...</li>
                  )}
                </ul>
              }
              type="error"
              showIcon
              style={{ marginBottom: '8px' }}
            />
          )}
          {constraintWarnings.length > 0 && (
            <Alert
              message="约束警告"
              description={
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {constraintWarnings.slice(0, 5).map((w, i) => (
                    <li key={i} style={{ fontSize: '13px', marginBottom: '4px' }}>{w.message}</li>
                  ))}
                </ul>
              }
              type="warning"
              showIcon
            />
          )}
        </div>
      )}
      
      <div className="container3d-controls" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginTop: '16px',
        padding: '12px 16px',
        background: '#f7fafc',
        borderRadius: '8px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div className="container3d-controls-left" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Tooltip title="正面视图">
            <Button icon={<ArrowUpOutlined />} size="small" />
          </Tooltip>
          <Tooltip title="背面视图">
            <Button icon={<ArrowDownOutlined />} size="small" />
          </Tooltip>
          <Tooltip title="左侧视图">
            <Button icon={<ArrowLeftOutlined />} size="small" />
          </Tooltip>
          <Tooltip title="右侧视图">
            <Button icon={<ArrowRightOutlined />} size="small" />
          </Tooltip>
          <Tooltip title="顶部视图">
            <Button icon={<TagOutlined />} size="small" />
          </Tooltip>
          <Tooltip title="等轴测视图">
            <Button icon={<ZoomInOutlined />} size="small" />
          </Tooltip>
          
          <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }} />
          
          <Tooltip title="重置视图">
            <Button icon={<RestOutlined />} onClick={handleResetView} size="small" />
          </Tooltip>
          <Tooltip title={autoRotate ? '停止旋转' : '自动旋转'}>
            <Button icon={autoRotate ? <EyeInvisibleOutlined /> : <EyeOutlined />} onClick={() => setAutoRotate(!autoRotate)} size="small" type={autoRotate ? 'primary' : 'default'} />
          </Tooltip>
        </div>
        
        <div className="container3d-controls-right" style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#718096' }}>网格</span>
            <Button type={showGrid ? 'primary' : 'default'} size="small" onClick={() => setShowGrid(!showGrid)}>
              <TableOutlined />
            </Button>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#718096' }}>重心</span>
            <Button type={showCenterOfGravity ? 'primary' : 'default'} size="small" onClick={() => setShowCenterOfGravity(!showCenterOfGravity)}>
              {isCogValid ? <CheckCircleOutlined /> : <WarningOutlined />}
            </Button>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#718096' }}>标签</span>
            <Button type={showLabels ? 'primary' : 'default'} size="small" onClick={() => setShowLabels(!showLabels)}>
              <EyeOutlined />
            </Button>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#718096' }}>透明度</span>
            <Slider min={0} max={1} step={0.1} value={containerOpacity} onChange={setContainerOpacity} style={{ width: '100px' }} />
          </div>
        </div>
      </div>
      
      {statistics && (
        <div className="container3d-stats" style={{
          marginTop: '16px',
          padding: '16px',
          background: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>集装箱</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#2d3748' }}>{statistics.containerName || '-'}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>货物体积 (m³)</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#2d3748' }}>{statistics.totalVolume?.toFixed(2) || '-'} m³</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>体积利用率</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#38a169' }}>{statistics.volumeUtilization?.toFixed(2) || '-'}%</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>货物重量 (kg)</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#2d3748' }}>{statistics.totalWeight?.toFixed(2) || '-'} kg</div>
            </div>
          </div>
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>货物+集装箱 (kg)</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#2d3748' }}>{statistics.totalWeightWithContainer?.toFixed(2) || '-'} kg</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>长度公差 (mm)</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#ed8936' }}>{statistics.lengthTolerance?.toFixed(2) || '-'} mm</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>宽度公差 (mm)</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#ed8936' }}>{statistics.widthTolerance?.toFixed(2) || '-'} mm</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>高度公差 (mm)</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#ed8936' }}>{statistics.heightTolerance?.toFixed(2) || '-'} mm</div>
            </div>
          </div>
        </div>
      )}
      
      {selectedBox && (
        <div className="container3d-detail" style={{
          marginTop: '16px',
          padding: '16px',
          background: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#2d3748' }}>
            选中货物详情
          </h4>
          <div className="container3d-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
            <div>
              <span style={{ color: '#718096', fontSize: '12px' }}>名称</span>
              <p style={{ margin: '4px 0 0 0', fontWeight: '500' }}>{selectedBox.name}</p>
            </div>
            <div>
              <span style={{ color: '#718096', fontSize: '12px' }}>所属集装箱</span>
              <p style={{ margin: '4px 0 0 0', fontWeight: '500' }}>#{selectedBox.containerIndex + 1}</p>
            </div>
            <div>
              <span style={{ color: '#718096', fontSize: '12px' }}>尺寸</span>
              <p style={{ margin: '4px 0 0 0' }}>
                {selectedBox.size[0].toFixed(2)} × {selectedBox.size[1].toFixed(2)} × {selectedBox.size[2].toFixed(2)} m
              </p>
            </div>
            <div>
              <span style={{ color: '#718096', fontSize: '12px' }}>位置</span>
              <p style={{ margin: '4px 0 0 0' }}>
                ({selectedBox.position[0].toFixed(2)}, {selectedBox.position[1].toFixed(2)}, {selectedBox.position[2].toFixed(2)})
              </p>
            </div>
            <div>
              <span style={{ color: '#718096', fontSize: '12px' }}>颜色</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <div className="cargo-detail-box" style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: selectedBox.color, border: '1px solid #e2e8f0' }} />
                <span>{selectedBox.color}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const sampleCargoBoxes: CargoBox[] = [
  { id: '1', position: [-1.5, -0.5, -0.5], size: [1.2, 1, 1], color: '#4299e1', name: '货物 A', containerIndex: 0 },
  { id: '2', position: [0.5, -0.5, -0.5], size: [1.2, 1, 1], color: '#48bb78', name: '货物 B', containerIndex: 0 },
  { id: '3', position: [2, -0.5, -0.5], size: [1, 1, 1], color: '#ed8936', name: '货物 C', containerIndex: 0 },
  { id: '4', position: [-1.5, -0.5, 0.8], size: [1.2, 1, 0.8], color: '#9f7aea', name: '货物 D', containerIndex: 0 },
  { id: '5', position: [0.5, -0.5, 0.8], size: [1.2, 1, 0.8], color: '#f56565', name: '货物 E', containerIndex: 0 },
  { id: '6', position: [-1.5, 0.6, -0.5], size: [1.2, 0.8, 1], color: '#38b2ac', name: '货物 F', containerIndex: 0 },
  { id: '7', position: [0.5, 0.6, -0.5], size: [1.2, 0.8, 1], color: '#d69e2e', name: '货物 G', containerIndex: 0 },
];

export type { CargoBox, ContainerDimensions, Container3DProps, MultiContainerData };
export default Container3D;