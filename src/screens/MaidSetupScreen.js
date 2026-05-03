import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { createMaidProfile, updateLocation } from '../services/apiService';

const SERVICE_TYPES = [
    'House Cleaning',
    'Cooking',
    'Laundry',
    'Ironing',
    'Childcare',
    'Elderly Care',
    'Gardening',
    'Other',
];

export default function MaidSetupScreen({ navigation }) {
    const [locationText, setLocationText] = useState('');
    const [coords, setCoords] = useState(null);
    const [hourlyRate, setHourlyRate] = useState('');
    const [bio, setBio] = useState('');
    const [selectedServices, setSelectedServices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const getGpsLocation = async () => {
        setGpsLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Please enable location permission in settings.');
                return;
            }
            const loc = await Location.getCurrentPositionAsync({});
            setCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
            const [address] = await Location.reverseGeocodeAsync(loc.coords);
            if (address) {
                const name = [address.name, address.district, address.city]
                    .filter(Boolean).join(', ');
                setLocationText(name || 'Current Location');
            }
        } catch (e) {
            Alert.alert('Error', 'Could not get your location.');
        } finally {
            setGpsLoading(false);
        }
    };

    const toggleService = (service) => {
        setSelectedServices(prev =>
            prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
        );
    };

    const validate = () => {
        const errs = {};
        if (!locationText.trim()) errs.location = 'Please enter or detect your service location';
        if (!hourlyRate.trim() || isNaN(Number(hourlyRate)) || Number(hourlyRate) <= 0)
            errs.hourlyRate = 'Enter a valid hourly rate (₹)';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            // Build maid profile data — includes location so maid is discoverable
            const profileData = {
                hourlyRate: parseFloat(hourlyRate),
                bio: bio.trim(),
                servicesOffered: selectedServices.join(', '),
                ...(coords && { latitude: coords.latitude, longitude: coords.longitude }),
            };

            // POST /api/maids/profile — creates the Maid record in DB
            await createMaidProfile(profileData);
            console.log('✅ Maid profile created successfully');

            // Also update user location for proximity features
            if (coords) {
                await updateLocation(coords.latitude, coords.longitude);
            }

            navigation.replace('MaidHome');
        } catch (err) {
            console.error('❌ Maid setup failed:', err.message);
            Alert.alert('Error', err.message || 'Could not save profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <LinearGradient colors={['#4c1d95', '#7c3aed', '#a78bfa']} style={styles.gradient}>
                <View style={styles.headerArea}>
                    <View style={styles.logoCircle}>
                        <Ionicons name="briefcase-outline" size={28} color="#fff" />
                    </View>
                    <Text style={styles.heading}>Setup Your Profile</Text>
                    <Text style={styles.subheading}>Tell customers about your services</Text>
                </View>

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.card}>
                        {/* Location */}
                        <Text style={styles.sectionTitle}>📍 Service Location</Text>
                        <View style={[styles.inputRow, errors.location && styles.inputError]}>
                            <Ionicons name="location-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={locationText}
                                onChangeText={(t) => {
                                    setLocationText(t);
                                    if (errors.location) setErrors(prev => ({ ...prev, location: null }));
                                }}
                                placeholder="e.g. Andheri West, Mumbai"
                                placeholderTextColor="#c4c4c4"
                            />
                        </View>
                        {errors.location ? <Text style={styles.errorText}>{errors.location}</Text> : null}
                        <TouchableOpacity style={styles.gpsBtn} onPress={getGpsLocation} disabled={gpsLoading}>
                            {gpsLoading ? (
                                <ActivityIndicator size="small" color="#7c3aed" />
                            ) : (
                                <>
                                    <Ionicons name="navigate-outline" size={16} color="#7c3aed" />
                                    <Text style={styles.gpsBtnText}>Use My Current Location</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {/* Hourly Rate */}
                        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>💰 Hourly Rate</Text>
                        <View style={[styles.inputRow, errors.hourlyRate && styles.inputError]}>
                            <Text style={styles.currencySymbol}>₹</Text>
                            <TextInput
                                style={styles.input}
                                value={hourlyRate}
                                onChangeText={(t) => {
                                    setHourlyRate(t);
                                    if (errors.hourlyRate) setErrors(prev => ({ ...prev, hourlyRate: null }));
                                }}
                                keyboardType="numeric"
                                placeholder="e.g. 200"
                                placeholderTextColor="#c4c4c4"
                            />
                            <Text style={styles.perHour}>/hr</Text>
                        </View>
                        {errors.hourlyRate ? <Text style={styles.errorText}>{errors.hourlyRate}</Text> : null}

                        {/* Services */}
                        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>🧹 Services Offered</Text>
                        <Text style={styles.hintText}>Select all that apply</Text>
                        <View style={styles.serviceGrid}>
                            {SERVICE_TYPES.map(s => (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.serviceChip, selectedServices.includes(s) && styles.serviceChipActive]}
                                    onPress={() => toggleService(s)}
                                    activeOpacity={0.75}
                                >
                                    <Text style={[styles.serviceChipText, selectedServices.includes(s) && styles.serviceChipTextActive]}>
                                        {s}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Bio */}
                        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>📝 About You (Optional)</Text>
                        <TextInput
                            style={styles.textArea}
                            value={bio}
                            onChangeText={setBio}
                            placeholder="Tell customers about your experience, working hours, specialties..."
                            placeholderTextColor="#c4c4c4"
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />

                        {/* Save Button */}
                        <TouchableOpacity
                            style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
                            onPress={handleSave}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                                    <Text style={styles.saveBtnText}>Save & Go to Dashboard</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    gradient: { flex: 1 },
    headerArea: {
        alignItems: 'center',
        paddingTop: 54,
        paddingBottom: 20,
    },
    logoCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    heading: {
        fontSize: 26,
        fontWeight: '800',
        color: '#fff',
    },
    subheading: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.75)',
        marginTop: 4,
    },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 40 },
    card: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        borderRadius: 24,
        padding: 22,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 10,
    },
    hintText: {
        fontSize: 12,
        color: '#9ca3af',
        marginBottom: 10,
        marginTop: -6,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 12 : 0,
    },
    inputError: { borderColor: '#ef4444' },
    inputIcon: { marginRight: 8 },
    currencySymbol: {
        fontSize: 16,
        fontWeight: '700',
        color: '#374151',
        marginRight: 4,
    },
    perHour: {
        fontSize: 13,
        color: '#9ca3af',
        fontWeight: '600',
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#111827',
        paddingVertical: 10,
    },
    errorText: {
        fontSize: 12,
        color: '#ef4444',
        marginTop: 4,
    },
    gpsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#ede9fe',
        borderRadius: 10,
        alignSelf: 'flex-start',
    },
    gpsBtnText: {
        fontSize: 13,
        color: '#7c3aed',
        fontWeight: '600',
    },
    serviceGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    serviceChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
        backgroundColor: '#f9fafb',
    },
    serviceChipActive: {
        borderColor: '#7c3aed',
        backgroundColor: '#ede9fe',
    },
    serviceChipText: {
        fontSize: 13,
        color: '#6b7280',
        fontWeight: '500',
    },
    serviceChipTextActive: {
        color: '#7c3aed',
        fontWeight: '700',
    },
    textArea: {
        backgroundColor: '#f9fafb',
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        color: '#111827',
        minHeight: 90,
    },
    saveBtn: {
        backgroundColor: '#7c3aed',
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
        marginTop: 24,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        elevation: 4,
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
    },
    saveBtnDisabled: { opacity: 0.7 },
    saveBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
