import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Surveillance Data Unavailable",
  message,
  onRetry,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      className={`p-6 sm:p-8 rounded-xl border border-error/25 bg-error-container/20 flex flex-col sm:flex-row items-center sm:items-start gap-4 ${className}`}
    >
      <div className="w-10 h-10 rounded-xl bg-error-container text-on-error-container flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-[22px] text-error">
          error_outline
        </span>
      </div>
      <div className="flex-1 text-center sm:text-left">
        <h4 className="text-sm font-bold text-error">{title}</h4>
        <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
          {message}
        </p>
        {onRetry && (
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              icon="refresh"
              onClick={onRetry}
              className="border-error/30 text-error hover:bg-error-container/30"
            >
              Retry Request
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
