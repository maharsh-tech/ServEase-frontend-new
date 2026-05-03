import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AuthScreen from '../screens/AuthScreen';
import MaidSetupScreen from '../screens/MaidSetupScreen';
import BottomTabNavigator from './BottomTabNavigator';
import MaidTabNavigator from './MaidTabNavigator';
import MaidDetailScreen from '../screens/MaidDetailScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName="Auth" screenOptions={{ headerShown: false }}>
                {/* Auth */}
                <Stack.Screen name="Auth" component={AuthScreen} />

                {/* Maid-specific onboarding */}
                <Stack.Screen name="MaidSetup" component={MaidSetupScreen} />

                {/* User (Customer) dashboard */}
                <Stack.Screen name="MainTabs" component={BottomTabNavigator} />

                {/* Maid dashboard */}
                <Stack.Screen name="MaidHome" component={MaidTabNavigator} />

                {/* Shared screens */}
                <Stack.Screen name="MaidDetail" component={MaidDetailScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
