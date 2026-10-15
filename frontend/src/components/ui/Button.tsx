import React from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "danger"
  | "ghost";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string; // Material symbol icon name
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-container active:scale-[0.99] font-bold shadow-2xs focus-visible:ring-2 focus-visible:ring-primary/40",
  secondary:
    "bg-secondary text-on-secondary hover:bg-secondary-container active:scale-[0.99] font-semibold shadow-2xs focus-visible:ring-2 focus-visible:ring-secondary/40",
  outline:
    "bg-surface-container-lowest text-on-surface hover:bg-surface-container border border-slate-200/90 hover:border-slate-300 font-semibold shadow-2xs focus-visible:ring-2 focus-visible:ring-primary/30",
  danger:
    "bg-error text-on-error hover:bg-error/90 active:scale-[0.99] font-bold shadow-2xs focus-visible:ring-2 focus-visible:ring-error/40",
  ghost:
    "bg-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium focus-visible:ring-2 focus-visible:ring-slate-300",
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: "h-8 px-2.5 text-xs gap-1.5 rounded-lg",
  md: "h-9 px-3.5 text-xs sm:text-sm gap-2 rounded-lg",
  lg: "h-11 px-5 text-sm sm:text-base gap-2.5 rounded-xl font-bold",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  fullWidth = false,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center transition-all cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none outline-none ${
        VARIANT_STYLES[variant]
      } ${SIZE_STYLES[size]} ${fullWidth ? "w-full" : ""} ${className}`}
    >
      {loading ? (
        <span className="material-symbols-outlined text-[16px] animate-spin">
          progress_activity
        </span>
      ) : icon ? (
        <span className="material-symbols-outlined text-[18px] shrink-0">
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </button>
  );
}
