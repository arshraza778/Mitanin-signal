import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "default" | "elevated" | "flat" | "accent";
  accentColor?: "primary" | "secondary" | "error" | "amber";
  className?: string;
}

export function Card({
  children,
  variant = "default",
  accentColor = "primary",
  className = "",
  ...props
}: CardProps) {
  const variantStyles = {
    default:
      "bg-surface-container-lowest border border-slate-200/90 shadow-2xs hover:shadow-xs",
    elevated:
      "bg-surface-container-lowest border border-slate-200/70 shadow-sm hover:shadow-md",
    flat: "bg-surface-container-low border border-slate-200/60",
    accent: `bg-surface-container-lowest border-l-4 ${
      accentColor === "primary"
        ? "border-l-primary"
        : accentColor === "secondary"
        ? "border-l-secondary"
        : accentColor === "error"
        ? "border-l-error"
        : "border-l-amber-500"
    } border-t border-r border-b border-slate-200/80 shadow-2xs`,
  };

  return (
    <div
      {...props}
      className={`rounded-xl transition-all ${variantStyles[variant]} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  subtitle,
  className = "",
}: {
  children: React.ReactNode;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className="flex flex-col">
      <h3 className={`text-base font-bold text-on-surface leading-tight ${className}`}>
        {children}
      </h3>
      {subtitle && (
        <span className="text-xs text-on-surface-variant font-normal mt-0.5">
          {subtitle}
        </span>
      )}
    </div>
  );
}

export function CardContent({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`p-4 sm:p-5 ${className}`}>{children}</div>;
}

export function CardFooter({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`p-4 sm:p-5 border-t border-slate-100 bg-surface-container-low/50 rounded-b-xl flex items-center justify-between gap-3 ${className}`}
    >
      {children}
    </div>
  );
}
