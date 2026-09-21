/**
 * EyeOn brand mark: an eye whose pupil is a location pin (matches the product poster).
 * Inline SVG + live text so the wordmark renders in the display webfont at any size.
 */

interface MarkProps {
  size?: number;
  /** Colour of the eye outline. The pin is always brand yellow. */
  color?: string;
  className?: string;
}

export function EyeOnMark({ size = 24, color = "currentColor", className }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M1.8 12S5.4 5.4 12 5.4 22.2 12 22.2 12 18.6 18.6 12 18.6 1.8 12 1.8 12Z"
        stroke={color}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M12 7.9a3.2 3.2 0 0 0-3.2 3.2c0 2.4 3.2 5.2 3.2 5.2s3.2-2.8 3.2-5.2A3.2 3.2 0 0 0 12 7.9Z"
        fill="#FFC857"
      />
      <circle cx="12" cy="11.1" r="1.15" fill="#0B2E28" />
    </svg>
  );
}

interface LogoProps {
  /** Height of the lockup in px; the wordmark scales with it. */
  height?: number;
  /** "light" = for white/pale backgrounds, "dark" = for teal/dark backgrounds. */
  tone?: "light" | "dark";
  className?: string;
}

export function EyeOnLogo({ height = 40, tone = "light", className = "" }: LogoProps) {
  const onDark = tone === "dark";
  return (
    <span
      role="img"
      aria-label="EyeOn"
      className={`inline-flex items-center gap-2 font-display font-bold leading-none ${className}`}
      style={{ height, fontSize: Math.round(height * 0.72) }}
    >
      <EyeOnMark size={Math.round(height * 0.95)} color={onDark ? "#ffffff" : "#0F6B5C"} />
      <span aria-hidden="true" className="pt-[0.08em]">
        <span className={onDark ? "text-white" : "text-brand-500"}>Eye</span>
        <span className={onDark ? "text-sun-400" : "text-sun-600"}>On</span>
      </span>
    </span>
  );
}
