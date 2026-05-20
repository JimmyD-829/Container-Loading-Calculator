import React, { useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Line, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Button, Slider, Tooltip } from 'antd';
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
} from '@ant-design/icons';

interface CargoBox {
  id: string;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  name: string;
}

interface ContainerDimensions {
  length: number;
  width: number;
  height: number;
}

interface ContainerProps {
  dimensions: ContainerDimensions;
  opacity?: number;
}

const ContainerFrame: React.FC<ContainerProps> = ({ dimensions, opacity = 0.8 }) => {
  const { length, width, height } = dimensions;
  
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
        <Line key={index} points={linePoints} color="#4a5568" lineWidth={2} />
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
    </group>
  );
};

const CargoBoxMesh: React.FC<{ box: CargoBox; isSelected: boolean; onClick: () => void; showLabels: boolean }> = ({ box, isSelected, onClick, showLabels }) => {
  const meshRef = React.useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current && isSelected) {
      meshRef.current.rotation.y += 0.02;
    }
  });

  return (
    <group position={box.position}>
      <Box
        ref={meshRef}
        args={box.size}
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        <meshStandardMaterial 
          color={box.color} 
          transparent 
          opacity={isSelected ? 0.9 : 0.8}
          emissive={isSelected ? box.color : '#000000'}
          emissiveIntensity={isSelected ? 0.4 : 0}
        />
      </Box>
      
      <Box args={box.size}>
        <meshBasicMaterial wireframe color={isSelected ? '#ffffff' : '#2d3748'} transparent opacity={isSelected ? 1 : 0.5} />
      </Box>
      
      {showLabels && (
        <Html distanceFactor={10} position={[0, box.size[1] / 2 + 0.1, 0]}>
          <div style={{
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            opacity: isSelected ? 1 : 0.7,
            transition: 'opacity 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}>
            {box.name}
          </div>
        </Html>
      )}
    </group>
  );
};

const CenterOfGravity: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  return (
    <group position={position}>
      <Sphere args={[0.12]}>
        <meshStandardMaterial color="#e53e3e" emissive="#c53030" emissiveIntensity={0.6} />
      </Sphere>
      
      <Line points={[new THREE.Vector3(-0.6, 0, 0), new THREE.Vector3(0.6, 0, 0)]} color="#e53e3e" lineWidth={3} />
      <Line points={[new THREE.Vector3(0, -0.6, 0), new THREE.Vector3(0, 0.6, 0)]} color="#e53e3e" lineWidth={3} />
      <Line points={[new THREE.Vector3(0, 0, -0.6), new THREE.Vector3(0, 0, 0.6)]} color="#e53e3e" lineWidth={3} />
      
      <Html distanceFactor={10} position={[0, 0.35, 0]}>
        <div style={{
          background: 'rgba(229, 62, 62, 0.95)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}>
          重心 CG
        </div>
      </Html>
    </group>
  );
};

const GridFloor: React.FC = () => {
  return <gridHelper args={[30, 30, '#4a5568', '#718096']} position={[0, -2.5, 0]} />;
};

interface Container3DSceneProps {
  containerDimensions: ContainerDimensions;
  cargoBoxes: CargoBox[];
  centerOfGravity: [number, number, number];
  selectedBoxId: string | null;
  onBoxSelect: (id: string | null) => void;
  showGrid: boolean;
  showCenterOfGravity: boolean;
  showLabels: boolean;
  containerOpacity: number;
  autoRotate: boolean;
}

const Container3DScene: React.FC<Container3DSceneProps> = ({
  containerDimensions,
  cargoBoxes,
  centerOfGravity,
  selectedBoxId,
  onBoxSelect,
  showGrid,
  showCenterOfGravity,
  showLabels,
  containerOpacity,
  autoRotate,
}) => {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[15, 12, 10]} intensity={1} castShadow shadow-mapSize={[2048, 2048]} />
      <pointLight position={[-10, 10, -10]} intensity={0.4} />
      <pointLight position={[5, -5, 10]} intensity={0.3} />
      
      <ContainerFrame dimensions={containerDimensions} opacity={containerOpacity} />
      
      {cargoBoxes.map((box) => (
        <CargoBoxMesh
          key={box.id}
          box={box}
          isSelected={selectedBoxId === box.id}
          onClick={() => onBoxSelect(selectedBoxId === box.id ? null : box.id)}
          showLabels={showLabels}
        />
      ))}
      
      {showCenterOfGravity && <CenterOfGravity position={centerOfGravity} />}
      {showGrid && <GridFloor />}
      
      <OrbitControls
        minDistance={4}
        maxDistance={25}
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        target={[0, 0, 0]}
        autoRotate={autoRotate}
        autoRotateSpeed={2}
      />
    </>
  );
};

interface Container3DProps {
  containerDimensions?: ContainerDimensions;
  cargoBoxes?: CargoBox[];
  centerOfGravity?: [number, number, number];
  className?: string;
}

