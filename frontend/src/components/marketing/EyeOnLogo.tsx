"use client";

import Image from "next/image";

interface EyeOnLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "full" | "icon";
}

export function EyeOnLogo({ className = "", size = "md", variant = "full" }: EyeOnLogoProps) {
  const sizes = {
    sm: { width: 120, height: 32, iconSize: 28 },
    md: { width: 180, height: 44, iconSize: 38 },
    lg: { width: 240, height: 56, iconSize: 48 },
  };

  const { width, height, iconSize } = sizes[size];

  if (variant === "icon") {
    // Just the triangular motion icon
    return (
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <defs>
          <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00D4FF" />
            <stop offset="100%" stopColor="#0A1F44" />
          </linearGradient>
        </defs>
        {/* Main triangle */}
        <path
          d="M24 4L44 40H4L24 4Z"
          fill="url(#iconGradient)"
          rx="4"
        />
        {/* Motion waves */}
        <path
          d="M12 32C14 30 18 28 22 32"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M16 26C18 24 22 23 26 26"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        {/* Signal dots */}
        <circle cx="14" cy="35" r="2" fill="white" />
        <circle cx="20" cy="33" r="1.5" fill="white" />
        <circle cx="26" cy="31" r="1.5" fill="white" />
      </svg>
    );
  }

  // Full logo with text
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 240 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="triangleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00D4FF" />
          <stop offset="50%" stopColor="#1E5799" />
          <stop offset="100%" stopColor="#0A1F44" />
        </linearGradient>
        <linearGradient id="textGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1E3A5F" />
          <stop offset="50%" stopColor="#0A2540" />
          <stop offset="100%" stopColor="#071B2F" />
        </linearGradient>
      </defs>

      {/* Triangle icon */}
      <g transform="translate(0, 4)">
        <path
          d="M24 2L46 44H2L24 2Z"
          fill="url(#triangleGradient)"
        />
        {/* Motion waves */}
        <path
          d="M10 34C13 31 19 29 24 34"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M14 28C17 25 23 24 28 28"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        {/* Signal dots */}
        <circle cx="12" cy="38" r="2" fill="white" />
        <circle cx="19" cy="35" r="1.5" fill="white" />
        <circle cx="26" cy="32" r="1.5" fill="white" />
      </g>

      {/* EyeOn text */}
      <text
        x="56"
        y="40"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontSize="32"
        fontWeight="800"
        fill="url(#textGradient)"
        letterSpacing="-0.5"
      >
        EyeOn
      </text>
    </svg>
  );
}

// Inline version for header/footer
export function EyeOnLogoInline({ dark = true }: { dark?: boolean }) {
  // dark=true means dark background, dark=false means light background
  const textColor = dark ? "#FFFFFF" : "#0A2540";

  return (
    <div className="flex items-center gap-2">
      {/* Triangle Icon */}
      <svg width="36" height="36" viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="inlineTriGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00D4FF" />
            <stop offset="50%" stopColor="#1E5799" />
            <stop offset="100%" stopColor="#0A1F44" />
          </linearGradient>
        </defs>
        {/* Main triangle with rounded appearance */}
        <path
          d="M24 6L42 40C42 42 40 44 38 44H10C8 44 6 42 6 40L24 6Z"
          fill="url(#inlineTriGrad)"
        />
        {/* Motion waves */}
        <path
          d="M12 34C15 31 20 29 25 33"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M16 28C19 25 24 24 29 27"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        {/* Signal dots */}
        <circle cx="14" cy="37" r="2" fill="white" opacity="0.9" />
        <circle cx="21" cy="34" r="1.5" fill="white" opacity="0.9" />
        <circle cx="28" cy="31" r="1.5" fill="white" opacity="0.9" />
      </svg>

      {/* EyeOn Text */}
      <span
        className="text-2xl font-extrabold tracking-tight"
        style={{
          color: textColor,
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          textShadow: dark ? "none" : "0 1px 2px rgba(0,0,0,0.1)"
        }}
      >
        EyeOn
      </span>
    </div>
  );
}

// Image-based logo for highest fidelity
export function EyeOnLogoImage({ className = "", height = 40 }: { className?: string; height?: number }) {
  return (
    <Image
      src="/eyeon-logo.png"
      alt="EyeOn"
      width={Math.round(height * 4.5)}
      height={height}
      className={className}
      style={{ height, width: "auto" }}
    />
  );
}
