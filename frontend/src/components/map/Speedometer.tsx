"use client";

interface SpeedometerProps {
  speed: number;
  maxSpeed?: number;
  size?: number;
  className?: string;
}

export function Speedometer({ speed, maxSpeed = 140, size = 160, className = "" }: SpeedometerProps) {
  const normalizedSpeed = Math.min(speed, maxSpeed);
  const percentage = (normalizedSpeed / maxSpeed) * 100;

  // Arc goes from -135° to 135° (270° total sweep)
  const startAngle = -135;
  const endAngle = 135;
  const sweepAngle = endAngle - startAngle;
  const currentAngle = startAngle + (percentage / 100) * sweepAngle;

  // Calculate needle position
  const centerX = size / 2;
  const centerY = size / 2;
  const needleLength = size * 0.35;
  const needleAngleRad = (currentAngle * Math.PI) / 180;
  const needleX = centerX + needleLength * Math.cos(needleAngleRad);
  const needleY = centerY + needleLength * Math.sin(needleAngleRad);

  // Arc path for the gauge background
  const radius = size * 0.4;
  const arcPath = describeArc(centerX, centerY, radius, startAngle, endAngle);
  const filledArcPath = describeArc(centerX, centerY, radius, startAngle, currentAngle);

  // Speed zone colors
  const getSpeedColor = () => {
    if (speed <= 40) return "#16A34A"; // green
    if (speed <= 80) return "#F59E0B"; // amber
    return "#DC2626"; // red
  };

  // Generate tick marks
  const ticks = [];
  const tickCount = 8;
  for (let i = 0; i <= tickCount; i++) {
    const tickValue = Math.round((maxSpeed / tickCount) * i);
    const tickAngle = startAngle + (i / tickCount) * sweepAngle;
    const tickAngleRad = (tickAngle * Math.PI) / 180;
    const innerR = radius - 8;
    const outerR = radius + 4;
    const textR = radius + 18;

    const x1 = centerX + innerR * Math.cos(tickAngleRad);
    const y1 = centerY + innerR * Math.sin(tickAngleRad);
    const x2 = centerX + outerR * Math.cos(tickAngleRad);
    const y2 = centerY + outerR * Math.sin(tickAngleRad);
    const tx = centerX + textR * Math.cos(tickAngleRad);
    const ty = centerY + textR * Math.sin(tickAngleRad);

    ticks.push(
      <g key={i}>
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="rgba(148, 163, 184, 0.6)"
          strokeWidth={i % 2 === 0 ? 2 : 1}
        />
        {i % 2 === 0 && (
          <text
            x={tx}
            y={ty}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#94a3b8"
            fontSize={size * 0.065}
            fontWeight="500"
          >
            {tickValue}
          </text>
        )}
      </g>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background arc */}
        <path
          d={arcPath}
          fill="none"
          stroke="rgba(100, 116, 139, 0.2)"
          strokeWidth={size * 0.06}
          strokeLinecap="round"
        />

        {/* Colored progress arc */}
        <path
          d={filledArcPath}
          fill="none"
          stroke={getSpeedColor()}
          strokeWidth={size * 0.06}
          strokeLinecap="round"
          style={{ transition: "stroke 0.3s, d 0.3s" }}
        />

        {/* Tick marks */}
        {ticks}

        {/* Center hub */}
        <circle cx={centerX} cy={centerY} r={size * 0.08} fill="#0F2742" />
        <circle cx={centerX} cy={centerY} r={size * 0.05} fill={getSpeedColor()} />

        {/* Needle */}
        <line
          x1={centerX}
          y1={centerY}
          x2={needleX}
          y2={needleY}
          stroke="#f1f5f9"
          strokeWidth={3}
          strokeLinecap="round"
          style={{ transition: "x2 0.3s, y2 0.3s" }}
        />

        {/* Speed value */}
        <text
          x={centerX}
          y={centerY + size * 0.22}
          textAnchor="middle"
          fill="#f1f5f9"
          fontSize={size * 0.18}
          fontWeight="700"
          fontFamily="'JetBrains Mono', monospace"
        >
          {Math.round(speed)}
        </text>
        <text
          x={centerX}
          y={centerY + size * 0.32}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={size * 0.08}
          fontWeight="500"
        >
          km/h
        </text>
      </svg>
    </div>
  );
}

// Helper function to create SVG arc path
function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  return [
    "M", start.x, start.y,
    "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(" ");
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
}