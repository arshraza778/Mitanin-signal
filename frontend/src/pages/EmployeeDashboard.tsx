import React, { useState, useEffect, useMemo, useCallback } from "react";
import type { SelectedLocationState } from "../components/LocationSelectorModal";
import { OfflineSyncModal } from "../components/OfflineSyncModal";
import { VoiceInputButton } from "../components/VoiceInputButton";
import { useI18n } from "../i18n/I18nContext";
import {
  enqueueOfflineItem,
  getQueueSummary,
  isDeviceOnline,
  subscribeToSyncQueue,
} from "../services/offlineSync";

interface EmployeeDashboardProps {
  activeView: "emp-dashboard" | "my-tasks";
  authToken: string;
  selectedLocation: SelectedLocationState;
  onChangeLocation: () => void;
  onSwitchView: (
    view:
      | "emp-dashboard"
      | "my-tasks"
      | "voice-tasks"
      | "village-planner"
      | "active-encounter"
      | "screening-triage"
      | "patient-registration"
      | string
  ) => void;
  onDataUpdated?: () => void;
  onSelectDiseaseDetail?: (diseaseType: string) => void;
}

interface HouseholdRosterItem {
  id: string;
  householdNumber: string;
  familyName: string;
  patientName: string;
  patientDetail: string;
  clinicalNote: string;
  urgency: "high" | "due_today" | "pending" | "completed";
  urgencyLabel: string;
  icon: string;
  iconBg: string;
  borderColor: string;
  audioText: string;
  actionLabel?: string;
  actionType?: "screen_refer" | "record_act" | "begin_triage" | "completed";
}

const SAMPLE_HOUSEHOLDS: HouseholdRosterItem[] = [
  {
    id: "hh-04",
    householdNumber: "#04",
    familyName: "Baghel Parivar",
    patientName: "Devki Kashyap",
    patientDetail: "26y Female (31 Weeks Gestation)",
    clinicalNote: "Severe Anaemia screening (Hb < 8.1 g/dL reported) & Double-dose IFA distribution checklist.",
    urgency: "high",
    urgencyLabel: "Urgency High (अति गंभीर)",
    icon: "pregnant_woman",
    iconBg: "bg-error-container text-on-error-container",
    borderColor: "bg-error",
    actionLabel: "Screen & Refer",
    actionType: "screen_refer",
    audioText:
      "परिवार क्रमांक 4: बघेल परिवार। देवकी कश्यप, 26 वर्ष, 31 सप्ताह की गर्भवती। गंभीर एनीमिया की जांच और दोहरी खुराक आईएफए वितरण आवश्यक है।",
  },
  {
    id: "hh-09",
    householdNumber: "#09",
    familyName: "Mandavi Parivar",
    patientName: "Ramu Mandavi",
    patientDetail: "34y Male",
    clinicalNote: "Post-fever RDT Falciparum follow-up & ACT Day 2 dosage adherence check.",
    urgency: "due_today",
    urgencyLabel: "Due Today (आज देय)",
    icon: "coronavirus",
    iconBg: "bg-tertiary-fixed text-on-tertiary-fixed",
    borderColor: "bg-tertiary",
    actionLabel: "Record ACT Dose",
    actionType: "record_act",
    audioText:
      "परिवार क्रमांक 9: मंडावी परिवार। रामू मंडावी, 34 वर्ष। बुखार उपरांत आरडीटी फाल्सीपेरम फॉलो-अप और एसीटी दिवस 2 दवा अनुपालन जांचें।",
  },
  {
    id: "hh-15",
    householdNumber: "#15",
    familyName: "Markam Parivar",
    patientName: "Laxmi Markam",
    patientDetail: "19y Female",
    clinicalNote: "Sickle cell crisis joint pain assessment & Folic acid tablet top-up.",
    urgency: "pending",
    urgencyLabel: "Pending Visit (लंबित)",
    icon: "medical_services",
    iconBg: "bg-secondary-fixed text-on-secondary-fixed",
    borderColor: "bg-secondary",
    actionLabel: "Begin Triage",
    actionType: "begin_triage",
    audioText:
      "परिवार क्रमांक 15: मरकाम परिवार। लक्ष्मी मरकाम, 19 वर्ष। सिकल सेल जोड़ों के दर्द का मूल्यांकन और फोलिक एसिड दवा दें।",
  },
  {
    id: "hh-12",
    householdNumber: "#12",
    familyName: "Poyam Parivar",
    patientName: "Sunil Poyam",
    patientDetail: "3y Male",
    clinicalNote: "ORS & Zinc hydration monitor after diarrhoea cluster. Child stable, feeding resumed.",
    urgency: "completed",
    urgencyLabel: "Completed 11:20 AM (पूर्ण)",
    icon: "check_circle",
    iconBg: "bg-surface-container text-primary",
    borderColor: "bg-primary-fixed-dim",
    actionType: "completed",
    audioText:
      "परिवार क्रमांक 12: पोयाम परिवार। सुनील पोयाम, 3 वर्ष। ओआरएस और जिंक घोल जांच पूर्ण। बच्चा स्थिर है।",
  },
];

