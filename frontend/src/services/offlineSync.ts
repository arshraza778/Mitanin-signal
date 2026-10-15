/**
 * Mitanin Signal - Frontline Offline Synchronization Service
 * 
 * Provides safe, persistent client-side queuing for frontline health workers (Mitanin cadre)
 * operating in low-connectivity (2G) or zero-connectivity remote and tribal forest sectors.
 * 
 * Clearly distinguishes between:
 * - 'saved': stored locally on-device, awaiting transmission trigger
 * - 'queued': staged for imminent dispatch when network connection is verified
 * - 'synced': successfully transmitted to backend and confirmed with 200 OK
 * - 'failed': transmission attempt rejected (HTTP 4xx/5xx or timeout); stored for review/retry
 */

export type SyncStatus = "saved" | "queued" | "synced" | "failed";

export type SyncItemType =
  | "field_report"
  | "task_action"
  | "visit_encounter"
  | "screening_triage"
  | "patient_registration"
  | "visit_completion";

export interface SyncQueueItem {
  id: string;
  type: SyncItemType;
  endpoint: string;
  method: "POST" | "PUT" | "PATCH";
  payload: Record<string, any>;
  authToken: string | null;
  status: SyncStatus;
  label: string;
  createdAt: string;
  lastAttemptAt?: string;
  syncedAt?: string;
  errorMessage?: string;
  retryCount: number;
}

const STORAGE_KEY = "mitanin_signal_offline_sync_queue_v1";

const listeners: Array<() => void> = [];

function notifyListeners() {
  for (const fn of listeners) {
    try {
      fn();
    } catch (e) {
      console.error("[offlineSync] listener error:", e);
    }
  }
}

export function subscribeToSyncQueue(callback: () => void): () => void {
  listeners.push(callback);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

export function getOfflineQueue(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("[offlineSync] Failed to read queue from localStorage:", err);
    return [];
  }
}

function saveOfflineQueue(queue: SyncQueueItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    notifyListeners();
  } catch (err) {
    console.error("[offlineSync] Failed to persist queue to localStorage:", err);
  }
}

export function enqueueOfflineItem(
  item: Omit<SyncQueueItem, "id" | "createdAt" | "retryCount">
): SyncQueueItem {
  const queue = getOfflineQueue();
  const newItem: SyncQueueItem = {
    ...item,
    id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };

  queue.unshift(newItem);
  saveOfflineQueue(queue);
  return newItem;
}

export function updateQueueItem(id: string, updates: Partial<SyncQueueItem>): void {
  const queue = getOfflineQueue();
  const idx = queue.findIndex((item) => item.id === id);
  if (idx !== -1) {
    queue[idx] = { ...queue[idx], ...updates };
    saveOfflineQueue(queue);
  }
}

export function removeQueueItem(id: string): void {
  const queue = getOfflineQueue();
  const filtered = queue.filter((item) => item.id !== id);
  saveOfflineQueue(filtered);
}

export function clearSyncedItems(): void {
  const queue = getOfflineQueue();
  const pending = queue.filter((item) => item.status !== "synced");
  saveOfflineQueue(pending);
}

export function getQueueSummary(): {
  total: number;
  saved: number;
  queued: number;
  synced: number;
  failed: number;
} {
  const queue = getOfflineQueue();
  return {
    total: queue.length,
    saved: queue.filter((i) => i.status === "saved").length,
    queued: queue.filter((i) => i.status === "queued").length,
    synced: queue.filter((i) => i.status === "synced").length,
    failed: queue.filter((i) => i.status === "failed").length,
  };
}

export function isDeviceOnline(): boolean {
  if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
    return navigator.onLine;
  }
  return true;
}

/**
 * Process all 'saved' and 'queued' items, transmitting them in FIFO order.
 */
export async function processSyncQueue(
  onProgress?: (item: SyncQueueItem) => void
): Promise<{ processed: number; successful: number; failed: number }> {
  if (!isDeviceOnline()) {
    return { processed: 0, successful: 0, failed: 0 };
  }

  const queue = getOfflineQueue();
  const actionable = queue.filter((i) => i.status === "saved" || i.status === "queued" || i.status === "failed");

  let successful = 0;
  let failed = 0;

  // Process in chronological order (oldest first)
  const sorted = [...actionable].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (const item of sorted) {
    updateQueueItem(item.id, { status: "queued", lastAttemptAt: new Date().toISOString() });

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (item.authToken) {
        headers["Authorization"] = `Bearer ${item.authToken}`;
      }

      const res = await fetch(item.endpoint, {
        method: item.method,
        headers,
        body: JSON.stringify(item.payload),
      });

      if (res.ok) {
        successful++;
        updateQueueItem(item.id, {
          status: "synced",
          syncedAt: new Date().toISOString(),
          errorMessage: undefined,
        });
      } else {
        failed++;
        const errorText = await res.text().catch(() => `HTTP ${res.status}`);
        updateQueueItem(item.id, {
          status: "failed",
          retryCount: item.retryCount + 1,
          errorMessage: errorText.slice(0, 150),
        });
      }
    } catch (netErr: any) {
      failed++;
      updateQueueItem(item.id, {
        status: "saved", // Keep as saved when purely a network disconnect
        retryCount: item.retryCount + 1,
        errorMessage: netErr?.message || "Network connection interrupted",
      });
      // If network is completely unreachable, pause processing remaining items
      break;
    }

    if (onProgress) {
      const refreshed = getOfflineQueue().find((i) => i.id === item.id);
      if (refreshed) onProgress(refreshed);
    }
  }

  return { processed: sorted.length, successful, failed };
}

// Global auto-sync on network reconnect
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    // Slight debounce to allow radio/socket stabilization
    setTimeout(() => {
      processSyncQueue().catch(() => {});
    }, 1500);
  });
}
