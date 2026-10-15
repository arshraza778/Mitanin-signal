import {
  LayoutDashboard,
  AlertTriangle,
  CheckSquare,
  Clock,
  BarChart3,
  Settings,
  Smartphone,
  Globe,
  ShieldCheck,
  Users,
  ClipboardList,
  LogOut,
  MapPin,
  Volume2,
  UserPlus,
  FileCheck,
  X,
} from "lucide-react";
import { useI18n } from "../i18n/I18nContext";

export interface NavSection {
  title: string;
  items: Array<{
    id: string;
    label: string;
    icon: any;
    badge?: number;
    badgeVariant?: "error" | "primary" | "warning";
  }>;
}

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  alertCount: number;
  taskCount: number;
  districtName: string;
  portalMode?: "public" | "field_employee" | "supervisor";
  currentUser?: any | null;
  locationBreadcrumb?: string;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onSwitchPortalMode?: (mode: "public" | "field_employee" | "supervisor") => void;
  onOpenPortalSwitcher?: () => void;
  onLogout?: () => void;
  onChangeLocation?: () => void;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  alertCount,
  taskCount,
  districtName,
  portalMode = "supervisor",
  currentUser,
  locationBreadcrumb,
  isMobileOpen = false,
  onCloseMobile,
  onSwitchPortalMode,
  onOpenPortalSwitcher,
  onLogout,
  onChangeLocation,
}: SidebarProps) {
  const { t } = useI18n();

  const handleItemClick = (id: string) => {
    onSelectTab(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  // Structured Nav Sections matching Stitch Design System
  const getNavSections = (): NavSection[] => {
    if (portalMode === "public") {
      return [
        {
          title: "Public Portals",
          items: [
            { id: "public-dashboard", label: t("nav.public_dashboard"), icon: Globe },
          ],
        },
      ];
    }

    if (portalMode === "field_employee") {
      return [
        {
          title: "Portals",
          items: [
            { id: "emp-dashboard", label: t("nav.employee_dashboard"), icon: LayoutDashboard },
            { id: "public-dashboard", label: t("nav.public_dashboard"), icon: Globe },
          ],
        },
        {
          title: "Tasks & Fieldwork",
          items: [
            { id: "village-planner", label: "Village Visit Planner", icon: MapPin },
            { id: "patient-registration", label: "Patient Intake & Reg", icon: UserPlus },
            { id: "visit-completion", label: "Visit Finalization & Parchaa", icon: FileCheck },
            { id: "voice-tasks", label: t("nav.voice_tasks"), icon: Volume2, badge: taskCount },
            { id: "my-tasks", label: t("employee.my_tasks_title"), icon: ClipboardList, badge: taskCount },
            { id: "mitanin", label: t("nav.mitanin_mobile"), icon: Smartphone },
          ],
        },
        {
          title: "System",
          items: [
            { id: "settings", label: t("nav.settings"), icon: Settings },
          ],
        },
      ];
    }

    // Supervisor / District Officer Mode
    return [
      {
        title: "Portals",
        items: [
          { id: "sup-dashboard", label: t("nav.supervisor_dashboard"), icon: ShieldCheck },
          { id: "public-dashboard", label: t("nav.public_dashboard"), icon: Globe },
        ],
      },
      {
        title: "Tasks & Fieldwork",
        items: [
          { id: "team-tasks", label: t("supervisor.team_tasks_title"), icon: Users, badge: taskCount },
          { id: "voice-tasks", label: t("nav.voice_tasks"), icon: Volume2 },
          { id: "tasks", label: t("nav.assign_task"), icon: CheckSquare },
          { id: "ledger", label: t("nav.task_ledger"), icon: Clock },
          { id: "mitanin", label: t("nav.mitanin_mobile"), icon: Smartphone },
        ],
      },
      {
        title: "Epidemiology & Surveillance",
        items: [
          { id: "dashboard", label: t("nav.block_overview"), icon: LayoutDashboard },
          { id: "alerts", label: t("nav.alert_detail"), icon: AlertTriangle, badge: alertCount, badgeVariant: "error" },
          { id: "evidence", label: t("nav.model_evidence"), icon: BarChart3 },
        ],
      },
      {
        title: "System",
        items: [
          { id: "settings", label: t("nav.settings"), icon: Settings },
        ],
      },
    ];
  };

  const navSections = getNavSections();

  const userInitials = currentUser?.name
    ? currentUser.name
        .replace(/\[.*?\]/g, "")
        .trim()
        .split(" ")
        .slice(0, 2)
        .map((s: string) => s[0])
        .join("")
        .toUpperCase()
    : portalMode === "public"
    ? "PU"
    : "DO";

  const userDisplayTitle = currentUser?.name
    ? currentUser.name.replace("[SAMPLE]", "").trim()
    : portalMode === "public"
    ? "Public Citizen"
    : "District Officer";

  const userRoleSubtitle = currentUser?.role_label
    ? currentUser.role_label
    : portalMode === "public"
    ? "Public Portal"
    : districtName;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-surface-container-lowest text-on-surface flex flex-col justify-between shrink-0 select-none border-r border-slate-200/90 shadow-xl lg:shadow-2xs transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex-1 overflow-y-auto">
          {/* Brand Logo & System Name */}
          <div className="p-3.5 bg-surface-container-low flex flex-col gap-1 border-b border-slate-200/70">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center text-on-primary shadow-2xs shrink-0">
                  <span className="material-symbols-outlined text-[20px]">health_and_safety</span>
                </div>
                <div className="min-w-0 flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-sm tracking-tight text-primary truncate leading-tight">
                      Mitanin Signal
                    </span>
                  </div>
                  <span className="text-[10px] text-on-surface-variant font-medium">मितानिन सिग्नल</span>
                </div>
              </div>

              {/* Mobile Close Button */}
              {onCloseMobile && (
                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="lg:hidden p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                  aria-label="Close navigation"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-on-surface-variant font-normal tracking-wide">
              Remote &amp; Tribal Health Platform
            </p>
          </div>

          {/* Quick Role Switcher Strip matching Stitch Layout */}
          <div className="p-2.5 space-y-2">
            <div className="bg-surface-container p-1 rounded-lg flex items-center justify-between text-center gap-1">
              <button
                type="button"
                onClick={() =>
                  onSwitchPortalMode
                    ? onSwitchPortalMode("public")
                    : onSelectTab("public-dashboard")
                }
                className={`flex-1 py-1 px-1.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  portalMode === "public"
                    ? "bg-primary text-on-primary shadow-2xs"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                }`}
              >
                Public
              </button>
              <button
                type="button"
                onClick={() =>
                  onSwitchPortalMode
                    ? onSwitchPortalMode("field_employee")
                    : onSelectTab("emp-dashboard")
                }
                className={`flex-1 py-1 px-1.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  portalMode === "field_employee"
                    ? "bg-primary text-on-primary shadow-2xs"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                }`}
              >
                Field
              </button>
              <button
                type="button"
                onClick={() =>
                  onSwitchPortalMode
                    ? onSwitchPortalMode("supervisor")
                    : onSelectTab("sup-dashboard")
                }
                className={`flex-1 py-1 px-1.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  portalMode === "supervisor"
                    ? "bg-primary text-on-primary shadow-2xs"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                }`}
              >
                Supervisor
              </button>
            </div>

            {/* Division & Portal Context Pill */}
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-surface-container-low rounded-lg border border-slate-200/70">
              <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider truncate">
                {locationBreadcrumb ? locationBreadcrumb.split("·")[0].trim() : districtName}
              </span>
              <span className="text-[10px] text-primary font-bold shrink-0">Zone 04</span>
            </div>
          </div>

          {/* Grouped Navigation Sections */}
          <div className="px-2.5 py-1 space-y-4">
            {navSections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-1">
                <span className="px-2 text-[10px] uppercase font-bold text-on-surface-variant/70 tracking-wider block">
                  {section.title}
                </span>
                <nav className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleItemClick(item.id)}
                        data-testid={`nav-${item.id}`}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer text-left ${
                          isActive
                            ? "bg-primary text-on-primary font-bold shadow-2xs"
                            : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-colors ${
                              isActive ? "text-on-primary" : "text-primary/80"
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none tabular-nums shadow-2xs ${
                              isActive
                                ? "bg-white text-primary"
                                : item.badgeVariant === "error"
                                ? "bg-error text-on-error"
                                : "bg-primary-container text-on-primary"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
        </div>

        {/* Mesh Sync Status & User Profile Footer */}
        <div className="p-2.5 space-y-2 border-t border-slate-200/80 bg-surface-container-low shrink-0">
          {/* Offline Mesh Telemetry Badge */}
          <div className="px-2.5 py-2 rounded-lg bg-surface-container-lowest border border-slate-200/70 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">cell_tower</span>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-on-surface leading-tight">Tribal Mesh</span>
                <span className="text-[9px] text-on-surface-variant leading-tight">Relay Sync OK</span>
              </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>

          {onChangeLocation && (
            <button
              type="button"
              onClick={onChangeLocation}
              className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-left flex items-center gap-2 transition-colors cursor-pointer border border-slate-200/70 text-on-surface"
            >
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[9px] uppercase font-bold text-on-surface-variant leading-none mb-0.5">
                  {t("app.change_location")}
                </div>
                <div className="text-xs font-semibold text-on-surface truncate">
                  {locationBreadcrumb || districtName}
                </div>
              </div>
            </button>
          )}

          <div className="p-2 rounded-lg bg-surface-container-lowest border border-slate-200/70 flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-[11px] shrink-0">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-on-surface truncate leading-tight">
                  {userDisplayTitle}
                </div>
                <div className="text-[10px] text-on-surface-variant truncate leading-tight">
                  {userRoleSubtitle}
                </div>
              </div>
            </div>

            {onLogout && currentUser ? (
              <button
                type="button"
                onClick={onLogout}
                title={t("app.sign_out")}
                className="p-1 rounded-md hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            ) : (
              onOpenPortalSwitcher && (
                <button
                  type="button"
                  onClick={onOpenPortalSwitcher}
                  title={t("app.switch_portal")}
                  className="p-1 rounded-md hover:bg-surface-container text-primary hover:text-primary-container transition-colors shrink-0 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                </button>
              )
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
