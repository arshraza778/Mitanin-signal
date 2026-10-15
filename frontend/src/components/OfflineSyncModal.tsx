import { useState, useEffect } from "react";
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Trash2, 
  X 
} from "lucide-react";
import {
  getOfflineQueue,
  getQueueSummary,
  processSyncQueue,
  removeQueueItem,
  clearSyncedItems,
  subscribeToSyncQueue,
  isDeviceOnline,
  type SyncQueueItem,
} from "../services/offlineSync";
import { Button } from "./ui";

interface OfflineSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export function OfflineSyncModal({ isOpen, onClose, onSyncComplete }: OfflineSyncModalProps) {
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const [summary, setSummary] = useState(getQueueSummary());
  const [online, setOnline] = useState<boolean>(isDeviceOnline());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const refreshState = () => {
    setQueue(getOfflineQueue());
    setSummary(getQueueSummary());
    setOnline(isDeviceOnline());
  };

  useEffect(() => {
    refreshState();
    const unsub = subscribeToSyncQueue(refreshState);

    const handleNetChange = () => setOnline(isDeviceOnline());
    window.addEventListener("online", handleNetChange);
    window.addEventListener("offline", handleNetChange);

    return () => {
      unsub();
      window.removeEventListener("online", handleNetChange);
      window.removeEventListener("offline", handleNetChange);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setStatusMsg(null);
    try {
      const result = await processSyncQueue();
      refreshState();
      setStatusMsg(
        `Synchronized ${result.successful} item(s). ${result.failed > 0 ? `${result.failed} failed/deferred.` : ""}`
      );
      if (onSyncComplete && result.successful > 0) {
        onSyncComplete();
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-surface-container-lowest text-on-surface rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200/90 flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-surface-container-low/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                online
                  ? "bg-primary-fixed text-primary"
                  : "bg-error-container text-on-error-container"
              }`}
            >
              {online ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                Offline Field Store & Sync Register
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    online
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-error-container text-error border border-error/20"
                  }`}
                >
                  {online ? "Online (2G/LTE)" : "Disconnected (Offline Mode)"}
                </span>
              </h2>
              <p className="text-xs text-on-surface-variant">
                Local SQLite / localStorage staging buffer for low-bandwidth tribal sectors
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Metrics Strip */}
        <div className="grid grid-cols-4 gap-2 p-4 bg-surface-container-lowest border-b border-slate-100 text-center">
          <div className="p-2.5 bg-surface-container-low rounded-xl">
            <div className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
              Total Queued
            </div>
            <div className="text-lg font-extrabold text-on-surface tabular-nums">{summary.total}</div>
          </div>
          <div className="p-2.5 bg-surface-container-low rounded-xl">
            <div className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
              Locally Saved
            </div>
            <div className="text-lg font-extrabold text-secondary tabular-nums">{summary.saved}</div>
          </div>
          <div className="p-2.5 bg-surface-container-low rounded-xl">
            <div className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
              Synced
            </div>
            <div className="text-lg font-extrabold text-primary tabular-nums">{summary.synced}</div>
          </div>
          <div className="p-2.5 bg-surface-container-low rounded-xl">
            <div className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
              Failed/Retry
            </div>
            <div className="text-lg font-extrabold text-error tabular-nums">{summary.failed}</div>
          </div>
        </div>

        {/* Message Banner if any */}
        {statusMsg && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-primary-fixed/30 border border-primary/20 text-xs text-primary font-semibold flex items-center justify-between">
            <span>{statusMsg}</span>
            <button onClick={() => setStatusMsg(null)} className="text-primary hover:opacity-75">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Queue List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {queue.length === 0 ? (
            <div className="py-12 text-center text-on-surface-variant space-y-2">
              <CheckCircle2 className="w-10 h-10 text-primary mx-auto opacity-70" />
              <p className="text-sm font-semibold text-on-surface">Offline Queue is Clean</p>
              <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                All frontline task updates, diagnostics, and field reports have been verified and synchronized with the central Bastar server.
              </p>
            </div>
          ) : (
            queue.map((item) => {
              const isSynced = item.status === "synced";
              const isFailed = item.status === "failed";
              const isQueued = item.status === "queued";
              const isSaved = item.status === "saved";

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                    isSynced
                      ? "bg-surface-container-low/40 border-slate-200/60 opacity-80"
                      : isFailed
                      ? "bg-error-container/20 border-error/30"
                      : "bg-surface-container-lowest border-slate-200/90 shadow-2xs"
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="mt-0.5 shrink-0">
                      {isSynced && <CheckCircle2 className="w-4 h-4 text-primary" />}
                      {isFailed && <AlertTriangle className="w-4 h-4 text-error" />}
                      {isQueued && <RefreshCw className="w-4 h-4 text-secondary animate-spin" />}
                      {isSaved && <Clock className="w-4 h-4 text-on-surface-variant" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-on-surface truncate">{item.label}</span>
                        <span
                          className={`px-2 py-0.2 rounded-full font-bold uppercase text-[9px] tracking-wider ${
                            isSynced
                              ? "bg-primary/10 text-primary"
                              : isFailed
                              ? "bg-error-container text-error"
                              : isQueued
                              ? "bg-secondary-container text-on-secondary-fixed"
                              : "bg-surface-container text-on-surface-variant"
                          }`}
                        >
                          {item.status}
                        </span>
                        <span className="text-[10px] text-on-surface-variant font-mono">
                          {item.type}
                        </span>
                      </div>
                      <div className="text-[11px] text-on-surface-variant mt-0.5 flex items-center gap-2">
                        <span>Created: {new Date(item.createdAt).toLocaleTimeString()}</span>
                        {item.retryCount > 0 && <span>• Retries: {item.retryCount}</span>}
                        {item.errorMessage && (
                          <span className="text-error truncate max-w-xs">• {item.errorMessage}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => removeQueueItem(item.id)}
                      className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/30 transition-colors"
                      title="Remove from queue"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-container-low/30">
          <div className="flex items-center gap-2">
            {summary.synced > 0 && (
              <Button
                variant="outline"
                size="sm"
                icon="delete"
                onClick={clearSyncedItems}
              >
                Clear Synced ({summary.synced})
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Dismiss
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon="sync"
              loading={isSyncing}
              disabled={!online || summary.saved + summary.queued + summary.failed === 0}
              onClick={handleSyncNow}
            >
              Sync Now ({summary.saved + summary.queued + summary.failed})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
