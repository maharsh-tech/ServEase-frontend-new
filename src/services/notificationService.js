import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Notification Service — Expo Go SDK 53+ Safe
 *
 * The `expo-notifications` native module crashes on import in Expo Go (SDK 53+)
 * because Android push‑notification support was removed from the managed client.
 * We therefore NEVER import expo-notifications at the top level.
 * Instead we lazy‑load it only when running in a custom dev‑build or standalone app.
 */

const isExpoGo = Constants.appOwnership === 'expo';

// Cache the lazily loaded modules
let Notifications = null;
let Device = null;

/**
 * Lazy-load expo-notifications and expo-device ONLY outside Expo Go.
 * Returns true if the modules were loaded successfully.
 */
async function loadNotificationModules() {
    if (isExpoGo) return false;
    if (Notifications && Device) return true;

    try {
        Notifications = require('expo-notifications');
        Device = require('expo-device');

        // Set the foreground notification handler once
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
            }),
        });
        return true;
    } catch (e) {
        console.warn('Failed to load expo-notifications:', e.message);
        return false;
    }
}

/**
 * Request permissions and get Expo/FCM push token.
 * Returns null when running in Expo Go (push is not available).
 */
export async function registerForPushNotificationsAsync() {
    if (isExpoGo) {
        console.log('⚠️ Running in Expo Go — push notifications are disabled (SDK 53+).');
        console.log('⚠️ Socket.io will still deliver real-time updates! Use a dev build for push testing.');
        return null;
    }

    const loaded = await loadNotificationModules();
    if (!loaded) return null;

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
            return null;
        }

        try {
            const { registerDeviceToken } = require('./apiService');
            token = (await Notifications.getExpoPushTokenAsync({
                projectId: Constants.expoConfig?.extra?.eas?.projectId,
            })).data;
            console.log('📱 Expo Push Token:', token);

            // Send token to backend
            await registerDeviceToken(token, Platform.OS);
            console.log('✅ Push Token registered with backend');
        } catch (e) {
            console.warn('Failed to get or send push token:', e.message);
        }
    } else {
        console.log('Must use physical device for Push Notifications');
    }

    return token;
}

/**
 * Set up foreground + tap notification listeners.
 * Returns a cleanup function (or a no-op if running in Expo Go).
 */
export function setupNotificationListeners(navigation) {
    if (isExpoGo || !Notifications) {
        // Return a no-op cleanup so callers don't need to null-check
        return () => {};
    }

    // When a notification is received while app is running in foreground
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
        console.log('🔔 Foreground Notification:', notification);
    });

    // When the user taps the notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('👆 User tapped notification:', response.notification.request.content);
        const data = response.notification.request.content.data;

        // Navigate to MaidDashboard if a new booking arrives
        if (data?.type === 'NEW_BOOKING' && navigation) {
            navigation.navigate('MaidHome');
        }
    });

    return () => {
        Notifications.removeNotificationSubscription(notificationListener);
        Notifications.removeNotificationSubscription(responseListener);
    };
}
