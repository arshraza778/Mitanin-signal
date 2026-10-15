import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Check, 
  ArrowLeft, 
  MapPin, 
  Mic, 
  Volume2, 
  Wifi, 
  WifiOff, 
  Clock, 
  PhoneCall, 
  AlertTriangle,
  Play,
  RotateCw,
  Smartphone,
  Info
} from "lucide-react";
import { useI18n } from "../i18n/I18nContext";
import { VoiceTaskPlayer } from "../components/VoiceTaskPlayer";
import { OfflineSyncModal } from "../components/OfflineSyncModal";
import {
  enqueueOfflineItem,
  getQueueSummary,
  isDeviceOnline,
  subscribeToSyncQueue,
} from "../services/offlineSync";
import type { SelectedLocationState } from "../components/LocationSelectorModal";
import { Button } from "../components/ui";

interface MitaninMobileProps {
  onReturnToDistrict?: () => void;
  onLedgerUpdate?: () => void;
  selectedLocation?: SelectedLocationState;
  onChangeLocation?: () => void;
}

interface TaskItem {
  id: number;
  alert_id?: number;
  disease_type?: string;
  disease_label?: string;
  title: string;
  steps: string[];
  owner: string;
  deadline: string;
  status: "sent" | "acknowledged" | "in_progress" | "done" | "needs_help" | "escalated";
  created_at: string;
  updated_at: string;
  unit_id?: string;
  unit_name?: string;
  location_name?: string;
  priority?: string;
}

