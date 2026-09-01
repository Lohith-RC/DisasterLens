'use client';
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

interface FloatingGeometryProps {
  scrollProgress: number;
}

export default function FloatingGeometry({ scrollProgress }: FloatingGeometryProps) {
  const groupRef = useRef<THREE.Group>(null);
  const icoRef = useRef<THREE.Mesh>(null);
  const knotRef = useRef<THREE.Mesh>(null);

  const particles = useMemo(() => {
    const count = 400;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 8 + Math.random() * 12;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      const color = new THREE.Color().setHSL(0.58 + Math.random() * 0.08, 0.8, 0.4 + Math.random() * 0.3);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    return { positions, colors };
  }, []);

  const particlesRef = useRef<THREE.Points>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      const rotSpeed = 0.15 + scrollProgress * 0.4;
      groupRef.current.rotation.y += delta * rotSpeed;
      groupRef.current.rotation.x = Math.sin(Date.now() * 0.0003) * 0.1 + scrollProgress * 0.15;
    }
    if (icoRef.current) {
      icoRef.current.rotation.x += delta * 0.2;
      icoRef.current.rotation.y += delta * 0.3;
    }
    if (knotRef.current) {
      knotRef.current.rotation.x += delta * 0.25;
      knotRef.current.rotation.y += delta * 0.4;
    }
    if (particlesRef.current) {
      particlesRef.current.rotation.y += delta * 0.03;
    }
  });

  return (
    <group ref={groupRef}>
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
        <mesh ref={icoRef} position={[0, 0.5, 0]}>
          <icosahedronGeometry args={[1.2, 0]} />
          <MeshDistortMaterial
            color="#3b82f6"
            emissive="#1d4ed8"
            emissiveIntensity={0.4}
            roughness={0.2}
            metalness={0.8}
            distort={0.15 + scrollProgress * 0.2}
            speed={2}
          />
        </mesh>
      </Float>

      <Float speed={0.8} rotationIntensity={0.1} floatIntensity={0.3}>
        <mesh ref={knotRef} position={[2.8, -0.8, -1.5]}>
          <torusKnotGeometry args={[0.6, 0.25, 64, 8]} />
          <meshStandardMaterial
            color="#f59e0b"
            emissive="#f59e0b"
            emissiveIntensity={0.2}
            roughness={0.3}
            metalness={0.6}
            wireframe
          />
        </mesh>
      </Float>

      <Float speed={0.6} rotationIntensity={0.15} floatIntensity={0.4}>
        <mesh position={[-2.5, 1.2, -2]} rotation={[0.5, 0.3, 0]}>
          <octahedronGeometry args={[0.8, 0]} />
          <meshStandardMaterial
            color="#60a5fa"
            emissive="#3b82f6"
            emissiveIntensity={0.15}
            roughness={0.4}
            metalness={0.5}
            transparent
            opacity={0.7}
          />
        </mesh>
      </Float>

      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particles.positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[particles.colors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.06}
          vertexColors
          transparent
          opacity={0.8}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
