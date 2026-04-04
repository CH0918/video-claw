'use client';

import { cn } from '@/shared/lib/utils';

/* 11×9 pixel grid — each cell rendered as a 2×2 SVG rect */
const P = 2; // pixel size
const BODY: [number, number][] = [
  /* row 2 – body top */  [3,2],[4,2],[5,2],[6,2],[7,2],
  /* row 3 – body */      [3,3],[4,3],[5,3],[6,3],[7,3],
  /* row 4 – body wide */ [2,4],[3,4],[4,4],[5,4],[6,4],[7,4],[8,4],
  /* row 5 – body */      [2,5],[3,5],[4,5],[5,5],[6,5],[7,5],[8,5],
  /* row 6 – body bottom */ [3,6],[4,6],[5,6],[6,6],[7,6],
];
const EYES: [number, number][] = [[3,0],[7,0]];
const STALKS: [number, number][] = [[3,1],[7,1]];
const CLAW_L: [number, number][] = [[0,2],[1,2],[0,3]];
const CLAW_R: [number, number][] = [[9,2],[10,2],[10,3]];
const LEGS_A: [number, number][] = [[1,7],[3,7],[7,7],[9,7],[0,8],[4,8],[6,8],[10,8]];
const LEGS_B: [number, number][] = [[0,7],[3,7],[7,7],[10,7],[1,8],[4,8],[6,8],[9,8]];

function Pixels({ cells, className, style }: { cells: [number, number][]; className?: string; style?: React.CSSProperties }) {
  return (
    <g className={className} style={style}>
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x * P} y={y * P} width={P} height={P} fill="currentColor" />
      ))}
    </g>
  );
}

export function ClaudeCodeLoading({
  className,
  label = 'Loading',
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn('text-primary inline-flex items-center gap-2', className)}
      aria-label={label}
      role="status"
    >
      <span className="sr-only">{label}</span>

      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${11 * P} ${9 * P}`}
        className="h-[18px] w-[22px]"
        shapeRendering="crispEdges"
        style={{ animation: 'crab-walk 0.6s steps(2) infinite' }}
      >
        <Pixels cells={BODY} style={{ opacity: 0.2 }} />
        <Pixels cells={BODY} style={{ opacity: 1, clipPath: 'inset(0 0 50% 0)' }} />
        <Pixels cells={STALKS} />
        <Pixels cells={EYES} style={{ animation: 'crab-blink 3s steps(1) infinite' }} />
        <Pixels cells={CLAW_L} style={{ animation: 'crab-claw-l 0.8s steps(1) infinite' }} />
        <Pixels cells={CLAW_R} style={{ animation: 'crab-claw-r 0.8s steps(1) infinite' }} />
        <Pixels cells={LEGS_A} style={{ animation: 'crab-legs 0.4s steps(1) infinite' }} />
        <Pixels cells={LEGS_B} style={{ animation: 'crab-legs-alt 0.4s steps(1) infinite' }} />
      </svg>

      <style>{`
        @keyframes crab-walk {
          0%, 100% { transform: translateX(-1px); }
          50% { transform: translateX(1px); }
        }
        @keyframes crab-claw-l {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-${P}px, -${P}px); }
        }
        @keyframes crab-claw-r {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(${P}px, -${P}px); }
        }
        @keyframes crab-legs {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes crab-legs-alt {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        @keyframes crab-blink {
          0%, 85%, 91%, 100% { opacity: 1; }
          88% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
