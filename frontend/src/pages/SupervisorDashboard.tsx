import { useState, useEffect } from "react";
import {
  Users,
  FileCheck,
  Search,
  Edit3,
  XCircle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import type { SelectedLocationState } from "../components/LocationSelectorModal";
import { Badge, Button, LoadingState, ErrorState, EmptyState } from "../components/ui";

interface SupervisorDashboardProps {
  activeView: "sup-dashboard" | "team-tasks";
  authToken: string;
  selectedLocation: SelectedLocationState;
  onChangeLocation: () => void;
  onSwitchView: (view: string) => void;
  onDataUpdated?: () => void;
  onSelectDiseaseDetail?: (diseaseType: string) => void;
}

export function SupervisorDashboard({
  activeView,
  authToken,
  selectedLocation,
  onChangeLocation,
  onSwitchView,
  onDataUpdated,
  onSelectDiseaseDetail,
}: SupervisorDashboardProps) {
  const [dashData, setDashData] = useState<any | null>(null);
  const [teamTasks, setTeamTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Map Layer Toggles for Interactive GIS
  const [mapLayer, setMapLayer] = useState<"rdt" | "radar" | "patrol">("rdt");
  const [selectedCluster, setSelectedCluster] = useState<any | null>(null);

  // Team Tasks Filters
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [blockFilter, setBlockFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [dueFilter, setDueFilter] = useState<string>("all");
  const [diseaseFilter, setDiseaseFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Alert Filter
  const [alertDiseaseFilter, setAlertDiseaseFilter] = useState<string>("all");

  // Assign New Task Modal State
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [newTaskDiseaseType, setNewTaskDiseaseType] = useState<string>("malaria");
  const [newTaskTitle, setNewTaskTitle] = useState<string>("");
  const [newTaskDescription, setNewTaskDescription] = useState<string>("");
  const [newTaskInstructions, setNewTaskInstructions] = useState<string>("");
  const [newTaskOwnerId, setNewTaskOwnerId] = useState<string>("");
  const [newTaskPriority, setNewTaskPriority] = useState<string>("High");
  const [newTaskDeadline, setNewTaskDeadline] = useState<string>("");
  const [assigning, setAssigning] = useState<boolean>(false);

  // Edit Task Priority / Deadline Modal State
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [editPriority, setEditPriority] = useState<string>("High");
  const [editStatus, setEditStatus] = useState<string>("sent");
  const [editDeadline, setEditDeadline] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [updatingTask, setUpdatingTask] = useState<boolean>(false);

  // Review Field Report Modal State
  const [reviewingReport, setReviewingReport] = useState<any | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"approved" | "rejected" | "corrections_requested">("approved");
  const [reviewNotes, setReviewNotes] = useState<string>("");
  const [reviewSubmitting, setReviewSubmitting] = useState<boolean>(false);

  const headers = {
    Authorization: `Bearer ${authToken}`,
    "Content-Type": "application/json",
  };

  const fetchDashboard = () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      district_id: selectedLocation.district_id,
      block_id: selectedLocation.block_id,
    });
    if (selectedLocation.village_id) {
      params.set("village_id", selectedLocation.village_id);
    }

    fetch(`http://127.0.0.1:8000/supervisor/dashboard?${params.toString()}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || "Failed to load supervisor dashboard");
        }
        return res.json();
      })
      .then((json) => {
        setDashData(json);
        if (json.employees && json.employees.length > 0 && !newTaskOwnerId) {
          setNewTaskOwnerId(String(json.employees[0].id));
        }
        // Set default selected cluster
        if (json.high_risk_locations && json.high_risk_locations.length > 0) {
          setSelectedCluster(json.high_risk_locations[0]);
        }
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  };

  const fetchTeamTasks = () => {
    const params = new URLSearchParams();
    if (employeeFilter !== "all") params.set("employee", employeeFilter);
    if (blockFilter !== "all") params.set("block_id", blockFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (priorityFilter !== "all") params.set("priority", priorityFilter);
    if (dueFilter !== "all") params.set("due_filter", dueFilter);
    if (diseaseFilter !== "all") params.set("disease_type", diseaseFilter);
    if (searchQuery.trim()) params.set("search", searchQuery.trim());

    fetch(`http://127.0.0.1:8000/supervisor/team-tasks?${params.toString()}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => setTeamTasks(list))
      .catch(() => {});
  };

  useEffect(() => {
    fetchDashboard();
  }, [authToken, selectedLocation.district_id, selectedLocation.block_id, selectedLocation.village_id]);

  useEffect(() => {
    fetchTeamTasks();
  }, [authToken, employeeFilter, blockFilter, statusFilter, priorityFilter, dueFilter, diseaseFilter, searchQuery, dashData]);

  const handleAlertStatusUpdate = async (
    alertId: number,
    nextStatus: "acknowledged" | "resolved"
  ) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/alerts/${alertId}/status`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          status: nextStatus,
          notes:
            nextStatus === "acknowledged"
              ? "Acknowledged by Supervisor for field follow-up."
              : "Resolved by Supervisor after field action verification.",
        }),
      });
      if (res.ok) {
        fetchDashboard();
        if (onDataUpdated) onDataUpdated();
      }
    } catch {}
  };

  const handleAssignNewTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setAssigning(true);
    try {
      const emps: any[] = dashData?.employees || [];
      const chosenEmp = emps.find((em) => String(em.id) === newTaskOwnerId) || emps[0];
      const res = await fetch("http://127.0.0.1:8000/supervisor/tasks", {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          disease_type: newTaskDiseaseType,
          description: newTaskDescription.trim() || newTaskTitle.trim(),
          instructions: newTaskInstructions.trim() || "Perform household RDT fever check and report results.",
          steps: [newTaskInstructions.trim() || "Perform household RDT fever check and report results."],
          owner: chosenEmp ? chosenEmp.name : "Mitanin Asha [SAMPLE]",
          owner_id: chosenEmp ? chosenEmp.id : undefined,
          priority: newTaskPriority,
          district_id: selectedLocation.district_id,
          block_id: chosenEmp?.block_id || selectedLocation.block_id,
          village_id: chosenEmp?.village_id || selectedLocation.village_id,
          deadline: newTaskDeadline ? new Date(newTaskDeadline).toISOString() : undefined,
        }),
      });
      if (res.ok) {
        setShowAssignModal(false);
        setNewTaskTitle("");
        setNewTaskDescription("");
        setNewTaskInstructions("");
        fetchDashboard();
        fetchTeamTasks();
        if (onDataUpdated) onDataUpdated();
      }
    } finally {
      setAssigning(false);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    setUpdatingTask(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/supervisor/tasks/${editingTask.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          priority: editPriority,
          status: editStatus,
          deadline: editDeadline ? new Date(editDeadline).toISOString() : undefined,
          notes: editNotes.trim() || undefined,
        }),
      });
      if (res.ok) {
        setEditingTask(null);
        setEditNotes("");
        fetchDashboard();
        fetchTeamTasks();
        if (onDataUpdated) onDataUpdated();
      }
    } finally {
      setUpdatingTask(false);
    }
  };

  const handleReviewReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingReport || !reviewNotes.trim()) return;
    setReviewSubmitting(true);
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/supervisor/reports/${reviewingReport.id}/review`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            review_status: reviewDecision,
            review_notes: reviewNotes.trim(),
          }),
        }
      );
      if (res.ok) {
        setReviewingReport(null);
        setReviewNotes("");
        fetchDashboard();
      }
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Helper trigger to deploy Rapid Response Team (prefills assign task modal)
  const triggerRrtModal = (prefillCluster?: string) => {
    setNewTaskTitle(prefillCluster ? `RRT Emergency Sweep — ${prefillCluster}` : "RRT Emergency Rapid Fever Sweep");
    setNewTaskPriority("Critical");
    setNewTaskDiseaseType("malaria");
    setNewTaskDescription("Immediate Rapid Response Team deployment for outbreak containment.");
    setNewTaskInstructions("Conduct 100% household RDT testing sweep, verify chloroquine/ACT stocks, and inspect check dam larvicide levels.");
    setShowAssignModal(true);
  };

  if (loading && !dashData) {
    return (
      <div className="p-6 sm:p-10 max-w-7xl mx-auto">
        <LoadingState
          message="Loading Supervisor Operations Dashboard..."
          subMessage="Fetching epidemiological telemetry, CHW team roster, and field dispatch ledger"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 sm:p-10 max-w-4xl mx-auto">
        <ErrorState
          title="Supervisor Dashboard Error"
          message={error}
          onRetry={fetchDashboard}
        />
      </div>
    );
  }

  const sup = dashData?.supervisor || {};
  const allowedBlocks: string[] = dashData?.authorized_block_ids || [];
  const risk = dashData?.risk || {};
  const employees: any[] = dashData?.employees || [];
  const taskSummary = dashData?.task_summary || {};
  const reports: any[] = dashData?.reports || [];
  const highRiskLocations: any[] = dashData?.high_risk_locations || [];

  const getStatusBadge = (t: any) => {
    const st = t.status;
    if (st === "done" || st === "completed") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
          <CheckCircle2 className="w-3 h-3" />
          Completed
        </span>
      );
    }
    if (st === "cancelled") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
          Cancelled
        </span>
      );
    }
    if (t.is_overdue || st === "escalated") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-error-container text-on-error-container border border-error/20">
          <Clock className="w-3 h-3 text-error" />
          Overdue / Escalated
        </span>
      );
    }
    if (st === "needs_help") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
          Needs Help
        </span>
      );
    }
    if (st === "in_progress" || st === "acknowledged") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-secondary-container text-on-secondary-fixed border border-secondary/20">
          In Progress
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
        Pending
      </span>
    );
  };

  const getDiseaseBadge = (diseaseType?: string, diseaseLabel?: string) => {
    const dt = (diseaseType || "malaria").toLowerCase();
    const label =
      diseaseLabel ||
      (dt === "dengue"
        ? "Dengue"
        : dt === "diarrhoea"
        ? "Diarrhoeal Disease"
        : dt === "heat"
        ? "Heat-Related Health Risk"
        : "Malaria");
    const colorCls =
      dt === "dengue"
        ? "bg-purple-50 text-purple-800 border-purple-200"
        : dt === "diarrhoea"
        ? "bg-teal-50 text-teal-800 border-teal-200"
        : dt === "heat"
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : "bg-red-50 text-red-800 border-red-200";
    return (
      <span
        onClick={(e) => {
          if (onSelectDiseaseDetail) {
            e.stopPropagation();
            onSelectDiseaseDetail(dt);
          }
        }}
        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide border uppercase cursor-pointer hover:opacity-80 transition-opacity ${colorCls}`}
      >
        {label}
      </span>
    );
  };

  // =========================================================================
  // SHARED MODALS (Assign Task, Edit Task, Review Report)
  // =========================================================================
  const modals = (
    <>
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[20px]">assignment_add</span>
                </div>
                <h3 className="text-base font-bold text-on-surface">
                  Assign Immediate Field Task
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignNewTask} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">
                    Frontline Worker (In Jurisdiction)
                  </label>
                  <select
                    value={newTaskOwnerId}
                    onChange={(e) => setNewTaskOwnerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-on-surface bg-surface-container-lowest focus:border-primary focus:outline-none"
                  >
                    {employees.map((em) => (
                      <option key={em.id} value={em.id}>
                        {em.name} ({em.block_id} · {em.village_id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">
                    Disease / Health Risk
                  </label>
                  <select
                    aria-label="Assign Task Disease or Health Risk"
                    value={newTaskDiseaseType}
                    onChange={(e) => setNewTaskDiseaseType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-on-surface bg-surface-container-lowest focus:border-primary focus:outline-none"
                  >
                    <option value="malaria">Malaria (Falciparum / Vivax)</option>
                    <option value="dengue">Dengue (Vector Surveillance)</option>
                    <option value="diarrhoea">Diarrhoeal Disease / Water</option>
                    <option value="heat">Heat-Related Health Risk</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g., Door-to-door fever RDT screening in Sector 4"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-on-surface bg-surface-container-lowest focus:border-primary focus:outline-none"
                  >
                    <option value="Critical">Critical (Immediate SLA)</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">
                    Deadline (Optional)
                  </label>
                  <input
                    type="date"
                    value={newTaskDeadline}
                    onChange={(e) => setNewTaskDeadline(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-on-surface focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">
                  Field Instructions
                </label>
                <textarea
                  rows={2}
                  value={newTaskInstructions}
                  onChange={(e) => setNewTaskInstructions(e.target.value)}
                  placeholder="Specify target households, RDT rapid test protocols, and larval checks..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAssignModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={assigning}
                  icon="send"
                >
                  Dispatch Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingTask && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-on-surface">
                  Update Task #{editingTask.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTask} className="space-y-3.5">
              <div className="text-xs font-semibold text-on-surface bg-surface-container-low p-2.5 rounded-lg">
                {editingTask.title}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-on-surface bg-surface-container-lowest focus:border-primary focus:outline-none"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-on-surface bg-surface-container-lowest focus:border-primary focus:outline-none"
                  >
                    <option value="sent">Pending (Sent)</option>
                    <option value="acknowledged">Acknowledged</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Completed</option>
                    <option value="escalated">Escalated</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">
                  Adjust Deadline (Optional)
                </label>
                <input
                  type="date"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">
                  Supervisor Audit Note
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Reason for priority or status adjustment..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingTask(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={updatingTask}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reviewingReport && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-on-surface">
                  Review Field Report #{reviewingReport.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReviewingReport(null)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-container-low border border-slate-200/80 text-xs space-y-1">
              <div className="font-bold text-on-surface">{reviewingReport.title}</div>
              <div className="text-on-surface-variant">Submitted by: <strong className="text-on-surface">{reviewingReport.employee_name}</strong></div>
              <div className="text-on-surface mt-1 leading-relaxed">{reviewingReport.observations}</div>
            </div>

            <form onSubmit={handleReviewReport} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">
                  Review Decision
                </label>
                <select
                  value={reviewDecision}
                  onChange={(e) => setReviewDecision(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-on-surface bg-surface-container-lowest focus:border-primary focus:outline-none"
                >
                  <option value="approved">Approve Report</option>
                  <option value="corrections_requested">Request Corrections</option>
                  <option value="rejected">Reject Report</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">
                  Supervisor Remarks
                </label>
                <textarea
                  rows={3}
                  required
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Enter verification remarks, stock approval, or follow-up corrections..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setReviewingReport(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant={reviewDecision === "rejected" ? "danger" : "primary"}
                  size="sm"
                  loading={reviewSubmitting}
                >
                  Submit Review
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );

  // =========================================================================
  // VIEW B: DEDICATED "TEAM TASKS" PAGE
  // =========================================================================
  if (activeView === "team-tasks") {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-on-surface">
        {/* Header Bar */}
        <div className="bg-surface-container-lowest rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="active" size="sm" icon="groups">
                Supervisor Team Tasks
              </Badge>
              <span className="text-xs text-on-surface-variant font-medium">
                Jurisdiction: {allowedBlocks.join(", ")}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-on-surface mt-1">
              Sub-center Interventions & Active Task Ledger ({teamTasks.length})
            </h1>
            <p className="text-xs text-on-surface-variant">
              Live audit trail of task dispatch, field verification, and RDT surveillance kits.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="primary"
              size="md"
              icon="add_task"
              onClick={() => setShowAssignModal(true)}
            >
              Assign New Task
            </Button>
            <Button
              variant="outline"
              size="md"
              icon="dashboard"
              onClick={() => onSwitchView("sup-dashboard")}
            >
              Supervisor Overview
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-surface-container-lowest rounded-xl border border-slate-200/90 p-4 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-on-surface-variant absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search village, worker..."
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-xs font-medium text-on-surface bg-surface-container-low focus:bg-surface-container-lowest focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          <select
            aria-label="Filter by Disease or Risk"
            value={diseaseFilter}
            onChange={(e) => setDiseaseFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-200 text-xs font-medium text-on-surface bg-surface-container-low focus:bg-surface-container-lowest focus:border-primary focus:outline-none"
          >
            <option value="all">All 4 Health Risks</option>
            <option value="malaria">Malaria</option>
            <option value="dengue">Dengue</option>
            <option value="diarrhoea">Diarrhoeal Disease</option>
            <option value="heat">Heat-Related Risk</option>
          </select>

          <select
            aria-label="Filter by Employee"
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-200 text-xs font-medium text-on-surface bg-surface-container-low focus:bg-surface-container-lowest focus:border-primary focus:outline-none"
          >
            <option value="all">All Frontline Workers</option>
            {employees.map((em) => (
              <option key={em.id} value={em.name}>
                {em.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by Location Block"
            value={blockFilter}
            onChange={(e) => setBlockFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-200 text-xs font-medium text-on-surface bg-surface-container-low focus:bg-surface-container-lowest focus:border-primary focus:outline-none"
          >
            <option value="all">All Authorized Blocks</option>
            {allowedBlocks.map((bId) => (
              <option key={bId} value={bId}>
                Block {bId}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-200 text-xs font-medium text-on-surface bg-surface-container-low focus:bg-surface-container-lowest focus:border-primary focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue / Escalated</option>
            <option value="needs_help">Needs Help</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            aria-label="Filter by Priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-200 text-xs font-medium text-on-surface bg-surface-container-low focus:bg-surface-container-lowest focus:border-primary focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            aria-label="Filter by Due Date"
            value={dueFilter}
            onChange={(e) => setDueFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-200 text-xs font-medium text-on-surface bg-surface-container-low focus:bg-surface-container-lowest focus:border-primary focus:outline-none"
          >
            <option value="all">All Deadlines</option>
            <option value="overdue">Overdue Only</option>
            <option value="due_soon">Due Within 24h</option>
          </select>
        </div>

        {/* Team Tasks Table */}
        <div className="bg-surface-container-lowest rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-surface-container-low/70 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  <th className="py-3 px-4">Task ID & Protocol</th>
                  <th className="py-3 px-3">Frontline Squad</th>
                  <th className="py-3 px-3">Sub-center / Village</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Target Window</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {teamTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-on-surface-variant">
                      No tasks found matching current filters.
                    </td>
                  </tr>
                ) : (
                  teamTasks.map((t) => (
                    <tr key={t.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center flex-wrap gap-1.5 font-bold text-on-surface">
                          <span className="font-mono text-primary font-bold">TSK-{t.id}</span>
                          {getDiseaseBadge(t.disease_type, t.disease_label)}
                          <span className="font-semibold">{t.title}</span>
                        </div>
                        <div className="text-[11px] text-on-surface-variant truncate max-w-md mt-0.5">
                          {t.instructions || t.description}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold text-[10px]">
                            {t.owner ? t.owner.slice(0, 2).toUpperCase() : "CH"}
                          </div>
                          <span className="font-medium text-on-surface">{t.owner}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-on-surface-variant">
                        <span className="font-semibold text-on-surface block">
                          {t.location_name || t.village_id || "Sector Hub"}
                        </span>
                        <span className="text-[10px] text-on-surface-variant">
                          Block {t.block_id || selectedLocation.block_id}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            t.priority === "Critical"
                              ? "bg-error-container text-on-error-container"
                              : t.priority === "High"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-surface-container text-on-surface-variant"
                          }`}
                        >
                          {t.priority || "High"}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-on-surface-variant font-medium">
                        {t.deadline ? new Date(t.deadline).toLocaleDateString() : "Routine"}
                      </td>
                      <td className="py-3.5 px-3">{getStatusBadge(t)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon="edit"
                          onClick={() => {
                            setEditingTask(t);
                            setEditPriority(t.priority || "High");
                            setEditStatus(t.status);
                            setEditDeadline("");
                          }}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {modals}
      </div>
    );
  }

  // =========================================================================
  // VIEW A: MAIN SUPERVISOR OVERVIEW DASHBOARD (STITCH REPLICA)
  // =========================================================================
  const criticalAlertsCount = highRiskLocations.filter(
    (al) => al.risk === "High" || al.risk === "Very High"
  ).length;
  const watchlistCount = highRiskLocations.length - criticalAlertsCount;
  const openTasksCount = (taskSummary.pending || 0) + (taskSummary.in_progress || 0);
  const completionRate = taskSummary.total
    ? Math.round(((taskSummary.completed || 0) / taskSummary.total) * 100)
    : 88;

  return (
    <div className="supervisor-dashboard p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-on-surface">
      {/* 1. OPERATIONAL HEADER BAR (STITCH EXACT STYLING) */}
      <section className="bg-surface-container-lowest rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container font-bold text-[11px] uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-error animate-ping"></span>
              LEVEL 2 EPIDEMIC WATCH
            </span>
            {sup.name && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[11px]">
                {sup.name} ({sup.designation || "Supervisor"})
              </span>
            )}
            <span className="text-xs text-on-surface-variant font-medium">
              {selectedLocation.breadcrumb} • Jurisdiction: <strong>{allowedBlocks.join(", ")}</strong>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            Supervisor Surveillance & Dispatch
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant">
            Real-time epidemiological monitoring, vector trajectory forecasting, and frontline CHW deployment ledger.
          </p>
        </div>

        {/* Quick Action Bar */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="md"
            icon="location_on"
            onClick={onChangeLocation}
          >
            Change Location
          </Button>

          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("alerts-feed");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors text-xs font-semibold"
          >
            <span className="material-symbols-outlined text-[18px] text-tertiary">
              notification_important
            </span>
            <span>Review Alerts ({highRiskLocations.length})</span>
          </button>

          <Button
            type="button"
            variant="outline"
            size="md"
            icon="add_task"
            onClick={() => setShowAssignModal(true)}
          >
            Assign Task
          </Button>

          <Button
            type="button"
            variant="danger"
            size="md"
            icon="emergency_share"
            onClick={() => triggerRrtModal(selectedCluster?.unit_name)}
          >
            Deploy RRT
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            icon="groups"
            onClick={() => onSwitchView("team-tasks")}
          >
            Team Tasks ({taskSummary.total || 0})
          </Button>
        </div>
      </section>

      {/* 2. TOP KPI METRICS GRID (4 CARDS FROM STITCH) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Health Alerts */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between relative overflow-hidden group hover:shadow-xs transition-shadow">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-error-container/30 pointer-events-none group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
              Active Health Alerts
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-error"></span> Urgent
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tabular-nums">
              {highRiskLocations.length} Triggered
            </div>
            <p className="text-xs text-error font-semibold mt-0.5">
              {criticalAlertsCount} Critical Outbreak Risk • {watchlistCount} Watchlist
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-on-surface-variant">
            <span>Fever & Diarrhoea spikes</span>
            <span className="font-bold text-on-surface">Updated live</span>
          </div>
        </div>

        {/* KPI 2: Open Field Tasks */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between relative overflow-hidden group hover:shadow-xs transition-shadow">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-secondary-container/30 pointer-events-none group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
              Open Field Tasks
            </span>
            <span className="p-1 rounded bg-secondary-container text-on-secondary-fixed">
              <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tabular-nums">
              {openTasksCount} Active Tasks
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Dispatched across {allowedBlocks.length} Authorized Blocks
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-on-surface-variant">
            <span>Coverage: {selectedLocation.block_name}</span>
            <span className="font-bold text-primary">{employees.length} Mitanins on field</span>
          </div>
        </div>

        {/* KPI 3: 48h Task Completion */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between relative overflow-hidden group hover:shadow-xs transition-shadow">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-primary-fixed/20 pointer-events-none group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
              48h Task Completion
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
              On Target
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-primary tabular-nums">
              {completionRate}%
            </div>
            <div className="w-full bg-surface-container h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(completionRate, 100)}%` }}
              ></div>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-on-surface-variant">
            <span>SLA: &lt;48h response target (85%)</span>
            <span className="font-bold text-primary">{taskSummary.completed || 0} Closed</span>
          </div>
        </div>

        {/* KPI 4: Vector Risk Projection */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between relative overflow-hidden group hover:shadow-xs transition-shadow">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-surface-dim/30 pointer-events-none group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
              Vector Risk Projection
            </span>
            <span className="p-1 rounded bg-error-container text-on-error-container">
              <span className="material-symbols-outlined text-[16px]">bug_report</span>
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-error">
              {risk.category || "Elevated"} Risk
            </div>
            <p className="text-xs text-on-surface font-semibold mt-0.5">
              {selectedLocation.block_name} Catchment
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-on-surface-variant">
            <span>Monsoon water stagnancy</span>
            <span className="font-bold text-error">Early Warning</span>
          </div>
        </div>
      </section>

      {/* 3. CENTER EPIDEMIOLOGY GIS & RIGHT-SIDE ALERT TRIAGE FEED */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Interactive GIS & Roster (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* Spatial Epidemiology GIS Schematic */}
          <div className="bg-surface-container-lowest p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col gap-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">explore</span>
                <div>
                  <h2 className="text-base font-bold text-on-surface">
                    Bastar District Spatial Epidemiology GIS
                  </h2>
                  <p className="text-[11px] text-on-surface-variant">
                    Authorized Jurisdiction Telemetry • Active Block: {selectedLocation.block_name}
                  </p>
                </div>
              </div>

              {/* Layer Toggles */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setMapLayer("radar")}
                  className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                    mapLayer === "radar"
                      ? "bg-primary text-on-primary shadow-2xs"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">water_drop</span>
                  <span>Rainfall Radar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMapLayer("rdt")}
                  className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                    mapLayer === "rdt"
                      ? "bg-primary text-on-primary shadow-2xs"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">local_fire_department</span>
                  <span>RDT Positivity</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMapLayer("patrol")}
                  className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                    mapLayer === "patrol"
                      ? "bg-primary text-on-primary shadow-2xs"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">directions_walk</span>
                  <span>CHW Patrols</span>
                </button>
              </div>
            </div>

            {/* GIS Map Display Canvas */}
            <div className="relative w-full h-[400px] sm:h-[480px] rounded-xl overflow-hidden bg-surface-container-high border border-slate-200/80 shadow-inner">
              {/* Topographic Background / Vector Map Grid */}
              <div
                className="w-full h-full bg-cover bg-center opacity-80"
                style={{
                  backgroundImage:
                    "radial-gradient(#00685f 0.75px, transparent 0.75px), radial-gradient(#d3e4fe 0.75px, #e5eeff 0.75px)",
                  backgroundSize: "30px 30px",
                  backgroundPosition: "0 0, 15px 15px",
                }}
              ></div>

              {/* Topographic SVG Polygons */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" fill="none" viewBox="0 0 800 480">
                {/* Lohandiguda Polygon */}
                <polygon
                  fill="#00685f"
                  fillOpacity="0.08"
                  points="60,50 260,30 310,180 180,240 90,180"
                  stroke="#00685f"
                  strokeDasharray="4 2"
                  strokeWidth="1.5"
                />
                <text x="120" y="100" fill="#00685f" fontFamily="Inter" fontSize="11" fontWeight="700" letterSpacing="1">
                  LOHANDIGUDA BLOCK
                </text>

                {/* Tokapal Epicenter Polygon */}
                <polygon
                  fill="#ba0035"
                  fillOpacity="0.12"
                  points="180,240 480,210 520,430 280,460 150,370"
                  stroke="#ba0035"
                  strokeWidth="2"
                />
                <text x="300" y="310" fill="#ba0035" fontFamily="Inter" fontSize="13" fontWeight="800" letterSpacing="1.5">
                  TOKAPAL BLOCK (EPICENTER)
                </text>

                {/* Jagdalpur Rural Polygon */}
                <polygon
                  fill="#545f73"
                  fillOpacity="0.07"
                  points="480,50 740,30 760,340 520,290 470,130"
                  stroke="#545f73"
                  strokeDasharray="3 3"
                  strokeWidth="1.5"
                />
                <text x="560" y="140" fill="#213145" fontFamily="Inter" fontSize="11" fontWeight="700" letterSpacing="1">
                  JAGDALPUR (RURAL)
                </text>

                {/* Dynamic heat haze glow simulation */}
                <circle cx="340" cy="360" r="70" fill="#ba0035" fillOpacity="0.22" filter="blur(20px)" />
                <circle cx="430" cy="280" r="45" fill="#ba0035" fillOpacity="0.16" filter="blur(16px)" />
                <circle cx="200" cy="130" r="40" fill="#f59e0b" fillOpacity="0.18" filter="blur(14px)" />
              </svg>

              {/* Dynamic Interactive HTML Pins */}
              <div className="absolute inset-0 pointer-events-auto">
                {/* Cluster Pin 1: High Alert / Netanar */}
                <div
                  className="absolute top-[350px] left-[330px] -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                  onClick={() =>
                    setSelectedCluster({
                      unit_name: "Netanar Cluster (Tokapal)",
                      risk: "High",
                      details: "Elevated RDT Positivity • 12 unexplained high fevers logged",
                      trigger_reason: "Fever spike following 82mm rainfall pulse",
                      disease_label: "Malaria & Diarrhoea",
                    })
                  }
                >
                  <span className="absolute -inset-3 rounded-full bg-error animate-ping opacity-40"></span>
                  <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-error text-white shadow-md border-2 border-white">
                    <span className="material-symbols-outlined text-[18px]">coronavirus</span>
                  </div>
                  <div className="absolute top-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded bg-inverse-surface text-inverse-on-surface text-[10px] font-bold shadow pointer-events-none">
                    Netanar • High Alert
                  </div>
                </div>

                {/* Cluster Pin 2: Bade Arapur */}
                <div
                  className="absolute top-[270px] left-[420px] -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                  onClick={() =>
                    setSelectedCluster({
                      unit_name: "Bade Arapur Sub-Center",
                      risk: "High",
                      details: "Pediatric Diarrhoea Cluster & Rapid test spike",
                      trigger_reason: "Water chlorination deficit in Hamlet #3",
                      disease_label: "Diarrhoeal Disease",
                    })
                  }
                >
                  <span className="absolute -inset-2 rounded-full bg-error animate-ping opacity-30"></span>
                  <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-error text-white shadow-md border-2 border-white">
                    <span className="material-symbols-outlined text-[16px]">thermostat</span>
                  </div>
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded bg-inverse-surface/90 text-inverse-on-surface text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Bade Arapur
                  </div>
                </div>

                {/* Cluster Pin 3: Chitrakote Ridge */}
                <div
                  className="absolute top-[130px] left-[190px] -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                  onClick={() =>
                    setSelectedCluster({
                      unit_name: "Chitrakote Catchment Basin",
                      risk: "Moderate",
                      details: "Larval density >30/dip in check dam",
                      trigger_reason: "Stagnant water accumulation post-monsoon",
                      disease_label: "Dengue & Malaria Vector",
                    })
                  }
                >
                  <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white shadow-md border-2 border-white">
                    <span className="material-symbols-outlined text-[14px]">water</span>
                  </div>
                  <div className="absolute top-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded bg-inverse-surface/90 text-inverse-on-surface text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Chitrakote Basin
                  </div>
                </div>

                {/* Active Mitanin Patrol Squad Pins (Teal) */}
                {employees.slice(0, 4).map((emp, idx) => {
                  const positions = [
                    { top: "310px", left: "260px" },
                    { top: "390px", left: "370px" },
                    { top: "190px", left: "500px" },
                    { top: "160px", left: "240px" },
                  ];
                  const pos = positions[idx] || positions[0];
                  return (
                    <div
                      key={emp.id}
                      className="absolute cursor-pointer transition-transform hover:scale-125"
                      style={{ top: pos.top, left: pos.left }}
                      title={`Active Patrol: ${emp.name} (${emp.village_id})`}
                    >
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-on-primary shadow-sm border border-white">
                        <span className="material-symbols-outlined text-[14px]">person_pin_circle</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* GIS Map Legend (Bottom Left) */}
              <div className="absolute bottom-3 left-3 bg-surface-container-lowest/90 backdrop-blur-md p-2.5 rounded-lg shadow-sm border border-slate-200/80 flex flex-col gap-1 text-[10px] text-on-surface-variant max-w-[200px]">
                <span className="font-bold text-on-surface uppercase tracking-wider">
                  GIS Layer Legend
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-error shrink-0"></span>
                  <span>Fever / Outbreak Clusters</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                  <span>Vector Stagnancy Hotspots</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0"></span>
                  <span>Active Mitanin Patrol Squads</span>
                </div>
              </div>

              {/* Dynamic Selected Cluster Information Box (Bottom Right) */}
              {selectedCluster && (
                <div className="absolute bottom-3 right-3 bg-surface-container-lowest/95 backdrop-blur-md p-3.5 rounded-xl shadow-lg border border-slate-200 max-w-[320px] transition-all">
                  <div className="flex items-start justify-between gap-2 pb-1.5 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs font-bold text-on-surface leading-tight">
                        {selectedCluster.unit_name}
                      </h4>
                      <span className="text-[10px] text-on-surface-variant">
                        {selectedCluster.disease_label || "Multi-Disease Surveillance"}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        selectedCluster.risk === "High" || selectedCluster.risk === "Very High"
                          ? "bg-error-container text-on-error-container"
                          : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {selectedCluster.risk}
                    </span>
                  </div>

                  <p className="text-[11px] text-on-surface-variant my-1.5 leading-snug">
                    {selectedCluster.details || selectedCluster.trigger_reason}
                  </p>

                  <div className="flex items-center gap-1.5 pt-1">
                    <Button
                      variant="primary"
                      size="sm"
                      icon="add_task"
                      onClick={() => {
                        setNewTaskTitle(`Targeted Response: ${selectedCluster.unit_name}`);
                        setShowAssignModal(true);
                      }}
                    >
                      Dispatch Task
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const el = document.getElementById("alerts-feed");
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      View Alerts
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-on-surface-variant px-1">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span>Telemetry sync: Updated for Block {selectedLocation.block_id}</span>
              </span>
              <span>Coordinates simulated for prototype demonstration</span>
            </div>
          </div>

          {/* Frontline Supervisory Roster Status */}
          <div className="bg-surface-container-lowest p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="text-base font-bold text-on-surface">
                    Frontline Supervisory Roster & Task Completion
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    {employees.length} Mitanins Active Under Authorized Jurisdiction
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                icon="add_task"
                onClick={() => setShowAssignModal(true)}
              >
                Assign Task
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200/70 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                    <th className="py-2.5 px-3">Frontline Worker</th>
                    <th className="py-2.5 px-3">Village / Beat</th>
                    <th className="py-2.5 px-2 text-center">Pending</th>
                    <th className="py-2.5 px-2 text-center">In Progress</th>
                    <th className="py-2.5 px-2 text-center">Overdue</th>
                    <th className="py-2.5 px-2 text-center">Completed</th>
                    <th className="py-2.5 px-3">48h SLA Completion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold text-[11px]">
                            {emp.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-on-surface block leading-tight">{emp.name}</span>
                            <span className="text-[10px] text-on-surface-variant">Mitanin</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-on-surface-variant">
                        <span className="font-semibold text-on-surface">{emp.village_id}</span>
                        <span className="text-[10px] text-on-surface-variant block">Block {emp.block_id}</span>
                      </td>
                      <td className="py-3 px-2 text-center font-semibold text-amber-700">
                        {emp.pending_tasks}
                      </td>
                      <td className="py-3 px-2 text-center font-semibold text-secondary">
                        {emp.in_progress_tasks}
                      </td>
                      <td className="py-3 px-2 text-center font-semibold text-error">
                        {emp.overdue_tasks}
                      </td>
                      <td className="py-3 px-2 text-center font-semibold text-primary">
                        {emp.completed_tasks} / {emp.total_tasks}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-surface-container rounded-full overflow-hidden border border-slate-200">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${emp.completion_rate_pct}%` }}
                            />
                          </div>
                          <span className="font-bold text-on-surface">{emp.completion_rate_pct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Critical Alert Feed & Fast Actions (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Critical Alert Triage Feed */}
          <div className="bg-surface-container-lowest p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col" id="alerts-feed">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-[20px]">
                  notifications_active
                </span>
                <h3 className="text-base font-bold text-on-surface">
                  Live Surveillance Feed
                </h3>
              </div>
              <select
                aria-label="Filter Alerts by Disease"
                value={alertDiseaseFilter}
                onChange={(e) => setAlertDiseaseFilter(e.target.value)}
                className="px-2 py-1 rounded-md border border-slate-200 text-[11px] font-bold text-on-surface bg-surface-container-low focus:bg-surface-container-lowest focus:border-primary focus:outline-none"
              >
                <option value="all">All Risks</option>
                <option value="malaria">Malaria</option>
                <option value="dengue">Dengue</option>
                <option value="diarrhoea">Diarrhoea</option>
                <option value="heat">Heat</option>
              </select>
            </div>

            <div className="flex flex-col gap-3 mt-3 max-h-[520px] overflow-y-auto pr-1">
              {highRiskLocations.length === 0 ? (
                <EmptyState
                  icon="task_alt"
                  title="No Active Alerts"
                  description="All epidemiological thresholds in this jurisdiction are currently within baseline."
                />
              ) : (
                highRiskLocations
                  .filter(
                    (al: any) =>
                      alertDiseaseFilter === "all" || al.disease_type === alertDiseaseFilter
                  )
                  .map((al: any) => (
                    <div
                      key={al.id}
                      className="p-3.5 rounded-xl border border-slate-200/80 bg-surface-container-low/60 hover:bg-surface-container-low transition-colors flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center flex-wrap gap-1">
                          {getDiseaseBadge(al.disease_type, al.disease_label)}
                          <span className="font-bold text-xs text-on-surface">
                            {al.unit_name}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            al.risk === "High" || al.risk === "Very High"
                              ? "bg-error-container text-on-error-container"
                              : "bg-amber-100 text-amber-900"
                          }`}
                        >
                          {al.risk}
                        </span>
                      </div>

                      <p className="text-xs text-on-surface font-medium leading-snug">
                        {al.trigger_reason || al.details}
                      </p>

                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 text-[10px]">
                        <span className="font-semibold text-on-surface-variant">
                          Status: <strong className="uppercase text-on-surface">{al.status || "active"}</strong>
                        </span>

                        <div className="flex items-center gap-1.5">
                          {al.status !== "acknowledged" && al.status !== "resolved" && (
                            <button
                              type="button"
                              onClick={() => handleAlertStatusUpdate(al.id, "acknowledged")}
                              className="px-2 py-1 rounded bg-secondary-container text-on-secondary-fixed font-bold hover:bg-secondary-fixed transition-colors"
                            >
                              Acknowledge
                            </button>
                          )}
                          {al.status !== "resolved" && (
                            <button
                              type="button"
                              onClick={() => handleAlertStatusUpdate(al.id, "resolved")}
                              className="px-2 py-1 rounded bg-primary text-on-primary font-bold hover:bg-primary-container transition-colors"
                            >
                              Resolve
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setNewTaskTitle(`Sweep: ${al.unit_name}`);
                              setShowAssignModal(true);
                            }}
                            className="p-1 rounded text-on-surface-variant hover:text-on-surface"
                            title="Assign Task for Alert"
                          >
                            <span className="material-symbols-outlined text-[16px]">add_task</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. FIELD REPORTS SUBMITTED BY EMPLOYEES (REVIEW WORKFLOW) */}
      <section className="bg-surface-container-lowest rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-base font-bold text-on-surface">
                Field Reports Submitted by Frontline Workers ({reports.length})
              </h2>
              <p className="text-xs text-on-surface-variant">
                Review multi-disease field observations, RDT/water/heat tallies, and audit findings
              </p>
            </div>
          </div>
        </div>

        {reports.length === 0 ? (
          <EmptyState
            icon="description"
            title="No Field Reports Awaiting Review"
            description="Field employees have not submitted new reports in this cycle."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {reports.map((rep) => (
              <div
                key={rep.id}
                className="p-4 rounded-xl border border-slate-200 bg-surface-container-low/50 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center flex-wrap gap-1.5">
                      {getDiseaseBadge(rep.disease_type, rep.disease_label)}
                      {rep.emerging_concern && (
                        <span className="px-1.5 py-0.5 rounded bg-error text-white text-[9px] font-bold uppercase">
                          Emerging Concern
                        </span>
                      )}
                      <span className="font-bold text-sm text-on-surface">{rep.title}</span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                        rep.review_status === "approved"
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : rep.review_status === "rejected"
                          ? "bg-error-container text-on-error-container border border-error/20"
                          : rep.review_status === "corrections_requested"
                          ? "bg-amber-100 text-amber-900 border border-amber-200"
                          : "bg-secondary-container text-on-secondary-fixed border border-secondary/20"
                      }`}
                    >
                      {rep.review_status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="text-xs text-on-surface-variant">
                    Employee: <strong className="text-on-surface">{rep.employee_name}</strong> ·{" "}
                    {rep.location_name}
                  </div>

                  <div className="flex items-center flex-wrap gap-2 text-xs font-semibold text-on-surface pt-1">
                    <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant">
                      Homes: {rep.households_visited}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant">
                      Checks/RDTs: {rep.rdt_conducted}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                      Suspected: {rep.suspected_cases || 0}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-error-container text-on-error-container">
                      Positive: {rep.positive_cases}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant">
                      Water Sites: {rep.stagnant_water_sites}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant">
                      Nets/ORS: {rep.nets_distributed}
                    </span>
                  </div>

                  <p className="text-xs text-on-surface bg-surface-container-lowest p-3 rounded-lg border border-slate-200 mt-1 leading-relaxed">
                    “{rep.observations}”
                  </p>

                  {rep.review_notes && (
                    <div className="text-[11px] text-primary font-medium">
                      Reviewed by {rep.reviewer_name}: “{rep.review_notes}”
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                  <Button
                    variant="primary"
                    size="sm"
                    icon="check"
                    onClick={() => {
                      setReviewingReport(rep);
                      setReviewDecision("approved");
                      setReviewNotes(rep.review_notes || "Verified and approved.");
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon="rule"
                    onClick={() => {
                      setReviewingReport(rep);
                      setReviewDecision("corrections_requested");
                      setReviewNotes("");
                    }}
                  >
                    Request Corrections
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon="close"
                    onClick={() => {
                      setReviewingReport(rep);
                      setReviewDecision("rejected");
                      setReviewNotes("");
                    }}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {modals}
    </div>
  );
}
