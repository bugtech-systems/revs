import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  PermissionsAndroid,
  Platform,
  TouchableOpacity,
  Image
} from 'react-native';

import MapView, { Marker } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';

import { COLORS, icons, SIZES } from '../constants';
import { fetchUsers } from '../utils/offlineSync';


const colors = [
  '#003580',
  '#136A4A',
  '#026DD6',
  '#ff17177c',
  '#0284FE',
  '#a04d1d',
  '#DC4C64',
  '#FF1717',
  '#14A44D',
  '#F5F5F8',
  '#DDDDDD',
];


const MapScreen = ({ navigation, route }) => {
  const { collector } = route.params || {};

  const [users, setUsers] = useState([]);        // 🔥 correctly stored
  const [region, setRegion] = useState(null);
  const [mapType, setMapType] = useState('standard');


  const fetching = async () => {
    let mapUsers = await fetchUsers({
      coordinates: { op: '!=', value: null },
    });
    console.log("Fetched map users:", mapUsers);

    let validateCoordinates = mapUsers.filter(u => 
      typeof u.coordinates === "string" && u.coordinates.includes("|")
    );
    
    setUsers(validateCoordinates || []);
  };


  useEffect(() => {
    fetching();
  }, [collector]);


  const coordinates = users
    ?.filter(u => u.coordinates && u.coordinates !== "")
    ?.map(u => {
      const [lat, lng] = String(u.coordinates).split('|');
      return {
        title: u.first_name?.toUpperCase() || "UNKNOWN",
        latitude: Number(lat),
        longitude: Number(lng)
      };
    }) || [];


  const getRandomPinColor = () =>
    colors[Math.floor(Math.random() * colors.length)];


  const getLocation = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'We need to access your location to show the map.',
          buttonPositive: 'OK',
        }
      );

      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Location permission denied');
        return;
      }
    }

    Geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;

        setRegion({
          latitude,
          longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        });
      },
      error => console.log(error),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };


  useEffect(() => {
    if (coordinates.length > 0) {
      setRegion({
        latitude: coordinates[0].latitude,
        longitude: coordinates[0].longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      });
    } else {
      getLocation();
    }
  }, [users]);


  if (!region) return null;


  function renderHeaderButtons() {
    return (
      <>
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: SIZES.padding,
            left: SIZES.padding,
            width: 40,
            height: 40,
            borderRadius: SIZES.padding / 3,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: COLORS.white,
            backgroundColor: COLORS.white,
            elevation: 4
          }}
          onPress={() => navigation.goBack()}
        >
          <Image
            source={icons.back}
            resizeMode='contain'
            style={{
              height: 20,
              width: 20,
              tintColor: COLORS.black
            }}
          />
        </TouchableOpacity>

        <View
          style={{
            position: 'absolute',
            top: SIZES.padding * 8,
            right: SIZES.padding
          }}
        >
          <TouchableOpacity onPress={() => setMapType('satellite')}>
            <Image
              source={icons.mapSatellite}
              style={{
                width: 38,
                height: 38,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: COLORS.secondary,
              }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMapType('terrain')}
            style={{ marginTop: SIZES.radius }}
          >
            <Image
              source={icons.mapTerrain}
              style={{
                width: 40,
                height: 40,
                borderWidth: 1,
                borderColor: COLORS.secondary,
                backgroundColor: COLORS.white,
                borderRadius: 6,
              }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMapType('standard')}
            style={{ marginTop: SIZES.radius }}
          >
            <Image
              source={icons.mapStandard}
              style={{
                width: 40,
                height: 40,
                borderWidth: 1,
                borderColor: COLORS.secondary,
                backgroundColor: COLORS.white,
                borderRadius: 6,
              }}
            />
          </TouchableOpacity>
        </View>
      </>
    );
  }


  return (
    <View style={styles.container}>
      <MapView
        mapType={mapType}
        style={styles.map}
        region={region}
      >
        {coordinates.map((c, i) => (
          <Marker
            key={i}
            pinColor={getRandomPinColor()}
            coordinate={{
              latitude: c.latitude,
              longitude: c.longitude,
            }}
            title={c.title}
            description={`Lat: ${c.latitude}, Lng: ${c.longitude}`}
          />
        ))}
      </MapView>

      {renderHeaderButtons()}
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    height: '100%',
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default MapScreen;
