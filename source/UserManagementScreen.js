// src/screens/UserManagementScreen.js
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Button, 
  FlatList, 
  Alert, 
  StyleSheet, 
  ActivityIndicator 
} from 'react-native';
import { useData } from './context/DataContext';
import { useSync } from './context/SyncContext';
import moment from 'moment-timezone';


const UserManagementScreen = () => {
  const { data: users, loading, error, create, update, delete: deleteUser, refresh, isReady: dataReady } = useData('users');
  const { manualSync, status, isReady: syncReady, 
    cleanup, forceCleanup, forceFullSync
  } = useSync();
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    mobile: '',
    role: 'user',
  });
  const [editingUser, setEditingUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [usersData, setUsersData] = useState([])


  useEffect(() => {
    setUsersData(users)
  }, [users, status.isSyncing])
  
  
  console.log(status, loading, dataReady, 'statuses', syncReady)

  // Show loading while initializing
  if (!dataReady || !syncReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Initializing App...</Text>
      </View>
    );
  }




  const handleSubmit = async () => {
    if (!formData.first_name || !formData.last_name || !formData.email) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    setActionLoading(true);
    try {
      if (editingUser) {
        await update(editingUser.id, formData);
        Alert.alert('Success', 'User updated');
      } else {
        await create({
          ...formData,
          password: 'default123',
          is_admin: formData.role === 'admin',
        });
        Alert.alert('Success', 'User created');
      }
      resetForm();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
    });
  };

  const handleDelete = (user) => {
    Alert.alert(
      'Delete User',
      `Delete ${user.first_name} ${user.last_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await deleteUser(user.id);
              Alert.alert('Success', 'User deleted');
            } catch (err) {
              Alert.alert('Error', err.message);
            } finally {
              setActionLoading(false);
            }
          }
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      mobile: '',
      role: 'user',
    });
    setEditingUser(null);
  };

  const handleSync = async () => {
    setActionLoading(true);
    try {
      await manualSync();
      Alert.alert('Success', 'Sync completed');
    } catch (err) {
      Alert.alert('Error', 'Sync failed');
    } finally {
      setActionLoading(false);
    }
  };
  
   const handleForceSync = async () => {
    setActionLoading(true);
    try {
      await forceFullSync();
      Alert.alert('Success', 'Sync completed');
    } catch (err) {
      Alert.alert('Error', 'Sync failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCleanUp = async () => {
    setActionLoading(true);
    try {
      await forceCleanup();
      Alert.alert('Success', 'Cleanup completed');
    } catch (err) {
      Alert.alert('Error', 'Cleanup failed');
    } finally {
      setActionLoading(false);
    }
  };
  
  
  // console.log(users, 'USEESS')


  return (
    <View style={styles.container}>
      <Text style={styles.title}>User Management</Text>
      
      {/* Sync Status */}
      <View style={styles.syncSection}>
        <Button 
          title={status.isSyncing ? "Syncing..." : "Sync"} 
          onPress={handleSync}
          disabled={actionLoading || status.isSyncing}
        />
         <Button 
          title={status.isSyncing ? "Syncing..." : "Force Sync"} 
          onPress={handleForceSync}
          disabled={actionLoading || status.isSyncing}
        />
          <Button 
          title={status.isSyncing ? "Cleaning..." : "Clean"} 
          onPress={handleCleanUp}
          disabled={actionLoading || status.isSyncing}
        />
        <View>
          <Text style={styles.syncText}>
            Last: {status.lastSync ? status.lastSync.toLocaleTimeString() : 'Never'}
          </Text>
          <Text style={styles.syncText}>
            Pending: {status.pending} | Failed: {status.failed}
          </Text>
        </View>
      </View>

      {/* User Form */}
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="First Name *"
          value={formData.first_name}
          onChangeText={(text) => setFormData(prev => ({ ...prev, first_name: text }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Last Name *"
          value={formData.last_name}
          onChangeText={(text) => setFormData(prev => ({ ...prev, last_name: text }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Email *"
          value={formData.email}
          onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
          keyboardType="email-address"
        />
        
        <View style={styles.buttonRow}>
          <Button 
            title={editingUser ? "Update" : "Create"} 
            onPress={handleSubmit} 
            disabled={actionLoading || !formData.first_name || !formData.last_name || !formData.email}
          />
          {editingUser && (
            <Button title="Cancel" onPress={resetForm} color="gray" />
          )}
        </View>
      </View>

      {/* Users List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" />
          <Text>Loading users...</Text>
        </View>
      ) : (
        <FlatList
          data={usersData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.userItem}>
              <View style={styles.userInfo}>
                <Text style={styles.name}>
                  {item.first_name} {item.last_name}
                </Text>
                <Text>{item.email}</Text>
                <Text style={styles.role}>Role: {item.role}</Text>
                <Text style={item._status === 'pending' ? styles.pending : styles.synced}>
                  {item._status} - {moment(item.updated_at).format('YYYY-MM-DD hh:mm')}
                </Text>
              </View>
              <View style={styles.actions}>
                <Button title="Edit" onPress={() => handleEdit(item)} />
                <Button title="Delete" onPress={() => handleDelete(item)} color="red" />
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text>No users found</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  syncSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  syncText: {
    fontSize: 12,
    color: '#666',
  },
  form: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    marginBottom: 12,
    borderRadius: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  userItem: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  userInfo: {
    flex: 1,
  },
  name: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  role: {
    color: '#666',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  pending: {
    color: 'orange',
    fontSize: 12,
  },
  synced: {
    color: 'green',
    fontSize: 12,
  },
});

export default UserManagementScreen;