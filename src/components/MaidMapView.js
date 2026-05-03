import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

export default function MaidMapView({ region, maids, selectedMaidId, onMarkerPress, onRegionChange }) {
    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                region={region}
                onRegionChangeComplete={onRegionChange}
                showsUserLocation={true}
                showsMyLocationButton={true}
                showsCompass={true}
            >
                {maids.map((maid) => (
                    <Marker
                        key={maid.id}
                        coordinate={{
                            latitude: maid.latitude,
                            longitude: maid.longitude,
                        }}
                        onPress={() => onMarkerPress && onMarkerPress(maid)}
                    >
                        {/* Custom marker */}
                        <View style={[
                            styles.markerContainer,
                            selectedMaidId === maid.id && styles.selectedMarker
                        ]}>
                            <Ionicons
                                name="person"
                                size={18}
                                color={selectedMaidId === maid.id ? '#fff' : '#3b82f6'}
                            />
                        </View>

                        <Callout tooltip>
                            <View style={styles.callout}>
                                <Text style={styles.calloutName}>{maid.name}</Text>
                                <Text style={styles.calloutRate}>₹{maid.hourlyRate}/hr</Text>
                            </View>
                        </Callout>
                    </Marker>
                ))}
            </MapView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        flex: 1,
    },
    markerContainer: {
        backgroundColor: '#eff6ff',
        borderRadius: 20,
        padding: 8,
        borderWidth: 2,
        borderColor: '#3b82f6',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    selectedMarker: {
        backgroundColor: '#3b82f6',
        borderColor: '#1d4ed8',
        transform: [{ scale: 1.2 }],
    },
    callout: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 10,
        minWidth: 100,
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    calloutName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    calloutRate: {
        fontSize: 13,
        color: '#3b82f6',
        fontWeight: '600',
        marginTop: 2,
    },
});
