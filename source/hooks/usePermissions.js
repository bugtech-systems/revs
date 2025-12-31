import { useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { checkNotifications, requestNotifications } from 'react-native-permissions';

export default function usePermissions() {
    const [loading, setLoading] = useState(false);

    const checkAll = async () => {
        const notification = await checkNotifications();
        const location = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );

        return {
            notifications: notification.status === "granted",
            location: location,
        };
    };

    const requestNotification = async () => {
        setLoading(true);
        const { status } = await requestNotifications(['alert', 'sound']);
        setLoading(false);

        return status === "granted";
    };

    const requestLocation = async () => {
        setLoading(true);

        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
                title: "Geolocation Permission",
                message: "We need access to your location for address search.",
                buttonPositive: "OK",
            }
        );

        setLoading(false);

        return granted === PermissionsAndroid.RESULTS.GRANTED;
    };

    return {
        loading,
        checkAll,
        requestNotification,
        requestLocation,
    };
}
