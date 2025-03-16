import React, {useCallback, useEffect, useState} from 'react';
import { results, cloudSync, feedBack, pushNotifOn } from '../constants/icons';
import { COLORS } from '../constants/theme';
import icons from '../constants/icons';
import { View, Text, Image, Button, TouchableOpacity, FlatList, Alert, ScrollView, StyleSheet, NativeModules, Platform, PermissionsAndroid } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { realmContext } from '../RealmContext';
import { useUser } from '@realm/react';
import { Betting, Users } from '../Models';
import { SET_COLLECTOR, SET_USER } from '../redux/actions/type';
import { SET_LOADING, STOP_LOADING } from '../redux/actions/type';

import UpdateModal from '../components/UpdateModal';
import axios from 'axios';
import {commonData} from '../constants/commonData';
// import BleManager from 'react-native-ble-plx';
import BleManager from 'react-native-ble-manager';



import RawbtApi,
{
	RawBTPrintJob,
	AttributesString,
	AttributesBarcode,
	AttributesQRcode,
	AttributesImage,
	CommandBarcode,
	FONT_C,
	FONT_A,
	FONT_B,
	FONT_TRUE_TYPE,
	ALIGNMENT_LEFT,
	ALIGNMENT_CENTER,
	ALIGNMENT_RIGHT,
	HRI_ABOVE,
	HRI_BELOW,
	HRI_BOTH,
	BARCODE_UPC_A,
	BARCODE_UPC_E,
	BARCODE_EAN13,
	BARCODE_JAN13,
	BARCODE_EAN8,
	BARCODE_JAN8,
	BARCODE_CODE39,
	BARCODE_ITF,
	BARCODE_CODABAR,
	BARCODE_CODE93,
	BARCODE_CODE128,
	BARCODE_GS1_128,
	BARCODE_GS1_DATABAR_OMNIDIRECTIONAL,
	BARCODE_GS1_DATABAR_TRUNCATED,
	BARCODE_GS1_DATABAR_LIMITED,
	BARCODE_GS1_DATABAR_EXPANDED,
} from 'react-native-rawbt-api';

const { useRealm, useQuery } = realmContext;
const usersSubscriptionName = 'users';