const Container3D: React.FC<Container3DProps> = ({
  containerDimensions = { length: 6, width: 2.5, height: 2.6 },
  cargoBoxes = [],
  centerOfGravity = [0, 0, 0],
  className = '',
}) => {
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showCenterOfGravity, setShowCenterOfGravity] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [containerOpacity, setContainerOpacity] = useState(0.8);
  const [autoRotate, setAutoRotate] = useState(false);
  
  const selectedBox = cargoBoxes.find(box => box.id === selectedBoxId);
  
  const handleResetView = () => {
    setSelectedBoxId(null);
  };
  
  const handlePresetView = (view: string) => {
    const cameraPositions: Record<string, [number, number, number]> = {
      front: [0, 4, 8],
      back: [0, 4, -8],
      left: [-8, 4, 0],
      right: [8, 4, 0],
      top: [0, 12, 0],
      iso: [8, 8, 8],
    };
  };

  return (
    <div className={`w-full ${className}`} style={{ minHeight: '700px' }}>
      <div style={{ height: '700px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
        <Canvas
          camera={{ position: [12, 10, 12], fov: 40 }}
          style={{ background: 'linear-gradient(180deg, #1a202c 0%, #2d3748 50%, #4a5568 100%)', width: '100%', height: '100%' }}
        >
          <Container3DScene
            containerDimensions={containerDimensions}
            cargoBoxes={cargoBoxes}
            centerOfGravity={centerOfGravity}
            selectedBoxId={selectedBoxId}
            onBoxSelect={setSelectedBoxId}
            showGrid={showGrid}
            showCenterOfGravity={showCenterOfGravity}
            showLabels={showLabels}
            containerOpacity={containerOpacity}
            autoRotate={autoRotate}
          />
        </Canvas>
      </div>
      
      <div style={{ 
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
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Tooltip title="正面视图">
            <Button icon={<ArrowUpOutlined />} onClick={() => handlePresetView('front')} size="small" />
          </Tooltip>
          <Tooltip title="背面视图">
            <Button icon={<ArrowDownOutlined />} onClick={() => handlePresetView('back')} size="small" />
          </Tooltip>
          <Tooltip title="左侧视图">
            <Button icon={<ArrowLeftOutlined />} onClick={() => handlePresetView('left')} size="small" />
          </Tooltip>
          <Tooltip title="右侧视图">
            <Button icon={<ArrowRightOutlined />} onClick={() => handlePresetView('right')} size="small" />
          </Tooltip>
          <Tooltip title="顶部视图">
            <Button icon={<TagOutlined />} onClick={() => handlePresetView('top')} size="small" />
          </Tooltip>
          <Tooltip title="等轴测视图">
            <Button icon={<ZoomInOutlined />} onClick={() => handlePresetView('iso')} size="small" />
          </Tooltip>
          
          <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }} />
          
          <Tooltip title="重置视图">
            <Button icon={<RestOutlined />} onClick={handleResetView} size="small" />
          </Tooltip>
          <Tooltip title={autoRotate ? '停止旋转' : '自动旋转'}>
            <Button icon={autoRotate ? <EyeInvisibleOutlined /> : <EyeOutlined />} onClick={() => setAutoRotate(!autoRotate)} size="small" type={autoRotate ? 'primary' : 'default'} />
          </Tooltip>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#718096' }}>网格</span>
            <Button type={showGrid ? 'primary' : 'default'} size="small" onClick={() => setShowGrid(!showGrid)}>
              <TableOutlined />
            </Button>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#718096' }}>重心</span>
            <Button type={showCenterOfGravity ? 'primary' : 'default'} size="small" onClick={() => setShowCenterOfGravity(!showCenterOfGravity)}>
              <TagOutlined />
            </Button>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#718096' }}>标签</span>
            <Button type={showLabels ? 'primary' : 'default'} size="small" onClick={() => setShowLabels(!showLabels)}>
              <EyeOutlined />
            </Button>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#718096' }}>容器透明度</span>
            <Slider min={0} max={1} step={0.1} value={containerOpacity} onChange={setContainerOpacity} style={{ width: '100px' }} />
          </div>
        </div>
      </div>
      
      {selectedBox && (
        <div style={{
          marginTop: '16px',
          padding: '16px',
          background: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#2d3748' }}>
            选中货物详情
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
            <div>
              <span style={{ color: '#718096', fontSize: '12px' }}>名称</span>
              <p style={{ margin: '4px 0 0 0', fontWeight: '500' }}>{selectedBox.name}</p>
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
                <div style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: selectedBox.color, border: '1px solid #e2e8f0' }} />
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
  { id: '1', position: [-1.5, -0.5, -0.5], size: [1.2, 1, 1], color: '#4299e1', name: '货物 A' },
  { id: '2', position: [0.5, -0.5, -0.5], size: [1.2, 1, 1], color: '#48bb78', name: '货物 B' },
  { id: '3', position: [2, -0.5, -0.5], size: [1, 1, 1], color: '#ed8936', name: '货物 C' },
  { id: '4', position: [-1.5, -0.5, 0.8], size: [1.2, 1, 0.8], color: '#9f7aea', name: '货物 D' },
  { id: '5', position: [0.5, -0.5, 0.8], size: [1.2, 1, 0.8], color: '#f56565', name: '货物 E' },
  { id: '6', position: [-1.5, 0.6, -0.5], size: [1.2, 0.8, 1], color: '#38b2ac', name: '货物 F' },
  { id: '7', position: [0.5, 0.6, -0.5], size: [1.2, 0.8, 1], color: '#d69e2e', name: '货物 G' },
];

export type { CargoBox, ContainerDimensions, Container3DProps };
export default Container3D;
