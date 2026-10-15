import React from "react";

export type BadgeVariant =
  | "emergency"
  | "urgent"
  | "active"
  | "verified"
  | "info"
  | "neutral";

export interface BadgeProps {
  children?: React.ReactNode;
  label?: string;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  icon?: string; // Google Material Symbol icon name
  pulse?: boolean;
  className?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, { container: string; dot: string; iconColor: string }> = {
  emergency: {
    container: "bg-error-container text-on-error-container border border-error/25",
    dot: "bg-error",
    iconColor: "text-error",
  },
  urgent: {
    container: "bg-amber-50 text-amber-900 border border-amber-200",
    dot: "bg-amber-500",
    iconColor: "text-amber-600",
  },
  active: {
    container: "bg-primary-fixed/80 text-on-primary-fixed-variant border border-primary-fixed-dim",
    dot: "bg-primary",
    iconColor: "text-primary",
  },
  verified: {
    container: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    dot: "bg-emerald-600",
    iconColor: "text-emerald-600",
  },
  info: {
    container: "bg-sky-50 text-sky-900 border border-sky-200",
    dot: "bg-sky-500",
    iconColor: "text-sky-600",
  },
  neutral: {
    container: "bg-surface-container text-on-surface-variant border border-slate-200",
    dot: "bg-slate-400",
    iconColor: "text-slate-500",
  },
};

export function Badge({
  children,
  label,
  variant = "neutral",
  size = "sm",
  icon,
  pulse = false,
  className = "",
}: BadgeProps) {
  const styling = VARIANT_CLASSES[variant];
  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-[11px] leading-tight font-bold"
      : "px-2.5 py-1 text-xs leading-normal font-bold";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full select-none uppercase tracking-wider ${styling.container} ${sizeClasses} ${className}`}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${styling.dot}`}
          />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${styling.dot}`} />
        </span>
      )}
      {icon && (
        <span
          className={`material-symbols-outlined text-[14px] leading-none ${styling.iconColor}`}
        >
          {icon}
        </span>
      )}
      <span>{label || children}</span>
    </span>
  );
}
