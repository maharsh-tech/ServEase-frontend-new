import React, { memo } from 'react';
import { StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import BookingsScreen from '../screens/BookingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
    Home: { focused: 'home', unfocused: 'home-outline' },
    Bookings: { focused: 'calendar', unfocused: 'calendar-outline' },
    Profile: { focused: 'person', unfocused: 'person-outline' },
    Settings: { focused: 'settings', unfocused: 'settings-outline' },
};

function TabIcon({ route, focused, color, size }) {
    const icons = TAB_ICONS[route.name];
    const iconName = focused ? icons.focused : icons.unfocused;
    return <Ionicons name={iconName} size={size} color={color} />;
}

export default function BottomTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => (
                    <TabIcon route={route} focused={focused} color={color} size={size} />
                ),
                tabBarActiveTintColor: '#3b82f6',
                tabBarInactiveTintColor: '#9ca3af',
                tabBarStyle: styles.tabBar,
                tabBarLabelStyle: styles.tabLabel,
                tabBarItemStyle: styles.tabItem,
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Bookings" component={BookingsScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        paddingBottom: Platform.OS === 'ios' ? 20 : 8,
        paddingTop: 8,
        height: Platform.OS === 'ios' ? 85 : 65,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
    },
    tabLabel: {
        fontSize: 11,
        fontWeight: '600',
    },
    tabItem: {
        paddingTop: 4,
    },
});
