// @ts-ignore
const React = require("react");
const { useState, useEffect } = React;
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { BarCodeScanner } from "expo-barcode-scanner";

interface BarcodeScanData {
  type: string;
  data: string;
}

export default function ConsumerScreen() {
  const [hasPermission, setHasPermission] = useState(null) as [
    boolean | null,
    any
  ];
  const [scanned, setScanned] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    getBarCodeScannerPermissions();
  }, []);

  const getBarCodeScannerPermissions = async () => {
    const { status } = await BarCodeScanner.requestPermissionsAsync();
    setHasPermission(status === "granted");
  };

  const handleBarCodeScanned = ({ type, data }: BarcodeScanData) => {
    setScanned(true);
    setShowScanner(false);
    Alert.alert("QR Code Scanned", `Data: ${data}`, [
      { text: "Scan Again", onPress: () => setScanned(false) },
    ]);
  };

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
});
