import React, { useState, useEffect, useCallback } from "react";
import {
  Volume2,
  CheckCircle2,
  MapPin,
  ShieldAlert,
  Search,
  Radio
} from "lucide-react";
import { useI18n } from "../i18n/I18nContext";
import { VoiceTaskPlayer } from "../components/VoiceTaskPlayer";
import { VoiceInputButton } from "../components/VoiceInputButton";
import { Button } from "../components/ui";

const API_BASE = "http://127.0.0.1:8000";

interface VoiceTasksPageProps {
  authToken?: string | null;
  currentUser?: any;
  selectedLocation?: {
    district_id: string;
    block_id: string;
    village_id?: string | null;
  };
}

const REFERENCE_AWARENESS_TASK = {
  id: 901,
  disease_type: "malaria",
  title: "Scheduled Malaria Awareness & Field Report Visit",
  instructions:
    "Visit the assigned village, conduct the scheduled malaria awareness activity, and submit the field report before 4 PM.",
  priority: "High",
  district_id: "DIST_SAMPLE",
  block_id: "BLK_A",
  village_id: "VIL_A1",
  location_name: "Sample District · Sample Block A · Sample Village A1 (Sector 4 Hamlet)",
  deadline: "2026-10-12T16:00:00",
  status: "sent",
};

