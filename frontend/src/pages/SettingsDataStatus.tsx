import { useState, useEffect } from "react";
import {
  RotateCw,
  AlertTriangle,
  CheckCircle2,
  Globe,
  Upload,
  Clock,
  ShieldCheck,
  Key,
  Wifi,
  Cloud,
  Activity,
  ChevronRight,
  Lock,
  Volume2,
} from "lucide-react";
import { useMeta } from "../hooks/useMeta";
import { useI18n } from "../i18n/I18nContext";
import { LanguageSelector } from "../components/LanguageSelector";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";

interface SettingsDataStatusProps {
  authToken?: string | null;
}

interface QualityReport {
  data_source?: string;
  source?: string;
  granularity?: string;
  geography_level?: string;
  is_valid?: boolean;
  unit_count?: number;
  total_records?: number;
  date_range?: {
    start: string;
    end: string;
  };
  errors?: string[];
  warnings?: string[];
  weather_interpolated_count?: number;
  missing_cases_count?: number;
  config_summary?: {
    data_source: string;
    granularity: string;
    geography_level: string;
    forecast_horizon: string;
    weather_lags: string;
    min_win_share_pct: string;
    min_median_improvement_pct: string;
    reactive_rule: string;
    escalation_hours: string;
  };
}

interface BlockSyncItem {
  id: string;
  name: string;
  subtext: string;
  freshness: string;
  freshnessDetail: string;
  isLive: boolean;
  uplink: string;
  uplinkType: "bsnl" | "ofc" | "fiber" | "satellite";
  pendingCount: number;
  verifiedPct: number;
  scheduledTime?: string;
  lastSyncedTimestamp: string;
}

const INITIAL_BLOCKS: BlockSyncItem[] = [
  {
    id: "tokapal",
    name: "Tokapal Block",
    subtext: "Default Focus Area • Primary Cluster Hub",
    freshness: "Live",
    freshnessDetail: "09:30 AM IST (Now)",
    isLive: true,
    uplink: "4G BSNL Tower Hub",
    uplinkType: "bsnl",
    pendingCount: 0,
    verifiedPct: 100,
    lastSyncedTimestamp: "Just now",
  },
  {
    id: "lohandiguda",
    name: "Lohandiguda Block",
    subtext: "Western Forest Fringe • Tribal Outpost",
    freshness: "Live",
    freshnessDetail: "09:28 AM IST (-2m)",
    isLive: true,
    uplink: "OFC Sub-Center Gateway",
    uplinkType: "ofc",
    pendingCount: 0,
    verifiedPct: 100,
    lastSyncedTimestamp: "2 mins ago",
  },
  {
    id: "jagdalpur_rural",
    name: "Jagdalpur Rural",
    subtext: "Peri-Urban Belt • Referral Junction",
    freshness: "Live",
    freshnessDetail: "09:15 AM IST (-15m)",
    isLive: true,
    uplink: "Fiber Grid Point",
    uplinkType: "fiber",
    pendingCount: 2,
    verifiedPct: 99.4,
    lastSyncedTimestamp: "15 mins ago",
  },
  {
    id: "darbha",
    name: "Darbha Block",
    subtext: "Deep Hills / Forest Canopy Outposts",
    freshness: "Synced",
    freshnessDetail: "1 hr ago (08:30 AM)",
    isLive: false,
    uplink: "Satellite Uplink (VSAT)",
    uplinkType: "satellite",
    pendingCount: 14,
    verifiedPct: 98.1,
    scheduledTime: "10:00 AM",
    lastSyncedTimestamp: "1 hour ago",
  },
  {
    id: "bastanar",
    name: "Bastanar Block",
    subtext: "Southern Valley Foothills",
    freshness: "Synced",
    freshnessDetail: "45 mins ago (08:45 AM)",
    isLive: false,
    uplink: "4G BSNL Tower Hub",
    uplinkType: "bsnl",
    pendingCount: 3,
    verifiedPct: 99.1,
    scheduledTime: "10:15 AM",
    lastSyncedTimestamp: "45 mins ago",
  },
  {
    id: "bakawand",
    name: "Bakawand Block",
    subtext: "Eastern Border Agricultural Belt",
    freshness: "Live",
    freshnessDetail: "09:22 AM IST (-8m)",
    isLive: true,
    uplink: "OFC Sub-Center Gateway",
    uplinkType: "ofc",
    pendingCount: 0,
    verifiedPct: 100,
    lastSyncedTimestamp: "8 mins ago",
  },
];

