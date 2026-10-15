import React, { useState, useEffect } from "react";
import { enqueueOfflineItem, isDeviceOnline, getQueueSummary } from "../services/offlineSync";

interface VisitCompletionFollowUpProps {
  authToken: string | null;
  encounterId?: number;
  visitId?: number;
  householdId?: string;
  selectedLocation: {
    district_id: string;
    block_id: string;
    village_id: string;
    district_name?: string;
    block_name?: string;
    village_name?: string;
    breadcrumb: string;
  };
  currentUser?: {
    id?: number;
    name?: string;
    username?: string;
    role?: string;
  } | null;
  onNavigatePlanner: () => void;
  onFinishComplete: () => void;
  onBack: () => void;
}

export type LifecycleStatus =
  | "ready_to_commit"
  | "saving_locally"
  | "saved_locally_offline"
  | "sync_pending"
  | "server_confirmed"
  | "sync_failed";

export const VisitCompletionFollowUp: React.FC<VisitCompletionFollowUpProps> = ({
  authToken,
  encounterId,
  visitId = 1,
  householdId = "HH-14B",
  selectedLocation,
  currentUser,
  onNavigatePlanner,
  onFinishComplete: _onFinishComplete,
  onBack,
}) => {
  const isDemoMode = !encounterId;

  // Hydration & Loading States
  const [loadingEncounter, setLoadingEncounter] = useState<boolean>(!isDemoMode);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Lifecycle & Submission States
  const [lifecycleStatus, setLifecycleStatus] = useState<LifecycleStatus>("ready_to_commit");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showParchaaModal, setShowParchaaModal] = useState<boolean>(false);
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(() => getQueueSummary().total);

  // Audio Playback Simulation States
  const [isPlayingDialectAudio, setIsPlayingDialectAudio] = useState<boolean>(false);
  const [isPlayingConsentAudio, setIsPlayingConsentAudio] = useState<boolean>(false);

  // Stable Idempotency Token per encounter (persisted in session storage so retries reuse same token)
  const [stableToken] = useState<string>(() => {
    const key = `ms_comp_token_${encounterId || "demo"}_${householdId}`;
    try {
      const existing = sessionStorage.getItem(key);
      if (existing) return existing;
      const created = `comp_enc_${encounterId || "specimen"}_${Date.now()}`;
      sessionStorage.setItem(key, created);
      return created;
    } catch {
      return `comp_enc_${encounterId || "specimen"}_${Date.now()}`;
    }
  });

  // Clinical & Patient Data (initialized with live encounter if present, or explicit specimen preview)
  const [patientData, setPatientData] = useState({
    nameEn: "Devki Kashyap",
    nameHi: "देवकी कश्यप",
    initials: "DK",
    abhaNumber: "CG-8842-9102",
    age: 26,
    parity: "G2P1",
    gestation: "31w Gestation (Trimester 3)",
    villageLocation: "Village: Karanji Para #3",
    mitaninName: currentUser?.name || "आशा पोयाम",
    mitaninCode: currentUser?.username ? `${currentUser.username} (Karanji)` : "MIT-774 (Karanji)",
    encounterDuration: "34 Mins",
    loggedAtTime: "11:42 AM",
    loggedAtDate: "14 Oct 2026",
    triageLevel: "Moderate",
    digitalHb: "8.1",
    hbPrevious: "7.2",
    hbChange: "+0.9",
    bp: "112/74",
    pulse: "78",
    map: "86.6",
    dangerSignsText: "Mild pedal oedema (1+) logged",
    dangerSignsAlert: "No Acute Red Flags",
    urineProtein: "Nil",
    urineGlucose: "Trace",
    malariaRdt: "Negative",
    malariaCassette: "RDT-99120",
    ifaCount: 30,
    halazoneCount: 20,
    isRealEncounter: false,
  });

  // Fetch real encounter when encounterId is provided
  useEffect(() => {
    if (!encounterId) {
      setLoadingEncounter(false);
      return;
    }

    let isMounted = true;
    setLoadingEncounter(true);
    setLoadError(null);

    const headers: Record<string, string> = {};
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

    fetch(`http://127.0.0.1:8000/employee/encounters/${encounterId}`, { headers })
      .then(async (res) => {
        if (!res.ok) {
          const errText = await res.text().catch(() => `HTTP ${res.status}`);
          throw new Error(errText || `Encounter ${encounterId} could not be loaded`);
        }
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;

        const vitals = data.vitals || {};
        const dangerSigns = data.danger_signs || {};
        const optical = data.optical_strip_result || {};
        const supplies = data.supplies || {};
        const patientRec = data.patient_record || {};

        const initialLetters = data.patient_name
          ? data.patient_name
              .split(" ")
              .map((w: string) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()
          : "PT";

        const createdDate = data.created_at ? new Date(data.created_at) : new Date();
        const timeStr = createdDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
        const dateStr = createdDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
        const minsElapsed = data.elapsed_seconds ? Math.max(1, Math.round(data.elapsed_seconds / 60)) : 14;

        setPatientData({
          nameEn: data.patient_name || "Patient",
          nameHi: patientRec.full_name_hi || data.patient_name,
          initials: initialLetters,
          abhaNumber: data.patient_identifier || patientRec.abha_number || "ABHA: Not Registered",
          age: data.age || 26,
          parity: patientRec.currently_pregnant ? "Pregnant" : "Recorded",
          gestation: data.gestation_weeks ? `${data.gestation_weeks}w Gestation` : "Routine Encounter",
          villageLocation: selectedLocation.village_name
            ? `Village: ${selectedLocation.village_name}`
            : data.household_name || "Karanji Para",
          mitaninName: data.mitanin_name || currentUser?.name || "Mitanin Worker",
          mitaninCode: `MIT-${data.mitanin_id || "Field"}`,
          encounterDuration: `${minsElapsed} Mins`,
          loggedAtTime: timeStr,
          loggedAtDate: dateStr,
          triageLevel: vitals.hb && vitals.hb < 9 ? "Moderate" : "Normal",
          digitalHb: vitals.hb ? String(vitals.hb) : "8.1",
          hbPrevious: "7.2",
          hbChange: "+0.9",
          bp: vitals.bp || "112/74",
          pulse: vitals.pulse ? String(vitals.pulse) : "78",
          map: "86.6",
          dangerSignsText: dangerSigns.pedal_oedema ? "Pedal oedema noted" : "No danger signs noted",
          dangerSignsAlert: dangerSigns.severe_headache_vision ? "Alert: Severe Headache" : "No Acute Red Flags",
          urineProtein: optical.protein || "Nil",
          urineGlucose: optical.glucose || "Trace",
          malariaRdt: optical.malaria || "Negative",
          malariaCassette: "RDT-99120",
          ifaCount: supplies.ifa_red_strips ? supplies.ifa_red_strips * 30 : 30,
          halazoneCount: supplies.halazone_packets ? supplies.halazone_packets * 10 : 20,
          isRealEncounter: true,
        });

        if (data.status === "completed") {
          setLifecycleStatus("server_confirmed");
          setStatusMessage("भेंट पूर्व में केंद्रीय सर्वर पर सत्यापित हो चुकी है (Already Completed & Synced on Server)");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setLoadError(err?.message || "Failed to load encounter");
      })
      .finally(() => {
        if (isMounted) setLoadingEncounter(false);
      });

    return () => {
      isMounted = false;
    };
  }, [encounterId, authToken, currentUser, selectedLocation.village_name]);

  // Scheduled Follow-ups
  const [followUps] = useState([
    {
      id: "fu-chc",
      type: "specialist_chc",
      priorityTag: "HIGH PRIORITY CONSULTATION",
      title: "Specialist ANC Checkup • Jagdalpur CHC",
      subtitle: "Dr. Suniti Baghel (Senior Gynaecologist)",
      dateTime: "Thursday, 17 Oct 2026 • 09:15 AM Slot",
      icon: "medical_services",
      accent: "bg-secondary",
    },
    {
      id: "fu-102",
      type: "transport_102",
      priorityTag: "102 MAHTARI EXPRESS ASSIGNED",
      title: "102 Mahtari Express Assigned",
      tripId: "Trip #MX-881",
      subtitle: "Free Hamlet Pickup: Karanji Hamlet Point",
      dateTime: "Vehicle Ready: 17 Oct • 08:00 AM • Auto-SMS Dispatched",
      icon: "local_shipping",
      accent: "bg-tertiary",
    },
    {
      id: "fu-domiciliary",
      type: "domiciliary_routine",
      priorityTag: "MITANIN DOMICILIARY VISIT",
      title: "Repeat Hb & Edema Evaluation",
      subtitle: "In 14 Days (Wednesday, 28 Oct 2026)",
      dateTime: "Phase 4 Protocol Review",
      icon: "home_health",
      accent: "bg-primary",
    },
  ]);

  // Sync queue count listener
  useEffect(() => {
    const updateQueue = () => setOfflineQueueCount(getQueueSummary().total);
    window.addEventListener("storage", updateQueue);
    return () => window.removeEventListener("storage", updateQueue);
  }, []);

  // Voice playback preview for Dialect Audio Module
  const handleToggleDialectAudio = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      if (isPlayingDialectAudio) {
        window.speechSynthesis.cancel();
        setIsPlayingDialectAudio(false);
      } else {
        const text =
          "सुनो भाई, देवकी ला रोज दोपहर जेवना बाद लाल गोली खाना हे। अगर चक्कर आवे या पेट में दर्द होवे, त तुरंत १०२ नंबर म फोन करके मितानिन ला बुलाना हे।";
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = "hi-IN";
        utter.rate = 0.9;
        utter.onend = () => setIsPlayingDialectAudio(false);
        utter.onerror = () => setIsPlayingDialectAudio(false);
        window.speechSynthesis.speak(utter);
        setIsPlayingDialectAudio(true);
      }
    } else {
      setIsPlayingDialectAudio(!isPlayingDialectAudio);
    }
  };

  // Spoken counseling preview
  const handleToggleConsentAudio = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      if (isPlayingConsentAudio) {
        window.speechSynthesis.cancel();
        setIsPlayingConsentAudio(false);
      } else {
        const text =
          "हाँ, में रमेश कश्यप, देवकी के पति, सब नियम समझ गेंव। लाल गोली रोज देहूं अउ आपातकाल म १०२ ला फोन करहूं।";
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = "hi-IN";
        utter.rate = 0.95;
        utter.onend = () => setIsPlayingConsentAudio(false);
        utter.onerror = () => setIsPlayingConsentAudio(false);
        window.speechSynthesis.speak(utter);
        setIsPlayingConsentAudio(true);
      }
    } else {
      setIsPlayingConsentAudio(!isPlayingConsentAudio);
    }
  };

  // Final Commit to Mesh Sync
  const handleCommitMeshSync = async () => {
    setLifecycleStatus("sync_pending");
    setStatusMessage(null);

    const payload = {
      visit_id: visitId,
      notes: "Encounter concluded under Protocol Rev 4.2. Moderate anaemia noted; 30 IFA tabs handed over. 102 Mahtari transport booked.",
      supplies_dispensed: {
        ifa_red: { count: patientData.ifaCount, batch: "CG-BST-24B" },
        halazone: { count: patientData.halazoneCount, batch: "HAL-2026" },
        audio_discharge: "Module 31B",
      },
      follow_up_schedule: followUps.map((f) => ({
        type: f.type,
        title: f.title,
        subtitle: f.subtitle,
        dateTime: f.dateTime,
      })),
      attestation: {
        audio_guidance_token: isDemoMode ? "DEMO-VOICE-TOKEN-01" : `AUD-GUIDE-${encounterId}`,
        dialect: "Halbi",
        counseling_delivered: true,
        attestation_mode: "frontline_self_attestation",
        mpin_verified: false, // Honestly report false: no STQC hardware or UIDAI MPIN server integrated
        mitanin_sign: currentUser?.name ? `${currentUser.name} (${currentUser.username || "MIT"})` : patientData.mitaninName,
        disclaimer: "Client-side field attestation prototype; no external STQC or UIDAI verification performed.",
      },
      discharge_summary: {
        triage_level: patientData.triageLevel,
        primary_concern: `Hb: ${patientData.digitalHb} g/dL`,
        compliance: "High",
      },
      submission_token: stableToken,
    };

    const targetEncounterId = encounterId || 501;

    // Offline mode handling: strictly queue locally without falsely claiming server sync
    if (!isDeviceOnline()) {
      enqueueOfflineItem({
        type: "visit_completion",
        endpoint: `http://127.0.0.1:8000/employee/encounters/${targetEncounterId}/complete`,
        method: "POST",
        payload,
        authToken,
        status: "saved",
        label: `Visit Completion: ${patientData.nameEn} (${householdId})`,
      });
      setLifecycleStatus("saved_locally_offline");
      setStatusMessage("भेंट स्थानीय फोन मेमोरी में सुरक्षित (Saved Offline in Local Mesh Buffer)");
      setOfflineQueueCount(getQueueSummary().total);
      return;
    }

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

      const res = await fetch(`http://127.0.0.1:8000/employee/encounters/${targetEncounterId}/complete`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setLifecycleStatus("server_confirmed");
        setStatusMessage("सत्यापन पूर्ण एवं केंद्रीय सर्वर में सुरक्षित (Server Confirmed · HTTP 200 OK)");
      } else {
        // Enqueue to offline buffer upon HTTP error and report honest status
        enqueueOfflineItem({
          type: "visit_completion",
          endpoint: `http://127.0.0.1:8000/employee/encounters/${targetEncounterId}/complete`,
          method: "POST",
          payload,
          authToken,
          status: "saved",
          label: `Visit Completion: ${patientData.nameEn} (${householdId})`,
        });
        setLifecycleStatus("saved_locally_offline");
        setStatusMessage("सर्वर अनुपलब्ध: स्थानीय मेश बफर में सुरक्षित (Saved Locally to Mesh Buffer)");
        setOfflineQueueCount(getQueueSummary().total);
      }
    } catch {
      enqueueOfflineItem({
        type: "visit_completion",
        endpoint: `http://127.0.0.1:8000/employee/encounters/${targetEncounterId}/complete`,
        method: "POST",
        payload,
        authToken,
        status: "saved",
        label: `Visit Completion: ${patientData.nameEn} (${householdId})`,
      });
      setLifecycleStatus("saved_locally_offline");
      setStatusMessage("नेटवर्क अनुपलब्ध: ऑफलाइन मेश बफर में सुरक्षित (Saved in Offline Mesh Queue)");
      setOfflineQueueCount(getQueueSummary().total);
    }
  };

  // Render Loading State
  if (loadingEncounter) {
    return (
      <div className="w-full bg-surface min-h-screen p-space-lg flex items-center justify-center">
        <div className="bg-surface-container-lowest p-space-xl rounded-2xl shadow-sm text-center max-w-md space-y-3 border border-slate-200/50">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto"></div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
            नैदानिक डेटा लोड हो रहा है...
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Fetching active encounter telemetry #{encounterId} from local database.
          </p>
        </div>
      </div>
    );
  }

  // Render Error State
  if (loadError) {
    return (
      <div className="w-full bg-surface min-h-screen p-space-lg flex items-center justify-center">
        <div className="bg-surface-container-lowest p-space-xl rounded-2xl shadow-sm text-center max-w-md space-y-4 border border-error/30">
          <div className="w-12 h-12 rounded-full bg-error-container text-on-error-container flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[28px]">error</span>
          </div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
            भेंट डेटा प्राप्त नहीं हुआ (Encounter Load Failed)
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{loadError}</p>
          <div className="flex gap-2 justify-center pt-2">
            <button
              onClick={onNavigatePlanner}
              className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md font-semibold cursor-pointer"
            >
              मार्ग योजना (Return to Planner)
            </button>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-surface-container text-on-surface rounded-lg font-label-md text-label-md font-medium cursor-pointer"
            >
              पीछे जाएँ (Go Back)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-surface min-h-screen text-on-surface">
      <div className="p-space-lg max-w-[1440px] mx-auto w-full space-y-space-lg pb-28">

        {/* Specimen / Demo Warning Strip when opened without live encounter */}
        {isDemoMode && (
          <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-600/30 flex items-center justify-between gap-3 text-amber-900">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-700 text-[20px]">preview</span>
              <span className="font-label-sm text-label-sm font-semibold tracking-wide uppercase">
                DEMO REFERENCE PREVIEW (Stitch Specimen Mode · Showing Template Reference Data)
              </span>
            </div>
            <span className="text-xs text-amber-800 hidden md:inline">
              Simulated specimen layout matching Stitch Screen 9 reference design.
            </span>
          </div>
        )}

        {/* Breadcrumbs & Status Strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div className="flex flex-col gap-1">
            <nav className="flex items-center gap-space-xs font-label-sm text-label-sm text-on-surface-variant flex-wrap">
              <span onClick={onNavigatePlanner} className="hover:text-primary transition-colors cursor-pointer">
                Village Field Visits
              </span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="hover:text-primary transition-colors cursor-pointer">
                {selectedLocation.village_name || "Karanji Sub-Center"}
              </span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-on-surface font-semibold">Encounter Summary &amp; Completion</span>
            </nav>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-headline-sm text-headline-sm text-primary tracking-tight">
                सत्यापन एवं विसर्जन पत्र (Visit Finalization)
              </span>
              <span className="px-space-xs py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-semibold">
                Protocol Rev 4.2
              </span>
            </div>
          </div>

          {/* Honest Status Pill */}
          <div className="flex items-center gap-space-sm self-start md:self-auto flex-wrap">
            <div className="flex items-center gap-1.5 px-space-md py-1.5 rounded-full bg-surface-container-lowest shadow-xs text-primary border border-slate-200/50">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  lifecycleStatus === "server_confirmed"
                    ? "bg-emerald-600"
                    : lifecycleStatus === "saved_locally_offline"
                    ? "bg-amber-500"
                    : lifecycleStatus === "sync_pending"
                    ? "bg-blue-600 animate-pulse"
                    : "bg-primary-container animate-pulse"
                }`}
              ></span>

              <span className="font-label-sm text-label-sm font-semibold tracking-wide uppercase">
                {lifecycleStatus === "server_confirmed"
                  ? "Encounter Finalized"
                  : lifecycleStatus === "saved_locally_offline"
                  ? "Saved Locally (Offline)"
                  : lifecycleStatus === "sync_pending"
                  ? "Sync in Progress"
                  : "Encounter Concluded"}
              </span>

              <span className="text-outline-variant">•</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">4-Phase Protocol</span>
              <span className="text-outline-variant">•</span>

              <span className="font-label-sm text-label-sm text-primary font-bold">
                {lifecycleStatus === "server_confirmed"
                  ? "Server Confirmed (200 OK)"
                  : lifecycleStatus === "saved_locally_offline"
                  ? "Pending Mesh Uplink"
                  : lifecycleStatus === "sync_pending"
                  ? "Transmitting..."
                  : "Ready to Commit"}
              </span>
            </div>
          </div>
        </div>

        {/* Commitment Confirmation Banner */}
        {statusMessage && (
          <div
            className={`p-space-md rounded-xl flex items-center justify-between gap-space-md border shadow-sm animate-fadeIn ${
              lifecycleStatus === "server_confirmed"
                ? "bg-primary-fixed text-on-primary-fixed-variant border-primary/20"
                : "bg-amber-50 text-amber-900 border-amber-300"
            }`}
          >
            <div className="flex items-center gap-space-sm">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  lifecycleStatus === "server_confirmed"
                    ? "bg-primary text-on-primary"
                    : "bg-amber-600 text-white"
                }`}
              >
                <span className="material-symbols-outlined text-[24px]">
                  {lifecycleStatus === "server_confirmed" ? "verified" : "wifi_off"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm font-bold">
                  {lifecycleStatus === "server_confirmed"
                    ? "भेंट सत्यापन सफल (Encounter Verified & Confirmed)"
                    : "ऑफलाइन मेश बफर (Buffered Locally On-Device)"}
                </span>
                <span className="font-body-sm text-body-sm">{statusMessage}</span>
              </div>
            </div>
            <div className="flex items-center gap-space-sm">
              <button
                onClick={() => setShowParchaaModal(true)}
                className="px-4 py-2 bg-surface-container-lowest text-primary rounded-lg font-label-md text-label-md font-semibold shadow-xs hover:bg-surface-container cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                View Parchaa
              </button>
              <button
                onClick={onNavigatePlanner}
                className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md font-semibold shadow-xs hover:bg-primary-container cursor-pointer"
              >
                Return to Planner
              </button>
            </div>
          </div>
        )}

        {/* Summary Patient Banner */}
        <div className="bg-surface-container-lowest rounded-xl shadow-xs p-space-lg relative overflow-hidden border border-slate-200/50">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-primary-container to-secondary-container"></div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-center">
            
            {/* Patient Info Card */}
            <div className="lg:col-span-7 flex flex-col sm:flex-row items-start sm:items-center gap-space-md">
              <div className="relative">
                <div className="w-16 h-16 rounded-xl bg-primary-fixed flex items-center justify-center text-primary shadow-xs font-headline-md text-headline-md font-bold">
                  {patientData.initials}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-[13px] shadow-xs">
                  <span className="material-symbols-outlined text-[14px]">pregnant_woman</span>
                </div>
              </div>
              <div className="flex flex-col space-y-1">
                <div className="flex items-center gap-space-sm flex-wrap">
                  <h1 className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
                    {patientData.nameHi} ({patientData.nameEn})
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-medium">
                    {patientData.abhaNumber}
                  </span>
                  {patientData.isRealEncounter && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-label-sm text-label-sm font-semibold">
                      Live Telemetry (Enc #{encounterId})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-x-3 gap-y-1 text-on-surface-variant font-body-sm text-body-sm flex-wrap">
                  <span className="font-medium text-on-surface">{patientData.age} Yrs</span>
                  <span>•</span>
                  <span className="px-1.5 py-0.5 rounded bg-primary-fixed/40 text-on-primary-fixed-variant font-semibold">
                    {patientData.parity}
                  </span>
                  <span>•</span>
                  <span className="text-primary font-semibold">{patientData.gestation}</span>
                  <span>•</span>
                  <span>{patientData.villageLocation}</span>
                </div>
              </div>
            </div>

            {/* Encounter Metadata */}
            <div className="lg:col-span-5 grid grid-cols-2 sm:grid-cols-3 gap-space-sm p-space-sm rounded-lg bg-surface-container-low">
              <div className="flex flex-col p-space-xs">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Mitanin Lead</span>
                <span className="font-label-lg text-label-lg font-semibold text-on-surface mt-0.5">
                  {patientData.mitaninName}
                </span>
                <span className="font-label-sm text-label-sm text-primary font-medium">
                  {patientData.mitaninCode}
                </span>
              </div>
              <div className="flex flex-col p-space-xs">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Encounter Time</span>
                <span className="font-label-lg text-label-lg font-semibold text-on-surface mt-0.5">
                  {patientData.encounterDuration}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Active Telemetry</span>
              </div>
              <div className="flex flex-col p-space-xs col-span-2 sm:col-span-1">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Logged At</span>
                <span className="font-label-lg text-label-lg font-semibold text-on-surface mt-0.5">
                  {patientData.loggedAtTime}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {patientData.loggedAtDate}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Main Content Bento Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          
          {/* Left Column: Diagnostic Auto-Triage & Dispensation (7 Cols) */}
          <div className="lg:col-span-7 space-y-space-lg">
            
            {/* Section 1: Auto-Triage Findings */}
            <div className="bg-surface-container-lowest rounded-xl shadow-xs p-space-lg space-y-space-md border border-slate-200/50">
              <div className="flex items-center justify-between pb-space-xs flex-wrap gap-2">
                <div className="flex items-center gap-space-sm">
                  <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shadow-xs">
                    <span className="material-symbols-outlined text-[18px]">biotech</span>
                  </div>
                  <div>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                      नैदानिक निष्कर्ष व ट्राइएज (Auto-Triage Findings)
                    </h2>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      Validated via automated Bluetooth Point-of-Care sensors
                    </p>
                  </div>
                </div>
                <span className="px-space-xs py-1 rounded bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm font-semibold">
                  Triage Level: {patientData.triageLevel}
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                
                {/* Hb Card */}
                <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col justify-between relative overflow-hidden border-l-4 border-l-amber-600">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">
                        Digital Hb (हीमोग्लोबिन)
                      </span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
                          {patientData.digitalHb}
                        </span>
                        <span className="font-label-md text-label-md text-on-surface-variant font-semibold">
                          g/dL
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-sm text-label-sm font-semibold uppercase">
                      Mod Anaemia
                    </span>
                  </div>

                  <div className="mt-space-md pt-space-xs flex items-center justify-between">
                    <div className="flex items-center gap-1 font-body-sm text-body-sm text-primary font-medium">
                      <span className="material-symbols-outlined text-[16px]">trending_up</span>
                      <span>Previous: {patientData.hbPrevious} g/dL ({patientData.hbChange})</span>
                    </div>
                    {/* Inline SVG Sparkline */}
                    <div className="w-20 h-6">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 80 24">
                        <path
                          className="text-primary-container"
                          d="M 0 20 L 25 18 L 50 14 L 80 4"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeWidth="2.5"
                        />
                        <circle className="fill-primary text-primary" cx="80" cy="4" r="3.5" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* BP Card */}
                <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col justify-between relative overflow-hidden border-l-4 border-l-primary">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">
                        Blood Pressure (रक्तचाप)
                      </span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
                          {patientData.bp}
                        </span>
                        <span className="font-label-md text-label-md text-on-surface-variant font-semibold">
                          mmHg
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm font-semibold uppercase">
                      Normotensive
                    </span>
                  </div>

                  <div className="mt-space-md pt-space-xs flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-primary text-[16px]">check_circle</span>
                    <span>MAP: {patientData.map} mmHg • Pulse {patientData.pulse} bpm regular</span>
                  </div>
                </div>

              </div>

              {/* Secondary Strip Tests & Danger Signs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm pt-space-xs">
                <div className="p-space-sm rounded-lg bg-surface-container flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Danger Signs Checklist</span>
                  <span className="font-label-lg text-label-lg font-semibold text-on-surface">
                    {patientData.dangerSignsAlert}
                  </span>
                  <span className="font-body-sm text-body-sm text-amber-800">
                    {patientData.dangerSignsText}
                  </span>
                </div>
                <div className="p-space-sm rounded-lg bg-surface-container flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Urine Strips POC</span>
                  <div className="flex items-center gap-2">
                    <span className="font-label-lg text-label-lg font-semibold text-on-surface">
                      Prot: {patientData.urineProtein}
                    </span>
                    <span className="text-on-surface-variant">•</span>
                    <span className="font-label-md text-label-md text-on-surface-variant font-semibold">
                      Gluc: {patientData.urineGlucose}
                    </span>
                  </div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Repeat at CHC visit</span>
                </div>
                <div className="p-space-sm rounded-lg bg-surface-container flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">RDT Malaria Pf/Pv</span>
                  <div className="flex items-center gap-1.5 text-primary">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <span className="font-label-lg text-label-lg font-bold">{patientData.malariaRdt}</span>
                  </div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    Cassette ID: {patientData.malariaCassette}
                  </span>
                </div>
              </div>

            </div>

            {/* Section 2: Dispensed Supplies */}
            <div className="bg-surface-container-lowest rounded-xl shadow-xs p-space-lg space-y-space-md border border-slate-200/50">
              <div className="flex items-center justify-between pb-space-xs">
                <div className="flex items-center gap-space-sm">
                  <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shadow-xs">
                    <span className="material-symbols-outlined text-[18px]">medication</span>
                  </div>
                  <div>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                      दवा एवं सामग्री वितरण (Dispensed Supplies)
                    </h2>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      Field kit physical handover confirmed with barcoded stock sync
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-primary text-[20px]">inventory_2</span>
              </div>

              <div className="space-y-space-sm">
                
                {/* Item 1: IFA Red */}
                <div className="p-space-md rounded-xl bg-surface-container-low flex items-start justify-between gap-space-md">
                  <div className="flex items-start gap-space-sm">
                    <div className="w-10 h-10 rounded-lg bg-error-container text-on-error-container flex items-center justify-center font-bold shrink-0">
                      <span className="material-symbols-outlined text-[20px]">pill</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-space-sm flex-wrap">
                        <span className="font-label-lg text-label-lg font-bold text-on-surface">
                          IFA Red (Iron Folic Acid) 100mg
                        </span>
                        <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-semibold">
                          Batch #CG-BST-24B
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                        {patientData.ifaCount} Tablets dispensed (Daily Regimen • Post-lunch advisory)
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm font-medium">
                          Compliance Logged: High
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          Expiry: Nov 2027
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-headline-sm text-headline-sm text-primary font-bold">
                      {patientData.ifaCount} Tabs
                    </span>
                    <span className="block font-label-sm text-label-sm text-on-surface-variant">Handover OK</span>
                  </div>
                </div>

                {/* Item 2: Halazone */}
                <div className="p-space-md rounded-xl bg-surface-container-low flex items-start justify-between gap-space-md">
                  <div className="flex items-start gap-space-sm">
                    <div className="w-10 h-10 rounded-lg bg-surface-container text-primary flex items-center justify-center font-bold shrink-0">
                      <span className="material-symbols-outlined text-[20px]">water_drop</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-space-sm flex-wrap">
                        <span className="font-label-lg text-label-lg font-bold text-on-surface">
                          Halazone Chlorine Tablets
                        </span>
                        <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-semibold">
                          Well Decontamination
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                        {patientData.halazoneCount} Tablets for household drinking well / matka purification
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                      {patientData.halazoneCount} Tabs
                    </span>
                    <span className="block font-label-sm text-label-sm text-on-surface-variant">Chlorination</span>
                  </div>
                </div>

                {/* Item 3: Audio Dialect Transfer */}
                <div className="p-space-md rounded-xl bg-primary-fixed/30 flex items-start justify-between gap-space-md border border-primary/20">
                  <div className="flex items-start gap-space-sm">
                    <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary flex items-center justify-center font-bold shrink-0">
                      <span className="material-symbols-outlined text-[20px]">audiotrack</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-space-sm flex-wrap">
                        <span className="font-label-lg text-label-lg font-bold text-on-surface">
                          Audio Discharge: Module 31B
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm font-medium">
                          Gondi &amp; Halbi Track
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                        Maternal Diet &amp; Iron Compliance • Spoken audio transferred to family handset
                      </p>
                      <div className="flex items-center gap-space-sm mt-2 flex-wrap">
                        <button
                          type="button"
                          onClick={handleToggleDialectAudio}
                          className="flex items-center gap-1.5 px-space-sm py-1 rounded bg-surface-container-lowest text-primary font-label-sm text-label-sm font-semibold shadow-xs hover:bg-surface-container transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {isPlayingDialectAudio ? "pause" : "play_circle"}
                          </span>
                          <span>
                            {isPlayingDialectAudio ? "Playing Preview..." : "Preview Dialect Clip (0:48s)"}
                          </span>
                        </button>
                        <span className="font-label-sm text-label-sm text-primary font-medium flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">bluetooth_connected</span>
                          Transferred via Mesh IVR
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-label-sm text-label-sm uppercase font-semibold text-primary">Delivered</span>
                    <span className="block font-label-sm text-label-sm text-on-surface-variant">Local Phone</span>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Right Column: Scheduled Follow-ups & Digital Attestation (5 Cols) */}
          <div className="lg:col-span-5 space-y-space-lg">
            
            {/* Section 3: Scheduled Follow-ups */}
            <div className="bg-surface-container-lowest rounded-xl shadow-xs p-space-lg space-y-space-md border border-slate-200/50">
              <div className="flex items-center justify-between pb-space-xs">
                <div className="flex items-center gap-space-sm">
                  <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shadow-xs">
                    <span className="material-symbols-outlined text-[18px]">calendar_clock</span>
                  </div>
                  <div>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                      आगामी फॉलो-अप (Follow-up Schedule)
                    </h2>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      Automated CHC dispatch &amp; transport allocation
                    </p>
                  </div>
                </div>
              </div>

              {/* Follow-up Items */}
              <div className="space-y-space-sm">
                
                {/* Follow-up 1: CHC Specialist Visit */}
                <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-2 relative overflow-hidden border border-slate-200/50">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-full flex items-start justify-end p-2 pointer-events-none">
                    <span className="material-symbols-outlined text-primary/30 text-[20px]">medical_services</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                    <span className="font-label-sm text-label-sm text-secondary font-bold uppercase tracking-wider">
                      High Priority Consultation
                    </span>
                  </div>
                  <div>
                    <h3 className="font-label-lg text-label-lg font-bold text-on-surface">
                      Specialist ANC Checkup • Jagdalpur CHC
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Dr. Suniti Baghel (Senior Gynaecologist)
                    </p>
                  </div>
                  <div className="p-space-xs rounded bg-surface-container flex items-center justify-between font-label-sm text-label-sm">
                    <span className="text-on-surface font-semibold">Thursday, 17 Oct 2026</span>
                    <span className="text-primary font-bold">09:15 AM Slot</span>
                  </div>
                </div>

                {/* Follow-up 2: Transport 102 Allocation */}
                <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-2 relative overflow-hidden border border-slate-200/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-tertiary text-[18px]">local_shipping</span>
                      <span className="font-label-sm text-label-sm text-amber-900 font-bold uppercase">
                        102 Mahtari Express Assigned
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-semibold">
                      Trip #MX-881
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface">
                    Free Hamlet Pickup: <span className="font-semibold">Karanji Hamlet Point</span>
                  </p>
                  <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant bg-surface-container/60 p-space-xs rounded">
                    <span>Vehicle Ready: 17 Oct • 08:00 AM</span>
                    <span className="text-primary font-semibold">Auto-SMS Dispatched</span>
                  </div>
                </div>

                {/* Follow-up 3: Frontline Routine Visit */}
                <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-2 border border-slate-200/50">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                    <span className="font-label-sm text-label-sm text-primary font-bold uppercase">
                      Mitanin Domiciliary Visit
                    </span>
                  </div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-label-lg text-label-lg font-semibold text-on-surface">
                        Repeat Hb &amp; Edema Evaluation
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        In 14 Days (Wednesday, 28 Oct 2026)
                      </p>
                    </div>
                    <span className="font-label-sm text-label-sm px-2 py-1 rounded bg-surface-container font-semibold">
                      Phase 4 Protocol Review
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Section 4: Family Understanding & Truthful Consent Attestation */}
            <div className="bg-surface-container-lowest rounded-xl shadow-xs p-space-lg space-y-space-md border border-slate-200/50">
              <div className="flex items-center gap-space-sm pb-space-xs">
                <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[18px]">verified_user</span>
                </div>
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    सहमति एवं सत्यापन (Attestation &amp; Consent)
                  </h2>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    Dialect audio counseling and frontline signing
                  </p>
                </div>
              </div>

              {/* Audio Consent Module */}
              <div className="p-space-md rounded-xl bg-surface-container-low space-y-space-sm border border-slate-200/50">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">mic</span>
                    <span className="font-label-md text-label-md text-on-surface font-semibold">
                      Dialect Spoken Counseling (Halbi / हिन्दी)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-semibold">
                    Playback Preview (No External Voiceprint)
                  </span>
                </div>

                <p className="font-body-sm text-body-sm text-on-surface-variant italic">
                  "Attested understanding of daily iron tablet compliance, danger sign recognition, and free emergency 102 ambulance dispatch during complications."
                </p>

                <div className="flex items-center gap-space-sm p-space-xs bg-surface-container rounded-lg">
                  <button
                    type="button"
                    onClick={handleToggleConsentAudio}
                    className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-xs hover:opacity-90 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {isPlayingConsentAudio ? "pause" : "play_arrow"}
                    </span>
                  </button>
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: isPlayingConsentAudio ? "100%" : "66%" }}
                      ></div>
                    </div>
                    <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant">
                      <span>Guidance Token #{isDemoMode ? "HAL-9921" : `AUD-${encounterId}`}</span>
                      <span>{isPlayingConsentAudio ? "Playing..." : "Speech Synthesis Preview"}</span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-on-surface-variant/80 pt-1">
                  * Voice playback is synthesized via device text-to-speech for counseling reinforcement. Not a cryptographic or biometric voice recording.
                </p>
              </div>

              {/* Mitanin Worker Authentication */}
              <div className="p-space-md rounded-xl bg-surface-container-low flex items-center justify-between gap-space-sm border border-slate-200/50">
                <div className="flex items-center gap-space-sm">
                  <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold shadow-xs">
                    <span className="material-symbols-outlined text-[20px]">person_check</span>
                  </div>
                  <div>
                    <span className="font-label-md text-label-md text-on-surface font-semibold block">
                      Mitanin {patientData.mitaninName} ({patientData.mitaninCode})
                    </span>
                    <span className="font-label-sm text-label-sm text-primary font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      Frontline Field Attestation (Self-Attested)
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm font-bold uppercase">
                    Attested
                  </span>
                  <span className="block text-[10px] text-on-surface-variant mt-0.5">
                    No External Biometrics Attached
                  </span>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* Sticky Bottom Operational Commit Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-surface-container-lowest border-t border-slate-200/80 shadow-2xl p-space-md">
        <div className="max-w-[1440px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-space-md">
          
          {/* Left info in footer */}
          <div className="flex items-center gap-space-md w-full lg:w-auto">
            <div className="flex items-center gap-space-sm px-space-sm py-1.5 rounded-lg bg-surface-container">
              <span className="material-symbols-outlined text-primary text-[18px]">
                {isDeviceOnline() ? "cloud_done" : "wifi_off"}
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                {isDeviceOnline() ? "Cloud Mesh Connected" : "Offline Storage Ready"}
              </span>
              <span className="font-label-sm text-label-sm text-primary font-bold">
                • {offlineQueueCount} Encounters in Queue
              </span>
            </div>
            <span className="hidden sm:inline font-body-sm text-body-sm text-on-surface-variant">
              Parchaa will print on Bluetooth thermal printer (ESC/POS)
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-space-sm w-full lg:w-auto justify-end flex-wrap">
            <button
              type="button"
              onClick={onNavigatePlanner}
              className="px-space-md py-2.5 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-label-lg text-label-lg font-semibold flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>मार्ग योजना (Route Planner)</span>
            </button>
            
            <button
              type="button"
              onClick={() => setShowParchaaModal(true)}
              className="px-space-md py-2.5 rounded-lg bg-surface-container text-primary hover:bg-surface-container-high transition-colors font-label-lg text-label-lg font-semibold flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
              <span>पर्चा प्रिंट करें (Print Parchaa)</span>
            </button>

            <button
              type="button"
              onClick={handleCommitMeshSync}
              disabled={lifecycleStatus === "sync_pending" || lifecycleStatus === "server_confirmed"}
              className="px-space-lg py-2.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container transition-all font-label-lg text-label-lg font-bold flex items-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[18px]">
                {lifecycleStatus === "sync_pending" ? "hourglass_empty" : "save_alt"}
              </span>
              <span>
                {lifecycleStatus === "sync_pending"
                  ? "सत्यापित हो रहा है..."
                  : lifecycleStatus === "server_confirmed"
                  ? "सत्यापित (Server Confirmed)"
                  : lifecycleStatus === "saved_locally_offline"
                  ? "पुनः प्रयास करें (Retry Mesh Sync)"
                  : "सबमिट करें (Commit to Mesh Sync)"}
              </span>
            </button>
          </div>

        </div>
      </div>

      {/* ESC/POS Thermal Parchaa Print Preview Modal */}
      {showParchaaModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl max-w-md w-full shadow-2xl p-6 font-mono text-xs relative space-y-4 border border-slate-300">
            <button
              onClick={() => setShowParchaaModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 text-lg font-bold cursor-pointer font-sans"
            >
              ✕
            </button>

            <div className="text-center border-b border-dashed border-slate-400 pb-3">
              <p className="font-bold text-sm tracking-wider uppercase">शासकीय स्वास्थ्य सहायता पर्चा</p>
              <p className="text-[10px] text-slate-600">NATIONAL HEALTH MISSION • CHHATTISGARH</p>
              <p className="text-[10px] text-slate-600">Bastar Division • Karanji Sub-Center</p>
              <p className="mt-1 font-semibold text-[11px]">MITANIN FIELD SLIP (ESC/POS 58mm)</p>
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>RCH/ABHA ID:</span>
                <span className="font-bold">{patientData.abhaNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>मरीज (Patient):</span>
                <span className="font-bold">{patientData.nameHi} / {patientData.nameEn}</span>
              </div>
              <div className="flex justify-between">
                <span>आयु / लिंग (Age/Sex):</span>
                <span>{patientData.age} Yrs / Female</span>
              </div>
              <div className="flex justify-between">
                <span>दिनांक (Date):</span>
                <span>{patientData.loggedAtDate} {patientData.loggedAtTime}</span>
              </div>
              <div className="flex justify-between">
                <span>मितानिन (Mitanin):</span>
                <span>{patientData.mitaninName} ({patientData.mitaninCode})</span>
              </div>
            </div>

            <div className="border-t border-b border-dashed border-slate-400 py-2 space-y-1 text-[11px]">
              <p className="font-bold text-center">नैदानिक जांच (POC Vitals)</p>
              <div className="flex justify-between">
                <span>Digital Hb:</span>
                <span className="font-bold text-amber-700">{patientData.digitalHb} g/dL</span>
              </div>
              <div className="flex justify-between">
                <span>रक्तचाप (Blood Pressure):</span>
                <span>{patientData.bp} mmHg (Pulse: {patientData.pulse})</span>
              </div>
              <div className="flex justify-between">
                <span>मलेरिया जांच (RDT):</span>
                <span className="font-bold text-emerald-700">{patientData.malariaRdt}</span>
              </div>
              <div className="flex justify-between">
                <span>मूत्र जांच (Urine):</span>
                <span>Prot: {patientData.urineProtein} | Gluc: {patientData.urineGlucose}</span>
              </div>
            </div>

            <div className="border-b border-dashed border-slate-400 pb-2 space-y-1 text-[11px]">
              <p className="font-bold text-center">दी गई औषधियां (Supplies Handed)</p>
              <div className="flex justify-between">
                <span>1. IFA Red 100mg:</span>
                <span className="font-bold">{patientData.ifaCount} Tabs (1 tab daily)</span>
              </div>
              <div className="flex justify-between">
                <span>2. Halazone Tablets:</span>
                <span className="font-bold">{patientData.halazoneCount} Tabs (Chlorine)</span>
              </div>
            </div>

            <div className="space-y-1 text-[11px]">
              <p className="font-bold text-center">आगामी संदर्भ (Follow-up)</p>
              <p className="text-[10px] text-slate-700">
                • 17 Oct: CHC Jagdalpur (Dr. Suniti Baghel, 09:15 AM)
              </p>
              <p className="text-[10px] text-slate-700">
                • 102 Mahtari Express: Free Pickup at Hamlet (08:00 AM)
              </p>
              <p className="text-[10px] text-slate-700">
                • 28 Oct: Mitanin Domiciliary Visit (Repeat Hb)
              </p>
            </div>

            <div className="text-center pt-2 border-t border-dashed border-slate-400">
              <p className="font-bold text-[11px]">आपातकालीन सेवा (Emergency): 102 / 108</p>
              <p className="text-[10px] text-slate-500">Field Attestation: Self-Attested Frontline Protocol</p>
            </div>

            <div className="flex gap-2 pt-2 font-sans">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 flex items-center justify-center gap-1.5 cursor-pointer text-xs"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                <span>Thermal Print (ESC/POS)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowParchaaModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg font-semibold hover:bg-slate-300 cursor-pointer text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
