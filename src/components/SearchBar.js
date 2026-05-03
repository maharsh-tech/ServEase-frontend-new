import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SearchBar({ onSearch }) {
    return (
        <View style={styles.container}>
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
                style={styles.input}
                placeholder="Search for services..."
                placeholderTextColor="#9ca3af"
                onChangeText={onSearch}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 20,
        marginBottom: 20,
    },
    input: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: '#111827',
    },
});
