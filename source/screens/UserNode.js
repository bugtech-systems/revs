import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../constants';



const UserNode = ({ user, level = 0 }) => {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = user.children.length > 0;

  return (
    <View style={{ marginLeft: level * 18, marginTop: 10 }}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => hasChildren && setExpanded(prev => !prev)}
      >
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.name}>
              {user.first_name} {user.last_name}
            </Text>

            {hasChildren && (
              <Text style={styles.toggle}>
                {expanded ? '▲' : '▼'}
              </Text>
            )}
          </View>

          <Text style={styles.sub}>📍 {user.address || 'No address'}</Text>
          <Text style={styles.sub}>💰 Commission: {user.com_rate}%</Text>
        </View>
      </TouchableOpacity>

      {/* CHILDREN */}
      {expanded &&
        user.children.map(child => (
          <UserNode key={child.id} user={child} level={level + 1} />
        ))}
    </View>
  );
};

export default UserNode;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  sub: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
  },
  toggle: {
    fontSize: 14,
    color: COLORS.secondary,
  },
});