import React, { useEffect, useState } from 'react';
import { View, Image, ToastAndroid, TouchableOpacity, StyleSheet, Dimensions, Text, Linking, Platform } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';
import { file_server_token, file_server_url, file_download_url, file_upload_url } from '../../commonData.json';
import { useSelector } from 'react-redux';
import { Users, Draws } from '../Models';
import moment from 'moment-timezone';
import { COLORS, icons, SIZES } from '../constants';
import Config from 'react-native-config';
import { getConfiguration, getDayRange } from '../utils/helpers';
import { api } from '../utils/offlineSync';




const { width, height } = Dimensions.get('window');



const TipScreen = ({ navigation, route }) => {
  const { resultDate, resultId } = route.params;
  const { collector, user, selectedUser } = useSelector(({ user }) => user);
  const [selectedImage, setSelectedImage] = useState(null)
  const [draws, setDraws] = useState([]);

 

  const uploadTip = getConfiguration(selectedUser, 'uploadTip').isCheck;

  // const draws = useQuery(Draws, digit => {
  //   const startOfDay = moment(resultDate).startOf('day').toDate();
  //   const endOfDay = moment(resultDate).endOf('day').toDate();

  //   if (resultDate) {
  //     return digit.filtered(
  //       'drawDate >= $0 && drawDate < $1 && gameTime = $2',
  //       startOfDay, endOfDay, '9pm'
  //     ).sorted('drawDate');
  //   } else {
  //     return digit.filtered(
  //       'gameTime = $0',
  //       '9pm'
  //     ).sorted('drawDate', true);
  //   }
  // }, [resultDate]);

  // Download image using RNFS
  // const handleDownloadTipImg = () => {

  //   showToastStarted();

  //   const url = selectedImage?.uri ? selectedImage?.uri : null;
  //   const filePath = RNFS.DownloadDirectoryPath + '/tip.png';


  //   if (!url) {
  //     console.log('No image to download')
  //     return;
  //   }

  //   setDownloading(true);
  //   setProgress(0);

  //   RNFS.downloadFile({
  //     fromUrl: url,
  //     toFile: filePath,
  //     background: true, // Enable downloading in the background (iOS only)
  //     discretionary: true, // Allow the OS to control the timing and speed (iOS only)
  //     progress: (res) => {
  //       // Handle download progress updates if needed
  //       const progressPercent = res.bytesWritten / res.contentLength;
  //       setProgress(progressPercent);
  //     },
  //   })
  //     .promise.then((response) => {
  //       console.log('File downloaded!', response);
  //       showToastDownloadComplete();
  //       setDownloading(false);
  //     })
  //     .catch((err) => {
  //       console.log('Download error:', err);
  //       setDownloading(false);
  //     });
  // };

  // DOnwload image using Link in react-native
//   const handleDownloadTipImg = async () => {
//   const url = selectedImage?.uri;

//   console.log(url, "THE URL")

//   if (!url) {
//     ToastAndroid.show("No image to open.", ToastAndroid.SHORT);
//     return;
//   }

//   try {
//     const supported = await Linking.canOpenURL(url);
//     if (supported) {
//       await Linking.openURL(url); // 👈 This will open the browser with the image link
//       ToastAndroid.show("Redirecting to browser...", ToastAndroid.SHORT);
//     } else {
//       ToastAndroid.show("Can't handle this URL.", ToastAndroid.SHORT);
//     }
//   } catch (error) {
//     console.error("Error opening URL:", error);
//     ToastAndroid.show("Error opening link.", ToastAndroid.SHORT);
//   }
// };



const handleDownloadTipImg = async () => {
  const raw = selectedImage?.uri;

  if (!raw) {
    // No image/url available
    if (Platform.OS === 'android') {
      ToastAndroid.show('No image to open.', ToastAndroid.SHORT);
    } else {
      Alert.alert('No image', 'No image URL available to open.');
    }
    return;
  }

  // sanitize / normalize url
  let url = String(raw).trim();

  // ensure scheme exists; if not assume https
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  // encode to avoid spaces or invalid characters
  url = encodeURI(url);


  try {
    // quick debug: test generic URL handler availability (optional)
    const testSupported = await Linking.canOpenURL('https://www.google.com');
    console.log('Device canOpenURL(https://www.google.com):', testSupported);

    // Check if the device reports it can open the target URL
    const supported = await Linking.canOpenURL(url);
    console.log('canOpenURL target:', supported);

    // // If InAppBrowser is available you can prefer that (optional)

    // If supported, open normally
    if (supported) {
      await Linking.openURL(url);
      if (Platform.OS === 'android') ToastAndroid.show('Opening in browser...', ToastAndroid.SHORT);
      return;
    }

    // If canOpenURL says false but we're on Android, try openURL directly (some Android devices still open OK)
    if (Platform.OS === 'android') {
      try {
        await Linking.openURL(url);
        ToastAndroid.show('Opening in browser...', ToastAndroid.SHORT);
        return;
      } catch (errOpen) {
        console.warn('Direct openURL failed:', errOpen);
      }
    }

    // As a last resort show an error to the user
    const msg = "Can't handle this URL on your device.";
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.LONG);
    } else {
      Alert.alert('Unable to open link', msg);
    }
  } catch (err) {
    console.error('Error opening URL:', err);

    // fallback message
    if (Platform.OS === 'android') {
      ToastAndroid.show('Error opening link.', ToastAndroid.LONG);
    } else {
      Alert.alert('Error', 'Unable to open the link.');
    }
  }
};

  const handleImageUpload = async () => {
    try {
      const imagePick = await pickImage();
      const image = imagePick.assets[0];
      const formData = new FormData();
      const fileExtension = String(image.fileName).split('.')

      const dateName = moment(resultDate ? resultDate : draws[0].draw_date).tz('Asia/Manila').format('MM_DD_YYYY')


      console.log(dateName)
      formData.append('file', {
        uri: image.uri,
        type: image.type,
        name: `${dateName}_tip.${fileExtension[fileExtension.length - 1]}`,
      });

      console.log('IMAGE DETAILS', image)

      const response = await axios.post(`${Config.FILE_UPLOAD_URL}/apiv2/v1/auth/apk`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
      });


      console.log(response.data, 'UPLOAD RESPONSE', resultId, draws[0])
       


      setSelectedImage({ uri: `${Config.FILE_UPLOAD_URL}/apiv2/assets/${response.data.filename}` });
      
      
      await api.updateDraw(draws[0].id, { tip_url:  `${Config.FILE_UPLOAD_URL}/apiv2/assets/${response.data.filename}`})
      
      // await realm.write(async () => {
      //   draws[0].tip_url = `${Config.FILE_UPLOAD_URL}/apiv2/assets/${response.data.filename}`;
      // })
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  const pickImage = async () => {
    return new Promise((resolve, reject) => {
      const options = {
        title: 'Select Image',
        saveToPhotos: true,
        storageOptions: {
          skipBackup: true,
          path: 'images'
        },
      };

      launchImageLibrary(options, (response) => {
        if (response.didCancel) {
          // (new Error('User cancelled image picker'));
          console.log("User cancelled image picker");
        } else if (response.errorMessage) {
          console.log('ImagePicker Error:', response.errorMessage);
          // reject(new Error('ImagePicker Error'));
        } else {
          console.log('ImagePicker Response:', response);
          resolve(response, 'RESOLVED IMAGE PICKER');
        }
      });
    });
  };



  useEffect(() => {

    if (draws[0] && draws[0].tip_url) {
      setSelectedImage({ uri: draws[0].tip_url });
    }


  }, [draws])


  useEffect(() => {
  
  
    (async () => {
      let {  start_of_day, end_of_day } = getDayRange(resultDate);
      console.log(start_of_day, end_of_day, 'range')
        let result = await api.listDraws({
          filters: {
            draw_date: { op: "between", from: start_of_day, to: end_of_day },
            game_time: "9pm"
          }
        })
        
        
        console.log(result, 'RESSULT')
        setDraws(result)
    })()
    
    return () => {
      setSelectedImage(null)
    }
  }, [resultDate])



  
  


  return (
    <View style={styles.container}>


      {/* {downloading && ( */}
      {/* <View style={{...styles.progressContainer, zIndex: 2, borderWidth: .5, borderCOlor: COLORS.transparentBlack7, backgroundColor: COLORS.transparentBlack7, borderRadius: SIZES.radius}}>
          <Progress.Pie progress={0.6} size={50} />
          <Progress.Circle progress={0.5} showsText={true} textStyle={{fontSize: 20}} size={60} color={COLORS.success700} />
          <Progress.Bar progress={0.3} width={200} />
          <Progress.Pie progress={0.4} size={50} />
          <Progress.Circle size={30} indeterminate={true} />
          <Progress.CircleSnail color={['red', 'green', 'blue']} />
          
        </View> */}
      {/* )} */}

      {/* <View style={{ borderWidth: 1,  backgroundColor: COLORS.red}}> */}
      {/* </View> */}
      {/* {
        !downloading &&
        <View style={{ zIndex: 2, alignItems: 'flex-start', top: 20, width: '90%', position: 'absolute', flexDirection: 'column', padding: 10,  borderWidth: .5, backgroundColor: COLORS.primaryTransparent2, borderRadius: SIZES.radius / 2 }}>
          <View style={{ alignItems: 'flex-start', justifyContent: 'flex-start', width: '100%'}}>
            <Text style={styles.progressText}>{"Downloading.." + (progress * 100).toFixed(2)}%</Text>
          </View>
          <Progress.Bar progress={progress} width={400} />
        </View>
      } */}
      {selectedImage && (
        <Image source={{ uri: selectedImage?.uri }}
          style={{ ...styles.image, resizeMode: 'contain', zIndex: 0 }}

        />
      )}

      <View style={{...styles.uploadButtons, flexDirection: 'row', width: '100%', alignItems: 'center', justifyContent: 'space-around'}}>
      {uploadTip  &&
        <TouchableOpacity 
          style={{ backgroundColor: COLORS.secondary, elevation: 2, shadowRadius: 6, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', borderRadius: SIZES.radius  / 2, width: '44%' }}
          onPress={() => handleImageUpload()}
        >
          <View style={{ width: '70%', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'}}>
            <Text style={{...styles.buttonText, paddingLeft: 4}}>UPLOAD</Text>
          </View>
          <View style={{
            borderWidth: 1,
            borderColor: COLORS.white,
            height: 24

          }}/>
          <View style={{ width: '30%', alignItems: 'center', justifyContent: 'center'}}>
            <Image 
              source={icons.imageUpload}
              style={{ height: 25, width: 25, borderWidth: 1, tintColor: COLORS.white, resizeMode: 'contain'}}
            />
          </View>
        </TouchableOpacity>
      }
      
      {
        selectedImage?.uri && 
          <TouchableOpacity 
            // style={{ backgroundColor: COLORS.primary, paddingVertical: 10,  elevation: 2, shadowRadius: 6, width: '33%',  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: SIZES.radius  / 2 }}
            style={{ backgroundColor: uploadTip ? COLORS.white : COLORS.primary, elevation: 2, shadowRadius: 6, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', borderRadius: SIZES.radius  / 2, width: '44%' }}
            onPress={() => handleDownloadTipImg()}
          >
          <View style={{ width: '70%', alignItems: 'center', justifyContent: 'center'}}>
            <Text style={{...styles.buttonText, paddingLeft: 4, color: uploadTip ? COLORS.secondary : COLORS.white, fontWeight: 'bold' }}>
              DOWNLOAD
            </Text>
          </View>
                    <View style={{
            borderWidth: 1,
            borderColor: uploadTip ? COLORS.secondary : COLORS.white,
            height: 24

          }}/>
          <View style={{ width: '30%', alignItems: 'center', justifyContent: 'center'}}>
            <Image 
              source={icons.imageDownload}
              style={{ height: 25, width: 25, tintColor: uploadTip ? COLORS.secondary : COLORS.white, resizeMode: 'contain'}}
            />
          </View>

          </TouchableOpacity> 
        }
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    backgroundColor: COLORS.transparentBlack7
  },
  image: {
    width: width, // Image width is the full screen width
    height: height, // Image height is the full screen height
  },
  uploadButtons: {
    position: 'absolute',
    bottom: 20, // Distance from the bottom of the screen
    alignSelf: 'center',
    // backgroundColor: '#007bff', // Button background color
    paddingVertical: 12, // Vertical padding for the button
    // paddingHorizontal: 30, // Horizontal padding for the button
    borderRadius: 25, // Rounded corners
    // elevation: 3, // Elevation for shadow on Android
  },
  buttonText: {
    color: '#fff', // Text color
    fontSize: 20, // Text size
    fontWeight: 'bold',
  },
  progressContainer: {
    zIndex: 2,
    marginTop: 20,
    justifyContent: 'center',
    // alignSelf: 'center',
    position: 'absolute',
    alignItems: 'center',
    // borderWidth: 5
  },
  progressText: {
    // marginTop: 5,
    fontSize: 16,
  },
});

export default TipScreen;
