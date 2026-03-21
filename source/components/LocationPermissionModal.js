import React, { useState } from "react";
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    PermissionsAndroid,
    Platform,
} from "react-native";

const LocationPermissionModal = () => {
    const [visible, setVisible] = useState(true);

    // Function to request location permission
    const requestLocationPermission = async () => {
        try {
            if (Platform.OS === "android") {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: "Location Permission Required",
                        message:
                            "This app requires access to your location to function properly.",
                        buttonNeutral: "Ask Me Later",
                        buttonNegative: "Cancel",
                        buttonPositive: "Allow",
                    }
                );

                if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                    console.log("Location permission granted");
                    setVisible(false);
                } else {
                    console.log("Location permission denied");
                }
            }
        } catch (err) {
            console.warn(err);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>

                    <Text style={styles.title}>Location Permission Required</Text>

                    <Text style={styles.description}>
                        This application requires access to your device's location in order
                        to provide full functionality. Please enable location permission to
                        continue using the app.
                    </Text>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={styles.allowButton}
                            onPress={requestLocationPermission}
                        >
                            <Text style={styles.buttonText}>Allow Location</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setVisible(false)}
                        >
                            <Text style={styles.cancelText}>Close</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </View>
        </Modal>
    );
};

export default LocationPermissionModal;

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },

    modalContainer: {
        width: "85%",
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 12,
    },

    title: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 10,
    },

    description: {
        fontSize: 15,
        color: "#555",
        marginBottom: 20,
    },

    buttonContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
    },

    allowButton: {
        backgroundColor: "#007bff",
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 8,
    },

    cancelButton: {
        paddingVertical: 10,
        paddingHorizontal: 18,
    },

    buttonText: {
        color: "#fff",
        fontWeight: "bold",
    },

    cancelText: {
        color: "#666",
    },
});