import { useState, useEffect } from "react";
import { 
  XCircle, 
  ToggleLeft, 
  ToggleRight, 
  Calendar, 
  Info, 
  ShieldCheck, 
  Check 
} from "lucide-react";
import { LoadingState, ErrorState } from "../components/ui";

interface UnitEvidence {
  unit_id: string;
  unit_name: string;
  baseline_mae: number | null;
  baseline_rmse: number | null;
  weather_mae: number | null;
  weather_rmse: number | null;
  win_share: number;
  win_share_pct: string;
  median_improvement: number;
  median_improvement_pct: string;
  skill_score?: number | null;
  skill_score_pct?: string;
  zero_baseline_mae_handled?: boolean;
  skill_gate_status?: "Pass" | "Fail" | "Insufficient evidence" | string;
  decision: string;
  verdict_chip: "Use weather" | "Use baseline" | "Not enough data" | "No weather data" | string;
  reason: string;
  n_evaluations: number;
}

interface ClaimRow {
  id: string;
  original_claim: string;
  verification_finding: string;
  corrected_positioning: string;
}

interface EvidenceData {
  data_source: string;
  granularity: string;
  unit_label: string;
  geography_level: string;
  forecast_horizon_target?: string;
  skill_score_formula?: string;
  evaluation_years: number;
  exclude_disruptions: boolean;
  skill_gate_thresholds: {
    min_win_share: number;
    min_win_share_pct: string;
    min_median_improvement: number;
    min_median_improvement_pct: string;
    require_positive_skill?: boolean;
    note?: string;
  };
  method_note: string;
  plain_language_summary: string;
  notice: string | null;
  synthetic_evaluation_notice?: string;
  claims_verification_table?: ClaimRow[];
  units: UnitEvidence[];
  malaria_archive_model?: any;
}

