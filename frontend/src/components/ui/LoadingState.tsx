
export interface LoadingStateProps {
  message?: string;
  subMessage?: string;
  className?: string;
}

export function LoadingState({
  message = "Loading public health surveillance data...",
  subMessage = "Querying live district telemetry & epidemiological indicators",
  className = "",
}: LoadingStateProps) {
  return (
    <div
      className={`p-8 sm:p-12 text-center rounded-xl bg-surface-container-lowest/60 border border-slate-200/80 flex flex-col items-center justify-center ${className}`}
    >
      <div className="relative flex items-center justify-center mb-4">
        <div className="w-12 h-12 rounded-full border-3 border-primary/20 border-t-primary animate-spin"></div>
        <span className="material-symbols-outlined text-[20px] text-primary absolute">
          health_and_safety
        </span>
      </div>
      <h4 className="text-sm font-bold text-on-surface">{message}</h4>
      {subMessage && (
        <p className="text-xs text-on-surface-variant mt-1 max-w-sm">{subMessage}</p>
      )}
    </div>
  );
}
