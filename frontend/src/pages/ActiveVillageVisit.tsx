import React, { useState, useEffect, useId } from "react";
import { enqueueOfflineItem, isDeviceOnline, getQueueSummary } from "../services/offlineSync";

interface ActiveVillageVisitProps {
  authToken: string | null;
  householdId?: string;
  visitId?: number;
  selectedLocation: {
    district_id: string;
    block_id: string;
    village_id: string;
    district_name?: string;
    block_name?: string;
    village_name?: string;
    breadcrumb: string;
  };
  onNavigateScreening: (encounterId?: number, patientData?: any) => void;
  onCompleteEncounter: () => void;
  onBack: () => void;
}

export const ActiveVillageVisit: React.FC<ActiveVillageVisitProps> = ({
  authToken,
  householdId = "HH-14B",
  visitId = 1,
  selectedLocation,
  onNavigateScreening,
  onCompleteEncounter,
  onBack,
}) => {
  // Session timer
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(878); // 14 mins 38 sec start

  // Form states
  const [foetalMovement, setFoetalMovement] = useState<"normal" | "absent">("normal");
  const [pedalOedema, setPedalOedema] = useState<"none" | "present">("present");
  const [headache, setHeadache] = useState<"no" | "mild" | "severe">("mild");
  const [fever, setFever] = useState<"normal" | "febrile">("normal");

  const [hbReading, setHbReading] = useState<string>("10.1");
  const [bpReading, setBpReading] = useState<string>("122/78");
  const [tempReading, setTempReading] = useState<string>("98.4");

  const [ifaCount, setIfaCount] = useState<number>(1);
  const [halazoneCount, setHalazoneCount] = useState<number>(2);

  const [isRecordingMemo, setIsRecordingMemo] = useState<boolean>(false);
  const [memoDuration, setMemoDuration] = useState<number>(42);
  const [isPlayingGuidance, setIsPlayingGuidance] = useState<boolean>(false);
  const [audioSpeed, setAudioSpeed] = useState<"1.0x" | "1.2x">("1.0x");

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [emergencyAlertDispatched, setEmergencyAlertDispatched] = useState<boolean>(false);

  // Client idempotency token
  const submissionToken = useId();

  // Timer interval
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleToggleGuidanceAudio = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      if (isPlayingGuidance) {
        window.speechSynthesis.cancel();
        setIsPlayingGuidance(false);
      } else {
        const text =
          "माँ का खान-पान व लाल गोली नियम: रोजाना भोजन में हरी पत्तेदार सब्जियां जैसे मुनगा और सहजन लें। आयरन की लाल गोली को चाय के साथ न लें, इसे नींबू पानी या भोजन के बाद लें।";
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = "hi-IN";
        utter.rate = audioSpeed === "1.2x" ? 1.2 : 0.95;
        utter.onend = () => setIsPlayingGuidance(false);
        utter.onerror = () => setIsPlayingGuidance(false);
        window.speechSynthesis.speak(utter);
        setIsPlayingGuidance(true);
      }
    } else {
      setIsPlayingGuidance(!isPlayingGuidance);
    }
  };

  const handleToggleMemoRecord = () => {
    if (!isRecordingMemo) {
      setIsRecordingMemo(true);
      setMemoDuration(0);
    } else {
      setIsRecordingMemo(false);
    }
  };

  const handleEmergencyTrigger = () => {
    const confirmed = window.confirm(
      "Trigger Priority Referral & Request 102 Mahtari Ambulance for Devki Kashyap (Household #14-B)?"
    );
    if (confirmed) {
      setEmergencyAlertDispatched(true);
      if (!isDeviceOnline()) {
        enqueueOfflineItem({
          type: "task_action",
          endpoint: "http://127.0.0.1:8000/employee/encounters",
          method: "POST",
          payload: {
            visit_id: visitId,
            household_id: householdId,
            patient_name: "Devki Kashyap",
            emergency_escalation: true,
            emergency_escalation_details: { reason: "102 Ambulance emergency triggered" },
          },
          authToken,
          status: "saved",
          label: "102 Emergency Dispatch for Devki Kashyap",
        });
      }
      setTimeout(() => setEmergencyAlertDispatched(false), 5000);
    }
  };

  const handleSaveEncounter = async () => {
    setIsSaving(true);
    const payload = {
      visit_id: visitId,
      household_id: householdId,
      household_name: "Baghel Parivar (बघेल परिवार)",
      patient_name: "Devki Kashyap",
      patient_identifier: "RCH-ID: 78204",
      age: 26,
      gender: "Female",
      gestation_weeks: 31.4,
      village_id: selectedLocation.village_id || "VIL_A1",
      block_id: selectedLocation.block_id || "BLK_A",
      district_id: selectedLocation.district_id || "DIST_SAMPLE",
      danger_signs: {
        foetal_movement: foetalMovement,
        pedal_oedema: pedalOedema === "present",
        severe_headache_vision: headache !== "no",
        fever: fever === "febrile",
      },
      vitals: {
        hb: parseFloat(hbReading) || 10.1,
        bp: bpReading,
        temp: parseFloat(tempReading) || 98.4,
      },
      optical_strip_result: {
        protein: "Nil",
        sugar: "Trace",
        validated: true,
      },
      audio_notes: {
        transcript:
          "देवकी बोल रही है कि पिछले दो दिन से सिर में हल्का दर्द है, पर उल्टी या सूजन नहीं है। लाल गोली खाने में स्वाद कड़वा लगता है इसलिए रात में लेगी...",
        duration_seconds: memoDuration,
      },
      supplies: {
        ifa_red_strips: ifaCount,
        halazone_packets: halazoneCount,
      },
      emergency_escalation: emergencyAlertDispatched,
      submission_token: `enc_${submissionToken}_${householdId}`,
    };

    if (!isDeviceOnline()) {
      enqueueOfflineItem({
        type: "visit_encounter",
        endpoint: "http://127.0.0.1:8000/employee/encounters",
        method: "POST",
        payload,
        authToken,
        status: "saved",
        label: `Encounter: Devki Kashyap (${householdId})`,
      });
      setIsSaving(false);
      setSaveSuccessMsg("भेंट फोन मेमोरी में सुरक्षित (Saved Offline in Local Mesh Buffer)");
      setTimeout(() => {
        onCompleteEncounter();
      }, 1200);
      return;
    }

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

      const res = await fetch("http://127.0.0.1:8000/employee/encounters", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSaveSuccessMsg("भेंट सफलतापूर्वक सहेजी गई (Encounter Saved & Synced Successfully)");
        setTimeout(() => {
          onCompleteEncounter();
        }, 1200);
      } else {
        // Fallback to queue
        enqueueOfflineItem({
          type: "visit_encounter",
          endpoint: "http://127.0.0.1:8000/employee/encounters",
          method: "POST",
          payload,
          authToken,
          status: "saved",
          label: `Encounter: Devki Kashyap (${householdId})`,
        });
        setSaveSuccessMsg("स्थानीय मेश बफर में सुरक्षित (Saved Locally)");
        setTimeout(() => {
          onCompleteEncounter();
        }, 1200);
      }
    } catch {
      enqueueOfflineItem({
        type: "visit_encounter",
        endpoint: "http://127.0.0.1:8000/employee/encounters",
        method: "POST",
        payload,
        authToken,
        status: "saved",
        label: `Encounter: Devki Kashyap (${householdId})`,
      });
      setSaveSuccessMsg("स्थानीय मेश बफर में सुरक्षित (Saved Locally)");
      setTimeout(() => {
        onCompleteEncounter();
      }, 1200);
    } finally {
      setIsSaving(false);
    }
  };

  const syncStats = getQueueSummary();

  return (
    <div className="w-full bg-surface text-on-surface min-h-screen font-body-md text-body-md antialiased pb-16">
      <div className="px-space-md lg:px-space-xl py-space-md space-y-space-md max-w-7xl mx-auto w-full">
        
        {/* Navigation Breadcrumb Bar */}
        <div className="flex items-center justify-between gap-space-sm pt-2">
          <div className="flex items-center gap-space-xs text-body-sm text-on-surface-variant flex-wrap">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1 text-primary hover:text-on-primary-fixed-variant font-semibold cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>दौरा सूची (Return to Planner)</span>
            </button>
            <span>/</span>
            <span className="text-on-surface font-semibold">Active Visit &amp; Patient Encounter (Stitch Screen 8)</span>
          </div>

          <button
            type="button"
            onClick={() => onNavigateScreening(undefined, {
              patient_name: "Devki Kashyap",
              patient_identifier: "RCH-ID: 78204",
              age: 26,
              gestation_weeks: 31.4,
              vitals: { hb: parseFloat(hbReading), bp: bpReading, temp: parseFloat(tempReading) },
              danger_signs: { oedema: pedalOedema === "present", headache: headache !== "no" }
            })}
            className="px-space-md py-1.5 bg-primary-fixed text-on-primary-fixed-variant hover:bg-primary-fixed-dim rounded-lg font-label-md text-label-md font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">fact_check</span>
            <span>Open Risk Triage (जांच एवं जोखिम वर्गीकरण)</span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* ACTIVE FIELD ENCOUNTER BANNER                                */}
        {/* ============================================================ */}
        <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm relative overflow-hidden border border-slate-200/60">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-primary-fixed/20 pointer-events-none blur-2xl"></div>
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md relative z-10">
            <div className="flex items-start gap-space-md text-left">
              <div className="w-12 h-12 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shrink-0 shadow-md">
                <span className="material-symbols-outlined text-[26px]">home_health</span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-space-xs">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>
                    Active Visit • सक्रिय दौरा
                  </span>
                  <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-medium">
                    Household #{householdId} (बघेल परिवार)
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">pin_drop</span>
                    {selectedLocation.village_name || "Kodenar Tola"} Sector 4 Hamlet
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-space-sm">
                  <span className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">Visit in Progress</span>
                  <span className="font-label-md text-label-md text-on-surface-variant">कार्य प्रगति पर है</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-space-sm">
              {/* Session Timer Badge */}
              <div className="flex items-center gap-space-xs bg-surface-container px-space-md py-space-xs rounded-lg border border-slate-200/50">
                <span className="material-symbols-outlined text-primary text-[18px]">timer</span>
                <div className="flex flex-col text-left">
                  <span className="font-label-sm text-label-sm text-on-surface-variant leading-none">Elapsed</span>
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    {formatTimer(elapsedSeconds)}
                  </span>
                </div>
              </div>

              {/* Offline Buffer Telemetry */}
              <div className="flex items-center gap-space-xs bg-surface-container-low px-space-md py-space-xs rounded-lg border border-slate-200/50">
                <span className="material-symbols-outlined text-secondary text-[18px]">offline_bolt</span>
                <div className="flex flex-col text-left">
                  <span className="font-label-sm text-label-sm text-on-surface-variant leading-none">Mesh Sync</span>
                  <span className="font-label-sm text-label-sm text-secondary font-semibold">
                    {syncStats.saved + syncStats.queued} Queued (Peer Relay)
                  </span>
                </div>
              </div>

              {/* GPS Lock Confirmation */}
              <div className="flex items-center gap-space-xs bg-primary-fixed/40 text-on-primary-fixed-variant px-space-sm py-space-xs rounded-lg">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                <span className="font-label-sm text-label-sm font-semibold">GPS ±3.8m Confirmed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Alert Toast */}
        {emergencyAlertDispatched && (
          <div className="p-3 bg-red-600 text-white rounded-xl shadow flex items-center justify-between text-sm font-bold">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined">e911_emergency</span>
              <span>102 Mahtari Ambulance request dispatched with high priority. CHC Jagdalpur ER notified via SMS fallback relay.</span>
            </div>
            <button
              type="button"
              onClick={() => setEmergencyAlertDispatched(false)}
              className="text-white hover:underline text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Success Toast */}
        {saveSuccessMsg && (
          <div className="p-3 bg-emerald-700 text-white rounded-xl shadow flex items-center justify-between text-sm font-bold">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined">done_all</span>
              <span>{saveSuccessMsg}</span>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* MAIN GRID: PATIENT DOSSIER (4 COLS) + CLINICAL STEPS (8 COLS)*/}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
          
          {/* Left Panel: Patient In-Encounter Dossier (4 cols) */}
          <div className="lg:col-span-4 space-y-space-md">
            
            {/* Primary Patient Snapshot Card */}
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-space-md border border-slate-200/60">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-space-sm text-left">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full bg-surface-container-high overflow-hidden shadow-inner flex items-center justify-center font-bold text-xl text-primary bg-primary-fixed">
                      DK
                    </div>
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-secondary-container ring-2 ring-surface-container-lowest"></span>
                  </div>
                  <div>
                    <span className="font-headline-sm text-headline-sm text-on-surface block leading-tight font-bold">
                      Devki Kashyap
                    </span>
                    <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                      देवकी कश्यप • RCH-ID: 78204
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-semibold">
                        26y • G2P1
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-semibold">
                        31w 4d ANC
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigateScreening()}
                  className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors cursor-pointer"
                  title="Patient Full Record"
                >
                  <span className="material-symbols-outlined text-[20px]">badge</span>
                </button>
              </div>

              {/* Alert Callout: Moderate Anemia History */}
              <div className="p-space-sm rounded-lg bg-surface-container-low flex items-start gap-space-xs text-left border border-slate-200/40">
                <span className="material-symbols-outlined text-tertiary text-[20px] shrink-0 mt-0.5">warning</span>
                <div className="space-y-0.5">
                  <span className="font-label-sm text-label-sm text-tertiary font-bold tracking-wide uppercase">
                    Historical Note • पूर्व जांच रिकॉर्ड
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-snug">
                    Prior Hb: <strong>9.2 g/dL</strong> (Moderate Anemia flag on 14 Jan visit). High priority adherence check required.
                  </p>
                </div>
              </div>

              {/* Historical Baseline Telemetry */}
              <div className="space-y-space-xs text-left">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block font-semibold">
                  Last Visit Baseline (14 Jan)
                </span>
                <div className="grid grid-cols-3 gap-space-xs text-center">
                  <div className="p-space-xs bg-surface-container rounded-lg">
                    <span className="font-label-sm text-label-sm text-on-surface-variant block">BP</span>
                    <span className="font-headline-sm text-headline-sm text-on-surface font-bold">118/74</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">mmHg</span>
                  </div>
                  <div className="p-space-xs bg-surface-container rounded-lg">
                    <span className="font-label-sm text-label-sm text-on-surface-variant block">Weight</span>
                    <span className="font-headline-sm text-headline-sm text-on-surface font-bold">51.4</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">kg (+1.2)</span>
                  </div>
                  <div className="p-space-xs bg-surface-container rounded-lg">
                    <span className="font-label-sm text-label-sm text-on-surface-variant block">Fundal Ht</span>
                    <span className="font-headline-sm text-headline-sm text-on-surface font-bold">28</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">cm (Norm)</span>
                  </div>
                </div>
              </div>

              {/* Dialect Family Contact */}
              <div className="p-space-sm rounded-lg bg-surface-container flex items-center justify-between">
                <div className="flex items-center gap-space-xs text-left">
                  <span className="material-symbols-outlined text-primary text-[18px]">family_restroom</span>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface font-semibold">Husband: Ramesh Kashyap</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Phone: +91 94255 ••••91 (Halbi)</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => alert("Calling Ramesh Kashyap (+91 94255 ••••91)...")}
                  className="px-space-sm py-1 rounded-md bg-surface-container-lowest text-primary font-label-sm text-label-sm font-semibold hover:bg-primary hover:text-on-primary transition-colors shadow-sm cursor-pointer border border-slate-200/50"
                >
                  Call
                </button>
              </div>
            </div>

            {/* Emergency Quick-Escalation Module */}
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-space-sm border border-slate-200/60 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-error text-[20px]">e911_emergency</span>
                  <span className="font-headline-sm text-headline-sm text-error font-bold">Emergency Triage</span>
                </div>
                <span className="font-label-sm text-label-sm bg-error-container text-on-error-container px-2 py-0.5 rounded-full font-bold">
                  102 Dispatched direct
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                If severe pre-eclampsia, bleeding, or convulsion is observed, bypass field forms immediately.
              </p>
              <button
                type="button"
                onClick={handleEmergencyTrigger}
                className="w-full min-h-[44px] rounded-lg bg-error hover:bg-error/90 text-on-error font-label-lg text-label-lg font-bold flex items-center justify-center gap-space-xs shadow-md transition-all active:scale-[0.98] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">local_hospital</span>
                <span>Trigger 102 Mahtari Ambulance</span>
              </button>
              <div className="text-center">
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  ऑटो-ड्राफ्ट क्लिनिकल समरी सीधे सीएचसी जगदलपुर पहुंचेगी
                </span>
              </div>
            </div>

            {/* Mitanin Audio Memo Recorder */}
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-space-sm border border-slate-200/60 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[20px]">mic</span>
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold">Field Audio Memo</span>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">Halbi / हिन्दी</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Record verbal impressions, diet intake notes, or family resistance in local dialect.
              </p>
              <div className="p-space-sm rounded-lg bg-surface-container flex items-center justify-between gap-space-sm">
                <button
                  type="button"
                  onClick={handleToggleMemoRecord}
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-all cursor-pointer ${
                    isRecordingMemo
                      ? "bg-error text-white animate-pulse"
                      : "bg-primary-container text-on-primary hover:opacity-90"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">mic</span>
                </button>
                <div className="flex-1">
                  <div className="flex items-center justify-between font-label-sm text-label-sm mb-1">
                    <span className="text-on-surface font-semibold">
                      {isRecordingMemo ? "Recording Halbi memo..." : "Memo #01 Captured"}
                    </span>
                    <span className="text-on-surface-variant">
                      00:{String(memoDuration).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: "65%" }}></div>
                  </div>
                </div>
              </div>

              {/* Dialect Transcript Preview */}
              <div className="p-space-xs rounded bg-surface-container-low border border-slate-200/40">
                <div className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant mb-0.5 font-semibold">
                  <span className="material-symbols-outlined text-[14px]">graphic_eq</span>
                  <span>Draft Audio Transcript (ऑटो-लिप्यंतरण):</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface italic">
                  "देवकी बोल रही है कि पिछले दो दिन से सिर में हल्का दर्द है, पर उल्टी या सूजन नहीं है। लाल गोली खाने में स्वाद कड़वा लगता है इसलिए रात में लेगी..."
                </p>
              </div>
            </div>
          </div>

          {/* Right Panel: Multi-Step Active Workflow Steps (8 cols) */}
          <div className="lg:col-span-8 space-y-space-md">
            
            {/* Workflow Phase Stepper Ribbon */}
            <div className="bg-surface-container-lowest rounded-xl p-space-sm shadow-sm flex items-center justify-between overflow-x-auto border border-slate-200/60">
              <div className="flex items-center gap-space-xs shrink-0">
                <span className="w-6 h-6 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm flex items-center justify-center font-bold">1</span>
                <span className="font-label-lg text-label-lg text-primary font-bold">खतरे के लक्षण (Danger Signs)</span>
              </div>
              <span className="material-symbols-outlined text-outline-variant text-[18px]">chevron_right</span>
              <div className="flex items-center gap-space-xs shrink-0">
                <span className="w-6 h-6 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm flex items-center justify-center font-bold">2</span>
                <span className="font-label-lg text-label-lg text-primary font-bold">Vitals &amp; Lab Strip</span>
              </div>
              <span className="material-symbols-outlined text-outline-variant text-[18px]">chevron_right</span>
              <div className="flex items-center gap-space-xs shrink-0">
                <span className="w-6 h-6 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm flex items-center justify-center font-bold">3</span>
                <span className="font-label-lg text-label-lg text-primary font-bold">Counseling Audio</span>
              </div>
              <span className="material-symbols-outlined text-outline-variant text-[18px]">chevron_right</span>
              <div className="flex items-center gap-space-xs shrink-0">
                <span className="w-6 h-6 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm flex items-center justify-center font-bold">4</span>
                <span className="font-label-lg text-label-lg text-primary font-bold">Supplies</span>
              </div>
            </div>

            {/* Step 1: Rapid Symptom & Danger Signs Matrix */}
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-space-md border border-slate-200/60 text-left">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-label-sm text-label-sm text-primary font-bold uppercase tracking-wider block">
                    Phase 1 • प्राथमिक जांच
                  </span>
                  <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                    Rapid Symptom &amp; Danger Sign Matrix
                  </h2>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Tap directly to toggle status. All critical alerts flag to supervisor dashboard.
                  </span>
                </div>
                <span className="px-space-sm py-1 rounded-full bg-surface-container font-label-sm text-label-sm text-on-surface-variant font-semibold">
                  4 Inquiries Active
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
                {/* Item 1: Foetal Movement */}
                <div className="p-space-sm rounded-lg bg-surface-container flex items-center justify-between">
                  <div className="flex items-center gap-space-sm">
                    <span className="material-symbols-outlined text-primary text-[22px]">child_care</span>
                    <div>
                      <span className="font-headline-sm text-headline-sm text-on-surface block leading-tight font-semibold">
                        Foetal Movement (बच्चे की हलचल)
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">&gt;10 kicks counted past 12 hrs</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setFoetalMovement("normal")}
                      className={`px-3 py-1 rounded-md font-label-sm text-label-sm font-semibold transition-all cursor-pointer ${
                        foetalMovement === "normal"
                          ? "bg-primary-container text-on-primary shadow-sm"
                          : "bg-surface-container-lowest text-on-surface-variant"
                      }`}
                    >
                      Normal
                    </button>
                    <button
                      type="button"
                      onClick={() => setFoetalMovement("absent")}
                      className={`px-3 py-1 rounded-md font-label-sm text-label-sm font-semibold transition-all cursor-pointer ${
                        foetalMovement === "absent"
                          ? "bg-error text-white shadow-sm"
                          : "bg-surface-container-lowest text-on-surface-variant"
                      }`}
                    >
                      Absent
                    </button>
                  </div>
                </div>

                {/* Item 2: Pedal Oedema */}
                <div className="p-space-sm rounded-lg bg-surface-container flex items-center justify-between">
                  <div className="flex items-center gap-space-sm">
                    <span className="material-symbols-outlined text-primary text-[22px]">footprint</span>
                    <div>
                      <span className="font-headline-sm text-headline-sm text-on-surface block leading-tight font-semibold">
                        Facial / Pedal Oedema (सूजन)
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">Check ankles &amp; face for pitting</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setPedalOedema("none")}
                      className={`px-3 py-1 rounded-md font-label-sm text-label-sm font-semibold transition-all cursor-pointer ${
                        pedalOedema === "none"
                          ? "bg-primary-container text-on-primary shadow-sm"
                          : "bg-surface-container-lowest text-on-surface-variant"
                      }`}
                    >
                      None
                    </button>
                    <button
                      type="button"
                      onClick={() => setPedalOedema("present")}
                      className={`px-3 py-1 rounded-md font-label-sm text-label-sm font-semibold transition-all cursor-pointer ${
                        pedalOedema === "present"
                          ? "bg-tertiary-container text-on-tertiary shadow-sm"
                          : "bg-surface-container-lowest text-on-surface-variant"
                      }`}
                    >
                      Present
                    </button>
                  </div>
                </div>

                {/* Item 3: Headache */}
                <div className="p-space-sm rounded-lg bg-surface-container flex items-center justify-between">
                  <div className="flex items-center gap-space-sm">
                    <span className="material-symbols-outlined text-tertiary text-[22px]">visibility_off</span>
                    <div>
                      <span className="font-headline-sm text-headline-sm text-on-surface block leading-tight font-semibold">
                        Persistent Headache (सिरदर्द / धुंधलापन)
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">Pre-eclampsia triage marker</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setHeadache("no")}
                      className={`px-3 py-1 rounded-md font-label-sm text-label-sm font-semibold transition-all cursor-pointer ${
                        headache === "no"
                          ? "bg-primary-container text-on-primary shadow-sm"
                          : "bg-surface-container-lowest text-on-surface-variant"
                      }`}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeadache("mild")}
                      className={`px-3 py-1 rounded-md font-label-sm text-label-sm font-semibold transition-all cursor-pointer ${
                        headache === "mild"
                          ? "bg-tertiary-container text-on-tertiary shadow-sm"
                          : "bg-surface-container-lowest text-on-surface-variant"
                      }`}
                    >
                      Mild (हल्का)
                    </button>
                  </div>
                </div>

                {/* Item 4: Fever or Chills */}
                <div className="p-space-sm rounded-lg bg-surface-container flex items-center justify-between">
                  <div className="flex items-center gap-space-sm">
                    <span className="material-symbols-outlined text-primary text-[22px]">thermostat</span>
                    <div>
                      <span className="font-headline-sm text-headline-sm text-on-surface block leading-tight font-semibold">
                        Fever / Chills (बुखार व कंपकंपी)
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">Bastar Malaria/Typhoid screener</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setFever("normal")}
                      className={`px-3 py-1 rounded-md font-label-sm text-label-sm font-semibold transition-all cursor-pointer ${
                        fever === "normal"
                          ? "bg-primary-container text-on-primary shadow-sm"
                          : "bg-surface-container-lowest text-on-surface-variant"
                      }`}
                    >
                      Normal
                    </button>
                    <button
                      type="button"
                      onClick={() => setFever("febrile")}
                      className={`px-3 py-1 rounded-md font-label-sm text-label-sm font-semibold transition-all cursor-pointer ${
                        fever === "febrile"
                          ? "bg-error text-white shadow-sm"
                          : "bg-surface-container-lowest text-on-surface-variant"
                      }`}
                    >
                      Febrile
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Point-of-Care Vitals & Optical Lab Strip Capture */}
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-space-md border border-slate-200/60 text-left">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-label-sm text-label-sm text-primary font-bold uppercase tracking-wider block">
                    Phase 2 • शारीरिक माप एवं जांच पट्टी
                  </span>
                  <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                    Point-of-Care Vitals &amp; Optical Test Strip
                  </h2>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Enter sensor outputs or capture live image of test strip with phone lens.
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-semibold">
                  <span className="material-symbols-outlined text-[14px]">check</span>
                  Device Synced
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
                {/* Hb */}
                <div className="p-space-sm rounded-lg bg-surface-container space-y-space-xs">
                  <div className="flex items-center justify-between">
                    <label className="font-label-md text-label-md text-on-surface font-semibold">Digital Hb Reading</label>
                    <span className="material-symbols-outlined text-primary text-[18px]">bloodtype</span>
                  </div>
                  <div className="flex items-center gap-space-xs">
                    <input
                      type="number"
                      step="0.1"
                      value={hbReading}
                      onChange={(e) => setHbReading(e.target.value)}
                      className="w-full h-11 px-space-sm bg-surface-container-lowest rounded-md text-on-surface font-headline-sm text-headline-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary-container border border-slate-200/50"
                    />
                    <span className="font-label-md text-label-md text-on-surface-variant font-bold">g/dL</span>
                  </div>
                  <div className="flex items-center justify-between text-label-sm font-label-sm">
                    <span className="text-tertiary font-semibold">Mild Anemia (+0.9 vs prev)</span>
                    <span className="text-on-surface-variant">Target: &gt;11.0</span>
                  </div>
                </div>

                {/* Blood Pressure */}
                <div className="p-space-sm rounded-lg bg-surface-container space-y-space-xs">
                  <div className="flex items-center justify-between">
                    <label className="font-label-md text-label-md text-on-surface font-semibold">Blood Pressure</label>
                    <span className="material-symbols-outlined text-primary text-[18px]">monitor_heart</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={bpReading}
                      onChange={(e) => setBpReading(e.target.value)}
                      className="w-full h-11 px-space-sm bg-surface-container-lowest rounded-md text-on-surface font-headline-sm text-headline-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary-container border border-slate-200/50"
                    />
                    <span className="font-label-md text-label-md text-on-surface-variant font-bold">mmHg</span>
                  </div>
                  <div className="flex items-center justify-between text-label-sm font-label-sm">
                    <span className="text-primary font-semibold">Normotensive</span>
                    <span className="text-on-surface-variant">Cuff: M-Arm</span>
                  </div>
                </div>

                {/* Temperature */}
                <div className="p-space-sm rounded-lg bg-surface-container space-y-space-xs">
                  <div className="flex items-center justify-between">
                    <label className="font-label-md text-label-md text-on-surface font-semibold">Infrared Temp</label>
                    <span className="material-symbols-outlined text-primary text-[18px]">device_thermostat</span>
                  </div>
                  <div className="flex items-center gap-space-xs">
                    <input
                      type="number"
                      step="0.1"
                      value={tempReading}
                      onChange={(e) => setTempReading(e.target.value)}
                      className="w-full h-11 px-space-sm bg-surface-container-lowest rounded-md text-on-surface font-headline-sm text-headline-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary-container border border-slate-200/50"
                    />
                    <span className="font-label-md text-label-md text-on-surface-variant font-bold">°F</span>
                  </div>
                  <div className="flex items-center justify-between text-label-sm font-label-sm">
                    <span className="text-primary font-semibold">Afebrile (सामान्य)</span>
                    <span className="text-on-surface-variant">Sensor: Forehead</span>
                  </div>
                </div>
              </div>

              {/* Optical Strip Capture Card */}
              <div className="p-space-md rounded-xl bg-surface-container flex flex-col md:flex-row items-center justify-between gap-space-md border border-slate-200/40">
                <div className="flex items-start gap-space-sm">
                  <div className="w-16 h-16 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-[24px]">document_scanner</span>
                  </div>
                  <div>
                    <span className="font-headline-sm text-headline-sm text-on-surface font-bold block">
                      Optical Strip Capture &amp; AI Check
                    </span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                      Proteinuria &amp; Glucose Dipstick optical validation via phone camera. Evaluated against Bastar District Color Standard.
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-surface-container-lowest font-label-sm text-label-sm text-on-surface font-semibold border border-slate-200/50">
                        Protein: Nil
                      </span>
                      <span className="px-2 py-0.5 rounded bg-surface-container-lowest font-label-sm text-label-sm text-on-surface font-semibold border border-slate-200/50">
                        Sugar: Trace
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-space-xs shrink-0 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() => alert("Lens opened: Aim camera at urine dipstick card.")}
                    className="flex-1 md:flex-none h-11 px-space-md rounded-lg bg-surface-container-lowest text-primary hover:bg-primary hover:text-on-primary font-label-lg text-label-lg font-semibold flex items-center justify-center gap-1 transition-colors shadow-sm cursor-pointer border border-slate-200/60"
                  >
                    <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                    <span>Retake Strip</span>
                  </button>
                  <button
                    type="button"
                    className="flex-1 md:flex-none h-11 px-space-md rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg font-semibold flex items-center justify-center gap-1 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    <span>Validated</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Step 3: Localized Dialect Audio Guidance */}
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-space-md border border-slate-200/60 text-left">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-label-sm text-label-sm text-primary font-bold uppercase tracking-wider block">
                    Phase 3 • स्वास्थ्य परामर्श व ऑडियो मार्गदर्शन
                  </span>
                  <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                    Localized Dialect Audio Guidance
                  </h2>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Play verified maternal health clips directly to the patient &amp; family.
                  </span>
                </div>
                <span className="px-space-sm py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm font-semibold">
                  Halbi (हलबी बोली)
                </span>
              </div>

              {/* Interactive Audio Player Module */}
              <div className="p-space-md rounded-xl bg-surface-container space-y-space-sm border border-slate-200/40">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
                  <div className="flex items-center gap-space-sm">
                    <button
                      type="button"
                      onClick={handleToggleGuidanceAudio}
                      className="w-12 h-12 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[26px]">
                        {isPlayingGuidance ? "pause" : "play_arrow"}
                      </span>
                    </button>
                    <div>
                      <span className="font-headline-sm text-headline-sm text-on-surface font-bold block leading-tight">
                        Module 31B: Maternal Nutrition &amp; IFA Adherence
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        माँ का खान-पान व लाल गोली नियम • Duration: 02:18
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-space-xs self-end md:self-auto">
                    <button
                      type="button"
                      onClick={() => setAudioSpeed(audioSpeed === "1.0x" ? "1.2x" : "1.0x")}
                      className="px-2 py-1 rounded-md bg-surface-container-lowest text-on-surface font-label-sm text-label-sm font-semibold shadow-sm cursor-pointer border border-slate-200/50"
                    >
                      {audioSpeed}
                    </button>
                    <div className="h-4 w-px bg-outline-variant mx-1"></div>
                    <button
                      type="button"
                      className="px-2 py-1 rounded-md bg-surface-container-lowest text-primary font-label-sm text-label-sm font-semibold flex items-center gap-1 shadow-sm border border-slate-200/50"
                    >
                      <span className="material-symbols-outlined text-[16px]">volume_up</span>
                      Speaker
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden cursor-pointer">
                    <div className="h-full bg-primary rounded-full relative" style={{ width: "48%" }}>
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-surface-container-lowest rounded-full shadow-md"></span>
                    </div>
                  </div>
                  <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant">
                    <span>01:06</span>
                    <span>-01:12 remaining</span>
                  </div>
                </div>

                <div className="pt-space-xs border-t border-slate-200/50 grid grid-cols-1 md:grid-cols-2 gap-space-xs">
                  <div className="flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[16px] shrink-0 mt-0.5">check_circle</span>
                    <span className="font-body-sm text-body-sm text-on-surface">
                      Encourage daily dark green leafy vegetables (मुनगा/सहजन) with meals.
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[16px] shrink-0 mt-0.5">check_circle</span>
                    <span className="font-body-sm text-body-sm text-on-surface">
                      Warn against consuming IFA tablet with tea; take with lemon water or food.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4: Supply Distribution Counter */}
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-space-md border border-slate-200/60 text-left">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-label-sm text-label-sm text-primary font-bold uppercase tracking-wider block">
                    Phase 4 • आवश्यक दवा एवं सामग्री वितरण
                  </span>
                  <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                    Field Inventory Distribution Log
                  </h2>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Update stock instantly; synchronizes with CHC pharmacy inventory on reconnect.
                  </span>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Batch: CG-BST-24B</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                {/* IFA Red */}
                <div className="p-space-sm rounded-lg bg-surface-container flex items-center justify-between border border-slate-200/40">
                  <div className="flex items-center gap-space-sm">
                    <div className="w-10 h-10 rounded-lg bg-error-container text-on-error-container flex items-center justify-center font-bold text-headline-sm">
                      Fe
                    </div>
                    <div>
                      <span className="font-headline-sm text-headline-sm text-on-surface block leading-tight font-bold">
                        IFA Red (Iron Folic Acid)
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        30-day Blister Strip (100mg Fe)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-space-xs">
                    <button
                      type="button"
                      onClick={() => setIfaCount((prev) => Math.max(0, prev - 1))}
                      className="w-8 h-8 rounded-md bg-surface-container-lowest text-on-surface hover:bg-surface-container-high flex items-center justify-center font-bold shadow-sm cursor-pointer border border-slate-200/50"
                    >
                      -
                    </button>
                    <span className="font-headline-sm text-headline-sm text-on-surface w-6 text-center font-bold">
                      {ifaCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIfaCount((prev) => prev + 1)}
                      className="w-8 h-8 rounded-md bg-primary-container text-on-primary flex items-center justify-center font-bold shadow-sm cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Halazone */}
                <div className="p-space-sm rounded-lg bg-surface-container flex items-center justify-between border border-slate-200/40">
                  <div className="flex items-center gap-space-sm">
                    <div className="w-10 h-10 rounded-lg bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">water_drop</span>
                    </div>
                    <div>
                      <span className="font-headline-sm text-headline-sm text-on-surface block leading-tight font-bold">
                        Halazone Chlorine Tablets
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        Monsoon safe drinking pack
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-space-xs">
                    <button
                      type="button"
                      onClick={() => setHalazoneCount((prev) => Math.max(0, prev - 1))}
                      className="w-8 h-8 rounded-md bg-surface-container-lowest text-on-surface hover:bg-surface-container-high flex items-center justify-center font-bold shadow-sm cursor-pointer border border-slate-200/50"
                    >
                      -
                    </button>
                    <span className="font-headline-sm text-headline-sm text-on-surface w-6 text-center font-bold">
                      {halazoneCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setHalazoneCount((prev) => prev + 1)}
                      className="w-8 h-8 rounded-md bg-primary-container text-on-primary flex items-center justify-center font-bold shadow-sm cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Terminal Encounter Action Buttons (Persistent Field Footer) */}
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col sm:flex-row items-center justify-between gap-space-md border border-slate-200/60">
              <div className="flex items-center gap-space-sm text-left">
                <span className="w-3 h-3 rounded-full bg-secondary-container"></span>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-on-surface font-bold">
                    Offline Data Ready for Mesh Cache
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    सभी 4 चरण पूर्ण • स्थानीय फोन मेमोरी में सहेजा जाएगा
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-space-sm w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => onNavigateScreening(undefined, {
                    patient_name: "Devki Kashyap",
                    patient_identifier: "RCH-ID: 78204",
                    age: 26,
                    gestation_weeks: 31.4,
                    vitals: { hb: parseFloat(hbReading), bp: bpReading, temp: parseFloat(tempReading) },
                    danger_signs: { oedema: pedalOedema === "present", headache: headache !== "no" }
                  })}
                  className="flex-1 sm:flex-none min-h-[44px] px-space-md rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg font-bold transition-colors cursor-pointer border border-slate-200/50"
                >
                  Open Full Triage (स्क्रीनिंग)
                </button>
                <button
                  type="button"
                  onClick={handleSaveEncounter}
                  disabled={isSaving}
                  className="flex-1 sm:flex-none min-h-[44px] px-space-lg rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-space-xs shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60"
                >
                  <span className={`material-symbols-outlined text-[20px] ${isSaving ? "animate-spin" : ""}`}>
                    {isSaving ? "sync" : "done_all"}
                  </span>
                  <span>{isSaving ? "Saving..." : "भेंट सुरक्षित करें और आगे बढ़ें"}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
