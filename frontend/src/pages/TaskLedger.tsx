import { useState, useEffect, useMemo } from "react";
import { 
  Clock, 
  XCircle, 
  Search 
} from "lucide-react";
import { Button } from "../components/ui";

interface TaskLedgerProps {
  onRefreshNeeded?: () => void;
}

interface TaskEventItem {
  id: number;
  task_id: number;
  event: string;
  actor: string;
  timestamp: string;
  notes?: string;
}

interface TaskItem {
  id: number;
  alert_id?: number;
  title: string;
  steps: string[];
  owner: string;
  deadline: string;
  status: "sent" | "acknowledged" | "in_progress" | "done" | "needs_help" | "escalated";
  created_at: string;
  updated_at: string;
  completion_notes?: string;
  unit_id?: string;
  unit_name?: string;
  hours_left?: number | null;
  is_overdue?: boolean;
  clean_owner?: string;
  priority?: string;
  events?: TaskEventItem[];
}

export function TaskLedger({ onRefreshNeeded }: TaskLedgerProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<TaskItem | null>(null);
  const [clockDisplay, setClockDisplay] = useState<string>("Wed 14 Oct, 09:01");
  const [clockAdvancing, setClockAdvancing] = useState<boolean>(false);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("");

  // Reassignment / deadline / status edit drawer state
  const [showReassignForm, setShowReassignForm] = useState<boolean>(false);
  const [editOwner, setEditOwner] = useState<string>("");
  const [editStatus, setEditStatus] = useState<string>("acknowledged");
  const [editDeadline, setEditDeadline] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [savingUpdate, setSavingUpdate] = useState<boolean>(false);

  // Format simulated clock into display string
  const formatClockDisplay = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return "Wed 14 Oct, 09:01";
    }
  };

  // Fetch simulated clock
  const fetchClock = () => {
    fetch("http://127.0.0.1:8000/clock")
      .then((res) => res.json())
      .then((data) => {
        if (data.current_time) {
          setClockDisplay(formatClockDisplay(data.current_time));
        }
      })
      .catch(() => {});
  };

  // Fetch tasks list
  const fetchTasks = () => {
    fetch("http://127.0.0.1:8000/tasks")
      .then((res) => res.json())
      .then((data: TaskItem[]) => {
        setTasks(data);
        if (data.length > 0) {
          setSelectedTaskId((prev) => (prev && data.some((t) => t.id === prev) ? prev : data[0].id));
        }
      })
      .catch(() => {});
  };

  // Fetch detail & event history of selected task
  const fetchTaskDetail = (taskId: number) => {
    fetch(`http://127.0.0.1:8000/tasks/${taskId}`)
      .then((res) => res.json())
      .then((data: TaskItem) => {
        setSelectedTaskDetail(data);
        setEditOwner(data.owner || "");
        setEditStatus(data.status || "acknowledged");
        setEditDeadline(data.deadline ? data.deadline.slice(0, 16) : "");
        setEditNotes(data.completion_notes || "");
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchClock();
    fetchTasks();
  }, []);

  useEffect(() => {
    if (selectedTaskId) {
      fetchTaskDetail(selectedTaskId);
    }
  }, [selectedTaskId]);

  // Handle simulated clock advance
  const handleAdvanceClock = async (hours: number) => {
    setClockAdvancing(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/clock/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.current_time) {
          setClockDisplay(formatClockDisplay(data.current_time));
        }
        fetchTasks();
        if (selectedTaskId) fetchTaskDetail(selectedTaskId);
        if (onRefreshNeeded) onRefreshNeeded();
      }
    } catch {} finally {
      setClockAdvancing(false);
    }
  };

  // Reset clock handler
  const handleResetClock = async () => {
    setClockAdvancing(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/clock/reset", {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.reset_time) {
          setClockDisplay(formatClockDisplay(data.reset_time));
        }
        fetchTasks();
        if (selectedTaskId) fetchTaskDetail(selectedTaskId);
        if (onRefreshNeeded) onRefreshNeeded();
      }
    } catch {} finally {
      setClockAdvancing(false);
    }
  };

  // Handle saving task updates (reassignment, deadline, status)
  const handleSaveTaskUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId) return;
    setSavingUpdate(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/tasks/${selectedTaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: editOwner.trim() || undefined,
          status: editStatus,
          deadline: editDeadline ? new Date(editDeadline).toISOString() : undefined,
          notes: editNotes.trim() || undefined,
        }),
      });
      if (res.ok) {
        setShowReassignForm(false);
        fetchTasks();
        fetchTaskDetail(selectedTaskId);
        if (onRefreshNeeded) onRefreshNeeded();
      }
    } catch {} finally {
      setSavingUpdate(false);
    }
  };

  // Export CSV of task ledger
  const handleExportCsv = () => {
    const csvRows = [
      ["Task ID", "Alert ID", "Title", "Owner", "Status", "Deadline", "Created At"],
      ...tasks.map((t) => [
        t.id,
        t.alert_id || "",
        `"${(t.title || "").replace(/"/g, '""')}"`,
        `"${(t.owner || "").replace(/"/g, '""')}"`,
        t.status,
        t.deadline || "",
        t.created_at || "",
      ]),
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Mitanin_Signal_Task_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (ownerFilter.trim() && !(t.owner || "").toLowerCase().includes(ownerFilter.trim().toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [tasks, statusFilter, ownerFilter]);

  // Summary Metrics calculations
  const totalTasks = tasks.length;
  const verifiedClosed = tasks.filter((t) => t.status === "done").length;
  const closedRatePct = totalTasks ? Math.round((verifiedClosed / totalTasks) * 100) : 0;
  const pendingCount = tasks.filter((t) => t.status === "sent" || t.status === "acknowledged" || t.status === "in_progress").length;
  const overdueCount = tasks.filter((t) => t.status === "escalated" || t.is_overdue).length;

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "done":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">Verified & Closed</span>;
      case "escalated":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-error-container text-on-error-container border border-error/20">Overdue / Escalated</span>;
      case "needs_help":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">Needs Support</span>;
      case "in_progress":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-secondary-container text-on-secondary-fixed border border-secondary/20">In Progress</span>;
      case "acknowledged":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-fixed/80 text-on-primary-fixed-variant border border-primary-fixed-dim">Acknowledged</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-surface-container text-on-surface-variant border border-slate-200">Dispatched (Sent)</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-on-surface">
      {/* 1. TOP CONTEXT & STATUTORY NOTICE (STITCH EXACT STYLING) */}
      <section className="bg-surface-container-low p-5 sm:p-6 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-primary text-on-primary font-bold text-[10px] uppercase tracking-wider">
              Statutory Register
            </span>
            <span className="text-xs text-on-surface-variant font-semibold">
              • CG-DHS Bastar District Public Health Surveillance Cell
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            District Task Ledger & Compliance Register
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant max-w-3xl leading-relaxed">
            Cryptographically logged audit trail of frontline Mitanin epidemiological surveys, emergency containment activities, and community fever sweeps across Tokapal & Bastar sub-centers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="md"
            icon="sim_card_download"
            onClick={handleExportCsv}
          >
            CSV Data Dump
          </Button>
          <Button
            variant="primary"
            size="md"
            icon="verified_user"
            onClick={handleExportCsv}
          >
            Export Signed Audit
          </Button>
        </div>
      </section>

      {/* 2. AUDIT SUMMARY METRICS (4 CARDS FROM STITCH) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
              Total Recorded Tasks
            </span>
            <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">fact_check</span>
            </div>
          </div>
          <div className="my-2">
            <div className="text-3xl font-extrabold text-on-surface tabular-nums">{totalTasks}</div>
            <p className="text-xs text-primary font-semibold mt-0.5">Bastar Surveillance Blocks</p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-on-surface-variant">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span>Includes active village hamlets</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
              Verified & Closed
            </span>
            <div className="w-8 h-8 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
            </div>
          </div>
          <div className="my-2">
            <div className="text-3xl font-extrabold text-primary tabular-nums">{verifiedClosed}</div>
            <div className="w-full bg-surface-container h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all"
                style={{ width: `${closedRatePct}%` }}
              />
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-on-surface-variant">
            <span>SLA Completion Rate</span>
            <span className="font-bold text-primary">{closedRatePct}%</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
              Pending Verification
            </span>
            <div className="w-8 h-8 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">pending_actions</span>
            </div>
          </div>
          <div className="my-2">
            <div className="text-3xl font-extrabold text-on-surface tabular-nums">{pendingCount}</div>
            <p className="text-xs text-on-surface-variant mt-0.5">Awaiting Supervisor Audit</p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-on-surface-variant">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            <span>Avg turnaround: &lt;48 hours</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
              Overdue Audit
            </span>
            <div className="w-8 h-8 rounded-full bg-error-container text-on-error-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">warning</span>
            </div>
          </div>
          <div className="my-2">
            <div className="text-3xl font-extrabold text-error tabular-nums">{overdueCount}</div>
            <p className="text-xs text-error font-semibold mt-0.5">&gt;48 hrs SLA lapse</p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-error font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping" />
            <span>Requires Escalation Flag</span>
          </div>
        </div>
      </section>

      {/* 3. SIMULATED TIME TRAVEL CONTROLLER STRIP */}
      <section className="bg-surface-container-lowest rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
              Simulated Field Clock (SLA Engine)
            </div>
            <div className="text-base font-extrabold text-on-surface font-mono">
              {clockDisplay}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-on-surface-variant font-medium mr-1">Fast-Forward SLA:</span>
          <Button
            variant="outline"
            size="sm"
            icon="fast_forward"
            loading={clockAdvancing}
            onClick={() => handleAdvanceClock(6)}
          >
            +6 Hours
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon="fast_forward"
            loading={clockAdvancing}
            onClick={() => handleAdvanceClock(24)}
          >
            +24 Hours
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon="fast_forward"
            loading={clockAdvancing}
            onClick={() => handleAdvanceClock(48)}
          >
            +48 Hours
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon="restart_alt"
            onClick={handleResetClock}
          >
            Reset
          </Button>
        </div>
      </section>

      {/* 4. COMPREHENSIVE FILTER STRIP & SEARCH */}
      <section className="bg-surface-container-lowest rounded-xl p-4 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-on-surface-variant absolute left-3 top-2.5" />
            <input
              type="text"
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              placeholder="Search frontline worker or task..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-xs font-medium text-on-surface bg-surface-container-low focus:bg-surface-container-lowest focus:border-primary focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-on-surface bg-surface-container-low focus:bg-surface-container-lowest focus:border-primary focus:outline-none"
          >
            <option value="all">All Statuses ({tasks.length})</option>
            <option value="sent">Dispatched / Sent</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="in_progress">In Progress</option>
            <option value="needs_help">Needs Help</option>
            <option value="done">Completed & Verified</option>
            <option value="escalated">Escalated / Overdue</option>
          </select>
        </div>

        <span className="text-xs text-on-surface-variant font-medium">
          Showing <strong>{filteredTasks.length}</strong> of {tasks.length} tasks
        </span>
      </section>

      {/* 5. MAIN TASK LEDGER TABLE & AUDIT DRAWER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Ledger Table (8 Cols or 12 if no selection) */}
        <div className={`${selectedTaskId ? "lg:col-span-8" : "lg:col-span-12"} bg-surface-container-lowest rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 bg-surface-container-low/70 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  <th className="py-3 px-4">Task ID</th>
                  <th className="py-3 px-3">Intervention Directive</th>
                  <th className="py-3 px-3">Assigned Frontline Unit</th>
                  <th className="py-3 px-3">Target Window</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                      No tasks match current criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t) => {
                    const isSelected = t.id === selectedTaskId;
                    return (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTaskId(t.id)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-primary-fixed/20 font-medium"
                            : "hover:bg-surface-container-low/50"
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-primary">
                          #{t.id}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-bold text-on-surface block leading-tight">
                            {t.title}
                          </span>
                          <span className="text-[10px] text-on-surface-variant">
                            {t.steps ? `${t.steps.length} protocol steps` : "Standard directive"}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold text-[10px]">
                              {t.owner ? t.owner.slice(0, 2).toUpperCase() : "CH"}
                            </div>
                            <span className="font-medium text-on-surface">{t.owner}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-on-surface-variant font-medium">
                          {t.deadline ? new Date(t.deadline).toLocaleDateString() : "Routine"}
                        </td>
                        <td className="py-3.5 px-3">{getStatusBadge(t.status)}</td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            className="p-1 text-primary hover:bg-surface-container rounded-lg font-bold"
                          >
                            <span className="material-symbols-outlined text-[18px]">read_more</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Task Audit Detail & Event Log Drawer (4 Cols) */}
        {selectedTaskId && selectedTaskDetail && (
          <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <span className="font-mono text-xs font-bold text-primary">
                  Task #{selectedTaskDetail.id} Audit Dossier
                </span>
                <h3 className="text-sm font-bold text-on-surface leading-tight mt-0.5">
                  {selectedTaskDetail.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTaskId(null)}
                className="p-1 text-on-surface-variant hover:bg-surface-container rounded-lg"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-on-surface-variant">Frontline Worker</span>
                <span className="font-bold text-on-surface">{selectedTaskDetail.owner}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-on-surface-variant">Current Status</span>
                <span>{getStatusBadge(selectedTaskDetail.status)}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-on-surface-variant">Target Deadline</span>
                <span className="font-bold text-on-surface">
                  {selectedTaskDetail.deadline ? new Date(selectedTaskDetail.deadline).toLocaleDateString() : "Routine"}
                </span>
              </div>
            </div>

            {/* Protocol Steps */}
            <div>
              <span className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1.5">
                Clinical Protocol Directives
              </span>
              <div className="space-y-1.5">
                {(selectedTaskDetail.steps || []).map((step, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-surface-container-low text-[11px] text-on-surface flex items-start gap-2">
                    <span className="font-bold text-primary">{idx + 1}.</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Audit History Timeline (Events from Backend) */}
            <div>
              <span className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1.5">
                Cryptographic Audit Log
              </span>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {(selectedTaskDetail.events && selectedTaskDetail.events.length > 0) ? (
                  selectedTaskDetail.events.map((ev) => (
                    <div key={ev.id} className="p-2 rounded-lg bg-surface-container-low border border-slate-200/60 text-[11px] space-y-0.5">
                      <div className="flex items-center justify-between text-on-surface font-semibold">
                        <span className="capitalize text-primary font-bold">{ev.event.replace("_", " ")}</span>
                        <span className="text-[10px] text-on-surface-variant">
                          {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-on-surface-variant">By: {ev.actor}</div>
                      {ev.notes && <div className="text-on-surface text-[10px] italic">“{ev.notes}”</div>}
                    </div>
                  ))
                ) : (
                  <div className="text-[11px] text-on-surface-variant p-2 bg-surface-container-low rounded-lg">
                    Task dispatched. Awaiting frontline acknowledgement event.
                  </div>
                )}
              </div>
            </div>

            {/* In-Place Reassignment & Status Edit Form */}
            {!showReassignForm ? (
              <Button
                variant="outline"
                size="sm"
                fullWidth
                icon="edit"
                onClick={() => setShowReassignForm(true)}
              >
                Modify / Reassign Task
              </Button>
            ) : (
              <form onSubmit={handleSaveTaskUpdate} className="p-3 rounded-xl bg-surface-container-low border border-slate-200 space-y-2.5 text-xs">
                <div className="font-bold text-on-surface text-xs pb-1 border-b border-slate-200">
                  Update Task #{selectedTaskId}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-0.5">Reassign Owner</label>
                  <input
                    type="text"
                    value={editOwner}
                    onChange={(e) => setEditOwner(e.target.value)}
                    className="w-full h-8 px-2 rounded border border-slate-200 text-xs bg-surface-container-lowest"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-0.5">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full h-8 px-2 rounded border border-slate-200 text-xs bg-surface-container-lowest"
                  >
                    <option value="sent">Dispatched (Sent)</option>
                    <option value="acknowledged">Acknowledged</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Completed & Verified</option>
                    <option value="needs_help">Needs Help</option>
                    <option value="escalated">Escalated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-0.5">Audit Note</label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Reason for modification..."
                    className="w-full h-8 px-2 rounded border border-slate-200 text-xs bg-surface-container-lowest"
                  />
                </div>
                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowReassignForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={savingUpdate}
                  >
                    Save
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
