import { Button } from "./Button";

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionIcon?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon = "inbox",
  title,
  description,
  actionLabel,
  actionIcon,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`p-8 sm:p-12 text-center rounded-xl border border-dashed border-slate-200 bg-surface-container-lowest/70 flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center text-primary mb-3.5 shadow-2xs">
        <span className="material-symbols-outlined text-[30px]">{icon}</span>
      </div>
      <h4 className="text-sm sm:text-base font-bold text-on-surface">{title}</h4>
      {description && (
        <p className="text-xs text-on-surface-variant max-w-sm mt-1 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            icon={actionIcon}
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
