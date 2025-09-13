// Data models and types

export interface CollectionEvent {
  id: string;
  farmerName: string;
  cropType: string;
  quantity: number;
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
  synced: boolean;
}

export interface ProvenanceData {
  id: string;
  productName: string;
  farmerName: string;
  farmLocation: {
    latitude: number;
    longitude: number;
  };
  harvestDate: string;
  certifications: string[];
  qualityGrade: string;
  processingSteps: ProcessingStep[];
  transportationHistory: TransportationStep[];
  currentLocation: {
    latitude: number;
    longitude: number;
  };
  verificationStatus: "verified" | "pending" | "rejected";
}

export interface ProcessingStep {
  id: string;
  stepName: string;
  facilityName: string;
  timestamp: string;
  certifications: string[];
  qualityChecks: QualityCheck[];
}

export interface QualityCheck {
  parameter: string;
  value: string;
  unit: string;
  status: "pass" | "fail";
}

export interface TransportationStep {
  id: string;
  fromLocation: string;
  toLocation: string;
  transportMethod: string;
  departureTime: string;
  arrivalTime: string;
  temperature?: number;
  humidity?: number;
}
