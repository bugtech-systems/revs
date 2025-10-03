import { 
  FlatList, SafeAreaView, StyleSheet, Image, Text, 
  TextInput, TouchableOpacity, View, RefreshControl 
} from 'react-native';
import React, { useEffect, useState, useCallback } from 'react';
import moment from 'moment-timezone';
import { useSelector } from 'react-redux';
import Animated, { FadeInDown } from 'react-native-reanimated';
import SQLite from 'react-native-sqlite-storage';
import supabase from '../../utils/supabaseClient';
import { COLORS, icons, SIZES } from '../../constants';

// Open SQLite
const db = SQLite.openDatabase({ name: 'local.db', location: 'default' });

const Inbox = ({ navigation }) => {
  const { user } = useSelector(({ user }) => user);

  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // -------------------------------
  // Fetch messages from SQLite
  // -------------------------------
  const fetchMessages = useCallback(() => {
    db.transaction(tx => {
      tx.executeSql(
        `
        SELECT * FROM messages
        WHERE isDeleted = 0 
        AND (createdBy = ? OR recepient = ?)
        ORDER BY updated_at DESC
        `,
        [String(user?.id), String(user?.id)],
        (txObj, { rows }) => {
          let data = [];
          for (let i = 0; i < rows.length; i++) {
            data.push(rows.item(i));
          }
          setMessages(data);
        }
      );
    });
  }, [user]);

  // -------------------------------
  // Sync from Supabase -> SQLite
  // -------------------------------
  const syncWithSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id, createdBy, recepient, recepientName, updated_at, isDeleted,
          conversations (id, owner_id, message, created_at, isViewed)
        `)
        .or(`createdBy.eq.${user?.id}, recepient.eq.${user?.id}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      db.transaction(tx => {
        data.forEach(msg => {
          tx.executeSql(
            `INSERT OR REPLACE INTO messages 
              (id, createdBy, recepient, recepientName, updated_at, isDeleted)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              msg.id,
              msg.createdBy,
              msg.recepient,
              msg.recepientName,
              msg.updated_at,
              msg.isDeleted ? 1 : 0,
            ]
          );

          // store conversations in local table too
          msg.conversations?.forEach(conv => {
            tx.executeSql(
              `INSERT OR REPLACE INTO conversations 
                (id, message_id, owner_id, message, created_at, isViewed)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                conv.id,
                msg.id,
                conv.owner_id,
                conv.message,
                conv.created_at,
                conv.isViewed ? 1 : 0,
              ]
            );
          });
        });
      });

      fetchMessages();
    } catch (err) {
      console.error('Supabase sync error:', err.message);
    }
  };

  // -------------------------------
  // Initial load
  // -------------------------------
  useEffect(() => {
    fetchMessages();
    syncWithSupabase();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    syncWithSupabase().finally(() => setRefreshing(false));
  };

  // -------------------------------
  // Search filter
  // -------------------------------
  let filteredMessages = messages;
  if (searchQuery) {
    filteredMessages = messages.filter(m =>
      String(m.recepientName)
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );
  }

  // -------------------------------
  // Render search input
  // -------------------------------
  function renderSearchInput() {
    return (
      <TouchableOpacity style={styles.searchContainer}>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search"
          placeholderTextColor={COLORS.gray800}
          style={styles.searchInput}
        />
        <Image
          source={icons.search}
          style={styles.searchIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>
    );
  }

  // -------------------------------
  // Render each message
  // -------------------------------
  const renderItem = ({ item, index }) => {
    const backgroundColor = index % 2 === 0 ? COLORS.gray200 : COLORS.gray300;

    // fetch last conversation
    return (
      <Animated.View
        entering={FadeInDown.delay(index * 100).duration(500)}
      >
        <TouchableOpacity
          onPress={() => navigation.navigate('Messenger', { id: item.id })}
          style={[styles.messageRow, { backgroundColor }]}
        >
          <View style={{ flexDirection: 'column', width: '70%' }}>
            <Text style={styles.username}>
              {String(item.createdBy) === String(user?.id)
                ? item.recepientName?.toUpperCase()
                : String(item.createdBy).toUpperCase()}
            </Text>

            <View style={styles.lastMessageRow}>
              <Text style={styles.lastMessage}>
                {/* This will require joining with conversations in SQLite */}
                {`Last message...`} 
              </Text>
              <Text style={styles.time}>
                {moment(item.updated_at).startOf('minute').fromNow()}
              </Text>
            </View>
          </View>

          <View style={{ width: '30%', alignItems: 'flex-end' }}>
            {/* Example unread badge */}
            {item.unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.wrapper}>
      {renderSearchInput()}
      <FlatList
        data={filteredMessages}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrapper}>
            <Text style={styles.emptyText}>No records found.</Text>
          </View>
        }
        ListFooterComponent={
          filteredMessages.length > 0 && (
            <View style={styles.footer}>
              <Text style={styles.emptyText}>End of results.</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
};

export default Inbox;

const styles = StyleSheet.create({
  wrapper: { flex: 1, padding: 10, backgroundColor: COLORS.gray300 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderRadius: 6,
    borderColor: COLORS.white,
    marginVertical: 10,
    backgroundColor: COLORS.white,
    elevation: 2,
    shadowRadius: 6,
  },
  searchInput: { height: 40, paddingLeft: 10, width: '90%', color: COLORS.black },
  searchIcon: { height: 20, width: 20, padding: 10 },
  messageRow: {
    paddingVertical: 14,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  username: { color: COLORS.black, fontSize: 18, fontWeight: '500' },
  lastMessageRow: { width: '70%', flexDirection: 'row', alignItems: 'center' },
  lastMessage: { color: COLORS.darkGray2, fontSize: 12, fontWeight: 'bold' },
  time: { color: COLORS.darkGray2, fontSize: 10, paddingLeft: 8 },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: COLORS.white, fontSize: 12 },
  emptyWrapper: { padding: 8, alignItems: 'center', justifyContent: 'center' },
  emptyText: { textAlign: 'center', fontSize: 14, color: COLORS.gray600, fontWeight: '500' },
  footer: { padding: 8, alignItems: 'center', justifyContent: 'center' },
});
