import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { Banner } from "./components/Banner";
import { Dashboard } from "./pages/Dashboard";
import { AlertDetail } from "./pages/AlertDetail";
import { AssignTask } from "./pages/AssignTask";
import { TaskLedger } from "./pages/TaskLedger";
import { MitaninMobile } from "./pages/MitaninMobile";
import { SettingsDataStatus } from "./pages/SettingsDataStatus";
import { ModelEvidence } from "./pages/ModelEvidence";
import { PortalLanding } from "./pages/PortalLanding";
import { PublicDashboard } from "./pages/PublicDashboard";
import { EmployeeDashboard } from "./pages/EmployeeDashboard";
import { SupervisorDashboard } from "./pages/SupervisorDashboard";
import { DiseaseDetail } from "./pages/DiseaseDetail";
import { VoiceTasksPage } from "./pages/VoiceTasksPage";
import { VillageVisitPlanner } from "./pages/VillageVisitPlanner";
import { ActiveVillageVisit } from "./pages/ActiveVillageVisit";
import { ScreeningRiskTriage } from "./pages/ScreeningRiskTriage";
import { PatientRegistration } from "./pages/PatientRegistration";
import { VisitCompletionFollowUp } from "./pages/VisitCompletionFollowUp";
import { MitaninSahayakChatbot } from "./components/MitaninSahayakChatbot";
import { I18nProvider, useI18n } from "./i18n/I18nContext";
import {
  LocationSelectorModal,
  type SelectedLocationState,
} from "./components/LocationSelectorModal";
import { clearSyncedItems } from "./services/offlineSync";
import { useMeta } from "./hooks/useMeta";

const DEFAULT_LOCATION: SelectedLocationState = {
  district_id: "LGD_DIST_374",
  district_name: "Bastar",
  block_id: "LGD_BLK_3595",
  block_name: "Jagdalpur",
  village_id: "",
  village_name: "",
  breadcrumb: "Bastar · Jagdalpur (LGD 3595)",
};

