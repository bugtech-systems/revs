import DeviceInfo from "react-native-device-info";
import { Alert, Platform } from "react-native";
import { fetchUserByEmail, signOut, updateUser } from "../redux/actions/user.actions";
import supabase from "./supabaseClient";
import { getAllowedDevicesCount, getConfiguration } from "./helpers";

const getCurrentDevicePayload = async () => ({
  id: await DeviceInfo.getUniqueId(),
  device_name: await DeviceInfo.getDeviceName(),
  device_os: Platform.OS,
  os_version: DeviceInfo.getSystemVersion(),
  device_model: DeviceInfo.getModel(),
  device_brand: DeviceInfo.getBrand(),
  device_ip: await DeviceInfo.getIpAddress(),
  is_deleted: false,
});

// export const verifyDeviceForUser = async (dispatch, loggedUser) => {
//   try {
//     if (!loggedUser?.email) return false;

//     // 1. Fetch latest version of user (always up-to-date)
//     const fresh = await dispatch(fetchUserByEmail(loggedUser.email));
//     if (!fresh) return false;

//     const localId = await DeviceInfo.getUniqueId();
//     const dbId = fresh.device_id;

//     console.log("LOCAL DEVICE:", localId);
//     console.log("DB DEVICE:", dbId);

//     // ======================================================
//     // 🔥 CASE 1: device_id === "revoke" (user removed)
//     // ======================================================
//     if (dbId === "revoke") {
//       return new Promise((resolve) => {
//         Alert.alert(
//           "Access Removed",
//           "Your account has been removed on this device. Please contact your administrator.",
//           [
//             {
//               text: "OK",
//               onPress: async () => {
//                 // Set their device_id back to empty string after revoke
//                 await dispatch(updateUser(fresh.id, { ...fresh, device_id: "" }));
//                 await dispatch(signOut(fresh.id));
//                 resolve(false);
//               },
//             },
//           ]
//         );
//       });
//     }

//     // ======================================================
//     // 🔥 CASE 2: device_id is NULL or EMPTY → Bind device
//     // ======================================================
//     if (!dbId || dbId === "") {
//       await dispatch(updateUser(fresh.id, { ...fresh, device_id: localId }));
//       Alert.alert("Device Registered", "Your device has been successfully linked.");
//       return true;
//     }

//     // ======================================================
//     // 🔥 CASE 3: Device mismatch → Block access
//     // ======================================================
//     if (dbId !== localId) {
//       return new Promise((resolve) => {
//         Alert.alert(
//           "Unrecognized Device",
//           "This account is registered to a different device.",
//           [
//             {
//               text: "OK",
//               onPress: async () => {
//                 await dispatch(signOut(fresh.id));
//                 resolve(false);
//               },
//             },
//           ]
//         );
//       });
//     }

//     // ======================================================
//     // 🔥 CASE 4: Device matches → Allow access
//     // ======================================================
//     return true;

//   } catch (error) {
//     console.log("Device verification failed:", error);
//     return false;
//   }
// };


const normalizeDevices = (login_devices) => {
  if (!login_devices) return [];

  // If already array → OK
  if (Array.isArray(login_devices)) return login_devices;

  // If string → parse JSON
  if (typeof login_devices === 'string') {
    try {
      const parsed = JSON.parse(login_devices);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

export const verifyDeviceForUser = async (dispatch, loggedUser) => {
  try {
    if (!loggedUser?.email) return false;

    // 1️⃣ Fetch fresh user
    const fresh = await dispatch(fetchUserByEmail(loggedUser.email));
    if (!fresh) return false;

    // 2️⃣ Get current device
    const localDevice = await getCurrentDevicePayload();

    // 3️⃣ Normalize devices (ONLY active ones)
    const allDevices = normalizeDevices(fresh.login_devices);

    const activeDevices = allDevices;

    // 4️⃣ Check if current device already exists
    const existingDevice = activeDevices.find(
      (d) => d.id === localDevice.id
    );

    if (existingDevice) {
      // ✅ CASE 1: Device already registered and active
      return true;
    }

    // 5️⃣ Get allowed devices count
    const allowedDevices = getConfiguration(loggedUser, 'allowedDevices')?.value;

    console.log(allowedDevices, "allowedDevicesallowedDevicesallowedDevicesallowedDevicesallowedDevicesallowedDevicesallowedDevices")
    

    console.log('ALLOWED DEVICES:', allowedDevices);
    console.log('ACTIVE DEVICES:', activeDevices.length);

    // ======================================================
    // 🔥 CASE 2: Allowed to add new device
    // ======================================================
    if (activeDevices.length < Number(allowedDevices)) {
      const updatedDevices = [
        ...allDevices,
        {
          ...localDevice,
          is_deleted: false,
        },
      ];

      await dispatch(
        updateUser(fresh.id, {
          ...fresh,
          login_devices: updatedDevices,
        })
      );

      Alert.alert(
        'New Device Registered',
        'This device has been added to your account.'
      );

      return true;
    }

    // ======================================================
    // 🔥 CASE 3: Device limit reached → Block access
    // ======================================================
    return new Promise((resolve) => {
      Alert.alert(
        'Device Limit Reached',
        `You are only allowed to use this account on ${Number(allowedDevices)} device(s).`,
        [
          {
            text: 'OK',
            onPress: async () => {
              await dispatch(signOut(fresh.id));
              resolve(false);
            },
          },
        ]
      );
    });

  } catch (error) {
    console.log('Device verification failed:', error);
    return false;
  }
};

export const subscribeToUserRealtime = (userId, dispatch) => {

  const channel = supabase
    .channel(`user:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "users",
        filter: `id=eq.${userId}`,
      },
      async (payload) => {
        console.log("🔔 USER REALTIME UPDATE:", payload);

        const updated = payload.new;
        const currentDeviceId = updated.device_id;

        // Case 1: user has been revoked
        if (currentDeviceId === "revoked") {
          Alert.alert(
            "Access Removed",
            "Your account has been removed on this device.",
            [
              {
                text: "OK",
                onPress: async () => {
                  await dispatch(signOut(userId));

                  // Optional: cleanup
                  channel.unsubscribe();
                },
              },
            ]
          );
        }
      }
    )
    .subscribe();

  return channel;
};