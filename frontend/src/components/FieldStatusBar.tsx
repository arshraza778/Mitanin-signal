import { useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import { speakTextInLanguage } from "../services/speechService";

interface FieldStatusBarProps {
  workerName?: string;
  workerId?: string;
  hamletText?: string;
  onSyncNow?: () => void;
  onVoiceTrigger?: () => void;
}

export function FieldStatusBar({
  workerName = "Mitanin Asha",
  workerId = "MIT-BAST-0412",
  hamletText = "Sector 4 Hamlet (Para VIL_A1), Bastar",
  onSyncNow,
  onVoiceTrigger,
}: FieldStatusBarProps) {
  const { language } = useI18n();
  const [cachedCount, setCachedCount] = useState<number>(4);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncText, setLastSyncText] = useState<string>("Synced 2m ago");
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setCachedCount(0);
      setIsSyncing(false);
      setLastSyncText("Just now");
      if (onSyncNow) onSyncNow();
    }, 1200);
  };

  const handleVoicePlay = () => {
    if (onVoiceTrigger) {
      onVoiceTrigger();
      return;
    }
    const prompt =
      language === "hne"
        ? "मितानिन दीदी, आज के नवा जांच अउ दवाई वितरण के काम देखव।"
        : language === "hi"
        ? "मितानिन दीदी, आज के गृह भेंट और दवा वितरण कार्य देखें।"
        : "Mitanin Asha, please check today's field visits and rapid kit stocks.";
    setIsSpeaking(true);
    speakTextInLanguage(
      prompt,
      language,
      1.0,
      {
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      },
      { allowExplicitHindiForHneText: true }
    ).catch(() => {
      setIsSpeaking(false);
    });
  };

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-slate-200/90 shadow-2xs p-3.5 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3.5">
      <div className="flex flex-wrap items-center gap-3">
        {/* Worker Profile Avatar Badge */}
        <div className="flex items-center gap-2.5 bg-surface-container-low px-3 py-2 rounded-lg">
          <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">woman</span>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-sm text-on-surface truncate">{workerName}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-primary-fixed text-on-primary-fixed-variant">
                {workerId}
              </span>
            </div>
            <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] text-primary">pin_drop</span>
              <span className="truncate">{hamletText}</span>
            </span>
          </div>
        </div>

        {/* Offline-First Telemetry Chip (Simulated Demo Mesh) */}
        <div className="flex items-center gap-2.5 bg-surface-container-high/60 px-3 py-2 rounded-lg border border-slate-200/60">
          <div className="relative flex items-center justify-center">
            <span className="material-symbols-outlined text-primary-container text-[20px]">cloud_sync</span>
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-secondary-container"></span>
          </div>
          <div className="flex flex-col">
            <div className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
              <span>Tribal Mesh (Relay Sync)</span>
              <span className="text-[10px] text-on-surface-variant font-normal">
                ({cachedCount} cached locally)
              </span>
            </div>
            <span className="text-[10px] text-on-surface-variant leading-tight">
              Auto-syncs via Village Peer Node • {lastSyncText}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className="ml-1 px-2.5 py-1 bg-surface-container-lowest hover:bg-surface-container text-primary text-xs font-semibold rounded-md border border-slate-200 shadow-2xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-60"
          >
            <span className={`material-symbols-outlined text-[14px] ${isSyncing ? "animate-spin" : ""}`}>
              sync
            </span>
            <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
          </button>
        </div>
      </div>

      {/* Voice Assistant / Dialect Voice Guidance */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 bg-tertiary-fixed text-on-tertiary-fixed px-3 py-1.5 rounded-full shadow-2xs border border-tertiary-fixed-dim">
          <button
            type="button"
            onClick={handleVoicePlay}
            className="flex items-center gap-2 cursor-pointer focus:outline-none"
            title="Dialect Voice Assistant"
          >
            <span
              className={`material-symbols-outlined text-[18px] text-tertiary ${
                isSpeaking ? "animate-bounce text-error" : "animate-pulse"
              }`}
            >
              {isSpeaking ? "volume_up" : "mic"}
            </span>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold tracking-tight">आवाज़ सहायक (Voice Assistant)</span>
              <span className="text-[10px] text-on-tertiary-fixed-variant font-medium">
                Chhattisgarhi / हिन्दी सक्रिय • Tap to listen
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
