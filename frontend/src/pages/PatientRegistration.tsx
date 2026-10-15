import React, { useState } from "react";
import { enqueueOfflineItem, isDeviceOnline, getQueueSummary } from "../services/offlineSync";

interface PatientRegistrationProps {
  authToken: string | null;
  selectedLocation: {
    district_id: string;
    block_id: string;
    village_id: string;
    district_name?: string;
    block_name?: string;
    village_name?: string;
    breadcrumb: string;
  };
  initialHouseholdId?: string;
  onNavigateScreening?: (patientData: any) => void;
  onNavigateEncounter?: (householdId: string, patientData: any) => void;
  onBack: () => void;
}

export const PatientRegistration: React.FC<PatientRegistrationProps> = ({
  authToken,
  selectedLocation,
  initialHouseholdId = "HH-04",
  onNavigateScreening,
  onNavigateEncounter,
  onBack,
}) => {
  // Identification Mode: abha, aadhaar, offline
  const [idMode, setIdMode] = useState<"abha" | "aadhaar" | "offline">("abha");
  const [abhaInput, setAbhaInput] = useState<string>("91-4209-8812-3091");
  const [verificationMethod, setVerificationMethod] = useState<string>("Aadhaar OTP Mobile (Linked Relay)");
  const [aadhaarInput, setAadhaarInput] = useState<string>("•••• •••• 9012");
  const [provisionalId, setProvisionalId] = useState<string>("CG-BST-JGD-2025-0894P");

  // ABHA validation state
  const [abhaValidationStatus, setAbhaValidationStatus] = useState<{
    tested: boolean;
    valid?: boolean;
    message?: string;
    loading?: boolean;
  }>({ tested: false });

  // Demographic Fields
  const [fullNameEn, setFullNameEn] = useState<string>("Mangli Bai Kashyap");
  const [fullNameHi, setFullNameHi] = useState<string>("मंगली बाई कश्यप");
  const [age, setAge] = useState<number>(28);
  const [dob, setDob] = useState<string>("14/05/1996");
  const [gender, setGender] = useState<"Female" | "Male" | "Other">("Female");
  const [contactNumber, setContactNumber] = useState<string>("94062 81104");
  const [contactOwner] = useState<string>("Household head (Rameshwar Kashyap)");
  const [primaryDialect, setPrimaryDialect] = useState<string>("Halbi (हल्बी) - Bastar Native");
  const [gramPanchayat, setGramPanchayat] = useState<string>("Karanji (करण्जी)");
  const [faliyaPara, setFaliyaPara] = useState<string>("Patelpara, Sector 04");
  const [assignedMitanin] = useState<string>("Sunita Mandavi");
  const [householdId, setHouseholdId] = useState<string>(initialHouseholdId);

  // Social Vulnerability & Risk
  const [rationTier, setRationTier] = useState<"AAY" | "BPL">("AAY");
  const [sickleCellTrait, setSickleCellTrait] = useState<"pending" | "carrier" | "disease">("carrier");
  const [currentlyPregnant, setCurrentlyPregnant] = useState<boolean>(true);
  const [lmpDate, setLmpDate] = useState<string>("2024-10-18");
  const [gestationalAge] = useState<string>("21 Weeks + 3 Days");
  const [edd] = useState<string>("25 July 2025");

  // Vitals & Diagnostics
  const [heightCm, setHeightCm] = useState<number>(152);
  const [weightKg, setWeightKg] = useState<number>(44.2);
  const [muacCm, setMuacCm] = useState<number>(21.4);
  const [bp, setBp] = useState<string>("108/68");
  const [hb, setHb] = useState<number>(8.9);
  const [malariaRdt, setMalariaRdt] = useState<"Non-Reactive" | "Pf (+)" | "Pv (+)">("Non-Reactive");
  const [rbs, setRbs] = useState<number>(104);

  // Consent & Attestation
  const [audioPlayingDialect, setAudioPlayingDialect] = useState<string | null>(null);
  const [informedConsentCertified, setInformedConsentCertified] = useState<boolean>(true);
  const [thumbprintVerified, setThumbprintVerified] = useState<boolean>(true);
  const [mitaninSignature] = useState<string>("#K-VERMA");

  // Submission & UI States
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [registeredPatient, setRegisteredPatient] = useState<any | null>(null);
  const [showDigitalCardModal, setShowDigitalCardModal] = useState<boolean>(false);
  const [offlineQueuedSuccess, setOfflineQueuedSuccess] = useState<boolean>(false);
  const [voiceTranscribing, setVoiceTranscribing] = useState<boolean>(false);

  // Format ABHA as XX-XXXX-XXXX-XXXX
  const handleAbhaChange = (val: string) => {
    const raw = val.replace(/[^\d]/g, "").slice(0, 14);
    let formatted = raw;
    if (raw.length > 2) {
      formatted = `${raw.slice(0, 2)}-${raw.slice(2, 6)}`;
    }
    if (raw.length > 6) {
      formatted = `${formatted}-${raw.slice(6, 10)}`;
    }
    if (raw.length > 10) {
      formatted = `${formatted}-${raw.slice(10, 14)}`;
    }
    setAbhaInput(formatted);
    setAbhaValidationStatus({ tested: false });
    setDuplicateWarning(null);
  };

  // Local format validation + honesty check
  const handleVerifyAbha = async () => {
    setAbhaValidationStatus({ tested: true, loading: true });
    try {
      const res = await fetch("http://127.0.0.1:8000/patients/validate-abha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ abha_number: abhaInput }),
      });
      const data = await res.json();
      setAbhaValidationStatus({
        tested: true,
        valid: data.valid,
        message: data.message,
        loading: false,
      });

      // Also trigger preflight duplicate check if format is valid
      if (data.valid) {
        checkDuplicate(data.normalized_abha, contactNumber);
      }
    } catch {
      // Fallback local check
      const digits = abhaInput.replace(/[^\d]/g, "");
      const valid = digits.length === 14;
      setAbhaValidationStatus({
        tested: true,
        valid,
        message: valid
          ? "Valid 14-digit format checked locally (Offline Mode)."
          : "Invalid format: ABHA must contain exactly 14 digits.",
        loading: false,
      });
    }
  };

  // Duplicate Check API
  const checkDuplicate = async (abhaNum?: string, phoneNum?: string) => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

      const res = await fetch("http://127.0.0.1:8000/patients/check-duplicate", {
        method: "POST",
        headers,
        body: JSON.stringify({
          abha_number: abhaNum || abhaInput,
          contact_number: phoneNum || contactNumber,
          block_id: selectedLocation.block_id || "LGD_BLK_3595",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.is_duplicate) {
          const match = data.matches[0]?.patient;
          setDuplicateWarning(
            `A patient record with matching ${data.matches[0]?.match_type === "abha" ? "ABHA" : "Phone"} already exists: ${match?.full_name_en} (${match?.patient_identifier}).`
          );
        } else {
          setDuplicateWarning(null);
        }
      }
    } catch {}
  };

  // Simulated Voice Transcribe in Halbi
  const handleToggleVoiceTranscribe = () => {
    if (voiceTranscribing) {
      setVoiceTranscribing(false);
      return;
    }
    setVoiceTranscribing(true);
    setTimeout(() => {
      setFullNameEn("Mangli Bai Kashyap");
      setFullNameHi("मंगली बाई कश्यप");
      setPrimaryDialect("Halbi (हल्बी) - Bastar Native");
      setVoiceTranscribing(false);
    }, 1800);
  };

  // Audio Dialect Consent Playback
  const handlePlayDialectAudio = (dialect: string) => {
    if (audioPlayingDialect === dialect) {
      setAudioPlayingDialect(null);
      return;
    }
    setAudioPlayingDialect(dialect);
    setTimeout(() => {
      setAudioPlayingDialect(null);
    }, 4500);
  };

  // Main Registration Payload Builder
  const buildRegistrationPayload = (submissionToken: string) => {
    return {
      full_name_en: fullNameEn.trim(),
      full_name_hi: fullNameHi.trim() || undefined,
      age: Number(age) || 28,
      dob: dob.trim() || undefined,
      gender,
      contact_number: contactNumber.replace(/[^\d]/g, ""),
      contact_owner: contactOwner,
      primary_dialect: primaryDialect.split(" ")[0],
      gram_panchayat: gramPanchayat,
      faliya_para: faliyaPara,
      assigned_mitanin_name: assignedMitanin,
      household_id: householdId,
      district_id: selectedLocation.district_id || "LGD_DIST_374",
      block_id: selectedLocation.block_id || "LGD_BLK_3595",
      village_id: selectedLocation.village_id || undefined,
      id_mode: idMode,
      abha_number: idMode === "abha" ? abhaInput : undefined,
      provisional_id: idMode === "offline" ? provisionalId : undefined,
      aadhaar_masked: idMode === "aadhaar" ? aadhaarInput : undefined,
      ration_card_tier: rationTier,
      sickle_cell_trait: sickleCellTrait === "carrier" ? "Carrier" : sickleCellTrait === "disease" ? "Disease" : "Screening Pending",
      currently_pregnant: currentlyPregnant,
      lmp_date: currentlyPregnant ? lmpDate : undefined,
      gestational_age_weeks: currentlyPregnant ? 21.4 : undefined,
      edd: currentlyPregnant ? edd : undefined,
      baseline_vitals: {
        height_cm: heightCm,
        weight_kg: weightKg,
        muac_cm: muacCm,
        bp,
        hb_gdl: hb,
        rbs_mgdl: rbs,
        malaria_rdt: malariaRdt,
      },
      consent_audio_verified: true,
      consent_language: "halbi",
      informed_consent_certified: informedConsentCertified,
      thumbprint_verified: thumbprintVerified,
      mitanin_token_signature: mitaninSignature,
      registration_channel: "subcenter",
      submission_token: submissionToken,
    };
  };

  // Save to Offline Buffer explicitly
  const handleSaveToOfflineBuffer = () => {
    const token = `reg-offline-${Date.now()}`;
    const payload = buildRegistrationPayload(token);
    enqueueOfflineItem({
      type: "patient_registration",
      endpoint: "http://127.0.0.1:8000/patients",
      method: "POST",
      payload,
      authToken,
      status: "saved",
      label: `Patient Registration: ${fullNameEn} (${idMode === "abha" ? abhaInput : provisionalId})`,
    });
    setOfflineQueuedSuccess(true);
    setTimeout(() => setOfflineQueuedSuccess(false), 4000);
  };

  // Submit and Proceed
  const handleSubmitForm = async (nextAction: "card" | "triage") => {
    if (!fullNameEn.trim()) {
      setSubmitError("Please enter the patient's full name in English.");
      return;
    }
    if (!informedConsentCertified) {
      setSubmitError("Please certify that informed verbal consent was recorded in the patient's dialect.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const submissionToken = `reg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const payload = buildRegistrationPayload(submissionToken);

    // If device is offline, enqueue in local queue and handle gracefully
    if (!isDeviceOnline()) {
      enqueueOfflineItem({
        type: "patient_registration",
        endpoint: "http://127.0.0.1:8000/patients",
        method: "POST",
        payload,
        authToken,
        status: "saved",
        label: `Offline Registration: ${fullNameEn}`,
      });
      setIsSubmitting(false);
      const simulatedPatient = {
        ...payload,
        id: `offline-${Date.now()}`,
        patient_identifier: idMode === "abha" ? `ABHA-${abhaInput}` : provisionalId,
        created_at: new Date().toISOString(),
      };
      setRegisteredPatient(simulatedPatient);
      if (nextAction === "card") {
        setShowDigitalCardModal(true);
      } else if (onNavigateScreening) {
        onNavigateScreening(simulatedPatient);
      }
      return;
    }

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

      const res = await fetch("http://127.0.0.1:8000/patients", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(errorData.detail || "Patient registration failed on server.");
      }

      const patientData = await res.json();
      setRegisteredPatient(patientData);
      setIsSubmitting(false);

      if (nextAction === "card") {
        setShowDigitalCardModal(true);
      } else if (onNavigateScreening) {
        onNavigateScreening(patientData);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setSubmitError(err.message || "Failed to commit registration. Your entered values have been preserved.");
    }
  };

  return (
    <div className="min-h-screen bg-surface font-body-md text-body-md text-on-surface antialiased pb-24">
      <div className="w-full max-w-[1440px] mx-auto px-space-md lg:px-space-xl py-space-md flex flex-col gap-space-lg">
        {/* Top Breadcrumb & Metadata Strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
          <div className="flex items-center flex-wrap gap-space-xs text-on-surface-variant font-label-md text-label-md">
            <button
              onClick={onBack}
              className="flex items-center gap-space-xs text-primary font-semibold hover:underline cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">domain</span>
              Tribal Health Portal
            </button>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span>Bastar Division</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span>Jagdalpur Block</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-on-surface font-semibold bg-surface-container px-space-sm py-0.5 rounded-full">
              New Patient Registration (नया मरीज़ पंजीकरण)
            </span>
          </div>

          <div className="flex items-center gap-space-sm self-start md:self-auto">
            <span className="flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-surface-container-lowest shadow-xs text-on-surface font-label-sm text-label-sm">
              <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
              Mesh Node: <strong className="text-primary font-semibold">JGD-KRNJ-04B</strong>
            </span>
            <span className="px-space-sm py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-semibold">
              Karanji Sub-Center (करण्जी उपकेंद्र)
            </span>
          </div>
        </div>

        {/* Offline Queue Notice Banner */}
        {offlineQueuedSuccess && (
          <div className="p-space-sm rounded-xl bg-secondary-container/20 border border-secondary/40 text-on-surface flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">cloud_sync</span>
              <span className="font-label-md text-label-md font-bold">
                Patient Staged in Local Offline Mesh Buffer. It will safely sync as soon as connectivity is restored.
              </span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Queue: {getQueueSummary().total} item(s)</span>
          </div>
        )}

        {/* Duplicate Warning Alert */}
        {duplicateWarning && (
          <div className="p-space-sm rounded-xl bg-tertiary-fixed/40 border border-tertiary text-on-surface flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary text-[20px]">warning</span>
              <span className="font-label-md text-label-md font-bold">{duplicateWarning}</span>
            </div>
            <button
              onClick={() => setDuplicateWarning(null)}
              className="text-on-surface-variant hover:text-on-surface text-sm cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Submission Error Alert */}
        {submitError && (
          <div className="p-space-sm rounded-xl bg-error-container text-on-error-container flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">error</span>
              <span className="font-label-md text-label-md font-semibold">{submitError}</span>
            </div>
            <button onClick={() => setSubmitError(null)} className="text-sm font-bold cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* HERO STRIP: ABHA Identity & Verification */}
        <div className="relative bg-surface-container-lowest rounded-xl shadow-md overflow-hidden p-space-md lg:p-space-lg border border-slate-200/50">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary-container"></div>
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-md mb-space-md">
            <div className="flex items-start gap-space-sm">
              <div className="w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-[28px]">fingerprint</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-space-sm flex-wrap">
                  <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    ABHA / Ayushman Bharat Identification
                  </span>
                  <span className="px-space-sm py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-semibold tracking-wide uppercase">
                    MoHFW Verified Engine
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  आयुष्मान भारत स्वास्थ्य खाता (ABHA) सत्यापन अथवा स्थानीय मितानिन अस्थायी आईडी आवंटन
                </p>
              </div>
            </div>

            {/* Mode Toggle Segmented Control */}
            <div className="inline-flex p-1 bg-surface-container rounded-lg self-start xl:self-auto shadow-inner">
              <button
                type="button"
                onClick={() => setIdMode("abha")}
                className={`px-space-md py-1.5 rounded-md font-label-md text-label-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  idMode === "abha"
                    ? "bg-surface-container-lowest text-primary shadow-xs font-semibold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">credit_card</span>
                14-Digit ABHA Number
              </button>
              <button
                type="button"
                onClick={() => setIdMode("aadhaar")}
                className={`px-space-md py-1.5 rounded-md font-label-md text-label-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  idMode === "aadhaar"
                    ? "bg-surface-container-lowest text-primary shadow-xs font-semibold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">fingerprint</span>
                Aadhaar Biometric
              </button>
              <button
                type="button"
                onClick={() => setIdMode("offline")}
                className={`px-space-md py-1.5 rounded-md font-label-md text-label-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  idMode === "offline"
                    ? "bg-surface-container-lowest text-primary shadow-xs font-semibold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">offline_bolt</span>
                Provisional Mitanin ID (अस्थायी आईडी)
              </button>
            </div>
          </div>

          {/* Panel 1: ABHA Mode */}
          {idMode === "abha" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-space-md items-center bg-surface-container-low p-space-md rounded-xl">
              <div className="md:col-span-5 flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface font-semibold tracking-wide">
                  ENTER 14-DIGIT ABHA ADDRESS / ID
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-on-surface-variant material-symbols-outlined text-[20px]">badge</span>
                  <input
                    type="text"
                    value={abhaInput}
                    onChange={(e) => handleAbhaChange(e.target.value)}
                    placeholder="XX-XXXX-XXXX-XXXX"
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest text-on-surface rounded-lg font-headline-sm text-headline-sm tracking-wider focus:outline-none focus:bg-surface-bright shadow-xs border border-slate-200/50"
                  />
                </div>
                {abhaValidationStatus.tested && (
                  <span
                    className={`font-label-sm text-label-sm flex items-center gap-1 ${
                      abhaValidationStatus.valid ? "text-primary font-bold" : "text-error font-medium"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {abhaValidationStatus.valid ? "check_circle" : "error"}
                    </span>
                    {abhaValidationStatus.message}
                  </span>
                )}
              </div>

              <div className="md:col-span-4 flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface font-semibold tracking-wide">
                  VERIFICATION METHOD
                </label>
                <select
                  value={verificationMethod}
                  onChange={(e) => setVerificationMethod(e.target.value)}
                  className="w-full px-3 py-2.5 bg-surface-container-lowest text-on-surface rounded-lg font-label-md text-label-md focus:outline-none shadow-xs border border-slate-200/50"
                >
                  <option>Aadhaar OTP Mobile (Linked Relay)</option>
                  <option>Optical Fingerprint Scanner (Mantra MFS100)</option>
                  <option>Iris Scanner (RD Service)</option>
                  <option>Face Auth (UIDAI Direct Agent)</option>
                </select>
              </div>

              <div className="md:col-span-3 flex items-end pt-5">
                <button
                  type="button"
                  onClick={handleVerifyAbha}
                  disabled={abhaValidationStatus.loading}
                  className="w-full py-2.5 px-4 bg-primary text-on-primary rounded-lg font-label-lg text-label-lg font-semibold shadow-xs hover:bg-primary-container active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {abhaValidationStatus.loading ? "hourglass_empty" : "verified_user"}
                  </span>
                  <span>{abhaValidationStatus.loading ? "Checking..." : "Verify & Prefill Record"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Panel 2: Aadhaar Biometric Mode */}
          {idMode === "aadhaar" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-space-md items-center bg-surface-container-low p-space-md rounded-xl">
              <div className="md:col-span-6 flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface font-semibold tracking-wide">
                  AADHAAR BIOMETRIC PASS-THROUGH (आधार सत्यापन)
                </label>
                <input
                  type="text"
                  maxLength={12}
                  value={aadhaarInput}
                  onChange={(e) => setAadhaarInput(e.target.value)}
                  placeholder="•••• •••• •••• 12 Digits"
                  className="w-full px-4 py-2.5 bg-surface-container-lowest text-on-surface rounded-lg font-headline-sm text-headline-sm shadow-xs focus:outline-none border border-slate-200/50"
                />
              </div>
              <div className="md:col-span-6 flex items-center gap-space-md pt-5">
                <button
                  type="button"
                  onClick={() => setThumbprintVerified(true)}
                  className="px-4 py-2.5 bg-secondary text-on-secondary rounded-lg font-label-lg text-label-lg font-medium shadow-xs hover:opacity-95 flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">fingerprint</span>
                  Capture Right Thumbprint
                </button>
                <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-primary text-[16px]">check_circle</span>
                  STQC Certified Sensor Ready
                </span>
              </div>
            </div>
          )}

          {/* Panel 3: Offline Provisional Mode */}
          {idMode === "offline" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-space-md items-center bg-surface-container-low p-space-md rounded-xl">
              <div className="md:col-span-8 flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface font-semibold tracking-wide">
                  GENERATED LOCAL PROVISIONAL TOKEN
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="px-4 py-2 bg-surface-container-lowest rounded-lg font-headline-sm text-headline-sm text-primary font-bold tracking-widest shadow-xs border border-slate-200/50">
                    {provisionalId}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const yr = new Date().getFullYear();
                      const randNum = Math.floor(1000 + Math.random() * 9000);
                      setProvisionalId(`CG-BST-JGD-${yr}-${randNum}P`);
                    }}
                    className="px-2 py-1 bg-surface-container-high rounded text-xs text-on-surface hover:bg-surface-container-highest cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">refresh</span>
                    <span>Generate New</span>
                  </button>
                  <span className="px-space-sm py-1 rounded bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-semibold">
                    Local Storage Token
                  </span>
                </div>
              </div>
              <div className="md:col-span-4 text-right">
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  Auto-reconciles to central MoHFW server once mesh relay encounters satellite uplink.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* MAIN FORM: 12-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          {/* PRIMARY LEFT COLUMN: Demographic & Social Triage (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-space-lg">
            {/* SECTION 1: Demographic Information */}
            <div className="bg-surface-container-lowest rounded-xl shadow-xs p-space-md lg:p-space-lg flex flex-col gap-space-md border border-slate-200/50">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-space-sm">
                  <span className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary font-bold font-label-md text-label-md">
                    01
                  </span>
                  <div>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                      Demographic Profile (जनसांख्यिकीय विवरण)
                    </h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Core identification for tribal registry and tracking
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleVoiceTranscribe}
                  className={`px-space-sm py-1 rounded-full font-label-sm text-label-sm font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                    voiceTranscribing
                      ? "bg-primary text-white animate-pulse"
                      : "bg-surface-container text-primary hover:bg-surface-container-high"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">mic</span>
                  {voiceTranscribing ? "Listening (हल्बी)..." : "Voice Transcribe (HALBI)"}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                {/* Full Name (English) */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm text-on-surface font-semibold">
                    FULL NAME (ENGLISH) <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullNameEn}
                    onChange={(e) => setFullNameEn(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low text-on-surface rounded-lg font-body-md text-body-md shadow-xs focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary focus:outline-none border border-slate-200/40"
                  />
                </div>

                {/* Full Name (Hindi / Devanagari) */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm text-on-surface font-semibold">
                    पूरा नाम (देवनागरी लिपि) <span className="text-error">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={fullNameHi}
                      onChange={(e) => setFullNameHi(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-surface-container-low text-on-surface rounded-lg font-body-md text-body-md shadow-xs focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary focus:outline-none border border-slate-200/40"
                    />
                    <span className="absolute right-2.5 px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm">
                      InScript
                    </span>
                  </div>
                </div>

                {/* Age & DOB */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm text-on-surface font-semibold">AGE (ESTIMATED) / DOB</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-surface-container-low text-on-surface rounded-lg font-body-md text-body-md shadow-xs focus:outline-none border border-slate-200/40"
                    />
                    <input
                      type="text"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      placeholder="DD/MM/YYYY"
                      className="w-full px-3.5 py-2.5 bg-surface-container-low text-on-surface rounded-lg font-body-md text-body-md shadow-xs focus:outline-none border border-slate-200/40"
                    />
                  </div>
                </div>

                {/* Gender */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm text-on-surface font-semibold">GENDER (लिंग)</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setGender("Female")}
                      className={`py-2 px-2 rounded-lg font-label-md text-label-md font-semibold text-center shadow-xs cursor-pointer ${
                        gender === "Female"
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container-low text-on-surface hover:bg-surface-container"
                      }`}
                    >
                      Female (महिला)
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender("Male")}
                      className={`py-2 px-2 rounded-lg font-label-md text-label-md font-medium text-center shadow-xs cursor-pointer ${
                        gender === "Male"
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container-low text-on-surface hover:bg-surface-container"
                      }`}
                    >
                      Male (पुरुष)
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender("Other")}
                      className={`py-2 px-2 rounded-lg font-label-md text-label-md font-medium text-center shadow-xs cursor-pointer ${
                        gender === "Other"
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container-low text-on-surface hover:bg-surface-container"
                      }`}
                    >
                      Other
                    </button>
                  </div>
                </div>

                {/* Contact Phone */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm text-on-surface font-semibold">
                    CONTACT NUMBER / MITANIN PROXY
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-on-surface-variant font-body-sm text-body-sm">+91</span>
                    <input
                      type="tel"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      className="w-full pl-12 pr-4 py-2.5 bg-surface-container-low text-on-surface rounded-lg font-body-md text-body-md shadow-xs focus:outline-none border border-slate-200/40"
                    />
                    <span className="absolute right-3 material-symbols-outlined text-primary text-[18px]">call</span>
                  </div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Owner: {contactOwner}</span>
                </div>

                {/* Primary Dialect */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm text-on-surface font-semibold">
                    PRIMARY TRIBAL DIALECT (प्राथमिक बोली)
                  </label>
                  <select
                    value={primaryDialect}
                    onChange={(e) => setPrimaryDialect(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low text-on-surface rounded-lg font-body-md text-body-md shadow-xs focus:outline-none border border-slate-200/40"
                  >
                    <option>Halbi (हल्बी) - Bastar Native</option>
                    <option>Gondi (गोंडी - कोयतुर)</option>
                    <option>Chhattisgarhi (छत्तीसगढ़ी)</option>
                    <option>Bhatri (भातृ)</option>
                    <option>Hindi (मानक हिन्दी)</option>
                  </select>
                </div>
              </div>

              {/* Hamlet / Para Specification */}
              <div className="pt-space-xs flex flex-col gap-1.5">
                <label className="font-label-sm text-label-sm text-on-surface font-semibold">
                  RESIDENTIAL HAMLET (पारा / मजरा / ग्राम)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-space-sm">
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Household ID:</span>
                    <input
                      type="text"
                      value={householdId}
                      onChange={(e) => setHouseholdId(e.target.value)}
                      className="px-3 py-2 bg-surface-container-low rounded-lg text-on-surface font-body-md text-body-md shadow-xs border border-slate-200/40"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Gram Panchayat:</span>
                    <input
                      type="text"
                      value={gramPanchayat}
                      onChange={(e) => setGramPanchayat(e.target.value)}
                      className="px-3 py-2 bg-surface-container-low rounded-lg text-on-surface font-body-md text-body-md shadow-xs border border-slate-200/40"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Faliya / Para:</span>
                    <input
                      type="text"
                      value={faliyaPara}
                      onChange={(e) => setFaliyaPara(e.target.value)}
                      className="px-3 py-2 bg-surface-container-low rounded-lg text-on-surface font-body-md text-body-md shadow-xs border border-slate-200/40"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Assigned Mitanin:</span>
                    <div className="px-3 py-2 bg-surface-container rounded-lg text-on-surface font-label-md text-label-md font-semibold flex items-center justify-between border border-slate-200/50">
                      <span>{assignedMitanin}</span>
                      <span className="text-primary material-symbols-outlined text-[16px]">verified</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: Social & Vulnerability Indicators */}
            <div className="bg-surface-container-lowest rounded-xl shadow-xs p-space-md lg:p-space-lg flex flex-col gap-space-md border border-slate-200/50">
              <div className="flex items-center gap-space-sm">
                <span className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary font-bold font-label-md text-label-md">
                  02
                </span>
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Social Vulnerability &amp; Risk Profiles (सामाजिक सुरक्षा एवं जोखिम)
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Government entitlement tier and high-risk physiological indicators
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                {/* Ration Card Tier */}
                <div className="flex flex-col gap-1.5 p-space-sm bg-surface-container-low rounded-xl border border-slate-200/40">
                  <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                    FOOD SECURITY / RATION TIER
                  </span>
                  <div className="flex flex-col gap-2">
                    <label
                      onClick={() => setRationTier("AAY")}
                      className={`flex items-center gap-space-xs p-2 rounded-lg cursor-pointer border ${
                        rationTier === "AAY"
                          ? "bg-surface-container-lowest border-primary/50 shadow-xs"
                          : "bg-surface-container-lowest border-transparent"
                      }`}
                    >
                      <input
                        type="radio"
                        checked={rationTier === "AAY"}
                        onChange={() => setRationTier("AAY")}
                        className="text-primary focus:ring-0"
                      />
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md text-on-surface font-semibold">
                          Antyodaya Anna Yojana (AAY - गुलाबी कार्ड)
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          Priority tribal destitute tier subsidy
                        </span>
                      </div>
                    </label>

                    <label
                      onClick={() => setRationTier("BPL")}
                      className={`flex items-center gap-space-xs p-2 rounded-lg cursor-pointer border ${
                        rationTier === "BPL"
                          ? "bg-surface-container-lowest border-primary/50 shadow-xs"
                          : "bg-surface-container-lowest border-transparent"
                      }`}
                    >
                      <input
                        type="radio"
                        checked={rationTier === "BPL"}
                        onChange={() => setRationTier("BPL")}
                        className="text-primary focus:ring-0"
                      />
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md text-on-surface">
                          BPL (नीला / पीला राशन कार्ड)
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          Below Poverty Line verified
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Sickle Cell Trait Screening */}
                <div className="flex flex-col gap-1.5 p-space-sm bg-surface-container-low rounded-xl border border-slate-200/40">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                      SICKLE CELL MISSION TRAIT
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold">
                      National Mission
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => setSickleCellTrait("pending")}
                      className={`py-2 px-1 rounded-lg font-label-sm text-label-sm text-center cursor-pointer ${
                        sickleCellTrait === "pending"
                          ? "bg-tertiary-fixed text-on-tertiary-fixed font-bold shadow-xs"
                          : "bg-surface-container-lowest text-on-surface hover:bg-surface-container"
                      }`}
                    >
                      Screening Pending
                    </button>
                    <button
                      type="button"
                      onClick={() => setSickleCellTrait("carrier")}
                      className={`py-2 px-1 rounded-lg font-label-sm text-label-sm text-center cursor-pointer ${
                        sickleCellTrait === "carrier"
                          ? "bg-tertiary-fixed text-on-tertiary-fixed font-bold shadow-xs"
                          : "bg-surface-container-lowest text-on-surface hover:bg-surface-container"
                      }`}
                    >
                      Carrier (Hb-AS)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSickleCellTrait("disease")}
                      className={`py-2 px-1 rounded-lg font-label-sm text-label-sm text-center cursor-pointer ${
                        sickleCellTrait === "disease"
                          ? "bg-error text-white font-bold shadow-xs"
                          : "bg-surface-container-lowest text-on-surface hover:bg-surface-container"
                      }`}
                    >
                      Disease (Hb-SS)
                    </button>
                  </div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
                    Carrier detected in 2024 block screening camp. Requires crisis hydration advisory.
                  </p>
                </div>
              </div>

              {/* Pregnancy & Lactation Status Module */}
              <div className="p-space-md bg-secondary-fixed/30 rounded-xl flex flex-col gap-space-sm border border-secondary/20">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-secondary text-[22px]">pregnant_woman</span>
                    <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                      Maternal Stage Tracking (मातृ स्वास्थ्य स्थिति)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 bg-surface-container-lowest px-3 py-1 rounded-full shadow-xs cursor-pointer border border-slate-200/40">
                      <input
                        type="checkbox"
                        checked={currentlyPregnant}
                        onChange={(e) => setCurrentlyPregnant(e.target.checked)}
                        className="text-primary rounded focus:ring-0"
                      />
                      <span className="font-label-md text-label-md text-on-surface font-semibold">
                        Currently Pregnant (गर्भवती)
                      </span>
                    </label>
                  </div>
                </div>

                {currentlyPregnant && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md pt-2">
                    <div className="flex flex-col bg-surface-container-lowest p-space-sm rounded-lg shadow-xs border border-slate-200/40">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">LMP DATE (अंतिम माहवारी)</span>
                      <input
                        type="date"
                        value={lmpDate}
                        onChange={(e) => setLmpDate(e.target.value)}
                        className="font-label-lg text-label-lg text-on-surface bg-transparent focus:outline-none pt-1"
                      />
                    </div>
                    <div className="flex flex-col bg-surface-container-lowest p-space-sm rounded-lg shadow-xs border border-slate-200/40">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">GESTATIONAL AGE (सप्ताह)</span>
                      <span className="font-headline-sm text-headline-sm text-primary font-bold pt-1">{gestationalAge}</span>
                    </div>
                    <div className="flex flex-col bg-surface-container-lowest p-space-sm rounded-lg shadow-xs border border-slate-200/40">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">ESTIMATED DELIVERY (EDD)</span>
                      <span className="font-headline-sm text-headline-sm text-secondary font-bold pt-1">{edd}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECONDARY RIGHT COLUMN: Baseline Vitals & Attestation (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-space-lg">
            {/* SECTION 3: Baseline Vitals & PoC Diagnostics */}
            <div className="bg-surface-container-lowest rounded-xl shadow-xs p-space-md lg:p-space-lg flex flex-col gap-space-md border border-slate-200/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-sm">
                  <span className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary font-bold font-label-md text-label-md">
                    03
                  </span>
                  <div>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                      Vitals &amp; PoC Diagnostics
                    </h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Frontline bedside biometric data</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-label-sm text-label-sm font-mono">
                  Sync: BLE Connected
                </span>
              </div>

              {/* Vitals Matrix Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-space-sm">
                {/* Height */}
                <div className="p-space-sm bg-surface-container-low rounded-xl flex flex-col gap-0.5 border border-slate-200/40">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Height (ऊंचाई)</span>
                  <div className="flex items-baseline gap-1">
                    <input
                      type="number"
                      value={heightCm}
                      onChange={(e) => setHeightCm(Number(e.target.value))}
                      className="w-16 bg-transparent font-headline-sm text-headline-sm text-on-surface font-bold focus:outline-none"
                    />
                    <span className="font-label-sm text-label-sm text-on-surface-variant">cm</span>
                  </div>
                </div>

                {/* Weight */}
                <div className="p-space-sm bg-surface-container-low rounded-xl flex flex-col gap-0.5 border border-slate-200/40">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Weight (वज़न)</span>
                  <div className="flex items-baseline gap-1">
                    <input
                      type="number"
                      step="0.1"
                      value={weightKg}
                      onChange={(e) => setWeightKg(Number(e.target.value))}
                      className="w-16 bg-transparent font-headline-sm text-headline-sm text-on-surface font-bold focus:outline-none"
                    />
                    <span className="font-label-sm text-label-sm text-on-surface-variant">kg</span>
                  </div>
                </div>

                {/* MUAC */}
                <div className="p-space-sm bg-tertiary-fixed/40 rounded-xl flex flex-col gap-0.5 border border-amber-200/50">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">MUAC Tape</span>
                    <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <input
                      type="number"
                      step="0.1"
                      value={muacCm}
                      onChange={(e) => setMuacCm(Number(e.target.value))}
                      className="w-16 bg-transparent font-headline-sm text-headline-sm text-tertiary-container font-bold focus:outline-none"
                    />
                    <span className="font-label-sm text-label-sm text-on-surface-variant">cm (Yellow)</span>
                  </div>
                </div>

                {/* Blood Pressure */}
                <div className="p-space-sm bg-surface-container-low rounded-xl flex flex-col gap-0.5 sm:col-span-2 border border-slate-200/40">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Blood Pressure (रक्तचाप)</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={bp}
                      onChange={(e) => setBp(e.target.value)}
                      className="w-24 bg-transparent font-headline-sm text-headline-sm text-on-surface font-bold focus:outline-none"
                    />
                    <span className="font-label-sm text-label-sm text-on-surface-variant">mmHg</span>
                    <span className="px-2 py-0.5 rounded-full bg-surface-container text-primary font-label-sm text-label-sm font-semibold">
                      Normotensive
                    </span>
                  </div>
                </div>

                {/* Haemoglobin */}
                <div className="p-space-sm bg-error-container/40 rounded-xl flex flex-col gap-0.5 border border-red-200/50">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-error font-semibold">Hb (हीमोग्लोबिन)</span>
                    <span className="material-symbols-outlined text-error text-[16px]">warning</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <input
                      type="number"
                      step="0.1"
                      value={hb}
                      onChange={(e) => setHb(Number(e.target.value))}
                      className="w-16 bg-transparent font-headline-sm text-headline-sm text-error font-bold focus:outline-none"
                    />
                    <span className="font-label-sm text-label-sm text-on-surface-variant">g/dL</span>
                  </div>
                  <span className="font-label-sm text-label-sm text-error font-semibold">Moderate Anaemia</span>
                </div>
              </div>

              {/* Rapid Diagnostic Tests (RDT) Grid */}
              <div className="pt-space-xs flex flex-col gap-space-xs">
                <span className="font-label-sm text-label-sm text-on-surface font-semibold tracking-wide">
                  BEDSIDE RAPID DIAGNOSTIC STRIPS (RDT)
                </span>

                {/* Malaria Strip */}
                <div className="p-space-sm bg-surface-container-low rounded-xl flex items-center justify-between border border-slate-200/40">
                  <div className="flex items-center gap-space-sm">
                    <div className="w-8 h-8 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary shadow-xs">
                      <span className="material-symbols-outlined text-[20px]">bug_report</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-md text-label-md text-on-surface font-semibold">
                        Malaria Dual RDT (Pf / Pv)
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        Karanji Hamlet endemic zone
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMalariaRdt("Non-Reactive")}
                      className={`px-3 py-1 rounded font-label-sm text-label-sm cursor-pointer ${
                        malariaRdt === "Non-Reactive"
                          ? "bg-surface-container text-on-surface font-semibold border border-slate-300"
                          : "bg-surface-container-lowest text-on-surface-variant"
                      }`}
                    >
                      Non-Reactive
                    </button>
                    <button
                      type="button"
                      onClick={() => setMalariaRdt("Pf (+)")}
                      className={`px-3 py-1 rounded font-label-sm text-label-sm cursor-pointer ${
                        malariaRdt === "Pf (+)"
                          ? "bg-error text-white font-bold"
                          : "bg-surface-container-lowest text-on-surface-variant hover:text-error"
                      }`}
                    >
                      Pf (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMalariaRdt("Pv (+)")}
                      className={`px-3 py-1 rounded font-label-sm text-label-sm cursor-pointer ${
                        malariaRdt === "Pv (+)"
                          ? "bg-error text-white font-bold"
                          : "bg-surface-container-lowest text-on-surface-variant hover:text-error"
                      }`}
                    >
                      Pv (+)
                    </button>
                  </div>
                </div>

                {/* Random Blood Sugar */}
                <div className="p-space-sm bg-surface-container-low rounded-xl flex items-center justify-between border border-slate-200/40">
                  <div className="flex items-center gap-space-sm">
                    <div className="w-8 h-8 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary shadow-xs">
                      <span className="material-symbols-outlined text-[20px]">water_drop</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-md text-label-md text-on-surface font-semibold">
                        Random Blood Sugar (RBS)
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Glucometer strip entry</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={rbs}
                      onChange={(e) => setRbs(Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-surface-container-lowest text-right rounded font-label-lg text-label-lg font-bold text-on-surface shadow-xs focus:outline-none border border-slate-200/50"
                    />
                    <span className="font-label-sm text-label-sm text-on-surface-variant">mg/dL</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 4: Consent & Field Attestation */}
            <div className="bg-surface-container-lowest rounded-xl shadow-xs p-space-md lg:p-space-lg flex flex-col gap-space-md border border-slate-200/50">
              <div className="flex items-center gap-space-sm">
                <span className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary font-bold font-label-md text-label-md">
                  04
                </span>
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Consent &amp; Digital Attestation
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Bilingual informed audio consent &amp; biometric signature
                  </p>
                </div>
              </div>

              {/* Bilingual Audio Consent Player */}
              <div className="p-space-sm bg-primary-container text-on-primary rounded-xl flex flex-col gap-space-xs shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-primary-container font-semibold">
                    Dialect Audio Consent
                  </span>
                  <span className="material-symbols-outlined text-[20px]">
                    {audioPlayingDialect ? "volume_up" : "hearing"}
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-primary italic">
                  "मंगली बाई कश्यप, आपके स्वास्थ्य रिकॉर्ड एवं प्राथमिक जांच को बस्तर स्वास्थ्य ग्रिड में दर्ज किया जा रहा है।"
                </p>
                <div className="flex items-center gap-space-sm pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handlePlayDialectAudio("halbi")}
                    className={`px-space-md py-1.5 rounded-full font-label-sm text-label-sm font-semibold flex items-center gap-1 shadow-xs cursor-pointer transition-all ${
                      audioPlayingDialect === "halbi"
                        ? "bg-secondary text-white ring-2 ring-white"
                        : "bg-surface-container-lowest text-primary hover:bg-surface-bright"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {audioPlayingDialect === "halbi" ? "pause" : "play_arrow"}
                    </span>
                    Listen in Halbi (हल्बी में सुनें)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePlayDialectAudio("gondi")}
                    className={`px-space-md py-1.5 rounded-full font-label-sm text-label-sm font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                      audioPlayingDialect === "gondi"
                        ? "bg-secondary text-white ring-2 ring-white"
                        : "bg-primary/40 text-on-primary hover:bg-primary"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {audioPlayingDialect === "gondi" ? "pause" : "play_arrow"}
                    </span>
                    Gondi (गोंडी)
                  </button>
                </div>
              </div>

              {/* Informed Consent Checkbox */}
              <label className="flex items-start gap-space-sm cursor-pointer p-space-xs">
                <input
                  type="checkbox"
                  checked={informedConsentCertified}
                  onChange={(e) => setInformedConsentCertified(e.target.checked)}
                  className="mt-1 w-4 h-4 text-primary rounded focus:ring-0 cursor-pointer"
                />
                <span className="font-body-sm text-body-sm text-on-surface">
                  I certify that verbal informed consent was recorded in the patient's native dialect. The patient
                  understands data sharing with Jagdalpur CHC triage clinicians.
                </span>
              </label>

              {/* Biometric Cache & Signature Status */}
              <div className="grid grid-cols-2 gap-space-sm pt-1">
                <div className="p-space-sm bg-surface-container-low rounded-lg flex items-center gap-space-xs border border-slate-200/40">
                  <span className="material-symbols-outlined text-primary text-[24px]">fingerprint</span>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface font-semibold">Thumbprint Cache</span>
                    <span className="font-label-sm text-label-sm text-primary font-medium">Recorded (98% match)</span>
                  </div>
                </div>
                <div className="p-space-sm bg-surface-container-low rounded-lg flex items-center gap-space-xs border border-slate-200/40">
                  <span className="material-symbols-outlined text-secondary text-[24px]">draw</span>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface font-semibold">Mitanin Token</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                      Signed: {mitaninSignature}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FLOATING ACTION DECK / FOOTER */}
        <div className="mt-space-sm p-space-md bg-surface-container-lowest rounded-xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-space-md border-t-2 border-primary-container border-slate-200/60 sticky bottom-4 z-30">
          <div className="flex items-center gap-space-md w-full md:w-auto">
            <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-[22px]">save_as</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-lg text-label-lg text-on-surface font-bold">
                Ready to Commit Registration Record
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Validated under Bastar Health Sub-Center Protocol
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-space-sm w-full md:w-auto justify-end">
            {/* Action 1: Offline Mesh Buffer */}
            <button
              type="button"
              onClick={handleSaveToOfflineBuffer}
              className="flex-1 md:flex-none px-space-md py-3 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer border border-slate-200/60"
            >
              <span className="material-symbols-outlined text-[18px]">wifi_off</span>
              Save to Offline Mesh Buffer
            </button>

            {/* Action 2: Clinical Triage Direct Transfer */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmitForm("triage")}
              className="flex-1 md:flex-none px-space-md py-3 rounded-lg bg-secondary text-on-secondary hover:opacity-95 font-label-md text-label-md font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">stethoscope</span>
              Save &amp; Proceed to Clinical Triage (जोखिम वर्गीकरण)
            </button>

            {/* Action 3: Generate Digital Health Card (Primary) */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmitForm("card")}
              className="w-full sm:w-auto px-space-lg py-3 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-label-lg text-label-lg font-bold transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">
                {isSubmitting ? "hourglass_top" : "id_card"}
              </span>
              <span>{isSubmitting ? "Saving Patient..." : "Save & Generate Digital Card (स्वास्थ्य कार्ड बनाएं)"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* DIGITAL HEALTH CARD MODAL */}
      {showDigitalCardModal && registeredPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Health Card Banner */}
            <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <span className="material-symbols-outlined text-[24px]">health_and_safety</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">National Health Authority</h3>
                  <p className="text-xs text-emerald-200">Ayushman Bharat Health Account (ABHA)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDigitalCardModal(false)}
                className="text-white/80 hover:text-white text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Card Body */}
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between border-b pb-4 border-slate-200">
                <div>
                  <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider block">
                    Patient Name / नाम
                  </span>
                  <h4 className="text-xl font-bold text-on-surface">{registeredPatient.full_name_en}</h4>
                  <p className="text-sm font-medium text-primary">{registeredPatient.full_name_hi}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider block">Gender / Age</span>
                  <p className="text-sm font-bold text-on-surface">
                    {registeredPatient.gender} • {registeredPatient.age} Yrs
                  </p>
                </div>
              </div>

              {/* Identifier Pill */}
              <div className="p-3 bg-surface-container-low rounded-xl flex items-center justify-between border border-slate-200/60">
                <div>
                  <span className="text-[11px] text-on-surface-variant font-bold uppercase tracking-wider block">
                    ABHA / Health Identifier
                  </span>
                  <span className="font-mono text-base font-bold text-primary tracking-wider">
                    {registeredPatient.patient_identifier}
                  </span>
                </div>
                <span className="material-symbols-outlined text-primary text-[28px]">qr_code_2</span>
              </div>

              {/* Vitals Summary Pill */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/50">
                  <span className="text-[10px] text-on-surface-variant block uppercase font-bold">Digital Hb</span>
                  <span className="text-sm font-bold text-error">
                    {registeredPatient.baseline_vitals?.hb_gdl || hb} g/dL
                  </span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/50">
                  <span className="text-[10px] text-on-surface-variant block uppercase font-bold">Blood Pressure</span>
                  <span className="text-sm font-bold text-on-surface">
                    {registeredPatient.baseline_vitals?.bp || bp}
                  </span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/50">
                  <span className="text-[10px] text-on-surface-variant block uppercase font-bold">Sickle Trait</span>
                  <span className="text-sm font-bold text-tertiary-container">
                    {registeredPatient.sickle_cell_trait || "Carrier"}
                  </span>
                </div>
              </div>

              {/* Location Footer */}
              <div className="text-xs text-on-surface-variant flex items-center justify-between pt-1">
                <span>Sub-Center: Karanji (Sector 04)</span>
                <span>Mitanin: {registeredPatient.assigned_mitanin_name || assignedMitanin}</span>
              </div>
            </div>

            {/* Modal Next Actions */}
            <div className="p-4 bg-surface-container-low border-t border-slate-200 flex items-center justify-end gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setShowDigitalCardModal(false);
                  onBack();
                }}
                className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-semibold cursor-pointer"
              >
                Done (Return to Roster)
              </button>
              {onNavigateEncounter && (
                <button
                  type="button"
                  onClick={() => {
                    setShowDigitalCardModal(false);
                    onNavigateEncounter(registeredPatient.household_id || householdId, registeredPatient);
                  }}
                  className="px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-bold shadow-xs cursor-pointer"
                >
                  Start Encounter (मुलाकात शुरू करें)
                </button>
              )}
              {onNavigateScreening && (
                <button
                  type="button"
                  onClick={() => {
                    setShowDigitalCardModal(false);
                    onNavigateScreening(registeredPatient);
                  }}
                  className="px-4 py-2 rounded-lg bg-secondary text-on-secondary font-label-md text-label-md font-bold shadow-xs cursor-pointer"
                >
                  Proceed to Clinical Triage →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
