import React, { useState } from "react";
import { useI18n } from "../i18n/I18nContext";

interface PortalLandingProps {
  initialView?: "landing" | "public-login" | "employee-login";
  onEnterPublicPortal: (citizenName?: string) => void;
  onEmployeeAuthenticated: (authPayload: {
    token: string;
    user: any;
    portal_role: "field_employee" | "supervisor";
    assigned_location: any;
    authorized_block_ids: string[];
  }) => void;
}

const DEMO_ACCOUNTS = [
  {
    username: "asha",
    password: "password123",
    label: "Mitanin Asha [SAMPLE]",
    roleBadge: "Field Worker",
    badgeColor: "bg-emerald-100 text-emerald-800",
    scope: "Bastar / Jagdalpur • Sector 4",
  },
  {
    username: "verma",
    password: "password123",
    label: "Supervisor K. Verma [SAMPLE]",
    roleBadge: "Block Supervisor",
    badgeColor: "bg-indigo-100 text-indigo-800",
    scope: "Jagdalpur Block (LGD 3595)",
  },
  {
    username: "sharma",
    password: "password123",
    label: "Officer R. Sharma [SAMPLE]",
    roleBadge: "District Supervisor",
    badgeColor: "bg-purple-100 text-purple-800",
    scope: "Bastar District (LGD 374)",
  },
  {
    username: "anita",
    password: "password123",
    label: "Mitanin Anita [SAMPLE]",
    roleBadge: "Field Worker",
    badgeColor: "bg-emerald-100 text-emerald-800",
    scope: "Bastar Block (LGD 3593) / Keslur",
  },
  {
    username: "sunita",
    password: "password123",
    label: "Mitanin Sunita [SAMPLE]",
    roleBadge: "Field Worker",
    badgeColor: "bg-emerald-100 text-emerald-800",
    scope: "Darbha Block (LGD 3594) / Kanger",
  },
  {
    username: "patel",
    password: "password123",
    label: "Supervisor P. Patel [SAMPLE]",
    roleBadge: "Block Supervisor",
    badgeColor: "bg-indigo-100 text-indigo-800",
    scope: "Tokapal Block (LGD 3603)",
  },
];

