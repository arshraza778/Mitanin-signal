import { useState, useEffect } from "react";
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  ReferenceLine 
} from "recharts";
import { 
  ChevronRight, 
  AlertTriangle, 
  ArrowLeft 
} from "lucide-react";
import { useMeta } from "../hooks/useMeta";
import { AssignTaskModal } from "../components/AssignTaskModal";
import { Button, LoadingState, ErrorState, EmptyState } from "../components/ui";

interface AlertDetailProps {
  initialAlertId?: number;
  onNavigateBack?: () => void;
  onTaskCreated?: () => void;
  onNavigateToAssignTask?: (alertId: number) => void;
}

export function AlertDetail({
  initialAlertId = 1,
  onNavigateBack,
  onTaskCreated,
  onNavigateToAssignTask,
}: AlertDetailProps) {
  const { meta } = useMeta();
  const [alertsList, setAlertsList] = useState<any[]>([]);
  const [selectedAlertId, setSelectedAlertId] = useState<number>(initialAlertId);
  const [alert, setAlert] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [severityFilter, setSeverityFilter] = useState<"all" | "critical" | "warning" | "advisory">("all");
  const [diseaseFilter, setDiseaseFilter] = useState<string>("all");

  // Fetch available alerts for switcher / stream
  useEffect(() => {
    fetch("http://127.0.0.1:8000/alerts")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load alerts list");
        return res.json();
      })
      .then((data) => {
        setAlertsList(data);
        if (data.length > 0 && !selectedAlertId) {
          setSelectedAlertId(data[0].id);
        }
      })
      .catch((err) => setError(err.message));
  }, []);

  // Fetch specific alert detail
  const fetchDetail = (id: number) => {
    setLoading(true);
    fetch(`http://127.0.0.1:8000/alerts/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load alert detail");
        return res.json();
      })
      .then((data) => {
        setAlert(data);
        setFeedbackStatus(data.status);
        setLoading(false);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (selectedAlertId) {
      fetchDetail(selectedAlertId);
    }
  }, [selectedAlertId]);

  // Handle Feedback / Human Review (Acknowledge, Snooze, or False Alarm)
  const handleFeedback = async (action: "acknowledged" | "snooze" | "false_alarm") => {
    if (!alert) return;
    try {
      const notesMap: Record<string, string> = {
        acknowledged: "Reviewed and acknowledged by supervisor for operational response.",
        snooze: "Snoozed by district surveillance officer.",
        false_alarm: "Marked as false alarm after clinical triage.",
      };
      const res = await fetch(`http://127.0.0.1:8000/alerts/${alert.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          notes: notesMap[action],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setFeedbackStatus(data.action);
        if (alert) {
          setAlert({ ...alert, status: data.action });
        }
      }
    } catch {}
  };

  if (loading && !alert) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <LoadingState
          message="Loading alert intelligence..."
          subMessage="Querying disease surveillance parameters and historical epidemiological data"
        />
      </div>
    );
  }

  if (error && !alert) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        {onNavigateBack && (
          <Button variant="outline" size="sm" icon="arrow_back" onClick={onNavigateBack}>
            Back to Overview
          </Button>
        )}
        <ErrorState
          title="Alert Surveillance Error"
          message={error}
          onRetry={() => fetchDetail(selectedAlertId)}
        />
      </div>
    );
  }

  if (!alert) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <EmptyState
          icon="warning"
          title="Alert Not Found"
          description="Please select an alert from the epidemiological stream or return to the overview."
          actionLabel="Back to Overview"
          actionIcon="arrow_back"
          onAction={onNavigateBack}
        />
      </div>
    );
  }

  const isHighRisk = alert.risk === "High" || alert.risk === "Very High";
  const isMedRisk = alert.risk === "Medium" || alert.risk === "Moderate";
  const isWeatherModel = alert.method_used === "weather_model";
  const chartData = alert.forecast_chart || [];
  const confidenceBars = alert.confidence_bars || (alert.confidence >= 0.8 ? 3 : alert.confidence >= 0.7 ? 2 : 1);
  const confidenceLabel = alert.confidence_label || (confidenceBars === 3 ? "High" : confidenceBars === 2 ? "Medium" : "Low");
  const isReviewed = feedbackStatus === "acknowledged" || alert.status === "acknowledged" || (alert.tasks && alert.tasks.length > 0);
  const sourceLabel = isWeatherModel ? "Weather-informed forecast" : "Seasonal baseline / surveillance rule";
  const skillGateBadge = isWeatherModel ? "Skill gate: Pass" : "Skill gate: Fail (baseline fallback)";

  // Filtered alert list for sidebar stream
  const filteredAlertsList = alertsList.filter((a) => {
    if (severityFilter === "critical" && !(a.risk === "High" || a.risk === "Very High")) return false;
    if (severityFilter === "warning" && !(a.risk === "Medium" || a.risk === "Moderate")) return false;
    if (severityFilter === "advisory" && (a.risk === "High" || a.risk === "Very High" || a.risk === "Medium" || a.risk === "Moderate")) return false;
    if (diseaseFilter !== "all" && a.disease_type && a.disease_type !== diseaseFilter) return false;
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-on-surface">
      {/* 1. TOP INVESTIGATION CONTEXT BAR (STITCH EXACT STYLING) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant font-medium mb-1">
            {onNavigateBack && (
              <button
                onClick={onNavigateBack}
                className="hover:text-primary transition-colors flex items-center gap-1 font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Overview</span>
              </button>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-on-surface font-semibold">Alert Dossier</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-primary font-bold">{alert.unit_name}</span>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-error animate-ping"></span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-on-surface tracking-tight">
              Epidemic Alerts & Incident Triage Console
            </h1>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Real-time multi-variate epidemiological surveillance, signal attribution, and accountable CHW dispatch.
          </p>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center flex-wrap gap-2.5 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container-low border border-slate-200">
            <span className="material-symbols-outlined text-primary text-[18px]">sensors</span>
            <div className="flex flex-col text-left">
              <span className="text-[10px] uppercase font-bold text-on-surface-variant">Active Incidents</span>
              <span className="text-xs font-bold text-on-surface">{alertsList.length} Units Flagged</span>
            </div>
          </div>
          {onNavigateBack && (
            <Button variant="outline" size="md" icon="dashboard" onClick={onNavigateBack}>
              Block Overview
            </Button>
          )}
        </div>
      </div>

      {/* 2. MAIN 12-COLUMN MASTER-DETAIL LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: PRIORITIZED ALERT STREAM (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-3.5">
          {/* Severity & Disease Filter Card */}
          <div className="bg-surface-container-lowest rounded-xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block mb-1.5">
                Severity Filter
              </span>
              <div className="grid grid-cols-4 gap-1 bg-surface-container-low p-1 rounded-lg text-center text-xs">
                <button
                  type="button"
                  onClick={() => setSeverityFilter("all")}
                  className={`py-1 rounded font-semibold transition-colors ${
                    severityFilter === "all" ? "bg-surface-container-lowest text-on-surface shadow-2xs font-bold" : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  All ({alertsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSeverityFilter("critical")}
                  className={`py-1 rounded font-semibold transition-colors ${
                    severityFilter === "critical" ? "bg-error-container text-on-error-container shadow-2xs font-bold" : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Critical
                </button>
                <button
                  type="button"
                  onClick={() => setSeverityFilter("warning")}
                  className={`py-1 rounded font-semibold transition-colors ${
                    severityFilter === "warning" ? "bg-amber-100 text-amber-900 shadow-2xs font-bold" : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Warning
                </button>
                <button
                  type="button"
                  onClick={() => setSeverityFilter("advisory")}
                  className={`py-1 rounded font-semibold transition-colors ${
                    severityFilter === "advisory" ? "bg-surface-container-lowest text-on-surface shadow-2xs font-bold" : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Watch
                </button>
              </div>
            </div>

            {/* Disease Quick Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
              {["all", "malaria", "dengue", "diarrhoea", "heat"].map((dKey) => (
                <button
                  key={dKey}
                  type="button"
                  onClick={() => setDiseaseFilter(dKey)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold capitalize transition-colors ${
                    diseaseFilter === dKey
                      ? "bg-primary text-on-primary shadow-2xs"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  {dKey === "all" ? "All Risks" : dKey}
                </button>
              ))}
            </div>
          </div>

          {/* Alert Stream Feed List */}
          <div className="flex flex-col gap-2.5 max-h-[720px] overflow-y-auto pr-1">
            {filteredAlertsList.length === 0 ? (
              <div className="p-6 text-center text-xs text-on-surface-variant bg-surface-container-lowest rounded-xl border border-slate-200">
                No alerts match the selected filters.
              </div>
            ) : (
              filteredAlertsList.map((a) => {
                const isSelected = a.id === selectedAlertId;
                const isHigh = a.risk === "High" || a.risk === "Very High";
                const isMed = a.risk === "Medium" || a.risk === "Moderate";

                const borderLeftColor = isHigh ? "bg-error" : isMed ? "bg-amber-500" : "bg-primary";
                const chipBg = isHigh ? "bg-error-container text-on-error-container" : isMed ? "bg-amber-100 text-amber-900" : "bg-primary/10 text-primary";

                return (
                  <div
                    key={a.id}
                    onClick={() => setSelectedAlertId(a.id)}
                    className={`bg-surface-container-lowest rounded-xl p-3.5 border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? "border-primary shadow-sm ring-1 ring-primary/30"
                        : "border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-xs"
                    }`}
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${borderLeftColor}`} />
                    <div className="pl-2">
                      <div className="flex items-center justify-between gap-1 pb-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${chipBg}`}>
                          {a.risk} Risk
                        </span>
                        <span className="font-mono text-[10px] text-on-surface-variant font-bold">
                          #ALT-{a.id}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-on-surface truncate mt-0.5">
                        {a.unit_name || a.unit_id}
                      </h4>
                      <p className="text-[11px] text-on-surface-variant line-clamp-2 mt-0.5">
                        {a.details || a.trigger_reason || `Surveillance warning for ${a.unit_name || a.unit_id}`}
                      </p>
                      <div className="flex items-center justify-between pt-2 mt-1.5 border-t border-slate-100 text-[10px] text-on-surface-variant">
                        <span>Horizon: {a.lead_time || a.forecast_period || "2-4 wks"}</span>
                        <span className="font-semibold text-primary">
                          {isSelected ? "Active Dossier" : "Click to view"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE ALERT DOSSIER (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* Alert Header Banner */}
          <div className="bg-surface-container-lowest rounded-xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                      isHighRisk
                        ? "bg-error-container text-on-error-container border border-error/20"
                        : isMedRisk
                        ? "bg-amber-100 text-amber-900 border border-amber-200"
                        : "bg-primary/10 text-primary border border-primary/20"
                    }`}
                  >
                    {alert.risk} RISK
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      isWeatherModel
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-surface-container text-on-surface-variant border border-slate-200"
                    }`}
                  >
                    {skillGateBadge}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      isReviewed
                        ? "bg-primary-fixed/80 text-on-primary-fixed-variant border border-primary-fixed-dim"
                        : "bg-amber-50 text-amber-900 border border-amber-200"
                    }`}
                  >
                    {isReviewed ? "Reviewed by human supervisor" : "Requires human triage before task dispatch"}
                  </span>
                  {feedbackStatus === "snooze" && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-900">
                      SNOOZED
                    </span>
                  )}
                  {feedbackStatus === "false_alarm" && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-error-container text-on-error-container">
                      FALSE ALARM
                    </span>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold text-on-surface">
                  {alert.unit_name}
                </h2>
                <p className="text-xs text-on-surface-variant mt-1">
                  Source: <strong className="text-on-surface">{sourceLabel}</strong> • Target forecast horizon: 2–4 weeks, subject to local validation • Uncertainty: 80% PI
                </p>
                {!isWeatherModel && (
                  <p className="text-[11px] text-amber-800 font-semibold mt-1">
                    Automatic weather-model-driven escalation is disabled for this block because the weather model did not pass the baseline skill gate.
                  </p>
                )}
              </div>

              {/* Confidence Meter & Score */}
              <div className="flex flex-col items-start sm:items-end shrink-0">
                <div className="text-xs font-semibold text-on-surface-variant">
                  Attribution Confidence: <strong className="text-on-surface">{confidenceLabel}</strong>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className={`h-2 w-7 rounded-full ${confidenceBars >= 1 ? "bg-primary" : "bg-slate-200"}`} />
                  <span className={`h-2 w-7 rounded-full ${confidenceBars >= 2 ? "bg-primary" : "bg-slate-200"}`} />
                  <span className={`h-2 w-7 rounded-full ${confidenceBars >= 3 ? "bg-primary" : "bg-slate-200"}`} />
                </div>
              </div>
            </div>

            {/* Action Buttons Toolbar */}
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
              {!isReviewed && (
                <Button
                  variant="primary"
                  size="sm"
                  icon="check_circle"
                  onClick={() => handleFeedback("acknowledged")}
                >
                  Review & Acknowledge
                </Button>
              )}

              <Button
                variant="primary"
                size="sm"
                icon="add_task"
                onClick={async () => {
                  if (!isReviewed) {
                    await handleFeedback("acknowledged");
                  }
                  if (onNavigateToAssignTask && alert) {
                    onNavigateToAssignTask(alert.id);
                  } else {
                    setShowAssignModal(true);
                  }
                }}
              >
                {isReviewed ? "Dispatch Field Task" : "Review & Dispatch Task"}
              </Button>

              <button
                type="button"
                onClick={() => handleFeedback("snooze")}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                  feedbackStatus === "snooze"
                    ? "bg-secondary-container text-on-secondary-fixed border-secondary"
                    : "border-slate-200 text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                Snooze Alert
              </button>

              <button
                type="button"
                onClick={() => handleFeedback("false_alarm")}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                  feedbackStatus === "false_alarm"
                    ? "bg-error-container text-on-error-container border-error"
                    : "border-slate-200 text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                False Alarm
              </button>
            </div>
          </div>

          {/* Large Forecast Trajectory Chart */}
          <div className="bg-surface-container-lowest rounded-xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
              <div>
                <h3 className="text-base font-bold text-on-surface">Epidemiological Trajectory ({alert.unit_name})</h3>
                <p className="text-xs text-on-surface-variant">
                  {meta.granularity ? meta.granularity.charAt(0).toUpperCase() + meta.granularity.slice(1) : "Period"} cases •{" "}
                  {isWeatherModel 
                    ? "Weather model crosses early warning threshold (simulated)" 
                    : "Seasonal baseline used (no weather model for this unit)"}
                </p>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center flex-wrap gap-3 text-[11px] font-medium text-on-surface-variant">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-slate-900" /> Actual
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 border-b-2 border-dashed border-slate-400" /> Baseline
                </span>
                {isWeatherModel && (
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-primary" /> Weather model
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-primary-fixed/40 rounded-xs" /> 80% range
                </span>
              </div>
            </div>

            {/* Chart Canvas */}
            {chartData && chartData.length > 0 ? (
              <div className="h-64 w-full pt-2 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 12, right: 15, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="period" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} domain={[0, 420]} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "#FFFFFF", 
                        borderColor: "#cbd5e1", 
                        borderRadius: "8px",
                        fontSize: "12px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                      }} 
                    />
                    {/* Alert level reference line */}
                    <ReferenceLine 
                      y={alert.alert_level || 260} 
                      stroke="#ba1a1a" 
                      strokeDasharray="4 4" 
                      label={{ value: "Epidemic Alert Threshold", position: "top", fill: "#ba1a1a", fontSize: 10, offset: 5 }} 
                    />
                    {/* 80% Confidence Range Area */}
                    <Area 
                      type="monotone" 
                      dataKey="ci_upper" 
                      fill="#6bd8cb" 
                      fillOpacity={0.2}
                      stroke="none" 
                      isAnimationActive={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="actual" 
                      name="Actual" 
                      stroke="#0f172a" 
                      strokeWidth={2.5} 
                      dot={{ r: 3, fill: "#0f172a" }} 
                      connectNulls={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="baseline" 
                      name="Seasonal baseline" 
                      stroke="#64748b" 
                      strokeWidth={2} 
                      strokeDasharray="4 4" 
                      dot={false}
                      connectNulls={true}
                    />
                    {isWeatherModel && (
                      <Line 
                        type="monotone" 
                        dataKey="weather_model" 
                        name="Weather model" 
                        stroke="#00685f" 
                        strokeWidth={2.5} 
                        dot={{ r: 4, fill: "#00685f" }} 
                        connectNulls={true}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
                <div className="absolute bottom-1 right-28 text-[10px] text-on-surface-variant font-medium">
                  Model Projection Window
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-on-surface-variant text-xs bg-surface-container-low/40 rounded-xl mt-2">
                <AlertTriangle className="w-6 h-6 text-slate-400 mb-1" />
                <p className="font-semibold text-on-surface">No forecast trajectory generated.</p>
                <p className="text-[11px] mt-0.5">This unit is operating under routine sentinel baseline surveillance.</p>
              </div>
            )}
          </div>

          {/* Attribution & Method Explanation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Attribution Breakdown */}
            <div className="bg-surface-container-lowest rounded-xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
              <div className="pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-on-surface">Signal Attribution Factors</h3>
                <p className="text-[11px] text-on-surface-variant">Key environmental & clinical drivers</p>
              </div>

              {isWeatherModel && alert.why_this_alert ? (
                <div className="space-y-3 pt-1">
                  {alert.why_this_alert.map((driver: any, idx: number) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-on-surface">{driver.name}</span>
                        <span className="font-semibold text-primary capitalize">{driver.level}</span>
                      </div>
                      <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden border border-slate-200">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${driver.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-on-surface-variant pt-2 leading-relaxed">
                  Weather model did not demonstrate statistical skill over baseline for this unit.
                  Alert triggered by seasonal endemic threshold breach.
                </p>
              )}
            </div>

            {/* Method Used & Early-Warning Advance */}
            <div className="bg-surface-container-lowest rounded-xl p-4 border border-slate-200/90 shadow-2xs space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-on-surface">Methodology & Lead Time</h3>
                  <p className="text-[11px] text-on-surface-variant">Validated modeling framework</p>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    isWeatherModel ? "bg-primary/10 text-primary border border-primary/20" : "bg-surface-container text-on-surface-variant border border-slate-200"
                  }`}>
                    {alert.method_card?.name || (isWeatherModel ? "Weather Model" : "Seasonal Baseline")}
                  </span>
                  <span className="text-xs text-on-surface-variant leading-tight">
                    {alert.method_card?.evidence_text || "Evaluated against held-out historical periods"}
                  </span>
                </div>

                <p className="text-xs text-on-surface-variant pt-2 leading-relaxed border-t border-slate-100">
                  {alert.method_card?.reactive_comparison || 
                    `Compared with a reactive rule (mean + 2 SD), this alert appears approximately 2 ${meta.unit_label} earlier.`}
                </p>
              </div>

              <div className="text-[10px] text-on-surface-variant pt-2 border-t border-slate-100">
                Notice: All predictions are probabilistic model estimates requiring field verification.
              </div>
            </div>
          </div>

          {/* Similar Past Surges Table */}
          <div className="bg-surface-container-lowest rounded-xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-on-surface">Similar Past Surges (Historical Baseline)</h3>
                <p className="text-xs text-on-surface-variant">Prior outbreak trajectories in this catchment</p>
              </div>
              <span className="text-xs text-on-surface-variant font-medium">Loaded History</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-on-surface-variant border-b border-slate-100 pb-2 text-[11px] font-bold uppercase tracking-wider">
                    <th className="pb-2">Surge Period</th>
                    <th className="pb-2">Peak Cases</th>
                    <th className="pb-2">Model Early Warning</th>
                    <th className="pb-2 text-right">Containment Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(alert.similar_past_surges || []).map((surge: any, idx: number) => {
                    const isSuccess = surge.outcome_type === "success";
                    return (
                      <tr key={idx} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="py-2.5 font-bold text-on-surface">{surge.period}</td>
                        <td className="py-2.5 text-on-surface-variant">{surge.peak}</td>
                        <td className="py-2.5 text-on-surface-variant">{surge.model_warning}</td>
                        <td className="py-2.5 text-right">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                            isSuccess ? "bg-emerald-50 text-emerald-800" : "bg-error-container text-on-error-container"
                          }`}>
                            {surge.outcome}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Linked Response Tasks Table */}
          <div className="bg-surface-container-lowest rounded-xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-on-surface">Linked Response Tasks ({alert.unit_name})</h3>
                <p className="text-xs text-on-surface-variant">Frontline task assignments triggered from this alert</p>
              </div>
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                {(alert.tasks || []).length} Dispatched Task(s)
              </span>
            </div>

            {(alert.tasks || []).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-on-surface-variant border-b border-slate-100 pb-2 text-[11px] font-bold uppercase tracking-wider">
                      <th className="pb-2">Task ID</th>
                      <th className="pb-2">Directive</th>
                      <th className="pb-2">Assigned CHW</th>
                      <th className="pb-2">Deadline</th>
                      <th className="pb-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(alert.tasks || []).map((t: any) => (
                      <tr key={t.id} className="hover:bg-surface-container-low/50">
                        <td className="py-2.5 font-mono font-bold text-primary">#{t.id}</td>
                        <td className="py-2.5 font-semibold text-on-surface">{t.title}</td>
                        <td className="py-2.5 text-on-surface-variant">{t.owner}</td>
                        <td className="py-2.5 text-on-surface-variant">
                          {t.deadline ? new Date(t.deadline).toLocaleDateString() : "Routine"}
                        </td>
                        <td className="py-2.5 text-right">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-secondary-container text-on-secondary-fixed">
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant py-2">
                No frontline tasks assigned yet. Click "Dispatch Field Task" above to allocate worker duties for this alert.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Assign Task Modal */}
      {showAssignModal && (
        <AssignTaskModal
          alert={{
            alert_id: alert.id,
            unit_id: alert.unit_id,
            unit_name: alert.unit_name,
            risk: alert.risk,
            lead_time: alert.forecast_period,
          }}
          onClose={() => setShowAssignModal(false)}
          onTaskCreated={() => {
            fetchDetail(alert.id);
            if (onTaskCreated) onTaskCreated();
          }}
        />
      )}
    </div>
  );
}
