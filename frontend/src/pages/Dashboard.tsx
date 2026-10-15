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
import { Sparkline } from "../components/Sparkline";
import { AssignTaskModal } from "../components/AssignTaskModal";
import { AlertDetailModal } from "../components/AlertDetailModal";
import { MultiDiseaseOverview } from "../components/MultiDiseaseOverview";
import { useMeta } from "../hooks/useMeta";
import { Badge, Button } from "../components/ui";

interface DashboardProps {
  onRefreshNeeded?: () => void;
  onNavigateToAlert?: (alertId: number) => void;
  onSelectDiseaseDetail?: (diseaseType: string) => void;
  selectedLocation?: {
    district_id: string;
    block_id: string;
    village_id: string;
    breadcrumb: string;
  };
}

export function Dashboard({
  onRefreshNeeded,
  onNavigateToAlert,
  onSelectDiseaseDetail,
  selectedLocation,
}: DashboardProps) {
  const { meta } = useMeta();
  const [summary, setSummary] = useState<any>(null);
  const [reportingPeriod, setReportingPeriod] = useState<"all" | "monsoon" | "recent">("all");

  // Modals state
  const [assignAlert, setAssignAlert] = useState<any | null>(null);
  const [detailAlertId, setDetailAlertId] = useState<number | null>(null);

  const fetchDashboardData = () => {
    const params = new URLSearchParams();
    if (selectedLocation?.district_id) params.set("district_id", selectedLocation.district_id);
    if (selectedLocation?.block_id) params.set("block_id", selectedLocation.block_id);
    if (selectedLocation?.village_id) params.set("village_id", selectedLocation.village_id);
    const qs = params.toString() ? `?${params.toString()}` : "";

    fetch(`http://127.0.0.1:8000/dashboard/summary${qs}`)
      .then((res) => res.json())
      .then((data) => {
        setSummary(data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedLocation?.district_id, selectedLocation?.block_id, selectedLocation?.village_id]);

  const handleTaskCreated = () => {
    fetchDashboardData();
    if (onRefreshNeeded) onRefreshNeeded();
  };

  const geoLabelCapitalized = meta.geography_label
    ? meta.geography_label.charAt(0).toUpperCase() + meta.geography_label.slice(1)
    : "Unit";

  // Fallbacks if backend is loading
  const activeAlerts = summary?.active_alerts_count ?? 3;
  const highAlerts = summary?.alerts_by_risk?.High ?? 1;
  const mediumAlerts = summary?.alerts_by_risk?.Medium ?? 2;
  const openTasks = summary?.open_tasks_count ?? 5;
  const waitingReply = summary?.tasks_waiting_reply ?? 2;
  const completedTasks = summary?.tasks_by_status?.done ?? 1;
  const overdueTasks = summary?.escalated_count ?? 0;
  const repliedPct = summary?.replied_within_window_pct ?? 80;
  const weatherUnits = summary?.weather_model_units_count ?? 4;
  const totalUnits = summary?.total_units_count ?? 6;
  const baselineUnits = summary?.baseline_units_count ?? 2;

  const unitRisks = summary?.unit_risks || [];
  const needsAction = summary?.needs_action || [];
  const skillGate = summary?.skill_gate || [];

  const rawForecastData = summary?.district_forecast || [];
  const forecastData = rawForecastData.filter((pt: any) => {
    if (reportingPeriod === "monsoon") {
      return ["Jun", "Jul", "Aug", "Sep", "Oct"].includes(pt.period);
    }
    if (reportingPeriod === "recent") {
      return ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].includes(pt.period);
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-on-surface">
      {/* TOP SAFEGUARD, DATA FRESHNESS & REPORTING-PERIOD FILTER STRIP */}
      <section
        aria-label="Safeguards and Reporting Controls"
        className="bg-surface-container-lowest rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Prototype — Synthetic Demo Data
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              Freshness: Current Reporting Cycle
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary-fixed/80 text-on-primary-fixed-variant border border-primary-fixed-dim text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              Data Completeness: 96%
            </span>
          </div>
          <p className="text-xs text-on-surface-variant max-w-3xl leading-relaxed">
            Routine surveillance may identify some surges only after clinical presentations rise; earlier warning remains a challenge.{" "}
            <span className="font-semibold text-on-surface">
              Target forecast horizon: 2–4 weeks, subject to local validation.
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="reporting-period-select" className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            Reporting Period:
          </label>
          <select
            id="reporting-period-select"
            value={reportingPeriod}
            onChange={(e) => setReportingPeriod(e.target.value as any)}
            className="text-xs bg-surface-container-low border border-slate-200 rounded-lg px-3 py-2 font-medium text-on-surface focus:outline-none focus:border-primary transition-colors"
          >
            <option value="all">Full Year (Jan–Dec)</option>
            <option value="monsoon">Monsoon Transmission Window (Jun–Oct)</option>
            <option value="recent">Recent & Forecast Window (Jul–Dec)</option>
          </select>
        </div>
      </section>

      {/* ROW 1: FOUR KPI CARDS (STITCH CLINICAL TOKENS) */}
      <section aria-label="KPI Metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-surface-container-lowest rounded-xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-error-container/30 pointer-events-none group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
              Active Health Alerts
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-error"></span> Urgent
            </span>
          </div>
          <div className="my-2">
            <div className="text-3xl font-extrabold text-on-surface tabular-nums">{activeAlerts}</div>
            <div className="text-xs mt-1 flex items-center gap-1.5 font-medium">
              <span className="text-error font-bold">{highAlerts} High</span>
              <span className="text-on-surface-variant">·</span>
              <span className="text-amber-700 font-bold">{mediumAlerts} Medium</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 text-[11px] text-on-surface-variant">
            Surveillance threshold alerts
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-surface-container-lowest rounded-xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-secondary-container/30 pointer-events-none group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
              Open Field Tasks
            </span>
            <span className="p-1 rounded bg-secondary-container text-on-secondary-fixed">
              <span className="material-symbols-outlined text-[16px]">assignment</span>
            </span>
          </div>
          <div className="my-2">
            <div className="text-3xl font-extrabold text-on-surface tabular-nums">{openTasks}</div>
            <div className="text-xs mt-1 flex items-center gap-1.5 font-medium">
              <span className="text-amber-700 font-bold">{waitingReply} Pending</span>
              <span className="text-on-surface-variant">·</span>
              <span className="text-error font-bold">{overdueTasks} Overdue</span>
              <span className="text-on-surface-variant">·</span>
              <span className="text-primary font-bold">{completedTasks} Closed</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 text-[11px] text-on-surface-variant">
            Dispatched to frontline workers
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-surface-container-lowest rounded-xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-primary-fixed/20 pointer-events-none group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
              Replied Within {meta.escalation_hours || 48}h
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
              SLA Standard
            </span>
          </div>
          <div className="my-2">
            <div className="text-3xl font-extrabold text-primary tabular-nums">{repliedPct}%</div>
            <div className="w-full bg-surface-container h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(repliedPct, 100)}%` }}
              ></div>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 text-[11px] text-on-surface-variant">
            Target SLA standard: 90%
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-surface-container-lowest rounded-xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-surface-dim/30 pointer-events-none group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
              {geoLabelCapitalized}s Using Weather Model
            </span>
            <span className="p-1 rounded bg-surface-container text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">thunderstorm</span>
            </span>
          </div>
          <div className="my-2">
            <div className="text-3xl font-extrabold text-on-surface tabular-nums">
              {weatherUnits} of {totalUnits}
            </div>
            <div className="text-xs text-on-surface-variant mt-1">
              {baselineUnits} {geoLabelCapitalized}s rely on seasonal baseline
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 text-[11px] text-on-surface-variant">
            Enforced by statistical skill gate
          </div>
        </div>
      </section>

      {/* ROW 1B: UNIFIED MULTI-DISEASE EARLY-WARNING OVERVIEW (4 HEALTH RISKS) */}
      {summary?.multi_disease && (
        <MultiDiseaseOverview
          multiDisease={summary.multi_disease}
          locationBreadcrumb={selectedLocation?.breadcrumb}
          portalMode="supervisor"
          onSelectDiseaseDetail={(dType) => {
            if (onSelectDiseaseDetail) onSelectDiseaseDetail(dType);
          }}
        />
      )}

      {/* ROW 2: RISK OVERVIEW TILES & NEEDS ACTION */}
      <section aria-label="Risk and Action" className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Risk Overview (col-span-8) */}
        <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-on-surface">
                {geoLabelCapitalized} Risk Overview (Ranked Schematic)
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Target forecast horizon: 2–4 weeks, subject to local validation • No fabricated administrative boundaries
              </p>
            </div>
            <Badge variant="active" size="sm">
              Epidemiological Rank
            </Badge>
          </div>

          {/* Grid of Unit Tiles (2 rows x 3 cols) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {unitRisks.map((unit: any) => {
              const isHigh = unit.risk === "High";
              const isMed = unit.risk === "Medium";
              const chipColor = isHigh
                ? "bg-error-container text-on-error-container"
                : isMed
                ? "bg-amber-100 text-amber-900"
                : "bg-emerald-50 text-emerald-800";

              const sparkColor = isHigh ? "#ba1a1a" : isMed ? "#b45309" : "#00685f";
              const isWeather = unit.method_used === "weather_model";

              return (
                <div
                  key={unit.unit_id}
                  onClick={() => {
                    if (onNavigateToAlert && unit.alert_id) {
                      onNavigateToAlert(unit.alert_id);
                    } else if (unit.alert_id) {
                      setDetailAlertId(unit.alert_id);
                    }
                  }}
                  className="p-3.5 bg-surface-container-lowest border border-slate-200/90 hover:border-primary/50 hover:shadow-xs rounded-xl transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-1 pb-1">
                    <span className="font-bold text-xs text-on-surface truncate">{unit.unit_name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${chipColor}`}>
                      {unit.risk}
                    </span>
                  </div>

                  <div className="text-[11px] text-on-surface-variant mt-1">
                    Horizon: {unit.lead_time || "2–4 wks (target)"}
                  </div>
                  <div className="text-[10px] text-on-surface-variant mt-0.5 flex items-center justify-between">
                    <span>Uncertainty: 80% PI</span>
                    <span className={`font-semibold ${isWeather ? "text-primary" : "text-on-surface-variant"}`}>
                      {isWeather ? "Weather model" : "Seasonal baseline"}
                    </span>
                  </div>

                  <div className="my-2 flex items-center justify-center">
                    <Sparkline data={unit.sparkline} color={sparkColor} width={120} height={26} />
                  </div>

                  <div className="text-[10px] text-on-surface-variant text-right border-t border-slate-100 pt-1">
                    Historical series, 6 {meta.unit_label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Needs Action List (col-span-4) */}
        <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-on-surface">Needs Action</h2>
              <span className="text-xs text-on-surface-variant font-medium">
                {needsAction.length} Alerts Require Dispatch
              </span>
            </div>

            <div className="space-y-2.5 pt-3">
              {needsAction.map((item: any) => {
                const isHigh = item.risk === "High";
                const chipColor = isHigh ? "bg-error-container text-on-error-container" : "bg-amber-100 text-amber-900";

                return (
                  <div
                    key={item.alert_id}
                    className="p-3 rounded-xl border border-slate-200 bg-surface-container-low/60 hover:bg-surface-container-low transition-colors flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-on-surface truncate">{item.unit_name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${chipColor}`}>
                          {item.risk}
                        </span>
                      </div>
                      <div className="text-[11px] text-on-surface-variant truncate mt-0.5">
                        {item.lead_time} · {item.confidence_label}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          if (onNavigateToAlert && item.alert_id) {
                            onNavigateToAlert(item.alert_id);
                          } else {
                            setDetailAlertId(item.alert_id);
                          }
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-primary hover:bg-surface-container rounded-lg transition-colors"
                      >
                        Details
                      </button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setAssignAlert(item)}
                      >
                        Assign
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ROW 3: FORECAST CHART & SKILL GATE */}
      <section aria-label="Forecast Intelligence" className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* District Forecast Chart (col-span-8) */}
        <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
            <div>
              <h2 className="text-base font-bold text-on-surface">District Epidemiological Forecast</h2>
              <p className="text-xs text-on-surface-variant">
                {meta.granularity ? meta.granularity.charAt(0).toUpperCase() + meta.granularity.slice(1) : "Period"} cases · Weather model vs Seasonal baseline · Tested on held-out periods
              </p>
            </div>

            {/* Custom Chart Legend */}
            <div className="flex items-center flex-wrap gap-3 text-[11px] font-medium text-on-surface-variant">
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-slate-800" /> Actual cases
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 border-b-2 border-dashed border-slate-400" /> Baseline
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-primary" /> Weather model
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-primary-fixed/40 rounded-xs" /> 80% range
              </span>
            </div>
          </div>

          {/* Chart Canvas */}
          {forecastData && forecastData.length > 0 ? (
            <div className="h-56 w-full pt-2 relative">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={forecastData} margin={{ top: 12, right: 15, left: -15, bottom: 0 }}>
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
                    y={260} 
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
                  <Line 
                    type="monotone" 
                    dataKey="weather_model" 
                    name="Weather model" 
                    stroke="#00685f" 
                    strokeWidth={2.5} 
                    dot={{ r: 4, fill: "#00685f" }} 
                    connectNulls={true}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="absolute bottom-1 right-28 text-[10px] text-on-surface-variant font-medium">
                Model Projection Window
              </div>
            </div>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-on-surface-variant text-xs bg-surface-container-low/40 rounded-xl mt-2">
              <p className="font-semibold text-on-surface">No forecast data available for this selection.</p>
              <p className="text-[11px] mt-1">Please ensure model runs have completed or select another region.</p>
            </div>
          )}
        </div>

        {/* Skill Gate Card (col-span-4) */}
        <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs flex flex-col justify-between space-y-3">
          <div>
            <div className="pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-on-surface">Skill Gate (Honest Validation)</h2>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                Weather drives an alert only where it demonstrated statistical win over baseline
              </p>
            </div>

            {/* List of Units */}
            <div className="space-y-2.5 pt-3">
              {skillGate.map((item: any) => {
                const isWeather = item.method_used === "weather_model";
                const pct = Math.round(item.win_share * 100);

                return (
                  <div key={item.unit_id} className="flex items-center gap-2.5 text-xs">
                    <span className="w-16 font-semibold text-on-surface truncate text-[11px]">
                      {item.unit_name.replace("Sample ", "")}
                    </span>

                    {/* Progress Bar */}
                    <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden border border-slate-200">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isWeather ? "bg-primary" : "bg-slate-400"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {/* Badge Chip */}
                    <span
                      className={`w-16 text-center py-0.5 rounded text-[10px] font-bold ${
                        isWeather
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-surface-container text-on-surface-variant border border-slate-200"
                      }`}
                    >
                      {isWeather ? "Weather" : "Baseline"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-[10px] text-on-surface-variant mt-2 pt-2 border-t border-slate-100">
            Win share = share of validation periods where weather model outperformed baseline.
          </div>
        </div>
      </section>

      {/* Interactive Modals */}
      {assignAlert && (
        <AssignTaskModal
          alert={assignAlert}
          onClose={() => setAssignAlert(null)}
          onTaskCreated={handleTaskCreated}
        />
      )}

      {detailAlertId && (
        <AlertDetailModal
          alertId={detailAlertId}
          onClose={() => setDetailAlertId(null)}
          onAssignClick={() => {
            const found = needsAction.find((n: any) => n.alert_id === detailAlertId) || {
              alert_id: detailAlertId,
              unit_id: "U1",
              unit_name: geoLabelCapitalized,
              risk: "High",
              lead_time: `3-4 ${meta.unit_label} (target)`,
            };
            setAssignAlert(found);
          }}
        />
      )}
    </div>
  );
}
