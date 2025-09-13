// @ts-ignore
const React = require("react");
const { useState, useEffect } = React;
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { BarCodeScanner } from "expo-barcode-scanner";
import ApiService from "../services/api";

interface BarcodeScanData {
  type: string;
  data: string;
}

interface ProvenanceData {
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

export default function ConsumerScreen() {
  const [hasPermission, setHasPermission] = useState(null) as [
    boolean | null,
    any
  ];
  const [scanned, setScanned] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [provenanceData, setProvenanceData] = useState(null) as [
    ProvenanceData | null,
    any
  ];
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getBarCodeScannerPermissions();
  }, []);

  const getBarCodeScannerPermissions = async () => {
    const { status } = await BarCodeScanner.requestPermissionsAsync();
    setHasPermission(status === "granted");
  };

  const handleBarCodeScanned = async ({ type, data }: BarcodeScanData) => {
    setScanned(true);
    setShowScanner(false);
    setLoading(true);

    try {
      // Try to fetch provenance data
      const provenance = await ApiService.getProvenance(data);

      if (provenance) {
        setProvenanceData(provenance);
      } else {
        Alert.alert(
          "QR Code Not Found",
          `QR Code: ${data}\n\nThis QR code is not registered in our system.`,
          [
            { text: "Scan Again", onPress: () => setScanned(false) },
            { text: "OK", onPress: () => {} },
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to fetch product information. Please try again.",
        [{ text: "Scan Again", onPress: () => setScanned(false) }]
      );
    } finally {
      setLoading(false);
    }
  };

  const renderProvenanceData = () => {
    if (!provenanceData) return null;

    return (
      <ScrollView style={styles.provenanceContainer}>
        <Text style={styles.title}>Product Information</Text>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Basic Details</Text>
          <Text style={styles.infoText}>
            Farmer: {provenanceData.farmerName}
          </Text>
          <Text style={styles.infoText}>
            Crop Type: {provenanceData.cropType}
          </Text>
          <Text style={styles.infoText}>
            Quantity: {provenanceData.quantity} kg
          </Text>
          <Text style={styles.infoText}>QR Code: {provenanceData.qrCode}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Location</Text>
          <Text style={styles.infoText}>
            Latitude: {provenanceData.location.latitude.toFixed(6)}
          </Text>
          <Text style={styles.infoText}>
            Longitude: {provenanceData.location.longitude.toFixed(6)}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Supply Chain History</Text>
          {provenanceData.history.map((entry, index) => (
            <View key={index} style={styles.historyEntry}>
              <Text style={styles.historyStage}>{entry.stage}</Text>
              <Text style={styles.historyDetails}>{entry.details}</Text>
              <Text style={styles.historyTime}>
                {new Date(entry.timestamp).toLocaleDateString()} at{" "}
                {new Date(entry.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.scanAgainButton}
          onPress={() => {
            setProvenanceData(null);
            setScanned(false);
          }}
        >
          <Text style={styles.scanAgainText}>Scan Another QR Code</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={styles.loadingText}>Fetching product information...</Text>
      </View>
    );
  }

  if (provenanceData) {
    return renderProvenanceData();
  }

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text>No access to camera</Text>
      </View>
    );
  }

  if (showScanner) {
    return (
      <View style={styles.container}>
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => setShowScanner(false)}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan QR Code</Text>
      <Text style={styles.subtitle}>Verify crop provenance</Text>

      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => setShowScanner(true)}
      >
        <Text style={styles.scanButtonText}>Start Scanning</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#1976d2",
  },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 30 },
  scanButton: { backgroundColor: "#1976d2", padding: 15, borderRadius: 8 },
  scanButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  cancelButton: {
    position: "absolute",
    bottom: 50,
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
  },
  cancelText: { color: "#333", fontSize: 16 },
  provenanceContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  infoCard: {
    backgroundColor: "#fff",
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#1976d2",
  },
  infoText: {
    fontSize: 14,
    marginBottom: 5,
    color: "#333",
  },
  historyEntry: {
    borderLeftWidth: 3,
    borderLeftColor: "#4caf50",
    paddingLeft: 10,
    marginBottom: 10,
  },
  historyStage: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4caf50",
  },
  historyDetails: {
    fontSize: 14,
    color: "#666",
    marginVertical: 2,
  },
  historyTime: {
    fontSize: 12,
    color: "#999",
  },
  scanAgainButton: {
    backgroundColor: "#1976d2",
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  scanAgainText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
});
