import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import MaidDashboardScreen from '../screens/MaidDashboardScreen';
import BookingsScreen from '../screens/BookingsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
    Dashboard: { focused: 'grid', unfocused: 'grid-outline' },
    Bookings: { focused: 'calendar', unfocused: 'calendar-outline' },
    Profile: { focused: 'person', unfocused: 'person-outline' },
};

export default function MaidTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => {
                    const icons = TAB_ICONS[route.name];
                    const iconName = focused ? icons.focused : icons.unfocused;
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#7c3aed',
                tabBarInactiveTintColor: '#9ca3af',
                tabBarStyle: styles.tabBar,
                tabBarLabelStyle: styles.tabLabel,
                tabBarItemStyle: styles.tabItem,
            })}
        >
            <Tab.Screen name="Dashboard" component={MaidDashboardScreen} />
            <Tab.Screen name="Bookings" component={BookingsScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
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
