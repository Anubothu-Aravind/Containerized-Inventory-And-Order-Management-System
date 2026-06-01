import React, { useState } from "react";

// Mini Sparkline for KPI Cards
export const MiniSparkline = ({ data = [], color = "var(--accent)" }) => {
  if (data.length < 2) return null;
  const values = data.map(d => d.value || 0);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const width = 100;
  const height = 30;
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - 2 - ((d.value - min) / range) * (height - 4);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="sparkline" width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

// Sales Trend Area Chart
export const SalesTrendChart = ({ data = [] }) => {
  const [hoverIndex, setHoverIndex] = useState(null);
  
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted">
        No sales data available
      </div>
    );
  }

  const values = data.map(d => d.value);
  const max = Math.max(...values, 1000);
  const maxAxis = Math.ceil(max / 500) * 500;
  
  const width = 500;
  const height = 200;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 25;
  
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const points = data.map((d, i) => {
    const x = paddingLeft + (i / (data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - (d.value / maxAxis) * chartHeight;
    return { x, y, label: d.label, value: d.value };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;

  // Grid lines
  const gridLines = [];
  for (let i = 0; i <= 4; i++) {
    const val = (i / 4) * maxAxis;
    const y = paddingTop + chartHeight - (val / maxAxis) * chartHeight;
    gridLines.push({ y, value: val });
  }

  return (
    <div className="chart-wrapper" style={{ position: "relative" }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.00" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {gridLines.map((line, idx) => (
          <g key={idx}>
            <line
              x1={paddingLeft}
              y1={line.y}
              x2={width - paddingRight}
              y2={line.y}
              stroke="var(--border)"
              strokeWidth="0.8"
              strokeDasharray="4 4"
            />
            <text
              x={paddingLeft - 8}
              y={line.y + 4}
              textAnchor="end"
              fontSize="10"
              fontWeight="600"
              fill="var(--muted)"
            >
              ₹{line.value.toLocaleString()}
            </text>
          </g>
        ))}

        {/* X Axis Labels */}
        {points.map((p, idx) => (
          <text
            key={idx}
            x={p.x}
            y={height - 6}
            textAnchor="middle"
            fontSize="10"
            fontWeight="600"
            fill="var(--muted)"
          >
            {p.label}
          </text>
        ))}

        {/* Filled Area */}
        <path d={areaD} fill="url(#area-grad)" style={{ transition: "all 0.3s ease" }} />

        {/* Line Path */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: "all 0.3s ease" }}
        />

        {/* Interaction Points */}
        {points.map((p, idx) => (
          <g
            key={idx}
            onMouseEnter={() => setHoverIndex(idx)}
            onMouseLeave={() => setHoverIndex(null)}
            style={{ cursor: "pointer" }}
          >
            {/* Invisible larger hover trigger */}
            <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
            
            {/* Visual circle dot */}
            <circle
              cx={p.x}
              cy={p.y}
              r={hoverIndex === idx ? "6" : "4"}
              fill={hoverIndex === idx ? "var(--accent)" : "var(--surface)"}
              stroke="var(--accent)"
              strokeWidth={hoverIndex === idx ? "3" : "2"}
              style={{ transition: "all 0.15s ease" }}
            />
          </g>
        ))}
      </svg>

      {/* Tooltip Overlay */}
      {hoverIndex !== null && points[hoverIndex] && (
        <div
          className="chart-tooltip"
          style={{
            position: "absolute",
            top: `${points[hoverIndex].y - 50}px`,
            left: `${points[hoverIndex].x - 60}px`,
            background: "rgba(23, 23, 21, 0.95)",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#ffffff",
            padding: "6px 10px",
            borderRadius: "10px",
            fontSize: "11px",
            fontWeight: "700",
            pointerEvents: "none",
            boxShadow: "0 8px 16px rgba(0,0,0,0.15)",
            zIndex: 10,
            whiteSpace: "nowrap",
            textAlign: "center"
          }}
        >
          <span style={{ display: "block", color: "#a5a29a", fontSize: "9px", textTransform: "uppercase" }}>
            {points[hoverIndex].label}
          </span>
          ₹{points[hoverIndex].value.toLocaleString()}
        </div>
      )}
    </div>
  );
};

