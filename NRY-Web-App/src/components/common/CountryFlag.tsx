"use client";

import React from "react";

interface CountryFlagProps {
  code: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const CountryFlag: React.FC<CountryFlagProps> = ({
  code,
  className = "",
  size = "md",
}) => {
  const normalizedCode = (code || "").toUpperCase();

  const sizeClasses = {
    sm: "w-5 h-3.5",
    md: "w-6 h-4",
    lg: "w-8 h-5.5",
  };

  const baseClass = `inline-flex shrink-0 rounded-xs overflow-hidden shadow-2xs border border-black/10 align-middle ${sizeClasses[size]} ${className}`;

  switch (normalizedCode) {
    case "IN":
      return (
        <span className={baseClass} title="India">
          <svg viewBox="0 0 640 480" className="w-full h-full object-cover">
            <path fill="#f93" d="M0 0h640v160H0z" />
            <path fill="#fff" d="M0 160h640v160H0z" />
            <path fill="#128807" d="M0 320h640v160H0z" />
            <g transform="translate(320 240)">
              <circle r="70" fill="none" stroke="#008" strokeWidth="6" />
              <circle r="16" fill="#008" />
              {Array.from({ length: 24 }).map((_, i) => (
                <line
                  key={i}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="-68"
                  stroke="#008"
                  strokeWidth="3.5"
                  transform={`rotate(${i * 15})`}
                />
              ))}
            </g>
          </svg>
        </span>
      );

    case "US":
      return (
        <span className={baseClass} title="United States">
          <svg viewBox="0 0 640 480" className="w-full h-full object-cover">
            {/* 13 Stripes */}
            {Array.from({ length: 13 }).map((_, i) => (
              <rect
                key={i}
                y={(i * 480) / 13}
                width="640"
                height={480 / 13}
                fill={i % 2 === 0 ? "#b22234" : "#fff"}
              />
            ))}
            {/* Blue canton */}
            <rect width="260" height={(7 * 480) / 13} fill="#3c3b6e" />
            {/* Stars simplified matrix */}
            <g fill="#fff">
              {[30, 80, 130, 180, 230].map((x) =>
                [35, 90, 145, 200].map((y) => (
                  <circle key={`${x}-${y}`} cx={x} cy={y} r="6" />
                ))
              )}
            </g>
          </svg>
        </span>
      );

    case "GB":
      return (
        <span className={baseClass} title="United Kingdom">
          <svg viewBox="0 0 640 480" className="w-full h-full object-cover">
            <path fill="#012169" d="M0 0h640v480H0z" />
            {/* White diagonals */}
            <path stroke="#fff" strokeWidth="60" d="M0 0l640 480M640 0L0 480" />
            {/* Red diagonals */}
            <path stroke="#c8102e" strokeWidth="36" d="M0 0l640 480M640 0L0 480" />
            {/* White cross */}
            <path fill="#fff" d="M260 0h120v480H260zM0 180h640v120H0z" />
            {/* Red cross */}
            <path fill="#c8102e" d="M280 0h80v480H280zM0 200h640v80H0z" />
          </svg>
        </span>
      );

    case "AE":
      return (
        <span className={baseClass} title="United Arab Emirates">
          <svg viewBox="0 0 640 480" className="w-full h-full object-cover">
            <path fill="#00732f" d="M160 0h480v160H160z" />
            <path fill="#fff" d="M160 160h480v160H160z" />
            <path fill="#000" d="M160 320h480v160H160z" />
            <path fill="#f00" d="M0 0h160v480H0z" />
          </svg>
        </span>
      );

    case "SG":
      return (
        <span className={baseClass} title="Singapore">
          <svg viewBox="0 0 640 480" className="w-full h-full object-cover">
            <path fill="#ed2939" d="M0 0h640v240H0z" />
            <path fill="#fff" d="M0 240h640v240H0z" />
            {/* Crescent */}
            <path
              d="M130 50 A 65 65 0 1 0 130 190 A 55 55 0 1 1 130 50"
              fill="#fff"
            />
            {/* 5 Stars */}
            <g fill="#fff">
              <circle cx="165" cy="85" r="7" />
              <circle cx="190" cy="100" r="7" />
              <circle cx="180" cy="130" r="7" />
              <circle cx="150" cy="130" r="7" />
              <circle cx="140" cy="100" r="7" />
            </g>
          </svg>
        </span>
      );

    case "AU":
      return (
        <span className={baseClass} title="Australia">
          <svg viewBox="0 0 640 480" className="w-full h-full object-cover">
            <path fill="#00008b" d="M0 0h640v480H0z" />
            {/* Mini Union Jack canton */}
            <g transform="scale(0.5)">
              <path fill="#012169" d="M0 0h640v480H0z" />
              <path stroke="#fff" strokeWidth="60" d="M0 0l640 480M640 0L0 480" />
              <path stroke="#c8102e" strokeWidth="36" d="M0 0l640 480M640 0L0 480" />
              <path fill="#fff" d="M260 0h120v480H260zM0 180h640v120H0z" />
              <path fill="#c8102e" d="M280 0h80v480H280zM0 200h640v80H0z" />
            </g>
            {/* Commonwealth star */}
            <circle cx="160" cy="360" r="28" fill="#fff" />
            {/* Southern Cross stars */}
            <circle cx="480" cy="110" r="14" fill="#fff" />
            <circle cx="560" cy="180" r="14" fill="#fff" />
            <circle cx="440" cy="220" r="14" fill="#fff" />
            <circle cx="500" cy="280" r="10" fill="#fff" />
            <circle cx="480" cy="380" r="14" fill="#fff" />
          </svg>
        </span>
      );

    case "CA":
      return (
        <span className={baseClass} title="Canada">
          <svg viewBox="0 0 640 480" className="w-full h-full object-cover">
            <path fill="#d80621" d="M0 0h160v480H0zM480 0h160v480H480z" />
            <path fill="#fff" d="M160 0h320v480H160z" />
            {/* Maple leaf silhouette */}
            <path
              fill="#d80621"
              d="M320 80l22 58 48-18-20 48 54 18-36 34 32 38-60 8-8 62-32-44-32 44-8-62-60-8 32-38-36-34 54-18-20-48 48 18z"
            />
          </svg>
        </span>
      );

    case "DE":
      return (
        <span className={baseClass} title="Germany">
          <svg viewBox="0 0 640 480" className="w-full h-full object-cover">
            <path fill="#000" d="M0 0h640v160H0z" />
            <path fill="#dd0000" d="M0 160h640v160H0z" />
            <path fill="#ffce00" d="M0 320h640v160H0z" />
          </svg>
        </span>
      );

    case "JP":
      return (
        <span className={baseClass} title="Japan">
          <svg viewBox="0 0 640 480" className="w-full h-full object-cover">
            <path fill="#fff" d="M0 0h640v480H0z" />
            <circle cx="320" cy="240" r="130" fill="#bc002d" />
          </svg>
        </span>
      );

    default:
      return (
        <span className={`${baseClass} bg-slate-100 flex items-center justify-center text-[9px] font-semibold text-slate-700`}>
          {normalizedCode.slice(0, 2)}
        </span>
      );
  }
};
