import { useState, useEffect, useMemo } from "react";
import { 
  Check, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  ShieldAlert 
} from "lucide-react";
import { useMeta } from "../hooks/useMeta";
import { Button } from "../components/ui";

interface AssignTaskProps {
  initialAlertId?: number;
  onNavigateBack?: () => void;
  onTaskCreated?: () => void;
  onNavigateToLedger?: () => void;
}

interface AlertData {
  id: number;
  unit_id: string;
  unit_name?: string;
  risk: string;
  confidence: number;
  confidence_label?: string;
  forecast_period: string;
  method_used: string;
}

interface MitaninUser {
  id: number;
  name: string;
  role: string;
  unit_id: string;
  open_tasks?: number;
  availability?: string;
}

const TASK_TEMPLATES = [
  {
    id: "fever_testing",
    label: "Fever Testing Sweep",
    titlePrefix: "Fever screening and rapid diagnostic testing (RDT) sweep",
    defaultInstruction: "Please visit households in {villages} and test febrile cases by {deadline}.",
    steps: [
      "Fever screening and rapid diagnostic test (RDT) sweep across selected hamlets.",
      "Check body temperature and record fever histories in daily register.",
      "Dispense ACT blister packs immediately to test-positive cases.",
    ],
  },
  {
    id: "spraying_support",
    label: "Spraying Support (IRS)",
    titlePrefix: "Indoor residual spraying (IRS) mobilisation and verification",
    defaultInstruction: "Please guide spraying teams across {villages} and check room coverage by {deadline}.",
    steps: [
      "Mobilize households to keep rooms cleared for chemical spraying.",
      "Inspect chemical wall deposit and mark coverage cards.",
      "Record households declining or unavailable during spraying.",
    ],
  },
  {
    id: "screening",
    label: "Maternal & Vulnerable Screening",
    titlePrefix: "High-risk community screening and net verification",
    defaultInstruction: "Please verify bed net usage and screen vulnerable households in {villages} by {deadline}.",
    steps: [
      "Verify Long-Lasting Insecticidal Net (LLIN) condition in all dwellings.",
      "Target pregnant women and infants for preventive screening.",
      "Refer acute symptomatic individuals to the primary health centre.",
    ],
  },
  {
    id: "diarrhoea_ors",
    label: "Diarrhoea & Safe Water Drive",
    titlePrefix: "ORS-Zinc distribution and chlorination verification",
    defaultInstruction: "Distribute ORS-Zinc packets and check drinking water chlorination by {deadline}.",
    steps: [
      "Distribute ORS-Zinc packets to households with pediatric diarrhoea.",
      "Inspect village handpump / well chlorination and record turbidity.",
      "Report persistent dehydration cases to sector ANM immediately.",
    ],
  },
];

