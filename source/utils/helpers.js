import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment-timezone';
import RNFS from 'react-native-fs';
import { Alert, Dimensions, Platform, PermissionsAndroid } from 'react-native';
import { useEffect, useState } from 'react';
import 'react-native-get-random-values'; // polyfill for crypto.getRandomValues
import { ObjectId } from 'bson';
// import Geolocation from 'react-native-geolocation-service';
import Geolocation from '@react-native-community/geolocation';
import { updateUser } from '../redux/actions/user.actions';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';


// import { Combinations } from '../Models';

export const permuteDigits = (number) => {
  // Convert the number to a string to manipulate individual digits
  const strNum = number.toString();
  const digits = strNum.split(''); // Split the number into its individual digits
  const result = [];

  // Helper function to generate permutations
  function permute(arr, permutation = []) {
    if (arr.length === 0) {
      // Join the permutation array into a string, convert to an integer, then back to a string
      // This step removes any leading zeros from the number
      const permutedNumber = String(parseInt(permutation.join('')));
      // Ensure the result is at least 3 digits long by padding with zeros
      result.push(permutedNumber.padStart(3, '0'));
      return;
    }

    for (let i = 0; i < arr.length; i++) {
      // Remove the current element and continue permuting the rest
      const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
      permute(remaining, [...permutation, arr[i]]);
    }
  }

  // Start the permutation with the initial list of digits
  permute(digits);

  return result;
}

export function generateObjectId() {
  return new ObjectId().toHexString(); // e.g. "68630373feccf026d6aebea5"
}

export const generateRandomCombination = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;

  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
}

export const getConfiguration = (user, type) => {
  // Convert the number to a string to manipulate individual digits
  let configs = user?.configuration ? user.configuration : [];

  let current = {}


  configs?.map((a, index) => {
    if (a.title == type) {
      current = a;
      current.index = index;
    }
  });



  return current;
}

export const updateDateTimeIfGreater = async () => {
  try {
    // Check if the current timezone is set to Asia/Manila
    const currentTimezone = moment.tz.guess();

    // Get the current date and time in number format, considering Asia/Manila timezone
    const currentDateTime = moment.tz('Asia/Manila').format('YYYYMMDDHHmmss');

    // Get the existing value from AsyncStorage
    const existingValue = await AsyncStorage.getItem('dateTimeNumber');

    if (currentDateTime > existingValue) {
      // Update AsyncStorage if no value exists or current datetime is greater
      await AsyncStorage.setItem('dateTimeNumber', currentDateTime);
      console.log('DateTime updated to:', currentDateTime);
      return true; // Successfully updated
    } else if (existingValue === null) {

      if (currentTimezone !== 'Asia/Manila') {
        console.log('Timezone is not set to Asia/Manila.', currentTimezone);
        return false; // Return false if the timezone is not Asia/Manila
      }

    } else {
      console.log('Current dateTime is not greater than the existing one.');
      return false; // No update needed
    }
  } catch (error) {
    console.log('Error updating dateTime:', error);
    return false; // In case of an error
  }
};

export const formatNumber = (value) => {
  let num = Number(value).toFixed(0);
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export const fixDateTimezone = (date) => {
  return new Date(date.getTime() + (8 * 60 * 60 * 1000))
}

// Function to get external storage directory
export const getExternalStoragePath = () => {
  if (Platform.OS === 'android') {
    return `${RNFS.ExternalStorageDirectoryPath}/MyAppFiles`;
  } else {
    return `${RNFS.DocumentDirectoryPath}/MyAppFiles`;
  }
};

export const readFileFromExternalStorage = async () => {
  const filePath = `${getExternalStoragePath()}/testFile.txt`;

  try {
    const fileContents = await RNFS.readFile(filePath, 'utf8');
    console.log("File Content:", fileContents);
  } catch (error) {
    console.error("Error reading file:", error);
  }
};

export function getDayRange(date, end) {
  const d = new Date(date);
  const e = new Date(end || date)

  // Start of the day (00:00:00.000)
  const start_of_day = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    0, 0, 0, 0
  ).toISOString();

  // End of the day (23:59:59.999)
  const end_of_day = new Date(
    e.getFullYear(),
    e.getMonth(),
    e.getDate(),
    23, 59, 59, 999
  ).toISOString();

  return { start_of_day, end_of_day };
}

export function getTransactionDayRange(date, end) {
  const d = new Date(date);
  const e = new Date(end || date);

  // Start of day (LOCAL → then converted safely to ISO)
  const start_of_day = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    0, 0, 0, 0
  ).toISOString();

  // End of day
  const end_of_day = new Date(
    e.getFullYear(),
    e.getMonth(),
    e.getDate(),
    23, 59, 59, 999
  ).toISOString();

  return { start_of_day, end_of_day };
}

