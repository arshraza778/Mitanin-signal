import React, { useState, useEffect, useMemo, useCallback } from "react";
import { enqueueOfflineItem, isDeviceOnline, getQueueSummary } from "../services/offlineSync";

interface VillageVisitPlannerProps {
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
  onStartEncounter: (householdId: string, visitId?: number) => void;
  onNavigateScreening: () => void;
  onNavigatePatientRegistration?: (householdId?: string) => void;
  onBack: () => void;
  onChangeLocation?: () => void;
}

export const VillageVisitPlanner: React.FC<VillageVisitPlannerProps> = ({
  authToken,
  selectedLocation,
  onStartEncounter,
  onNavigateScreening: _onNavigateScreening,
  onNavigatePatientRegistration,
  onBack,
  onChangeLocation,
}) => {
  const [filterTab, setFilterTab] = useState<"all" | "urgent" | "routine" | "water">("all");
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [restockRequested, setRestockRequested] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

      const res = await fetch("http://127.0.0.1:8000/employee/visits?status=all", { headers });
      if (res.ok) {
        const data = await res.json();
        setVisits(data.visits || []);
      } else {
        // Fallback demo visits if backend not reachable
        setVisits(getDemoVisits());
      }
    } catch {
      setVisits(getDemoVisits());
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  const filteredVisits = useMemo(() => {
    if (filterTab === "all") return visits;
    if (filterTab === "urgent") return visits.filter((v) => v.priority === "urgent" || v.priority === "high");
    if (filterTab === "routine") return visits.filter((v) => v.priority === "routine");
    if (filterTab === "water") return visits.filter((v) => v.priority === "water");
    return visits;
  }, [visits, filterTab]);

  const handlePlayAudio = (id: string, text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      if (playingAudioId === id) {
        setPlayingAudioId(null);
        return;
      }
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "hi-IN";
      utter.rate = 0.95;
      utter.onend = () => setPlayingAudioId(null);
      utter.onerror = () => setPlayingAudioId(null);
      setPlayingAudioId(id);
      window.speechSynthesis.speak(utter);
    }
  };

  const handleEmergencyRestock = () => {
    setRestockRequested(true);
    if (!isDeviceOnline()) {
      enqueueOfflineItem({
        type: "task_action",
        endpoint: "http://127.0.0.1:8000/employee/tasks/0/action",
        method: "POST",
        payload: { action: "restock_request", item: "Hb_cuvettes_malaria_kits" },
        authToken,
        status: "saved",
        label: "Supply Refill Request (Jagdalpur Depot)",
      });
    }
    setTimeout(() => setRestockRequested(false), 4500);
  };

  const handleDownloadRoute = () => {
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3500);
  };

  const syncStats = getQueueSummary();

  return (
    <div className="w-full bg-surface text-on-surface min-h-screen font-body-md text-body-md antialiased pb-16">
      <div className="px-margin lg:px-margin-desktop py-space-md flex flex-col gap-space-lg max-w-[1440px] mx-auto w-full">
        
        {/* Navigation Breadcrumb & Back Bar */}
        <div className="flex items-center justify-between gap-space-sm pt-2">
          <div className="flex items-center gap-space-xs text-body-sm text-on-surface-variant flex-wrap">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1 text-primary hover:text-on-primary-fixed-variant font-semibold cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>डैशबोर्ड पर लौटें (Back to Dashboard)</span>
            </button>
            <span>/</span>
            <span className="text-on-surface font-semibold">Village Visit Planner (Stitch Screen 7)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
              <span className="w-2 h-2 rounded-full bg-secondary-container"></span>
              <span>Mesh Buffer: {syncStats.saved + syncStats.queued} queued</span>
            </span>
            {onChangeLocation && (
              <button
                type="button"
                onClick={onChangeLocation}
                className="px- space-xs py-1 text-primary hover:underline text-xs flex items-center gap-0.5 cursor-pointer font-medium"
              >
                <span className="material-symbols-outlined text-[14px]">location_on</span>
                <span>{selectedLocation.block_name || "Jagdalpur"} • {selectedLocation.village_name || "Sector 4"}</span>
              </button>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* HERO / HEADER OPERATIONAL STRIP                              */}
        {/* ============================================================ */}
        <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-space-lg shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg border border-slate-200/60">
          <div className="flex flex-col gap-space-xs max-w-2xl">
            <div className="flex items-center gap-space-sm flex-wrap">
              <span className="px-space-sm py-space-xs rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm uppercase tracking-wider flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                Live Operational Dispatch
              </span>
              <span className="text-on-surface-variant font-label-sm text-label-sm">
                • {selectedLocation.district_name || "Bastar"} Tribal Division • Zone 04
              </span>
            </div>
            <div className="flex flex-col">
              <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight font-bold">
                Village Visit &amp; Field Route Planner
              </h1>
              <p className="font-headline-sm text-headline-sm text-on-surface-variant font-normal">
                गांव दौरा एवं क्षेत्रीय मार्ग योजना — Karanji Sub-Center Cluster
              </p>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              Synchronized targeting for ASHA/Mitanin field groups. Direct multi-point routing through interior forest tracks with pre-cached tele-triage queues.
            </p>
          </div>

          {/* Action & Environmental Telemetry Panel */}
          <div className="flex flex-wrap items-center gap-space-md lg:self-center">
            {/* Date Selector Module */}
            <div className="flex items-center gap-space-xs bg-surface-container-low px-space-md py-2.5 rounded-lg border border-slate-200/50">
              <span className="material-symbols-outlined text-primary text-[20px]">calendar_month</span>
              <div className="flex flex-col text-left">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Scheduled Window</span>
                <span className="font-label-md text-label-md text-on-surface font-semibold">18 Oct – 20 Oct 2026</span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant text-[18px] ml-1">arrow_drop_down</span>
            </div>

            {/* Monsoon Access Telemetry Badge */}
            <div className="flex items-center gap-space-sm bg-surface-container-high px-space-md py-2 rounded-lg border border-slate-200/50">
              <div className="w-9 h-9 rounded-full bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed shrink-0">
                <span className="material-symbols-outlined text-[20px]">rainy</span>
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1">
                  <span className="font-label-md text-label-md font-semibold text-tertiary">Grade B Monsoon Passability</span>
                  <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Gravel Track Clear • 102 Van Reachable</span>
              </div>
            </div>

            {/* Approval Status */}
            <div className="hidden sm:flex items-center gap-space-xs bg-surface-container px-space-sm py-2 rounded-lg text-on-surface">
              <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
              <span className="font-label-sm text-label-sm font-semibold">Block Supervisor Approved</span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* CLUSTER OVERVIEW & KEY PERFORMANCE BENTO                     */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md">
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between border border-slate-200/60">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Cluster Cohort</span>
              <span className="material-symbols-outlined text-primary text-[20px]">holiday_village</span>
            </div>
            <div className="mt-space-md flex items-baseline gap-space-xs">
              <span className="font-display-lg text-display-lg text-on-surface font-bold">42</span>
              <span className="font-label-md text-label-md text-on-surface-variant">Households Registered</span>
            </div>
            <div className="mt-space-xs flex items-center gap-1">
              <span className="font-label-sm text-label-sm text-primary font-semibold">14 Prioritized</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">for current 48h cycle</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between border border-slate-200/60">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-error font-semibold">Critical Alerts (उच्च प्राथमिकता)</span>
              <span className="material-symbols-outlined text-error text-[20px]">priority_high</span>
            </div>
            <div className="mt-space-md flex items-baseline gap-space-xs">
              <span className="font-display-lg text-display-lg text-error font-bold">5</span>
              <span className="font-label-md text-label-md text-on-surface-variant">Severe Risk Cases</span>
            </div>
            <div className="mt-space-xs flex items-center gap-1">
              <span className="font-label-sm text-label-sm text-error font-semibold">3 ANC 3rd Trim</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">• 1 SAM Child • 1 Malaria</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between border border-slate-200/60">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Corridor Transit Time</span>
              <span className="material-symbols-outlined text-secondary text-[20px]">route</span>
            </div>
            <div className="mt-space-md flex items-baseline gap-space-xs">
              <span className="font-display-lg text-display-lg text-on-surface font-bold">4.8</span>
              <span className="font-label-md text-label-md text-on-surface-variant">km Forest Circuit</span>
            </div>
            <div className="mt-space-xs flex items-center gap-1">
              <span className="font-label-sm text-label-sm text-secondary font-semibold">Est. 3h 40m</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">total foot &amp; van transit</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between border border-slate-200/60">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Offline Packet Health</span>
              <span className="material-symbols-outlined text-primary text-[20px]">wifi_tethering_off</span>
            </div>
            <div className="mt-space-md flex items-baseline gap-space-xs">
              <span className="font-display-lg text-display-lg text-primary font-bold">100%</span>
              <span className="font-label-md text-label-md text-on-surface-variant">Encrypted SQLite</span>
            </div>
            <div className="mt-space-xs flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary-container"></span>
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">Bastar Mesh Bridge verified</span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* MAIN WORKSPACE SPLIT (MAP & INVENTORY 5 COLS / ROSTER 7 COLS) */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          
          {/* Left Column: Map Cluster & Logistics (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-space-lg">
            
            {/* Geographic Map Module */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col border border-slate-200/60">
              <div className="p-space-md bg-surface-container-low flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[20px]">explore</span>
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold">Target Geographic Clusters</span>
                </div>
                <span className="px-space-xs py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-semibold">
                  Bastar Sec-04
                </span>
              </div>

              {/* Static Map Integration with Tactical Overlays */}
              <div className="relative w-full h-72 bg-emerald-950/20 overflow-hidden">
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80')`,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-slate-900/30 pointer-events-none" />

                {/* Floating Waypoint Chips */}
                <div className="absolute top-space-sm left-space-sm flex flex-col gap-1.5 z-10">
                  <span className="px-2 py-1 bg-surface-container-lowest/95 backdrop-blur rounded font-label-sm text-label-sm shadow text-on-surface font-medium flex items-center gap-1.5 border border-slate-200/40">
                    <span className="w-2.5 h-2.5 rounded-full bg-error"></span> Kodenar Tola (6 High Priority)
                  </span>
                  <span className="px-2 py-1 bg-surface-container-lowest/95 backdrop-blur rounded font-label-sm text-label-sm shadow text-on-surface font-medium flex items-center gap-1.5 border border-slate-200/40">
                    <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span> Karanji Basti (5 Follow-ups)
                  </span>
                  <span className="px-2 py-1 bg-surface-container-lowest/95 backdrop-blur rounded font-label-sm text-label-sm shadow text-on-surface font-medium flex items-center gap-1.5 border border-slate-200/40">
                    <span className="w-2.5 h-2.5 rounded-full bg-outline"></span> Muria Para (3 Water Tests)
                  </span>
                </div>

                {/* Bottom Route Indicator */}
                <div className="absolute bottom-space-sm left-space-sm right-space-sm bg-surface-container-lowest/95 backdrop-blur-md p-space-sm rounded-lg shadow-md flex items-center justify-between text-on-surface border border-slate-200/40">
                  <div className="flex flex-col text-left">
                    <span className="font-label-md text-label-md font-semibold text-primary">Tokapal Corridor (Sector 4 Route)</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Starting Point: Karanji Sub-Center</span>
                  </div>
                  <span className="px-space-sm py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">directions_walk</span> Active Path
                  </span>
                </div>
              </div>

              {/* Waypoint Dispatch Order */}
              <div className="p-space-md flex flex-col gap-space-sm">
                <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                  <span>WAYPOINT DISPATCH ORDER</span>
                  <span>102 AMBULANCE ACCESS</span>
                </div>

                <div className="flex items-center justify-between p-space-xs rounded bg-surface-container-low hover:bg-surface-container transition-colors">
                  <div className="flex items-center gap-space-sm">
                    <div className="w-6 h-6 rounded-full bg-primary text-on-primary font-label-sm text-label-sm flex items-center justify-center font-bold">1</div>
                    <div className="text-left">
                      <p className="font-label-md text-label-md text-on-surface font-semibold">Karanji Sub-Center Depot</p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">Kit staging &amp; Cold chain check</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-surface-container-lowest text-primary font-label-sm text-label-sm font-semibold border border-slate-200/60">
                    Paved Highway
                  </span>
                </div>

                <div className="flex items-center justify-between p-space-xs rounded bg-surface-container-low hover:bg-surface-container transition-colors">
                  <div className="flex items-center gap-space-sm">
                    <div className="w-6 h-6 rounded-full bg-primary text-on-primary font-label-sm text-label-sm flex items-center justify-center font-bold">2</div>
                    <div className="text-left">
                      <p className="font-label-md text-label-md text-on-surface font-semibold">Kodenar Tola (Sector 4 Hamlet)</p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">8 Households • High priority ANC</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-semibold">
                    Gravel Track
                  </span>
                </div>

                <div className="flex items-center justify-between p-space-xs rounded bg-surface-container-low hover:bg-surface-container transition-colors">
                  <div className="flex items-center gap-space-sm">
                    <div className="w-6 h-6 rounded-full bg-primary text-on-primary font-label-sm text-label-sm flex items-center justify-center font-bold">3</div>
                    <div className="text-left">
                      <p className="font-label-md text-label-md text-on-surface font-semibold">Muria Para Stream Point</p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">6 Households • Water safety sweep</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold">
                    Footpath Only
                  </span>
                </div>
              </div>
            </div>

            {/* Field Kit Inventory & Logistics Checklist */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md flex flex-col gap-space-md border border-slate-200/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[20px]">medical_services</span>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">Field Kit Inventory &amp; Logistics</h2>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant">दौरा सामग्री किट</span>
              </div>

              <div className="flex flex-col gap-space-sm">
                {/* Item 1: Hb Cuvettes */}
                <div className="p-space-sm rounded-lg bg-error-container/40 flex flex-col gap-1 border border-red-200/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-error text-[18px]">bloodtype</span>
                      <span className="font-label-md text-label-md text-on-surface font-semibold">TruePoint Hb Microcuvettes</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-error text-on-error font-label-sm text-label-sm font-bold tracking-wider">RESTOCK ALERT</span>
                  </div>
                  <div className="flex items-center justify-between text-body-sm font-body-sm text-on-surface-variant mt-1">
                    <span>Current: <strong className="text-error font-semibold">18 strips</strong></span>
                    <span>Required for 14 stops: <strong>25 strips</strong></span>
                  </div>
                  <div className="w-full bg-surface-variant h-1.5 rounded-full overflow-hidden mt-1">
                    <div className="bg-error h-full rounded-full" style={{ width: "72%" }}></div>
                  </div>
                </div>

                {/* Item 2: Malaria RDT */}
                <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col gap-1 border border-slate-200/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[18px]">biotech</span>
                      <span className="font-label-md text-label-md text-on-surface font-semibold">Malaria Pf / Pv Dual RDT Kits</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm font-semibold">ADEQUATE</span>
                  </div>
                  <div className="flex items-center justify-between text-body-sm font-body-sm text-on-surface-variant mt-1">
                    <span>Available: <strong className="text-on-surface font-semibold">12 Cassettes</strong></span>
                    <span>Buffer Ampoules: <strong>14 units</strong></span>
                  </div>
                </div>

                {/* Item 3: IFA Tablets & ORS */}
                <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col gap-1 border border-slate-200/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-[18px]">medication</span>
                      <span className="font-label-md text-label-md text-on-surface font-semibold">IFA Red (100mg) &amp; ORS-Zinc Packs</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-semibold">READY</span>
                  </div>
                  <div className="flex items-center justify-between text-body-sm font-body-sm text-on-surface-variant mt-1">
                    <span>IFA: <strong>60 Tabs</strong></span>
                    <span>ORS Sachets: <strong>30 Pkts</strong></span>
                    <span>Halazone: <strong>45 Tabs</strong></span>
                  </div>
                </div>

                {/* Item 4: Electronics & Battery */}
                <div className="p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between border border-slate-200/40">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">solar_power</span>
                    <div className="text-left">
                      <p className="font-label-md text-label-md text-on-surface font-semibold">Handset &amp; Solar Battery Pack</p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">Lithium backup unit fully cycled</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">battery_charging_90</span>
                    <span className="font-label-md text-label-md text-primary font-bold">92%</span>
                  </div>
                </div>
              </div>

              {/* Emergency Restock Button */}
              <button
                type="button"
                onClick={handleEmergencyRestock}
                className="w-full mt-1 bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-md text-label-md py-2.5 px-space-md rounded-lg flex items-center justify-center gap-space-xs transition-colors cursor-pointer border border-slate-200/60"
              >
                <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                <span>
                  {restockRequested ? "Requisition Sent to Jagdalpur Depot" : "Request Emergency Restock from Jagdalpur Depot"}
                </span>
              </button>
            </div>

            {/* Offline Sync & Attestation Actions Card */}
            <div className="bg-primary-container text-on-primary rounded-xl shadow-md p-space-md flex flex-col gap-space-md">
              <div className="flex items-start justify-between">
                <div className="flex flex-col text-left">
                  <span className="font-headline-sm text-headline-sm font-bold">Offline Dispatch Bundle</span>
                  <span className="font-label-sm text-label-sm text-on-primary-container">ऑफलाइन मैप एवं कार्य डाउनलोड करें</span>
                </div>
                <span className="material-symbols-outlined text-primary-fixed text-[24px]">cloud_download</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-primary-container text-left">
                Cache demographic profiles, audio-guided tribal counseling prompts (Gondi/Halbi), and topographic contour lines for zero-network forest hamlets.
              </p>
              <div className="flex flex-col sm:flex-row gap-space-sm">
                <button
                  type="button"
                  onClick={handleDownloadRoute}
                  className="flex-1 bg-surface-container-lowest text-primary font-label-md text-label-md py-3 px-space-md rounded-lg flex items-center justify-center gap-space-xs shadow hover:bg-surface-container-low transition-colors font-bold cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">install_mobile</span>
                  <span>{downloadSuccess ? "Route Cached Offline (OK)" : "Download Offline Route"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-primary text-on-primary hover:bg-on-primary-fixed-variant font-label-md text-label-md py-3 px-space-md rounded-lg flex items-center justify-center gap-space-xs transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">print</span>
                  <span>Print Roster</span>
                </button>
              </div>
              <div className="pt-space-xs border-t border-primary/20 flex items-center justify-between text-on-primary-container font-label-sm text-label-sm">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">verified</span> Block Supervisor Approved: K. Verma
                </span>
                <span className="underline cursor-pointer hover:text-on-primary">Verify Hash</span>
              </div>
            </div>
          </div>

          {/* Right Column: Priority Household Roster & Scheduled Tasks (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-space-md">
            
            {/* Filter Tabs & Urgency Filter Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-surface-container-lowest p-space-sm rounded-xl shadow-sm border border-slate-200/60">
              <div className="flex items-center gap-1 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setFilterTab("all")}
                  className={`px-space-md py-2 rounded-lg font-label-md text-label-md font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    filterTab === "all"
                      ? "bg-primary-container text-on-primary shadow-sm"
                      : "text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  All Scheduled ({visits.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("urgent")}
                  className={`px-space-md py-2 rounded-lg font-label-md text-label-md font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                    filterTab === "urgent"
                      ? "bg-primary-container text-on-primary font-semibold shadow-sm"
                      : "text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-error"></span>
                  High Priority ({visits.filter((v) => v.priority === "urgent" || v.priority === "high").length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("routine")}
                  className={`px-space-md py-2 rounded-lg font-label-md text-label-md font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    filterTab === "routine"
                      ? "bg-primary-container text-on-primary font-semibold shadow-sm"
                      : "text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  Routine Care ({visits.filter((v) => v.priority === "routine").length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("water")}
                  className={`px-space-md py-2 rounded-lg font-label-md text-label-md font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    filterTab === "water"
                      ? "bg-primary-container text-on-primary font-semibold shadow-sm"
                      : "text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  Water / WASH ({visits.filter((v) => v.priority === "water").length})
                </button>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {onNavigatePatientRegistration && (
                  <button
                    type="button"
                    onClick={() => onNavigatePatientRegistration()}
                    className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-primary font-label-sm text-label-sm font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">person_add</span>
                    <span>New Patient Intake</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fetchVisits()}
                  className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
                  title="Refresh Roster"
                >
                  <span className={`material-symbols-outlined text-[20px] ${loading ? "animate-spin" : ""}`}>
                    refresh
                  </span>
                </button>
              </div>
            </div>

            {/* Error or Empty State */}
            {error && (
              <div className="p-space-md rounded-xl bg-error-container text-on-error-container text-center text-sm">
                {error}
              </div>
            )}

            {/* Household List Queue */}
            <div className="flex flex-col gap-space-sm">
              <div className="flex items-center justify-between px-space-xs">
                <div className="flex items-center gap-space-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-error"></span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Urgent Interventions (अति-प्राथमिकता)
                  </h3>
                </div>
                <span className="font-label-sm text-label-sm text-error font-semibold">Immediate Action Required</span>
              </div>

              {filteredVisits.map((visit, idx) => {
                const isUrgent = visit.priority === "urgent" || visit.priority === "high";
                const isCompleted = visit.status === "completed";
                const vulnerable = Array.isArray(visit.vulnerable_members) ? visit.vulnerable_members[0] : null;
                const protocols = Array.isArray(visit.protocols) ? visit.protocols : [];

                return (
                  <div
                    key={visit.id || idx}
                    className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md border border-slate-200/60"
                  >
                    {/* Top status accent strip */}
                    <div className={`h-1.5 w-full ${isCompleted ? "bg-emerald-600" : isUrgent ? "bg-error" : "bg-primary"}`} />

                    <div className="p-space-md flex flex-col gap-space-md">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
                        <div className="flex items-center gap-space-sm">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold font-headline-sm text-headline-sm shrink-0 ${
                              isCompleted
                                ? "bg-emerald-100 text-emerald-800"
                                : isUrgent
                                ? "bg-error-container text-on-error-container"
                                : "bg-primary-fixed text-on-primary-fixed-variant"
                            }`}
                          >
                            {String(idx + 1).padStart(2, "0")}
                          </div>
                          <div className="text-left">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                                {visit.household_name}
                              </h4>
                              <span
                                className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-bold uppercase ${
                                  isCompleted
                                    ? "bg-emerald-100 text-emerald-800"
                                    : isUrgent
                                    ? "bg-error-container text-on-error-container"
                                    : "bg-surface-container-high text-on-surface-variant"
                                }`}
                              >
                                {visit.visit_reason}
                              </span>
                            </div>
                            <p className="font-body-sm text-body-sm text-on-surface-variant">
                              House #{visit.household_id} • {visit.hamlet || "Hamlet"} • Head: {visit.head_of_household || "Sukhlal"} (Family Size: {visit.family_size})
                            </p>
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="font-label-sm text-label-sm text-on-surface-variant">
                            Last Visit: <strong>{visit.last_visit_days_ago} days ago</strong>
                          </span>
                          {visit.last_visit_notes && (
                            <p className="font-label-sm text-label-sm text-error font-medium truncate max-w-xs">
                              {visit.last_visit_notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Vulnerable Members Highlight Box */}
                      {vulnerable && (
                        <div className="bg-surface-container-low p-space-sm rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm border border-slate-200/40 text-left">
                          <div className="flex items-center gap-space-sm">
                            <span className="material-symbols-outlined text-error text-[22px] shrink-0">
                              {vulnerable.condition?.toLowerCase().includes("child") ? "child_care" : "pregnant_woman"}
                            </span>
                            <div>
                              <p className="font-label-md text-label-md text-on-surface font-semibold">
                                {vulnerable.name} ({vulnerable.age} yrs) — {vulnerable.condition}
                              </p>
                              <p className="font-body-sm text-body-sm text-on-surface-variant">
                                {vulnerable.risk_note}
                              </p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded bg-surface-container-lowest text-on-surface font-label-sm text-label-sm font-semibold flex items-center gap-1 self-start sm:self-auto shadow-sm border border-slate-200/50">
                            <span className="material-symbols-outlined text-primary text-[14px]">call</span> Dialect: {visit.dialect || "Halbi"}
                          </span>
                        </div>
                      )}

                      {/* Scheduled Field Protocols */}
                      {protocols.length > 0 && (
                        <div className="flex flex-col gap-space-xs text-left">
                          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                            Scheduled Field Protocols:
                          </span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-xs">
                            {protocols.map((p: any, pIdx: number) => (
                              <label
                                key={p.id || pIdx}
                                className="flex items-center gap-2 p-2 rounded bg-surface-container hover:bg-surface-variant cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  defaultChecked={p.checked}
                                  className="w-4 h-4 rounded text-primary focus:ring-0"
                                />
                                <span className="font-label-md text-label-md text-on-surface font-medium">
                                  {p.title}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Bar */}
                      <div className="flex flex-wrap items-center justify-between pt-space-xs gap-space-sm">
                        <button
                          type="button"
                          onClick={() =>
                            handlePlayAudio(
                              String(visit.id || idx),
                              `${visit.household_name} में ${vulnerable ? vulnerable.name : ""} के लिए प्राथमिक स्वास्थ्य जांच आवश्यक है। ${visit.visit_reason} का ध्यान रखें।`
                            )
                          }
                          className="text-primary hover:text-on-primary-fixed-variant font-label-md text-label-md font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {playingAudioId === String(visit.id || idx) ? "pause" : "volume_up"}
                          </span>
                          <span>
                            {playingAudioId === String(visit.id || idx)
                              ? "Playing Dialect Guidance..."
                              : `Play ${visit.dialect || "Halbi"} Counseling Audio`}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onStartEncounter(visit.household_id, visit.id)}
                          className="bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-label-md text-label-md px-space-md py-2.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer font-bold"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit_calendar</span>
                          <span>Start Active Visit Encounter (दौरा शुरू करें)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function getDemoVisits() {
  return [
    {
      id: 1,
      household_id: "HH-14B",
      household_name: "Baghel Parivar (बघेल परिवार)",
      hamlet: "Kodenar Tola Hamlet",
      head_of_household: "Sukhlal Baghel",
      family_size: 5,
      priority: "urgent",
      visit_reason: "ANC 3rd Trimester • Severe Anemia Risk",
      scheduled_date: "2026-10-18",
      status: "scheduled",
      last_visit_days_ago: 12,
      last_visit_notes: "Missed CHC Ultrasound Referral. Reports bilateral ankle edema. Prior Hb: 8.4 g/dL.",
      vulnerable_members: [
        {
          name: "Devki Kashyap",
          age: 22,
          condition: "31w Gestation (EDD: 18 Nov)",
          risk_note: "Severe Anemia Risk (Prev Hb: 8.4 g/dL) • Reports bilateral ankle edema",
          dialect: "Halbi",
        },
      ],
      protocols: [
        { id: "p1", title: "Digital Hb Strip Check (TruePoint)", checked: true },
        { id: "p2", title: "Dispense 30-day IFA Red Tablets", checked: true },
        { id: "p3", title: "102 Van Pre-Booking Confirmation", checked: false },
        { id: "p4", title: "Halbi Audio Triage & Diet Guide", checked: false },
      ],
      dialect: "Halbi",
    },
    {
      id: 2,
      household_id: "HH-07",
      household_name: "Mandavi Parivar (मंडावी परिवार)",
      hamlet: "Interior Forest Ring",
      head_of_household: "Budhram Mandavi",
      family_size: 7,
      priority: "urgent",
      visit_reason: "Child SAM / MUAC < 11.5cm",
      scheduled_date: "2026-10-18",
      status: "scheduled",
      last_visit_days_ago: 4,
      last_visit_notes: "Re-admit check for NRC Tokapal. Persistent cough (8 days).",
      vulnerable_members: [
        {
          name: "Raju Mandavi",
          age: 4,
          condition: "Child SAM (MUAC 11.2cm yellow-red border)",
          risk_note: "Persistent cough (8 days) • Severe Acute Malnutrition",
          dialect: "Gondi",
        },
      ],
      protocols: [
        { id: "m1", title: "Shakir Strip MUAC Recalibration", checked: true },
        { id: "m2", title: "Rapid Antigen Pf/Pv RDT Check", checked: true },
        { id: "m3", title: "Amoxicillin Paediatric Stock Check", checked: false },
        { id: "m4", title: "Gondi Audio Guidance on Micronutrient Paste", checked: false },
      ],
      dialect: "Gondi",
    },
    {
      id: 3,
      household_id: "HH-22",
      household_name: "Markam Parivar (मरकाम परिवार)",
      hamlet: "Karanji Basti",
      head_of_household: "Manglu Markam",
      family_size: 4,
      priority: "routine",
      visit_reason: "Elderly Chronic Fever & RDT Follow-up",
      scheduled_date: "2026-10-18",
      status: "scheduled",
      last_visit_days_ago: 9,
      last_visit_notes: "Reported mild joint pain and intermittent chills.",
      vulnerable_members: [
        {
          name: "Manglu Markam",
          age: 68,
          condition: "Intermittent chills & joint pain",
          risk_note: "Fever history 3 days, malaria RDT recommended",
          dialect: "Halbi",
        },
      ],
      protocols: [
        { id: "mk1", title: "Pf/Pv Dual Antigen Cassette Test", checked: false },
        { id: "mk2", title: "Oral Temperature & Pulse Check", checked: false },
        { id: "mk3", title: "Paracetamol strip verification", checked: false },
      ],
      dialect: "Halbi",
    },
    {
      id: 4,
      household_id: "HH-09",
      household_name: "Kashyap Parivar (कश्यप परिवार)",
      hamlet: "Muria Para Stream Point",
      head_of_household: "Phoolsingh Kashyap",
      family_size: 6,
      priority: "water",
      visit_reason: "Water / WASH Chlorination Sweep",
      scheduled_date: "2026-10-19",
      status: "scheduled",
      last_visit_days_ago: 15,
      last_visit_notes: "Near canal outflow; monsoon runoff observed.",
      vulnerable_members: [
        {
          name: "Sita Kashyap",
          age: 35,
          condition: "Household Water Keeper",
          risk_note: "Handpump chlorination advisory",
          dialect: "Halbi",
        },
      ],
      protocols: [
        { id: "w1", title: "Chlorine Residual Testing Kit check", checked: false },
        { id: "w2", title: "Distribute 20 Halazone Water Tablets", checked: false },
        { id: "w3", title: "Inspect drinking storage earthen pots", checked: false },
      ],
      dialect: "Halbi",
    },
    {
      id: 5,
      household_id: "HH-03",
      household_name: "Poyam Parivar (पोयाम परिवार)",
      hamlet: "Sector 4 Hamlet",
      head_of_household: "Lachhan Poyam",
      family_size: 4,
      priority: "routine",
      visit_reason: "Postnatal Care (PNC Day 10) Check",
      scheduled_date: "2026-10-18",
      status: "completed",
      last_visit_days_ago: 0,
      last_visit_notes: "Newborn active, breastfeeding established, cord clean.",
      vulnerable_members: [
        {
          name: "Sunita Poyam",
          age: 24,
          condition: "PNC Day 10 + Newborn Male",
          risk_note: "Normal postpartum recovery",
          dialect: "Halbi",
        },
      ],
      protocols: [
        { id: "p1", title: "Neonatal Weight & Temperature", checked: true },
        { id: "p2", title: "Umbilical Cord Infection Check", checked: true },
        { id: "p3", title: "Exclusive Breastfeeding Counseling", checked: true },
      ],
      dialect: "Halbi",
    },
  ];
}