export function AssignTask({
  initialAlertId,
  onNavigateBack,
  onTaskCreated,
  onNavigateToLedger,
}: AssignTaskProps) {
  const { meta } = useMeta();

  // Available alerts and selected alert
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<AlertData | null>(null);

  // Mitanin frontline workers
  const [mitanins, setMitanins] = useState<MitaninUser[]>([]);
  const [selectedMitaninId, setSelectedMitaninId] = useState<number | null>(null);

  // Form Fields
  const [selectedTemplate, setSelectedTemplate] = useState<string>("fever_testing");
  const [priorityLevel, setPriorityLevel] = useState<string>("High");
  const [customTitle, setCustomTitle] = useState<string>("");
  const [selectedVillages, setSelectedVillages] = useState<string[]>([
    "Netanar Hamlet #1",
    "Netanar Hamlet #2",
    "Bade Arapur",
  ]);

  // Default deadline: next 5 days
  const defaultDeadline = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [deadlineDate, setDeadlineDate] = useState<string>(defaultDeadline);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Available village list
  const availableVillages = useMemo(
    () => [
      "Netanar Hamlet #1",
      "Netanar Hamlet #2",
      "Bade Arapur",
      "Chitrakote Para",
      "Karanpur Sector",
    ],
    []
  );

  // Fetch alerts for prefill
  useEffect(() => {
    fetch("http://127.0.0.1:8000/alerts")
      .then((res) => res.json())
      .then((data: AlertData[]) => {
        setAlerts(data);
        if (data.length > 0) {
          const matched = initialAlertId
            ? data.find((a) => a.id === initialAlertId) || data[0]
            : data[0];
          setSelectedAlert(matched);
        }
      })
      .catch(() => {});
  }, [initialAlertId]);

  // Fetch Mitanins
  useEffect(() => {
    fetch("http://127.0.0.1:8000/users?role=mitanin")
      .then((res) => res.json())
      .then((data: MitaninUser[]) => {
        if (data.length > 0) {
          setMitanins(data);
          setSelectedMitaninId(data[0].id);
        } else {
          const fallbackUsers: MitaninUser[] = [
            { id: 1, name: "Mitanin Asha [SAMPLE]", role: "mitanin", unit_id: "BLK_A", open_tasks: 1, availability: "Available" },
            { id: 2, name: "Mitanin Rekha [SAMPLE]", role: "mitanin", unit_id: "BLK_A", open_tasks: 3, availability: "Busy" },
            { id: 3, name: "Mitanin Sunita [SAMPLE]", role: "mitanin", unit_id: "BLK_A", open_tasks: 0, availability: "Available" },
          ];
          setMitanins(fallbackUsers);
          setSelectedMitaninId(fallbackUsers[0].id);
        }
      })
      .catch(() => {
        const fallbackUsers: MitaninUser[] = [
          { id: 1, name: "Mitanin Asha [SAMPLE]", role: "mitanin", unit_id: "BLK_A", open_tasks: 1, availability: "Available" },
          { id: 2, name: "Mitanin Rekha [SAMPLE]", role: "mitanin", unit_id: "BLK_A", open_tasks: 3, availability: "Busy" },
          { id: 3, name: "Mitanin Sunita [SAMPLE]", role: "mitanin", unit_id: "BLK_A", open_tasks: 0, availability: "Available" },
        ];
        setMitanins(fallbackUsers);
        setSelectedMitaninId(fallbackUsers[0].id);
      });
  }, []);

  // Active template object
  const activeTemplateObj = useMemo(() => {
    return TASK_TEMPLATES.find((t) => t.id === selectedTemplate) || TASK_TEMPLATES[0];
  }, [selectedTemplate]);

  // Derived task title
  const effectiveTaskTitle = useMemo(() => {
    if (customTitle.trim()) return customTitle;
    const geoLabelCap = meta.geography_label ? meta.geography_label.charAt(0).toUpperCase() + meta.geography_label.slice(1) : "Unit";
    const unitLabel = selectedAlert?.unit_name || (selectedAlert ? `${geoLabelCap} ${selectedAlert.unit_id}` : `Netanar Cluster`);
    return `${activeTemplateObj.titlePrefix} — ${unitLabel}`;
  }, [customTitle, activeTemplateObj, selectedAlert, meta.geography_label]);

  // Village chip toggle
  const toggleVillage = (v: string) => {
    if (selectedVillages.includes(v)) {
      if (selectedVillages.length > 1) {
        setSelectedVillages(selectedVillages.filter((item) => item !== v));
      }
    } else {
      setSelectedVillages([...selectedVillages, v]);
    }
  };

  // Selected Mitanin entity
  const currentMitanin = useMemo(() => {
    return mitanins.find((m) => m.id === selectedMitaninId) || mitanins[0];
  }, [mitanins, selectedMitaninId]);

  // Submit Handler
  const handleSubmitTask = async () => {
    if (!effectiveTaskTitle.trim()) {
      setFormError("Task title is required.");
      return;
    }
    if (!currentMitanin) {
      setFormError("Please select a frontline Mitanin worker.");
      return;
    }
    if (selectedVillages.length === 0) {
      setFormError("Please select at least one target hamlet.");
      return;
    }
    if (!deadlineDate) {
      setFormError("Please specify a deadline date.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const deadlineIso = new Date(`${deadlineDate}T18:00:00Z`).toISOString();
      const stepsToSubmit = [
        ...activeTemplateObj.steps,
        `Cover priority target hamlets: ${selectedVillages.join(", ")}.`,
      ];

      const payload = {
        alert_id: selectedAlert?.id || 1,
        title: effectiveTaskTitle,
        steps: stepsToSubmit,
        owner: currentMitanin.name,
        deadline: deadlineIso,
        priority: priorityLevel,
      };

      const res = await fetch("http://127.0.0.1:8000/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to create task");
      }

      if (onTaskCreated) onTaskCreated();
      if (onNavigateToLedger) {
        onNavigateToLedger();
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to create task");
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-on-surface">
      {/* 1. TOP HEADER & CONTEXT BAR (STITCH EXACT STYLING) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container text-[11px] font-bold uppercase tracking-wider">
              Protocol Dispatch Level 1
            </span>
            <span className="text-xs text-on-surface-variant font-medium">
              • ID: DSP-2024-{(selectedAlert?.id || 1) + 1100}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-on-surface tracking-tight">
            Dispatch Field Health Task • New Intervention Assignment
          </h1>
          <p className="text-xs text-on-surface-variant">
            Frontline Epidemiological Outbreak Mitigation & Worker Workload Allocation
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onNavigateBack && (
            <Button variant="outline" size="md" icon="arrow_back" onClick={onNavigateBack}>
              Return to Alerts
            </Button>
          )}
          {onNavigateToLedger && (
            <Button variant="secondary" size="md" icon="menu_book" onClick={onNavigateToLedger}>
              Task Ledger
            </Button>
          )}
        </div>
      </div>

      {/* 2. SOURCE INCIDENT AUTO-FILL ALERT BANNER */}
      {selectedAlert && (
        <div className="relative overflow-hidden rounded-xl bg-surface-container-low border border-slate-200/90 shadow-2xs p-4 sm:p-5">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-error"></div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pl-2">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-error-container text-on-error-container flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-error" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-error uppercase tracking-wider">
                    Automated Surveillance Trigger
                  </span>
                  <span className="text-[11px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                    #ALT-{selectedAlert.id} • {selectedAlert.risk} Risk
                  </span>
                </div>
                <h3 className="text-sm font-bold text-on-surface">
                  Source Alert: {selectedAlert.unit_name || selectedAlert.unit_id} ({selectedAlert.forecast_period || "Forecast Window"})
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Attribution: {selectedAlert.method_used === "weather_model" ? "Weather Model Surge Projection" : "Seasonal Baseline Endemic Threshold"}
                </p>
              </div>
            </div>

            {alerts.length > 1 && (
              <div className="flex items-center gap-2 shrink-0">
                <label className="text-xs font-bold text-on-surface-variant">Switch Alert:</label>
                <select
                  value={selectedAlert.id}
                  onChange={(e) => {
                    const found = alerts.find((a) => a.id === Number(e.target.value));
                    if (found) setSelectedAlert(found);
                  }}
                  className="text-xs bg-surface-container-lowest border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-on-surface focus:outline-none focus:border-primary"
                >
                  {alerts.map((a) => (
                    <option key={a.id} value={a.id}>
                      #ALT-{a.id}: {a.unit_name || a.unit_id} ({a.risk})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Form Error Banner */}
      {formError && (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container border border-error/25 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* 3. MAIN 12-COLUMN DISPATCH LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT 8 COLUMNS: DISPATCH FORM SECTIONS */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* Section 1: Classification & Title */}
          <section className="bg-surface-container-lowest rounded-xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <h2 className="text-base font-bold text-on-surface">
                  Task Classification & Priority Level
                </h2>
              </div>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                Step 1 of 4
              </span>
            </div>

            <div className="space-y-3.5">
              {/* Template Selector */}
              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5">
                  Intervention Protocol Template
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TASK_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => setSelectedTemplate(tmpl.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedTemplate === tmpl.id
                          ? "bg-primary/5 border-primary shadow-2xs ring-1 ring-primary/20"
                          : "bg-surface-container-low border-slate-200 hover:bg-surface-container"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-on-surface">{tmpl.label}</span>
                        {selectedTemplate === tmpl.id && (
                          <span className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-[11px] text-on-surface-variant line-clamp-1 mt-0.5">
                        {tmpl.titlePrefix}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority Radio Matrix */}
              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5">
                  Triage Priority Level
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {["Critical", "High", "Medium", "Routine"].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setPriorityLevel(lvl)}
                      className={`h-10 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${
                        priorityLevel === lvl
                          ? lvl === "Critical"
                            ? "bg-error-container text-on-error-container shadow-2xs font-extrabold"
                            : lvl === "High"
                            ? "bg-amber-100 text-amber-900 shadow-2xs font-extrabold"
                            : "bg-primary text-on-primary shadow-2xs font-extrabold"
                          : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Task Title Input */}
              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">
                  Intervention Directive Title
                </label>
                <input
                  type="text"
                  value={customTitle || effectiveTaskTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-on-surface bg-surface-container-low focus:bg-surface-container-lowest focus:border-primary focus:outline-none"
                  placeholder="Enter directive title..."
                />
              </div>
            </div>
          </section>

          {/* Section 2: Geographic Jurisdiction & Hamlets */}
          <section className="bg-surface-container-lowest rounded-xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <h2 className="text-base font-bold text-on-surface">
                  Geographic Jurisdiction & Target Hamlets
                </h2>
              </div>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                Step 2 of 4
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-surface-container-low p-3 rounded-xl border border-slate-200/70 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-on-surface-variant">District</span>
                <p className="font-bold text-on-surface">Bastar</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-on-surface-variant">Block</span>
                <p className="font-bold text-on-surface">Tokapal</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-on-surface-variant">Sub-Center HQ</span>
                <p className="font-bold text-primary">Netanar Sector</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-2">
                Targeted Paras / Village Hamlets ({selectedVillages.length} Selected)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {availableVillages.map((v) => {
                  const isChecked = selectedVillages.includes(v);
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => toggleVillage(v)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        isChecked
                          ? "bg-primary text-on-primary shadow-2xs"
                          : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{v}</span>
                      {isChecked && <Check className="w-3 h-3 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Section 3: Worker Roster & SLA Deadline */}
          <section className="bg-surface-container-lowest rounded-xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <h2 className="text-base font-bold text-on-surface">
                  Frontline Mitanin Worker Assignment & Deadline
                </h2>
              </div>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                Step 3 of 4
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Mitanin Selection */}
              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5">
                  Select Frontline Health Worker
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {mitanins.map((m) => {
                    const isSelected = m.id === selectedMitaninId;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMitaninId(m.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? "bg-primary/5 border-primary ring-1 ring-primary/20 shadow-2xs"
                            : "bg-surface-container-low border-slate-200 hover:bg-surface-container"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold text-xs">
                            {m.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-on-surface leading-tight">{m.name}</p>
                            <p className="text-[11px] text-on-surface-variant">
                              {m.open_tasks || 0} active task(s) • {m.availability || "On Duty"}
                            </p>
                          </div>
                        </div>
                        {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Target Window & Deadline */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5">
                    Target Completion Date
                  </label>
                  <input
                    type="date"
                    value={deadlineDate}
                    onChange={(e) => setDeadlineDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-on-surface bg-surface-container-low focus:bg-surface-container-lowest focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    <span>SLA Escalation Window: {meta.escalation_hours || 48} Hours</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    If this task is not acknowledged or completed within {meta.escalation_hours || 48} hours, the system automatically escalates the alert to the Block Medical Officer.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Protocol Instructions */}
          <section className="bg-surface-container-lowest rounded-xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  4
                </div>
                <h2 className="text-base font-bold text-on-surface">
                  Standard Operating Protocol Steps
                </h2>
              </div>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                Step 4 of 4
              </span>
            </div>

            <div className="space-y-2">
              {activeTemplateObj.steps.map((st, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg bg-surface-container-low border border-slate-200/70 text-xs"
                >
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="text-on-surface font-medium leading-relaxed">{st}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              {onNavigateBack && (
                <Button variant="outline" size="md" onClick={onNavigateBack}>
                  Cancel
                </Button>
              )}
              <Button
                variant="primary"
                size="md"
                icon="send"
                loading={submitting}
                onClick={handleSubmitTask}
              >
                Dispatch Field Task
              </Button>
            </div>
          </section>
        </div>

        {/* RIGHT 4 COLUMNS: DISPATCH SUMMARY & MOBILE PREVIEW */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Dispatch Summary Card */}
          <div className="bg-surface-container-lowest rounded-xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">
                Dispatch Summary Dossier
              </h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-on-surface-variant font-medium">Directive Priority</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  priorityLevel === "Critical"
                    ? "bg-error-container text-on-error-container"
                    : priorityLevel === "High"
                    ? "bg-amber-100 text-amber-900"
                    : "bg-primary/10 text-primary"
                }`}>
                  {priorityLevel}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-on-surface-variant font-medium">Assigned Worker</span>
                <span className="font-bold text-on-surface">{currentMitanin?.name}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-on-surface-variant font-medium">Target Deadline</span>
                <span className="font-bold text-on-surface">{deadlineDate || "Routine"}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-on-surface-variant font-medium">Target Hamlets</span>
                <span className="font-bold text-primary">{selectedVillages.length} Paras</span>
              </div>
            </div>

            <div className="p-3 bg-surface-container-low rounded-xl border border-slate-200 text-xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-on-surface-variant">Live Mobile Directive</span>
              <p className="font-bold text-on-surface leading-snug">{effectiveTaskTitle}</p>
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              icon="send"
              loading={submitting}
              onClick={handleSubmitTask}
            >
              Dispatch Task Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}