export function PortalLanding({
  onEnterPublicPortal,
  onEmployeeAuthenticated,
}: PortalLandingProps) {
  const { language, setLanguage } = useI18n();

  // Employee login state
  const [staffIdentifier, setStaffIdentifier] = useState<string>("asha");
  const [staffPassword, setStaffPassword] = useState<string>("password123");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Patient portal interactive mockup state
  const [abhaId, setAbhaId] = useState<string>("98271-00123");
  const [patientOtp, setPatientOtp] = useState<string>("482910");
  const [patientNotice, setPatientNotice] = useState<string | null>(null);

  // Citizen optional sign-in modal
  const [showCitizenModal, setShowCitizenModal] = useState<boolean>(false);
  const [citizenName, setCitizenName] = useState<string>("");

  // Information Modals for Footer / Help
  const [activeInfoModal, setActiveInfoModal] = useState<"privacy" | "abdm" | "contact" | null>(null);

  // Spoken voice guidance
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const handleVoiceGuidance = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Voice guidance is not supported in this browser.");
      return;
    }
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    let speechText = "";
    let speechLang = "hi-IN";

    if (language === "en") {
      speechText =
        "Welcome to Mitanin Signal, the unified public health gateway for Chhattisgarh. Citizens can click Card A for open surveillance reports without logging in. Health staff can use Card B to access frontline task ledgers and supervisor tools.";
      speechLang = "en-IN";
    } else if (language === "hne") {
      speechText =
        "मितानिन् सिग्नल मं अपन जम्मो संगवारी मन के स्वागत हे। गाँव के लोगन मन कार्ड A ले बिना पासवर्ड के स्वास्थ्य बुलेटिन देख सकत हंव। मितानिन दीदी अउ अधिकारी मन कार्ड B ले लॉग इन करव।";
      speechLang = "hi-IN";
    } else {
      speechText =
        "मितानिन् सिग्नल एकीकृत स्वास्थ्य प्रवेश द्वार में आपका स्वागत है। आम नागरिक बिना पासवर्ड के कार्ड A से रोग बुलेटिन देख सकते हैं। स्वास्थ्य कार्यकर्ता कार्ड B से लॉगिन करें।";
      speechLang = "hi-IN";
    }

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = speechLang;
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffIdentifier.trim() || !staffPassword.trim()) {
      setLoginError("कृपया यूजरनेम और पासवर्ड दोनों दर्ज करें। (Please enter username and password)");
      return;
    }

    setLoading(true);
    setLoginError(null);

    try {
      const res = await fetch("http://127.0.0.1:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: staffIdentifier.trim(),
          password: staffPassword,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setLoginError(
          err.detail || "अमान्य क्रेडेंशियल्स। कृपया अपनी प्राधिकृत आईडी और पासवर्ड जांचें।"
        );
        return;
      }

      const data = await res.json();
      onEmployeeAuthenticated(data);
    } catch {
      setLoginError("सर्वर से संपर्क नहीं हो सका। कृपया सुनिश्चित करें कि बैकएंड सेवा चालू है।");
    } finally {
      setLoading(false);
    }
  };

  const handlePatientAction = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPatientNotice(
      "आयुष्मान डिजिटल मिशन (ABDM) मरीज़ स्वास्थ्य रिकॉर्ड सेवा चरण 3 (Phase 3) में एकीकृत की जाएगी। वर्तमान में आप कार्ड A (सार्वजनिक स्वास्थ्य पोर्टल) से सभी गाँव वार बुलेटिन तुरंत देख सकते हैं।"
    );
  };

  const handleUseDemoAccount = (acc: (typeof DEMO_ACCOUNTS)[0]) => {
    setStaffIdentifier(acc.username);
    setStaffPassword(acc.password);
    setLoginError(null);
  };

  return (
    <div className="min-h-full flex flex-col font-sans text-slate-800 antialiased selection:bg-brand-500 selection:text-white bg-slate-50">
      {/* ============================================================ */}
      {/* 1. TOP PROTOTYPE ALERT BAR                                   */}
      {/* ============================================================ */}
      <aside
        className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs md:text-sm font-semibold flex items-center justify-between border-b border-amber-600 shadow-inner"
        data-purpose="prototype-alert-bar"
      >
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-slate-950 px-2 py-0.5 text-[11px] font-bold text-amber-300 tracking-wider uppercase">
              <svg className="w-3.5 h-3.5 inline text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  clipRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  fillRule="evenodd"
                />
              </svg>
              OFFICIAL PROTOTYPE
            </span>
            <span className="text-slate-900 truncate">
              सिमुलेटेड प्रदर्शन वातावरण: बहु-रोग जलवायु पूर्वचेतावनी, नैदानिक निदान और आभा एकीकृत स्वास्थ्य अभिलेख प्रणाली (Chhattisgarh NHM).
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono font-medium text-slate-900 bg-amber-400/70 px-2 py-0.5 rounded">
            <span>Mesh Node: BASTAR-LGD-374</span>
          </div>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* 2. MAIN HEADER (TEAL BRAND HEADER)                          */}
      {/* ============================================================ */}
      <header
        className="bg-brand-900 text-white border-b border-brand-800 shadow-md sticky top-0 z-40"
        data-purpose="primary-header"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Brand & Jurisdiction Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white ring-2 ring-brand-400/40 shadow-inner">
              <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M9.348 14.652a3.75 3.75 0 010-5.304m5.304 0a3.75 3.75 0 010 5.304m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894a9.75 9.75 0 010-13.788m13.788 0a9.75 9.75 0 010 13.788M12 12h.01"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  मितानिन् सिग्नल <span className="text-brand-300 font-medium text-sm sm:text-base">(Mitanin Signal)</span>
                </h1>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-700/80 text-brand-200 border border-brand-500/30">
                  CG-HEALTH CLOUD
                </span>
              </div>
              <p className="text-xs text-brand-200/90 font-medium">
                Remote &amp; Tribal Healthcare, Diagnostics &amp; Field Operations Platform
                <span className="hidden lg:inline text-brand-400"> • </span>
                <span className="inline-block text-brand-300 font-semibold">
                  Bastar District (बस्तर) • Jagdalpur Block (जगदलपुर)
                </span>
              </p>
            </div>
          </div>

          {/* Quick Accessibility, Voice & Language Pill Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Connectivity status */}
            <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-full bg-brand-800/80 border border-brand-700 text-xs text-brand-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Mesh Online • Ayushman Sync Active</span>
            </div>

            {/* Voice & Contrast Assist */}
            <button
              type="button"
              onClick={handleVoiceGuidance}
              aria-label="Toggle Voice Guidance"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                isSpeaking
                  ? "bg-amber-400 text-slate-950 border-amber-300 font-bold"
                  : "bg-brand-800 hover:bg-brand-700 text-brand-100 border-brand-700"
              }`}
            >
              <svg className={`w-4 h-4 ${isSpeaking ? "text-slate-950 animate-bounce" : "text-brand-300"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
              <span className="hidden sm:inline">
                {isSpeaking ? "आवाज़ चल रही है..." : "आवाज़ सहायता"}
              </span>
            </button>

            {/* Language Pill Switcher connected to I18n */}
            <div
              className="flex items-center bg-brand-950/70 p-1 rounded-lg border border-brand-700/60 text-xs font-semibold"
              data-purpose="language-selector"
            >
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`px-2.5 py-1 rounded transition cursor-pointer ${
                  language === "en"
                    ? "bg-brand-600 text-white shadow-sm font-bold"
                    : "text-brand-200 hover:text-white"
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage("hi")}
                className={`px-2.5 py-1 rounded transition cursor-pointer ${
                  language === "hi"
                    ? "bg-brand-600 text-white shadow-sm font-bold"
                    : "text-brand-200 hover:text-white"
                }`}
              >
                हिन्दी
              </button>
              <button
                type="button"
                onClick={() => setLanguage("hne")}
                className={`px-2.5 py-1 rounded transition cursor-pointer ${
                  language === "hne"
                    ? "bg-brand-600 text-white shadow-sm font-bold"
                    : "text-brand-200 hover:text-white"
                }`}
              >
                छत्तीसगढ़ी
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* 3. MAIN CONTENT BODY                                         */}
      {/* ============================================================ */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col justify-center">
        {/* Hero Title & Subtext */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-100 text-brand-800 mb-3 border border-brand-200">
            <svg className="w-3.5 h-3.5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            छत्तीसगढ़ स्वास्थ्य सुरक्षा एवं त्वरित चेतावनी पोर्टल • Gateway 2.4
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            मितानिन् सिग्नल — एकीकृत स्वास्थ्य प्रवेश द्वार
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
            सामुदायिक स्वास्थ्य परामर्श, जलवायु-संवेदनशील रोग निगरानी, और फ़ील्ड कार्यकर्ता / पर्यवेक्षक एवं मरीज़ डिजिटल स्वास्थ्य सेवा का एकीकृत केंद्र।
          </p>
        </div>

        {/* ============================================================ */}
        {/* 4. PATHWAYS GRID (3 PRIMARY GATEWAY CARDS)                   */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start" data-purpose="pathways-grid">
          {/* ========================================== */}
          {/* CARD 1: PUBLIC ACCESS (NO LOGIN REQUIRED)  */}
          {/* ========================================== */}
          <section
            className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition flex flex-col h-full overflow-hidden"
            data-purpose="public-access-card"
          >
            {/* Top accent banner */}
            <div className="h-2 bg-emerald-600 w-full" />
            <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center ring-1 ring-emerald-100">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                    A. Public Portal
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 leading-snug">
                  सार्वजनिक स्वास्थ्य एवं सामुदायिक अलर्ट
                </h3>
                <p className="text-xs font-semibold text-emerald-700 mt-1">
                  खुली नागरिक सेवा — किसी लॉगिन या पासवर्ड की आवश्यकता नहीं
                </p>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  गाँव, हाट-बाज़ार एवं ब्लॉक स्तर पर मौसमी संक्रामक रोग (मलेरिया, डेंगू, डायरिया, लू) का त्वरित जोखिम और नजदीकी प्राथमिक स्वास्थ्य केंद्र (PHC/CHC) की स्थिति देखें।
                </p>

                {/* Feature Checklist */}
                <ul className="mt-5 space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    <span>
                      <strong>No Account Needed:</strong> तुरंत गाँव वार स्वास्थ्य बुलेटिन तक खुली पहुंच
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    <span>
                      <strong>4 Climate Health Cards:</strong> मलेरिया, डेंगू, डायरिया एवं हीटवेव अलर्ट
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    <span>
                      <strong>Emergency Directory:</strong> निकटतम एम्बुलेंस, 108 और 102 महतारी एक्सप्रेस संपर्क
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    <span>
                      <strong>Boil-Water &amp; Sanitation Advisories:</strong> शुद्ध पेयजल एवं सुरक्षित स्वच्छता निर्देश
                    </span>
                  </li>
                </ul>
              </div>

              {/* Action CTA */}
              <div className="mt-8 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onEnterPublicPortal()}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl text-sm transition shadow-sm hover:shadow group cursor-pointer"
                >
                  <span>Open Public Health Portal (सार्वजनिक पोर्टल)</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </button>
                <div className="mt-3 text-center">
                  <button
                    type="button"
                    onClick={() => setShowCitizenModal(true)}
                    className="text-[11px] text-slate-500 hover:text-emerald-700 transition cursor-pointer"
                  >
                    Citizen Sign-In (Optional feedback or survey) →
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ========================================== */}
          {/* CARD 2: STAFF LOGIN (MITANIN & SUPERVISOR) */}
          {/* ========================================== */}
          <section
            className="bg-white rounded-2xl border-2 border-brand-600/40 shadow-xl relative overflow-hidden flex flex-col h-full ring-4 ring-brand-500/10"
            data-purpose="staff-login-card"
          >
            {/* Top accent banner */}
            <div className="h-2 bg-brand-600 w-full" />
            {/* Badge for verified role */}
            <div className="bg-brand-50 px-6 py-2 border-b border-brand-100 flex items-center justify-between text-xs">
              <span className="font-bold text-brand-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-600" />
                B. Unified Staff Gateway
              </span>
              <span className="text-brand-700 font-medium text-[11px] bg-brand-100/70 px-2 py-0.5 rounded">
                Mitanin &amp; Supervisors
              </span>
            </div>

            <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center ring-1 ring-brand-200">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                  <span className="text-[11px] font-mono font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                    RBAC Level 1-4
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  स्टाफ / स्वास्थ्य कार्यकर्ता एवं पर्यवेक्षक
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  स्वचालित भूमिका पहचान (Mitanin Field Worker, Block Supervisor, or District Officer).
                </p>

                {/* Login Error Notification */}
                {loginError && (
                  <div className="mt-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                    <svg className="w-4 h-4 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    <span>{loginError}</span>
                  </div>
                )}

                {/* Staff Login Form */}
                <form className="mt-5 space-y-3.5" data-purpose="staff-login-form" onSubmit={handleStaffLogin}>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="staff-identifier">
                      Staff Identifier / Mobile (यूजरनेम / मोबाइल नंबर)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                        </svg>
                      </span>
                      <input
                        className="block w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:ring-brand-500 focus:border-brand-500 shadow-sm bg-white"
                        id="staff-identifier"
                        placeholder="e.g., asha, verma, or 9876543210"
                        type="text"
                        value={staffIdentifier}
                        onChange={(e) => setStaffIdentifier(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700" htmlFor="staff-password">
                        Password (पासवर्ड)
                      </label>
                      <button
                        type="button"
                        onClick={() => alert("कृपया पासवर्ड रीसेट के लिए अपने ब्लॉक नोडल अधिकारी अथवा bastar-health-admin से संपर्क करें।")}
                        className="text-[11px] font-medium text-brand-700 hover:text-brand-800 cursor-pointer"
                      >
                        पासवर्ड भूल गए?
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                        </svg>
                      </span>
                      <input
                        className="block w-full pl-9 pr-10 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:ring-brand-500 focus:border-brand-500 shadow-sm bg-white"
                        id="staff-password"
                        type={showPassword ? "text" : "password"}
                        value={staffPassword}
                        onChange={(e) => setStaffPassword(e.target.value)}
                        required
                      />
                      <button
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showPassword ? "Hide password" : "Show password"}
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                          <path
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* RBAC Server Enforcement Notice */}
                  <div className="rounded-lg bg-amber-50 p-2.5 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
                    <svg className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                    <span>
                      <strong>सर्वर-स्तरीय भूमिका सत्यापन:</strong> आपकी प्राधिकृत आईडी अनुसार मितानिन या पर्यवेक्षक डैशबोर्ड सीधे खुलेगा। मैन्युअल रूप से विशेषाधिकार नहीं बदले जा सकते।
                    </span>
                  </div>

                  <button
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-brand-600/20 group cursor-pointer disabled:opacity-60 active:scale-[0.99]"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        प्रमाणीकरण जारी है...
                      </span>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                        </svg>
                        <span>Sign In as Staff (स्टाफ लॉग इन करें)</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* BEGIN: Demo Credentials Selector Drawer */}
              <div className="mt-6 pt-4 border-t border-slate-100" data-purpose="demo-credentials-drawer">
                <details className="group cursor-pointer">
                  <summary className="flex items-center justify-between text-xs font-semibold text-brand-800 list-none">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-brand-600" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          clipRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          fillRule="evenodd"
                        />
                      </svg>
                      Click for Quick Demo Logins (सैम्पल खाते)
                    </span>
                    <span className="text-[10px] text-slate-500 group-open:rotate-180 transition-transform">
                      ▼
                    </span>
                  </summary>

                  <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1 text-[11px] custom-scroll">
                    {DEMO_ACCOUNTS.map((acc) => (
                      <button
                        key={acc.username}
                        type="button"
                        onClick={() => handleUseDemoAccount(acc)}
                        className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-brand-50 border border-slate-200 transition flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span>{acc.label}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${acc.badgeColor}`}>
                              {acc.roleBadge}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            username: <code className="font-mono text-brand-700 font-bold">{acc.username}</code> • {acc.scope}
                          </div>
                        </div>
                        <span className="text-xs text-brand-700 font-bold shrink-0">+ Use</span>
                      </button>
                    ))}
                  </div>
                </details>
              </div>
              {/* END: Demo Credentials Selector Drawer */}
            </div>
          </section>

          {/* ========================================== */}
          {/* CARD 3: PATIENT LOGIN (ABHA & MOBILE OTP)  */}
          {/* ========================================== */}
          <section
            className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition flex flex-col h-full overflow-hidden"
            data-purpose="patient-login-card"
          >
            {/* Top accent banner */}
            <div className="h-2 bg-indigo-600 w-full" />
            <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center ring-1 ring-indigo-100">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800">
                    C. Patient Portal
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 leading-snug">
                  मरीज़ एवं परिवार लॉगिन
                </h3>
                <p className="text-xs font-semibold text-indigo-700 mt-1">
                  Ayushman Bharat Digital Mission (ABDM) अनुपालित
                </p>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  पंजीकृत मरीज़ अपने डिजिटल स्वास्थ्य कार्ड, दवाईयों का समय, रेफरल पर्ची और गाँव के आगामी टीकाकरण/VHND शिविर की जानकारी देखें।
                </p>

                {/* Patient Notice Banner if clicked */}
                {patientNotice && (
                  <div className="mt-4 p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex items-start gap-2.5 leading-relaxed">
                    <svg className="w-5 h-5 text-indigo-700 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    <div>
                      <span className="font-bold block mb-0.5">विकास चरण सूचना (Phase 3 Roadmap):</span>
                      <span>{patientNotice}</span>
                    </div>
                  </div>
                )}

                {/* Patient Login Form */}
                <form className="mt-5 space-y-3.5" data-purpose="patient-login-form" onSubmit={handlePatientAction}>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="abha-id">
                      14-Digit ABHA ID / Registered Mobile (आभा आईडी / मोबाइल)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                        </svg>
                      </span>
                      <input
                        className="block w-full pl-9 pr-24 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm bg-white"
                        id="abha-id"
                        placeholder="91-XXXX-XXXX-XXXX or Mobile"
                        type="text"
                        value={abhaId}
                        onChange={(e) => setAbhaId(e.target.value)}
                      />
                      <button
                        className="absolute inset-y-1 right-1 px-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[11px] font-semibold rounded border border-indigo-200 transition cursor-pointer"
                        type="button"
                        onClick={() => handlePatientAction()}
                      >
                        Send OTP
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700" htmlFor="patient-otp">
                        6-Digit OTP or Security PIN (ओटीपी / सुरक्षा पिन)
                      </label>
                      <button
                        className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                        type="button"
                        onClick={() => handlePatientAction()}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3-9a3 3 0 000 6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                        </svg>
                        Voice OTP (आवाज़ में सुनें)
                      </button>
                    </div>
                    <input
                      className="block w-full tracking-widest text-center text-sm font-mono py-2 rounded-lg border border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm bg-white"
                      id="patient-otp"
                      maxLength={6}
                      placeholder="• • • • • •"
                      type="password"
                      value={patientOtp}
                      onChange={(e) => setPatientOtp(e.target.value)}
                    />
                  </div>

                  {/* Patient Data Privacy Safeguard Note */}
                  <div className="rounded-lg bg-indigo-50/70 p-2.5 border border-indigo-100 text-[11px] text-indigo-900 flex items-start gap-2">
                    <svg className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                    <span>
                      <strong>गोपनीयता सुरक्षा:</strong> आपका स्वास्थ्य डेटा केवल आपकी सहमति (Consent PIN) से देखा जा सकता है। आयुष्मान डिजिटल मिशन मानकों से सुरक्षित।
                    </span>
                  </div>

                  <button
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-indigo-700 hover:bg-indigo-800 text-white font-semibold rounded-xl text-sm transition shadow-sm hover:shadow group cursor-pointer"
                    type="submit"
                  >
                    <span>Access Patient Health Portal (मरीज़ पोर्टल खोलें)</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                  </button>
                </form>
              </div>

              <div className="mt-6 pt-3 text-center border-t border-slate-100">
                <span className="text-[11px] text-slate-500">
                  Need help creating your ABHA Card? Visit your local Mitanin Didi or PHC.
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* ============================================================ */}
        {/* 5. EMERGENCY CONTACTS SECTION (24/7 HELPLINES)               */}
        {/* ============================================================ */}
        <section
          className="mt-12 bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm"
          data-purpose="emergency-helplines"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                24/7 आपातकालीन स्वास्थ्य सहायता (Toll-Free Helplines &amp; Assistance)
              </h3>
              <p className="text-xs text-slate-500">बस्तर संभाग एवं छत्तीसगढ़ राज्य त्वरित प्रतिक्रिया दल</p>
            </div>
            <span className="text-xs font-semibold text-brand-800 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
              State Control Room: 0771-2235091
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <a
              href="tel:108"
              className="p-3 rounded-xl bg-red-50 border border-red-100 hover:bg-red-100/80 transition block"
            >
              <div className="text-[11px] font-semibold text-red-600 uppercase">Emergency Ambulance</div>
              <div className="text-lg font-extrabold text-red-900 font-mono">108</div>
              <div className="text-[10px] text-slate-500 mt-0.5">आपातकालीन एम्बुलेंस सेवा</div>
            </a>

            <a
              href="tel:102"
              className="p-3 rounded-xl bg-pink-50 border border-pink-100 hover:bg-pink-100/80 transition block"
            >
              <div className="text-[11px] font-semibold text-pink-600 uppercase">Mahtari Express</div>
              <div className="text-lg font-extrabold text-pink-900 font-mono">102</div>
              <div className="text-[10px] text-slate-500 mt-0.5">मातृ एवं शिशु स्वास्थ्य वाहन</div>
            </a>

            <a
              href="tel:07782222234"
              className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 hover:bg-emerald-100/80 transition block"
            >
              <div className="text-[11px] font-semibold text-emerald-700 uppercase">Jagdalpur CHC Desk</div>
              <div className="text-sm font-bold text-emerald-950 font-mono mt-1">07782-222234</div>
              <div className="text-[10px] text-slate-500 mt-0.5">सामुदायिक स्वास्थ्य केंद्र</div>
            </a>

            <a
              href="tel:14416"
              className="p-3 rounded-xl bg-brand-50 border border-brand-100 hover:bg-brand-100/80 transition block"
            >
              <div className="text-[11px] font-semibold text-brand-800 uppercase">Tele-MANAS Mental Health</div>
              <div className="text-lg font-extrabold text-brand-950 font-mono">14416</div>
              <div className="text-[10px] text-slate-500 mt-0.5">निःशुल्क परामर्श एवं मार्गदर्शन</div>
            </a>
          </div>
        </section>
      </main>

      {/* ============================================================ */}
      {/* 6. MAIN FOOTER                                               */}
      {/* ============================================================ */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6" data-purpose="site-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Mitanin Signal Prototype</span>
            <span>•</span>
            <span>Simulated Surveillance &amp; Climate-Health Gateway</span>
            <span>•</span>
            <span>National Health Mission, Government of Chhattisgarh</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <button
              type="button"
              onClick={() => setActiveInfoModal("privacy")}
              className="hover:text-brand-700 underline cursor-pointer"
            >
              डेटा सुरक्षा एवं निजता नीति
            </button>
            <button
              type="button"
              onClick={() => setActiveInfoModal("abdm")}
              className="hover:text-brand-700 underline cursor-pointer"
            >
              ABDM Standards
            </button>
            <button
              type="button"
              onClick={() => setActiveInfoModal("contact")}
              className="hover:text-brand-700 underline cursor-pointer"
            >
              तकनीकी सहायता डेस्क
            </button>
          </div>
        </div>
      </footer>

      {/* ============================================================ */}
      {/* 7. FLOATING MITANIN SAHAYAK WIDGET                           */}
      {/* ============================================================ */}
      <aside className="fixed bottom-4 right-4 z-50" data-purpose="floating-assistant-widget">
        <button
          type="button"
          onClick={handleVoiceGuidance}
          className="flex items-center gap-2 bg-brand-800 hover:bg-brand-900 text-white pl-3 pr-2 py-2 rounded-full shadow-2xl border border-brand-700 ring-2 ring-brand-500/20 transition-all hover:scale-105 cursor-pointer text-left"
        >
          <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-brand-200 shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </div>
          <div className="text-xs font-semibold pr-1">
            <span>मितानिन् सहायक (Mitanin Sahayak)</span>
          </div>
          <span className="bg-brand-950/80 text-[10px] text-brand-200 font-mono px-2 py-0.5 rounded-full border border-brand-700 shrink-0">
            EN • हिं • छग
          </span>
        </button>
      </aside>

      {/* ============================================================ */}
      {/* 8. OPTIONAL CITIZEN SIGN-IN MODAL                            */}
      {/* ============================================================ */}
      {showCitizenModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                नागरिक पहचान (Citizen Sign-In)
              </h3>
              <button
                type="button"
                onClick={() => setShowCitizenModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-lg font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              कृपया अपना नाम या ग्राम दर्ज करें (वैकल्पिक)। सार्वजनिक स्वास्थ्य बुलेटिन देखने के लिए कोई पासवर्ड आवश्यक नहीं है।
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="citizen-name-input">
                आपका नाम / ग्राम (Optional)
              </label>
              <input
                id="citizen-name-input"
                type="text"
                value={citizenName}
                onChange={(e) => setCitizenName(e.target.value)}
                placeholder="उदा. रमेश बघेल, ग्राम नेतानार"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setShowCitizenModal(false)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCitizenModal(false);
                  onEnterPublicPortal(citizenName.trim() || undefined);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm cursor-pointer"
              >
                डैशबोर्ड खोलें →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 9. INFORMATION MODAL (PRIVACY / ABDM / SUPPORT)              */}
      {/* ============================================================ */}
      {activeInfoModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto custom-scroll">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {activeInfoModal === "privacy" && "डेटा सुरक्षा एवं निजता नीति (Data Privacy Policy)"}
                {activeInfoModal === "abdm" && "ABDM Standards & Compliance"}
                {activeInfoModal === "contact" && "तकनीकी सहायता डेस्क (Technical Helpdesk)"}
              </h3>
              <button
                type="button"
                onClick={() => setActiveInfoModal(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-2.5 leading-relaxed">
              {activeInfoModal === "privacy" && (
                <>
                  <p>
                    <strong>राष्ट्रीय स्वास्थ्य मिशन (NHM), छत्तीसगढ़ शासन</strong> के दिशा-निर्देशों के तहत, मितानिन सिग्नल प्लेटफ़ॉर्म पर संग्रहीत सभी स्वास्थ्य डेटा केवल सार्वजनिक स्वास्थ्य निगरानी और रोग नियंत्रण हेतु उपयोग किया जाता है।
                  </p>
                  <p>
                    मरीज़ों की व्यक्तिगत पहचान (PII) को एनक्रिप्टेड रखा जाता है। कोई भी असंबंधित डेटा तीसरे पक्ष के साथ साझा नहीं किया जाता है।
                  </p>
                </>
              )}
              {activeInfoModal === "abdm" && (
                <>
                  <p>
                    <strong>Ayushman Bharat Digital Mission (ABDM) अनुपालना:</strong> यह प्रणाली 14-अंकीय आभा आईडी (ABHA ID), एम1/एम2/एम3 स्वास्थ्य सूचना विनिमय मानकों और सहमति-आधारित (Consent Architecture) स्वास्थ्य डेटा प्रोटोकॉल के अनुरूप अभिकल्पित है।
                  </p>
                  <p>
                    प्रस्तावित चरण 3 में मरीज़ों के स्वास्थ्य रिकॉर्ड, टीकाकरण इतिहास और रेफरल पर्ची को सुरक्षित आयुष्मान गेटवे से सीधे सिंक्रोनाइज़ किया जाएगा।
                  </p>
                </>
              )}
              {activeInfoModal === "contact" && (
                <>
                  <p>
                    <strong>बस्तर जिला स्वास्थ्य नियंत्रण कक्ष:</strong> दूरभाष: 07782-222234 / राज्य कंट्रोल रूम: 0771-2235091
                  </p>
                  <p>
                    तकनीकी त्रुटि, उपयोगकर्ता खाता सत्यापन या सर्वर संबंधी समस्या के लिए अपने ब्लॉक नोडल अधिकारी अथवा स्वास्थ्य विभाग आईटी डेस्क से संपर्क करें।
                  </p>
                </>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveInfoModal(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg cursor-pointer"
              >
                समझ गया (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
