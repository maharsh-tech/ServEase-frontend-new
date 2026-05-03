import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { registerDeviceToken } from './apiService';

// How notifications should behave when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

/**
 * Request permissions and get Expo/FCM push token.
 */
export async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#7c3aed',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return;
        }

        try {
            // Getting Expo Push Token (which automatically wraps FCM/APNs token)
            // Note: In a real production app without Expo Go, you might use getDevicePushTokenAsync()
            token = (await Notifications.getExpoPushTokenAsync({
                // Replace with your actual Expo project ID when deploying
                // projectId: Constants.expoConfig.extra.eas.projectId,
            })).data;
            console.log('📱 Expo Push Token:', token);

            // Send token to backend
            await registerDeviceToken(token, Platform.OS);
            console.log('✅ Push Token registered with backend');
        } catch (e) {
            console.error('Failed to get or send push token', e);
        }
    } else {
        console.log('Must use physical device for Push Notifications');
    }

    return token;
}

export function setupNotificationListeners(navigation) {
    // When a notification is received while app is running in foreground
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
        console.log('🔔 Foreground Notification:', notification);
    });

    // When the user taps the notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('👆 User tapped notification:', response.notification.request.content);
        const data = response.notification.request.content.data;
        
        // Example: navigate to MaidDashboard if a new booking arrives
        if (data?.type === 'NEW_BOOKING' && navigation) {
            navigation.navigate('MaidHome');
        }
    });

    return () => {
        Notifications.removeNotificationSubscription(notificationListener);
        Notifications.removeNotificationSubscription(responseListener);
    };
}
