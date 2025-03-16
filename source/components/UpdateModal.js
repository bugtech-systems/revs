import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { COLORS } from '../constants/theme';


const UpdateModal = ({ visible, onClose, updateUrl }) => {
  const handleUpdate = () => {
    Linking.openURL(updateUrl);
    onClose(); // Close the modal after redirecting
  };

  const handleClose = () => {
    onClose(); // Close the modal after redirecting
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>New Version Available</Text>
          <Text style={styles.message}>A new updated version of the app is available. Would you like to install it now?</Text>
          <View style={{ width: '100%', alignItems: 'center', flexDirection: 'row', justifyContent: 'space-around'}}>
            <TouchableOpacity style={{...styles.button, borderWidth: 1, borderColor: COLORS.secondary, backgroundColor: COLORS.secondary, elevation: 2, shadowRadius: 6}} onPress={handleUpdate}>
              <Text style={{...styles.linkText, color: COLORS.white, fontWeight: '500'}}>Install Now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{...styles.button, borderWidth: 1, borderColor: COLORS.white, backgroundColor: COLORS.white, elevation: 2, shadowRadius: 6 }} onPress={handleClose}>
              <Text style={{...styles.buttonText, color: COLORS.secondary, fontWeight: '500'}}>Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    color: COLORS.black,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: COLORS.darkgray
  },
  // button: {
  //   backgroundColor: '#1a90ff',
  //   paddingVertical: 10,
  //   paddingHorizontal: 20,
  //   borderRadius: 5,
  //   marginBottom: 10,
  // },
  button: {
    backgroundColor: COLORS.lightGray,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
    color: COLORS.black,
    width: '40%'
  },
  buttonText: {
    color: COLORS.black,
    fontSize: 16,
  },
  link: {
    marginTop: 10,
  },
  linkText: {
    color: '#1a90ff',
    fontSize: 16,
  },
});

export default UpdateModal;
