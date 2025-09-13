import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image,
} from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import StorageService, { CollectionEvent } from "../services/storage";
import ApiService from "../services/api";

interface LocationCoords {
  latitude: number;
  longitude: number;
}

export default function CollectorScreen() {
  const [farmerName, setFarmerName] = useState("");
  const [cropType, setCropType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [collectorId, setCollectorId] = useState("");
  const [location, setLocation] = useState(null) as [
    LocationCoords | null,
    any
  ];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [photo, setPhoto] = useState(null) as [string | null, any];
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Location permission is required to record collection events."
        );
        setIsLoadingLocation(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert("Location Error", "Failed to get current location.");
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const takePhoto = async () => {
    try {
      setIsProcessingPhoto(true);

      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Camera permission is required to take photos."
        );
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        await processPhotoWithMetadata(imageUri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Camera Error", "Failed to take photo. Please try again.");
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const processPhotoWithMetadata = async (imageUri: string) => {
    try {
      // Get current timestamp
      const timestamp = new Date().toISOString();

      // Create metadata object
      const metadata = {
        collectorId: collectorId || "Unknown",
        timestamp: timestamp,
        location: location
          ? {
              latitude: location.latitude,
              longitude: location.longitude,
            }
          : null,
        farmerName: farmerName || "Unknown",
        cropType: cropType || "Unknown",
      };

      // For now, we'll store the original image and metadata separately
      // In a production app, you might want to embed metadata into EXIF data
      const fileName = `sample_${Date.now()}.jpg`;
      const documentsDir = FileSystem.documentDirectory;
      const newImageUri = `${documentsDir}${fileName}`;

      // Copy image to app documents directory
      await FileSystem.copyAsync({
        from: imageUri,
        to: newImageUri,
      });

      // Store metadata alongside the image
      const metadataFile = `${documentsDir}${fileName}.metadata.json`;
      await FileSystem.writeAsStringAsync(
        metadataFile,
        JSON.stringify(metadata, null, 2)
      );

      setPhoto(newImageUri);

      Alert.alert(
        "Photo Captured",
        `Photo saved with metadata:\n` +
          `Collector ID: ${metadata.collectorId}\n` +
          `Timestamp: ${new Date(metadata.timestamp).toLocaleString()}\n` +
          `Location: ${
            metadata.location
              ? `${metadata.location.latitude.toFixed(
                  6
                )}, ${metadata.location.longitude.toFixed(6)}`
              : "Not available"
          }`
      );
    } catch (error) {
      console.error("Error processing photo:", error);
      Alert.alert("Processing Error", "Failed to process photo with metadata.");
    }
  };

  const validateForm = (): boolean => {
    if (!farmerName.trim()) {
      Alert.alert("Validation Error", "Please enter farmer name");
      return false;
    }

    if (!collectorId.trim()) {
      Alert.alert("Validation Error", "Please enter collector ID");
      return false;
    }

    if (!cropType.trim()) {
      Alert.alert("Validation Error", "Please enter crop type");
      return false;
    }

    if (
      !quantity.trim() ||
      isNaN(parseFloat(quantity)) ||
      parseFloat(quantity) <= 0
    ) {
      Alert.alert("Validation Error", "Please enter a valid quantity");
      return false;
    }

    if (!location) {
      Alert.alert(
        "Validation Error",
        "Location is required. Please enable location services."
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const collectionEvent: CollectionEvent = {
        id: Date.now().toString(),
        farmerName: farmerName.trim(),
        collectorId: collectorId.trim(),
        cropType: cropType.trim(),
        quantity: parseFloat(quantity),
        location: location!,
        timestamp: new Date().toISOString(),
        synced: false,
        photoUri: photo || undefined,
        photoMetadata: photo
          ? {
              collectorId: collectorId.trim(),
              timestamp: new Date().toISOString(),
              location: location,
              farmerName: farmerName.trim(),
              cropType: cropType.trim(),
            }
          : undefined,
      };

      // Save to local storage first
      await StorageService.saveCollectionEvent(collectionEvent);

      // Try to sync with backend
      try {
        const isOnline = await ApiService.checkConnectivity();

        if (isOnline) {
          const apiResponse = await ApiService.submitCollectionEvent({
            farmerName: collectionEvent.farmerName,
            collectorId: collectionEvent.collectorId,
            cropType: collectionEvent.cropType,
            quantity: collectionEvent.quantity,
            location: collectionEvent.location,
            timestamp: collectionEvent.timestamp,
            photoUri: collectionEvent.photoUri,
            photoMetadata: collectionEvent.photoMetadata,
          });

          if (apiResponse.success) {
            await StorageService.updateCollectionEvent(collectionEvent.id, {
              synced: true,
            });

            Alert.alert(
              "Success!",
              `Collection event recorded and synced!\n\nQR Code: ${
                apiResponse.data?.qrCode || "Generated"
              }`,
              [{ text: "OK" }]
            );
          } else {
            Alert.alert(
              "Saved Offline",
              "Collection event saved locally. Will sync when online.",
              [{ text: "OK" }]
            );
          }
        } else {
          Alert.alert(
            "Saved Offline",
            "Collection event saved locally. Will sync when online.",
            [{ text: "OK" }]
          );
        }
      } catch (syncError) {
        Alert.alert(
          "Saved Offline",
          "Collection event saved locally. Will sync when online.",
          [{ text: "OK" }]
        );
      }

      // Clear form
      setFarmerName("");
      setCollectorId("");
      setCropType("");
      setQuantity("");
      setPhoto(null);
      getCurrentLocation();
    } catch (error) {
      console.error("Error submitting collection event:", error);
      Alert.alert(
        "Error",
        "Failed to save collection event. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Collection Event</Text>
        <Text style={styles.subtitle}>Record crop collection data</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Farmer Name *</Text>
          <TextInput
            style={styles.input}
            value={farmerName}
            onChangeText={setFarmerName}
            placeholder="Enter farmer name"
            autoCapitalize="words"
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Collector ID *</Text>
          <TextInput
            style={styles.input}
            value={collectorId}
            onChangeText={setCollectorId}
            placeholder="Enter collector ID"
            autoCapitalize="characters"
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Crop Type *</Text>
          <TextInput
            style={styles.input}
            value={cropType}
            onChangeText={setCropType}
            placeholder="e.g., Rice, Wheat, Tomatoes"
            autoCapitalize="words"
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Quantity (kg) *</Text>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            placeholder="Enter quantity in kg"
            keyboardType="numeric"
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.locationSection}>
          <View style={styles.locationHeader}>
            <Text style={styles.label}>GPS Location *</Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={getCurrentLocation}
              disabled={isLoadingLocation || isSubmitting}
            >
              <Text style={styles.refreshButtonText}>
                {isLoadingLocation ? "Getting..." : "Refresh"}
              </Text>
            </TouchableOpacity>
          </View>

          {isLoadingLocation ? (
            <View style={styles.locationLoading}>
              <ActivityIndicator size="small" color="#2e7d32" />
              <Text style={styles.locationLoadingText}>
                Getting GPS location...
              </Text>
            </View>
          ) : location ? (
            <View style={styles.locationInfo}>
              <Text style={styles.locationText}>
                Lat: {location.latitude.toFixed(6)}
              </Text>
              <Text style={styles.locationText}>
                Lng: {location.longitude.toFixed(6)}
              </Text>
            </View>
          ) : (
            <View style={styles.locationError}>
              <Text style={styles.locationErrorText}>
                Location not available. Tap "Refresh" to try again.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.photoSection}>
          <Text style={styles.label}>Sample Photo</Text>
          <Text style={styles.photoDescription}>
            Take a photo of the collected sample (with GPS and collector ID
            embedded)
          </Text>

          <TouchableOpacity
            style={[
              styles.photoButton,
              isProcessingPhoto && styles.photoButtonDisabled,
            ]}
            onPress={takePhoto}
            disabled={isProcessingPhoto || isSubmitting}
          >
            <Text style={styles.photoButtonText}>
              {isProcessingPhoto ? "Processing..." : "📷 Take Photo"}
            </Text>
          </TouchableOpacity>

          {photo && (
            <View style={styles.photoPreview}>
              <Text style={styles.photoPreviewText}>
                ✓ Photo captured with metadata
              </Text>
              <Image source={{ uri: photo }} style={styles.photoImage} />
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (isSubmitting || !location) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting || !location}
        >
          {isSubmitting ? (
            <View style={styles.submitButtonContent}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.submitButtonText}>Submitting...</Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>Record Collection Event</Text>
          )}
        </TouchableOpacity>

        <View style={styles.helpText}>
          <Text style={styles.helpTextContent}>
            📍 Location data is used for traceability
          </Text>
          <Text style={styles.helpTextContent}>
            💾 Data is saved locally first and synced when online
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2e7d32",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  form: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  locationSection: {
    marginBottom: 25,
  },
  locationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  refreshButton: {
    backgroundColor: "#e8f5e8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  refreshButtonText: {
    color: "#2e7d32",
    fontSize: 14,
    fontWeight: "500",
  },
  locationLoading: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  locationLoadingText: {
    marginLeft: 10,
    color: "#666",
  },
  locationInfo: {
    backgroundColor: "#e8f5e8",
    padding: 15,
    borderRadius: 8,
  },
  locationText: {
    fontSize: 14,
    color: "#2e7d32",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  locationError: {
    backgroundColor: "#ffebee",
    padding: 15,
    borderRadius: 8,
  },
  locationErrorText: {
    color: "#c62828",
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: "#2e7d32",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
  },
  submitButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
  },
  helpText: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 8,
  },
  helpTextContent: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  photoSection: {
    marginBottom: 20,
  },
  photoDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
    lineHeight: 20,
  },
  photoButton: {
    backgroundColor: "#1976d2",
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
    marginBottom: 15,
  },
  photoButtonDisabled: {
    backgroundColor: "#ccc",
  },
  photoButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  photoPreview: {
    backgroundColor: "#e3f2fd",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  photoPreviewText: {
    color: "#1976d2",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 10,
  },
  photoImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    resizeMode: "cover",
  },
});
