import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface AudioVisualizerProps {
  frequencyData: Uint8Array;
  amplitude: number;
  isActive: boolean;
}

const BAR_COUNT = 48;
const RADIUS = 72;
const MIN_BAR_HEIGHT = 2;
const MAX_BAR_HEIGHT = 28;

export function AudioVisualizer({ frequencyData, amplitude, isActive }: AudioVisualizerProps) {
  const bars = useMemo(() => {
    const result: { angle: number; height: number }[] = [];
    const step = Math.max(1, Math.floor(frequencyData.length / BAR_COUNT));

    for (let i = 0; i < BAR_COUNT; i++) {
      const dataIndex = Math.min(i * step, frequencyData.length - 1);
      const value = frequencyData[dataIndex] ?? 0;
      const normalized = value / 255;
      const height = MIN_BAR_HEIGHT + normalized * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT);
      const angle = (i / BAR_COUNT) * 360;
      result.push({ angle, height });
    }

    return result;
  }, [frequencyData]);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: isActive ? 1 : 0 }}
      transition={{ duration: 0.4 }}
    >
      <svg
        width="200"
        height="200"
        viewBox="0 0 200 200"
        className="absolute"
      >
        {bars.map((bar, i) => {
          const angleRad = (bar.angle * Math.PI) / 180;
          const innerR = RADIUS;
          const outerR = RADIUS + bar.height;
          const x1 = 100 + innerR * Math.cos(angleRad);
          const y1 = 100 + innerR * Math.sin(angleRad);
          const x2 = 100 + outerR * Math.cos(angleRad);
          const y2 = 100 + outerR * Math.sin(angleRad);

          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#FFD400"
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.4 + (bar.height / MAX_BAR_HEIGHT) * 0.6}
            />
          );
        })}
      </svg>

      {/* Ambient glow that responds to amplitude */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 180,
          height: 180,
          background: `radial-gradient(circle, rgba(255,212,0,${0.06 + amplitude * 0.12}) 0%, transparent 70%)`,
        }}
        animate={{
          scale: 1 + amplitude * 0.15,
        }}
        transition={{ duration: 0.1 }}
      />
    </motion.div>
  );
}
