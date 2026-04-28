import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import {
    View,
    Text,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Modal,
    Switch,
    TouchableWithoutFeedback,
    Image,
    Alert
} from "react-native";
import supabase from "../utils/supabaseClient";
import { useSelector } from "react-redux";
import moment from "moment-timezone";
import { formatMessageTime, getDateLabel } from "../utils/helpers";
import { COLORS, icons } from "../constants";

export default function ChatThreadScreen({ route, navigation }) {
    const { user, } = useSelector(({ user }) => user);
    const { recipient } = route.params;
    const [refreshing, setRefreshing] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const flatListRef = useRef(null);
    const [flashModalVisible, setFlashModalVisible] = useState(false);
const [isFlash, setIsFlash] = useState(false);

    // ✅ FIXED: fetch all messages (not limit 1)
    // const fetchMessages = async () => {
    //     const { data } = await supabase
    //         .from("messages")
    //         .select("*")
    //         .eq("recipient", recipient)
    //         .order("created_at", { ascending: true });

    //     setMessages(data || []);
    // };

    const handleMessageType = (prevState) => {
        console.log(prevState, "THE PREV STATE")
        setIsFlash(!prevState)
    }
    
    const onRefresh = () => {
        setRefreshing(true);
        fetchMessages();
    };

    const fetchMessages = async () => {
        try {
            const { data } = await supabase
                .from("messages")
                .select("*")
                .eq("recipient", recipient)
                .order("created_at", { ascending: true });

            setMessages(data || []);
        } catch (err) {
            console.log("Fetch messages error:", err);
        } finally {
            setRefreshing(false); // ✅ stop refresh
        }
    };

    const buildChatWithSeparators = (messages) => {
        const result = [];

        let lastDate = null;

        messages.forEach((msg, index) => {
            const msgDate = getDateLabel(msg.created_at);
            // const formatMsgDate = moment(msg.created_at).format("YYYY-MM-DD")

            const isNewDay = msgDate !== lastDate;
            const isEvery10 = index % 10 === 0;

            if (isNewDay || isEvery10) {
                result.push({
                    type: "separator",
                    id: `sep-${msg.id}-${index}`,
                    label: getDateLabel(msg.created_at),
                });

                lastDate = msgDate;
            }

            result.push({
                type: "message",
                ...msg,
            });
        });

        return result;
    };

    useEffect(() => {
        fetchMessages();

        navigation.setOptions({
            title: recipient,
        });
    }, []);

    // ✅ SEND MESSAGE WITH STATUS
    const sendMessage = async () => {
        if (!input.trim()) return;

        const tempId = Date.now().toString();

        const newMsg = {
            id: tempId, // temp only for UI
            created_by: user.id,
            recipient,
            message: input,
            status: "pending",
            is_flash: isFlash,
            created_at: moment().tz("Asia/Manila"),
            updated_at: moment().tz("Asia/Manila")
        };

        // ✅ optimistic UI
        setMessages((prev) => [...prev, newMsg]);
        setInput("");

        const { data, error } = await supabase
            .from("messages")
            .insert({
                created_by: user.id,
                recipient,
                message: input,
                status: "pending", // ✅ ALWAYS pending
                is_flash: isFlash,
                created_at: moment().tz("Asia/Manila"),
                updated_at: moment().tz("Asia/Manila")
            })
            .select()
            .single();

        // ✅ replace temp message with real DB record
        if (!error && data) {
            setMessages((prev) =>
                prev.map((msg) => (msg.id === tempId ? data : msg))
            );
        }

        // ❗ if error → mark failed locally only
        if (error) {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === tempId ? { ...msg, status: "failed" } : msg
                )
            );
        }
    };

    // 🔁 RESEND LOGIC
    const resendMessage = async (msg) => {
        // update UI immediately
        setMessages((prev) =>
            prev.map((m) =>
                m.id === msg.id ? { ...m, status: "pending" } : m
            )
        );

        // update DB → worker will pick it up again
        const { error } = await supabase
            .from("messages")
            .update({ status: "pending" })
            .eq("id", msg.id);

        if (error) {
            // revert if failed
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === msg.id ? { ...m, status: "failed" } : m
                )
            );
        }
    };

    const renderItem = ({ item, index }) => {
        const isMe = item.created_by === user.id;
          const showTimeSeparator = index % 10 === 0;


          if (item.type === "separator") {
    return (
      <View style={styles.separatorContainer}>
        <Text style={styles.separatorText}>{item.label}</Text>
      </View>
    );
  }

        return (
            <>
            {/* ⏰ TIME SEPARATOR */}
      {/* {showTimeSeparator && (
        <View style={styles.separatorContainer}>
          <Text style={styles.separatorText}>
            {formatMessageTime(item.created_at)}
          </Text>
        </View>
      )} */}
            <View
                style={[
                    styles.messageRow,
                    isMe ? styles.alignRight : styles.alignLeft,
                ]}
            >
                {/* <View style={{ borderWidth: 1, flexDirection: 'row', justifyContent: 'flex-start'}}> */}
                {/* 💬 Bubble */}
                <View
                    style={[
                        styles.bubble,
                        isMe ? styles.myBubble : styles.theirBubble,
                    ]}
                >
                    <Text style={isMe ? styles.myText : styles.theirText}>
                        {item.message}
                    </Text>

                    <View
                        style={{
                            // borderWidth: 5
                        }}
                    >
                        {/* 📌 STATUS */}
                        {isMe && (
                            <View style={styles.statusContainer}>
                                {item.status === "pending" ? (
                                    <Text style={styles.statusText}>Sending...</Text>
                                ) :

                                    item.status === 'sent' &&

                                        (
                                            <Text style={styles.statusText}>{formatMessageTime(item.created_at)}</Text>

                                        )
                                        
                                }

                                {(item.status === "failed" ||
                                    item.status === "not_sent") && (
                                        <TouchableOpacity
                                            onPress={() => resendMessage(item)}
                                        >
                                            <Text style={styles.resend}>🔁 Resend</Text>
                                        </TouchableOpacity>
                                    )}


                            </View>
                        )}
                    </View>

                </View>


            </View>
            </>
        );
    };

        useLayoutEffect(() => {
        navigation.setOptions({
            headerLeft: () => (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          
            <TouchableOpacity
            onPress={() => (navigation.navigate('Messages'))}
            style={{ marginLeft: 10, width: 30, alignItems: 'center', justifyContent: 'center' }}
          >
            <Image
              source={icons.backHeader}
              style={{
                height: 25,
                width: '100%',
                tintColor: route ? COLORS.white : COLORS.black,
              }}
            />
          </TouchableOpacity>
          <View style={{ paddingHorizontal: 10, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
                  <Text style={{ color: route ? COLORS.white : COLORS.black, fontSize: 20, fontWeight: '500' }}>
                    Conversation
                  </Text>
          
                  <TouchableOpacity
                    onLongPress={() => {
                      if (user?.is_admin) {
                        Alert.alert('Admin', `View user: ${JSON.stringify(recipient)}`);
                      } else {
                        console.log('Not admin');
                      }
                    }}
                    onPress={() => console.log(recipient)}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: route ? COLORS.white : COLORS.primary }}>
                      {recipient}
                    </Text>
          
                    {/* {(recipient && user?.mobile != recipient) && (
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: COLORS.primary }}>
                        {' / ' + String(recipient).split('@')[0].toUpperCase()}
                      </Text>
                    )} */}
                  </TouchableOpacity>
                </View>
          </View>
            ),
        });
    }, [navigation]);


    
    

    const chatData = buildChatWithSeparators(messages);

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >

            {/* Messages */}
            <FlatList
                ref={flatListRef}
                // data={messages}
                data={chatData}
  keyExtractor={(item) => item.id}
                refreshing={refreshing}      // ✅ pull-to-refresh state
                onRefresh={onRefresh}        // ✅ trigger refresh
                renderItem={renderItem}
                contentContainerStyle={styles.messagesContainer}
                onContentSizeChange={() =>
                    flatListRef.current?.scrollToEnd({ animated: true })
                }
                ListEmptyComponent={() => (
                    <Text style={styles.empty}>
                        No messages yet. Start the conversation 👋
                    </Text>
                )}
            />


            {/* Input */}
