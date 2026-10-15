import { ChevronDown, LogIn, LogOut, Menu } from "lucide-react";
import { LanguageSelector } from "./LanguageSelector";
import { useI18n } from "../i18n/I18nContext";

interface TopBarProps {
  title: string;
  districtName: string;
  periodText: string;
  locationBreadcrumb?: string;
  currentUser?: any | null;
  alertCount?: number;
  onToggleSidebar?: () => void;
  onOpenAlerts?: () => void;
  onChangeLocation?: () => void;
  onOpenPortalLanding?: () => void;
  onLogout?: () => void;
}

export function TopBar({
  title,
  districtName,
  periodText,
  locationBreadcrumb,
  currentUser,
  alertCount,
  onToggleSidebar,
  onOpenAlerts,
  onChangeLocation,
  onOpenPortalLanding,
  onLogout,
}: TopBarProps) {
  const { t } = useI18n();
  const displayLoc = locationBreadcrumb || districtName;

  return (
    <header className="h-16 bg-surface/95 backdrop-blur-md border-b border-slate-200/90 px-3 sm:px-6 flex items-center justify-between gap-2.5 sm:gap-3.5 shrink-0 select-none z-30 shadow-2xs">
      {/* Title & Active Location Context */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface border border-slate-200/80 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5 text-primary" />
          </button>
        )}

        <h1 className="hidden sm:flex text-xs sm:text-sm font-bold text-on-surface truncate items-center gap-1.5">
          <span>{title}</span>
          <span className="text-slate-300 font-light">/</span>
        </h1>
        <button
          type="button"
          onClick={onChangeLocation}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface border border-slate-200/80 shadow-2xs hover:bg-surface-container transition-all cursor-pointer"
          title={t("app.change_location")}
        >
          <span className="material-symbols-outlined text-primary text-[17px]">location_on</span>
          <span className="font-semibold text-xs sm:text-sm text-on-surface truncate max-w-[200px]">
            {displayLoc}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
        </button>

        {currentUser?.role_label && (
          <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant text-[11px] font-semibold border border-primary-fixed-dim">
            <span className="material-symbols-outlined text-[14px]">badge</span>
            <span className="truncate max-w-[160px]">{currentUser.name || currentUser.username}</span>
          </div>
        )}
      </div>

      {/* Controls & Selectors on uniform baseline */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Period Selector */}
        <div className="hidden xl:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-surface-container-lowest text-xs font-semibold text-on-surface shadow-2xs">
          <span className="material-symbols-outlined text-primary text-[16px]">calendar_today</span>
          <span className="tabular-nums">{periodText}</span>
        </div>

        {/* Live Language Selector (EN | हिन्दी | छत्तीसगढ़ी) */}
        <LanguageSelector compact />

        {/* Connectivity Status Chip */}
        <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-lowest border border-slate-200 text-[11px] font-medium text-on-surface-variant shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="material-symbols-outlined text-primary text-[15px]">cloud_done</span>
          <span>Synced</span>
        </div>

        {/* Quick Outbreak / Emergency Alert Chip */}
        {alertCount !== undefined && alertCount > 0 && onOpenAlerts && (
          <button
            type="button"
            onClick={onOpenAlerts}
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-error-container text-on-error-container hover:bg-error-container/80 transition-colors text-[11px] font-bold border border-error/20 cursor-pointer shadow-2xs"
            title="View Active Surveillance Alerts"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping"></span>
            <span className="material-symbols-outlined text-[15px] text-error">emergency</span>
            <span>{alertCount} Alerts</span>
          </button>
        )}

        {/* User Account Logout / Portal Switcher */}
        {currentUser ? (
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface border border-slate-200 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
            <span className="hidden sm:inline">
              {t("app.sign_out")}
            </span>
            <span className="sm:hidden">{t("app.sign_out")}</span>
          </button>
        ) : (
          onOpenPortalLanding && (
            <button
              type="button"
              onClick={onOpenPortalLanding}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container text-xs font-bold shadow-2xs transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 shrink-0" />
              <span>{t("nav.switch_portal_btn")}</span>
            </button>
          )
        )}
      </div>
    </header>
  );
}