const showError = (error: string) => {
	Alert.alert('Print error', error, [
		{
			text: 'Cancel',
			style: 'cancel',
		},
	]);
}






 const TestPrinter2 = ({navigation}) => {
	// const [manager] = useState(new BleManager());
	const [devices, setDevices] = useState([]);
	const [connecting, setConnecting] = useState(null);
  
	const printHello = async () => {
		let job = new RawBTPrintJob();
	
		job.println("Test Print!");
		job.drawLine("_");
	
		RawbtApi.printJob(job.GSON()).catch((err) => showError(err.message));
	};
	
  

	const requestBluetoothPermissions = async () => {
		try {
		  const granted = await PermissionsAndroid.requestMultiple([
			PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
			PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
		  ]);
	  
		  if (
			granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED &&
			granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED
		  ) {
			console.log("Bluetooth permissions granted.");
		  } else {
			console.log("Bluetooth permissions denied.");
		  }
		} catch (error) {
		  console.log("Permission request error:", error);
		}
	  };

		const scanAndConnectPrinter = async () => {

			requestBluetoothPermissions();
			
			try {
			  await BleManager.start();
			  await BleManager.scan([], 5, true);
		  
			  setTimeout(async () => {
				const devices = await BleManager.getDiscoveredPeripherals();

				setDevices(devices);


				console.log(devices, "THE DEVICES")
				// const printer = devices.find(d => d.name.includes("Printer")); // Change "Printer" to match your printer name
		  
				// if (printer) {
				//   await BleManager.connect(printer.id);
				//   console.log("Connected to printer:", printer);
				// } else {
				//   console.log("Printer not found.");
				// }
			  }, 5000);
			} catch (error) {
			  console.error("Error connecting to printer:", error);
			}
		  };
		
		
	// const scanForDevices = () => {
	//   setDevices([]);
	//   manager.startDeviceScan(null, null, (error, device) => {
	// 	if (error) {
	// 	  console.error(error);
	// 	  return;
	// 	}
  
	// 	if (device && device.name) {
	// 	  setDevices((prevDevices) => {
	// 		if (!prevDevices.find((d) => d.id === device.id)) {
	// 		  return [...prevDevices, device];
	// 		}
	// 		return prevDevices;
	// 	  });
	// 	}
	//   });
  
	//   // Stop scanning after 10 seconds
	//   setTimeout(() => {
	// 	manager.stopDeviceScan();
	//   }, 10000);
	// };
  
	const connectToDevice = async (device) => {


		console.log(device.name, "THE DEVICE")

		// const printer = devices.find(d => d.name.includes(device.name)); // Change "Printer" to match your printer name
			  setConnecting(device.id);

		  
				if (device) {
				  await BleManager.connect(device.id);
				  console.log("Connected to printer:", device.name);
				} else {
				  console.log("Printer not found.");
				}

						setConnecting(null);

		
			}
		
	//   setConnecting(device.id);
	//   try {
	// 	await device.connect();
	// 	Alert.alert('Connected', `Successfully connected to ${device.name}`);
	//   } catch (error) {
	// 	console.error('Connection failed', error);
	// 	Alert.alert('Error', 'Failed to connect to device');
	//   } finally {
	// 	setConnecting(null);
	//   }
	// };
  
	const renderItem = ({ item }) => (
	  <TouchableOpacity
		style={styles.deviceItem}
		onPress={() => connectToDevice(item)}
		disabled={connecting === item.id}
	  >
		<Text style={styles.deviceName}>{item.name || 'Unknown Device'}</Text>
		{connecting === item.id && <Text>Connecting...</Text>}
	  </TouchableOpacity>
	);

	// 	useEffect(() => {
	//   const handleStateChange = (state) => {
	// 	if (state === 'PoweredOn') {
	// 	  scanForDevices();
	// 	}
	//   };
  
	//   manager.onStateChange(handleStateChange, true);
  
	//   return () => {
	// 	manager.destroy();
	//   };
	// }, [manager]);
  
	
	
	
	useEffect(() => {
		RawbtApi.init();
		// printPDF()
		requestBluetoothPermissions()
	}, [])
	
	
	return (
		<View style={{ flex: 1, padding: 10 }}>
		<TouchableOpacity style={{ paddingVertical: 10 }} onPress={printHello}>
	<View style={{
		backgroundColor: COLORS.primary,
		padding: 10,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center'
		// borderRadius: rowList === 0 ? 10 : rowList === lists.length - 1 ? 10 : 0,
		// borderTopRightRadius: rowList === 0 ? 10 : 0,
		// borderTopLeftRadius: rowList === 0 ? 10 : 0,
		// borderBottomRightRadius: rowList === lists.length - 1 ? 10 : 0,
		// borderBottomLeftRadius: rowList === lists.length - 1 ? 10 : 0,
	}}>
		<Text style={{ fontSize: 18, color: COLORS.white }}>
			Test Printer
		</Text>
	</View>
	</TouchableOpacity>	
	<TouchableOpacity style={{ paddingVertical: 10 }} onPress={scanAndConnectPrinter}>
	<View style={{
		backgroundColor: COLORS.primary,
		padding: 10,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center'
		// borderRadius: rowList === 0 ? 10 : rowList === lists.length - 1 ? 10 : 0,
		// borderTopRightRadius: rowList === 0 ? 10 : 0,
		// borderTopLeftRadius: rowList === 0 ? 10 : 0,
		// borderBottomRightRadius: rowList === lists.length - 1 ? 10 : 0,
		// borderBottomLeftRadius: rowList === lists.length - 1 ? 10 : 0,
	}}>
		<Text style={{ fontSize: 18, color: COLORS.white }}>
			Scan Printer
		</Text>
	</View>
	</TouchableOpacity>	
	<FlatList
	data={devices}
	renderItem={renderItem}
	keyExtractor={(item) => item.id}
	ListEmptyComponent={<Text>No devices found</Text>}
  />
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
	  flex: 1,
	  padding: 16,
	},
	deviceItem: {
	  padding: 16,
	  borderBottomWidth: 1,
	  borderBottomColor: '#ccc',
	},
	deviceName: {
	  fontSize: 16,
	},
  });


export default TestPrinter2