// Order Volume Bar Chart by Status
export const OrderVolumeChart = ({ data = [] }) => {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data.map(d => d.value), 4);
  const height = 180;
  const width = 300;
  
  const paddingLeft = 10;
  const paddingRight = 10;
  const paddingTop = 20;
  const paddingBottom = 25;
  
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const barWidth = chartWidth / data.length;

  const tones = {
    success: { fill: "var(--success)", bg: "rgba(46, 125, 85, 0.1)" },
    warning: { fill: "var(--warning)", bg: "rgba(156, 95, 23, 0.1)" },
    neutral: { fill: "var(--accent)", bg: "rgba(190, 103, 59, 0.1)" },
    danger: { fill: "var(--danger)", bg: "rgba(163, 60, 60, 0.1)" },
  };

  return (
    <div className="chart-wrapper" style={{ position: "relative" }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {data.map((bar, idx) => {
          const colorSet = tones[bar.tone] || tones.neutral;
          const barValHeight = (bar.value / maxVal) * chartHeight;
          const x = paddingLeft + idx * barWidth + barWidth * 0.15;
          const y = paddingTop + chartHeight - barValHeight;
          const actualBarWidth = barWidth * 0.7;

          return (
            <g
              key={idx}
              onMouseEnter={() => setHoverIndex(idx)}
              onMouseLeave={() => setHoverIndex(null)}
              style={{ cursor: "pointer" }}
            >
              {/* Background Track Column */}
              <rect
                x={x}
                y={paddingTop}
                width={actualBarWidth}
                height={chartHeight}
                rx="6"
                fill={colorSet.bg}
                style={{ transition: "all 0.2s" }}
              />

              {/* Bar Value Column */}
              <rect
                x={x}
                y={y}
                width={actualBarWidth}
                height={barValHeight}
                rx="6"
                fill={hoverIndex === idx ? "var(--accent-strong)" : colorSet.fill}
                style={{ transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)" }}
              />

              {/* Text label underneath */}
              <text
                x={x + actualBarWidth / 2}
                y={height - 8}
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill="var(--muted)"
              >
                {bar.label}
              </text>

              {/* Value label on top of hover */}
              <text
                x={x + actualBarWidth / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize="10"
                fontWeight="800"
                fill="var(--text)"
                opacity={hoverIndex === idx ? 1 : 0.8}
                style={{ transition: "opacity 0.2s" }}
              >
                {bar.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// Stock Distribution Circular Donut Chart
export const StockDistributionChart = ({ data = [] }) => {
  const [hoverIdx, setHoverIdx] = useState(null);

  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  
  // Clean coordinates for radial drawing
  const size = 150;
  const radius = 50;
  const strokeWidth = 14;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let currentAngle = -Math.PI / 2; // Start from top

  const segments = data.map((item, idx) => {
    const percentage = item.value / total;
    const strokeDasharray = `${percentage * circumference} ${circumference}`;
    const strokeDashoffset = circumference - (percentage * circumference);
    
    // Custom beautiful palette
    const colors = [
      "var(--accent)",
      "var(--success)",
      "var(--warning)",
      "#3b82f6", // Electric blue
      "#8b5cf6", // Purple
    ];
    const color = colors[idx % colors.length];
    
    return {
      ...item,
      color,
      strokeDasharray,
      percent: Math.round(percentage * 100),
    };
  });

  return (
    <div className="donut-chart-container" style={{ display: "flex", alignItems: "center", gap: "24px" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Base Background Track Circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
            opacity="0.4"
          />

          {segments.map((segment, idx) => {
            const rotation = (segments.slice(0, idx).reduce((sum, s) => sum + (s.value / total), 0) * 360) - 90;
            return (
              <circle
                key={idx}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={segment.color}
                strokeWidth={hoverIdx === idx ? strokeWidth + 3 : strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={segment.strokeDashoffset}
                transform={`rotate(${rotation} ${center} ${center})`}
                style={{
                  transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                  cursor: "pointer",
                }}
                onMouseEnter={() => setHoverIdx(idx)}
                onMouseLeave={() => setHoverIdx(null)}
              />
            );
          })}
        </svg>

        {/* Center Text widget */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            pointerEvents: "none"
          }}
        >
          <strong style={{ fontSize: "18px", display: "block", fontFamily: "Space Grotesk, sans-serif" }}>
            {hoverIdx !== null ? segments[hoverIdx].value : total}
          </strong>
          <span style={{ fontSize: "9px", color: "var(--muted)", textTransform: "uppercase", fontWeight: "700" }}>
            {hoverIdx !== null ? segments[hoverIdx].label : "Total units"}
          </span>
        </div>
      </div>

      {/* Legend Block */}
      <div style={{ display: "grid", gap: "8px", flex: 1 }}>
        {segments.map((segment, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "12px",
              padding: "4px 8px",
              borderRadius: "8px",
              background: hoverIdx === idx ? "var(--bg-elevated)" : "transparent",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseEnter={() => setHoverIdx(idx)}
            onMouseLeave={() => setHoverIdx(null)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "3px",
                  background: segment.color,
                  display: "inline-block"
                }}
              />
              <span style={{ fontWeight: hoverIdx === idx ? "700" : "500", color: "var(--text)" }}>{segment.label}</span>
            </div>
            <strong style={{ color: "var(--muted)" }}>{segment.percent}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
};
