import React from 'react';
import { Image, Modal, View, Text, TouchableOpacity, StyleSheet, Linking, ScrollView } from 'react-native';
import { COLORS, icons } from '../constants';



const WarningModal = ({ visible, title, message, onClose, handleConfirm }) => {
  const handleConfirmAction = () => {
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
          <Text style={{...styles.title, fontSize: 22}}>{title}</Text>
          <ScrollView>
            <View style={{ borderLeftWidth: 4, width: '100%', borderLeftColor: COLORS.warningBorderColor, flexDirection: 'row',  borderTopRightRadius: 6, 
              borderBottomRightRadius: 6, paddingVertical: 10, backgroundColor: COLORS.warningTransparent, justifyContent: 'center'}}>
              <View style={{ width: '100%', alignItems: 'center', flexDirection: 'column',  }}>
                <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 6}}>
                <Image 
                source={icons.warning}
                style={{ height: 20, width: 20, tintColor: COLORS.warningBackgroundColor}}
              />
                  <Text style={{...styles.message, paddingHorizontal: 6, marginBottom: 0, color: COLORS.warningBackgroundColor, textAlign: 'left', fontSize: 20, fontWeight: 'bold'}}>
                    Information.
                  </Text>
                </View>


              <View style={{ width: '80%'}}>
                <Text style={{...styles.message, marginBottom: 0, color: COLORS.warningBackgroundColor, textAlign: 'left', fontSize: 18,}}>{message}</Text>
              </View>
              </View>

          </View>

          </ScrollView>
          <View style={{ flexDirection: 'row', width: '90%', top: 10, marginVertical: 6, justifyContent: 'center', alignItems: 'center'}}>
            {/* <TouchableOpacity
              onPressIn={() => onClose()}
               style={{...styles.button, marginBottom: 0, backgroundColor: COLORS.white, marginHorizontal: 8, width: '50%', alignItems: 'center', justifyContent: 'center', elevation: 4}} onPress={handleConfirmAction}>
                  <Text style={{...styles.linkText, fontSize: 20, color: COLORS.secondary, fontWeight: 'bold'}}>{'Cancel'}</Text>
            </TouchableOpacity> */}
            <TouchableOpacity 
              onPressIn={() => handleConfirmAction()}
            style={{...styles.button, marginBottom: 0, backgroundColor: COLORS.secondary, width: '50%', marginHorizontal: 8, alignItems: 'center', justifyContent: 'center', elevation: 4}} onPress={handleConfirmAction}>
                <Text style={{...styles.linkText, fontSize: 18, color: COLORS.white, fontWeight: 'bold'}}>{'Confirm'}</Text>
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
    // maxHeight: 250,
    alignItems: 'center',
  },
  title: {
    color: COLORS.darkgray,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  message: {
    color: COLORS.secondary,
    fontWeight: '400',
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

export default WarningModal;