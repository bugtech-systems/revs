import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { COLORS } from '../constants/theme';


const ConfirmationModal = ({ visible, title, message, onClose, handleConfirm }) => {
  const handleConfirmLogout = () => {
    // console.log('Confirm!')
    handleConfirm();
  }
  
  const handleClose = () => {
    onClose(); // Close the modal after redirecting
  };


  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={() => onClose()}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={{ flexDirection: 'row', width: '90%', justifyContent: 'space-between', alignItems: 'center'}}>
            <TouchableOpacity style={{...styles.button, backgroundColor: '#226cbf', width: '40%', alignItems: 'center', justifyContent: 'center', elevation: 4}} 
            onPress={handleClose}>
                <Text style={{...styles.buttonText, color: COLORS.white, fontWeight: '500'}}>{'Cancel'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{...styles.button, width: '40%', alignItems: 'center', justifyContent: 'center', elevation: 4}} onPress={handleConfirmLogout}>
                <Text style={{...styles.linkText, color: '#226cbf', fontWeight: '500'}}>{'Yes'}</Text>
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
    color: COLORS.darkGray2,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  message: {
    color: COLORS.darkgray,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#1a90ff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginBottom: 10,
  },
  button: {
    backgroundColor: COLORS.lightGray,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginBottom: 10,
    color: COLORS.black
  },
  buttonText: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: '500'
  },
  link: {
    marginTop: 10,
  },
  linkText: {
    color: '#1a90ff',
    fontSize: 16,
  },
});

export default ConfirmationModal;