export function ModelEvidence() {
  const [excludeDisruptions, setExcludeDisruptions] = useState<boolean>(false);
  const [data, setData] = useState<EvidenceData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);

  const fetchEvidence = (exclude: boolean) => {
    setLoading(true);
    fetch(`http://127.0.0.1:8000/evidence?exclude_disruptions=${exclude}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load model evidence from API");
        return res.json();
      })
      .then((evData: EvidenceData) => {
        setData(evData);
        setLoading(false);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Failed to load evidence");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchEvidence(excludeDisruptions);
  }, [excludeDisruptions]);

  const handleToggle = () => {
    const nextVal = !excludeDisruptions;
    setExcludeDisruptions(nextVal);
  };

  if (loading && !data) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <LoadingState
          message="Running rolling-origin epidemiological evaluation..."
          subMessage="Evaluating predictive accuracy and statistical skill scores across held-out periods"
        />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <ErrorState
          title="Model Evidence Unavailable"
          message={error}
          onRetry={() => fetchEvidence(excludeDisruptions)}
        />
      </div>
    );
  }

  const units = data?.units || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-on-surface">
      {/* 1. TOP OPERATIONAL BANNER (STITCH EXACT STYLING) */}
      <section className="relative overflow-hidden rounded-xl bg-inverse-surface p-6 sm:p-8 text-inverse-on-surface shadow-md">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2.5 py-0.5 text-primary-fixed font-bold text-[10px] uppercase tracking-wider">
                <span className="material-symbols-outlined text-[14px]">query_stats</span>
                Deterministic Inference Layer
              </span>
              <span className="rounded-full bg-secondary-container/20 px-2.5 py-0.5 text-secondary-fixed text-xs font-semibold">
                Evaluation Window: {data?.evaluation_years || 2}-Year Rolling Origin
              </span>
              <span className="inline-flex items-center gap-1 text-surface-container-highest text-xs">
                <span className="h-2 w-2 rounded-full bg-primary-fixed animate-pulse" />
                Validated Against Empirical Baselines
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-inverse-on-surface tracking-tight">
              Predictive Model Evidence & Skill Gate Governance
            </h1>
            <p className="text-xs sm:text-sm text-inverse-on-surface/80 leading-relaxed">
              Transparent multi-variate vector transmission projection for Bastar District. Evaluates whether weather-lagged inputs meaningfully outperform historical seasonal baselines before triggering automated alerts.
            </p>
          </div>

          {/* Disruption Toggle Control */}
          <div className="flex items-center gap-3 bg-surface-container-highest/10 backdrop-blur-md p-3.5 rounded-xl border border-white/10 shrink-0">
            <div className="text-left">
              <div className="text-xs font-bold text-inverse-on-surface flex items-center gap-1.5">
                <span>Exclude Disruptions</span>
                <span className="text-[10px] text-surface-dim">(2020–21)</span>
              </div>
              <div className="text-[11px] text-surface-container-highest">
                {excludeDisruptions ? "Disruptions excluded" : "Full dataset included"}
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggle}
              className="text-primary-fixed hover:opacity-80 transition-opacity"
              title="Toggle reporting disruption filter"
            >
              {excludeDisruptions ? (
                <ToggleRight className="w-8 h-8 fill-primary-fixed" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-surface-dim" />
              )}
            </button>
          </div>
        </div>

        {/* Subtle Decorative Wave */}
        <div className="absolute right-0 bottom-0 pointer-events-none opacity-10">
          <svg fill="none" height="140" viewBox="0 0 420 140" width="420">
            <path d="M0 100 C100 40 180 140 280 80 C340 40 380 90 420 30 L420 140 L0 140 Z" fill="#6bd8cb" />
          </svg>
        </div>
      </section>

      {/* 2. STATISTICAL METHODOLOGY CALLOUT */}
      <div className="bg-surface-container-lowest rounded-xl p-5 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
              Evaluation Methodology
            </span>
            <p className="text-xs sm:text-sm font-semibold text-on-surface mt-0.5">
              “{data?.method_note}”
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-surface-container-low px-3.5 py-2 rounded-xl border border-slate-200 shrink-0">
          <span className="text-xs text-on-surface-variant font-medium">Skill Gate Rule:</span>
          <span className="text-xs font-bold text-primary">
            Win share ≥ {data?.skill_gate_thresholds.min_win_share_pct} • Median imp. ≥ {data?.skill_gate_thresholds.min_median_improvement_pct}
          </span>
        </div>
      </div>

      {/* 3. PLAIN LANGUAGE SUMMARY */}
      {data?.plain_language_summary && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 sm:p-5 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
              Plain-Language Clinical & Operational Interpretation
            </h4>
            <p className="text-xs sm:text-sm text-on-surface leading-relaxed">
              {data.plain_language_summary}
            </p>
          </div>
        </div>
      )}

      {/* 4. UNIT-BY-UNIT SKILL GATE EVALUATION TABLE */}
      <section className="bg-surface-container-lowest rounded-xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-on-surface">
              Catchment-Level Skill Gate Matrix ({units.length} Units)
            </h2>
            <p className="text-xs text-on-surface-variant">
              Comparative error metrics (MAE) and win rates over the {data?.evaluation_years}-year rolling evaluation
            </p>
          </div>
          <span className="text-xs text-on-surface-variant font-medium">
            Granularity: {data?.granularity || "Monthly"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-surface-container-low/70 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                <th className="py-3 px-4">Catchment Unit</th>
                <th className="py-3 px-3">Baseline MAE</th>
                <th className="py-3 px-3">Weather MAE</th>
                <th className="py-3 px-3">Win Share</th>
                <th className="py-3 px-3">Median Imp.</th>
                <th className="py-3 px-3">Skill Gate Status</th>
                <th className="py-3 px-4 text-right">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {units.map((u) => {
                const isPass = u.skill_gate_status === "Pass";
                const isUseWeather = u.verdict_chip === "Use weather";

                return (
                  <tr
                    key={u.unit_id}
                    onClick={() => setSelectedUnit(selectedUnit === u.unit_id ? null : u.unit_id)}
                    className="hover:bg-surface-container-low/50 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-on-surface block leading-tight">{u.unit_name}</span>
                      <span className="font-mono text-[10px] text-on-surface-variant">{u.unit_id}</span>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-medium text-on-surface-variant">
                      {u.baseline_mae !== null ? u.baseline_mae.toFixed(1) : "—"}
                    </td>
                    <td className="py-3.5 px-3 font-mono font-medium text-primary">
                      {u.weather_mae !== null ? u.weather_mae.toFixed(1) : "—"}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-surface-container rounded-full overflow-hidden border border-slate-200">
                          <div
                            className={`h-full rounded-full transition-all ${
                              u.win_share >= 0.6 ? "bg-primary" : "bg-slate-400"
                            }`}
                            style={{ width: `${Math.round(u.win_share * 100)}%` }}
                          />
                        </div>
                        <span className="font-bold text-on-surface">{u.win_share_pct}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-on-surface">
                      {u.median_improvement_pct}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isPass
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-surface-container text-on-surface-variant border border-slate-200"
                        }`}
                      >
                        {isPass ? <Check className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-slate-400" />}
                        {u.skill_gate_status || (isPass ? "Pass" : "Fail")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${
                          isUseWeather
                            ? "bg-primary text-on-primary shadow-2xs"
                            : "bg-surface-container text-on-surface-variant border border-slate-200"
                        }`}
                      >
                        {u.verdict_chip}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. CLAIMS VERIFICATION & GOVERNANCE SAFEGUARDS TABLE */}
      {data?.claims_verification_table && data.claims_verification_table.length > 0 && (
        <section className="bg-surface-container-lowest rounded-xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-on-surface">
                Regulatory Claim Verification & Safeguards Audit
              </h2>
              <p className="text-xs text-on-surface-variant">
                Enforced claims verification ensuring mathematical accuracy and preventing misleading medical or predictive assertions
              </p>
            </div>
            <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
              Audit Passed
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 bg-surface-container-low/70 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  <th className="py-3 px-4 w-1/4">Evaluated Claim</th>
                  <th className="py-3 px-3 w-1/3">Verification Finding</th>
                  <th className="py-3 px-4 w-5/12 text-right">Corrected Honest Positioning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.claims_verification_table.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-on-surface">
                      {row.original_claim}
                    </td>
                    <td className="py-3.5 px-3 text-on-surface-variant leading-relaxed">
                      {row.verification_finding}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-block p-2 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 text-[11px] text-left leading-snug">
                        {row.corrected_positioning}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 6. STATUTORY DISCLAIMER ON PROBABILITY & DEMO CONSTRAINTS */}
      <section className="bg-surface-container-low p-4 sm:p-5 rounded-xl border border-slate-200/90 text-xs text-on-surface-variant space-y-2">
        <div className="flex items-center gap-2 text-on-surface font-bold">
          <Info className="w-4 h-4 text-primary" />
          <span>Statutory Evidence Notice & Mathematical Safeguards</span>
        </div>
        <p className="leading-relaxed">
          {data?.synthetic_evaluation_notice || 
            "All model evaluations, win shares, and error distributions presented in this portal reflect controlled historical evaluations. Automated alerts are never dispatched without human-in-the-loop review by an authorized Medical Officer or Sector Supervisor."}
        </p>
      </section>
    </div>
  );
}
