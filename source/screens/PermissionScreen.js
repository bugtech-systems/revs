import React, { useState, useEffect, useRef } from 'react';
import { View, Text, PermissionsAndroid, Image, Animated, Linking, useWindowDimensions } from 'react-native';

import { constants, icons, FONTS, SIZES, COLORS } from '../constants';
// import { TextButton } from '../components';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkNotifications, requestNotifications, openSettings } from 'react-native-permissions';
import TextButton from '../components/TextButton';
import { formatNumberWithComma } from '../utils/helpers';

const permission_process = [
  {
    id: 1,
    name: 'Please enable notifications',
    description: 'This is required for getting notifications.',
    image: icons.notification
  },
  {
    id: 2,
    name: 'Please allow access to geolocation',
    description: 'It will make the address search more precise.',
    image: icons.location
  }
];

const PermissionScreen = ({ navigation }) => {
  // const scrollX = new Animated.Value(0)
  // const scrollX = new Animated.Value(0);
  const scrollX = useRef(new Animated.Value(0)).current
  const flatListRef = useRef();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [requestStatus, setRequestStatus] = useState(null);

  const onViewChangeRef = useRef(({ viewableItems, changed }) => {
    console.log('WAWAWA', viewableItems[0])
    setCurrentIndex(viewableItems[0].index);
  });

  const handleBack = () => {
    if (currentIndex === 0) {
      setCurrentIndex(currentIndex + 1)
      flatListRef?.current?.scrollToIndex({
        index: currentIndex + 1,
        Animated: true,
      });
    } else {
      navigation.goBack()
    }
  };

  const handleContinue = async () => {
    const onBoarded = await AsyncStorage.getItem('onBoarded');

    if (currentIndex === 0) {
      console.log('Requesting notification permission...');

      try {
        const { status, settings } = await requestNotifications(['alert', 'sound']);
        console.log(status, settings, 'Notification Permission Status');

        if (status === 'blocked') {
          console.warn('Notification permission is blocked. Opening settings...');
          await openSettings();
          return;
        }

        if (status === 'granted') {
          setCurrentIndex(currentIndex + 1);
          flatListRef?.current?.scrollToIndex({
            index: currentIndex + 1,
            animated: true,
          });
        } else {
          console.warn('Notification permission not granted.');
        }
      } catch (error) {
        console.error('Notification permission request failed:', error);
      }
    }

    if (currentIndex === 1 && Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Geolocation Permission',
            message: 'Can we access your location?',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        console.log(granted, 'Location Permission Result');

        if (granted === 'denied') {
          // console.warn('Location permission set to never ask again. Opening settings...');
          Linking.openSettings(); // Navigates to the app's system settings
        } else {
          navigation.goBack();
          // console.warn('Location permission denied.');
        }
      } catch (error) {
        console.error('Location permission request failed:', error);
      }
    }
  };

  async function checkPermissions() {
    let notification = false;
    let location = false;
    let { status } = await checkNotifications();
    const locationGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)
    const onBoarded = await AsyncStorage.getItem('onBoarded');

    if (currentIndex === 0 && requestStatus === null && status === 'granted') {
      setCurrentIndex(1)
      /*  flatListRef?.current?.scrollToIndex({
        index:  1,
        Animated: true,
      }); */
    }

    if (currentIndex === 1 && requestStatus === null && locationGranted) {
      // navigation.goBack()
    }
  };

  useEffect(() => {
    checkPermissions()
  }, [])

  function Dots() {
    const dotPosition = Animated.divide(scrollX, SIZES.width);

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {permission_process.map((item, index) => {
          const dotColor = dotPosition.interpolate({

            inputRange: [index - 1, index, index + 1],
            // inputRange: [
            //   windowWidth * (index - 1), 
            //   windowWidth * index, 
            //   windowWidth * (index + 1)],
            outputRange: [
              COLORS.transparentBlue,
              COLORS.primary,
              COLORS.primary
            ],
            extraPolate: 'clamp',
          });


          return (
            <Animated.View
              key={item.id}
              style={{
                // borderRadius: 5,
                // marginHorizontal: 6,
                // width: width,
                // height: 10,
                // backgroundColor: dotColor,
                height: 5,
                width: 30,
                borderRadius: 4,
                borderColor: COLORS.primary,
                borderWidth: .4,
                backgroundColor: dotColor,
                marginHorizontal: 4,
              }}
            >
            </Animated.View>
          );
        })}
      </View>
    );
  };

  function renderFooter() {
    return (
      <View
        style={{
          // flex: 1,
        }}>
        <Dots />
        {/* Button */}
        <View
          style={{
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: "center",
            paddingHorizontal: SIZES.padding,
            margin: SIZES.padding * 2,
            borderColor: COLORS.lightGray3
          }}>
          <TextButton
            label="Skip"
            labelStyle={{
              ...FONTS.body2,
              color: COLORS.primaryDisabled,
              fontWeight: '600',
            }}
            buttonContainerStyle={{
              backgroundColor: null,
              margin: SIZES.padding
            }}
            onPress={() => handleBack()}
          />
          <TextButton
            label={requestStatus === 'blocked' ? "OPEN SETTINGS" : requestStatus === "denied" ? "REQUEST AGAIN" : "CONTINUE"}
            labelStyle={{
              ...FONTS.body2,
              color: COLORS.white,
              fontWeight: 'bold'
            }}
            buttonContainerStyle={{
              height: 50,
              width: 200,
              borderRadius: SIZES.radius,
              backgroundColor: COLORS.secondary,
              margin: SIZES.padding
            }}
            onPress={() => handleContinue()}
          />
        </View>

      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        flexGrow: 1,
        // padding: SIZES.padding,
        alignItems: 'center',
        // paddingBottom: SIZES.padding * 2,
        justifyContent: 'center',
        backgroundColor: COLORS.white,
      }}
    >

      {/* {renderHeaderLogo()} */}
      <Animated.FlatList
        ref={flatListRef}
        horizontal
        scrollEnabled={false}
        // pagingEnabled
        data={permission_process}
        scrollEventThrottle={1}
        snapToAlignment='center'
        showsHorizontalScrollIndicator={false}
        // onScroll={Animated.event(
        //   [{nativeEvent: {contentOffset: {x: scrollX}}}],
        //   {useNativeDriver: false},
        // )}
        onScroll={Animated.event([
          {
            nativeEvent: {
              contentOffset: {
                x: scrollX,
              },
            },
          },
        ],
          { useNativeDriver: false })}
        onViewableItemsChanged={onViewChangeRef.current}
        keyExtractor={(item, index) => `${index}`}
        renderItem={({ item, index }) => {
          return (
            <View
              style={{
                // flex: 1,
                width: SIZES.width,
                justifyContent: 'flex-end',
                alignItems: 'center',
                paddingBottom: SIZES.padding * 2
                // height: '100%',
                // flex: 1
              }}>
              {/* Header */}
              <Image
                source={item.image}
                style={{
                  // flex: 1,
                  width: 125,
                  height: 125,
                  tintColor: COLORS.primary
                  // opacity: .9,
                }}
              />

              {/* Details */}
              <View
                style={{ paddingVertical: SIZES.padding * 3, paddingHorizontal: SIZES.padding * 3 }}
              >
                <Text style={{
                  ...FONTS.body2,
                  textAlign: 'center',
                  color: COLORS.black
                }}>
                  {item.name}
                </Text>
                <Text style={{
                  ...FONTS.body4,
                  textAlign: 'center',
                  marginTop: SIZES.padding
                }}>
                  {item.description}
                </Text>
              </View>

            </View>
          );
        }}
      />
      {renderFooter()}
    </View>
  );
};

export default PermissionScreen;
