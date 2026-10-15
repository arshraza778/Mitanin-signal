import { useState, useEffect } from "react";
import {
  MapPin,
  AlertTriangle,
  Thermometer,
  CloudRain,
  Activity,
  Clock,
  ShieldCheck,
  Building2,
  PhoneCall,
  Info,
  RefreshCw,
  ShieldAlert,
  Stethoscope,
  Volume2,
  VolumeX,
  Droplets,
  CheckCircle,
} from "lucide-react";
import type { SelectedLocationState } from "../components/LocationSelectorModal";
import { MultiDiseaseOverview } from "../components/MultiDiseaseOverview";
import { WeatherDiseasePredictor } from "../components/WeatherDiseasePredictor";
import { LgdBlockMapCard } from "../components/LgdBlockMapCard";
import { LoadingState, ErrorState } from "../components/ui";
import { useI18n } from "../i18n/I18nContext";
import { speakTextInLanguage, stopAllSpeech } from "../services/speechService";

interface PublicDashboardProps {
  selectedLocation: SelectedLocationState;
  citizenName?: string;
  onChangeLocation: () => void;
  onSwitchPortal: () => void;
  onSelectDiseaseDetail?: (diseaseType: string) => void;
}

export function PublicDashboard({
  selectedLocation,
  citizenName,
  onChangeLocation,
  onSelectDiseaseDetail,
}: PublicDashboardProps) {
  const { language } = useI18n();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSpeakingBulletin, setIsSpeakingBulletin] = useState<boolean>(false);

  const fetchRiskData = () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      district_id: selectedLocation.district_id,
      block_id: selectedLocation.block_id,
    });
    if (selectedLocation.village_id) {
      params.set("village_id", selectedLocation.village_id);
    }

    fetch(`http://127.0.0.1:8000/public/risk-dashboard?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load location risk data");
        return res.json();
      })
      .then((json) => {
        setData(json);
      })
      .catch((err) => {
        setError(err.message || "Unable to load public risk dashboard.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRiskData();
    return () => {
      stopAllSpeech();
    };
  }, [selectedLocation.district_id, selectedLocation.block_id, selectedLocation.village_id]);

  if (loading && !data) {
    return (
      <div className="p-6 sm:p-10 max-w-6xl mx-auto text-center">
        <LoadingState
          message={`Loading public health surveillance indicators for ${selectedLocation.breadcrumb}...`}
          subMessage="Querying official Chhattisgarh LGD geography & climate indicators"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 sm:p-10 max-w-4xl mx-auto">
        <ErrorState
          title="Public Health Data Unavailable"
          message={error}
          onRetry={fetchRiskData}
        />
      </div>
    );
  }

  const risk = data?.risk || {};
  const climate = data?.climate || {};
  const rec = data?.recommendations || {};
  const dataStatus = data?.data_status || {};
  const locInfo = data?.location || {};
  const facility = locInfo?.health_facility;

  const riskCategory: string = risk.category || "Low";
  const allCategories: string[] = risk.all_categories || ["Low", "Moderate", "High", "Very High"];

  const handlePlayVoiceBulletin = () => {
    if (isSpeakingBulletin) {
      stopAllSpeech();
      setIsSpeakingBulletin(false);
      return;
    }

    const locText = locInfo.location_breadcrumb || selectedLocation.breadcrumb;
    const tempText = climate.temperature_c ? `${climate.temperature_c}` : "29";
    const rainText = climate.rainfall_mm ? `${climate.rainfall_mm}` : "0";

    const prompt =
      language === "hne"
        ? `हमार बस्तर के नागरिक स्वास्थ्य बुलेटिन। ${locText} म मलेरिया के खतरा ${riskCategory} हावय। तापमान ${tempText} डिग्री अउ बरसात ${rainText} मिलीमीटर दर्ज करे गे हावय। संझा कुन मच्छरदानी लगाके सुतव अउ बुखार आए म तुरंत मितानिन दीदी ले खून जांच कराव।`
        : language === "hi"
        ? `बस्तर नागरिक जन स्वास्थ्य बुलेटिन। ${locText} में वर्तमान मलेरिया जोखिम ${riskCategory} है। तापमान ${tempText} डिग्री और वर्षा ${rainText} मिलीमीटर दर्ज की गई है। रात्रि में मच्छरदानी का उपयोग करें और बुखार आने पर नजदीकी प्राथमिक स्वास्थ्य केंद्र या मितानिन से निःशुल्क जांच कराएं।`
        : `Bastar Public Health Bulletin for ${locText}. Current estimated malaria hazard is ${riskCategory}. Recorded temperature is ${tempText}°C with ${rainText} mm rainfall. Sleep under medicated mosquito nets and seek immediate free testing if fever occurs.`;

    setIsSpeakingBulletin(true);
    speakTextInLanguage(
      prompt,
      language,
      1.0,
      {
        onEnd: () => setIsSpeakingBulletin(false),
        onError: () => setIsSpeakingBulletin(false),
      },
      { allowExplicitHindiForHneText: true }
    ).catch(() => {
      setIsSpeakingBulletin(false);
    });
  };

  const getRiskGaugeWidth = (cat: string) => {
    switch (cat) {
      case "Very High":
        return "100%";
      case "High":
        return "75%";
      case "Moderate":
        return "50%";
      default:
        return "25%";
    }
  };

  const getRiskColor = (cat: string) => {
    switch (cat) {
      case "Very High":
      case "High":
        return "bg-error text-on-error";
      case "Moderate":
        return "bg-amber-500 text-white";
      default:
        return "bg-emerald-600 text-white";
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-24 sm:pb-28 max-w-7xl mx-auto space-y-6 text-on-surface">
      {/* 1. JURISDICTION CONTEXT HEADER STRIP */}
      <section className="bg-surface-container-lowest rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant text-xs font-bold border border-primary-fixed-dim">
              <span className="material-symbols-outlined text-[15px]">verified_user</span>
              Citizen Public Portal
            </span>
            <span className="text-xs text-on-surface-variant font-medium">
              Bastar Health Division • Monsoon Surveillance Cycle
            </span>
            {citizenName && (
              <span className="px-2 py-0.5 rounded bg-surface-container text-xs font-semibold text-primary">
                Citizen: {citizenName}
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-on-surface tracking-tight truncate">
            {locInfo.location_breadcrumb || selectedLocation.breadcrumb}
          </h1>

          {locInfo.granularity_disclosure && (
            <p className="text-xs text-on-surface-variant flex items-center gap-1.5 pt-0.5">
              <Info className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>{locInfo.granularity_disclosure}</span>
            </p>
          )}
        </div>

        {/* Action Controls & Voice Bulletin Strip */}
        <div className="flex items-center flex-wrap gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handlePlayVoiceBulletin}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs border ${
              isSpeakingBulletin
                ? "bg-error text-on-error border-error animate-pulse"
                : "bg-surface-container-low hover:bg-surface-container text-primary border-slate-200"
            }`}
            title="Listen to Audio Health Bulletin"
          >
            {isSpeakingBulletin ? (
              <VolumeX className="w-4 h-4 text-white" />
            ) : (
              <Volume2 className="w-4 h-4 text-primary" />
            )}
            <span>
              {isSpeakingBulletin
                ? "Stop Audio Bulletin"
                : "Listen to Voice Bulletin (आवाज़ बुलेटिन)"}
            </span>
          </button>

          <button
            type="button"
            onClick={fetchRiskData}
            className="px-3 py-2 rounded-xl border border-slate-200/90 hover:bg-surface-container text-xs font-semibold text-on-surface flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Refresh Surveillance Indicators"
          >
            <RefreshCw className="w-3.5 h-3.5 text-on-surface-variant" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={onChangeLocation}
            className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Change Location</span>
          </button>
        </div>
      </section>

      {/* 2. SIMULATED / HISTORICAL DATA HONESTY DISCLOSURE */}
      <section className="p-3.5 sm:p-4 rounded-xl bg-amber-50/90 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-900 shadow-2xs">
        <div className="flex items-start sm:items-center gap-2">
          <Clock className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0 text-amber-600" />
          <span>
            <strong>{dataStatus.status_badge || "PROTOTYPE • SIMULATED DATA"}:</strong>{" "}
            {dataStatus.honesty_disclosure}
          </span>
        </div>
        <div className="text-[11px] font-bold shrink-0 bg-white/90 px-2.5 py-1 rounded-lg border border-amber-200">
          Latest observation: {climate.latest_date || "Current Cycle"} • Model run:{" "}
          {dataStatus.last_model_update
            ? new Date(dataStatus.last_model_update).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "Oct 2026"}
        </div>
      </section>

      {/* 3. HIGH PRIORITY PUBLIC ADVISORY BANNER (WHEN ACTIVE) */}
      {rec.show_prominent_alert && (
        <section className="p-5 sm:p-6 rounded-2xl bg-error-container/30 border-2 border-error/50 text-on-surface flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-error text-on-error flex items-center justify-center shrink-0 shadow-2xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-error">
                  Active Surveillance Alert • {selectedLocation.block_name || "Bastar Block"}
                </span>
                <span className="w-2 h-2 rounded-full bg-error animate-ping" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-on-surface mt-0.5">
                {rec.headline}
              </h2>
              <p className="text-xs sm:text-sm text-on-surface-variant mt-1 leading-relaxed">
                {rec.summary}
              </p>
            </div>
          </div>
          <span className="px-3.5 py-1.5 rounded-full bg-error text-on-error text-xs font-bold shrink-0 shadow-2xs">
            {riskCategory.toUpperCase()} ALERT
          </span>
        </section>
      )}

      {/* 4. FOUR CITIZEN-FRIENDLY BENTO HEALTH INDICATORS */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Vector Risk Level */}
        <div className="rounded-xl bg-surface-container-lowest border border-slate-200/90 p-4 sm:p-5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              Vector Risk Level
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getRiskColor(
                riskCategory
              )}`}
            >
              {riskCategory}
            </span>
          </div>

          <div className="my-1">
            <div className="text-2xl font-extrabold text-on-surface leading-tight">
              {riskCategory} Risk
            </div>
            {/* Visual Risk Gauge */}
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2 mb-2 overflow-hidden flex">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  riskCategory === "Very High" || riskCategory === "High"
                    ? "bg-error"
                    : riskCategory === "Moderate"
                    ? "bg-amber-500"
                    : "bg-emerald-600"
                }`}
                style={{ width: getRiskGaugeWidth(riskCategory) }}
              />
            </div>
            <p className="text-xs text-on-surface-variant leading-snug">
              Prevent stagnant water pooling. Sleep under medicated LLIN nets.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-primary font-semibold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px]">verified</span>
            <span>Forecast: {risk.forecast_period || "Next 4 Weeks"}</span>
          </div>
        </div>

        {/* Metric 2: Safe Water & Diarrhoea Protection */}
        <div className="rounded-xl bg-surface-container-lowest border border-slate-200/90 p-4 sm:p-5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              Drinking Water Safety
            </span>
            <span className="px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed-variant text-[10px] font-bold uppercase">
              Monsoon Advisory
            </span>
          </div>

          <div className="my-1">
            <div className="text-2xl font-extrabold text-primary leading-tight flex items-baseline gap-1">
              <span>Clean Sources</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2 mb-2 overflow-hidden">
              <div className="bg-primary h-full w-[90%]" />
            </div>
            <p className="text-xs text-on-surface-variant leading-snug">
              Boil drinking water during heavy rain. Halogen / chlorine tablets available at Anganwadi.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-primary font-semibold flex items-center gap-1.5">
            <Droplets className="w-3.5 h-3.5 text-primary" />
            <span>Water purification active in village</span>
          </div>
        </div>

        {/* Metric 3: Active Fever Screening Reach */}
        <div className="rounded-xl bg-surface-container-lowest border border-slate-200/90 p-4 sm:p-5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              Mitanin Door-to-Door
            </span>
            <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-fixed text-[10px] font-bold uppercase">
              Field Active
            </span>
          </div>

          <div className="my-1">
            <div className="text-2xl font-extrabold text-on-surface leading-tight">
              Rapid RDT Testing
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2 mb-2 overflow-hidden">
              <div className="bg-secondary h-full w-[85%]" />
            </div>
            <p className="text-xs text-on-surface-variant leading-snug">
              Rapid blood testing conducted at home by village Mitanins without hospital travel.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-secondary font-semibold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px]">person_check</span>
            <span>Free diagnosis at hamlet level</span>
          </div>
        </div>

        {/* Metric 4: Government Clinic & Medicine Inventory */}
        <div className="rounded-xl bg-surface-container-lowest border border-slate-200/90 p-4 sm:p-5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              Essential Medicine Stock
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
              100% Free Care
            </span>
          </div>

          <div className="my-1">
            <div className="text-2xl font-extrabold text-emerald-700 leading-tight">
              Fully Stocked
            </div>
            <div className="grid grid-cols-3 gap-1.5 my-2">
              <div className="bg-emerald-50 text-center py-0.5 rounded text-[10px] font-bold text-emerald-800 border border-emerald-200">
                ACT (Malaria)
              </div>
              <div className="bg-emerald-50 text-center py-0.5 rounded text-[10px] font-bold text-emerald-800 border border-emerald-200">
                PCM (Fever)
              </div>
              <div className="bg-emerald-50 text-center py-0.5 rounded text-[10px] font-bold text-emerald-800 border border-emerald-200">
                ORS + Zinc
              </div>
            </div>
            <p className="text-xs text-on-surface-variant leading-snug">
              Complete government treatment is free. No private dispensary fees required.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Available at all PHC &amp; Sub-Centers</span>
          </div>
        </div>
      </section>

      {/* 5. IMPORTANT DISTINCTION: FORECAST VS CLINICAL DISEASE DIAGNOSIS */}
      <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-fixed/20 via-surface-container-lowest to-surface-container-lowest p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-primary/10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-extrabold tracking-wider uppercase bg-primary text-on-primary shadow-2xs">
              <ShieldAlert className="w-3.5 h-3.5" />
              Important Public Health Notice
            </span>
            <span className="text-xs font-bold text-primary">
              Community Hazard Projection vs. Clinical Disease Diagnosis
            </span>
          </div>
          <span className="text-[11px] font-semibold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded self-start sm:self-auto">
            Statutory Public Notice
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-slate-200/80 flex items-start gap-3 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0 mt-0.5">
              <Activity className="w-4 h-4" />
            </div>
            <div className="text-xs leading-relaxed">
              <div className="font-bold text-on-surface text-[13px]">
                Community-Level Hazard Projection
              </div>
              <p className="text-on-surface-variant mt-1">
                Risk ratings reflect environmental vector pressure and seasonal climate drivers across the block. They identify where prevention should be intensified.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-slate-200/80 flex items-start gap-3 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-error-container text-error flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="text-xs leading-relaxed">
              <div className="font-bold text-error text-[13px]">
                Not a Clinical Diagnosis
              </div>
              <p className="text-on-surface-variant mt-1">
                This dashboard does <strong className="text-error font-bold">NOT diagnose personal disease</strong> or replace a laboratory blood smear. Only an RDT test or doctor confirms illness.
              </p>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface-container-low border border-slate-200/70 flex items-start sm:items-center gap-2.5 text-xs text-on-surface">
          <Stethoscope className="w-4 h-4 text-primary shrink-0 mt-0.5 sm:mt-0" />
          <div className="leading-relaxed flex-1">
            <strong className="text-primary font-bold">What to do if unwell:</strong> Anyone with fever, chills, vomiting, or acute diarrhea must immediately test at the nearest health center or call their Mitanin.
            {data?.forecast_vs_outbreak_distinction && (
              <span className="block sm:inline sm:ml-2 text-on-surface-variant italic">
                — {data.forecast_vs_outbreak_distinction}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* 6. UNIFIED MULTI-DISEASE EARLY WARNING OVERVIEW (4 CARDS) */}
      {data?.multi_disease && (
        <MultiDiseaseOverview
          multiDisease={data.multi_disease}
          locationBreadcrumb={locInfo.location_breadcrumb || selectedLocation.breadcrumb}
          portalMode="public"
          onSelectDiseaseDetail={(dType) => {
            if (onSelectDiseaseDetail) onSelectDiseaseDetail(dType);
          }}
        />
      )}

      {/* 7. CURRENT ESTIMATED RISK & LATEST CLIMATE INDICATORS */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Estimated Risk Card (col-span-5) */}
        <div className="lg:col-span-5 rounded-2xl bg-surface-container-lowest border border-slate-200/90 p-6 flex flex-col justify-between shadow-2xs">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Malaria Epidemiological Risk
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${getRiskColor(
                  riskCategory
                )}`}
              >
                {riskCategory}
              </span>
            </div>

            <div className="text-3xl font-extrabold text-on-surface tracking-tight">
              {riskCategory} Risk
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              {rec.summary || "Epidemiological monitoring indicates seasonal vector breeding potential based on temperature, rainfall, and historical transmission rates."}
            </p>

            {/* 4-Category Visual Scale */}
            <div className="pt-2">
              <div className="text-[11px] font-bold text-on-surface-variant mb-1.5">
                Official 4-Level Surveillance Scale:
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {allCategories.map((cat) => {
                  const isCurrent = cat === riskCategory;
                  return (
                    <div
                      key={cat}
                      className={`py-2 px-1 text-center text-[11px] font-bold rounded-lg border transition-all ${
                        isCurrent
                          ? "bg-primary text-on-primary border-primary shadow-2xs"
                          : "bg-surface-container-low text-on-surface-variant border-slate-200"
                      }`}
                    >
                      {cat}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-4 mt-5 border-t border-slate-100 flex items-center justify-between text-xs text-on-surface-variant">
            <span>
              Forecast Window: <strong>{risk.forecast_period || "Monthly"}</strong>
            </span>
            <span>
              Method: <strong>{risk.method_label || "Hybrid LGD"}</strong>
            </span>
          </div>
        </div>

        {/* Climate & Micro-Environmental KPIs (col-span-7) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Temperature */}
          <div className="bg-surface-container-lowest rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
              <Thermometer className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-on-surface-variant font-medium">Ambient Temperature</div>
              <div className="text-2xl font-extrabold text-on-surface mt-0.5 tabular-nums">
                {climate.temperature_c}°C
              </div>
              <div className="text-[11px] text-on-surface-variant mt-1 truncate">
                4-week average: <strong>{climate.temp_4wk_avg_c}°C</strong>
              </div>
            </div>
          </div>

          {/* Rainfall */}
          <div className="bg-surface-container-lowest rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-200">
              <CloudRain className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-on-surface-variant font-medium">Recent Rainfall</div>
              <div className="text-2xl font-extrabold text-on-surface mt-0.5 tabular-nums">
                {climate.rainfall_mm} mm
              </div>
              <div className="text-[11px] text-on-surface-variant mt-1 truncate">
                4-week cumulative: <strong>{climate.rainfall_4wk_mm} mm</strong>
              </div>
            </div>
          </div>

          {/* Vector Suitability / Humidity Indicator */}
          <div className="bg-surface-container-lowest rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0 border border-primary-fixed-dim">
              <Activity className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-on-surface-variant font-medium">Vector Climate Index</div>
              <div className="text-sm font-bold text-on-surface mt-1 truncate">
                {climate.humidity_note || "Favorable for vector breeding"}
              </div>
              <div className="text-[11px] text-on-surface-variant mt-1 truncate">
                Lagged 2–3 week transmission driver
              </div>
            </div>
          </div>

          {/* Surveillance Cases (Simulated Demonstration) */}
          <div className="bg-surface-container-lowest rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-on-surface-variant font-medium">
                Surveillance Count (Simulated)
              </div>
              <div className="text-2xl font-extrabold text-on-surface mt-0.5 tabular-nums">
                {climate.latest_cases}{" "}
                <span className="text-xs font-normal text-on-surface-variant">latest period</span>
              </div>
              <div className="text-[11px] text-on-surface-variant mt-1 truncate">
                Last 4 periods: <strong>{climate.cases_4wk_total} cases</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. CITIZEN ACTIONS & HEALTH FACILITY GUIDANCE */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Recommended Actions for Citizens (col-span-7) */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold text-on-surface">
                  Recommended Preventive Steps ({riskCategory} Hazard)
                </h2>
              </div>
              <span className="text-xs font-semibold text-on-surface-variant">
                Household Advisory
              </span>
            </div>

            <ul className="space-y-2.5">
              {(rec.citizen_actions || []).map((action: string, idx: number) => (
                <li
                  key={idx}
                  className="p-3.5 rounded-xl bg-surface-container-low border border-slate-200/70 flex items-start gap-3 text-xs sm:text-sm text-on-surface"
                >
                  <span className="w-6 h-6 rounded-full bg-primary text-on-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{action}</span>
                </li>
              ))}
            </ul>
          </div>

          {rec.public_health_guidance && (
            <div className="p-3.5 rounded-xl bg-primary-fixed/30 border border-primary-fixed-dim text-xs text-on-surface leading-relaxed mt-2">
              <strong className="text-primary font-bold">Public Health Guidance:</strong>{" "}
              {rec.public_health_guidance}
            </div>
          )}
        </div>

        {/* Local Health Facility & Helpline Card (col-span-5) */}
        <div className="lg:col-span-5 bg-surface-container-lowest rounded-2xl border border-slate-200/90 p-6 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-on-surface">
                Local Public Health Center
              </h2>
            </div>

            {facility ? (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-surface-container-low border border-slate-200/80">
                  <div className="text-[11px] font-bold uppercase text-primary tracking-wider">
                    {facility.type || "Government Primary Health Center"}
                  </div>
                  <div className="text-sm font-bold text-on-surface mt-0.5">
                    {facility.name}
                  </div>
                  {facility.phone && (
                    <div className="text-xs font-semibold text-on-surface mt-2 flex items-center gap-1.5">
                      <PhoneCall className="w-3.5 h-3.5 text-primary" />
                      <span>Direct Contact / Helpline: {facility.phone}</span>
                    </div>
                  )}
                </div>

                {facility.services && (
                  <div>
                    <div className="text-xs font-bold text-on-surface mb-1.5">
                      Free Services Available:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {facility.services.map((srv: string, i: number) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-surface-container-high text-on-surface text-xs font-medium"
                        >
                          {srv}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Contact your village Mitanin or nearest Primary Health Centre (Helpline 104) for free malaria RDT testing and treatment.
              </p>
            )}
          </div>

          {/* Quick 104 / 108 Emergency Card */}
          <div className="p-4 rounded-xl bg-primary text-on-primary space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider">Toll-Free 24x7 Helpline</span>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-bold">Free Call</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xl font-extrabold tracking-wider">104 / 108</div>
              <a
                href="tel:104"
                className="px-3 py-1 bg-surface-container-lowest text-primary text-xs font-bold rounded-lg shadow-2xs hover:bg-surface transition-colors"
              >
                Dial Now
              </a>
            </div>
            <p className="text-[11px] text-on-primary/80 leading-snug">
              Dial 104 for health advice or 108 for emergency ambulance transport across Bastar district.
            </p>
          </div>
        </div>
      </section>

      {/* 9. AUTHORITATIVE CHHATTISGARH LGD BLOCK DIRECTORY & GEOGRAPHY */}
      <LgdBlockMapCard
        selectedDistrictId={selectedLocation.district_id}
        selectedBlockId={selectedLocation.block_id}
      />

      {/* 10. TRAINED ML WEATHER & SYMPTOM DISEASE RISK PREDICTOR */}
      <WeatherDiseasePredictor
        defaultTemperatureC={climate.temperature_c || 29.5}
        defaultHumidityPct={74}
        locationBreadcrumb={locInfo.location_breadcrumb || selectedLocation.breadcrumb}
      />
    </div>
  );
}
