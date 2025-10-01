import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking, BackHandler } from 'react-native';
import { COLORS, SIZES } from '../constants/theme';


const UpdateModal = ({ visible, onClose, updateUrl, required }) => {
  const handleUpdate = () => {
    Linking.openURL(updateUrl);
    // onClose(); // Close the modal after redirecting
    BackHandler.exitApp(); // Exit the app so user can't return to it
  };

  const handleClose = () => {
    // onClose(); // Close the modal after redirecting
    if (required) {
      BackHandler.exitApp(); // Close the app when Later is pressed
    } else {
      onClose();
    }
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
          <Text style={{...styles.title, color: COLORS.black900}}>New Version Available</Text>
          <Text style={{...styles.message, fontWeight: '600', paddingHorizontal: 14, textAlign: 'center', paddingBottom: 12}}>You are using an outdated version of the app. To continue, please update to the latest version.</Text>
          <View style={{ width: '100%', alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between'}}>
            <TouchableOpacity style={{...styles.button, borderWidth: 1, borderColor: COLORS.secondary, backgroundColor: COLORS.secondary, elevation: 2, shadowRadius: 6}} onPress={handleUpdate}>
              <Text style={{...styles.linkText, color: COLORS.white, fontWeight: '500'}}>Install Now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{...styles.button, borderWidth: 1, borderColor: COLORS.white, backgroundColor: COLORS.white, elevation: 2, shadowRadius: 6 }} onPress={handleClose}>
              <Text style={{...styles.buttonText, color: COLORS.secondary, fontWeight: '500'}}>Later</Text>
            </TouchableOpacity>
          </View>
          <View style={{ top: SIZES.padding, alignItems: 'center' }}>
            <TouchableOpacity style={{ alignItems: 'center', justifyContent: 'center' }} onPress={() => { Linking.openURL('http://sharewin.pro/apiv2/assets/revs_app_v1.apk'); }}>
              <Text style={{ color: COLORS.black300, fontSize: 12, fontWeight: '500' }}>
                Old Version: <Text style={{ fontWeight: '600', color: COLORS.black900 }}>{'v1.0.0'}</Text>
              </Text>
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
    color: COLORS.black300
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
    width: '48%'
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
