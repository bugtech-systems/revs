import React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Linking,
} from "react-native";

const FormSheet = ({
    title = "Form Sheet Title",
    descriptions = [],
    primaryButtonText = "OK",
    primaryButtonAction = null,
    secondaryButtonText = "Cancel",
    secondaryButtonAction = null,
}) => {

    // Default action for primary button: open phone settings
    const handlePrimary = () => {
        if (primaryButtonAction) {
            primaryButtonAction();
        } else {
            Linking.openSettings();
        }
    };

    // Default action for secondary button: do nothing
    const handleSecondary = () => {
        if (secondaryButtonAction) {
            secondaryButtonAction();
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>

            {descriptions.map((desc, idx) => (
                <Text key={idx} style={styles.description}>
                    {desc}
                </Text>
            ))}

            <TouchableOpacity style={styles.primaryButton} onPress={handlePrimary}>
                <Text style={styles.primaryText}>{primaryButtonText}</Text>
            </TouchableOpacity>

            {secondaryButtonText ? (
                <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleSecondary}
                >
                    <Text style={styles.secondaryText}>{secondaryButtonText}</Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );
};

export default FormSheet;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 25,
        justifyContent: "center",
        backgroundColor: "#fff",
    },
    title: {
        fontSize: 22,
        fontWeight: "bold",
        marginBottom: 15,
    },
    description: {
        fontSize: 15,
        marginBottom: 10,
        color: "#444",
    },
    primaryButton: {
        marginTop: 25,
        backgroundColor: "#007bff",
        padding: 14,
        borderRadius: 10,
        alignItems: "center",
    },
    primaryText: {
        color: "#fff",
        fontWeight: "600",
    },
    secondaryButton: {
        marginTop: 10,
        alignItems: "center",
    },
    secondaryText: {
        color: "#777",
    },
});