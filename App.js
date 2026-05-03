import React, { useState, useCallback, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import AppNavigator from './src/navigation/AppNavigator';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

/**
 * Ping the backend /api/ping endpoint to verify connectivity.
 * Runs once on app mount — no auth required.
 */
const checkBackendConnection = async () => {
  const pingUrl = `${API_BASE_URL}/ping`;
  console.log(`🔍 Checking backend connectivity → ${pingUrl}`);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(pingUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'bypass-tunnel-reminder': 'true',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await response.json();
    if (response.ok && data.success) {
      console.log(`✅ Backend connected — ${data.server} (${data.timestamp})`);
    } else {
      console.warn(`⚠️ Backend responded but with unexpected data:`, data);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('❌ Backend connection timed out (8s). Is the server running?');
    } else {
      console.error(`❌ Backend connection failed: ${error.message}`);
    }
    console.error(`   → Ensure backend is running at ${API_BASE_URL}`);
  }
};

export default function App() {
  const [fontsLoaded] = Font.useFonts({
    ...Ionicons.font,
  });

  // Ping backend on app mount
  useEffect(() => {
    checkBackendConnection();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <AppNavigator />
    </>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