export const VoiceTasksPage: React.FC<VoiceTasksPageProps> = ({
  authToken,
  selectedLocation,
}) => {
  const { t, localizeTask, localizePriority, localizeStatus, localizeDisease, language, setLanguage } = useI18n();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [diseaseFilter, setDiseaseFilter] = useState<string>("all");
  const [completionNotesByTask] = useState<Record<number, string>>({});
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      if (authToken) {
        const res = await fetch(`${API_BASE}/employee/tasks`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data.tasks) ? data.tasks : Array.isArray(data) ? data : [];
          setTasks(list.length > 0 ? list : [REFERENCE_AWARENESS_TASK]);
          setLoading(false);
          return;
        }
      }
      // Fallback to public/demo tasks for selected block
      const blk = selectedLocation?.block_id || "BLK_A";
      const res = await fetch(`${API_BASE}/tasks?unit_id=${blk}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.tasks || [];
        setTasks([REFERENCE_AWARENESS_TASK, ...list]);
      } else {
        setTasks([REFERENCE_AWARENESS_TASK]);
      }
    } catch {
      setTasks([REFERENCE_AWARENESS_TASK]);
    } finally {
      setLoading(false);
    }
  }, [authToken, selectedLocation?.block_id]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleExplicitTaskAction = async (
    taskId: number,
    action: "acknowledge" | "start" | "complete" | "need_help"
  ) => {
    setActionFeedback(null);
    const notes = completionNotesByTask[taskId] || "";

    if (authToken && taskId !== 901) {
      try {
        const res = await fetch(`${API_BASE}/employee/tasks/${taskId}/action`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            action,
            notes: notes || `Updated via Voice Tasks explicit ${action} button.`,
            completion_notes: action === "complete" ? notes || "Completed field visit." : undefined,
          }),
        });
        if (res.ok) {
          setActionFeedback(`Task #${taskId} updated (${action}).`);
          fetchTasks();
          return;
        }
      } catch {
        // fallback to local state update
      }
    }

    const statusMap: Record<string, string> = {
      acknowledge: "acknowledged",
      start: "in_progress",
      complete: "done",
      need_help: "needs_help",
    };
    setTasks((prev) =>
      prev.map((item) =>
        item.id === taskId ? { ...item, status: statusMap[action] || item.status } : item
      )
    );
    setActionFeedback(`Task #${taskId} status explicitly updated to '${statusMap[action]}'.`);
  };

  const filteredTasks = tasks.filter((task) => {
    if (diseaseFilter !== "all" && (task.disease_type || "malaria").toLowerCase() !== diseaseFilter) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const loc = localizeTask(task);
    const q = searchQuery.toLowerCase();
    return (
      loc.title.toLowerCase().includes(q) ||
      loc.instructions.toLowerCase().includes(q) ||
      loc.locationLabel.toLowerCase().includes(q) ||
      String(task.title || "").toLowerCase().includes(q)
    );
  });

  const highPriorityCount = tasks.filter(
    (t) => (t.priority || "").toLowerCase() === "high" || (t.priority || "").toLowerCase() === "critical"
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-6 text-on-surface" data-testid="voice-tasks-page">
      {/* 1. TOP CONSOLE TICKER & LANGUAGE SELECTOR BANNER (STITCH EXACT STYLING) */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-surface-container-high via-surface-container-low to-surface-container p-5 sm:p-6 shadow-2xs border border-slate-200/90">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-md shrink-0">
              <Volume2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary text-[10px] font-extrabold uppercase tracking-wider">
                  Voice Operational Rail
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-fixed text-[10px] font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                  Live Audio Link Active
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-on-surface tracking-tight">
                {t("voice.page_title")} • आवाज आधारित कार्य प्रणाली
              </h1>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Frontline guidance streaming directly to field tablets & Asha-Mitanin audio receivers
              </p>
            </div>
          </div>

          {/* Dialect Selector Pills */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-surface-container-lowest/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-on-surface-variant px-2">Language:</span>
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => setLanguage("hne")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                  language === "hne"
                    ? "bg-primary text-on-primary shadow-2xs"
                    : "text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                छत्तीसगढ़ी (CG)
              </button>
              <button
                type="button"
                onClick={() => setLanguage("hi")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                  language === "hi"
                    ? "bg-primary text-on-primary shadow-2xs"
                    : "text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                हिन्दी (Hindi)
              </button>
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                  language === "en"
                    ? "bg-primary text-on-primary shadow-2xs"
                    : "text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                English
              </button>
            </div>
          </div>
        </div>

        {/* Explicit Completion Safeguard Notice */}
        <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200/80 px-3.5 py-2 text-xs text-amber-900 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
          <span>{t("voice.explicit_completion_notice")}</span>
        </div>
      </section>

      {/* 2. SEARCH, VOICE FILTER & DISEASE CHIPS */}
      <section className="bg-surface-container-lowest rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-on-surface-variant absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("employee.search_tasks_placeholder")}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary bg-surface-container-lowest"
            />
          </div>
          <VoiceInputButton
            size="md"
            onTranscript={(text) => setSearchQuery(text)}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
          <div className="flex flex-wrap gap-1.5 text-xs">
            {["all", "malaria", "dengue", "diarrhoea", "heat"].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDiseaseFilter(d)}
                className={`px-3 py-1.5 rounded-xl font-bold capitalize transition-all ${
                  diseaseFilter === d
                    ? "bg-primary text-on-primary shadow-2xs"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                {d === "all" ? t("employee.filter_all") : localizeDisease(d)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-on-surface-variant font-medium">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span>Tokapal PHC Relay Gateway</span>
            <span>•</span>
            <span className="font-bold text-on-surface">{tasks.length} Directives</span>
          </div>
        </div>
      </section>

      {actionFeedback && (
        <div className="rounded-xl bg-primary-fixed/30 border border-primary/20 px-4 py-3 text-xs font-bold text-primary flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* 3. MAIN WORKSPACE (SPLIT 8-COL / 4-COL LAYOUT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Voice Directives Queue (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-on-surface uppercase tracking-wider">
                Mandatory Audio Directives
              </h2>
              {highPriorityCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-error-container text-error text-[10px] font-bold">
                  {highPriorityCount} Urgent
                </span>
              )}
            </div>
            <span className="text-xs text-on-surface-variant font-semibold">
              {filteredTasks.length} Visible
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-slate-200/90">
              Loading voice task audio streams...
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-8 text-center text-xs text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-slate-200/90">
              No voice tasks match the current filter.
            </div>
          ) : (
            filteredTasks.map((task) => {
              const loc = localizeTask(task);
              const isDone = (task.status || "").toLowerCase() === "done";
              const isHighPriority =
                (task.priority || "").toLowerCase() === "high" ||
                (task.priority || "").toLowerCase() === "critical";

              return (
                <div
                  key={task.id}
                  className={`rounded-2xl bg-surface-container-lowest p-5 sm:p-6 shadow-2xs border transition-all space-y-4 relative overflow-hidden ${
                    isDone
                      ? "border-slate-200/60 opacity-80"
                      : isHighPriority
                      ? "border-amber-300/80 shadow-xs"
                      : "border-slate-200/90 hover:shadow-xs"
                  }`}
                  data-testid={`voice-task-card-${task.id}`}
                >
                  {/* Left accent indicator line */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                      isDone
                        ? "bg-primary"
                        : isHighPriority
                        ? "bg-tertiary-container"
                        : "bg-primary-fixed"
                    }`}
                  />

                  {/* Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pl-1 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isHighPriority && (
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-tertiary" />
                        </span>
                      )}
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">
                        {loc.diseaseLabel} • Directive
                      </span>
                      <span className="text-xs text-on-surface-variant">•</span>
                      <span className="text-[11px] text-on-surface-variant font-medium">
                        Task #{task.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isHighPriority
                            ? "bg-tertiary-fixed text-on-tertiary-fixed"
                            : "bg-surface-container-high text-on-surface-variant"
                        }`}
                      >
                        {localizePriority(task.priority)}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isDone
                            ? "bg-primary/10 text-primary"
                            : "bg-surface-container text-on-surface-variant"
                        }`}
                      >
                        {localizeStatus(task.status)}
                      </span>
                    </div>
                  </div>

                  {/* Title & Instructions */}
                  <div className="pl-1 space-y-1">
                    <h3 className="text-base font-bold text-on-surface leading-snug">
                      {loc.title}
                    </h3>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {loc.instructions}
                    </p>
                    <div className="text-[11px] text-on-surface-variant flex items-center gap-1 pt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      <span>{loc.locationLabel}</span>
                    </div>
                  </div>

                  {/* Audio Player Component */}
                  <div className="pl-1">
                    <VoiceTaskPlayer task={task} />
                  </div>

                  {/* Explicit Field Action Buttons */}
                  <div className="pl-1 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        icon="check"
                        disabled={isDone}
                        onClick={() => handleExplicitTaskAction(task.id, "complete")}
                      >
                        {isDone ? "Completed" : "Complete Task"}
                      </Button>
                      {!isDone && (
                        <Button
                          variant="outline"
                          size="sm"
                          icon="play_arrow"
                          onClick={() => handleExplicitTaskAction(task.id, "start")}
                        >
                          Start
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!isDone && (
                        <Button
                          variant="outline"
                          size="sm"
                          icon="help"
                          onClick={() => handleExplicitTaskAction(task.id, "need_help")}
                        >
                          Need Help
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Audio System Specs & Dialect Info (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold block">
              Bastar Voice Protocol Engine
            </span>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Designed for front-line Mitanins operating without screen access during door-to-door sweeps. All instructions are pre-rendered into Devanagari phonetics with low-latency client speech synthesis.
            </p>
            <div className="p-3 bg-surface-container-low rounded-xl text-xs space-y-1.5">
              <div className="font-bold text-on-surface flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-primary" />
                <span>Audio Channel Modes</span>
              </div>
              <ul className="space-y-1 text-[11px] text-on-surface-variant">
                <li>• <strong>Chhattisgarhi:</strong> Native dialect audio prompts for vector survey.</li>
                <li>• <strong>Halbi:</strong> Tribal forest belt translation assistance.</li>
                <li>• <strong>Hindi:</strong> Standard statutory DHS operating procedures.</li>
              </ul>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold block">
              Field Audio Safeguards
            </span>
            <div className="text-xs text-on-surface-variant space-y-2">
              <p>
                <strong>No Automatic Completion:</strong> Listening to an audio prompt never marks a clinical task complete. A physical confirmation button or recorded voice report must be logged.
              </p>
              <p>
                <strong>Zero-Bandwidth Fallback:</strong> If speech synthesis models fail to connect, textual instructions in Chhattisgarhi script remain readable.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
