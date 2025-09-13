import { CollectionEvent, ProvenanceData } from "./storage";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SubmitCollectionResponse {
  success: boolean;
  eventId: string;
  qrCode: string;
  message: string;
}

class ApiService {
  private static readonly BASE_URL = "http://10.10.52.73:8080"; // Update with your backend IP
  private static readonly TIMEOUT = 10000; // 10 seconds

  // Network connectivity check
  static async checkConnectivity(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${this.BASE_URL}/health`, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.log("Network connectivity check failed:", error);
      return false;
    }
  }

  // Generic API request method
  private static async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);

      const defaultOptions: RequestInit = {
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        ...options,
      };

      const response = await fetch(
        `${this.BASE_URL}${endpoint}`,
        defaultOptions
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error(`API Error [${endpoint}]:`, error);

      let errorMessage = "Network error";

      if (error.name === "AbortError") {
        errorMessage = "Request timeout";
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // Submit collection event
  static async submitCollectionEvent(
    event: Omit<CollectionEvent, "id" | "synced">
  ): Promise<ApiResponse<SubmitCollectionResponse>> {
    const payload = {
      farmerName: event.farmerName,
      cropType: event.cropType,
      quantity: event.quantity,
      location: event.location,
      timestamp: event.timestamp,
    };

    return this.apiRequest<SubmitCollectionResponse>("/collection", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // Get provenance data by QR code
  static async getProvenance(
    qrCode: string
  ): Promise<ApiResponse<ProvenanceData>> {
    return this.apiRequest<ProvenanceData>(
      `/provenance/${encodeURIComponent(qrCode)}`
    );
  }

  // Get all collection events
  static async getAllCollections(): Promise<ApiResponse<CollectionEvent[]>> {
    return this.apiRequest<CollectionEvent[]>("/collections");
  }

  // Health check
  static async healthCheck(): Promise<
    ApiResponse<{ status: string; timestamp: string }>
  > {
    return this.apiRequest("/health");
  }

  // Batch sync unsynced events
  static async syncCollectionEvents(events: CollectionEvent[]): Promise<{
    successful: string[];
    failed: Array<{ eventId: string; error: string }>;
  }> {
    const results = {
      successful: [] as string[],
      failed: [] as Array<{ eventId: string; error: string }>,
    };

    // Process events sequentially to avoid overwhelming the server
    for (const event of events) {
      try {
        const eventPayload = {
          farmerName: event.farmerName,
          cropType: event.cropType,
          quantity: event.quantity,
          location: event.location,
          timestamp: event.timestamp,
        };

        const response = await this.submitCollectionEvent(eventPayload);

        if (response.success) {
          results.successful.push(event.id);
        } else {
          results.failed.push({
            eventId: event.id,
            error: response.error || "Unknown error",
          });
        }
      } catch (error: any) {
        results.failed.push({
          eventId: event.id,
          error: error.message || "Network error",
        });
      }

      // Small delay between requests to be kind to the server
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return results;
  }

  // Update backend URL (for configuration changes)
  static updateBackendUrl(newUrl: string): void {
    // This would require making BASE_URL non-readonly and updating it
    console.log("Backend URL update requested:", newUrl);
    // In a production app, you might want to store this in AsyncStorage
  }

  // Get current backend URL
  static getBackendUrl(): string {
    return this.BASE_URL;
  }

  // Test API endpoints
  static async testAllEndpoints(): Promise<{
    health: boolean;
    collection: boolean;
    provenance: boolean;
    collections: boolean;
  }> {
    const results = {
      health: false,
      collection: false,
      provenance: false,
      collections: false,
    };

    try {
      // Test health endpoint
      const healthResponse = await this.healthCheck();
      results.health = healthResponse.success;

      // Test collections endpoint
      const collectionsResponse = await this.getAllCollections();
      results.collections = collectionsResponse.success;

      // Test collection submission with dummy data
      const dummyEvent = {
        farmerName: "Test Farmer",
        cropType: "Test Crop",
        quantity: 1,
        location: { latitude: 0, longitude: 0 },
        timestamp: new Date().toISOString(),
      };

      const collectionResponse = await this.submitCollectionEvent(dummyEvent);
      results.collection = collectionResponse.success;

      // Test provenance endpoint with a known QR code (if available)
      if (collectionResponse.success && collectionResponse.data?.qrCode) {
        const provenanceResponse = await this.getProvenance(
          collectionResponse.data.qrCode
        );
        results.provenance = provenanceResponse.success;
      }
    } catch (error) {
      console.error("Error testing API endpoints:", error);
    }

    return results;
  }
}

export default ApiService;
