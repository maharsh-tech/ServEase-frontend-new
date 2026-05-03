import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Header({ locationName, onProfilePress }) {
    return (
        <View style={styles.container}>
            <View style={styles.locationRow}>
                <Ionicons name="location-sharp" size={20} color="#3b82f6" />
                <View style={styles.locationText}>
                    <Text style={styles.locationLabel}>Your Location</Text>
                    <Text style={styles.locationName} numberOfLines={1}>
                        {locationName || 'Detecting...'}
                    </Text>
                </View>
            </View>
            <TouchableOpacity style={styles.profileBtn} onPress={onProfilePress}>
                <Ionicons name="person-circle-outline" size={32} color="#1f2937" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    locationText: {
        marginLeft: 8,
        flex: 1,
    },
    locationLabel: {
        fontSize: 12,
        color: '#9ca3af',
        fontWeight: '500',
    },
    locationName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    profileBtn: {
        padding: 4,
    },
});
