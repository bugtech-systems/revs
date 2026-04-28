    import React, { useEffect, useState, useMemo } from "react";
    import {
        View,
        Text,
        FlatList,
        TouchableOpacity,
        StyleSheet,
        TextInput,
    } from "react-native";
    import supabase from "../../utils/supabaseClient";
    import { formatMessageTime, getAvatarColor } from "../../utils/helpers";
    import { COLORS } from "../../constants";
    import { useSelector } from "react-redux";

    export default function ChatListScreen({ navigation }) {
            const { user, } = useSelector(({ user }) => user);
        const [conversations, setConversations] = useState([]);
        const [search, setSearch] = useState("");
        const [refreshing, setRefreshing] = useState(false);

        // Use this to test the flatlist using a dummy data sir!
        // const generateDummyMessages = (count = 25) => {
        //     const list = [];

        //     for (let i = 0; i < count; i++) {
        //         list.push({
        //             recipient: `09${Math.floor(100000000 + Math.random() * 900000000)}`,
        //             message: `Test message #${i + 1}`,
        //             created_at: new Date(Date.now() - i * 60000).toISOString(),
        //             created_by: "dummy-user",
        //         });
        //     }

        //     return list;
        // };

        // const fetchChats = async () => {
        //     try {
        //         // 🔥 replace supabase call temporarily
        //         const data = generateDummyMessages(30);

        //         const grouped = Object.values(
        //             data.reduce((acc, msg) => {
        //                 if (!acc[msg.recipient]) acc[msg.recipient] = msg;
        //                 return acc;
        //             }, {})
        //         );

        //         setConversations(grouped);
        //     } catch (err) {
        //         console.log("Fetch error:", err);
        //     } finally {
        //         setRefreshing(false);
        //     }
        // };

        const fetchChats = async () => {
            try {
                const { data } = await supabase
                    .from("messages")
                    .select("recipient, message, created_at, created_by, is_deleted")
                    .eq("created_by, is_deleted", user.id, false)
                    .order("created_at", { ascending: false });

                const grouped = Object.values(
                    data.reduce((acc, msg) => {
                        if (!acc[msg.recipient]) acc[msg.recipient] = msg;
                        return acc;
                    }, {})
                );

                setConversations(grouped);
            } catch (err) {
                console.log("Fetch error:", err);
            } finally {
                setRefreshing(false); // ✅ stop refresh spinner
            }
        };

        const onRefresh = () => {
            setRefreshing(true);
            fetchChats();
        };

        useEffect(() => {
            fetchChats();
        }, []);

        // 🔍 Filter search
        const filtered = conversations.filter((item) =>
            item.recipient.includes(search)
        );

        const renderItem = ({ item, index }) => {
            const initials = item.recipient.slice(-2);
            const backgroundColor = index % 2 === 0 ? COLORS.gray300 : COLORS.gray200;
            const avatarColor = getAvatarColor(item.recipient);
            return (
                <TouchableOpacity
                    style={{...styles.chatItem, backgroundColor: backgroundColor, marginVertical: 1}}
                    onPress={() =>
                        navigation.navigate("ChatThread", {
                            recipient: item.recipient,
                        })
                    }
                >
                    {/* Avatar */}
                    <View style={{...styles.avatar, backgroundColor: avatarColor}}>
                        <Text style={styles.avatarText}>{initials}</Text>
                    </View>

                    {/* Info */}
                    <View style={styles.chatInfo}>
                        <Text style={styles.name}>{item.recipient}</Text>
                        <Text style={styles.message} numberOfLines={1}>
                            You: {item.message}
                        </Text>
                    </View>

                    {/* Time */}
                    <Text style={styles.time}>
                        {formatMessageTime(item.created_at)}
                    </Text>
                </TouchableOpacity>
            );
        };

        const renderHeader = useMemo(() => {
            return (
                <View style={styles.searchContainer}>
                    <TextInput
                        placeholder="Search conversations"
                        style={styles.searchInput}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            );
        }, [search]);

        return (
            <View style={styles.container}>
                {/* 🔍 Search Bar */}
                {/* <View style={styles.searchContainer}>
                    <TextInput
                        placeholder="Search conversations"
                        style={styles.searchInput}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View> */}

                {/* 📄 List */}
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => item.recipient}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={renderHeader} // ✅ moved here
                    ListEmptyComponent={<EmptyState />}
                    contentContainerStyle={{ flexGrow: 1 }}
                    refreshing={refreshing} // ✅ pull-to-refresh
                    onRefresh={onRefresh}
                //   stickyHeaderIndices={[0]}
                />

                {/* ➕ FAB */}
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => navigation.navigate("NewChat")}
                >
                    <Text style={styles.fabText}>Start chat</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const EmptyState = () => {
        return (
            <View style={styles.emptyContainer}>
                {/* Replace with your SVG if you have */}
                <Text style={styles.emptyIllustration}>💬</Text>

                <Text style={styles.emptyText}>
                    Once you start a new conversation, you’ll see it listed here
                </Text>
            </View>
        );
    };


    const styles = StyleSheet.create({
        container: {
            flex: 1,
        backgroundColor: COLORS.gray300
        },

        // 🔍 Search
        searchContainer: {
            margin: 12,
            backgroundColor: "#fff",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 4,
            height: 50,
            elevation: 2,
        },
        searchInput: {
            fontSize: 16,
        },

        // 💬 Chat Item
        chatItem: {
            flexDirection: "row",
            alignItems: "center",
            padding: 14,
            borderRadius: 10,
            // borderBottomWidth: 1,
            // borderBottomColor: "#ffffffee",
            backgroundColor: "#ffffffee",
        },
        avatar: {
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: "#ff5ca8",
            justifyContent: "center",
            alignItems: "center",
            marginRight: 12,
        },
        avatarText: {
            color: "#fff",
            fontWeight: "bold",
        },
        chatInfo: {
            flex: 1,
        },
        name: {
            fontSize: 16,
            fontWeight: "600",
            color: COLORS.black
        },
        message: {
            marginTop: 2,
            color: COLORS.black
        },
        time: {
            fontSize: 12,
            color: "#999",
        },

        // 📭 Empty State
        emptyContainer: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 40,
        },
        emptyIllustration: {
            fontSize: 80,
            marginBottom: 20,
        },
        emptyText: {
            textAlign: "center",
            color: "#888",
        },

        // ➕ FAB
        fab: {
            position: "absolute",
            bottom: 20,
            right: 20,
            backgroundColor: COLORS.secondaryTransparent,
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderRadius: 30,
            elevation: 5,
        },
        fabText: {
            color: "#fff",
            fontWeight: "600",
        },
    });