function AppInner() {
  const { meta } = useMeta();
  const { t, setLanguage } = useI18n();

  const hasExplicitDeepLink = () => {
    if (typeof window === "undefined") return false;
    const p = window.location.pathname;
    const h = window.location.hash;
    if (
      p === "/mitanin" ||
      p === "/evidence" ||
      p === "/ledger" ||
      p === "/settings" ||
      p === "/tasks" ||
      p === "/alerts" ||
      p === "/voice-tasks" ||
      p === "/village-planner" ||
      p === "/active-encounter" ||
      p === "/screening-triage" ||
      p === "/patient-registration" ||
      p === "/visit-completion"
    ) {
      return true;
    }
    if (h && h !== "#" && h !== "#portals" && h !== "#login") {
      return true;
    }
    return false;
  };

  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem("ms_auth_token");
    } catch {
      return null;
    }
  });

  const [currentUser, setCurrentUser] = useState<any | null>(() => {
    try {
      const raw = sessionStorage.getItem("ms_current_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [portalMode, setPortalMode] = useState<"public" | "field_employee" | "supervisor">(() => {
    try {
      const saved = sessionStorage.getItem("ms_portal_mode") as any;
      if (saved === "public" || saved === "field_employee" || saved === "supervisor") {
        return saved;
      }
    } catch {}
    return "supervisor";
  });

  const [citizenName, setCitizenName] = useState<string>("");

  const [selectedLocation, setSelectedLocation] = useState<SelectedLocationState>(() => {
    try {
      const raw = sessionStorage.getItem("ms_selected_location");
      if (raw) return JSON.parse(raw);
    } catch {}
    return DEFAULT_LOCATION;
  });

  const [showPortalLanding, setShowPortalLanding] = useState<boolean>(() => {
    if (hasExplicitDeepLink()) return false;
    try {
      if (sessionStorage.getItem("ms_portal_active") === "true") return false;
    } catch {}
    return true;
  });

  const [showLocationGate, setShowLocationGate] = useState<boolean>(false);
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);

  const getInitialTab = () => {
    if (typeof window === "undefined") return "dashboard";
    if (window.location.pathname === "/mitanin" || window.location.hash === "#mitanin") return "mitanin";
    if (window.location.pathname === "/voice-tasks" || window.location.hash === "#voice-tasks") return "voice-tasks";
    if (window.location.pathname === "/village-planner" || window.location.hash === "#village-planner") return "village-planner";
    if (window.location.pathname === "/active-encounter" || window.location.hash === "#active-encounter") return "active-encounter";
    if (window.location.pathname === "/screening-triage" || window.location.hash === "#screening-triage") return "screening-triage";
    if (window.location.pathname === "/patient-registration" || window.location.hash === "#patient-registration") return "patient-registration";
    if (window.location.pathname === "/visit-completion" || window.location.hash === "#visit-completion") return "visit-completion";
    if (window.location.pathname === "/evidence" || window.location.hash === "#evidence") return "evidence";
    if (window.location.pathname === "/ledger" || window.location.hash === "#ledger") return "ledger";
    if (window.location.pathname === "/settings" || window.location.hash === "#settings") return "settings";
    if (window.location.pathname === "/tasks" || window.location.hash === "#tasks") return "tasks";
    if (window.location.pathname === "/alerts" || window.location.hash === "#alerts") return "alerts";
    if (window.location.hash) {
      const clean = window.location.hash.replace("#", "");
      if (clean && clean !== "portals" && clean !== "login") return clean;
    }
    try {
      const savedMode = sessionStorage.getItem("ms_portal_mode");
      if (savedMode === "public") return "public-dashboard";
      if (savedMode === "field_employee") return "emp-dashboard";
      if (savedMode === "supervisor" && sessionStorage.getItem("ms_auth_token")) return "sup-dashboard";
    } catch {}
    return "dashboard";
  };

  const initialIsMobileRoute =
    typeof window !== "undefined" &&
    (window.location.pathname === "/mitanin" || window.location.hash === "#mitanin");

  const [currentTab, setCurrentTab] = useState<string>(getInitialTab());
  const [previousTab, setPreviousTab] = useState<string>("public-dashboard");
  const [visitContext, setVisitContext] = useState<{
    householdId?: string;
    visitId?: number;
    encounterId?: number;
    patientData?: any;
  }>({});
  const [selectedDiseaseType, setSelectedDiseaseType] = useState<string>("malaria");
  const [selectedAlertId, setSelectedAlertId] = useState<number | undefined>(undefined);
  const [alertCount, setAlertCount] = useState<number>(3);
  const [taskCount, setTaskCount] = useState<number>(5);
  const [periodText, setPeriodText] = useState<string>("Week of 12 Oct");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const handleSwitchPortalMode = (mode: "public" | "field_employee" | "supervisor") => {
    if (mode === "public") {
      setPortalMode("public");
      switchTab("public-dashboard");
      return;
    }
    if (mode === "field_employee") {
      if (currentUser?.role === "field_employee" && authToken) {
        setPortalMode("field_employee");
        switchTab("emp-dashboard");
      } else {
        setShowPortalLanding(true);
      }
      return;
    }
    if (mode === "supervisor") {
      if (currentUser?.role === "supervisor" && authToken) {
        setPortalMode("supervisor");
        switchTab("sup-dashboard");
      } else {
        setShowPortalLanding(true);
      }
      return;
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname === "/mitanin") {
        setShowPortalLanding(false);
        setShowLocationGate(false);
        setCurrentTab("mitanin");
      } else if (window.location.hash) {
        const hashTab = window.location.hash.replace("#", "");
        if (hashTab === "portals" || hashTab === "login") {
          setShowPortalLanding(true);
        } else if (hashTab) {
          setShowPortalLanding(false);
          setShowLocationGate(false);
          const resolvedTab =
            portalMode === "public" && (hashTab === "evidence" || hashTab === "settings")
              ? "public-dashboard"
              : hashTab;
          setCurrentTab(resolvedTab);
        }
      }
    };
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("hashchange", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("hashchange", handlePopState);
    };
  }, [currentTab, portalMode]);

  const switchTab = (tab: string) => {
    if (tab !== currentTab) {
      setPreviousTab(currentTab);
    }
    const nextTab =
      portalMode === "public" && (tab === "evidence" || tab === "settings")
        ? "public-dashboard"
        : tab;
    setCurrentTab(nextTab);
    setShowPortalLanding(false);
    setShowLocationGate(false);
    if (nextTab === "mitanin") {
      window.history.pushState({}, "", "/mitanin");
    } else {
      window.history.pushState({}, "", `#${nextTab}`);
    }
  };

  const refreshSummaryCounts = () => {
    const params = new URLSearchParams();
    if (selectedLocation?.district_id) params.set("district_id", selectedLocation.district_id);
    if (selectedLocation?.block_id) params.set("block_id", selectedLocation.block_id);
    const qs = params.toString() ? `?${params.toString()}` : "";

    fetch(`http://127.0.0.1:8000/dashboard/summary${qs}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.active_alerts_count !== undefined) {
          setAlertCount(data.active_alerts_count);
        }
        if (data.open_tasks_count !== undefined) {
          setTaskCount(data.open_tasks_count);
        }
        if (data.clock_now) {
          try {
            const d = new Date(data.clock_now);
            const dateFmt = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const prefix = meta.granularity === "monthly" ? "Month of" : "Week of";
            setPeriodText(`${prefix} ${dateFmt}`);
          } catch {}
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    refreshSummaryCounts();
  }, [meta.granularity, selectedLocation.district_id, selectedLocation.block_id]);

  const handleEnterPublicPortal = (name?: string) => {
    setCitizenName(name || "Public Citizen");
    setAuthToken(null);
    setCurrentUser(null);
    setPortalMode("public");
    setCurrentTab("public-dashboard");
    try {
      sessionStorage.removeItem("ms_auth_token");
      sessionStorage.removeItem("ms_current_user");
      localStorage.removeItem("ms_auth_token");
      sessionStorage.setItem("ms_portal_mode", "public");
    } catch {}
    setShowPortalLanding(false);
    setShowLocationGate(true);
  };

  const handleEmployeeAuthenticated = (payload: {
    token: string;
    user: any;
    portal_role: "field_employee" | "supervisor";
    assigned_location: any;
    authorized_block_ids: string[];
  }) => {
    setAuthToken(payload.token);
    setCurrentUser(payload.user);
    setPortalMode(payload.portal_role);

    if (
      payload.user?.preferred_language &&
      ["en", "hi", "hne"].includes(payload.user.preferred_language) &&
      !localStorage.getItem("ms_language")
    ) {
      setLanguage(payload.user.preferred_language);
    }

    const loc = payload.assigned_location;
    if (loc) {
      const nextLoc: SelectedLocationState = {
        district_id: loc.district?.unit_id || payload.user.district_id || "DIST_SAMPLE",
        district_name: loc.district?.unit_name || "Sample District",
        block_id: loc.block?.unit_id || payload.user.block_id || "BLK_A",
        block_name: loc.block?.unit_name || "Sample Block A",
        village_id: loc.village?.unit_id || payload.user.village_id || "VIL_A1",
        village_name: loc.village?.unit_name || "Sample Village A1",
        breadcrumb: loc.location_breadcrumb || DEFAULT_LOCATION.breadcrumb,
      };
      setSelectedLocation(nextLoc);
      try {
        sessionStorage.setItem("ms_selected_location", JSON.stringify(nextLoc));
      } catch {}
    }

    try {
      sessionStorage.setItem("ms_auth_token", payload.token);
      localStorage.setItem("ms_auth_token", payload.token);
      sessionStorage.setItem("ms_current_user", JSON.stringify(payload.user));
      sessionStorage.setItem("ms_portal_mode", payload.portal_role);
    } catch {}

    setShowPortalLanding(false);
    setShowLocationGate(true);
  };

  const handleLocationConfirmed = (loc: SelectedLocationState) => {
    setSelectedLocation(loc);
    setShowLocationGate(false);
    setShowLocationModal(false);
    try {
      sessionStorage.setItem("ms_selected_location", JSON.stringify(loc));
      sessionStorage.setItem("ms_portal_active", "true");
    } catch {}

    if (showLocationGate) {
      if (portalMode === "public") {
        switchTab("public-dashboard");
      } else if (portalMode === "field_employee") {
        switchTab("emp-dashboard");
      } else {
        switchTab("sup-dashboard");
      }
    }
  };

  const handleLogout = async () => {
    if (authToken) {
      try {
        await fetch("http://127.0.0.1:8000/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` },
        });
      } catch {}
    }
    setAuthToken(null);
    setCurrentUser(null);
    try {
      sessionStorage.removeItem("ms_auth_token");
      localStorage.removeItem("ms_auth_token");
      sessionStorage.removeItem("ms_current_user");
      sessionStorage.removeItem("ms_portal_active");
      clearSyncedItems();
    } catch {}
    setShowLocationGate(false);
    setShowPortalLanding(true);
  };

  const handleNavigateToAlert = (alertId: number) => {
    setSelectedAlertId(alertId);
    switchTab("alerts");
  };

  const handleNavigateToAssignTask = (alertId?: number) => {
    if (alertId) setSelectedAlertId(alertId);
    switchTab("tasks");
  };

  const handleSelectDiseaseDetail = (diseaseType: string) => {
    if (currentTab !== "disease-detail") {
      setPreviousTab(currentTab);
    }
    setSelectedDiseaseType(diseaseType);
    switchTab("disease-detail");
  };

  const districtName = selectedLocation.district_name || meta.district || "Sample District";

  // 1. Dedicated full-screen mobile view if directly navigated to /mitanin
  if (currentTab === "mitanin" && initialIsMobileRoute && !showPortalLanding && !showLocationGate) {
    return (
      <div className="min-h-screen bg-canvas text-ink font-sans antialiased">
        <Banner />
        <MitaninMobile
          onReturnToDistrict={() => switchTab("dashboard")}
          onLedgerUpdate={refreshSummaryCounts}
          selectedLocation={selectedLocation}
          onChangeLocation={() => setShowLocationModal(true)}
        />
        <MitaninSahayakChatbot
          authToken={authToken}
          portalMode="field_employee"
          selectedLocation={selectedLocation}
          onActionExecuted={refreshSummaryCounts}
        />
      </div>
    );
  }

  // 2. Landing Page (Public Portal vs Employee Portal)
  if (showPortalLanding) {
    return (
      <div className="min-h-screen bg-canvas text-ink font-sans antialiased">
        <Banner />
        <PortalLanding
          onEnterPublicPortal={handleEnterPublicPortal}
          onEmployeeAuthenticated={handleEmployeeAuthenticated}
        />
        <MitaninSahayakChatbot
          authToken={authToken}
          portalMode="public"
          selectedLocation={selectedLocation}
          onActionExecuted={refreshSummaryCounts}
        />
      </div>
    );
  }

  // 3. Location Selection Gate Before Dashboard Access
  if (showLocationGate) {
    return (
      <div className="min-h-screen bg-canvas text-ink font-sans antialiased">
        <Banner />
        <LocationSelectorModal
          mode="gate"
          portalType={portalMode === "public" ? "public" : "employee"}
          authToken={authToken}
          currentUser={currentUser}
          initialLocation={selectedLocation}
          onConfirm={handleLocationConfirmed}
          onBackToPortal={() => {
            setShowLocationGate(false);
            setShowPortalLanding(true);
          }}
        />
        <MitaninSahayakChatbot
          authToken={authToken}
          portalMode={portalMode}
          selectedLocation={selectedLocation}
          onActionExecuted={refreshSummaryCounts}
        />
      </div>
    );
  }

  const activeTab =
    portalMode === "public" && (currentTab === "evidence" || currentTab === "settings")
      ? "public-dashboard"
      : currentTab;

  const getTabTitle = () => {
    switch (activeTab) {
      case "public-dashboard":
        return t("nav.public_dashboard");
      case "emp-dashboard":
        return t("nav.employee_dashboard");
      case "voice-tasks":
        return t("nav.voice_tasks");
      case "my-tasks":
        return t("employee.my_tasks_title");
      case "sup-dashboard":
        return t("nav.supervisor_dashboard");
      case "team-tasks":
        return t("supervisor.team_tasks_title");
      case "disease-detail":
        return t("risk.view_details");
      case "alerts":
        return t("nav.alert_detail");
      case "tasks":
        return t("nav.assign_task");
      case "ledger":
        return t("nav.task_ledger");
      case "mitanin":
        return t("nav.mitanin_mobile");
      case "village-planner":
        return "Village Visit Planner & Roster";
      case "active-encounter":
        return "Active Village Visit & Patient Encounter";
      case "screening-triage":
        return "Screening & Explainable Risk Triage";
      case "patient-registration":
        return "Patient Registration & Intake";
      case "visit-completion":
        return "Visit Finalization & Follow-up";
      case "evidence":
        return t("nav.model_evidence");
      case "settings":
        return t("nav.settings");
      default:
        return t("nav.block_overview");
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas text-ink font-sans antialiased">
      {/* Left Navigation Sidebar */}
      <Sidebar
        currentTab={activeTab}
        onSelectTab={switchTab}
        alertCount={alertCount}
        taskCount={taskCount}
        districtName={districtName}
        portalMode={portalMode}
        currentUser={currentUser}
        locationBreadcrumb={selectedLocation.breadcrumb}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onSwitchPortalMode={handleSwitchPortalMode}
        onOpenPortalSwitcher={() => setShowPortalLanding(true)}
        onLogout={handleLogout}
        onChangeLocation={() => setShowLocationModal(true)}
      />

      {/* Main App Body */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mandatory Honesty Rules Banner */}
        <Banner />

        {/* Top Header Bar */}
        <TopBar
          title={getTabTitle()}
          districtName={districtName}
          periodText={periodText}
          locationBreadcrumb={selectedLocation.breadcrumb}
          currentUser={currentUser}
          alertCount={alertCount}
          onToggleSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          onOpenAlerts={() => switchTab("alerts")}
          onChangeLocation={() => setShowLocationModal(true)}
          onOpenPortalLanding={() => setShowPortalLanding(true)}
          onLogout={handleLogout}
        />

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === "public-dashboard" && (
            <PublicDashboard
              selectedLocation={selectedLocation}
              citizenName={citizenName}
              onChangeLocation={() => setShowLocationModal(true)}
              onSwitchPortal={() => setShowPortalLanding(true)}
              onSelectDiseaseDetail={handleSelectDiseaseDetail}
            />
          )}

          {(currentTab === "emp-dashboard" || currentTab === "my-tasks") && authToken && (
            <EmployeeDashboard
              activeView={currentTab as "emp-dashboard" | "my-tasks"}
              authToken={authToken}
              selectedLocation={selectedLocation}
              onChangeLocation={() => setShowLocationModal(true)}
              onSwitchView={(v) => switchTab(v)}
              onDataUpdated={refreshSummaryCounts}
              onSelectDiseaseDetail={handleSelectDiseaseDetail}
            />
          )}

          {currentTab === "voice-tasks" && (
            <VoiceTasksPage
              authToken={authToken}
              currentUser={currentUser}
              selectedLocation={selectedLocation}
            />
          )}

          {currentTab === "village-planner" && (
            <VillageVisitPlanner
              authToken={authToken}
              selectedLocation={selectedLocation}
              onStartEncounter={(hhId, vId) => {
                setVisitContext((prev) => ({ ...prev, householdId: hhId, visitId: vId }));
                switchTab("active-encounter");
              }}
              onNavigateScreening={() => switchTab("screening-triage")}
              onNavigatePatientRegistration={(hhId) => {
                if (hhId) {
                  setVisitContext((prev) => ({ ...prev, householdId: hhId }));
                }
                switchTab("patient-registration");
              }}
              onBack={() => switchTab(portalMode === "field_employee" ? "emp-dashboard" : "dashboard")}
              onChangeLocation={() => setShowLocationModal(true)}
            />
          )}

          {currentTab === "active-encounter" && (
            <ActiveVillageVisit
              authToken={authToken}
              householdId={visitContext.householdId || "HH-14B"}
              visitId={visitContext.visitId || 1}
              selectedLocation={selectedLocation}
              onNavigateScreening={(encId, pData) => {
                setVisitContext((prev) => ({ ...prev, encounterId: encId, patientData: pData }));
                switchTab("screening-triage");
              }}
              onCompleteEncounter={() => {
                refreshSummaryCounts();
                switchTab("visit-completion");
              }}
              onBack={() => switchTab("village-planner")}
            />
          )}

          {currentTab === "visit-completion" && (
            <VisitCompletionFollowUp
              authToken={authToken}
              encounterId={visitContext.encounterId}
              visitId={visitContext.visitId}
              householdId={visitContext.householdId || "HH-14B"}
              selectedLocation={selectedLocation}
              currentUser={currentUser}
              onNavigatePlanner={() => switchTab("village-planner")}
              onFinishComplete={() => {
                refreshSummaryCounts();
                switchTab("village-planner");
              }}
              onBack={() => switchTab("active-encounter")}
            />
          )}

          {currentTab === "screening-triage" && (
            <ScreeningRiskTriage
              authToken={authToken}
              encounterId={visitContext.encounterId}
              initialPatientData={visitContext.patientData}
              selectedLocation={selectedLocation}
              onBack={() => switchTab(previousTab || "village-planner")}
              onNavigateReferrals={() => switchTab("tasks")}
            />
          )}

          {currentTab === "patient-registration" && (
            <PatientRegistration
              authToken={authToken}
              selectedLocation={selectedLocation}
              initialHouseholdId={visitContext.householdId || "HH-04"}
              onNavigateScreening={(pData) => {
                setVisitContext((prev) => ({ ...prev, patientData: pData }));
                switchTab("screening-triage");
              }}
              onNavigateEncounter={(hhId, pData) => {
                setVisitContext((prev) => ({ ...prev, householdId: hhId, patientData: pData }));
                switchTab("active-encounter");
              }}
              onBack={() => switchTab(previousTab || "village-planner")}
            />
          )}

          {(currentTab === "sup-dashboard" || currentTab === "team-tasks") && authToken && (
            <SupervisorDashboard
              activeView={currentTab as "sup-dashboard" | "team-tasks"}
              authToken={authToken}
              selectedLocation={selectedLocation}
              onChangeLocation={() => setShowLocationModal(true)}
              onSwitchView={(v) => switchTab(v)}
              onDataUpdated={refreshSummaryCounts}
              onSelectDiseaseDetail={handleSelectDiseaseDetail}
            />
          )}

          {currentTab === "disease-detail" && (
            <DiseaseDetail
              diseaseType={selectedDiseaseType}
              selectedLocation={selectedLocation}
              authToken={authToken}
              portalMode={portalMode}
              onChangeDisease={(dType) => setSelectedDiseaseType(dType)}
              onChangeLocation={() => setShowLocationModal(true)}
              onBack={() =>
                switchTab(
                  previousTab ||
                    (portalMode === "public"
                      ? "public-dashboard"
                      : portalMode === "field_employee"
                      ? "emp-dashboard"
                      : "sup-dashboard")
                )
              }
            />
          )}

          {currentTab === "dashboard" && (
            <Dashboard
              onRefreshNeeded={refreshSummaryCounts}
              onNavigateToAlert={handleNavigateToAlert}
              onSelectDiseaseDetail={handleSelectDiseaseDetail}
              selectedLocation={selectedLocation}
            />
          )}

          {currentTab === "alerts" && (
            <AlertDetail
              initialAlertId={selectedAlertId}
              onNavigateBack={() => switchTab("dashboard")}
              onTaskCreated={refreshSummaryCounts}
              onNavigateToAssignTask={handleNavigateToAssignTask}
            />
          )}

          {currentTab === "tasks" && (
            <AssignTask
              initialAlertId={selectedAlertId}
              onNavigateBack={() => switchTab("alerts")}
              onTaskCreated={refreshSummaryCounts}
              onNavigateToLedger={() => switchTab("ledger")}
            />
          )}

          {currentTab === "ledger" && (
            <TaskLedger onRefreshNeeded={refreshSummaryCounts} />
          )}

          {currentTab === "mitanin" && (
            <MitaninMobile
              onReturnToDistrict={() =>
                switchTab(portalMode === "field_employee" ? "emp-dashboard" : "dashboard")
              }
              onLedgerUpdate={refreshSummaryCounts}
              selectedLocation={selectedLocation}
              onChangeLocation={() => setShowLocationModal(true)}
            />
          )}

          {activeTab === "evidence" && <ModelEvidence />}

          {activeTab === "settings" && <SettingsDataStatus authToken={authToken} />}
        </main>
      </div>

      {/* Change Location Modal */}
      {showLocationModal && (
        <LocationSelectorModal
          mode="modal"
          portalType={portalMode === "public" ? "public" : "employee"}
          authToken={authToken}
          currentUser={currentUser}
          initialLocation={selectedLocation}
          onConfirm={handleLocationConfirmed}
          onCancel={() => setShowLocationModal(false)}
        />
      )}

      {/* Floating Multilingual AI Chatbot (Mitanin Sahayak) */}
      <MitaninSahayakChatbot
        authToken={authToken}
        portalMode={portalMode}
        selectedLocation={selectedLocation}
        focusedDisease={selectedDiseaseType as any}
        onActionExecuted={refreshSummaryCounts}
      />
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppInner />
    </I18nProvider>
  );
}

