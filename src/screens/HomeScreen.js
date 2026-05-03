import React, { useState, useEffect, useRef } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, Text, TouchableOpacity, ScrollView, Dimensions, Platform } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Callout } from 'react-native-maps';
import { getNearbyMaids, searchMaids, updateLocation } from '../services/apiService';

import Header from '../components/Header';
import SearchBar from '../components/SearchBar';

// Color palette for maid avatars
const AVATAR_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'];

/**
 * Map backend MaidResponse to the shape MaidCard expects.
 */
const mapMaidForUI = (maid, index, userLat, userLng) => {
    const hasCoords = maid.latitude != null && maid.longitude != null;
    const distance = hasCoords ? calculateDistance(userLat, userLng, maid.latitude, maid.longitude) : null;
    return {
        id: String(maid.id),
        maidId: maid.id,
        name: maid.fullName || 'Unknown',
        rating: maid.avgRating ? String(maid.avgRating) : '0.0',
        reviews: maid.totalReviews || 0,
        distance: distance == null ? 'N/A' : (distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`),
        experience: maid.experienceYears ? `${maid.experienceYears} yrs` : 'N/A',
        hourlyRate: maid.hourlyRate ? String(maid.hourlyRate) : '0',
        color: AVATAR_COLORS[index % AVATAR_COLORS.length],
        latitude: maid.latitude || null,
        longitude: maid.longitude || null,
        servicesOffered: maid.servicesOffered,
        bio: maid.bio,
    };
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// ── Maid Card Component (inline for simplicity) ──
function MaidListCard({ maid, onPress }) {
    const services = maid.servicesOffered
        ? maid.servicesOffered.split(',').map(s => s.trim()).filter(Boolean)
        : [];

    return (
        <TouchableOpacity style={styles.maidCard} onPress={onPress} activeOpacity={0.85}>
            <View style={styles.maidCardRow}>
                {/* Avatar */}
                <View style={[styles.avatar, { backgroundColor: maid.color + '20' }]}>
                    <Ionicons name="person" size={30} color={maid.color} />
                </View>

                {/* Info */}
                <View style={styles.maidInfo}>
                    <Text style={styles.maidName}>{maid.name}</Text>
                    <View style={styles.ratingRow}>
                        <Ionicons name="star" size={14} color="#f59e0b" />
                        <Text style={styles.ratingText}>{maid.rating}</Text>
                        <Text style={styles.reviewsText}>({maid.reviews} reviews)</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <View style={styles.detailChip}>
                            <Ionicons name="cash-outline" size={12} color="#3b82f6" />
                            <Text style={styles.detailChipText}>₹{maid.hourlyRate}/hr</Text>
                        </View>
                        <View style={styles.detailChip}>
                            <Ionicons name="time-outline" size={12} color="#8b5cf6" />
                            <Text style={styles.detailChipText}>{maid.experience}</Text>
                        </View>
                        <View style={styles.detailChip}>
                            <Ionicons name="navigate-outline" size={12} color="#06b6d4" />
                            <Text style={styles.detailChipText}>{maid.distance}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Services */}
            {services.length > 0 && (
                <View style={styles.servicesRow}>
                    {services.map((s, i) => (
                        <View key={i} style={styles.serviceTag}>
                            <Text style={styles.serviceTagText}>{s}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Bio */}
            {maid.bio && (
                <Text style={styles.bioText} numberOfLines={2}>{maid.bio}</Text>
            )}

            {/* Book button */}
            <TouchableOpacity
                style={styles.bookBtn}
                onPress={onPress}
                activeOpacity={0.85}
            >
                <Ionicons name="calendar-outline" size={16} color="#fff" />
                <Text style={styles.bookBtnText}>View & Book</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

export default function HomeScreen({ navigation }) {
    const [location, setLocation] = useState(null);
    const [locationName, setLocationName] = useState('');
    const [loading, setLoading] = useState(true);
    const [maids, setMaids] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showMap, setShowMap] = useState(false);
    const [selectedMaidId, setSelectedMaidId] = useState(null);
    const mapRef = useRef(null);

    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setMaids([]);
                    setLoading(false);
                    return;
                }

                const loc = await Location.getCurrentPositionAsync({});
                setLocation(loc.coords);

                // Reverse geocode
                try {
                    const [address] = await Location.reverseGeocodeAsync({
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude,
                    });
                    if (address) {
                        const name = [address.name, address.district, address.city]
                            .filter(Boolean)
                            .join(', ');
                        setLocationName(name || 'Current Location');
                    } else {
                        setLocationName('Current Location');
                    }
                } catch (geocodeError) {
                    setLocationName('Current Location');
                }

                // Update location on backend (non-critical)
                try {
                    await updateLocation(loc.coords.latitude, loc.coords.longitude);
                } catch (err) {
                    console.log('Could not update location on backend:', err.message);
                }

                // Fetch nearby maids
                await fetchNearbyMaids(loc.coords.latitude, loc.coords.longitude);
            } catch (error) {
                console.error('Location error:', error);
                setMaids([]);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // Auto-refresh maid locations every 30 seconds
    useEffect(() => {
        if (!location) return;
        const interval = setInterval(() => {
            fetchNearbyMaids(location.latitude, location.longitude);
        }, 30000);
        return () => clearInterval(interval);
    }, [location]);

    const fetchNearbyMaids = async (lat, lng) => {
        try {
            const response = await getNearbyMaids(lat, lng, 5);
            const maidList = (response.data || []).map((m, i) => mapMaidForUI(m, i, lat, lng));
            setMaids(maidList);
        } catch (error) {
            console.error('Error fetching nearby maids:', error.message);
            setMaids([]);
        }
    };

    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (!query.trim()) {
            if (location) {
                await fetchNearbyMaids(location.latitude, location.longitude);
            } else {
                setMaids([]);
            }
            return;
        }
        try {
            const response = await searchMaids(query);
            const lat = location?.latitude || 22.5;
            const lng = location?.longitude || 72.8;
            const maidList = (response.data || []).map((m, i) => mapMaidForUI(m, i, lat, lng));
            setMaids(maidList);
        } catch (error) {
            console.error('Search error:', error.message);
        }
    };

    const handleMaidPress = (maid) => {
        navigation.getParent()?.navigate('MaidDetail', {
            maid,
            userLocation: { name: locationName },
        });
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Finding maids near you...</Text>
            </View>
        );
    }

    const maidsWithCoords = maids.filter(m => m.latitude != null && m.longitude != null);

    return (
        <View style={styles.container}>
            {/* Header */}
            <Header locationName={locationName} />

            {/* Search */}
            <View style={styles.searchWrapper}>
                <SearchBar onSearch={handleSearch} />
            </View>

            {/* Map/List Toggle */}
            <View style={styles.toggleRow}>
                <TouchableOpacity
                    style={[styles.toggleBtn, !showMap && styles.toggleBtnActive]}
                    onPress={() => setShowMap(false)}
                >
                    <Ionicons name="list" size={16} color={!showMap ? '#fff' : '#6b7280'} />
                    <Text style={[styles.toggleText, !showMap && styles.toggleTextActive]}>List</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.toggleBtn, showMap && styles.toggleBtnActive]}
                    onPress={() => setShowMap(true)}
                >
                    <Ionicons name="map" size={16} color={showMap ? '#fff' : '#6b7280'} />
                    <Text style={[styles.toggleText, showMap && styles.toggleTextActive]}>Map</Text>
                </TouchableOpacity>
            </View>

            {/* Map View */}
            {showMap && location && (
                <View style={styles.mapContainer}>
                    <MapView
                        ref={mapRef}
                        style={styles.map}
                        initialRegion={{
                            latitude: location.latitude,
                            longitude: location.longitude,
                            latitudeDelta: 0.05,
                            longitudeDelta: 0.05,
                        }}
                        showsUserLocation={true}
                        showsMyLocationButton={true}
                        showsCompass={true}
                    >
                        {maidsWithCoords.map((maid) => (
                            <Marker
                                key={maid.id}
                                coordinate={{
                                    latitude: maid.latitude,
                                    longitude: maid.longitude,
                                }}
                                onPress={() => setSelectedMaidId(maid.id)}
                            >
                                <View style={[
                                    styles.mapMarker,
                                    selectedMaidId === maid.id && styles.mapMarkerSelected,
                                    { borderColor: maid.color }
                                ]}>
                                    <Ionicons
                                        name="person"
                                        size={16}
                                        color={selectedMaidId === maid.id ? '#fff' : maid.color}
                                    />
                                </View>
                                <Callout tooltip onPress={() => handleMaidPress(maid)}>
                                    <View style={styles.calloutBox}>
                                        <Text style={styles.calloutName}>{maid.name}</Text>
                                        <View style={styles.calloutRow}>
                                            <Ionicons name="star" size={12} color="#f59e0b" />
                                            <Text style={styles.calloutRating}>{maid.rating}</Text>
                                            <Text style={styles.calloutDivider}>·</Text>
                                            <Text style={styles.calloutRate}>₹{maid.hourlyRate}/hr</Text>
                                        </View>
                                        <Text style={styles.calloutDistance}>{maid.distance} away</Text>
                                        <View style={styles.calloutAction}>
                                            <Text style={styles.calloutActionText}>Tap to Book →</Text>
                                        </View>
                                    </View>
                                </Callout>
                            </Marker>
                        ))}
                    </MapView>
                    {maidsWithCoords.length === 0 && (
                        <View style={styles.mapEmpty}>
                            <Text style={styles.mapEmptyText}>No maids with location data nearby</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Maid List */}
            {!showMap && (
                <FlatList
                    data={maids}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <MaidListCard maid={item} onPress={() => handleMaidPress(item)} />
                    )}
                    ListHeaderComponent={
                        <Text style={styles.sectionTitle}>
                            {maids.length} {maids.length === 1 ? 'Maid' : 'Maids'} Available Nearby
                        </Text>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="search-outline" size={48} color="#d1d5db" />
                            <Text style={styles.emptyText}>No maids found nearby</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#6b7280',
    },
    searchWrapper: {
        backgroundColor: '#fff',
        paddingBottom: 8,
    },
    listContent: {
        padding: 16,
        paddingBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 14,
    },

    // ── Maid Card ──
    maidCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        marginBottom: 14,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
    },
    maidCardRow: {
        flexDirection: 'row',
        gap: 14,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    maidInfo: {
        flex: 1,
        gap: 4,
    },
    maidName: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1f2937',
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#374151',
    },
    reviewsText: {
        fontSize: 12,
        color: '#9ca3af',
    },
    detailRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    detailChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    detailChipText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#4b5563',
    },
    servicesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 12,
    },
    serviceTag: {
        backgroundColor: '#eff6ff',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    serviceTagText: {
        fontSize: 12,
        color: '#2563eb',
        fontWeight: '600',
    },
    bioText: {
        fontSize: 13,
        color: '#6b7280',
        lineHeight: 19,
        marginTop: 10,
    },
    bookBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#3b82f6',
        borderRadius: 14,
        paddingVertical: 12,
        marginTop: 14,
        elevation: 2,
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
    },
    bookBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    emptyContainer: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 8,
    },

    // ── Map Toggle ──
    toggleRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 8,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    toggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
    },
    toggleBtnActive: {
        backgroundColor: '#3b82f6',
    },
    toggleText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6b7280',
    },
    toggleTextActive: {
        color: '#fff',
    },

    // ── Map ──
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    map: {
        flex: 1,
    },
    mapMarker: {
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
    mapMarkerSelected: {
        backgroundColor: '#3b82f6',
        transform: [{ scale: 1.2 }],
    },
    calloutBox: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        minWidth: 150,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    calloutName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    calloutRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    calloutRating: {
        fontSize: 13,
        fontWeight: '700',
        color: '#374151',
    },
    calloutDivider: {
        fontSize: 13,
        color: '#9ca3af',
    },
    calloutRate: {
        fontSize: 13,
        color: '#3b82f6',
        fontWeight: '600',
    },
    calloutDistance: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 6,
    },
    calloutAction: {
        backgroundColor: '#eff6ff',
        borderRadius: 8,
        paddingVertical: 4,
        paddingHorizontal: 8,
        alignItems: 'center',
    },
    calloutActionText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#3b82f6',
    },
    mapEmpty: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
    },
    mapEmptyText: {
        fontSize: 13,
        color: '#6b7280',
        fontWeight: '500',
    },
});