<View style={styles.inputWrapper}>
  {/* ⚡ ICON BUTTON (LEFT INSIDE INPUT) */}
  <TouchableOpacity
    onPress={() => handleMessageType(isFlash)}
    style={{...styles.flashIconButton,  }}
  >
    <Text style={{...styles.flashIcon, opacity: isFlash ? 1 : .3}}>⚡</Text>
  </TouchableOpacity>

  {/* TEXT INPUT */}
  <TextInput
    style={styles.input}
    value={input}
    onChangeText={setInput}
    placeholder="Type a message"
  />

  {/* SEND BUTTON */}
  <TouchableOpacity onPress={sendMessage}>
    <Text style={styles.send}>Send</Text>
  </TouchableOpacity>
</View>

        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.gray300,
    },
    messagesContainer: {
        padding: 10,
    },
    messageRow: {
        marginVertical: 4,
        flexDirection: "row",
    },
    alignRight: {
        justifyContent: "flex-end",
    },
    alignLeft: {
        justifyContent: "flex-start",
    },
    separatorContainer: {
  alignItems: "center",
  marginVertical: 10,
  elevation: 1,

},

separatorText: {
  fontSize: 12,
  color: "#5e5e5e",
  backgroundColor: "#ddd",
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 10,
  overflow: "hidden",
},
    bubble: {
        // maxWidth: "75%",
        // borderWidth: 1,
        elevation: 1,
        padding: 10,
        borderRadius: 12,
        flexDirection: 'column'
    },
    myBubble: {
        backgroundColor: "#007AFF",
        borderTopRightRadius: 0,

    },
    theirBubble: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 0,
    },
    myText: {
        color: "#fff",
    },
    theirText: {
        color: "#000",
    },

    // ✅ STATUS
    statusContainer: {
        marginTop: 2,
        alignItems: "flex-end",
    },
    statusText: {
        fontSize: 11,
        color: "#ffffff",
        fontWeight: '600'
    },
    resend: {
        fontSize: 12,
        color: "#ff3b30",
        fontWeight: "600",
    },
inputWrapper: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#fff",
//   paddingHorizontal: 8,
  paddingVertical: 6,
},

flashIconButton: {
  width: 30,
  height: 30,
  borderRadius: 18,
  justifyContent: "center",
  alignItems: "center",
//   marginRight: 6,
},

flashIcon: {
  fontSize: 18,
},

input: {
  flex: 1,
  backgroundColor: "#f0f0f0",
  borderRadius: 20,
  paddingHorizontal: 12,
  paddingVertical: 8,
},

send: {
    paddingHorizontal: 10,
//   marginLeft: 10,
  color: "#007AFF",
  fontWeight: "600",
},
modalOverlay: {
  flex: 1,
//   backgroundColor: "rgba(0,0,0,0.3)",
  position: 'absolute',
  bottom: 50,
  left: 14,
//   justifyContent: "flex-end",
},

modalBox: {
  backgroundColor: "#fff",
  padding: 4,
  borderRadius: 12,
  elevation: 1,

},

modalTitle: {
  fontSize: 16,
  fontWeight: "600",
  marginBottom: 12,
},

switchRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
//   paddingVertical: 10,
},

closeBtn: {
  marginTop: 10,
  alignSelf: "flex-end",
},
});