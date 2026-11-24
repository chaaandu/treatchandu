"use client";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Suspense } from "react";
import { Head } from "./Head";
import { Sweets } from "./Sweets";

/** One fixed, click-through canvas over the whole page: the head and every 3D sweet live here. */
export default function Scene() {
  return (
    <div className="scene" aria-hidden>
      <Canvas
        dpr={[1, 2]}
        camera={{ fov: 25, position: [0, 0, 10], near: 0.1, far: 50 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        style={{ pointerEvents: "none" }}
        eventSource={undefined}
      >
        <hemisphereLight args={["#cfe3ff", "#f3d9b0", 1.1]} />
        <directionalLight position={[3, 5, 6]} intensity={2.2} color="#fff4e0" />
        <directionalLight position={[-4, -2, 3]} intensity={0.5} color="#9cc3ff" />
        <Environment resolution={128} frames={1}>
          <Lightformer intensity={2.4} position={[0, 4, 3]} scale={[8, 3, 1]} color="#ffffff" />
          <Lightformer intensity={1.2} position={[-5, 0, 2]} scale={[3, 6, 1]} color="#bcd8ff" />
          <Lightformer intensity={1.4} position={[5, -1, 2]} scale={[3, 6, 1]} color="#ffd8a8" />
          <Lightformer intensity={0.6} position={[0, -4, 1]} scale={[10, 2, 1]} color="#ff9a4d" />
        </Environment>
        <Suspense fallback={null}>
          <Head />
        </Suspense>
        <Sweets />
      </Canvas>
    </div>
  );
}
