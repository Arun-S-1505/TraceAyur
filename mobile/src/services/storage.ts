import AsyncStorage from "@react-native-async-storage/async-storage";

export interface CollectionEvent {
  id: string;
  farmerName: string;
  collectorId: string;
  cropType: string;
  quantity: number;
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
  synced: boolean;
  photoUri?: string;
  photoMetadata?: {
    collectorId: string;
    timestamp: string;
    location: {
      latitude: number;
      longitude: number;
    } | null;
    farmerName: string;
    cropType: string;
  };
}

export interface ProvenanceData {
  id: string;
  farmerName: string;
  cropType: string;
  quantity: number;
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
  qrCode: string;
  history: Array<{
    stage: string;
    timestamp: string;
    location: {
      latitude: number;
      longitude: number;
    };
    details: string;
  }>;
}

class StorageService {
  private static readonly COLLECTION_EVENTS_KEY =
    "@TraceAyur:collection_events";
  private static readonly PROVENANCE_CACHE_KEY = "@TraceAyur:provenance_cache";
  private static readonly SYNC_QUEUE_KEY = "@TraceAyur:sync_queue";

  // Collection Events
  static async saveCollectionEvent(event: CollectionEvent): Promise<void> {
    try {
      const events = await this.getCollectionEvents();
      events.push(event);
      await AsyncStorage.setItem(
        this.COLLECTION_EVENTS_KEY,
        JSON.stringify(events)
      );
    } catch (error) {
      console.error("Error saving collection event:", error);
      throw error;
    }
  }

  static async getCollectionEvents(): Promise<CollectionEvent[]> {
    try {
      const eventsJson = await AsyncStorage.getItem(this.COLLECTION_EVENTS_KEY);
      return eventsJson ? JSON.parse(eventsJson) : [];
    } catch (error) {
      console.error("Error getting collection events:", error);
      return [];
    }
  }

  static async updateCollectionEvent(
    eventId: string,
    updates: Partial<CollectionEvent>
  ): Promise<void> {
    try {
      const events = await this.getCollectionEvents();
      const eventIndex = events.findIndex((e) => e.id === eventId);
      if (eventIndex !== -1) {
        events[eventIndex] = { ...events[eventIndex], ...updates };
        await AsyncStorage.setItem(
          this.COLLECTION_EVENTS_KEY,
          JSON.stringify(events)
        );
      }
    } catch (error) {
      console.error("Error updating collection event:", error);
      throw error;
    }
  }

  static async getUnsyncedEvents(): Promise<CollectionEvent[]> {
    try {
      const events = await this.getCollectionEvents();
      return events.filter((event) => !event.synced);
    } catch (error) {
      console.error("Error getting unsynced events:", error);
      return [];
    }
  }

  // Provenance Cache
  static async cacheProvenanceData(
    qrCode: string,
    data: ProvenanceData
  ): Promise<void> {
    try {
      const cache = await this.getProvenanceCache();
      cache[qrCode] = {
        ...data,
        cachedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(
        this.PROVENANCE_CACHE_KEY,
        JSON.stringify(cache)
      );
    } catch (error) {
      console.error("Error caching provenance data:", error);
      throw error;
    }
  }

  static async getCachedProvenanceData(
    qrCode: string
  ): Promise<ProvenanceData | null> {
    try {
      const cache = await this.getProvenanceCache();
      const cached = cache[qrCode];

      if (cached) {
        // Check if cache is still valid (24 hours)
        const cacheAge = Date.now() - new Date(cached.cachedAt).getTime();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        if (cacheAge < maxAge) {
          return cached;
        } else {
          // Remove expired cache
          delete cache[qrCode];
          await AsyncStorage.setItem(
            this.PROVENANCE_CACHE_KEY,
            JSON.stringify(cache)
          );
        }
      }

      return null;
    } catch (error) {
      console.error("Error getting cached provenance data:", error);
      return null;
    }
  }

  static async getProvenanceCache(): Promise<Record<string, any>> {
    try {
      const cacheJson = await AsyncStorage.getItem(this.PROVENANCE_CACHE_KEY);
      return cacheJson ? JSON.parse(cacheJson) : {};
    } catch (error) {
      console.error("Error getting provenance cache:", error);
      return {};
    }
  }

  // Sync Queue
  static async addToSyncQueue(action: string, data: any): Promise<void> {
    try {
      const queue = await this.getSyncQueue();
      queue.push({
        id: Date.now().toString(),
        action,
        data,
        timestamp: new Date().toISOString(),
        retries: 0,
      });
      await AsyncStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error("Error adding to sync queue:", error);
      throw error;
    }
  }

  static async getSyncQueue(): Promise<any[]> {
    try {
      const queueJson = await AsyncStorage.getItem(this.SYNC_QUEUE_KEY);
      return queueJson ? JSON.parse(queueJson) : [];
    } catch (error) {
      console.error("Error getting sync queue:", error);
      return [];
    }
  }

  static async removeSyncQueueItem(itemId: string): Promise<void> {
    try {
      const queue = await this.getSyncQueue();
      const filteredQueue = queue.filter((item) => item.id !== itemId);
      await AsyncStorage.setItem(
        this.SYNC_QUEUE_KEY,
        JSON.stringify(filteredQueue)
      );
    } catch (error) {
      console.error("Error removing sync queue item:", error);
      throw error;
    }
  }

  static async clearSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.SYNC_QUEUE_KEY);
    } catch (error) {
      console.error("Error clearing sync queue:", error);
      throw error;
    }
  }

  // Utility methods
  static async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.COLLECTION_EVENTS_KEY,
        this.PROVENANCE_CACHE_KEY,
        this.SYNC_QUEUE_KEY,
      ]);
    } catch (error) {
      console.error("Error clearing all data:", error);
      throw error;
    }
  }

  static async getStorageStats(): Promise<{
    collectionEvents: number;
    provenanceCache: number;
    syncQueue: number;
  }> {
    try {
      const [events, cache, queue] = await Promise.all([
        this.getCollectionEvents(),
        this.getProvenanceCache(),
        this.getSyncQueue(),
      ]);

      return {
        collectionEvents: events.length,
        provenanceCache: Object.keys(cache).length,
        syncQueue: queue.length,
      };
    } catch (error) {
      console.error("Error getting storage stats:", error);
      return { collectionEvents: 0, provenanceCache: 0, syncQueue: 0 };
    }
  }
}

export default StorageService;