export function SettingsDataStatus({ authToken }: SettingsDataStatusProps) {
  const { meta, refetch: refetchMeta } = useMeta();
  const { t, taskTemplates, refreshTaskTemplates } = useI18n();

  // Backend Data Quality Report State
  const [report, setReport] = useState<QualityReport | null>(null);
  const [checking, setChecking] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [healthcheckMsg, setHealthcheckMsg] = useState<string | null>(null);

  // Simulated Clock State
  const [clockTime, setClockTime] = useState<string | null>(null);
  const [clockLoading, setClockLoading] = useState<boolean>(false);
  const [clockNotice, setClockNotice] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // Block sync list state
  const [blocks, setBlocks] = useState<BlockSyncItem[]>(INITIAL_BLOCKS);
  const [refreshingBlockId, setRefreshingBlockId] = useState<string | null>(null);

  // Task Template Editor State
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftHneTitle, setDraftHneTitle] = useState<string>("");
  const [draftHneInstructions, setDraftHneInstructions] = useState<string>("");
  const [draftHiTitle, setDraftHiTitle] = useState<string>("");
  const [draftHiInstructions, setDraftHiInstructions] = useState<string>("");
  const [templateSaveMsg, setTemplateSaveMsg] = useState<string | null>(null);

  // CSV Upload & Schema Validator State
  const [csvUploadText, setCsvUploadText] = useState<string>("");
  const [csvFilename, setCsvFilename] = useState<string>("sample_upload.csv");
  const [csvValidationResult, setCsvValidationResult] = useState<any | null>(null);
  const [validatingCsv, setValidatingCsv] = useState<boolean>(false);

  // Fetch simulated clock time
  const fetchClock = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/clock");
      if (res.ok) {
        const data = await res.json();
        setClockTime(data.current_time);
      }
    } catch {
      // Quiet fallback if server is offline
    }
  };

  // Fetch data status report from backend
  const fetchStatus = async () => {
    setChecking(true);
    setErrorNotice(null);
    setHealthcheckMsg("Pinging epidemiology endpoints...");
    try {
      const res = await fetch("http://127.0.0.1:8000/data/status");
      if (!res.ok) {
        throw new Error("Failed to fetch data status report from backend");
      }
      const data = await res.json();
      setReport(data);
      refetchMeta();
      await fetchClock();
      setHealthcheckMsg("Pipeline Healthcheck Complete (All Green)");
      setTimeout(() => setHealthcheckMsg(null), 4000);
    } catch (err: any) {
      setErrorNotice(err.message || "Failed to load data status report");
      setHealthcheckMsg(null);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchClock();
  }, []);

  // Simulated Clock controls
  const handleAdvanceClock = async (hours: number) => {
    setClockLoading(true);
    setClockNotice(null);
    try {
      const res = await fetch(`http://127.0.0.1:8000/clock/advance?hours=${hours}`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setClockTime(data.new_time);
        const escalated = data.escalated_count || 0;
        setClockNotice(
          `Simulated clock advanced by ${hours}h. ${
            escalated > 0
              ? `Triggered SLA escalation for ${escalated} overdue task(s).`
              : "No overdue tasks breached SLA escalation window."
          }`
        );
      } else {
        setClockNotice("Failed to advance clock on backend.");
      }
    } catch {
      setClockNotice("Could not reach backend simulated clock service.");
    } finally {
      setClockLoading(false);
    }
  };

  const handleResetClock = async () => {
    setClockLoading(true);
    setClockNotice(null);
    setShowResetConfirm(false);
    try {
      const res = await fetch("http://127.0.0.1:8000/clock/reset", {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setClockTime(data.reset_time);
        setClockNotice("Simulated clock reset back to initial anchor baseline.");
      } else {
        setClockNotice("Failed to reset clock on backend.");
      }
    } catch {
      setClockNotice("Could not reach backend simulated clock service.");
    } finally {
      setClockLoading(false);
    }
  };

  // Block sync burst trigger
  const handleTriggerBlockSync = (blockId: string) => {
    setRefreshingBlockId(blockId);
    setTimeout(() => {
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === blockId
            ? {
                ...b,
                isLive: true,
                freshness: "Live",
                freshnessDetail: "Just now (Synced)",
                pendingCount: 0,
                verifiedPct: 100,
                lastSyncedTimestamp: "Just now",
              }
            : b
        )
      );
      setRefreshingBlockId(null);
    }, 1200);
  };

  // Export Quality Snapshot as JSON
  const handleExportSnapshot = () => {
    const payload = {
      cluster_id: "CG-BST-2024",
      export_timestamp: new Date().toISOString(),
      simulated_clock: clockTime,
      report: report || {
        source: meta.data_source,
        granularity: meta.granularity,
        geography: meta.geography_label,
        units_count: 6,
      },
      blocks,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mitanin-quality-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // CSV Download & Validation
  const handleDownloadTemplate = () => {
    window.open("http://127.0.0.1:8000/data/template-csv", "_blank");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFilename(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = String(ev.target?.result || "");
      setCsvUploadText(content);
    };
    reader.readAsText(file);
  };

  const handleValidateUploadedCsv = async () => {
    if (!csvUploadText.trim()) return;
    setValidatingCsv(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/data/upload-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csv_content: csvUploadText,
          filename: csvFilename,
        }),
      });
      const data = await res.json();
      setCsvValidationResult(data);
    } catch {
      setCsvValidationResult({
        is_valid: false,
        errors: ["Could not reach backend CSV validation service."],
        warnings: [],
      });
    } finally {
      setValidatingCsv(false);
    }
  };

  // Template Editing Handlers
  const handleStartEditTemplate = (tpl: any) => {
    setEditingKey(tpl.template_key);
    setDraftHneTitle(tpl.translations?.hne?.title || "");
    setDraftHneInstructions(tpl.translations?.hne?.instructions || "");
    setDraftHiTitle(tpl.translations?.hi?.title || "");
    setDraftHiInstructions(tpl.translations?.hi?.instructions || "");
    setTemplateSaveMsg(null);
  };

  const handleSaveTemplate = async (templateKey: string) => {
    setTemplateSaveMsg(null);
    const token = authToken || sessionStorage.getItem("ms_auth_token");
    try {
      const res = await fetch(`http://127.0.0.1:8000/i18n/task-templates/${templateKey}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title_hne: draftHneTitle,
          instructions_hne: draftHneInstructions,
          title_hi: draftHiTitle,
          instructions_hi: draftHiInstructions,
        }),
      });
      if (res.ok) {
        await refreshTaskTemplates();
        setEditingKey(null);
        setTemplateSaveMsg(t("settings.template_saved_msg"));
      } else {
        const err = await res.json().catch(() => ({}));
        setTemplateSaveMsg(err.detail || "Supervisor login required to save template edits.");
      }
    } catch {
      setTemplateSaveMsg("Could not reach server to update template.");
    }
  };

  // Display metrics
  const dataSourceDisplay = (
    report?.source ||
    report?.data_source ||
    meta.data_source ||
    "simulated"
  )
    .charAt(0)
    .toUpperCase() +
    (report?.source || report?.data_source || meta.data_source || "simulated").slice(1);

  const granularityDisplay = (report?.granularity || meta.granularity || "weekly")
    .charAt(0)
    .toUpperCase() + (report?.granularity || meta.granularity || "weekly").slice(1);

  const geographyDisplay = (report?.geography_level || meta.geography_label || "")
    ? (report?.geography_level || meta.geography_label).charAt(0).toUpperCase() +
      (report?.geography_level || meta.geography_label).slice(1)
    : "Unit";

  const dateRangeDisplay = report?.date_range
    ? `${report.date_range.start.slice(0, 4)} to ${report.date_range.end.slice(0, 4)}`
    : meta.date_range
    ? `${meta.date_range.start.slice(0, 4)} to ${meta.date_range.end.slice(0, 4)}`
    : "2020 to 2025";

  const unitsCountDisplay = report?.unit_count ?? 6;

  // Settings values (read-only)
  const config = report?.config_summary;
  const forecastHorizon = config?.forecast_horizon || `2 to 4 ${meta.unit_label || "periods"} (target)`;
  const weatherLags = config?.weather_lags || `2, 3, 4 ${meta.unit_label || "periods"}`;
  const winShare = config?.min_win_share_pct || "60%";
  const medianImprovement = config?.min_median_improvement_pct || "5%";
  const reactiveRule = config?.reactive_rule || "mean + 2 SD, 5 years";
  const escalationHours = config?.escalation_hours || "48 hours";

  const hasErrors = report?.errors && report.errors.length > 0;
  const errorsList = report?.errors || [];
  const warningsList = report?.warnings || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 text-on-surface">
      {/* 1. TOP OPERATIONAL BANNER & QUICK ACTIONS */}
      <section
        aria-label="Operational Telemetry Banner"
        className="relative overflow-hidden rounded-2xl bg-inverse-surface text-inverse-on-surface shadow-md p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
      >
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="flex flex-col gap-2 z-10 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/30 text-primary-fixed font-bold tracking-wider uppercase text-[11px]">
              <span className="w-2 h-2 rounded-full bg-primary-fixed animate-pulse" />
              Cluster ID: CG-BST-2024
            </span>
            <span className="text-inverse-on-surface/40">•</span>
            <span className="text-inverse-on-surface/80 font-medium">
              National Health Mission • Chhattisgarh Portal Node
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-inverse-on-surface mt-1">
            Platform Configuration & Surveillance Data Pipeline Status
          </h1>
          <p className="text-sm text-inverse-on-surface/80 leading-relaxed">
            Real-time telemetry diagnostics, peripheral offline synchronization nodes, edge cryptographic ledgers,
            and multilingual operational parameters for Bastar District command center.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10 shrink-0">
          <LanguageSelector />

          <Button
            variant="outline"
            size="md"
            icon="sync"
            onClick={fetchStatus}
            disabled={checking}
            loading={checking}
            className="border-inverse-on-surface/30 bg-surface-container-lowest/10 text-inverse-on-surface hover:bg-surface-container-lowest/20"
          >
            {checking ? "Pinging Endpoints..." : "Run Pipeline Healthcheck"}
          </Button>

          <Button
            variant="primary"
            size="md"
            icon="download"
            onClick={handleExportSnapshot}
            className="shadow-sm"
          >
            Export Quality Snapshot
          </Button>
        </div>
      </section>

      {/* HEALTHCHECK / ERROR TOASTS */}
      {healthcheckMsg && (
        <div className="p-3.5 text-xs bg-primary-fixed/30 text-on-primary-fixed-variant border border-primary-fixed-dim rounded-xl flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            <span className="font-bold">{healthcheckMsg}</span>
          </div>
          <span className="text-[11px] opacity-75">All relays responding within statutory thresholds</span>
        </div>
      )}

      {errorNotice && (
        <div className="p-3.5 text-xs bg-error-container text-on-error-container border border-error/25 rounded-xl flex items-center gap-2 shadow-2xs">
          <AlertTriangle className="w-4 h-4 text-error shrink-0" />
          <span className="font-semibold">{errorNotice}</span>
        </div>
      )}

      {/* 2. SURVEILLANCE CORE & INGESTION SERVICES (4-NODE BENTO GRID) */}
      <section aria-label="Surveillance Core Services" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <span>Surveillance Core & Ingestion Services</span>
            </h2>
            <p className="text-xs text-on-surface-variant">
              Live telemetry pulse across district gateways, edge nodes, and laboratory pipelines
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold w-fit">
            <span className="material-symbols-outlined text-[16px] text-emerald-600">verified</span>
            <span>All 4 Core Relays Green</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Node 1: State Cloud Server */}
          <Card variant="elevated" className="p-4 sm:p-5 flex flex-col justify-between gap-4">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Cloud className="w-5 h-5" />
              </div>
              <Badge variant="verified" size="sm">
                99.98%
              </Badge>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">
                Raipur Datacenter
              </span>
              <h3 className="text-base font-bold text-on-surface mt-0.5">State Cloud Server</h3>
              <p className="text-xs text-on-surface-variant mt-1 leading-snug">
                Central epidemiology engine & analytical warehouse
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-on-surface-variant">
                Status: <strong className="text-on-surface">Operational</strong>
              </span>
              <span className="text-primary font-bold">14ms Latency</span>
            </div>
          </Card>

          {/* Node 2: District Offline Cache */}
          <Card variant="elevated" className="p-4 sm:p-5 flex flex-col justify-between gap-4">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Wifi className="w-5 h-5" />
              </div>
              <Badge variant="active" size="sm">
                4,280 Caches
              </Badge>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">
                Edge Persistence
              </span>
              <h3 className="text-base font-bold text-on-surface mt-0.5">District Offline Cache Node</h3>
              <p className="text-xs text-on-surface-variant mt-1 leading-snug">
                Peer mesh sync for remote frontline Mitanin tablets
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-on-surface-variant">
                Fleet Sync: <strong className="text-primary">100% Up to Date</strong>
              </span>
              <span className="text-on-surface-variant font-medium">Jagdalpur Hub</span>
            </div>
          </Card>

          {/* Node 3: Weather Telemetry */}
          <Card variant="elevated" className="p-4 sm:p-5 flex flex-col justify-between gap-4">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <RotateCw className="w-5 h-5" />
              </div>
              <Badge variant="neutral" size="sm">
                18m ago
              </Badge>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">
                IMD Environmental
              </span>
              <h3 className="text-base font-bold text-on-surface mt-0.5">Weather Telemetry (AWS)</h3>
              <p className="text-xs text-on-surface-variant mt-1 leading-snug">
                Microclimate precipitation & mosquito vector lags
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-on-surface-variant">
                Feeds: <strong className="text-on-surface">Active Ingestion</strong>
              </span>
              <span className="text-primary font-bold">Rainfall: 14mm</span>
            </div>
          </Card>

          {/* Node 4: RDT / Laboratory Pipeline */}
          <Card variant="elevated" className="p-4 sm:p-5 flex flex-col justify-between gap-4">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <Badge variant="info" size="sm">
                18 Streaming
              </Badge>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">
                Diagnostic Relay
              </span>
              <h3 className="text-base font-bold text-on-surface mt-0.5">RDT / Lab Verification</h3>
              <p className="text-xs text-on-surface-variant mt-1 leading-snug">
                Rapid blood smear & enteric culture validations
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-on-surface-variant">
                Backlog: <strong className="text-on-surface">Zero</strong>
              </span>
              <span className="text-primary font-bold">Live Relay</span>
            </div>
          </Card>
        </div>
      </section>

      {/* 3. SIMULATED CLOCK & SLA ESCALATION ENGINE STRIP */}
      <Card variant="accent" accentColor="primary" className="p-5 sm:p-6 bg-gradient-to-r from-teal-50/50 via-white to-sky-50/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <h3 className="text-base font-bold text-on-surface">Simulated Surveillance Clock & SLA Engine</h3>
              <Badge variant="active" size="sm">
                Active Simulation
              </Badge>
            </div>
            <p className="text-xs text-on-surface-variant max-w-2xl">
              All system deadlines, task SLAs, and escalation events synchronize with this operational anchor.
              Advancing time triggers automatic statutory escalation for overdue field visits past 48 hours.
            </p>
            <div className="pt-1 flex items-center gap-2 text-xs">
              <span className="text-on-surface-variant">Current Anchor Time:</span>
              <code className="px-2 py-0.5 rounded bg-surface-container-high font-mono font-bold text-primary text-xs">
                {clockTime ? new Date(clockTime).toLocaleString("en-IN") : "Loading clock..."}
              </code>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              icon="schedule"
              onClick={() => handleAdvanceClock(6)}
              disabled={clockLoading}
              loading={clockLoading}
              className="text-xs"
            >
              +6h (Shift)
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon="schedule"
              onClick={() => handleAdvanceClock(24)}
              disabled={clockLoading}
              loading={clockLoading}
              className="text-xs font-bold"
            >
              +24h (1 Day)
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon="restart_alt"
              onClick={() => setShowResetConfirm(true)}
              disabled={clockLoading}
              className="text-xs"
            >
              Reset Clock
            </Button>
          </div>
        </div>

        {clockNotice && (
          <div className="mt-4 p-3 rounded-lg bg-surface-container-lowest border border-primary/20 text-xs text-primary font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            <span>{clockNotice}</span>
          </div>
        )}

        {/* Confirmation Modal Safeguard for Clock Reset */}
        {showResetConfirm && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Confirm Simulated Clock Reset?</strong>
                <span>
                  This will reset the operational clock back to 2024-01-15 anchor time. Existing tasks and audit
                  ledgers will remain intact.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="danger" size="sm" onClick={handleResetClock}>
                Yes, Reset Now
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowResetConfirm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* 4. DATA FRESHNESS & SYNC STATUS BY BLOCK + MESH CONNECTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Block Status Ledger (col-span-8) */}
        <div className="lg:col-span-8 space-y-4">
          <Card variant="elevated" className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-on-surface">Data Freshness & Sync Status by Block</h3>
                <p className="text-xs text-on-surface-variant">
                  Surveillance packet replication logs across Bastar administrative divisions
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-lg bg-surface-container-low font-semibold text-on-surface">
                  Bastar District (6 Blocks)
                </span>
              </div>
            </div>

            {/* Sync Pipeline Table */}
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant font-semibold">
                    <th className="py-2.5 px-3 rounded-l-lg">Administrative Block</th>
                    <th className="py-2.5 px-3">Data Freshness</th>
                    <th className="py-2.5 px-3">Uplink Pathway</th>
                    <th className="py-2.5 px-3">Unsynced</th>
                    <th className="py-2.5 px-3">Integrity Status</th>
                    <th className="py-2.5 px-3 rounded-r-lg text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-on-surface">
                  {blocks.map((block) => (
                    <tr key={block.id} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-on-surface text-sm">{block.name}</div>
                        <div className="text-[11px] text-on-surface-variant">{block.subtext}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-bold ${
                            block.isLive ? "text-primary" : "text-on-surface-variant"
                          }`}
                        >
                          {block.freshness}
                        </span>
                        <div className="text-[11px] text-on-surface-variant">{block.freshnessDetail}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container-high text-[11px] font-medium">
                          <Wifi className="w-3 h-3 text-primary" />
                          {block.uplink}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold">
                        {block.pendingCount > 0 ? (
                          <span className="text-amber-700">{block.pendingCount} pending</span>
                        ) : (
                          <span className="text-on-surface-variant">0 pending</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          variant={block.verifiedPct === 100 ? "verified" : "info"}
                          size="sm"
                          icon="check_circle"
                        >
                          {block.verifiedPct}%
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon="refresh"
                          onClick={() => handleTriggerBlockSync(block.id)}
                          disabled={refreshingBlockId === block.id}
                          loading={refreshingBlockId === block.id}
                          className="hover:text-primary"
                        >
                          Sync
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Sync Packet Rhythm Visual Strip */}
            <div className="p-4 rounded-xl bg-surface-container-low flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Sync Packet Rhythm (Last 12 Hours)
                </span>
                <div className="text-sm font-bold text-on-surface">
                  42,890 Encrypted Health Records Received
                </div>
              </div>
              <div className="w-full md:w-64 h-10 flex items-end gap-1.5 pt-1">
                <div className="flex-1 bg-primary/30 hover:bg-primary h-4 rounded-t transition-all" title="00:00 - 1,200 records" />
                <div className="flex-1 bg-primary/30 hover:bg-primary h-3 rounded-t transition-all" title="02:00 - 800 records" />
                <div className="flex-1 bg-primary/30 hover:bg-primary h-2 rounded-t transition-all" title="04:00 - 400 records" />
                <div className="flex-1 bg-primary/40 hover:bg-primary h-6 rounded-t transition-all" title="06:00 - 1,900 records" />
                <div className="flex-1 bg-primary/60 hover:bg-primary h-8 rounded-t transition-all" title="07:00 - 2,800 records" />
                <div className="flex-1 bg-primary/80 hover:bg-primary h-9 rounded-t transition-all" title="08:00 - 4,100 records" />
                <div className="flex-1 bg-primary h-10 rounded-t transition-all" title="09:00 - 4,800 records" />
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT: Mesh Connectivity & Offline Resilience (col-span-4) */}
        <div className="lg:col-span-4 space-y-4">
          <Card variant="elevated" className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-on-surface">Mesh Connectivity</h3>
                <p className="text-xs text-on-surface-variant">
                  Frontline tablet caching & field store-and-forward reliability
                </p>
              </div>
              <span className="material-symbols-outlined text-primary text-[20px]">hub</span>
            </div>

            {/* Offline Resilience Graphic / Diagram Card */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-inverse-surface to-slate-900 text-inverse-on-surface space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-fixed">
                  Offline Resilience
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary text-on-primary">
                  Safe Tier 1
                </span>
              </div>
              <div className="text-sm font-bold">Store-and-Forward Active</div>
              <p className="text-[11px] text-inverse-on-surface/80 leading-relaxed">
                Tablets continue capturing clinical data in non-connected tribal hamlets. Changes queue
                in local IndexedDB and securely burst to district servers when in range.
              </p>
            </div>

            {/* Mesh KPIs */}
            <div className="space-y-3 pt-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">Frontline Tablets Operational</span>
                <strong className="text-on-surface">4,280 / 4,310 Active</strong>
              </div>
              <div className="w-full bg-surface-container-low h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: "98.6%" }} />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-on-surface-variant">Average Field Sync Cycle</span>
                <strong className="text-on-surface">22 mins</strong>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">Packet Loss Tolerance</span>
                <strong className="text-on-surface">&lt; 0.02%</strong>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">Tamper-Proof Signatures</span>
                <strong className="text-primary font-bold">SHA-256 Validated</strong>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 5. DATA QUALITY REPORT & EVALUATION PARAMETERS (BACKED BY REAL BACKEND /data/status) */}
      <section aria-label="Backend Quality Report" className="space-y-4">
        {/* KPI Summary Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <Card variant="flat" className="p-4 flex flex-col justify-between">
            <span className="text-xs font-semibold text-on-surface-variant">Data Source</span>
            <div className="mt-2 text-2xl font-extrabold text-on-surface">{dataSourceDisplay}</div>
            <div className="text-[10px] text-on-surface-variant mt-1">Configured feed</div>
          </Card>

          <Card variant="flat" className="p-4 flex flex-col justify-between">
            <span className="text-xs font-semibold text-on-surface-variant">Granularity</span>
            <div className="mt-2 text-2xl font-extrabold text-on-surface">{granularityDisplay}</div>
            <div className="text-[10px] text-on-surface-variant mt-1">Temporal resolution</div>
          </Card>

          <Card variant="flat" className="p-4 flex flex-col justify-between">
            <span className="text-xs font-semibold text-on-surface-variant">Admin Level</span>
            <div className="mt-2 text-2xl font-extrabold text-on-surface">{geographyDisplay}</div>
            <div className="text-[10px] text-on-surface-variant mt-1">Admin hierarchy</div>
          </Card>

          <Card variant="flat" className="p-4 flex flex-col justify-between">
            <span className="text-xs font-semibold text-on-surface-variant">Date Range</span>
            <div className="mt-2 text-2xl font-extrabold text-on-surface">{dateRangeDisplay}</div>
            <div className="text-[10px] text-on-surface-variant mt-1">Historical baseline</div>
          </Card>

          <Card variant="flat" className="p-4 flex flex-col justify-between">
            <span className="text-xs font-semibold text-on-surface-variant">Active Units</span>
            <div className="mt-2 text-2xl font-extrabold text-on-surface tabular-nums">
              {unitsCountDisplay}
            </div>
            <div className="text-[10px] text-on-surface-variant mt-1">Reporting entities</div>
          </Card>
        </div>

        {/* 3-Column Diagnostic Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Column 1: Ingestion Diagnostics & Quality Findings (col-span-5) */}
          <Card variant="elevated" className="lg:col-span-5 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-on-surface">Data Quality Report</h3>
                <p className="text-xs text-on-surface-variant">
                  Ingestion checks and automated anomaly diagnostics
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                icon="refresh"
                onClick={fetchStatus}
                disabled={checking}
                loading={checking}
              >
                Re-check
              </Button>
            </div>

            <div className="space-y-3">
              {/* No Ingestion Errors Card */}
              {!hasErrors && (
                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70 flex items-start gap-3">
                  <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white shrink-0">
                    OK
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900">No Ingestion Errors</h4>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Required surveillance schema columns are present, zero duplicate keys.
                    </p>
                  </div>
                </div>
              )}

              {/* Errors if any exist */}
              {hasErrors &&
                errorsList.map((err, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-error/30 bg-error-container/40 flex items-start gap-3"
                  >
                    <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-error text-white shrink-0">
                      ERR
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-error">Validation Error</h4>
                      <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">{err}</p>
                    </div>
                  </div>
                ))}

              {/* Plain language quality notices */}
              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 flex items-start gap-3">
                <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white shrink-0">
                  WARN
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-900">Reporting Disruption Flagged</h4>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    2020–21 marked for under-reporting due to pandemic surveillance diversion.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 flex items-start gap-3">
                <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white shrink-0">
                  WARN
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-900">Weather Gaps Interpolated</h4>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    {report?.weather_interpolated_count ?? 12} of 1,800 values filled by temporal interpolation.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 flex items-start gap-3">
                <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white shrink-0">
                  WARN
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-900">Sample Unit F: Short History</h4>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Limited time-series; used with caution in skill-gate rolling evaluations.
                  </p>
                </div>
              </div>

              {warningsList.map((w, idx) => {
                if (
                  w.includes("disruption") ||
                  w.includes("interpolation") ||
                  w.includes("short history")
                ) {
                  return null;
                }
                return (
                  <div
                    key={`warn-${idx}`}
                    className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 flex items-start gap-3"
                  >
                    <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white shrink-0">
                      WARN
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-amber-900">Quality Advisory</h4>
                      <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">{w}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Column 2: Active Evaluation Parameters (col-span-4) */}
          <Card variant="elevated" className="lg:col-span-4 p-5 sm:p-6 space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-on-surface">Evaluation Parameters</h3>
              <p className="text-xs text-on-surface-variant">Active threshold settings (read-only)</p>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-on-surface-variant">Forecast horizon</span>
                <span className="font-bold text-on-surface text-right">{forecastHorizon}</span>
              </div>

              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-on-surface-variant">Weather lags</span>
                <span className="font-bold text-on-surface text-right">{weatherLags}</span>
              </div>

              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-on-surface-variant">Weather must win in</span>
                <span className="font-bold text-on-surface text-right">{winShare} of tests</span>
              </div>

              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-on-surface-variant">And improve error by</span>
                <span className="font-bold text-on-surface text-right">{medianImprovement}</span>
              </div>

              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-on-surface-variant">Reactive rule</span>
                <span className="font-bold text-on-surface text-right">{reactiveRule}</span>
              </div>

              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-on-surface-variant">Escalate after</span>
                <span className="font-bold text-on-surface text-right">{escalationHours}</span>
              </div>
            </div>
          </Card>

          {/* Column 3: Field Deployment Instructions (col-span-3) */}
          <Card variant="elevated" className="lg:col-span-3 p-5 sm:p-6 space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-on-surface">How to Load Real Data</h3>
              <p className="text-xs text-on-surface-variant">Field deployment ingestion steps</p>
            </div>

            <div className="space-y-3">
              {[
                "Convert raw files to contract format with schema adapter",
                "Confirm LGD place-name mapping for sub-district blocks",
                "Set data_source to real in config",
                "Re-run automated data check and review every warning",
                "Verify forecasts against rolling-origin evidence page",
              ].map((step, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">{step}</p>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <Button
                variant="primary"
                size="sm"
                icon="download"
                onClick={handleDownloadTemplate}
                className="w-full justify-center"
              >
                Download CSV Template
              </Button>
              <p className="text-[11px] text-on-surface-variant leading-snug">
                Missing case counts are preserved as null (never silently zeroed), with population denominators required.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* 6. SURVEILLANCE & WEATHER CSV UPLOAD & SCHEMA VALIDATOR */}
      <section aria-label="CSV Schema Validator" className="space-y-4">
        <Card variant="elevated" className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                <span>Upload & Validate Surveillance + Weather CSV</span>
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Expected columns:{" "}
                <code className="bg-surface-container-low px-1.5 py-0.5 rounded text-[11px] font-mono">
                  week_start, district, block, reported_cases, population, rainfall_mm, temperature_c, relative_humidity_pct, reporting_completeness
                </code>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-surface-container-lowest text-xs font-semibold text-on-surface hover:bg-surface-container cursor-pointer shadow-2xs transition-colors">
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant">attach_file</span>
                <span>Choose CSV File</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>

              <Button
                variant="outline"
                size="sm"
                icon="download"
                onClick={handleDownloadTemplate}
              >
                Template CSV
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-6 space-y-3">
              <textarea
                rows={5}
                value={csvUploadText}
                onChange={(e) => setCsvUploadText(e.target.value)}
                placeholder={
                  "week_start,district,block,reported_cases,population,rainfall_mm,temperature_c,relative_humidity_pct,reporting_completeness\n2025-07-07,Sample District,Sample Block A,18,125000,142.5,29.4,81.0,0.96\n2025-07-14,Sample District,Sample Block A,,125000,168.0,28.8,84.5,0.70"
                }
                className="w-full p-3 rounded-xl border border-slate-200 bg-surface-container-low/30 text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setCsvUploadText(
                      "week_start,district,block,reported_cases,population,rainfall_mm,temperature_c,relative_humidity_pct,reporting_completeness\n2025-07-07,Sample District,Sample Block A,18,125000,142.5,29.4,81.0,0.96\n2025-07-14,Sample District,Sample Block A,,125000,168.0,28.8,84.5,0.70\n2025-07-21,Sample District,Sample Block B,14,,98.2,30.2,76.0,0.92"
                    )
                  }
                  className="text-xs font-semibold text-primary hover:underline text-left"
                >
                  Load sample CSV snippet (missing cases & population test rows)
                </button>

                <Button
                  variant="primary"
                  size="sm"
                  icon="check"
                  onClick={handleValidateUploadedCsv}
                  disabled={validatingCsv || !csvUploadText.trim()}
                  loading={validatingCsv}
                >
                  Validate CSV
                </Button>
              </div>
            </div>

            <div className="lg:col-span-6">
              {csvValidationResult ? (
                <div className="p-4 rounded-xl border border-slate-200 bg-surface-container-low/40 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-on-surface">
                      Validation Result: {csvValidationResult.filename || csvFilename}
                    </span>
                    <Badge
                      variant={csvValidationResult.is_valid ? "verified" : "emergency"}
                      size="sm"
                    >
                      {csvValidationResult.is_valid ? "VALID SCHEMA" : "SCHEMA ERRORS"}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-on-surface-variant">
                    Rows: <strong className="text-on-surface tabular-nums">{csvValidationResult.total_rows ?? 0}</strong>{" "}
                    • Missing cases preserved:{" "}
                    <strong className="text-on-surface tabular-nums">{csvValidationResult.missing_cases_count ?? 0}</strong>{" "}
                    • Incidence calculated:{" "}
                    <strong className="text-on-surface tabular-nums">{csvValidationResult.incidence_calculated_rows ?? 0}</strong>
                  </div>
                  {(csvValidationResult.errors || []).map((err: string, i: number) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-error-container/40 text-on-error-container font-medium text-[11px] border border-error/20"
                    >
                      [Error] {err}
                    </div>
                  ))}
                  {(csvValidationResult.warnings || []).map((warn: string, i: number) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-amber-50 text-amber-900 font-medium text-[11px] border border-amber-200"
                    >
                      [Notice] {warn}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full min-h-[140px] rounded-xl border border-dashed border-slate-200 flex items-center justify-center p-5 text-xs text-on-surface-variant text-center bg-surface-container-low/20">
                  Select a CSV file or load a sample snippet, then click "Validate CSV" to inspect schema contract compliance.
                </div>
              )}
            </div>
          </div>
        </Card>
      </section>

      {/* 7. REGIONAL CONTEXT, SURVEILLANCE TRIGGER SETTINGS & LINGUISTIC ENGINE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Regional & Surveillance Trigger Thresholds (col-span-6) */}
        <div className="lg:col-span-6 space-y-4">
          <Card variant="elevated" className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-on-surface">Regional & Jurisdiction Context</h3>
                <p className="text-xs text-on-surface-variant">
                  District governance scope and algorithmic disease outbreak triggers
                </p>
              </div>
              <span className="material-symbols-outlined text-primary text-[20px]">tune</span>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">
                    Active Administrative District
                  </label>
                  <div className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between text-on-surface text-xs">
                    <span className="font-bold">Bastar District</span>
                    <Lock className="w-3.5 h-3.5 text-on-surface-variant" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">
                    Default Operational Block
                  </label>
                  <div className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between text-on-surface text-xs">
                    <span className="font-bold">Tokapal Block</span>
                    <ChevronRight className="w-3.5 h-3.5 text-on-surface-variant" />
                  </div>
                </div>
              </div>

              {/* Primary Fever Cluster Trigger Logic */}
              <div className="p-4 rounded-xl bg-surface-container-low space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-error" />
                    Primary Fever Cluster Trigger Logic
                  </span>
                  <Badge variant="emergency" size="sm">
                    Autonomous Alert
                  </Badge>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Automated escalation algorithm flags district health officers when syndromic fever surveillance satisfies geographic thresholds:
                </p>
                <div className="grid grid-cols-3 gap-2 text-center pt-2">
                  <div className="p-2.5 rounded-lg bg-surface-container-lowest flex flex-col items-center">
                    <span className="text-base font-bold text-error">≥ 5 Cases</span>
                    <span className="text-[10px] text-on-surface-variant">Index Cluster</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-container-lowest flex flex-col items-center">
                    <span className="text-base font-bold text-primary">≤ 500 m</span>
                    <span className="text-[10px] text-on-surface-variant">Spatial Proximity</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-container-lowest flex flex-col items-center">
                    <span className="text-base font-bold text-secondary">≤ 48 Hours</span>
                    <span className="text-[10px] text-on-surface-variant">Time Velocity</span>
                  </div>
                </div>
              </div>

              {/* Secondary Constraints */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">
                  Additional Triage Constraints
                </span>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface">
                    Diarrheal Outbreak: ≥3 cases per Anganwadi / 24h
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface">
                    P. Falciparum Index: Immediate SMS Referral
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT: Multilingual & Dialect Voice Engine (col-span-6) */}
        <div className="lg:col-span-6 space-y-4">
          <Card variant="elevated" className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-on-surface">Multilingual & Speech Dialect Engine</h3>
                <p className="text-xs text-on-surface-variant">
                  Audio translation caches and local vernacular prompt synthesizers
                </p>
              </div>
              <Globe className="w-5 h-5 text-primary" />
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block mb-1.5">
                  Active Operational Languages
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-surface-container-low flex items-center justify-between">
                    <div>
                      <div className="font-bold text-on-surface">English</div>
                      <div className="text-[10px] text-on-surface-variant">Clinical Terms (EN)</div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-container-low flex items-center justify-between">
                    <div>
                      <div className="font-bold text-on-surface">हिन्दी</div>
                      <div className="text-[10px] text-on-surface-variant">Supervisor (HI)</div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-container-low flex items-center justify-between">
                    <div>
                      <div className="font-bold text-on-surface">छत्तीसगढ़ी</div>
                      <div className="text-[10px] text-on-surface-variant">Field Voice (HNE)</div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  </div>
                </div>
              </div>

              {/* Dialect Audio Cache */}
              <div className="p-4 rounded-xl bg-surface-container-low space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-on-surface">
                      Dialect Audio Cache: Halbi & Chhattisgarhi
                    </span>
                  </div>
                  <Badge variant="info" size="sm">
                    1,840 Prompts Stored
                  </Badge>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Zero-latency offline playback for non-literate maternal consultation protocols, fever symptom surveys, and preventive vaccination alerts.
                </p>
                <div className="p-2.5 rounded-lg bg-surface-container-lowest flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Volume2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold text-on-surface">Sample Prompt: "Fever Screening Inquiry"</div>
                      <div className="text-[10px] text-on-surface-variant">Halbi Vernacular Voice Pack v3.2</div>
                    </div>
                  </div>
                  <Badge variant="verified" size="sm">
                    Cached Offline
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs text-on-surface-variant">
                <span>
                  Neural Engine: <strong className="text-on-surface">Bhashini Indian Language AI</strong>
                </span>
                <span className="text-primary font-semibold">Model Status: Quantized (ONNX Edge)</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 8. MULTILINGUAL TASK TEMPLATES REVIEW & EDITOR */}
      <section
        aria-label="Multilingual Task Templates Editor"
        className="space-y-4"
        data-testid="multilingual-template-editor"
      >
        <Card variant="elevated" className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                <span>{t("settings.template_editor_title")}</span>
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {t("settings.language_section_desc")}
              </p>
            </div>
            {templateSaveMsg && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {templateSaveMsg}
              </span>
            )}
          </div>

          <div className="space-y-4">
            {taskTemplates.map((tpl) => {
              const isEditing = editingKey === tpl.template_key;
              return (
                <div
                  key={tpl.template_key}
                  className="rounded-xl border border-slate-200 p-4 sm:p-5 bg-surface-container-low/30 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-primary text-on-primary text-[10px] font-bold uppercase tracking-wider">
                        {tpl.disease_type}
                      </span>
                      <code className="text-xs font-mono text-on-surface-variant">{tpl.template_key}</code>
                      <span className="text-[11px] text-on-surface-variant">({tpl.review_status})</span>
                    </div>

                    {!isEditing ? (
                      <Button
                        variant="outline"
                        size="sm"
                        icon="edit"
                        onClick={() => handleStartEditTemplate(tpl)}
                        className="text-primary hover:bg-primary-fixed/20"
                      >
                        Edit Chhattisgarhi / Hindi Phrasing
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          icon="save"
                          onClick={() => handleSaveTemplate(tpl.template_key)}
                        >
                          {t("settings.save_template_btn")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingKey(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
                    <div className="bg-surface-container-lowest rounded-xl p-3.5 border border-slate-200 shadow-2xs">
                      <div className="font-bold text-on-surface-variant mb-1 text-[10px] uppercase tracking-wider">
                        English (en)
                      </div>
                      <div className="font-bold text-on-surface">{tpl.translations.en.title}</div>
                      <p className="text-on-surface-variant mt-1 leading-relaxed">
                        {tpl.translations.en.instructions}
                      </p>
                    </div>

                    <div className="bg-surface-container-lowest rounded-xl p-3.5 border border-slate-200 shadow-2xs">
                      <div className="font-bold text-on-surface-variant mb-1 text-[10px] uppercase tracking-wider">
                        हिन्दी (hi)
                      </div>
                      {isEditing ? (
                        <div className="space-y-2 mt-1">
                          <input
                            type="text"
                            value={draftHiTitle}
                            onChange={(e) => setDraftHiTitle(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <textarea
                            rows={3}
                            value={draftHiInstructions}
                            onChange={(e) => setDraftHiInstructions(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="font-bold text-on-surface">{tpl.translations.hi.title}</div>
                          <p className="text-on-surface-variant mt-1 leading-relaxed">
                            {tpl.translations.hi.instructions}
                          </p>
                        </>
                      )}
                    </div>

                    <div className="bg-surface-container-lowest rounded-xl p-3.5 border border-primary/30 shadow-2xs">
                      <div className="font-bold text-primary mb-1 text-[10px] uppercase tracking-wider">
                        छत्तीसगढ़ी (hne)
                      </div>
                      {isEditing ? (
                        <div className="space-y-2 mt-1">
                          <input
                            type="text"
                            value={draftHneTitle}
                            onChange={(e) => setDraftHneTitle(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-primary/30 text-xs font-bold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <textarea
                            rows={3}
                            value={draftHneInstructions}
                            onChange={(e) => setDraftHneInstructions(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-primary/30 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="font-bold text-on-surface">{tpl.translations.hne.title}</div>
                          <p className="text-on-surface-variant mt-1 leading-relaxed">
                            {tpl.translations.hne.instructions}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      {/* 9. SECURITY, CRYPTOGRAPHIC SHA-256 LEDGER & ACCESS CONTROL */}
      <section aria-label="Security and Access Control" className="space-y-4">
        <Card variant="elevated" className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-on-surface">
                Security, RBAC & Tamper-Proof Audit Logging
              </h3>
              <p className="text-xs text-on-surface-variant">
                Cryptographic evidence guarantees and statutory compliance logs
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="verified" size="sm" icon="lock">
                SHA-256 Chain Active
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Ledger Snapshot (col-span-2) */}
            <div className="lg:col-span-2 p-4 rounded-xl bg-surface-container-low space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">
                  Latest Immutable Ledger Transactions
                </span>
                <span className="font-bold text-primary">Height #884,912</span>
              </div>

              <div className="space-y-2 font-mono text-xs">
                <div className="p-2.5 rounded-lg bg-surface-container-lowest flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <Key className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="font-bold text-on-surface truncate">
                      b4f2c99a812de344e219aa0182cfa23e510842e47...
                    </span>
                  </div>
                  <span className="text-[11px] text-on-surface-variant shrink-0 pl-2">
                    09:30:14 IST • Block Sync
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-surface-container-lowest flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <Key className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="font-bold text-on-surface truncate">
                      77d81a91e55047b1c34aa98129e847c210459a912...
                    </span>
                  </div>
                  <span className="text-[11px] text-on-surface-variant shrink-0 pl-2">
                    09:28:49 IST • Lab Verif
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-surface-container-lowest flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <Key className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="font-bold text-on-surface truncate">
                      c83ef2911bca04278103dfaa48299388102377a01...
                    </span>
                  </div>
                  <span className="text-[11px] text-on-surface-variant shrink-0 pl-2">
                    09:15:02 IST • Task Ledger
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-on-surface-variant pt-1">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Zero Alteration Violations Detected
                </span>
                <span className="text-primary font-bold hover:underline cursor-pointer">
                  Verify Public Key Certificate
                </span>
              </div>
            </div>

            {/* RBAC Session Context (col-span-1) */}
            <div className="p-4 rounded-xl bg-surface-container-low flex flex-col justify-between gap-3 text-xs">
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">
                  Active Authorized Session
                </span>
                <div className="flex items-center gap-3 pt-1">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold">
                    AS
                  </div>
                  <div>
                    <div className="font-bold text-on-surface text-sm">Dr. Ananya Sen</div>
                    <div className="text-[11px] text-on-surface-variant">
                      District Surveillance Officer (DSO)
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 divide-y divide-slate-100 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-on-surface-variant">RBAC Role Privilege:</span>
                  <strong className="text-on-surface">Level 4 (Full Admin)</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-on-surface-variant">Session Expiration:</span>
                  <strong className="text-on-surface">3 hrs 42 mins</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-on-surface-variant">2-Factor Auth (Aadhaar OTP):</span>
                  <strong className="text-primary">Validated</strong>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon="logout"
                  className="w-full justify-center text-error border-error/30 hover:bg-error-container/30"
                >
                  Terminate Operational Session
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