export const formatNumberWithComma = (num) => {
  // Round the number to two decimal places to handle rounding
  const roundedNum = Math.round(num * 100) / 100;

  // Function to add commas to the integer part
  const formatWithCommas = (number) => {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Check if the rounded number has a decimal part
  if (roundedNum % 1 !== 0) {
    // Extract the integer part
    const integerPart = Math.floor(roundedNum);

    // Extract the decimal part as a string
    const decimalPart = roundedNum.toString().split(".")[1];

    if (decimalPart?.length === 2) {
      // Include both first and second decimal digits
      return `${formatWithCommas(integerPart)}`;
    } else if (decimalPart?.length === 1) {
      // Include only the first decimal digit
      return `${formatWithCommas(integerPart)}`;
    }
  }

  // Return the integer part with commas if no decimals exist
  return formatWithCommas(Math.floor(roundedNum));
};

export const cutString = (str, len) => {
  return str?.length > len ? str?.slice(0, len) + "..." : str;
};

// Function to get device details
export const getDeviceDetails = async () => {

  let mac = await DeviceInfo.getMacAddress();
  let deviceId = DeviceInfo.getDeviceId();
  console.log(mac, "THE MAC")
  return { mac, deviceId };

};

export const useScreenSize = () => {
  const [screenSize, setScreenSize] = useState(Dimensions.get('window'));

  useEffect(() => {
    const onChange = ({ window }) => {
      setScreenSize(window);
    };

    const subscription = Dimensions.addEventListener('change', onChange);

    return () => {
      subscription.remove(); // Clean up on unmount
    };
  }, []);

  return screenSize;
};

/**
 * Checks if a combination's bet is allowed under its limit
 * @param {object} combination - The combination object
 * @param {number} amountTarget - Amount for straight (target) bet
 * @param {number} amountRamble - Amount for ramble bet
 * @returns {object} result - { canProceedTarget, canProceedRamble }
 */
export const checkSoldOutParts = ({
  combination,
  amountTarget = 0,
  amountRamble = 0,
  onSoldOut,
}) => {
  const straightLimit = combination?.straightLimit || 0;
  const straightTotal = combination?.straightTotal || 0;
  const rambleLimit = combination?.rambleLimit || 0;
  const rambleTotal = combination?.rambleTotal || 0;
  const digit = combination?.digit?.split('').join('-') || '???';

  const totalStraight = straightTotal + Number(amountTarget);
  const totalRamble = rambleTotal + Number(amountRamble);

  const canProceedTarget = totalStraight <= straightLimit;
  const canProceedRamble = totalRamble <= rambleLimit;

  if (!canProceedTarget || !canProceedRamble) {
    const remainingTarget = Math.max(0, straightLimit - straightTotal);
    const remainingRamble = Math.max(0, rambleLimit - rambleTotal);
    onSoldOut?.({ digit, remainingTarget, remainingRamble });
  }

  return {
    canProceedTarget,
    canProceedRamble,
  };
};

export function isDateGreater(date1, date2) {
  return new Date(date1) > new Date(date2);
}

export const checkSoldOut = ({ comb, combination, amountTarget, amountRamble }) => {
  const straightExceeded = comb.straightTotal + Number(amountTarget) > comb.straightLimit;
  const rambleExceeded = comb.rambleTotal + Number(amountRamble) > comb.rambleLimit;

  const remainingStraight = Math.max(0, comb.straightLimit - comb.straightTotal);
  const remainingRamble = Math.max(0, comb.rambleLimit - comb.rambleTotal);

  let messages = [];

  if (straightExceeded && Number(amountTarget) > 0) {
    messages.push(
      `❌ Combination ${combination.split('').join('-')} has reached the *Straight* limit.\nAvailable Straight: ₱${remainingStraight}`
    );
  }

  if (rambleExceeded && Number(amountRamble) > 0) {
    messages.push(
      `❌ Combination ${combination.split('').join('-')} has reached the *Ramble* limit.\nAvailable Ramble: ₱${remainingRamble}`
    );
  }

  if (messages.length > 0) {
    const message = messages.join('\n\n');
    setSoldOutMessage(message);
    setSoldOutModalVisible(true);
    return true; // means sold out
  }

  return false; // not sold out
};

export const getWithWin200Config = (realm, selectedDigit, user) => {
  // Check the combination in Realm
  // const comb = realm
  //   .objects(Combinations)
  //   .filtered("digit == $0", selectedDigit)[0];

  // if (comb && comb.isWinTo) {
  //   // ✅ reuse your getConfiguration helper
  //   const response = getConfiguration(user, "withWin200")
  //   return response;
  // }
  return null;
};


export const generateTimestamp = () => {
  const now = new Date();

  const year = String(now.getFullYear()).slice(-2); // YY
  const month = String(now.getMonth() + 1).padStart(2, "0"); // MM
  const day = String(now.getDate()).padStart(2, "0"); // DD
  const hours = String(now.getHours()).padStart(2, "0"); // HH
  const minutes = String(now.getMinutes()).padStart(2, "0"); // MM
  const seconds = String(now.getSeconds()).padStart(2, "0"); // SS

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

export const useDeviceCheck = () => {
  const [deviceId, setDeviceId] = useState(null);

  useEffect(() => {
    const fetchId = async () => {
      try {
        const id = await DeviceInfo.getUniqueId();
        setDeviceId(id);
      } catch (err) {
        console.log("Error getting device ID:", err);
      }
    };
    fetchId();
  }, []);

  return deviceId;
};

// ✅ Request permission (Android)
export const requestLocationPermission = async () => {
const result = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);

  if (result === RESULTS.DENIED) {
    const requestResult = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
    if (requestResult === RESULTS.GRANTED) {
      console.log('Location granted!');
      return requestResult;
    }
  } else if (result === RESULTS.GRANTED) {
    console.log('Location already granted!');
  } else if (result === RESULTS.BLOCKED) {
    console.log('Permission blocked, open settings');
  }
  return result;
};

// Function to get current location
export const getCurrentLocation = async () => {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) {
    Alert.alert('Location permission denied');
    return null;
  }

  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log('User position:', latitude, longitude);
        resolve({ latitude, longitude });
      },
      (error) => {
        console.log('Location error:', error.code, error.message);
        reject(error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  });
};

