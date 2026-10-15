import React, { useState, useEffect, useCallback } from "react";
import { enqueueOfflineItem, isDeviceOnline, getQueueSummary } from "../services/offlineSync";

interface ScreeningRiskTriageProps {
  authToken: string | null;
  encounterId?: number;
  initialPatientData?: any;
  selectedLocation: {
    district_id: string;
    block_id: string;
    village_id: string;
    district_name?: string;
    block_name?: string;
    village_name?: string;
    breadcrumb: string;
  };
  onBack: () => void;
  onNavigateReferrals?: () => void;
}

export const ScreeningRiskTriage: React.FC<ScreeningRiskTriageProps> = ({
  authToken,
  encounterId: _encounterId,
  initialPatientData,
  selectedLocation: _selectedLocation,
  onBack,
  onNavigateReferrals,
}) => {
  const [triageMode, setTriageMode] = useState<"standard" | "highrisk">("standard");
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioSpeed, setAudioSpeed] = useState<string>("1.0x");
  const [referralDispatched, setReferralDispatched] = useState<boolean>(false);
  const [choConsultActive, setChoConsultActive] = useState<boolean>(false);
  const [emergency108Handover, setEmergency108Handover] = useState<boolean>(false);

  // Vitals measurements
  const [hb] = useState<number>(initialPatientData?.vitals?.hb || 8.1);
  const [bp] = useState<string>(initialPatientData?.vitals?.bp || "112/74");
  const [rbs] = useState<number>(104);
  const [pulse] = useState<number>(82);
  const [spo2] = useState<number>(98);
  const [temp] = useState<number>(initialPatientData?.vitals?.temp || 98.4);
  const [weight] = useState<number>(49.5);
  const [muac] = useState<number>(23.2);
  const [malariaRdt] = useState<"Negative" | "Positive">("Negative");

  // Danger signs flags
  const [vaginalBleeding, setVaginalBleeding] = useState<boolean>(false);
  const [severeHeadache, setSevereHeadache] = useState<boolean>(false);
  const [convulsions, setConvulsions] = useState<boolean>(false);
  const [reducedKicks, setReducedKicks] = useState<boolean>(false);
  const [pedalOedema, setPedalOedema] = useState<boolean>(true);
  const [feverChills] = useState<boolean>(false);
  const [stridor] = useState<boolean>(false);

  // Dynamic triage response
  const [triageData, setTriageData] = useState<any>(null);

  const calculateTriage = useCallback(async () => {
    const payload = {
      patient_name: initialPatientData?.patient_name || "Devki Kashyap",
      patient_identifier: initialPatientData?.patient_identifier || "ABHA-CG-8842-9102",
      age: initialPatientData?.age || 26,
      gender: "Female",
      gestation_weeks: initialPatientData?.gestation_weeks || 31.0,
      mode: triageMode,
      vitals: {
        hb,
        bp,
        rbs,
        pulse,
        spo2,
        temp,
        weight,
        muac,
        malaria_rdt: malariaRdt,
      },
      danger_signs: {
        vaginal_bleeding: vaginalBleeding,
        severe_headache_vision: severeHeadache,
        convulsions_fits: convulsions,
        reduced_foetal_movement: reducedKicks,
        pedal_oedema: pedalOedema,
        fever_chills: feverChills,
        stridor_dyspnea: stridor,
      },
      submission_token: `triage_${Date.now()}`,
    };

    if (isDeviceOnline()) {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

        const res = await fetch("http://127.0.0.1:8000/employee/screenings", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          setTriageData(data);
          return;
        }
      } catch {
        // Fallback to local heuristic
      }
    }

    // Local fallback calculation matching backend rule engine
    const isHighRiskObstetric = (payload.gestation_weeks >= 28 && hb < 9.0) || vaginalBleeding || convulsions;
    const score = isHighRiskObstetric ? 68 : 38;

    setTriageData({
      risk_category: isHighRiskObstetric ? "High" : "Moderate",
      composite_risk_score: score,
      dual_validation: {
        tier_a: {
          title: "Tier A: NHM Bastar Rule-Based Protocol",
          badge: "Authoritative Statutory",
          escalation: isHighRiskObstetric
            ? "Escalation: Tier-2 Sub-Divisional Referral (CHC Jagdalpur)"
            : "Standard Routine Follow-up",
          trigger_condition: isHighRiskObstetric
            ? `Gestational Age ≥28w (31w) combined with Digital Hb <9.0 g/dL (${hb} g/dL) requires mandatory Gynaecologist ultrasound scan within 72h.`
            : "Vitals within standard monitoring thresholds for field check.",
          sop_reference: "Standard Operating Procedure #MCH-CG-04 complies",
          compliant: true,
        },
        tier_b: {
          title: "Tier B: Micro-Climate & Cluster ML Index",
          badge: "Heuristic Signal",
          composite_score: score,
          score_label: `${score}/100`,
          status_label: "Elevated Monitoring",
          model_version: "v2.4-TribalMesh (ICMR / AIIMS Raipur Algorithmic Sandbox)",
        },
      },
      feature_weights: [
        {
          factor: `Gestational Age (31w) + Persistent Low Hb (${hb} g/dL)`,
          weight: "+42% Weight",
          color: "primary",
          note: "Strongest clinical indicator toward Sonology & Parenteral Iron therapy",
        },
        {
          factor: "Vector Canopy Humidity in Sector 4 (88% RH)",
          weight: "+18% Weight",
          color: "tertiary",
          note: "Localised micro-climate indicates elevated Plasmodium falciparum transmission hazard",
        },
        {
          factor: "Absence of Neurological or Convulsive Symptoms",
          weight: "-25% De-escalation",
          color: "secondary",
          note: "Keeps care inside scheduled CHC transit rather than critical 108 trauma bypass",
        },
      ],
      prescribed_pathway: {
        specialist_consultation: {
          title: "Gynaecology Consultation",
          provider: "Dr. Suniti Baghel",
          designation: "Senior Medical Officer & Obstetrician • Jagdalpur CHC",
          slot: "Thursday 09:15 AM (Pre-allocated #14)",
        },
        transit_logistics: {
          service: "102 Mahtari Express",
          node: "Scheduled pickup from Sector 4 Karanji Hamlet node",
          window: "Thursday 08:00 AM (Driver: Mahendra T.)",
        },
        pre_requisitioned_diagnostics: [
          "Automated Complete Haemogram (CBC) + Serum Ferritin",
          "Foetal Ultrasound Biometry & Placental Localization",
        ],
        pharmacotherapy_nutrition: [
          "Double-Dose IFA (Iron 100mg + Folic Acid 500mcg BID)",
          "Halazone water purification tablets (Monsoon supply)",
        ],
      },
    });
  }, [
    initialPatientData,
    triageMode,
    hb,
    bp,
    rbs,
    pulse,
    spo2,
    temp,
    weight,
    muac,
    malariaRdt,
    vaginalBleeding,
    severeHeadache,
    convulsions,
    reducedKicks,
    pedalOedema,
    feverChills,
    stridor,
    authToken,
  ]);

  useEffect(() => {
    calculateTriage();
  }, [calculateTriage]);

  const handleToggleVoice = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      if (isPlayingAudio) {
        window.speechSynthesis.cancel();
        setIsPlayingAudio(false);
      } else {
        const text =
          "देवकी कश्यप, गर्भ 31 सप्ताह। हीमोग्लोबिन 8.1 ग्राम होने के कारण मध्यम एनीमिया दर्ज किया गया है। सामुदायिक स्वास्थ्य केंद्र जगदलपुर में डॉक्टर सुनीति बघेल से जांच कराने की अनुशंसा की गई है।";
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = "hi-IN";
        utter.rate = audioSpeed === "1.2x" ? 1.2 : 0.95;
        utter.onend = () => setIsPlayingAudio(false);
        utter.onerror = () => setIsPlayingAudio(false);
        window.speechSynthesis.speak(utter);
        setIsPlayingAudio(true);
      }
    } else {
      setIsPlayingAudio(!isPlayingAudio);
    }
  };

  const handleConfirmReferral = () => {
    setReferralDispatched(true);
    if (!isDeviceOnline()) {
      enqueueOfflineItem({
        type: "screening_triage",
        endpoint: "http://127.0.0.1:8000/employee/screenings",
        method: "POST",
        payload: {
          patient_name: "Devki Kashyap",
          referral_action: "Tier-2 CHC Dispatch",
          timestamp: new Date().toISOString(),
        },
        authToken,
        status: "saved",
        label: "Referral Slip: Devki Kashyap (CHC Jagdalpur)",
      });
    }
    setTimeout(() => {
      if (onNavigateReferrals) {
        onNavigateReferrals();
      }
    }, 1800);
  };

  const handle108Emergency = () => {
    const ok = window.confirm("Bypass standard transit and trigger critical 108 Emergency Handover?");
    if (ok) {
      setEmergency108Handover(true);
      setTimeout(() => setEmergency108Handover(false), 5000);
    }
  };

  const syncStats = getQueueSummary();

  return (
    <div className="w-full bg-surface text-on-surface min-h-screen font-body-md text-body-md antialiased pb-16">
      <div className="flex flex-col w-full space-y-6 px-margin lg:px-margin-desktop py-space-md max-w-[1440px] mx-auto">
        
        {/* Navigation Breadcrumb Bar */}
        <div className="flex flex-wrap items-center justify-between gap-space-md pt-2">
          <div className="flex items-center gap-space-sm text-body-sm text-on-surface-variant flex-wrap">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1 text-primary hover:text-on-primary-fixed-variant font-semibold cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>वापस जाएं (Back)</span>
            </button>
            <span>/</span>
            <span className="flex items-center gap-1 font-label-sm uppercase tracking-wider text-primary font-bold">
              <span className="material-symbols-outlined text-[16px]">verified_user</span>
              Tribal Health Portal
            </span>
            <span>/</span>
            <span>Bastar Division</span>
            <span>/</span>
            <span className="text-on-surface font-bold">
              Screening &amp; Explainable Risk Triage (जांच एवं जोखिम वर्गीकरण)
            </span>
          </div>

          {/* Mode Selector & Live Status Pills */}
          <div className="flex items-center gap-space-sm">
            <div className="inline-flex p-1 rounded-xl bg-surface-container shadow-inner border border-slate-200/60">
              <button
                type="button"
                onClick={() => setTriageMode("standard")}
                className={`px-space-md py-1.5 rounded-lg font-label-md text-label-md font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  triageMode === "standard"
                    ? "bg-surface-container-lowest text-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">checklist</span>
                Standard Screening
              </button>
              <button
                type="button"
                onClick={() => setTriageMode("highrisk")}
                className={`px-space-md py-1.5 rounded-lg font-label-md text-label-md font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  triageMode === "highrisk"
                    ? "bg-surface-container-lowest text-error shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">emergency</span>
                High-Risk Protocol Review
                <span className="w-2 h-2 rounded-full bg-error animate-ping"></span>
              </button>
            </div>

            <div className="hidden md:flex items-center gap-1.5 px-space-md py-1.5 rounded-lg bg-surface-container-low text-on-surface font-label-sm text-label-sm border border-slate-200/40">
              <span className="w-2 h-2 rounded-full bg-primary-container"></span>
              <span>Mesh Offline Buffer: <strong>{syncStats.saved + syncStats.queued} queued</strong></span>
            </div>
          </div>
        </div>

        {/* Confirmation Notifications */}
        {referralDispatched && (
          <div className="p-3 bg-emerald-700 text-white rounded-xl shadow flex items-center justify-between text-sm font-bold">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined">send</span>
              <span>रेफरल पर्ची जारी: CHC Jagdalpur Referral Slip dispatched for Devki Kashyap (Slot: Thursday 09:15 AM).</span>
            </div>
          </div>
        )}

        {emergency108Handover && (
          <div className="p-3 bg-red-600 text-white rounded-xl shadow flex items-center justify-between text-sm font-bold">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined">e911_emergency</span>
              <span>108 Emergency Handover Triggered. Nearest ambulance unit redirected to Sector 4 Hamlet.</span>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* PATIENT CONTEXT & VITAL TRIAGE BANNER (BENTO GROUNDING)       */}
        {/* ============================================================ */}
        <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm border border-slate-200/60 text-left">
          <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-gradient-to-br from-primary-fixed/30 to-transparent blur-3xl pointer-events-none"></div>
          
          <div className="p-space-lg">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg">
              {/* Left: Patient Identity */}
              <div className="flex items-start gap-space-md min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 rounded-xl bg-primary-container text-on-primary flex items-center justify-center font-display-lg text-display-lg shadow-sm font-bold">
                    DK
                  </div>
                  <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-secondary-container text-on-secondary-container font-label-sm text-label-sm uppercase font-bold">
                    ANC 3
                  </span>
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-space-sm gap-y-1">
                    <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
                      Devki Kashyap <span className="font-normal text-on-surface-variant text-headline-md font-label-lg">(देवकी कश्यप)</span>
                    </h1>
                    <span className="px-space-sm py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-bold tracking-wide flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">warning</span>
                      MODERATE ANEMIA PROTOCOL
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-space-md gap-y-1 text-body-sm text-on-surface-variant">
                    <span><strong>ABHA:</strong> ABHA-CG-8842-9102</span>
                    <span>•</span>
                    <span>26 Yrs / Female</span>
                    <span>•</span>
                    <span className="text-primary font-bold">31 Weeks Gestation (EDD: 18 Nov)</span>
                    <span>•</span>
                    <span>Sector 4 Hamlet, Karanji Sub-center, Bastar</span>
                  </div>
                  <div className="flex items-center gap-space-sm pt-1 text-label-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-primary">person_check</span>
                    <span>Field Record by: <strong>Mitanin Asha Poyam (ID: MIT-774)</strong></span>
                    <span>•</span>
                    <span>Logged: Today, 08:45 AM (Mesh Relay Verified)</span>
                  </div>
                </div>
              </div>

              {/* Right: Audio Quick Player & Language Translation Badge */}
              <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-space-sm flex-shrink-0">
                <div className="flex items-center gap-2 p-2 rounded-xl bg-surface-container-low shadow-sm border border-slate-200/40">
                  <button
                    type="button"
                    onClick={handleToggleVoice}
                    className="w-10 h-10 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shadow-md hover:bg-primary transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[24px]">
                      {isPlayingAudio ? "pause" : "volume_up"}
                    </span>
                  </button>
                  <div className="flex flex-col pr-space-sm text-left">
                    <span className="font-label-sm text-label-sm text-on-surface font-bold flex items-center gap-1">
                      Voice Guidance (आवाज़ में सारांश)
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Halbi / Chhattisgarhi Dialect Sync</span>
                  </div>
                  <div className="flex items-center gap-1 border-l pl-2 border-outline-variant/30">
                    <button
                      type="button"
                      onClick={() => setAudioSpeed(audioSpeed === "1.0x" ? "1.2x" : "1.0x")}
                      className="px-2 py-1 rounded font-label-sm text-label-sm bg-surface-container-lowest text-on-surface font-bold cursor-pointer border border-slate-200/50"
                    >
                      {audioSpeed}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-label-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px] text-secondary">wifi_tethering</span>
                  <span>Relayed via: Tokapal Solar LoRa Base 03</span>
                </div>
              </div>
            </div>

            {/* Point-of-Care Vitals Metric Grid (7 cells) */}
            <div className="mt-space-lg grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-space-sm">
              {/* Digital Hb */}
              <div className="p-space-sm rounded-lg bg-error-container/40 flex flex-col justify-between border border-red-200/50 text-left">
                <div className="flex items-center justify-between text-on-error-container">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider font-bold">Digital Hb</span>
                  <span className="material-symbols-outlined text-[16px]">bloodtype</span>
                </div>
                <div className="my-1">
                  <div className="font-display-lg text-headline-lg font-bold text-on-error-container leading-none">{hb}</div>
                  <span className="font-label-sm text-label-sm text-on-error-container font-medium">g/dL • Moderate Anemia</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-on-error-container font-medium">
                  <span className="material-symbols-outlined text-[12px]">trending_flat</span> Prior: 8.3 g/dL
                </div>
              </div>

              {/* Blood Pressure */}
              <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col justify-between border border-slate-200/40 text-left">
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider font-bold">BP (mmHg)</span>
                  <span className="material-symbols-outlined text-[16px] text-primary">cardiology</span>
                </div>
                <div className="my-1">
                  <div className="font-headline-lg text-headline-lg font-bold text-on-surface leading-none">{bp}</div>
                  <span className="font-label-sm text-label-sm text-primary font-bold">Normotensive</span>
                </div>
                <div className="text-[10px] text-on-surface-variant font-medium">Target &lt;130/85</div>
              </div>

              {/* RBS */}
              <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col justify-between border border-slate-200/40 text-left">
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider font-bold">RBS (Sugar)</span>
                  <span className="material-symbols-outlined text-[16px] text-primary">water_drop</span>
                </div>
                <div className="my-1">
                  <div className="font-headline-lg text-headline-lg font-bold text-on-surface leading-none">{rbs}</div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">mg/dL • Non-fasting</span>
                </div>
                <div className="text-[10px] text-primary font-bold">Within Normal Limits</div>
              </div>

              {/* Pulse / SpO2 */}
              <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col justify-between border border-slate-200/40 text-left">
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider font-bold">Pulse / SpO₂</span>
                  <span className="material-symbols-outlined text-[16px] text-primary">vital_signs</span>
                </div>
                <div className="my-1">
                  <div className="font-headline-lg text-headline-lg font-bold text-on-surface leading-none">
                    {pulse} <span className="font-label-md text-label-md font-normal text-on-surface-variant">bpm</span>
                  </div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">{spo2}% Oxygen Sat.</span>
                </div>
                <div className="text-[10px] text-primary font-bold">Regular Rhythm</div>
              </div>

              {/* Temperature */}
              <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col justify-between border border-slate-200/40 text-left">
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider font-bold">Body Temp</span>
                  <span className="material-symbols-outlined text-[16px] text-primary">device_thermostat</span>
                </div>
                <div className="my-1">
                  <div className="font-headline-lg text-headline-lg font-bold text-on-surface leading-none">{temp}°F</div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Afebrile</span>
                </div>
                <div className="text-[10px] text-primary font-bold">No Pyrexia logged</div>
              </div>

              {/* Weight / MUAC */}
              <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col justify-between border border-slate-200/40 text-left">
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider font-bold">Weight / MUAC</span>
                  <span className="material-symbols-outlined text-[16px] text-primary">scale</span>
                </div>
                <div className="my-1">
                  <div className="font-headline-lg text-headline-lg font-bold text-on-surface leading-none">
                    {weight} <span className="font-label-md text-label-md font-normal text-on-surface-variant">kg</span>
                  </div>
                  <span className="font-label-sm text-label-sm text-primary font-bold">+0.9 kg (Past 28d)</span>
                </div>
                <div className="text-[10px] text-on-surface-variant">MUAC: {muac} cm (Normal)</div>
              </div>

              {/* Malaria RDT */}
              <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col justify-between border border-slate-200/40 text-left">
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider font-bold">Malaria RDT</span>
                  <span className="material-symbols-outlined text-[16px] text-primary">biotech</span>
                </div>
                <div className="my-1">
                  <div className="font-headline-md text-headline-md font-bold text-primary leading-tight">{malariaRdt}</div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Pf / Pv Dual Cassette</span>
                </div>
                <div className="text-[10px] text-primary font-bold">Batch #CG-MAL-992</div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* MAIN 2-COLUMN OPERATIONAL GRID (7 COLS LEFT / 5 COLS RIGHT)  */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg">
          
          {/* LEFT 7 COLS: Actionable Danger Sign Checklist */}
          <div className="xl:col-span-7 space-y-space-md">
            <div className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm space-y-space-md border border-slate-200/60 text-left">
              <div className="flex flex-wrap items-center justify-between gap-space-sm pb-space-sm border-b border-surface-container">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-primary text-[22px]">health_and_safety</span>
                    <h2 className="font-headline-md text-headline-md font-bold text-on-surface">
                      Frontline Danger Signs Protocol
                    </h2>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    खतरे के लक्षण जांच • Immediate rule-out mandated by NHM Bastar field protocol
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded bg-surface-container-high font-label-sm text-label-sm text-on-surface font-bold">
                    3 Categories • 8 Markers Checked
                  </span>
                </div>
              </div>

              {/* CATEGORY 1: Maternal & Obstetric */}
              <div className="space-y-space-xs">
                <div className="flex items-center justify-between px-space-xs py-1">
                  <span className="font-label-md text-label-md font-bold text-primary uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary-container"></span>
                    1. Maternal &amp; Obstetric Flags (मातृ एवं प्रसव संबंधी लक्षण)
                  </span>
                  <span className="font-label-sm text-label-sm text-primary font-bold">1 Observation Noted</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-space-xs">
                  {/* Danger 1: Bleeding */}
                  <label className="p-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors flex items-start gap-space-sm cursor-pointer border border-slate-200/40">
                    <input
                      type="checkbox"
                      checked={vaginalBleeding}
                      onChange={(e) => setVaginalBleeding(e.target.checked)}
                      className="mt-1 w-4 h-4 text-primary rounded"
                    />
                    <div className="space-y-0.5 text-body-sm">
                      <span className="font-bold text-on-surface block">Vaginal Bleeding (रक्तस्राव)</span>
                      <span className="text-on-surface-variant text-[11px]">Any active spotting or heavy antepartum haemorrhage</span>
                    </div>
                    <span className={`ml-auto px-1.5 py-0.5 rounded font-label-sm text-[10px] uppercase font-bold ${
                      vaginalBleeding ? "bg-error text-white" : "bg-surface-container text-on-surface-variant"
                    }`}>
                      {vaginalBleeding ? "Present" : "Absent"}
                    </span>
                  </label>

                  {/* Danger 2: Severe Headache */}
                  <label className="p-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors flex items-start gap-space-sm cursor-pointer border border-slate-200/40">
                    <input
                      type="checkbox"
                      checked={severeHeadache}
                      onChange={(e) => setSevereHeadache(e.target.checked)}
                      className="mt-1 w-4 h-4 text-primary rounded"
                    />
                    <div className="space-y-0.5 text-body-sm">
                      <span className="font-bold text-on-surface block">Severe Headache / Blurry Vision</span>
                      <span className="text-on-surface-variant text-[11px]">Signs of Pre-eclampsia or scotoma</span>
                    </div>
                    <span className={`ml-auto px-1.5 py-0.5 rounded font-label-sm text-[10px] uppercase font-bold ${
                      severeHeadache ? "bg-error text-white" : "bg-surface-container text-on-surface-variant"
                    }`}>
                      {severeHeadache ? "Present" : "Absent"}
                    </span>
                  </label>

                  {/* Danger 3: Convulsions */}
                  <label className="p-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors flex items-start gap-space-sm cursor-pointer border border-slate-200/40">
                    <input
                      type="checkbox"
                      checked={convulsions}
                      onChange={(e) => setConvulsions(e.target.checked)}
                      className="mt-1 w-4 h-4 text-primary rounded"
                    />
                    <div className="space-y-0.5 text-body-sm">
                      <span className="font-bold text-on-surface block">Convulsions / Fits (दौरे पड़ना)</span>
                      <span className="text-on-surface-variant text-[11px]">Eclamptic seizures or neuromuscular twitching</span>
                    </div>
                    <span className={`ml-auto px-1.5 py-0.5 rounded font-label-sm text-[10px] uppercase font-bold ${
                      convulsions ? "bg-error text-white" : "bg-surface-container text-on-surface-variant"
                    }`}>
                      {convulsions ? "Present" : "Absent"}
                    </span>
                  </label>

                  {/* Danger 4: Reduced Kicks */}
                  <label className="p-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors flex items-start gap-space-sm cursor-pointer border border-slate-200/40">
                    <input
                      type="checkbox"
                      checked={reducedKicks}
                      onChange={(e) => setReducedKicks(e.target.checked)}
                      className="mt-1 w-4 h-4 text-primary rounded"
                    />
                    <div className="space-y-0.5 text-body-sm">
                      <span className="font-bold text-on-surface block">Reduced Foetal Movement</span>
                      <span className="text-on-surface-variant text-[11px]">Gestation &gt;28w: &lt;10 kicks over 12 hour cycle</span>
                    </div>
                    <span className={`ml-auto px-1.5 py-0.5 rounded font-label-sm text-[10px] uppercase font-bold ${
                      reducedKicks ? "bg-error text-white" : "bg-surface-container text-on-surface-variant"
                    }`}>
                      {reducedKicks ? "Low" : "Norm (12/d)"}
                    </span>
                  </label>

                  {/* Danger 5: Mild Pedal Oedema (Flagged) */}
                  <label className="md:col-span-2 p-space-sm rounded-lg bg-tertiary-fixed/30 border-l-4 border-tertiary-container flex items-start gap-space-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pedalOedema}
                      onChange={(e) => setPedalOedema(e.target.checked)}
                      className="mt-1 w-4 h-4 text-tertiary rounded"
                    />
                    <div className="space-y-0.5 text-body-sm flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-on-tertiary-container">Mild Pedal Oedema (पैरों में हल्की सूजन)</span>
                        <span className="px-1.5 py-0.5 rounded bg-tertiary-container text-on-tertiary font-label-sm text-[10px] uppercase font-bold">
                          Flagged for Follow-up
                        </span>
                      </div>
                      <span className="text-on-surface-variant text-[12px]">
                        Pitting oedema 1+ detected in ankles bilaterally. No facial or hand puffiness. BP stable at {bp}.
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-tertiary-container text-[20px]">priority_high</span>
                  </label>
                </div>
              </div>

              {/* CATEGORY 2: Febrile & Malaria Condition */}
              <div className="space-y-space-xs pt-space-xs">
                <div className="flex items-center justify-between px-space-xs py-1">
                  <span className="font-label-md text-label-md font-bold text-primary uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-secondary-container"></span>
                    2. Infectious &amp; Febrile Conditions (संक्रामक एवं बुखार लक्षण)
                  </span>
                  <span className="font-label-sm text-label-sm text-primary font-bold">All Ruled Out</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-space-xs">
                  <div className="p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between border border-slate-200/40">
                    <div className="text-body-sm">
                      <span className="font-bold text-on-surface">Fever &gt;3 Days / Chills</span>
                      <span className="block text-on-surface-variant text-[11px]">Malaria / Dengue / Scrub Typhus query</span>
                    </div>
                    <span className="text-primary font-label-sm text-label-sm font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span> Nil
                    </span>
                  </div>

                  <div className="p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between border border-slate-200/40">
                    <div className="text-body-sm">
                      <span className="font-bold text-on-surface">Stridor / Dyspnea at Rest</span>
                      <span className="block text-on-surface-variant text-[11px]">Resp rate &gt;24 or chest indrawing</span>
                    </div>
                    <span className="text-primary font-label-sm text-label-sm font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span> Nil (RR 18)
                    </span>
                  </div>
                </div>
              </div>

              {/* Mitanin Protocol Attestation */}
              <div className="p-space-sm rounded-lg bg-surface-container flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm border border-slate-200/50">
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-primary text-[22px]">draw</span>
                  <div className="space-y-0.5">
                    <span className="font-label-md text-label-md font-bold text-on-surface">
                      Digital Protocol Attestation (हस्ताक्षर)
                    </span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Validated on biometric thumbprint cache • Token #BT-9021
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded bg-surface-container-lowest text-primary font-label-sm text-label-sm font-bold shadow-sm border border-slate-200/60">
                    Mitanin Asha Poyam (Verified)
                  </span>
                </div>
              </div>
            </div>

            {/* Prescribed Actionable Clinical Pathway Card */}
            <div className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm space-y-space-md border border-slate-200/60 text-left">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">local_hospital</span>
                    Prescribed Actionable Clinical Pathway
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Automated task cascade generated for Jagdalpur Block CHC
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm font-bold">
                  TIER-2 REFERRAL ACTIVE
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                {/* Specialist Booking */}
                <div className="p-space-sm rounded-lg bg-surface-container-low space-y-1 border border-slate-200/40">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm font-bold uppercase text-primary">Gynaecology Consultation</span>
                    <span className="material-symbols-outlined text-primary text-[18px]">calendar_month</span>
                  </div>
                  <div className="font-headline-sm text-headline-sm text-on-surface font-bold">Dr. Suniti Baghel</div>
                  <p className="text-body-sm text-on-surface-variant">Senior Medical Officer &amp; Obstetrician • Jagdalpur CHC</p>
                  <div className="text-label-sm text-secondary font-bold pt-1">
                    Slot: Thursday 09:15 AM (Pre-allocated #14)
                  </div>
                </div>

                {/* Transit Logistics */}
                <div className="p-space-sm rounded-lg bg-surface-container-low space-y-1 border border-slate-200/40">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm font-bold uppercase text-primary">Scheduled Patient Transit</span>
                    <span className="material-symbols-outlined text-primary text-[18px]">directions_car</span>
                  </div>
                  <div className="font-headline-sm text-headline-sm text-on-surface font-bold">102 Mahtari Express</div>
                  <p className="text-body-sm text-on-surface-variant">Scheduled pickup from Sector 4 Karanji Hamlet node</p>
                  <div className="text-label-sm text-on-surface font-bold pt-1">
                    Pickup window: Thursday 08:00 AM (Driver: Mahendra T.)
                  </div>
                </div>

                {/* Pre-Requisitioned Diagnostics */}
                <div className="p-space-sm rounded-lg bg-surface-container-low space-y-1 border border-slate-200/40">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm font-bold uppercase text-primary">Pre-Requisitioned Diagnostics</span>
                    <span className="material-symbols-outlined text-primary text-[18px]">biotech</span>
                  </div>
                  <ul className="text-body-sm text-on-surface space-y-1 font-medium">
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                      <span>Automated Complete Haemogram (CBC) + Serum Ferritin</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                      <span>Foetal Ultrasound Biometry &amp; Placental Localization</span>
                    </li>
                  </ul>
                </div>

                {/* Pharmacotherapy */}
                <div className="p-space-sm rounded-lg bg-surface-container-low space-y-1 border border-slate-200/40">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm font-bold uppercase text-primary">Nutrition &amp; Pharmacotherapy</span>
                    <span className="material-symbols-outlined text-primary text-[18px]">medication</span>
                  </div>
                  <ul className="text-body-sm text-on-surface space-y-1 font-medium">
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                      <span>Double-Dose IFA (Iron 100mg + Folic Acid 500mcg BID)</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                      <span>Halazone water purification tablets (Monsoon supply)</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Action CTAs Bar */}
              <div className="pt-space-sm border-t border-surface-container flex flex-wrap items-center justify-between gap-space-sm">
                <div className="flex flex-wrap items-center gap-space-sm">
                  <button
                    type="button"
                    onClick={handleConfirmReferral}
                    className="px-space-md py-2.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md font-bold shadow-md hover:bg-primary transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">send</span>
                    <span>Confirm Triage &amp; Dispatch Referral Slip (रेफरल पर्ची जारी करें)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setChoConsultActive(true);
                      alert("Connecting CHO Tele-Consult bridge with Jagdalpur CHC...");
                    }}
                    className="px-space-md py-2.5 rounded-lg bg-primary-fixed text-on-primary-fixed-variant font-label-md text-label-md font-bold hover:bg-primary-fixed-dim transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">video_call</span>
                    <span>{choConsultActive ? "CHO Bridge Connected" : "CHO Tele-Consult (ऑडियो-वीडियो)"}</span>
                  </button>
                </div>

                <div className="flex items-center gap-space-sm">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="p-2.5 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-all cursor-pointer border border-slate-200/50"
                    title="Print/Export Slip"
                  >
                    <span className="material-symbols-outlined text-[20px]">print</span>
                  </button>
                  <button
                    type="button"
                    onClick={handle108Emergency}
                    className="px-space-md py-2.5 rounded-lg bg-error text-on-error font-label-md text-label-md font-bold shadow-md hover:bg-on-error-container transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">emergency_share</span>
                    <span>108 Emergency Handover</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT 5 COLS: Explainable Risk Triage Panel */}
          <div className="xl:col-span-5 space-y-space-md">
            
            {/* MANDATORY REGULATORY SAFETY DISCLAIMER (High Contrast Badge) */}
            <div className="p-space-md rounded-xl bg-surface-container-highest border-l-4 border-outline text-on-surface space-y-2 shadow-sm text-left">
              <div className="flex items-center gap-2 text-on-surface font-label-md text-label-md font-bold uppercase tracking-wider">
                <span className="material-symbols-outlined text-[20px] text-primary">policy</span>
                Model Disclaimer &amp; Regulatory Notice
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                The experimental vector, micro-climate, and symptom risk indices displayed below are <strong>decision-support heuristics</strong> derived from aggregate epidemiological patterns and remote telemetry. <strong>They DO NOT constitute a standalone clinical diagnosis or medical clearance.</strong> Statutory National Health Mission (NHM) clinical protocols and direct Medical Officer / CHO physical examination supersede all algorithmic recommendations.
              </p>
              <div className="flex items-center justify-between text-[11px] text-on-surface-variant pt-1 font-semibold">
                <span>ICMR &amp; AIIMS Raipur Algorithmic Sandbox</span>
                <span className="text-primary font-bold">v2.4-TribalMesh</span>
              </div>
            </div>

            {/* TWO-TIER TRIAGE CARD */}
            <div className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm space-y-space-md border border-slate-200/60 text-left">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm uppercase font-bold text-primary tracking-wider">
                    Dual Validation Engine
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-bold">
                    Audit Synchronized
                  </span>
                </div>
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface">
                  Two-Tier Triage Framework
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Parallel verification between Rule-Based National Guidelines and Predictive Heuristics
                </p>
              </div>

              {/* Tier A: Statutory Rule-Based Guideline (Primary) */}
              <div className="p-space-md rounded-xl bg-surface-container-low space-y-2 border-l-4 border-primary border border-slate-200/40">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm font-bold uppercase text-primary flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    Tier A: NHM Bastar Rule-Based Protocol
                  </span>
                  <span className="px-2 py-0.5 rounded bg-surface-container-highest text-on-surface font-label-sm text-label-sm font-bold">
                    Authoritative
                  </span>
                </div>
                <div className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  {triageData?.dual_validation?.tier_a?.escalation || "Escalation: Tier-2 Sub-Divisional Referral"}
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  <strong>Condition Trigger:</strong> {triageData?.dual_validation?.tier_a?.trigger_condition || "Gestational Age ≥28w combined with Digital Hb <9.0 g/dL requires mandatory Gynaecologist ultrasound scan within 72h."}
                </p>
                <div className="flex items-center gap-2 pt-1 text-label-sm text-primary font-bold">
                  <span className="material-symbols-outlined text-[16px]">rule</span>
                  {triageData?.dual_validation?.tier_a?.sop_reference || "Standard Operating Procedure #MCH-CG-04 complies"}
                </div>
              </div>

              {/* Tier B: Predictive Decision Support Heuristic */}
              <div className="p-space-md rounded-xl bg-surface-container-low space-y-2 border-l-4 border-secondary-container border border-slate-200/40">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm font-bold uppercase text-secondary flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">neurology</span>
                    Tier B: Micro-Climate &amp; Cluster ML Index
                  </span>
                  <span className="px-2 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm font-bold">
                    Heuristic Signal
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Composite Risk Score: {triageData?.composite_risk_score || 68}/100
                  </div>
                  <span className="font-label-sm text-label-sm text-tertiary-container font-bold">
                    Elevated Monitoring
                  </span>
                </div>

                {/* Feature Influence Weights Breakdown */}
                <div className="space-y-2.5 pt-2">
                  <span className="font-label-sm text-label-sm text-on-surface font-bold block">
                    Explainability &amp; Feature Influence Weights:
                  </span>

                  {(triageData?.feature_weights || []).map((feat: any, idx: number) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-body-sm">
                        <span className="text-on-surface font-medium">{feat.factor}</span>
                        <span className={`font-bold ${feat.color === "primary" ? "text-primary" : feat.color === "tertiary" ? "text-tertiary" : "text-secondary"}`}>
                          {feat.weight}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                        <div
                          className={`h-2 rounded-full ${
                            feat.color === "primary"
                              ? "bg-primary-container"
                              : feat.color === "tertiary"
                              ? "bg-tertiary-container"
                              : "bg-secondary-container"
                          }`}
                          style={{
                            width: feat.weight.includes("42") ? "42%" : feat.weight.includes("18") ? "18%" : "25%",
                          }}
                        ></div>
                      </div>
                      <span className="text-[11px] text-on-surface-variant block">{feat.note}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Field Evidence & Hamlet Context Visualizer */}
            <div className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm space-y-space-md border border-slate-200/60 text-left">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    Sector 4 Hamlet Environmental Telemetry
                  </h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Weather, water source testing &amp; terrain access index
                  </p>
                </div>
                <span className="material-symbols-outlined text-primary text-[24px]">forest</span>
              </div>

              <div className="p-space-md rounded-lg bg-surface-container-low flex items-center justify-between border border-slate-200/40">
                <div className="flex items-center gap-space-md">
                  <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-primary shrink-0 font-bold">
                    <span className="material-symbols-outlined text-[24px]">explore</span>
                  </div>
                  <div className="space-y-0.5 text-left">
                    <span className="font-label-md text-label-md font-bold text-on-surface">
                      Monsoon Access Index: Grade B
                    </span>
                    <p className="text-body-sm text-on-surface-variant">
                      All-weather unpaved gravel road passable for 102 Mahtari van. Handpump water chlorinated on 12 Aug.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-label-sm text-label-sm text-on-surface-variant font-bold uppercase">
                  Point of Care Test Strip &amp; Haemoglobinometer Verification
                </span>
                <div className="relative w-full h-32 rounded-lg overflow-hidden bg-emerald-950/20 border border-slate-200/50 flex items-center justify-center">
                  <div className="flex items-center gap-3 p-3 bg-surface-container-lowest/90 backdrop-blur rounded-lg shadow-sm">
                    <span className="material-symbols-outlined text-primary text-[32px]">biotech</span>
                    <div className="text-left">
                      <span className="font-headline-sm text-headline-sm text-on-surface font-bold block">
                        Strip Reading: Hb 8.1 g/dL
                      </span>
                      <span className="text-xs text-on-surface-variant">
                        TruePoint Digital Optical Reader • Batch CG-BST-992
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