export function MitaninMobile({
  onReturnToDistrict,
  onLedgerUpdate,
  selectedLocation,
  onChangeLocation,
}: MitaninMobileProps) {
  const { t: tr, localizeTask, language, setLanguage } = useI18n();

  // Navigation / Views: "home" | "detail" | "confirmation"
  const [currentScreen, setCurrentScreen] = useState<"home" | "detail" | "confirmation">("home");

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [diseaseFilter, setDiseaseFilter] = useState<string>("all");
  const [repliedAction, setRepliedAction] = useState<"done" | "needs_help" | "acknowledged" | "in_progress" | null>(null);
  const [replyTime, setReplyTime] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [completionNotes, setCompletionNotes] = useState<string>("");
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);

  // Mobile Handset Simulator Display Format & Companion Dossier
  const [deviceFormat, setDeviceFormat] = useState<"iphone" | "compact" | "fluid">("iphone");
  const [showDossier, setShowDossier] = useState<boolean>(false);

  // Sync state
  const [syncSummary, setSyncSummary] = useState(getQueueSummary());
  const [online, setOnline] = useState<boolean>(isDeviceOnline());
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedVoiceText, setRecordedVoiceText] = useState<string>("");

  // Frontline Mitanin identity
  const mitaninName = "Sunita Kashyap";
  const fullNameMatch = "Asha"; // Matches backend seed Asha for API compatibility

  useEffect(() => {
    const unsub = subscribeToSyncQueue(() => setSyncSummary(getQueueSummary()));
    const handleNet = () => setOnline(isDeviceOnline());
    window.addEventListener("online", handleNet);
    window.addEventListener("offline", handleNet);
    return () => {
      unsub();
      window.removeEventListener("online", handleNet);
      window.removeEventListener("offline", handleNet);
    };
  }, []);

  // Fetch open tasks
  const fetchMyTasks = useCallback(() => {
    fetch("http://127.0.0.1:8000/tasks")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: TaskItem[]) => {
        const seen = new Set<string>();
        const uniqueData: TaskItem[] = [];
        for (const item of data) {
          const key = `${(item.owner || "").toLowerCase()}::${(item.disease_type || "malaria").toLowerCase()}::${item.title.trim().toLowerCase()}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueData.push(item);
          }
        }

        const ashaTasks = uniqueData.filter((t) =>
          t.owner.toLowerCase().includes(fullNameMatch.toLowerCase())
        );
        if (ashaTasks.length > 0) {
          setTasks(ashaTasks);
          if (!selectedTask) setSelectedTask(ashaTasks[0]);
        } else {
          setTasks(uniqueData);
          if (uniqueData.length > 0 && !selectedTask) setSelectedTask(uniqueData[0]);
        }
      })
      .catch(() => {});
  }, [selectedTask]);

  useEffect(() => {
    fetchMyTasks();
  }, [fetchMyTasks]);

  const activeTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (diseaseFilter !== "all" && (t.disease_type || "malaria") !== diseaseFilter) return false;
      return true;
    });
  }, [tasks, diseaseFilter]);

  const pendingTasks = useMemo(() => {
    return activeTasks.filter(
      (t) => t.status === "sent" || t.status === "acknowledged" || t.status === "in_progress" || t.status === "needs_help"
    );
  }, [activeTasks]);

  const completedCount = useMemo(() => {
    return tasks.filter((t) => t.status === "done").length;
  }, [tasks]);

  const nextTask = useMemo(() => {
    if (!selectedTask) return null;
    return pendingTasks.find((t) => t.id !== selectedTask.id) || null;
  }, [pendingTasks, selectedTask]);

  const handleReply = async (status: "acknowledged" | "in_progress" | "done" | "needs_help") => {
    if (!selectedTask) return;
    setSubmitting(true);

    const nowStr = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    setReplyTime(nowStr);

    const defaultNote =
      status === "done"
        ? "Mitanin marked completed from mobile phone."
        : status === "needs_help"
        ? "Mitanin marked task blocked / requested field assistance."
        : status === "in_progress"
        ? "Mitanin started field verification activity."
        : "Mitanin accepted task assignment.";

    const payload = {
      status,
      actor: selectedTask.owner || `Mitanin ${mitaninName} [SAMPLE]`,
      notes: completionNotes.trim() || defaultNote,
      completion_notes: completionNotes.trim() || undefined,
    };

    // If completely offline, enqueue in local store directly
    if (!isDeviceOnline()) {
      enqueueOfflineItem({
        type: "task_action",
        endpoint: `http://127.0.0.1:8000/tasks/${selectedTask.id}/reply`,
        method: "POST",
        payload,
        authToken: null,
        status: "saved",
        label: `Task #${selectedTask.id}: ${status.toUpperCase()} (${selectedTask.title})`,
      });

      setRepliedAction(status);
      setSelectedTask({ ...selectedTask, status });
      setCurrentScreen("confirmation");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`http://127.0.0.1:8000/tasks/${selectedTask.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        if (status === "done" || status === "needs_help") {
          setRepliedAction(status);
          setCurrentScreen("confirmation");
        } else {
          const updated = await res.json();
          setSelectedTask({ ...selectedTask, status: updated.status || status });
        }
        setCompletionNotes("");
        fetchMyTasks();
        if (onLedgerUpdate) onLedgerUpdate();
      } else {
        // Enqueue fallback if server rejected
        enqueueOfflineItem({
          type: "task_action",
          endpoint: `http://127.0.0.1:8000/tasks/${selectedTask.id}/reply`,
          method: "POST",
          payload,
          authToken: null,
          status: "saved",
          label: `Task #${selectedTask.id}: ${status.toUpperCase()}`,
        });
        setRepliedAction(status);
        setCurrentScreen("confirmation");
      }
    } catch {
      // Network failure: enqueue safely to offline storage
      enqueueOfflineItem({
        type: "task_action",
        endpoint: `http://127.0.0.1:8000/tasks/${selectedTask.id}/reply`,
        method: "POST",
        payload,
        authToken: null,
        status: "saved",
        label: `Task #${selectedTask.id}: ${status.toUpperCase()}`,
      });
      setRepliedAction(status);
      setCurrentScreen("confirmation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleVoiceRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      setRecordedVoiceText("बुखार क्लस्टर: 3 घरों में RDT जांच पूर्ण, सभी नेगेटिव। ओआरएस पैकेट वितरित किए गए।");
    } else {
      setIsRecording(true);
      setRecordedVoiceText("");
    }
  };

  const handleApplyVoiceToNotes = () => {
    if (recordedVoiceText) {
      setCompletionNotes((prev) => (prev ? `${prev} • ${recordedVoiceText}` : recordedVoiceText));
      setRecordedVoiceText("");
    }
  };

  return (
    <div className="min-h-screen bg-surface py-3 sm:py-6 px-2 sm:px-4 flex flex-col items-center">
      {/* Offline Sync Modal */}
      <OfflineSyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        onSyncComplete={() => {
          fetchMyTasks();
          if (onLedgerUpdate) onLedgerUpdate();
        }}
      />

      {/* Top Mobile Format Controls Toolbar */}
      <div className="w-full max-w-4xl mb-4 flex flex-wrap items-center justify-between gap-3 px-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-on-surface leading-tight">
                Mitanin Mobile Field Terminal
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-bold uppercase tracking-wider">
                2G Phone Sim
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant">
              मितानिन मोबाइल साथी • Frontline handset viewport for Bastar division
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Device Dimension Preset Switcher */}
          <div className="inline-flex items-center bg-surface-container-low p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setDeviceFormat("iphone")}
              className={`px-2.5 py-1 rounded-lg transition-all text-[11px] flex items-center gap-1 ${
                deviceFormat === "iphone"
                  ? "bg-surface-container-lowest text-primary shadow-xs font-bold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
              title="iPhone / Modern Handset: 390 × 844 px"
            >
              <span>390 × 844</span>
            </button>
            <button
              type="button"
              onClick={() => setDeviceFormat("compact")}
              className={`px-2.5 py-1 rounded-lg transition-all text-[11px] flex items-center gap-1 ${
                deviceFormat === "compact"
                  ? "bg-surface-container-lowest text-primary shadow-xs font-bold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
              title="Compact Android: 360 × 740 px"
            >
              <span>360 × 740</span>
            </button>
            <button
              type="button"
              onClick={() => setDeviceFormat("fluid")}
              className={`px-2.5 py-1 rounded-lg transition-all text-[11px] flex items-center gap-1 ${
                deviceFormat === "fluid"
                  ? "bg-surface-container-lowest text-primary shadow-xs font-bold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
              title="Fluid Fullscreen / Frameless View"
            >
              <span>Fluid</span>
            </button>
          </div>

          {/* Toggle Field Dossier */}
          <button
            type="button"
            onClick={() => setShowDossier((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
              showDossier
                ? "bg-primary text-on-primary border-primary shadow-xs"
                : "bg-surface-container-lowest text-on-surface-variant border-slate-200 hover:bg-surface-container"
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>{showDossier ? "Hide Dossier" : "Field Dossier"}</span>
          </button>

          {onReturnToDistrict && (
            <Button
              variant="outline"
              size="sm"
              icon="arrow_back"
              onClick={onReturnToDistrict}
              className="text-xs"
            >
              Exit Sim
            </Button>
          )}
        </div>
      </div>

      {/* Simulator Workspace: Side-by-side with Dossier if active, or centered */}
      <div className="w-full max-w-5xl flex flex-col xl:flex-row items-center xl:items-start justify-center gap-8">
        {/* Left Side: Companion Dossier (Collapsible, never pushes phone down) */}
        {showDossier && (
          <div className="w-full xl:w-96 flex flex-col gap-4 order-2 xl:order-1 transition-all">
            <div className="inline-flex items-center gap-2 bg-primary-fixed/30 px-3 py-1.5 rounded-full w-fit">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[11px] font-bold text-on-primary-fixed uppercase tracking-wider">
                {tr("portal.mitanin_title") || "फ्रंटलाइन स्वास्थ्य कार्यकर्ता दृश्य • Field View"}
              </span>
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-on-surface tracking-tight">
                मितानिन मोबाइल साथी
              </h2>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Frontline mobile surveillance terminal crafted for low-bandwidth 2G environments, voice-driven triage logging, and localized audio diagnostics across Bastar division.
              </p>
            </div>

            {/* 2G / Offline Specs Cards */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div
                onClick={() => setShowSyncModal(true)}
                className="bg-surface-container-low p-3 rounded-xl border border-slate-200/80 shadow-2xs cursor-pointer hover:bg-surface-container transition-colors"
              >
                <div className="flex items-center gap-1.5 text-primary font-bold text-xs">
                  {online ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5 text-error" />}
                  <span>{online ? "2G Relay" : "Store-Forward"}</span>
                </div>
                <span className="text-[10px] text-on-surface-variant block mt-1 leading-snug">
                  {syncSummary.saved + syncSummary.queued > 0
                    ? `${syncSummary.saved + syncSummary.queued} action(s) stored locally on-device.`
                    : "All local logs synced with node."}
                </span>
              </div>

              <div className="bg-surface-container-low p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="flex items-center gap-1.5 text-tertiary font-bold text-xs">
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Voice UI (Halbi)</span>
                </div>
                <span className="text-[10px] text-on-surface-variant block mt-1 leading-snug">
                  Trilingual voice instructions and speech-to-text logging for zero-friction fieldwork.
                </span>
              </div>
            </div>

            {/* Worker Identity Card */}
            <div className="bg-surface-container-lowest p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
                  कार्यकर्ता प्रोफ़ाइल विवरण
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                  सक्रिय • Active
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                  सु
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-on-surface truncate">{mitaninName}</span>
                  <span className="text-[11px] text-on-surface-variant flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-primary shrink-0" />
                    {selectedLocation?.breadcrumb || "पटेल पारा, नेतानार • Tokapal"}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-on-surface-variant">
                <span>दैनिक कार्य पूर्णता दर:</span>
                <span className="font-bold text-primary">
                  {completedCount} / {tasks.length || 5} पूर्ण
                </span>
              </div>

              <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${tasks.length ? Math.round((completedCount / tasks.length) * 100) : 40}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Center / Right: Pixel-Accurate Mobile Handset Frame */}
        <div
          className={`order-1 xl:order-2 flex flex-col items-center transition-all duration-300 ${
            deviceFormat === "compact"
              ? "w-[360px] h-[740px]"
              : deviceFormat === "fluid"
              ? "w-full max-w-[420px] h-[844px]"
              : "w-[390px] h-[844px]"
          } max-h-[min(844px,calc(100vh-7rem))]`}
        >
          <div className="w-full h-full bg-slate-900 rounded-[48px] p-2.5 shadow-2xl border-4 border-slate-700/80 ring-1 ring-white/10 flex flex-col overflow-hidden">
            <div className="w-full h-full bg-surface rounded-[38px] overflow-hidden flex flex-col relative select-none shadow-inner">
              {/* Dynamic Island / Hardware Notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-30 flex items-center justify-between px-2.5 pointer-events-none">
                <div className="w-2 h-2 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-blue-900/50" />
                </div>
                <div className="w-8 h-1 rounded-full bg-slate-900" />
              </div>

              {/* Phone Status Bar (Fixed at top) */}
              <div className="shrink-0 bg-surface-container-lowest px-5 pt-3 pb-1.5 flex items-center justify-between text-[11px] font-bold text-on-surface border-b border-slate-100 z-20">
                <span className="font-mono text-[10px]">09:42</span>
                <div className="w-20" />
                <div className="flex items-center gap-1.5 text-on-surface font-mono">
                  <span className="text-[10px] text-primary font-bold">2G</span>
                  {online ? (
                    <Wifi className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <WifiOff className="w-3.5 h-3.5 text-error" />
                  )}
                  <span className="text-[10px]">88%</span>
                </div>
              </div>

              {/* Mobile App Header Bar (Fixed at top) */}
              <div className="shrink-0 bg-surface-container-lowest px-3.5 py-2.5 flex flex-col gap-2 shadow-2xs z-20 border-b border-slate-100">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs shadow-xs">
                        SK
                      </div>
                      <span className="absolute bottom-0 right-0 w-2 h-2 bg-primary-fixed border border-white rounded-full" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-on-surface leading-tight truncate">
                        नमस्ते, {mitaninName}
                      </span>
                      <button
                        onClick={onChangeLocation}
                        className="flex items-center gap-1 text-[11px] text-on-surface-variant hover:text-primary transition-colors text-left"
                      >
                        <MapPin className="w-3 h-3 text-primary shrink-0" />
                        <span className="truncate max-w-[130px]">
                          {selectedLocation?.village_name || "पटेल पारा, नेतानार"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Dialect Switcher Pills */}
                  <div className="inline-flex items-center bg-surface-container-low rounded-full p-0.5 border border-slate-200 text-[10px] font-bold shrink-0">
                    <button
                      onClick={() => setLanguage("hi")}
                      className={`px-2 py-0.5 rounded-full transition-colors ${
                        language === "hi"
                          ? "bg-surface-container-lowest text-on-surface shadow-2xs"
                          : "text-on-surface-variant"
                      }`}
                    >
                      हिन्दी
                    </button>
                    <button
                      onClick={() => setLanguage("hne")}
                      className={`px-2 py-0.5 rounded-full transition-colors ${
                        language === "hne"
                          ? "bg-surface-container-lowest text-on-surface shadow-2xs"
                          : "text-on-surface-variant"
                      }`}
                    >
                      CG
                    </button>
                    <button
                      onClick={() => setLanguage("en")}
                      className={`px-2 py-0.5 rounded-full transition-colors ${
                        language === "en"
                          ? "bg-surface-container-lowest text-on-surface shadow-2xs"
                          : "text-on-surface-variant"
                      }`}
                    >
                      EN
                    </button>
                  </div>
                </div>

                {/* Offline Sync Status Strip */}
                <div
                  onClick={() => setShowSyncModal(true)}
                  className="w-full bg-primary-fixed/20 text-on-primary-fixed-variant px-2.5 py-1 rounded-lg flex items-center justify-between cursor-pointer hover:bg-primary-fixed/30 transition-colors"
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-bold truncate">
                    <RotateCw className="w-3 h-3 text-primary shrink-0" />
                    <span className="truncate">
                      {online ? "2G लाइव सिंक चालू • Live" : "ऑफलाइन मोड • Local Queue"}
                    </span>
                  </div>
                  <span className="text-[9px] font-extrabold bg-primary text-on-primary px-1.5 py-0.2 rounded-full shrink-0">
                    {syncSummary.saved + syncSummary.queued} कतारबद्ध
                  </span>
                </div>
              </div>

              {/* View Router: Home vs Detail vs Confirmation */}
              {currentScreen === "home" && (
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3.5 py-3 flex flex-col gap-3 pb-4">
                  {/* Urgent Cluster Alert Callout */}
                  <div className="bg-error-container text-on-error-container rounded-2xl p-3.5 shadow-2xs border border-error/20 flex flex-col gap-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-error animate-ping" />
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-error">
                          लाल चेतावनी • URGENT CLUSTER
                        </span>
                      </div>
                      <span className="text-[10px] bg-tertiary-fixed text-on-tertiary-fixed font-bold px-2 py-0.5 rounded-full">
                        प्राथमिकता १
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xs font-bold text-on-error-container">
                        पटेल पारा में बुखार क्लस्टर (Fever Cluster)
                      </h3>
                      <p className="text-[11px] text-on-error-container/90 mt-0.5 leading-relaxed">
                        3 घरों में 48 घंटे में 5 बुखार के मामले मिले हैं। तुरंत RDT जांच व दवा सुनिश्चित करें।
                      </p>
                    </div>

                    <div className="pt-1 flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (tasks.length > 0) {
                            setSelectedTask(tasks[0]);
                            setCurrentScreen("detail");
                          }
                        }}
                        className="flex-1 bg-error hover:bg-tertiary text-on-error font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>जांच फॉर्म खोलें</span>
                      </button>
                    </div>
                  </div>

                  {/* Section: Today's Tasks */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-primary" />
                      <h3 className="text-xs font-extrabold text-on-surface uppercase tracking-wider">
                        आज के कार्य (Field Tasks)
                      </h3>
                    </div>
                    <span className="text-[10px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full font-bold">
                      {pendingTasks.length} शेष कार्य
                    </span>
                  </div>

                  {/* Disease Filter Chips */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
                    {["all", "malaria", "dengue", "diarrhoea", "heat"].map((df) => (
                      <button
                        key={df}
                        onClick={() => setDiseaseFilter(df)}
                        className={`px-2.5 py-1 rounded-full font-bold capitalize transition-colors shrink-0 ${
                          diseaseFilter === df
                            ? "bg-primary text-on-primary shadow-2xs"
                            : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                        }`}
                      >
                        {df}
                      </button>
                    ))}
                  </div>

                  {/* Task Cards List */}
                  <div className="flex flex-col gap-2.5">
                    {activeTasks.length === 0 ? (
                      <div className="p-6 text-center text-xs text-on-surface-variant bg-surface-container-low rounded-xl">
                        कोई लंबित कार्य नहीं मिला।
                      </div>
                    ) : (
                      activeTasks.map((t) => {
                        const isDone = t.status === "done";
                        const isNeedsHelp = t.status === "needs_help";
                        const isInProgress = t.status === "in_progress";
                        const localized = localizeTask(t);

                        return (
                          <div
                            key={t.id}
                            className={`p-3.5 rounded-2xl border shadow-2xs transition-all space-y-2.5 ${
                              isDone
                                ? "bg-surface-container-low/50 border-slate-200/60 opacity-85"
                                : "bg-surface-container-lowest border-slate-200/90 hover:shadow-xs"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`w-2.5 h-2.5 rounded-full ${
                                    isDone
                                      ? "bg-primary"
                                      : isNeedsHelp
                                      ? "bg-error"
                                      : isInProgress
                                      ? "bg-amber-500 animate-pulse"
                                      : "bg-secondary"
                                  }`}
                                />
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant">
                                  {t.disease_type || "Malaria"} • #{t.id}
                                </span>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isDone
                                    ? "bg-primary/10 text-primary"
                                    : isNeedsHelp
                                    ? "bg-error-container text-error"
                                    : isInProgress
                                    ? "bg-amber-100 text-amber-900"
                                    : "bg-surface-container text-on-surface-variant"
                                }`}
                              >
                                {isDone
                                  ? "पूर्ण • Done"
                                  : isNeedsHelp
                                  ? "मदद • Blocked"
                                  : isInProgress
                                  ? "प्रगति • In Progress"
                                  : "लंबित • Pending"}
                              </span>
                            </div>

                            <div>
                              <h4 className="text-xs font-bold text-on-surface leading-snug">
                                {localized.title}
                              </h4>
                              <p className="text-[11px] text-on-surface-variant mt-0.5 line-clamp-2">
                                {localized.instructions}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 pt-1">
                              <button
                                onClick={() => {
                                  setSelectedTask(t);
                                  setCurrentScreen("detail");
                                }}
                                className="flex-1 bg-primary hover:bg-primary-container text-on-primary text-[11px] font-bold py-2 px-2.5 rounded-xl flex items-center justify-center gap-1 transition-all active:scale-95"
                              >
                                <Play className="w-3 h-3" />
                                <span>शुरू करें (Start / Open)</span>
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedTask(t);
                                  setCurrentScreen("detail");
                                }}
                                className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors"
                                title="दिशा-निर्देश सुनें"
                              >
                                <Volume2 className="w-3.5 h-3.5 text-primary" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Voice Field Reporting Strip */}
                  <div className="bg-surface-container-lowest rounded-2xl p-3.5 shadow-2xs border border-slate-200/90 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-primary flex items-center gap-1">
                        <Mic className="w-3.5 h-3.5" />
                        आवाज आधारित रिपोर्टिंग (Voice Field Reporting)
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-medium">हल्बी / CG / हिन्दी</span>
                    </div>

                    <button
                      onClick={handleToggleVoiceRecord}
                      className={`w-full py-2.5 px-3 rounded-xl flex items-center justify-between gap-2.5 transition-all active:scale-98 shadow-xs ${
                        isRecording
                          ? "bg-error text-on-error animate-pulse"
                          : "bg-inverse-surface text-inverse-on-surface hover:bg-on-surface"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 text-left min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isRecording ? "bg-white text-error" : "bg-primary text-on-primary"
                          }`}
                        >
                          <Mic className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold block truncate">
                            {isRecording ? "सुन रहा हूँ... बोलिए" : "बोलकर काम दर्ज करें"}
                          </span>
                          <span className="text-[10px] opacity-80 block truncate">
                            {isRecording
                              ? "नाम, बुखार के दिन व दवा बोलें..."
                              : 'दबाएं और बोलें: "मलेरिया टेस्ट नेगेटिव दर्ज करो"'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-extrabold uppercase text-primary-fixed">
                        {isRecording ? "Stop" : "Mic"}
                      </span>
                    </button>

                    {recordedVoiceText && (
                      <div className="p-2.5 rounded-xl bg-primary-fixed/20 border border-primary/20 text-xs text-on-surface space-y-1.5">
                        <div className="text-[10px] font-bold text-primary uppercase">पहचाना गया विवरण:</div>
                        <p className="text-[11px] text-on-surface-variant italic">"{recordedVoiceText}"</p>
                        <div className="flex justify-end gap-1.5 pt-1">
                          <button
                            onClick={handleApplyVoiceToNotes}
                            className="px-2.5 py-1 rounded-lg bg-primary text-on-primary font-bold text-[10px]"
                          >
                            नोट्स में जोड़ें
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Tools Grid */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                      त्वरित उपकरण • Quick Tools
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-left">
                      <button
                        onClick={() => {
                          setDiseaseFilter("malaria");
                        }}
                        className="p-2.5 rounded-xl bg-surface-container-lowest border border-slate-200/90 hover:bg-surface-container shadow-2xs flex items-center gap-2 transition-all active:scale-95"
                      >
                        <div className="w-7 h-7 rounded-lg bg-primary-fixed text-primary flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-bold text-on-surface leading-tight">
                          मलेरिया टेस्ट किट रजिस्टर
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          setDiseaseFilter("diarrhoea");
                        }}
                        className="p-2.5 rounded-xl bg-surface-container-lowest border border-slate-200/90 hover:bg-surface-container shadow-2xs flex items-center gap-2 transition-all active:scale-95"
                      >
                        <div className="w-7 h-7 rounded-lg bg-secondary-fixed text-secondary flex items-center justify-center shrink-0">
                          <RotateCw className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-bold text-on-surface leading-tight">
                          दवा स्टॉक स्थिति
                        </span>
                      </button>

                      <a
                        href="tel:108"
                        className="p-2.5 rounded-xl bg-error-container text-on-error-container hover:bg-error/20 border border-error/20 shadow-2xs flex items-center gap-2 transition-all active:scale-95"
                      >
                        <div className="w-7 h-7 rounded-lg bg-error text-on-error flex items-center justify-center shrink-0">
                          <PhoneCall className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-bold text-error leading-tight">
                          आपातकालीन 108 एम्बुलेंस
                        </span>
                      </a>

                      <button
                        onClick={() => setShowSyncModal(true)}
                        className="p-2.5 rounded-xl bg-surface-container-lowest border border-slate-200/90 hover:bg-surface-container shadow-2xs flex items-center gap-2 transition-all active:scale-95"
                      >
                        <div className="w-7 h-7 rounded-lg bg-surface-container-highest text-on-surface flex items-center justify-center shrink-0">
                          <Clock className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-bold text-on-surface leading-tight">
                          ऑफलाइन सिंक रजिस्टर ({syncSummary.saved + syncSummary.queued})
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* View Router: Detail Screen */}
              {currentScreen === "detail" && selectedTask && (
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3.5 flex flex-col gap-3.5 pb-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <button
                      onClick={() => setCurrentScreen("home")}
                      className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>कार्यों पर वापस</span>
                    </button>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                      कार्य संख्या #{selectedTask.id}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-primary tracking-wider">
                      {selectedTask.disease_type || "Malaria"} • Priority: {selectedTask.priority || "High"}
                    </span>
                    <h2 className="text-sm font-extrabold text-on-surface leading-snug">
                      {localizeTask(selectedTask).title}
                    </h2>
                    <p className="text-xs text-on-surface-variant">
                      {localizeTask(selectedTask).instructions}
                    </p>
                  </div>

                  {/* Audio Instruction Player */}
                  <div className="p-3 bg-surface-container-low rounded-xl border border-slate-200/80">
                    <VoiceTaskPlayer task={selectedTask} />
                  </div>

                  {/* Standard Protocol Steps Checklist */}
                  {selectedTask.steps && selectedTask.steps.length > 0 && (
                    <div className="p-3.5 bg-surface-container-lowest rounded-xl border border-slate-200/90 space-y-2">
                      <span className="text-[11px] uppercase font-bold text-on-surface tracking-wider block">
                        मानक कार्य चरण (Protocol Steps)
                      </span>
                      <ul className="space-y-2 text-xs text-on-surface-variant">
                        {selectedTask.steps.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Completion Notes Textarea */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-on-surface flex items-center justify-between">
                      <span>क्षेत्रीय निष्कर्ष और दवा वितरण विवरण:</span>
                      <span className="text-[10px] text-on-surface-variant">वैकल्पिक / Optional</span>
                    </label>
                    <textarea
                      rows={3}
                      value={completionNotes}
                      onChange={(e) => setCompletionNotes(e.target.value)}
                      placeholder="उदा. 4 घरों में बुखार जांच, 1 पॉजिटिव, क्लोरोक्विन खुराक दी गई..."
                      className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 pt-1">
                    <Button
                      variant="primary"
                      size="md"
                      icon="check"
                      loading={submitting}
                      onClick={() => handleReply("done")}
                      className="w-full bg-primary text-on-primary py-2.5 font-bold"
                    >
                      पूर्ण घोषित करें (Complete Task)
                    </Button>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        icon="play_arrow"
                        disabled={submitting}
                        onClick={() => handleReply("in_progress")}
                      >
                        प्रगति में (In Progress)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        icon="help"
                        disabled={submitting}
                        onClick={() => handleReply("needs_help")}
                        className="text-error border-error/30 hover:bg-error-container/30"
                      >
                        मदद चाहिए (Blocked)
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* View Router: Confirmation Screen */}
              {currentScreen === "confirmation" && (
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-6 flex flex-col items-center justify-center text-center gap-3.5 pb-4">
                  <div className="w-14 h-14 rounded-full bg-primary-fixed text-primary flex items-center justify-center shadow-md animate-in zoom-in-75 duration-200">
                    <Check className="w-7 h-7" />
                  </div>

                  <div className="space-y-1 max-w-xs">
                    <h2 className="text-base font-extrabold text-on-surface">
                      {repliedAction === "done"
                        ? "कार्य सफलतापूर्वक दर्ज हुआ!"
                        : repliedAction === "needs_help"
                        ? "मदद अनुरोध सुपरवाइजर को भेजा गया!"
                        : "स्थिति अद्यतन सुरक्षित!"}
                    </h2>
                    <p className="text-[11px] text-on-surface-variant">
                      समय: {replyTime || "अभी"} •{" "}
                      {online ? "सर्वर पर तुरंत प्रेषित (2G Sync)" : "ऑफलाइन सुरक्षित (नेटवर्क मिलते ही सिंक होगा)"}
                    </p>
                  </div>

                  <div className="p-3 bg-surface-container-low rounded-xl border border-slate-200/80 text-left text-xs w-full max-w-xs space-y-1">
                    <div className="text-[10px] font-bold text-on-surface-variant uppercase">दर्ज कार्य:</div>
                    <div className="font-bold text-on-surface text-xs">{selectedTask?.title}</div>
                    <div className="text-[11px] text-primary font-semibold">
                      स्थिति: {repliedAction?.toUpperCase()}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 w-full max-w-xs pt-2">
                    {nextTask && (
                      <Button
                        variant="primary"
                        size="md"
                        icon="arrow_forward"
                        onClick={() => {
                          setSelectedTask(nextTask);
                          setCurrentScreen("detail");
                        }}
                      >
                        अगला कार्य खोलें (#{nextTask.id})
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => setCurrentScreen("home")}
                    >
                      मुख्य सूची पर वापस जाएँ
                    </Button>
                  </div>
                </div>
              )}

              {/* Bottom Mobile Navigation Bar (Fixed at bottom of screen) */}
              <div className="shrink-0 bg-surface-container-lowest/95 backdrop-blur-md px-3 py-1.5 shadow-md border-t border-slate-100 flex items-center justify-around z-20 text-[10px]">
                <button
                  onClick={() => setCurrentScreen("home")}
                  className={`flex flex-col items-center gap-0.5 ${
                    currentScreen === "home" ? "text-primary font-bold" : "text-on-surface-variant"
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>आज के कार्य</span>
                </button>

                <button
                  onClick={() => {
                    setDiseaseFilter("all");
                    setCurrentScreen("home");
                  }}
                  className="flex flex-col items-center gap-0.5 text-on-surface-variant hover:text-on-surface relative"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>अलर्ट</span>
                  <span className="absolute top-0 right-1 w-1.5 h-1.5 rounded-full bg-error" />
                </button>

                <div className="-mt-3.5">
                  <button
                    onClick={handleToggleVoiceRecord}
                    className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg hover:bg-primary-container active:scale-95 transition-transform"
                    title="बोलकर रिपोर्ट करें"
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                </div>

                <button
                  onClick={() => {
                    if (selectedTask) setCurrentScreen("detail");
                  }}
                  className={`flex flex-col items-center gap-0.5 ${
                    currentScreen === "detail" ? "text-primary font-bold" : "text-on-surface-variant"
                  }`}
                >
                  <Volume2 className="w-4 h-4" />
                  <span>निर्देश</span>
                </button>

                <button
                  onClick={() => setShowSyncModal(true)}
                  className="flex flex-col items-center gap-0.5 text-on-surface-variant hover:text-on-surface relative"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>सिंक ({syncSummary.saved + syncSummary.queued})</span>
                </button>
              </div>

              {/* Hardware Home Indicator Bar */}
              <div className="shrink-0 bg-surface-container-lowest/95 pb-1 flex justify-center z-20">
                <div className="w-28 h-1 bg-slate-300 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
