import React, { useEffect, useState } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Dimensions, Text } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';
import { file_server_token, file_server_url, file_download_url, file_upload_url } from '../../commonData.json';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { realmContext } from '../RealmContext';
import { useSelector } from 'react-redux';
import { Users, Draws } from '../Models';
import moment from 'moment-timezone';
import { COLORS, icons, SIZES } from '../constants';
import RNFS from 'react-native-fs';
import * as Progress from 'react-native-progress';
import Config from 'react-native-config';





const { width, height } = Dimensions.get('window');

const { useRealm, useQuery } = realmContext;


const TipScreen = ({ navigation, route }) => {
  const realm = useRealm()
  const { resultDate } = route.params;
  const { collector, user } = useSelector(({ user }) => user);
  const [selectedImage, setSelectedImage] = useState(null)
  const [progress, setProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);


  let users = useQuery(Users, doc => {
    return doc.filtered(
      'email == $0',
      collector
    );
  }, [collector])


  const draws = useQuery(Draws, digit => {
    const startOfDay = moment(resultDate).startOf('day').toDate();
    const endOfDay = moment(resultDate).endOf('day').toDate();

    if (resultDate) {
      return digit.filtered(
        'drawDate >= $0 && drawDate < $1 && gameTime = $2',
        startOfDay, endOfDay, '9pm'
      ).sorted('drawDate');
    } else {
      return digit.filtered(
        'gameTime = $0',
        '9pm'
      ).sorted('drawDate', true);
    }
  }, [resultDate]);


  const handleDownloadTipImg = () => {
    const url = selectedImage?.uri ? selectedImage?.uri : null;
    const filePath = RNFS.DownloadDirectoryPath + '/tip.png';


    if (!url) {
      console.log('No image to download')
      return;
    }

    setDownloading(true);
    setProgress(0);

    RNFS.downloadFile({
      fromUrl: url,
      toFile: filePath,
      background: true, // Enable downloading in the background (iOS only)
      discretionary: true, // Allow the OS to control the timing and speed (iOS only)
      progress: (res) => {
        // Handle download progress updates if needed
        const progressPercent = res.bytesWritten / res.contentLength;
        setProgress(progressPercent);
      },
    })
      .promise.then((response) => {
        console.log('File downloaded!', response);
        setDownloading(false);
      })
      .catch((err) => {
        console.log('Download error:', err);
        setDownloading(false);
      });
  };


  const handleImageUpload = async () => {
    try {
      const imagePick = await pickImage();
      const image = imagePick.assets[0];
      const formData = new FormData();
      const fileExtension = String(image.fileName).split('.')

      const dateName = moment(resultDate ? resultDate : draws[0].drawDate).tz('Asia/Manila').format('MM_DD_YYYY')


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


      console.log(response.data, 'UPLOAD RESPONSE')

      setSelectedImage({ uri: `${Config.FILE_UPLOAD_URL}/apiv2/assets/${response.data.filename}` });
      await realm.write(async () => {
        draws[0].tipUrl = `${Config.FILE_UPLOAD_URL}/apiv2/assets/${response.data.filename}`;
      })
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


  // const pickImage = () => {
  //   const options = {
  //     mediaType: "photo",
  //     quality: 1,
  //   };

  //   launchImageLibrary(options, (response) => {
  //     if (response.didCancel) {
  //       console.log("User cancelled image picker");
  //     } else if (response.errorMessage) {
  //       console.log("ImagePicker Error: ", response.errorMessage);
  //     } else {
  //       const source = { uri: response.assets[0].uri };
  //       setSelectedImage(source);
  //     }
  //   });
  // };



  useEffect(() => {

    if (draws[0] && draws[0].tipUrl) {
      setSelectedImage({ uri: draws[0].tipUrl });
    }


  }, [draws])


  useEffect(() => {


    return () => {
      setSelectedImage(null)
    }
  }, [resultDate])



  console.log(progress, "PROG")
  
  

  let displayName = String(collector).split('@')[0];

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
      {
        downloading &&
        <View style={{ zIndex: 2, alignItems: 'center', top: 20, width: '90%', position: 'absolute', flexDirection: 'column', padding: 10, borderWidth: .5, backgroundColor: COLORS.primaryTransparent2, borderRadius: SIZES.radius / 2 }}>
          <View style={{ alignItems: 'flex-start', justifyContent: 'flex-start', width: 300}}>
            <Text style={styles.progressText}>{"Downloading.." + (progress * 100).toFixed(2)}%</Text>
          </View>
          <Progress.Bar progress={progress} width={300} />
        </View>
      }
      {selectedImage && (
        <Image source={{ uri: selectedImage?.uri }}
          style={{ ...styles.image, resizeMode: 'contain', zIndex: 0 }}

        />
      )}

      <View style={{...styles.uploadButtons, flexDirection: 'row', width: '100%', alignItems: 'center', justifyContent: 'space-around'}}>
      {(displayName == 'lea-boyaks' || user?.isAdmin) &&
        <TouchableOpacity 
          style={{ backgroundColor: COLORS.primary, elevation: 2, shadowRadius: 6, paddingVertical: 10, width: '33%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: SIZES.radius  / 2 }}
          onPress={() => handleImageUpload()}
        >
          <Image 
            source={icons.imageUpload}
            style={{ height: 25, width: 25, borderWidth: 1, tintColor: COLORS.white, resizeMode: 'contain'}}
          />
          <Text style={{...styles.buttonText, paddingLeft: 4}}>Upload</Text>
        </TouchableOpacity>
      }
      
      {
        selectedImage?.uri && 
          <TouchableOpacity 
            style={{ backgroundColor: COLORS.primary, paddingVertical: 10,  elevation: 2, shadowRadius: 6, width: '33%',  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: SIZES.radius  / 2 }}
            onPress={() => handleDownloadTipImg()}
          >
            <Image 
              source={icons.imageDownload}
              style={{ height: 25, width: 25, tintColor: COLORS.white, resizeMode: 'contain'}}
            />
            <Text style={{...styles.buttonText, paddingLeft: 4}}>
              Download
            </Text>
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
    marginTop: 5,
    fontSize: 16,
  },
});

export default TipScreen;
