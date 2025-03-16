import React, { useState, useEffect} from 'react';
import { StyleSheet, View, PermissionsAndroid, Platform, TouchableOpacity, Image } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import { realmContext } from '../RealmContext';
import { Users } from '../Models';
import { COLORS, icons, SIZES } from '../constants';


const { useRealm, useQuery } = realmContext;


const colors = [
  '#003580', // secondary
  '#136A4A', // warningBorderColor
  '#026DD6', // warningBackgroundColor
  '#ff17177c', // warningTextColor
  "#0284FE", // warning
  '#a04d1d', // orange
  '#DC4C64', // danger
  '#FF1717', // red
  '#14A44D', // success
  '#F5F5F8', // lightGray2
  '#DDDDDD', // lightGray1
];



const MapWithMarkers = ({ navigation, route }) => {
  const {collector} = route.params;
  const [region, setRegion] = useState(null);
  const [mapType, setMapType] = useState('standard');


	const users = useQuery(Users, users => { 
	if(collector){
    return users.filtered('isDeleted == false && email == $0 && coordinates != ""', collector)
	} else {
    return users.filtered('isDeleted == false && coordinates != ""')
	}
	
	}, [collector]);
	
	
  const coordinates = [];

  users.forEach(user => {
    let splitCoord = String(user.coordinates).split('|');
        
    if(splitCoord != "null"){
      coordinates.push({ title: String(user?.firstName).toUpperCase(), latitude: splitCoord[0] ? Number(splitCoord[0]) : 0, longitude: splitCoord[1] ? Number(splitCoord[1]) : 0 })
    }
  })

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
          <TouchableOpacity
            onPress={() => setMapType('satellite')}
            style={{
              // width: 40,
              // height: 40,
              borderRadius: SIZES.padding,
              alignItems: 'center',
              elevation: 2,
              shadowRadius: 6,
              justifyContent: 'center',
              // borderWidth: 1,
              borderColor: COLORS.white,
              // backgroundColor: COLORS.white
            }}
          >
            <Image
              source={icons.mapSatellite}
              resizeMode='contain'
              style={{
                width: 38,
                borderRadius: 6,
                height: 38,
                borderWidth: 1,
                borderColor: COLORS.secondary
                // tintColor: COLORS.gray
              }}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMapType('terrain')}
            style={{
              // width: 40,
              // height: 40,
              borderRadius: SIZES.padding,
              alignItems: 'center',
              justifyContent: 'center',
              // borderWidth: 1,
              // elevation: 2,
              // borderRadius: 6,
              // shadowRadius: 6,
              // borderColor: COLORS.black,
              // backgroundColor: COLORS.white,
              marginTop: SIZES.radius
            }}
          >
            <Image
              source={icons.mapTerrain}
              resizeMode='contain'
              style={{
                width: 40,
                height: 40,
                borderWidth: 1,
                borderColor: COLORS.secondary,
                backgroundColor: COLORS.white,
                // tintColor: COLORS.white,
                borderRadius: 6,
                resizeMode: 'contain'
              }}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMapType('standard')}
            style={{
              // width: 40,
              // height: 40,
              borderRadius: SIZES.padding,
              alignItems: 'center',
              justifyContent: 'center',
              // borderWidth: 1,
              // elevation: 2,
              // borderRadius: 6,
              // shadowRadius: 6,
              // borderColor: COLORS.black,
              // backgroundColor: COLORS.white,
              marginTop: SIZES.radius
            }}
          >
            <Image
              source={icons.mapStandard}
              resizeMode='contain'
              style={{
                width: 40,
                height: 40,
                borderWidth: 1,
                borderColor: COLORS.secondary,
                backgroundColor: COLORS.white,
                // tintColor: COLORS.white,
                borderRadius: 6,
                resizeMode: 'contain'
              }}
            />
          </TouchableOpacity>
        </View>

      </>
    )
  }


const getRandomPinColor = () => colors[Math.floor(Math.random() * colors.length)];


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
    error => {
      console.log(error);
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
  );
};



  useEffect(() => {


if(users[0] && users[0].coordinates){



  let splitCoord = String(users[0].coordinates).split('|');

  
  setRegion({
    latitude: Number(splitCoord[0]),
    longitude: Number(splitCoord[1]),
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

} else if(!collector) {
  getLocation();
}

// return () => {
//     setRegion(null)
// }

  }, [collector, users]);

  if (!region) {
    return null; // or a loading spinner
  }

  return (
    <View style={styles.container}>
      <MapView
        mapType={mapType}
        style={styles.map}
        region={region}

        // onRegionChangeComplete={region => setRegion(region)}
      >
        {coordinates.map((coordinate, index) => (
          <Marker
            key={index}
            pinColor={getRandomPinColor()}
            coordinate={{
              latitude: coordinate.latitude,
              longitude: coordinate.longitude,
            }}
            title={coordinate.title}
            description={`Lat: ${coordinate.latitude}, Lng: ${coordinate.longitude}`}
          />
        ))}
      </MapView>
      {renderHeaderButtons()}
    </View>
  );
}
  
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

export default MapWithMarkers;
