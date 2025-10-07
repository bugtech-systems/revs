import React, { useEffect, useState } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	FlatList,
	Alert,
	StyleSheet,
	Platform,
	PermissionsAndroid,
} from 'react-native';
import BleManager from 'react-native-ble-manager';
import { NativeEventEmitter, NativeModules } from 'react-native';
import { COLORS } from '../constants/theme';
import RawbtApi, { RawBTPrintJob } from 'react-native-rawbt-api';

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

const showError = (error) => {
	Alert.alert('Bluetooth Error', error, [{ text: 'OK', style: 'cancel' }]);
};

const TestPrinter2 = () => {
	const [devices, setDevices] = useState([]);
	const [connectedDeviceId, setConnectedDeviceId] = useState(null);
	const [scanning, setScanning] = useState(false);
	const [connecting, setConnecting] = useState(null);

	// ------------------ PERMISSIONS ------------------
	async function requestBluetoothPermissions() {
		if (Platform.OS === 'android') {
			const permissions = [];
			if (Platform.Version >= 23 && Platform.Version <= 30) {
				permissions.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
			} else if (Platform.Version >= 31) {
				permissions.push(
					PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
					PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
				);
			}

			if (permissions.length === 0) return true;
			const granted = await PermissionsAndroid.requestMultiple(permissions);
			return Object.values(granted).every(
				result => result === PermissionsAndroid.RESULTS.GRANTED
			);
		}
		return true;
	}

	// ------------------ SCAN FOR DEVICES ------------------
	const scanForDevices = async () => {
		const hasPermission = await requestBluetoothPermissions();
		if (!hasPermission) {
			Alert.alert('Permission required', 'Bluetooth permissions not granted.');
			return;
		}

		try {
			setScanning(true);
			setDevices([]);
			await BleManager.start({ showAlert: false });
			await BleManager.scan([], 5, true);
			console.log('Scanning started...');

			setTimeout(async () => {
				const discovered = await BleManager.getDiscoveredPeripherals();
				console.log('Discovered devices:', discovered);
				setDevices(discovered);
				setScanning(false);
			}, 5000);
		} catch (error) {
			console.error('Scan error:', error);
			setScanning(false);
		}
	};

	// --------- CANCEL SCAN FOR AVAILABLE DEVICES -------------
	// ADD this new function beside scanForDevices
	const cancelScanForDevices = async () => {
		try {
			await BleManager.stopScan();
			console.log('Scan cancelled by user.');
			setScanning(false);
			Alert.alert('Scan Stopped', 'Bluetooth scanning has been cancelled.');
		} catch (error) {
			console.error('Cancel scan error:', error);
			Alert.alert('Error', 'Failed to stop scan.');
		}
	};
	

	// ------------------ CONNECT TO DEVICE ------------------
	const connectToDevice = async (device: any) => {
		try {
			setConnecting(device.id);
			await BleManager.connect(device.id);
			console.log('Connected to:', device.name || device.id);
			setConnectedDeviceId(device.id);
			Alert.alert('Connected', `Connected to ${device.name || device.id}`);
		} catch (error) {
			console.error('Connection error:', error);
			showError(error.message);
		} finally {
			setConnecting(null);
		}
	};

	// ------------------ DISCONNECT FROM DEVICE ------------------
	const disconnectFromDevice = async (device: any) => {
		try {
			await BleManager.disconnect(device.id);
			console.log('Disconnected from:', device.name || device.id);
			if (connectedDeviceId === device.id) setConnectedDeviceId(null);
			Alert.alert('Disconnected', `Disconnected from ${device.name || device.id}`);
		} catch (error) {
			console.error('Disconnection error:', error);
			showError(error.message);
		}
	};

	// ------------------ PRINT SAMPLE ------------------
	const printHello = async () => {
		try {
			let job = new RawBTPrintJob();
			job.println('Test Print!');
			job.drawLine('_');
			await RawbtApi.printJob(job.GSON());
		} catch (err) {
			showError(err.message);
		}
	};

	// ------------------ EVENT LISTENERS ------------------
	useEffect(() => {
		BleManager.start({ showAlert: false });
		RawbtApi.init();

		const handleDisconnect = peripheral => {
			console.log('Device disconnected:', peripheral.peripheral);
			if (connectedDeviceId === peripheral.peripheral) {
				setConnectedDeviceId(null);
			}
		};

		const disconnectListener = bleManagerEmitter.addListener(
			'BleManagerDisconnectPeripheral',
			handleDisconnect
		);

		return () => {
			disconnectListener.remove();
		};
	}, []);

	// ------------------ RENDER EACH DEVICE ------------------
	const renderItem = ({ item }) => {
		const isConnected = connectedDeviceId === item.id;

		return (
			<View style={styles.deviceItem}>
				<Text style={styles.deviceName}>{item.name || 'Unnamed Device'}</Text>
				<Text style={styles.deviceId}>{item.id}</Text>

				<View style={styles.buttonRow}>
					{!isConnected ? (
						<TouchableOpacity
							style={[styles.btn, styles.connectBtn]}
							onPress={() => connectToDevice(item)}
							disabled={connecting === item.id}
						>
							<Text style={styles.btnText}>
								{connecting === item.id ? 'Connecting...' : 'Connect'}
							</Text>
						</TouchableOpacity>
					) : (
						<TouchableOpacity
							style={[styles.btn, styles.disconnectBtn]}
							onPress={() => disconnectFromDevice(item)}
						>
							<Text style={styles.btnText}>Disconnect</Text>
						</TouchableOpacity>
					)}
				</View>
			</View>
		);
	};

	return (
		<View style={styles.container}>
			{/* PRINT BUTTON */}
			<TouchableOpacity style={styles.actionButton} onPress={printHello}>
				<Text style={styles.actionText}>Test Print</Text>
			</TouchableOpacity>

			{/* SCAN BUTTON */}
			<TouchableOpacity
				style={[styles.actionButton, scanning && styles.disabled]}
				onPress={scanForDevices}
				disabled={scanning}
			>
				<Text style={styles.actionText}>
					{scanning ? 'Scanning...' : 'Scan for Devices'}
				</Text>
			</TouchableOpacity>

			{/* DEVICE LIST */}
			<FlatList
				data={devices}
				keyExtractor={item => item.id}
				renderItem={renderItem}
				contentContainerStyle={{
					flex: 1,
				}}
				ListEmptyComponent={
					<View style={{flex: 1, width: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between' }}>
						<View>
							<Text style={styles.emptyText}>
								{scanning ? 'Scanning for devices...' : 'No devices found.'}
							</Text>
						</View>
{
	scanning &&
	<TouchableOpacity
							onPress={cancelScanForDevices}
						>
							<Text>
								STOP
							</Text>
						</TouchableOpacity>
}
						
					</View>
				}
			/>
		</View>
	);
};

export default TestPrinter2;

// ------------------ STYLES ------------------
const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 12,
		backgroundColor: '#fff',
	},
	actionButton: {
		backgroundColor: COLORS.primary,
		padding: 12,
		borderRadius: 10,
		marginBottom: 12,
	},
	actionText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: 'bold',
		textAlign: 'center',
	},
	disabled: {
		backgroundColor: '#888',
	},
	deviceItem: {
		backgroundColor: '#f7f7f7',
		padding: 12,
		borderRadius: 10,
		marginVertical: 6,
	},
	deviceName: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#333',
	},
	deviceId: {
		fontSize: 12,
		color: '#777',
		marginBottom: 8,
	},
	buttonRow: {
		flexDirection: 'row',
		justifyContent: 'flex-start',
		gap: 10,
	},
	btn: {
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 8,
	},
	connectBtn: {
		backgroundColor: '#007bff',
	},
	disconnectBtn: {
		backgroundColor: '#ff3b30',
	},
	btnText: {
		color: '#fff',
		fontWeight: 'bold',
	},
	emptyText: {
		textAlign: 'center',
		color: '#555',
		marginTop: 20,
	},
});