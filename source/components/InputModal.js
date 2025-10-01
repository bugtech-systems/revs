import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Pressable,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import moment from 'moment-timezone';

const MOCK_USERS = [
  { _id: 'u1', name: 'John Doe' },
  { _id: 'u2', name: 'Jane Smith' },
  { _id: 'u3', name: 'Alice Johnson' },
];

const InputModal = ({ currentUser }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [inputType, setInputType] = useState('Expense');
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    owner: '',
    user: currentUser._id,
    updatedBy: null,
    createdAt: moment().toISOString(),
    updatedAt: moment().toISOString(),
    isDeleted: false,
    inputType: 'expense',
  });

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const handleSearch = (text) => {
    setSearch(text);
    const results = MOCK_USERS.filter((u) =>
      u.name.toLowerCase().includes(text.toLowerCase())
    );
    setSearchResults(results);
  };

  const handleSelectUser = (user, type) => {
    setFormData((prev) => ({
      ...prev,
      owner: user._id,
    }));
    setSearch(user.name);
    setSearchResults([]);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      updatedAt: moment().toISOString(),
    }));
  };

  const handleTypeChange = (type) => {
    const defaultType = type.toLowerCase();
    setInputType(type);
    setFormData({
      amount: '',
      description: '',
      owner: '',
      user: currentUser._id,
      updatedBy: null,
      createdAt: moment().toISOString(),
      updatedAt: moment().toISOString(),
      isDeleted: false,
      inputType: defaultType,
    });
    setSearch('');
    setSearchResults([]);
  };

  const handleSubmit = () => {
    console.log('Submitted Data:', formData);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* Icon Button to Open Modal */}
      <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.iconButton}>
        <Icon name="add-circle-outline" size={40} color="black" />
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>

            {/* Type Selector */}
            <Text style={styles.label}>Select Type:</Text>
            <View style={styles.dropdown}>
              {['Expense', 'Payment', 'Lend'].map((type) => (
                <TouchableOpacity key={type} onPress={() => handleTypeChange(type)}>
                  <Text style={[
                    styles.dropdownItem,
                    inputType === type && styles.selectedDropdownItem,
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Dynamic Fields */}
            {inputType === 'Expense' && (
              <>
                <Text style={styles.label}>Amount:</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={formData.amount}
                  onChangeText={(val) => handleInputChange('amount', val)}
                />
                <Text style={styles.label}>Description:</Text>
                <TextInput
                  style={[styles.input, { height: 80 }]}
                  multiline
                  numberOfLines={4}
                  value={formData.description}
                  onChangeText={(val) => handleInputChange('description', val)}
                />
              </>
            )}

            {inputType === 'Payment' && (
              <>
                <Text style={styles.label}>To:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Search user"
                  value={search}
                  onChangeText={(text) => handleSearch(text)}
                />
                {searchResults.length > 0 && (
                  <FlatList
                    data={searchResults}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item }) => (
                      <Pressable onPress={() => handleSelectUser(item, 'To')}>
                        <Text style={styles.searchItem}>{item.name}</Text>
                      </Pressable>
                    )}
                  />
                )}
                <Text style={styles.label}>Amount:</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={formData.amount}
                  onChangeText={(val) => handleInputChange('amount', val)}
                />
              </>
            )}

            {inputType === 'Lend' && (
              <>
                <Text style={styles.label}>From:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Search user"
                  value={search}
                  onChangeText={(text) => handleSearch(text)}
                />
                {searchResults.length > 0 && (
                  <FlatList
                    data={searchResults}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item }) => (
                      <Pressable onPress={() => handleSelectUser(item, 'From')}>
                        <Text style={styles.searchItem}>{item.name}</Text>
                      </Pressable>
                    )}
                  />
                )}
                <Text style={styles.label}>Amount:</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={formData.amount}
                  onChangeText={(val) => handleInputChange('amount', val)}
                />
              </>
            )}

            {/* Submit Button */}
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default InputModal;

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  iconButton: {
    backgroundColor: 'white',
    borderRadius: 50,
    padding: 10,
    elevation: 5,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#00000099',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    elevation: 5,
    flexDirection: 'column',
  },
  dropdown: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 10,
  },
  dropdownItem: {
    padding: 8,
    backgroundColor: '#ddd',
    borderRadius: 6,
    marginRight: 8,
  },
  selectedDropdownItem: {
    backgroundColor: '#2196F3',
    color: 'white',
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#999',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  searchItem: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderColor: '#ccc',
  },
  submitButton: {
    marginTop: 16,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
});