// export const downloadAndReplaceImage = async (url, filename) => {
//   try {
//     const savePath = `${RNFS.DocumentDirectoryPath}/${filename}`;

//     const exists = await RNFS.exists(savePath);
//     if (exists) {
//       console.log("File exists — deleting:", savePath);
//       await RNFS.unlink(savePath);
//     }

//     const result = await RNFS.downloadFile({
//       fromUrl: url,
//       toFile: savePath,
//     }).promise;

//     if (result.statusCode === 200) {
//       console.log("Image downloaded:", savePath);
//       return savePath;
//     } else {
//       throw new Error("Failed download: " + result.statusCode);
//     }
//   } catch (err) {
//     console.error("Error downloading image:", err);
//     return null;
//   }
// };

export const getAllowedDevicesCount = (configurations = []) => {
  const allowed = configurations.find(
    (c) => c.title === 'allowedDevices'
  );

  // Default to 1 device if not configured
  return allowed?.value ? Number(allowed.value) : 1;
};

export const normalizeDevices = (devices) => {
  if (!Array.isArray(devices)) return [];
  return devices.filter(d => d && d.is_deleted !== true);
};

export const downloadAndReplaceImage = async (
  url: string,
  filename: string
): Promise<string | null> => {
  try {
    const localPath = `${RNFS.DocumentDirectoryPath}/${filename}`;

    // Check if file already exists
    const fileExists = await RNFS.exists(localPath);

    if (fileExists) {
      console.log(`File already exists: ${localPath}`);
      return localPath;
    }

    console.log("Downloading:", url);

    const downloadResult = await RNFS.downloadFile({
      fromUrl: url,
      toFile: localPath,
      background: true,
    }).promise;

    if (downloadResult.statusCode === 200) {
      console.log("Download success:", localPath);
      return localPath;
    } else {
      console.log("Download failed:", downloadResult.statusCode);
      return null;
    }
  } catch (error) {
    console.log("Download error:", error);
    return null;
  }
};

export const checkAndRequestLocation = async () => {
  const result = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);

  if (result === RESULTS.DENIED) {
    const requestResult = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
    if (requestResult === RESULTS.GRANTED) {
      console.log('Location granted!');
    }
  } else if (result === RESULTS.GRANTED) {
    console.log('Location already granted!');
    return true;
  } else if (result === RESULTS.BLOCKED) {
    console.log('Permission blocked, open settings');
    return false;
  }
};


export const getCurrentGeolocation = async () => {
  try {
        const hasPermission = await checkAndRequestLocation();
        if (!hasPermission) {
            Alert.alert('Permission denied');
            return;
        }

        Geolocation.getCurrentPosition(
            async position => {
                const coords = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                };


                console.log(coords, "THE COORDS LAGE ADI")


                // setLocation(coords);
                return coords;
            },
            error => Alert.alert('Location Error', error.message),
            { enableHighAccuracy: true }
        );
        return true;
  }
    catch (error) {
        console.log("Error getting location:", error);
        return false;
    }
    };