export function EmployeeDashboard({
  activeView: _activeView,
  authToken,
  selectedLocation,
  onChangeLocation,
  onSwitchView,
  onDataUpdated,
  onSelectDiseaseDetail,
}: EmployeeDashboardProps) {
  const { language, localizeTask } = useI18n();

  const [dashData, setDashData] = useState<any | null>(null);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Task Category Filter
  const [taskCategoryFilter, setTaskCategoryFilter] = useState<string>("all");

  // Offline Sync State
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);
  const [syncSummary, setSyncSummary] = useState(getQueueSummary());
  const [online, setOnline] = useState<boolean>(isDeviceOnline());
  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Audio Playback State & Toast
  const [audioToast, setAudioToast] = useState<{ title: string; subtitle: string } | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Quick Action Modal / Notification (For screens scheduled in subsequent phases)
  const [actionNoticeModal, setActionNoticeModal] = useState<{
    title: string;
    description: string;
    phase: string;
  } | null>(null);

  // Task Action / Completion Modal State
  const [activeTaskAction, setActiveTaskAction] = useState<any | null>(null);
  const [actionNotes, setActionNotes] = useState<string>("");
  const [actionSubmitting, setActionSubmitting] = useState<boolean>(false);

  // Supervisor Refill Request Toast
  const [refillRequested, setRefillRequested] = useState<boolean>(false);

  useEffect(() => {
    const unsub = subscribeToSyncQueue(() => setSyncSummary(getQueueSummary()));
    const handleNet = () => setOnline(isDeviceOnline());
    window.addEventListener("online", handleNet);
    window.addEventListener("offline", handleNet);
    return () => {
      unsub();
      window.removeEventListener("online", handleNet);
      window.removeEventListener("offline", handleNet);
    };
  }, []);

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    }),
    [authToken]
  );

  const fetchDashboard = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      district_id: selectedLocation.district_id,
      block_id: selectedLocation.block_id,
    });
    if (selectedLocation.village_id) {
      params.set("village_id", selectedLocation.village_id);
    }

    fetch(`http://127.0.0.1:8000/employee/dashboard?${params.toString()}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || "Failed to load employee dashboard");
        }
        return res.json();
      })
      .then((json) => {
        setDashData(json);
        if (Array.isArray(json.tasks)) {
          setMyTasks(json.tasks);
        }
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [authToken, selectedLocation.district_id, selectedLocation.block_id, selectedLocation.village_id]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Audio Playback Helper using Web Speech API
  const playSpeech = (text: string, title: string, subtitle: string) => {
    if (typeof window === "undefined") return;

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === "en" ? "en-IN" : "hi-IN";
      utterance.rate = 0.95;
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
      };
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }

    setAudioToast({ title, subtitle });
    setTimeout(() => {
      setAudioToast(null);
    }, 6000);
  };

  const handleGlobalAudioBriefing = () => {
    const brief =
      language === "en"
        ? "Today's priority briefing for Sector 4 hamlet: 14 households scheduled for outreach. 8 households completed, 6 remaining before dusk. High priority alert for Devki Kashyap in Baghel Parivar for severe anaemia. Post-monsoon forest humidity elevated; test fever cases with Pf/Pv RDT."
        : "आज का दैनिक कार्य सारांश: सेक्टर 4 हेमलेट में कुल 14 परिवारों का भ्रमण निर्धारित है। 8 परिवारों का दौरा पूर्ण हो चुका है, 6 परिवार शेष हैं। बघेल परिवार में देवकी कश्यप को गंभीर एनीमिया की जांच प्राथमिकता है। जंगल सीमा पर मलेरिया आरडीटी किट का उपयोग करें।";
    playSpeech(
      brief,
      "आज का समग्र कार्य गाइड (All Tasks Audio)",
      "Playing daily priority summary for Sector 4 Hamlet..."
    );
  };

  const handleVoiceAssistantToggle = () => {
    const prompt =
      language === "en"
        ? "Voice Assistant active. Speak village name, patient symptom, or task number to record."
        : "आवाज़ सहायक सक्रिय है। कार्य या मरीज़ के लक्षण दर्ज करने के लिए बोलें।";
    playSpeech(
      prompt,
      "आवाज़ सहायक चालू है (Voice Active)",
      "Listening in Bastar Chhattisgarhi & Hindi..."
    );
  };

  const handleTriggerManualSync = () => {
    setIsManualSyncing(true);
    setSyncFeedback("Syncing with Bastar Mesh Peer...");
    setTimeout(() => {
      setIsManualSyncing(false);
      setSyncFeedback("Mesh Synced • 0 pending");
      setTimeout(() => setSyncFeedback(null), 3000);
    }, 1500);
  };

  const handleRequestRefill = () => {
    setRefillRequested(true);
    playSpeech(
      "मांग भेजी गई: मलेरिया आरडीटी किट और आवश्यक दवाईयों की पुनः पूर्ति सूचना ब्लॉक पर्यवेक्षक के. वर्मा को भेज दी गई है।",
      "मांग भेजी गई (Request Sent)",
      "Malaria Pf/Pv kit restock alert dispatched to K. Verma (Block CHC)"
    );
    setTimeout(() => setRefillRequested(false), 5000);
  };

  // Submit quick task update
  const handleTaskActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTaskAction) return;

    setActionSubmitting(true);
    const taskId = activeTaskAction.id;
    const payload = {
      action: "complete",
      notes: actionNotes.trim() || "Completed in field visit",
      completion_notes: actionNotes.trim() || "Completed in field visit",
    };

    if (!isDeviceOnline()) {
      enqueueOfflineItem({
        type: "task_action",
        endpoint: `http://127.0.0.1:8000/employee/tasks/${taskId}/action`,
        method: "POST",
        payload,
        authToken,
        status: "saved",
        label: `Task #${taskId}: COMPLETE`,
      });
      setActiveTaskAction(null);
      setActionNotes("");
      setActionSubmitting(false);
      setAudioToast({
        title: "ऑफलाइन सहेजा गया (Saved Offline)",
        subtitle: `Task #${taskId} queued for mesh synchronization.`,
      });
      return;
    }

    try {
      const res = await fetch(`http://127.0.0.1:8000/employee/tasks/${taskId}/action`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setActiveTaskAction(null);
        setActionNotes("");
        fetchDashboard();
        if (onDataUpdated) onDataUpdated();
        setAudioToast({
          title: "कार्य पूर्ण दर्ज (Task Recorded)",
          subtitle: `Task #${taskId} marked completed and logged in mesh.`,
        });
      }
    } catch {
      enqueueOfflineItem({
        type: "task_action",
        endpoint: `http://127.0.0.1:8000/employee/tasks/${taskId}/action`,
        method: "POST",
        payload,
        authToken,
        status: "saved",
        label: `Task #${taskId}: COMPLETE`,
      });
      setActiveTaskAction(null);
      setActionNotes("");
    } finally {
      setActionSubmitting(false);
    }
  };

  const employeeName = dashData?.employee?.name || "Mitanin Asha";
  const supervisorName = dashData?.supervisor?.name || "K. Verma";
  const locationLabel = dashData?.location?.village_name
    ? `${selectedLocation.district_name || "Bastar"} • ${selectedLocation.block_name || "Jagdalpur"} • ${dashData.location.village_name}`
    : "Sector 4 Hamlet (Para VIL_A1), Bastar";

  // Filter tasks for the checklist
  const filteredTasks = useMemo(() => {
    if (!myTasks || myTasks.length === 0) return [];
    if (taskCategoryFilter === "all") return myTasks;
    if (taskCategoryFilter === "maternal") {
      return myTasks.filter(
        (t) =>
          t.title.toLowerCase().includes("maternal") ||
          t.title.toLowerCase().includes("anc") ||
          t.title.toLowerCase().includes("ifa")
      );
    }
    if (taskCategoryFilter === "fever") {
      return myTasks.filter(
        (t) =>
          t.disease_type === "malaria" ||
          t.disease_type === "dengue" ||
          t.title.toLowerCase().includes("fever") ||
          t.title.toLowerCase().includes("rdt")
      );
    }
    if (taskCategoryFilter === "chronic") {
      return myTasks.filter(
        (t) =>
          t.disease_type === "diarrhoea" ||
          t.disease_type === "heat" ||
          t.title.toLowerCase().includes("sickle") ||
          t.title.toLowerCase().includes("water")
      );
    }
    return myTasks;
  }, [myTasks, taskCategoryFilter]);

  if (loading && !dashData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-primary">
        <span className="material-symbols-outlined text-4xl animate-spin">progress_activity</span>
      </div>
    );
  }

  if (error && !dashData) {
    return (
      <div className="p-6 max-w-xl mx-auto my-12 bg-white rounded-2xl border border-red-200 shadow-sm text-center space-y-3">
        <span className="material-symbols-outlined text-4xl text-error">error</span>
        <h2 className="text-base font-bold text-on-surface">डैशबोर्ड लोड करने में समस्या</h2>
        <p className="text-xs text-on-surface-variant">{error}</p>
        <button
          type="button"
          onClick={fetchDashboard}
          className="px-4 py-2 bg-primary text-on-primary text-xs font-bold rounded-lg cursor-pointer"
        >
          पुनः प्रयास करें (Retry)
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-surface text-on-surface min-h-screen">
      {/* Synchronization Modal */}
      <OfflineSyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        onSyncComplete={() => {
          fetchDashboard();
          if (onDataUpdated) onDataUpdated();
        }}
      />

      <div className="px-space-md lg:px-space-xl py-space-md flex flex-col gap-space-lg max-w-[1440px] mx-auto w-full">
        {/* ============================================================ */}
        {/* 1. FRONTLINE STATUS & MESH SYNC BAR                          */}
        {/* ============================================================ */}
        <section
          className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md lg:p-space-lg flex flex-col xl:flex-row xl:items-center justify-between gap-space-md border border-slate-200/80"
          data-purpose="frontline-status-bar"
        >
          <div className="flex flex-wrap items-center gap-space-md">
            {/* Worker Profile Avatar Badge */}
            <div className="flex items-center gap-space-sm bg-surface-container-low px-space-md py-space-sm rounded-lg border border-slate-200/70">
              <div className="w-11 h-11 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-headline-sm text-headline-sm shrink-0">
                <span className="material-symbols-outlined text-[24px]">woman</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-space-xs flex-wrap">
                  <span className="font-headline-sm text-headline-sm text-on-surface truncate">
                    {employeeName}
                  </span>
                  <span className="px-space-xs py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-primary-fixed text-on-primary-fixed-variant">
                    ID: MIT-BAST-0412
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onChangeLocation}
                  className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1 truncate hover:text-primary transition-colors cursor-pointer text-left"
                  title="स्थान बदलें (Change Location)"
                >
                  <span className="material-symbols-outlined text-[14px] text-primary">pin_drop</span>
                  <span>{locationLabel}</span>
                  <span className="material-symbols-outlined text-[12px] opacity-70">edit</span>
                </button>
              </div>
            </div>

            {/* Offline-First Telemetry Chip */}
            <div className="flex items-center gap-space-sm bg-surface-container-high/60 px-space-md py-space-sm rounded-lg border border-slate-200/70">
              <div className="relative flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary-container text-[22px]">
                  cloud_sync
                </span>
                <span
                  className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${
                    online ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                  }`}
                />
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface font-semibold flex items-center gap-1">
                  Offline-First Mesh
                  <span className="font-normal text-on-surface-variant">
                    ({syncSummary.saved + syncSummary.queued} cached locally)
                  </span>
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant leading-tight">
                  {syncFeedback || (online ? "Auto-syncs via Village Peer Node" : "Store & Forward Active")}
                </span>
              </div>
              <button
                type="button"
                onClick={handleTriggerManualSync}
                disabled={isManualSyncing}
                className="ml-space-xs px-space-sm py-1 bg-surface-container-lowest hover:bg-surface-container text-primary font-label-sm text-label-sm font-semibold rounded-md shadow-sm transition-all flex items-center gap-1 border border-slate-200/80 cursor-pointer disabled:opacity-60"
              >
                <span className={`material-symbols-outlined text-[14px] ${isManualSyncing ? "animate-spin" : ""}`}>
                  sync
                </span>
                <span>{isManualSyncing ? "Syncing..." : "Sync Now"}</span>
              </button>
            </div>
          </div>

          {/* Bilingual Audio Prompt & Dialect Voice Assistant */}
          <div className="flex items-center gap-space-sm">
            <div className="flex items-center gap-space-xs bg-tertiary-fixed text-on-tertiary-fixed px-space-md py-space-sm rounded-full shadow-sm">
              <button
                type="button"
                onClick={handleVoiceAssistantToggle}
                className="flex items-center gap-space-xs cursor-pointer focus:outline-none"
              >
                <span className={`material-symbols-outlined text-[18px] text-tertiary ${isSpeaking ? "animate-bounce" : "animate-pulse"}`}>
                  mic
                </span>
                <div className="flex flex-col text-left">
                  <span className="font-label-sm text-label-sm font-bold tracking-tight">
                    आवाज़ सहायक (Voice Assistant)
                  </span>
                  <span className="text-[10px] text-on-tertiary-fixed-variant font-medium">
                    Chhattisgarhi / हिन्दी सक्रिय • Tap to speak
                  </span>
                </div>
                <span className="material-symbols-outlined text-[18px] ml-space-xs text-tertiary">
                  volume_up
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 2. PRIMARY TACTILE ACTION BAR (5 LARGE TOUCH TARGETS)        */}
        {/* ============================================================ */}
        <section
          className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-space-sm lg:gap-space-md"
          data-purpose="tactile-action-bar"
        >
          {/* Action 1: Village Visit */}
          <button
            type="button"
            onClick={() => onSwitchView("village-planner")}
            className="flex items-center justify-center gap-space-sm bg-primary-container hover:bg-primary text-on-primary py-space-md px-space-md rounded-xl shadow-sm transition-transform active:scale-[0.98] min-h-[58px] text-left cursor-pointer"
          >
            <span className="material-symbols-outlined text-[26px]">directions_walk</span>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="font-label-lg text-label-lg font-bold truncate">Start Visit</span>
              <span className="text-[11px] opacity-90 truncate">गांव दौरा शुरू करें</span>
            </div>
          </button>

          {/* Action 2: New Patient */}
          <button
            type="button"
            onClick={() => onSwitchView("patient-registration")}
            className="flex items-center justify-center gap-space-sm bg-surface-container-lowest hover:bg-surface-container text-on-surface py-space-md px-space-md rounded-xl shadow-sm transition-transform active:scale-[0.98] min-h-[58px] text-left border border-slate-200/80 cursor-pointer"
          >
            <span className="material-symbols-outlined text-secondary text-[26px]">person_add</span>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="font-label-lg text-label-lg font-bold truncate">Register Patient</span>
              <span className="text-[11px] text-on-surface-variant truncate">नया मरीज पंजीकरण</span>
            </div>
          </button>

          {/* Action 3: Quick Screening */}
          <button
            type="button"
            onClick={() => onSwitchView("screening-triage")}
            className="flex items-center justify-center gap-space-sm bg-surface-container-lowest hover:bg-surface-container text-on-surface py-space-md px-space-md rounded-xl shadow-sm transition-transform active:scale-[0.98] min-h-[58px] text-left border border-slate-200/80 cursor-pointer"
          >
            <span className="material-symbols-outlined text-primary text-[26px]">vital_signs</span>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="font-label-lg text-label-lg font-bold truncate">Quick Screening</span>
              <span className="text-[11px] text-on-surface-variant truncate">त्वरित स्वास्थ्य जांच</span>
            </div>
          </button>

          {/* Action 4: Create Referral */}
          <button
            type="button"
            onClick={() =>
              setActionNoticeModal({
                title: "Digital Referral Creation (रेफरल पर्ची भेजें)",
                description:
                  "प्राथमिक स्वास्थ्य केंद्र (PHC) व सामुदायिक स्वास्थ्य केंद्र (CHC) हेतु डिजिटल रेफरल पर्ची व एम्बुलेंस 108 समन्वय मॉड्यूल Stitch Screen 11 (Phase 2D) में उपलब्ध होगा।",
                phase: "Phase 2D (Referral Management)",
              })
            }
            className="flex items-center justify-center gap-space-sm bg-surface-container-lowest hover:bg-surface-container text-on-surface py-space-md px-space-md rounded-xl shadow-sm transition-transform active:scale-[0.98] min-h-[58px] text-left border border-slate-200/80 cursor-pointer"
          >
            <span className="material-symbols-outlined text-error text-[26px]">
              forward_to_inbox
            </span>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="font-label-lg text-label-lg font-bold truncate">Create Referral</span>
              <span className="text-[11px] text-on-surface-variant truncate">रेफरल पर्ची भेजें</span>
            </div>
          </button>

          {/* Action 5: Audio Task Guide */}
          <button
            type="button"
            onClick={handleGlobalAudioBriefing}
            className="col-span-2 md:col-span-1 flex items-center justify-center gap-space-sm bg-tertiary hover:bg-tertiary-container text-on-tertiary py-space-md px-space-md rounded-xl shadow-sm transition-transform active:scale-[0.98] min-h-[58px] text-left cursor-pointer"
          >
            <span className="material-symbols-outlined text-[26px]">headphones</span>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="font-label-lg text-label-lg font-bold truncate">Audio Guide</span>
              <span className="text-[11px] opacity-90 truncate">आज के कार्य सुनें</span>
            </div>
          </button>
        </section>

        {/* ============================================================ */}
        {/* 3. MAIN GRID SYSTEM (8 COLS LEFT + 4 COLS RIGHT)             */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          {/* ======================================================== */}
          {/* LEFT COLUMN (8 COLS): ROSTER & FOLLOW-UP TASKS           */}
          {/* ======================================================== */}
          <div className="lg:col-span-8 flex flex-col gap-space-lg">
            {/* SECTION 1: TODAY'S FIELD ROSTER & PROGRESS GAUGE */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md lg:p-space-lg flex flex-col gap-space-md border border-slate-200/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-space-sm gap-space-xs border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-space-xs">
                    <span className="font-headline-md text-headline-md text-on-surface font-bold">
                      Today's Priority Roster
                    </span>
                    <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                      (आज का भ्रमण)
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Hamlet VIL_A1 (Sector 4 Hamlet) • Scheduled Households: 14
                  </p>
                </div>

                {/* Progress metric with circular SVG gauge */}
                <div className="flex items-center gap-space-md bg-surface-container-low px-space-md py-space-xs rounded-lg self-start sm:self-auto border border-slate-200/60">
                  <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                    <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-surface-container-high stroke-current"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        strokeWidth="3.5"
                      />
                      <path
                        className="text-primary-container stroke-current"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        strokeDasharray="57, 100"
                        strokeLinecap="round"
                        strokeWidth="3.5"
                      />
                    </svg>
                    <span className="absolute font-label-sm text-label-sm font-bold text-primary">
                      57%
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                      8 of 14 Visited
                    </span>
                    <span className="text-[11px] text-on-surface-variant">
                      6 remaining before dusk
                    </span>
                  </div>
                </div>
              </div>

              {/* Household Cards Stack */}
              <div className="grid grid-cols-1 gap-space-sm">
                {SAMPLE_HOUSEHOLDS.map((hh) => (
                  <div
                    key={hh.id}
                    className="p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md relative overflow-hidden border border-slate-200/70"
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${hh.borderColor}`} />
                    <div className="flex items-start gap-space-md pl-space-xs">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${hh.iconBg}`}
                      >
                        <span className="material-symbols-outlined text-[22px]">{hh.icon}</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex flex-wrap items-center gap-space-xs">
                          <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                            Household {hh.householdNumber}: {hh.familyName}
                          </span>
                          <span
                            className={`px-space-xs py-0.5 rounded text-[11px] font-bold uppercase ${
                              hh.urgency === "high"
                                ? "bg-error-container text-on-error-container"
                                : hh.urgency === "due_today"
                                ? "bg-tertiary-fixed text-on-tertiary-fixed"
                                : hh.urgency === "completed"
                                ? "bg-primary-fixed text-on-primary-fixed-variant"
                                : "bg-secondary-fixed text-on-secondary-fixed"
                            }`}
                          >
                            {hh.urgencyLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-space-xs text-on-surface mt-0.5 font-label-md text-label-md">
                          <span className="font-semibold">{hh.patientName}</span>
                          <span className="text-on-surface-variant font-normal">
                            {hh.patientDetail}
                          </span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-relaxed">
                          {hh.clinicalNote}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-space-xs shrink-0 self-end md:self-center">
                      <button
                        type="button"
                        onClick={() =>
                          playSpeech(
                            hh.audioText,
                            `परिवार निर्देश: ${hh.familyName}`,
                            `Playing clinical protocol in local dialect for ${hh.patientName}`
                          )
                        }
                        title="Listen instructions in dialect"
                        className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-highest rounded-lg transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[20px]">volume_up</span>
                      </button>

                      {hh.actionLabel && (
                        <button
                          type="button"
                          onClick={() => {
                            if (hh.actionType === "screen_refer") {
                              onSwitchView("screening-triage");
                            } else if (hh.actionType === "begin_triage") {
                              onSwitchView("village-planner");
                            } else if (hh.actionType === "record_act") {
                              setActiveTaskAction({
                                id: 991,
                                title: `Record ACT Day 2 Dosage: ${hh.patientName} (Mandavi Parivar)`,
                              });
                            }
                          }}
                          className={`px-space-md py-space-xs font-label-sm text-label-sm font-semibold rounded-lg shadow-sm cursor-pointer ${
                            hh.urgency === "high"
                              ? "bg-error hover:bg-error/90 text-on-error"
                              : hh.urgency === "due_today"
                              ? "bg-primary hover:bg-primary-container text-on-primary"
                              : "bg-surface-container-highest hover:bg-surface-container-high text-on-surface border border-slate-300/70"
                          }`}
                        >
                          {hh.actionLabel}
                        </button>
                      )}

                      {hh.urgency === "completed" && (
                        <span className="font-label-sm text-label-sm text-primary font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">verified</span>
                          Logged in Mesh
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 2: FIELD TASKS & AUDIO PLAYBACK CHECKLIST */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md lg:p-space-lg flex flex-col gap-space-md border border-slate-200/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-xs border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-space-xs">
                    <span className="font-headline-md text-headline-md text-on-surface font-bold">
                      Pending Tasks Checklist
                    </span>
                    <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                      (कार्य सूची)
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Prioritized frontline field workflows for Sector 4 hamlet
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSwitchView("my-tasks")}
                    className="text-xs font-bold text-primary hover:underline cursor-pointer"
                  >
                    विस्तृत कार्य सूची ({myTasks.length}) →
                  </button>
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-space-xs" id="taskFilters">
                <button
                  type="button"
                  onClick={() => setTaskCategoryFilter("all")}
                  className={`px-space-md py-1 rounded-full font-label-sm text-label-sm font-semibold transition-colors cursor-pointer ${
                    taskCategoryFilter === "all"
                      ? "bg-primary-container text-on-primary shadow-sm"
                      : "bg-surface-container-high hover:bg-surface-container-highest text-on-surface"
                  }`}
                >
                  All Tasks ({myTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskCategoryFilter("maternal")}
                  className={`px-space-md py-1 rounded-full font-label-sm text-label-sm font-semibold transition-colors cursor-pointer ${
                    taskCategoryFilter === "maternal"
                      ? "bg-primary-container text-on-primary shadow-sm"
                      : "bg-surface-container-high hover:bg-surface-container-highest text-on-surface"
                  }`}
                >
                  Maternal &amp; Child
                </button>
                <button
                  type="button"
                  onClick={() => setTaskCategoryFilter("fever")}
                  className={`px-space-md py-1 rounded-full font-label-sm text-label-sm font-semibold transition-colors cursor-pointer ${
                    taskCategoryFilter === "fever"
                      ? "bg-primary-container text-on-primary shadow-sm"
                      : "bg-surface-container-high hover:bg-surface-container-highest text-on-surface"
                  }`}
                >
                  Fever &amp; RDTs
                </button>
                <button
                  type="button"
                  onClick={() => setTaskCategoryFilter("chronic")}
                  className={`px-space-md py-1 rounded-full font-label-sm text-label-sm font-semibold transition-colors cursor-pointer ${
                    taskCategoryFilter === "chronic"
                      ? "bg-primary-container text-on-primary shadow-sm"
                      : "bg-surface-container-high hover:bg-surface-container-highest text-on-surface"
                  }`}
                >
                  Chronic &amp; Sickle Cell
                </button>
              </div>

              {/* Dynamic Task Cards List */}
              <div className="flex flex-col gap-space-md mt-space-xs">
                {filteredTasks.length === 0 ? (
                  <div className="p-6 text-center text-xs text-on-surface-variant bg-surface-container-low rounded-xl">
                    कोई लंबित कार्य नहीं मिला (No tasks matching selected filter).
                  </div>
                ) : (
                  filteredTasks.slice(0, 6).map((task) => {
                    const loc = localizeTask(task);
                    const isDone = task.status === "done" || task.status === "completed";
                    return (
                      <div
                        key={task.id}
                        className="p-space-md rounded-xl bg-surface-container-low shadow-sm flex flex-col gap-space-sm border border-slate-200/70"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-space-sm">
                          <div className="flex items-start gap-space-sm">
                            <div className="w-8 h-8 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center shrink-0 mt-0.5">
                              <span className="material-symbols-outlined text-[18px]">
                                search_check
                              </span>
                            </div>
                            <div>
                              <span className="font-label-lg text-label-lg font-bold text-on-surface">
                                {loc.title || task.title}
                              </span>
                              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 leading-relaxed">
                                {loc.instructions || task.instructions || task.description}
                              </p>
                            </div>
                          </div>

                          {/* Read Aloud Audio Button */}
                          <button
                            type="button"
                            onClick={() =>
                              playSpeech(
                                `${loc.title}। ${loc.instructions}`,
                                `कार्य निर्देश: Task #${task.id}`,
                                "Playing advisory instructions in Chhattisgarhi voice..."
                              )
                            }
                            className="flex items-center gap-space-xs px-space-sm py-1 bg-surface-container-lowest hover:bg-surface-container text-on-surface rounded-full shadow-sm font-label-sm text-label-sm shrink-0 border border-slate-200 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-primary text-[16px]">
                              record_voice_over
                            </span>
                            <span>कार्य ज़ोर से सुनें (Read Aloud)</span>
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center justify-between pt-space-xs mt-space-xs gap-space-sm border-t border-slate-200/50">
                          <div className="flex items-center gap-space-xs flex-wrap">
                            <span className="px-space-xs py-0.5 rounded text-[11px] bg-tertiary-fixed-dim/40 text-on-tertiary-fixed-variant font-semibold">
                              Task #{task.id}
                            </span>
                            <span className="px-space-xs py-0.5 rounded text-[11px] bg-surface-container-high text-on-surface-variant font-medium">
                              {task.unit_name || selectedLocation.village_name || "Hamlet Sector"}
                            </span>
                            {task.priority && (
                              <span className="px-space-xs py-0.5 rounded text-[11px] bg-amber-100 text-amber-800 font-semibold">
                                {task.priority}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-space-xs">
                            {!isDone && (
                              <button
                                type="button"
                                onClick={() => setActiveTaskAction(task)}
                                className="px-space-md py-1 bg-primary text-on-primary hover:bg-primary-container font-label-sm text-label-sm font-semibold rounded-lg shadow-sm cursor-pointer"
                              >
                                Record Execution
                              </button>
                            )}
                            {isDone && (
                              <span className="font-label-sm text-label-sm text-primary font-semibold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">verified</span>
                                Done
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN (4 COLS): INVENTORY & ADVISORY               */}
          {/* ======================================================== */}
          <div className="lg:col-span-4 flex flex-col gap-space-lg">
            {/* RAPID KIT INVENTORY CARD */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md lg:p-space-lg flex flex-col gap-space-md border border-slate-200/80">
              <div className="flex items-center justify-between pb-space-xs border-b border-slate-100">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[22px]">
                    medication
                  </span>
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Supplies on Hand
                  </span>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                  (दवा व किट)
                </span>
              </div>

              {/* Inventory List */}
              <div className="flex flex-col gap-space-sm">
                {/* Item 1: RDT Kits */}
                <div className="p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between gap-space-sm border border-slate-200/60">
                  <div className="flex items-center gap-space-sm">
                    <div className="w-8 h-8 rounded-lg bg-error-container text-on-error-container flex items-center justify-center font-bold text-label-md shrink-0">
                      06
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-md text-label-md text-on-surface font-semibold">
                        Malaria Pf/Pv RDT Kits
                      </span>
                      <span className="font-body-sm text-body-sm text-error font-medium">
                        Low stock • Threshold &lt; 10
                      </span>
                    </div>
                  </div>
                  <span className="px-space-xs py-0.5 rounded text-[10px] uppercase font-bold bg-error-container text-on-error-container shrink-0">
                    Refill Soon
                  </span>
                </div>

                {/* Item 2: ORS & Zinc Packets */}
                <div className="p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between gap-space-sm border border-slate-200/60">
                  <div className="flex items-center gap-space-sm">
                    <div className="w-8 h-8 rounded-lg bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center font-bold text-label-md shrink-0">
                      18
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-md text-label-md text-on-surface font-semibold">
                        ORS &amp; Zinc Packets
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        Adequate for 4 days
                      </span>
                    </div>
                  </div>
                  <span className="px-space-xs py-0.5 rounded text-[10px] uppercase font-bold bg-surface-container text-on-surface-variant shrink-0">
                    OK
                  </span>
                </div>

                {/* Item 3: IFA Red Tablets */}
                <div className="p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between gap-space-sm border border-slate-200/60">
                  <div className="flex items-center gap-space-sm">
                    <div className="w-8 h-8 rounded-lg bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center font-bold text-label-md shrink-0">
                      45
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-md text-label-md text-on-surface font-semibold">
                        IFA Red (Iron Folic)
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        Adequate stock
                      </span>
                    </div>
                  </div>
                  <span className="px-space-xs py-0.5 rounded text-[10px] uppercase font-bold bg-surface-container text-on-surface-variant shrink-0">
                    OK
                  </span>
                </div>

                {/* Item 4: Paracetamol & Chlorine */}
                <div className="p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between gap-space-sm border border-slate-200/60">
                  <div className="flex items-center gap-space-sm">
                    <div className="w-8 h-8 rounded-lg bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center font-bold text-label-md shrink-0">
                      24
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-md text-label-md text-on-surface font-semibold">
                        Paracetamol &amp; Halazone
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        24 tabs remaining
                      </span>
                    </div>
                  </div>
                  <span className="px-space-xs py-0.5 rounded text-[10px] uppercase font-bold bg-surface-container text-on-surface-variant shrink-0">
                    Good
                  </span>
                </div>
              </div>

              {/* Supervisor Request Button */}
              <button
                type="button"
                onClick={handleRequestRefill}
                disabled={refillRequested}
                className="w-full mt-space-xs py-space-sm px-space-md bg-surface-container hover:bg-surface-container-high text-primary font-label-md text-label-md font-semibold rounded-lg flex items-center justify-center gap-space-xs transition-colors cursor-pointer border border-slate-200"
              >
                <span className="material-symbols-outlined text-[18px]">inventory</span>
                <span>
                  {refillRequested ? "पुनः पूर्ति मांग प्रेषित ✓" : `Request Kit Refill from ${supervisorName}`}
                </span>
              </button>
            </div>

            {/* LOCAL SURVEILLANCE & EARLY WARNING ADVISORY */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md lg:p-space-lg flex flex-col gap-space-md border border-slate-200/80">
              <div className="flex items-center justify-between pb-space-xs border-b border-slate-100">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-tertiary text-[22px]">
                    warning
                  </span>
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Regional Risk Warning
                  </span>
                </div>
                <span className="px-space-xs py-0.5 rounded text-[10px] uppercase font-bold bg-tertiary-fixed text-on-tertiary-fixed">
                  Active Alert
                </span>
              </div>

              <div className="p-space-md rounded-xl bg-tertiary-fixed/30 text-on-surface flex flex-col gap-space-xs border border-tertiary/20">
                <div className="flex items-center gap-space-xs text-tertiary font-bold font-label-sm text-label-sm">
                  <span className="material-symbols-outlined text-[16px]">wb_twilight</span>
                  <span>Vector Alert: Sector 4 Canopy Humidity</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface leading-relaxed">
                  Post-monsoon forest humidity elevated in Sector 4 fringe. Mosquito breeding detected along temporary rain puddles. Advise villagers to overturn outdoor open water pots and sleep under LLIN nets.
                </p>
                <div className="flex items-center justify-between pt-space-xs mt-space-xs font-label-sm text-label-sm text-on-surface-variant flex-wrap gap-2">
                  <span>CHC Jagdalpur Vector Cell</span>
                  <div className="flex items-center gap-2">
                    {onSelectDiseaseDetail && (
                      <button
                        type="button"
                        onClick={() => onSelectDiseaseDetail("malaria")}
                        className="text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>प्रोटोकॉल देखें</span>
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        playSpeech(
                          "वेक्टर चेतावनी: सेक्टर 4 वन सीमा में उच्च आर्द्रता। जलजमाव वाले बर्तनों को उल्टा रखें और मच्छरदानी का उपयोग करें।",
                          "Chhattisgarhi Jingle",
                          "Mosquito protection audio notice"
                        )
                      }
                      className="text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Play Jingle</span>
                      <span className="material-symbols-outlined text-[14px]">play_circle</span>
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-on-surface-variant italic">
                * Strictly labeled as simulated demonstration community advisory for frontline training and field synchronization.
              </p>
            </div>

            {/* MITANIN HELPER QUICK PHOTO & COMMUNITY GLIMPSE */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col border border-slate-200/80">
              <div className="relative w-full h-36 bg-surface-container-high overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-primary-container to-brand-900 flex items-center justify-center text-white">
                  <span className="material-symbols-outlined text-5xl text-brand-200 opacity-60">
                    groups
                  </span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-space-md">
                  <span className="text-white font-label-md text-label-md font-semibold drop-shadow-sm">
                    Sector 4 Mahila Arogya Samiti
                  </span>
                </div>
              </div>
              <div className="p-space-md flex flex-col gap-space-xs">
                <span className="font-label-sm text-label-sm font-semibold text-primary">
                  Next Community Gathering:
                </span>
                <span className="font-body-sm text-body-sm text-on-surface leading-relaxed">
                  VHND (Village Health, Sanitation &amp; Nutrition Day) scheduled for Thursday at Anganwadi Kendra #02.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 4. AUDIO PLAYBACK NOTIFICATION TOAST                         */}
        {/* ============================================================ */}
        {audioToast && (
          <aside
            className="fixed bottom-6 right-6 max-w-md bg-inverse-surface text-inverse-on-surface p-space-md rounded-xl shadow-2xl z-50 flex items-center gap-space-md border border-slate-700 animate-in fade-in"
            data-purpose="audio-toast"
          >
            <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px] animate-pulse">
                volume_up
              </span>
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-label-md text-label-md font-bold text-white truncate">
                {audioToast.title}
              </span>
              <span className="font-body-sm text-body-sm text-inverse-on-surface/80 truncate">
                {audioToast.subtitle}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                if ("speechSynthesis" in window) window.speechSynthesis.cancel();
                setAudioToast(null);
                setIsSpeaking(false);
              }}
              className="p-1 hover:bg-white/10 rounded text-white cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </aside>
        )}

        {/* ============================================================ */}
        {/* 5. ACTION NOTICE MODAL (ROADMAP NOTIFICATION)                */}
        {/* ============================================================ */}
        {actionNoticeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-surface-container-lowest text-on-surface rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200/90 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">info</span>
                  </div>
                  <h3 className="text-base font-bold text-on-surface truncate">
                    {actionNoticeModal.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActionNoticeModal(null)}
                  className="text-on-surface-variant hover:text-on-surface cursor-pointer text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-xs text-on-surface-variant leading-relaxed">
                <p>{actionNoticeModal.description}</p>
                <div className="p-2.5 rounded-lg bg-primary-fixed/30 text-on-primary-fixed-variant text-[11px] font-semibold">
                  योजनाबद्ध चरण: {actionNoticeModal.phase}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActionNoticeModal(null)}
                  className="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary font-semibold text-xs rounded-lg cursor-pointer shadow-sm"
                >
                  समझ गया (Acknowledge)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 6. TASK EXECUTION / ACTION MODAL                             */}
        {/* ============================================================ */}
        {activeTaskAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-surface-container-lowest text-on-surface rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200/90 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-on-surface">
                  Record Field Task Execution
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTaskAction(null)}
                  className="text-on-surface-variant hover:text-on-surface cursor-pointer text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleTaskActionSubmit} className="space-y-4">
                <div className="p-3 bg-surface-container-low rounded-xl text-xs space-y-1">
                  <span className="font-bold text-primary">TASK #{activeTaskAction.id}:</span>
                  <div className="font-semibold text-on-surface">
                    {activeTaskAction.title}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-on-surface">
                      Field Execution Notes (कार्रवाई विवरण):
                    </label>
                    <VoiceInputButton
                      size="sm"
                      onTranscript={(spoken) =>
                        setActionNotes((prev) => (prev ? `${prev} ${spoken}` : spoken))
                      }
                    />
                  </div>
                  <textarea
                    rows={3}
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    placeholder="Enter observation notes, test result, or medicine dosage given..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-on-surface bg-surface-container-lowest focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveTaskAction(null)}
                    className="px-3 py-2 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-slate-100 cursor-pointer"
                  >
                    रद्द करें (Cancel)
                  </button>
                  <button
                    type="submit"
                    disabled={actionSubmitting}
                    className="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary font-bold text-xs rounded-lg shadow-sm cursor-pointer disabled:opacity-60"
                  >
                    {actionSubmitting ? "सहेजा जा रहा है..." : "कार्य पूर्ण दर्ज करें (Save Action)"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
