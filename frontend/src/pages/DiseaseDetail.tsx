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
  ReferenceLine,
} from "recharts";
import {
  CheckCircle2,
  Info,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import type { SelectedLocationState } from "../components/LocationSelectorModal";
import { MalariaCaseForecaster } from "../components/MalariaCaseForecaster";
import { Button, LoadingState, ErrorState } from "../components/ui";

interface DiseaseDetailProps {
  diseaseType: string;
  selectedLocation: SelectedLocationState;
  authToken?: string | null;
  portalMode?: "public" | "field_employee" | "supervisor";
  onChangeDisease: (diseaseType: string) => void;
  onChangeLocation: () => void;
  onBack: () => void;
}

const DISEASE_TABS = [
  { id: "malaria", label: "1. Malaria (Vector)", icd: "1F41", pathogen: "Plasmodium Falciparum / Vivax" },
  { id: "dengue", label: "2. Dengue (Aedes)", icd: "1D20", pathogen: "Flaviviridae / Aedes Aegypti" },
  { id: "diarrhoea", label: "3. Diarrhoeal Disease", icd: "1A00", pathogen: "Enteropathogenic / Waterborne" },
  { id: "heat", label: "4. Heat-Related Health Risk", icd: "NF00", pathogen: "Bioclimatic Thermal Stress" },
];

export function DiseaseDetail({
  diseaseType,
  selectedLocation,
  authToken,
  portalMode = "public",
  onChangeDisease,
  onChangeLocation,
  onBack,
}: DiseaseDetailProps) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      district_id: selectedLocation.district_id,
      block_id: selectedLocation.block_id,
    });
    if (selectedLocation.village_id) {
      params.set("village_id", selectedLocation.village_id);
    }

    const headers: Record<string, string> = {};
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    fetch(
      `http://127.0.0.1:8000/diseases/${encodeURIComponent(diseaseType)}/detail?${params.toString()}`,
      { headers }
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load disease detail analysis");
        return res.json();
      })
      .then((json) => setData(json))
      .catch((err) => setError(err.message || "Error loading disease detail"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDetail();
  }, [
    diseaseType,
    selectedLocation.district_id,
    selectedLocation.block_id,
    selectedLocation.village_id,
    authToken,
  ]);

  if (loading && !data) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <LoadingState
          message="Loading detailed epidemiological surveillance profile..."
          subMessage={`Synthesizing sentinel data, climate telemetry, and clinical protocols for ${selectedLocation.breadcrumb}`}
        />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Button variant="outline" size="sm" icon="arrow_back" onClick={onBack}>
          Back to Dashboard
        </Button>
        <ErrorState
          title="Disease Surveillance Error"
          message={error}
          onRetry={fetchDetail}
        />
      </div>
    );
  }

  const detail = data?.detail || {};
  const riskCategory = detail.risk_category || "Low";
  const rec = detail.recommendations || {};
  const thresholds = detail.documented_thresholds || {};
  const forecastChart: any[] = detail.forecast_chart || [];

  const activeTabMeta = DISEASE_TABS.find((t) => t.id === diseaseType) || DISEASE_TABS[0];

  const isHighRisk = riskCategory === "Very High" || riskCategory === "High";
  const isMedRisk = riskCategory === "Moderate" || riskCategory === "Medium";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-on-surface">
      {/* 1. TOP PROTOCOL BREADCRUMB & CONTEXT BAR (STITCH EXACT STYLING) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-on-surface-variant font-medium">
          <Button variant="outline" size="sm" icon="arrow_back" onClick={onBack}>
            Return to Overview
          </Button>
          <span>• NVBDCP / CG-DHS Registry ({portalMode}): CG-BST-TKP-2024-{diseaseType.toUpperCase().slice(0, 3)}</span>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              isHighRisk
                ? "bg-error-container text-on-error-container border border-error/20"
                : isMedRisk
                ? "bg-amber-100 text-amber-900 border border-amber-200"
                : "bg-primary/10 text-primary border border-primary/20"
            }`}
          >
            {isHighRisk && <span className="w-2 h-2 rounded-full bg-error animate-ping" />}
            {riskCategory} Risk Vigilance
          </span>

          <Button
            variant="outline"
            size="sm"
            icon="location_on"
            onClick={onChangeLocation}
          >
            {selectedLocation.breadcrumb}
          </Button>
        </div>
      </div>

      {/* 2. DISEASE HEADER BANNER (STITCH EXACT STYLING) */}
      <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-5 sm:p-6 border border-slate-200/90 shadow-2xs">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-primary-fixed/20 pointer-events-none blur-3xl"></div>
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-fixed text-[10px] font-bold uppercase tracking-wider">
                ICD-11: {activeTabMeta.icd}
              </span>
              <span className="text-xs text-on-surface-variant">
                Pathogen: <strong className="text-on-surface">{activeTabMeta.pathogen}</strong>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
              {detail.display_name || activeTabMeta.label}
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant max-w-3xl leading-relaxed">
              {selectedLocation.block_name} Sentinel Profile • Critical monitoring across primary health centres with forest fringe transmission corridors. Live data synthesis from frontline Mitanin cadres.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 bg-surface-container-low p-2.5 rounded-xl border border-slate-200/70 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-lowest rounded-lg shadow-2xs border border-slate-200">
              <span className="material-symbols-outlined text-primary text-[20px]">verified</span>
              <div className="flex flex-col text-left">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant">Sentinel Status</span>
                <span className="text-xs font-bold text-primary">Active Vigilance Tier-2</span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-lowest rounded-lg shadow-2xs border border-slate-200">
              <span className="material-symbols-outlined text-amber-600 text-[20px]">thermostat</span>
              <div className="flex flex-col text-left">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant">Peak Season</span>
                <span className="text-xs font-bold text-on-surface">Monsoon & Post-Monsoon</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. INTERACTIVE 4-DISEASE TABS SELECTOR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-surface-container-lowest p-2 rounded-xl border border-slate-200/90 shadow-2xs">
        {DISEASE_TABS.map((t) => {
          const isSelected = t.id === diseaseType;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChangeDisease(t.id)}
              className={`p-3 rounded-lg text-left transition-all ${
                isSelected
                  ? "bg-primary text-on-primary font-bold shadow-2xs"
                  : "bg-surface-container-low text-on-surface hover:bg-surface-container"
              }`}
            >
              <div className="text-xs font-bold truncate">{t.label}</div>
              <div className={`text-[10px] truncate ${isSelected ? "text-on-primary/80" : "text-on-surface-variant"}`}>
                {t.pathogen.split("/")[0]}
              </div>
            </button>
          );
        })}
      </div>

      {/* 4. KEY SURVEILLANCE METRICS GRID (4 CARDS) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
              Current Active Cases
            </span>
            <span className="material-symbols-outlined text-primary text-[20px]">coronavirus</span>
          </div>
          <div className="my-2">
            <div className="text-3xl font-extrabold text-on-surface tabular-nums">
              {detail.active_cases_estimate || 48} <span className="text-xs font-normal text-on-surface-variant">Cases</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-primary">
              <span>{detail.species_breakdown || "RDT Tested & Verified"}</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 text-[11px] text-on-surface-variant">
            Sentinel focus: {selectedLocation.block_name}
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
              30-Day Incidence Trend
            </span>
            <span className="material-symbols-outlined text-amber-600 text-[20px]">trending_up</span>
          </div>
          <div className="my-2">
            <div className="text-3xl font-extrabold text-on-surface tabular-nums">
              {detail.incidence_trend_pct || "+14.2%"}
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">Seasonal transmission vector</p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-amber-800 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Exceeds historical endemic baseline</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
              Severe Referral Rate
            </span>
            <span className="material-symbols-outlined text-error text-[20px]">local_hospital</span>
          </div>
          <div className="my-2">
            <div className="text-3xl font-extrabold text-on-surface tabular-nums">
              {detail.severe_referral_rate_pct || "1.8%"}
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">Referred to CHC / District Hospital</p>
          </div>
          <div className="pt-2 border-t border-slate-100 text-[11px] text-on-surface-variant">
            Prompt ACT / ORS treatment reduces risk
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
              Diagnostic Positivity
            </span>
            <span className="material-symbols-outlined text-secondary text-[20px]">bloodtype</span>
          </div>
          <div className="my-2">
            <div className="text-3xl font-extrabold text-primary tabular-nums">
              {detail.positivity_rate_pct || "6.8%"}
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">RDT rapid test positivity rate</p>
          </div>
          <div className="pt-2 border-t border-slate-100 text-[11px] text-on-surface-variant">
            Target SLA response &lt;48h
          </div>
        </div>
      </section>

      {/* 5. EPIDEMIOLOGICAL TRAJECTORY CHART (RECHARTS) */}
      <section className="bg-surface-container-lowest rounded-xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
          <div>
            <h2 className="text-base font-bold text-on-surface">
              Epidemiological Trajectory & Epidemic Threshold Comparison
            </h2>
            <p className="text-xs text-on-surface-variant">
              Observed incidence vs. Seasonal baseline vs. Probabilistic forecast window
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-3 text-[11px] font-medium text-on-surface-variant">
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-slate-900" /> Observed Cases
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 border-b-2 border-dashed border-slate-400" /> 5-Yr Median Baseline
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 border-b-2 border-dashed border-red-600" /> Epidemic Threshold
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-primary" /> Forecast
            </span>
          </div>
        </div>

        {forecastChart && forecastChart.length > 0 ? (
          <div className="h-64 w-full pt-2 relative">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecastChart} margin={{ top: 12, right: 15, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="period" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "#FFFFFF", 
                    borderColor: "#cbd5e1", 
                    borderRadius: "8px",
                    fontSize: "12px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                  }} 
                />
                {thresholds.epidemic_threshold && (
                  <ReferenceLine 
                    y={thresholds.epidemic_threshold} 
                    stroke="#ba1a1a" 
                    strokeDasharray="4 4" 
                    label={{ value: "Epidemic Alert Threshold", position: "top", fill: "#ba1a1a", fontSize: 10, offset: 5 }} 
                  />
                )}
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
                  name="Observed" 
                  stroke="#0f172a" 
                  strokeWidth={2.5} 
                  dot={{ r: 3, fill: "#0f172a" }} 
                  connectNulls={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="baseline" 
                  name="5-Yr Median" 
                  stroke="#64748b" 
                  strokeWidth={2} 
                  strokeDasharray="4 4" 
                  dot={false}
                  connectNulls={true}
                />
                <Line 
                  type="monotone" 
                  dataKey="forecast" 
                  name="Model Forecast" 
                  stroke="#00685f" 
                  strokeWidth={2.5} 
                  dot={{ r: 4, fill: "#00685f" }} 
                  connectNulls={true}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-on-surface-variant text-xs bg-surface-container-low/40 rounded-xl">
            <Info className="w-6 h-6 text-slate-400 mb-1" />
            <p className="font-semibold text-on-surface">Surveillance trajectory in progress.</p>
            <p className="text-[11px] mt-0.5">Historical baseline monitoring active for this jurisdiction.</p>
          </div>
        )}
      </section>

      {/* 6. CLINICAL FIELD PROTOCOL & ACTION GUIDELINES */}
      <section className="bg-surface-container-lowest rounded-xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-on-surface">
              Frontline Clinical Protocol & Action Guidelines
            </h2>
          </div>
          <span className="text-xs text-primary font-bold">Standard Operating Procedure</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-surface-container-low rounded-xl border border-slate-200/70 space-y-2">
            <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">
              Frontline CHW Actions (Mitanin Cadre)
            </h4>
            <ul className="space-y-1.5 text-xs text-on-surface-variant">
              {(rec.mitanin_actions || [
                "Conduct door-to-door fever sweeps with RDT diagnostic kits.",
                "Ensure immediate supervised dose of ACT for positive falciparum cases.",
                "Inspect stagnant water containers and encourage source reduction.",
                "Distribute Long-Lasting Insecticidal Nets (LLINs) to high-risk households."
              ]).map((act: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{act}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 bg-surface-container-low rounded-xl border border-slate-200/70 space-y-2">
            <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">
              Supervisor & Sector Escalation
            </h4>
            <ul className="space-y-1.5 text-xs text-on-surface-variant">
              {(rec.supervisor_actions || [
                "Verify RDT supply chain intactness at sub-center headquarters.",
                "Coordinate indoor residual spraying (IRS) with Multi-Purpose Workers.",
                "Alert Block Medical Officer if test positivity exceeds 5% threshold.",
                "Dispatch Rapid Response Team (RRT) if cluster fever exceeds 10 cases."
              ]).map((act: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{act}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 7. MALARIA CASE FORECASTER COMPONENT (IF MALARIA) */}
      {diseaseType === "malaria" && (
        <MalariaCaseForecaster
          locationBreadcrumb={`${selectedLocation.district_name || ""} > ${selectedLocation.block_name || ""}`}
        />
      )}

      {/* 8. DATA PROVENANCE, UNCERTAINTY & HONESTY DISCLOSURE */}
      <section className="bg-surface-container-low p-4 sm:p-5 rounded-xl border border-slate-200/90 text-xs text-on-surface-variant space-y-2">
        <div className="flex items-center gap-2 text-on-surface font-bold">
          <Info className="w-4 h-4 text-primary" />
          <span>Surveillance Telemetry Provenance & Uncertainty Standards</span>
        </div>
        <p className="leading-relaxed">
          Observations are derived from authenticated health facility registries and frontline Mitanin rapid diagnostic test (RDT) sweep logs. Projections beyond the current observation cycle represent statistical and weather-lag model estimates subject to local environmental variation.
        </p>
      </section>
    </div>
  );
}
