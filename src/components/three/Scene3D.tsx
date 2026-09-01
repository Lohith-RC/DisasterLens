'use client';
import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import FloatingGeometry from './FloatingGeometry';

interface Scene3DProps {
  scrollProgress: number;
}

function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} color="#3b82f6" />
      <directionalLight position={[-5, -3, 2]} intensity={0.6} color="#f59e0b" />
      <pointLight position={[0, 2, 3]} intensity={0.8} color="#60a5fa" />
      <spotLight position={[-3, 4, 2]} angle={0.4} penumbra={0.8} intensity={0.5} color="#f59e0b" />
    </>
  );
}

function CameraController({ scrollProgress }: { scrollProgress: number }) {
  useFrame(({ camera }) => {
    const zOffset = scrollProgress * 3;
    const yOffset = scrollProgress * -0.5;
    camera.position.z = 5 + zOffset;
    camera.position.y = 1 + yOffset;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function Scene3D({ scrollProgress }: Scene3DProps) {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      <Canvas
        camera={{ position: [0, 1, 5], fov: 50, near: 0.1, far: 100 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
      >
        <Suspense fallback={null}>
          <SceneLights />
          <FloatingGeometry scrollProgress={scrollProgress} />
          <CameraController scrollProgress={scrollProgress} />
          <Environment preset="night" />
        </Suspense>
      </Canvas>
    </div>
  );
}
