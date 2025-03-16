import { StyleSheet, Text, TextInput, View } from 'react-native'
import React from 'react'
import { COLORS, SIZES } from '../constants';

const LargeInput = ({ label, value, onChangeText, placeholder, keyboardType, secureTextEntry, inputLength, editable }) => {

  console.log(value, "TJE VAL")
  
  
    return (
      <View style={{...styles.container, borderColor: !value ? COLORS.gray300 : value && !editable ? COLORS.gray500 : COLORS.primaryTransparent3, backgroundColor: !value ? COLORS.white : value && !editable ? COLORS.gray500 : COLORS.primaryTransparent3, flexDirection: 'column', padding: 4, alignItems: 'flex-start', justifyContent: 'space-between', width: inputLength, elevation: 4, shadowRadius: SIZES.radius / 2, shadowColor: COLORS.gray600}}>

<View style={{ position: 'absolute', paddingHorizontal: 8, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'flex-start'}}>
          {label && <Text style={styles.label}>{label}</Text>}
          <Text style={{ color: COLORS.red}}>
            *
          </Text>
        </View>
        <TextInput
          style={{...styles.input, width: '100%', height: 40, alignItems: 'center', justifyContent: 'center'}}
          editable={editable}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={keyboardType || 'default'}
          secureTextEntry={secureTextEntry}
        />
        </View>
    );
  };
  
  const styles = StyleSheet.create({
    container: {
      // width: '50%',
      height: 40,
      borderWidth: 1,
      // borderColor: '#ccc',
      borderRadius: 5,
    },
    label: {
      fontSize: 12,
      color: COLORS.black600,
      fontWeight: '500',
      // padding: 4,
    //   marginBottom: 4,
    },
    input: {
        // height: 30,
        fontWeight: 'bold',
        color: COLORS.secondary,
        // padding: 10,
      fontSize: 16,
    },
  })
export default LargeInput