// @ts-ignore
const React = require("react");
const { useState, useRef, useEffect } = React;
import { AppState, AppStateStatus } from "react-native";
import ApiService from "./api";
import StorageService, { CollectionEvent } from "./storage";

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  pendingEvents: number;
  syncErrors: string[];
}

class SyncService {
  private static instance: SyncService;
  private syncInterval: any | null = null;
  private isSyncing = false;
  private syncListeners: Array<(status: SyncStatus) => void> = [];
  private lastSyncTime: string | null = null;
  private isOnline = false;

  private constructor() {
    this.initializeSync();
  }

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  // Initialize sync service
  private async initializeSync(): Promise<void> {
    // Check initial connectivity
    this.isOnline = await ApiService.checkConnectivity();

    // Set up periodic sync (every 5 minutes when online)
    this.setupPeriodicSync();

    // Listen for app state changes
    this.setupAppStateListener();

    // Initial sync if online
    if (this.isOnline) {
      this.performSync();
    }
  }

  // Set up periodic sync
  private setupPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      const wasOnline = this.isOnline;
      this.isOnline = await ApiService.checkConnectivity();

      // If we just came online or are still online, try to sync
      if (this.isOnline && (!wasOnline || this.shouldSync())) {
        this.performSync();
      }

      this.notifyListeners();
    }, 5 * 60 * 1000); // 5 minutes
  }

  // Set up app state listener for foreground sync
  private setupAppStateListener(): void {
    AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        // App came to foreground, check connectivity and sync
        this.checkConnectivityAndSync();
      }
    });
  }

  // Check connectivity and sync if online
  private async checkConnectivityAndSync(): Promise<void> {
    const wasOnline = this.isOnline;
    this.isOnline = await ApiService.checkConnectivity();

    if (this.isOnline && (!wasOnline || this.shouldSync())) {
      this.performSync();
    }

    this.notifyListeners();
  }

  // Determine if sync should happen
  private shouldSync(): boolean {
    if (!this.lastSyncTime) return true;

    const lastSync = new Date(this.lastSyncTime).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    return now - lastSync > fiveMinutes;
  }

  // Main sync operation
  private async performSync(): Promise<void> {
    if (this.isSyncing || !this.isOnline) {
      return;
    }

    this.isSyncing = true;
    this.notifyListeners();

    try {
      console.log("Starting sync operation...");

      // Get unsynced events
      const unsyncedEvents = await StorageService.getUnsyncedEvents();

      if (unsyncedEvents.length > 0) {
        console.log(`Syncing ${unsyncedEvents.length} unsynced events...`);

        // Sync events with backend
        const syncResults = await ApiService.syncCollectionEvents(
          unsyncedEvents
        );

        // Update synced events in storage
        for (const eventId of syncResults.successful) {
          await StorageService.updateCollectionEvent(eventId, { synced: true });
        }

        // Log failures
        if (syncResults.failed.length > 0) {
          console.warn("Some events failed to sync:", syncResults.failed);
        }

        console.log(
          `Sync completed: ${syncResults.successful.length} successful, ${syncResults.failed.length} failed`
        );
      }

      this.lastSyncTime = new Date().toISOString();
      console.log("Sync operation completed successfully");
    } catch (error) {
      console.error("Sync operation failed:", error);
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  // Force immediate sync
  public async forcSync(): Promise<void> {
    this.isOnline = await ApiService.checkConnectivity();
    if (this.isOnline) {
      await this.performSync();
    } else {
      throw new Error("Device is offline");
    }
  }

  // Add sync status listener
  public addSyncListener(listener: (status: SyncStatus) => void): void {
    this.syncListeners.push(listener);
    // Immediately notify with current status
    this.notifyListeners();
  }

  // Remove sync status listener
  public removeSyncListener(listener: (status: SyncStatus) => void): void {
    this.syncListeners = this.syncListeners.filter((l) => l !== listener);
  }

  // Notify all listeners of status change
  private async notifyListeners(): Promise<void> {
    const pendingEvents = await StorageService.getUnsyncedEvents();

    const status: SyncStatus = {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      pendingEvents: pendingEvents.length,
      syncErrors: [], // Could be enhanced to track specific errors
    };

    this.syncListeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        console.error("Error in sync listener:", error);
      }
    });
  }

  // Get current sync status
  public async getSyncStatus(): Promise<SyncStatus> {
    const pendingEvents = await StorageService.getUnsyncedEvents();

    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      pendingEvents: pendingEvents.length,
      syncErrors: [],
    };
  }

  // Stop sync service
  public stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.syncListeners = [];
  }

  // Restart sync service
  public restart(): void {
    this.stop();
    this.initializeSync();
  }
}

// React hook for using sync service
export function useSyncService(): SyncStatus {
  const [syncStatus, setSyncStatus] = useState({
    isOnline: false,
    isSyncing: false,
    lastSyncTime: null,
    pendingEvents: 0,
    syncErrors: [],
  }) as [SyncStatus, any];

  const syncServiceRef = useRef() as any;

  useEffect(() => {
    // Get sync service instance
    syncServiceRef.current = SyncService.getInstance();

    // Set up listener
    const handleSyncStatusChange = (status: SyncStatus) => {
      setSyncStatus(status);
    };

    syncServiceRef.current.addSyncListener(handleSyncStatusChange);

    // Cleanup
    return () => {
      if (syncServiceRef.current) {
        syncServiceRef.current.removeSyncListener(handleSyncStatusChange);
      }
    };
  }, []);

  return syncStatus;
}

// Hook for manual sync operations
export function useSyncOperations() {
  const syncService = useRef(SyncService.getInstance()) as any;

  const forceSync = async (): Promise<void> => {
    return syncService.current.forcSync();
  };

  const getSyncStatus = async (): Promise<SyncStatus> => {
    return syncService.current.getSyncStatus();
  };

  return {
    forceSync,
    getSyncStatus,
  };
}

export default SyncService;
