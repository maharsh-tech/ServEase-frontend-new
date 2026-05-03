import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
    return (
        <View style={styles.container}>
            <Ionicons name="settings-outline" size={64} color="#d1d5db" />
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>App preferences and configurations will appear here</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 40,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1f2937',
        marginTop: 16,
    },
    subtitle: {
        fontSize: 14,
        color: '#9ca3af',
        textAlign: 'center',
        marginTop: 8,
    },
});
