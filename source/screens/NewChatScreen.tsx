import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
} from "react-native";

export default function NewChatScreen({ navigation }) {
    const [receiver, setReceiver] = useState("");

    const normalizePH = (num: string) => {
        let cleaned = num.replace(/\D/g, "");
        if (cleaned.startsWith("63")) cleaned = "0" + cleaned.slice(2);
        if (!cleaned.startsWith("0")) cleaned = "0" + cleaned;
        return cleaned.slice(0, 11);
    };

    const validatePH = (num: string) => /^09\d{9}$/.test(num);

    const handleStart = () => {
        const normalized = normalizePH(receiver);

        if (!validatePH(normalized)) return;

        navigation.navigate("ChatThread", {
            recipient: normalized,
        });
    };

    return (
        <View style={styles.container}>
            {/* 🔙 Header */}
            {/* <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>New conversation</Text>
            </View> */}

            {/* 🧾 Input Row */}
            <View style={styles.inputRow}>
                <Text style={styles.toLabel}>To</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Type a phone number here"
                    value={receiver}
                    onChangeText={(text) => {
  setReceiver(text);

  const normalized = normalizePH(text);
  if (/^09\d{9}$/.test(normalized)) {
    navigation.navigate("ChatThread", {
      recipient: normalized,
    });
  }
}}
                    keyboardType="phone-pad"
                    autoFocus
                    onSubmitEditing={handleStart}
                />

                {/* Right Icon Placeholder */}
                <TouchableOpacity>
                    <Text style={styles.icon}>⋮⋮</Text>
                </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* 👥 Create Group */}
            {/* <TouchableOpacity style={styles.groupRow}>
                <Text style={styles.groupIcon}>👥+</Text>
                <Text style={styles.groupText}>Create group</Text>
            </TouchableOpacity> */}
        </View>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 10,
  },

  // 🔙 Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  back: {
    fontSize: 22,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "500",
  },

  // 🧾 Input Row
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  toLabel: {
    fontSize: 16,
    marginRight: 10,
    color: "#444",
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  icon: {
    fontSize: 18,
    color: "#666",
    paddingHorizontal: 8,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: "#ddd",
    marginHorizontal: 12,
    marginTop: 4,
  },

  // 👥 Create Group
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  groupIcon: {
    fontSize: 20,
    marginRight: 16,
    color: "#1a73e8",
  },
  groupText: {
    fontSize: 16,
  },
});