import * as Network from "expo-network";

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

export interface Provenance {
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

const BASE_URL = "http://10.10.52.73:8080";

export const ApiService = {
  async submitCollectionEvent(event: CollectionEvent): Promise<boolean> {
    try {
      const response = await fetch(`${BASE_URL}/collection`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      });
      return response.ok;
    } catch (error) {
      console.error("Error submitting collection event:", error);
      return false;
    }
  },

  async getProvenance(id: string): Promise<Provenance | null> {
    try {
      const response = await fetch(`${BASE_URL}/provenance/${id}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error("Error fetching provenance:", error);
      return null;
    }
  },

  async isOnline(): Promise<boolean> {
    try {
      const networkState = await Network.getNetworkStateAsync();
      return networkState.isConnected || false;
    } catch (error) {
      console.error("Error checking network state:", error);
      return false;
    }
  },
};
