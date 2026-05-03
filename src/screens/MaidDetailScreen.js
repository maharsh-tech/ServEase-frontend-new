import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMaidReviews, createBooking } from '../services/apiService';
import { auth } from '../config/firebaseConfig';
import CalendarPicker from '../components/CalendarPicker';
import TimePicker from '../components/TimePicker';

const AVATAR_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'];

const BOOKING_MODES = [
    { key: 'INSTANT', icon: 'flash', label: 'Hire Instant', sub: 'Start right now' },
    { key: 'SCHEDULED', icon: 'calendar', label: 'Schedule Later', sub: 'Pick date & time' },
    { key: 'CONTRACT', icon: 'document-text', label: 'Contract', sub: 'Monthly / weekly' },
];

const DURATION_OPTIONS = [1, 2, 3, 4];
const CONTRACT_OPTIONS = [
    { label: '1 Week', days: 7 },
    { label: '2 Weeks', days: 14 },
    { label: '1 Month', days: 30 },
    { label: '3 Months', days: 90 },
];

function StarRating({ rating, size = 14 }) {
    const stars = [];
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    for (let i = 0; i < 5; i++) {
        if (i < full) stars.push(<Ionicons key={i} name="star" size={size} color="#f59e0b" />);
        else if (i === full && half) stars.push(<Ionicons key={i} name="star-half" size={size} color="#f59e0b" />);
        else stars.push(<Ionicons key={i} name="star-outline" size={size} color="#d1d5db" />);
    }
    return <View style={{ flexDirection: 'row', gap: 2 }}>{stars}</View>;
}

function ReviewCard({ review }) {
    return (
        <View style={st.reviewCard}>
            <View style={st.reviewHeader}>
                <View style={st.reviewerAvatar}><Ionicons name="person" size={16} color="#6b7280" /></View>
                <View style={{ flex: 1 }}>
                    <Text style={st.reviewerName}>{review.customerName || 'Customer'}</Text>
                    <Text style={st.reviewDate}>{review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''}</Text>
                </View>
                <StarRating rating={review.rating || 0} size={12} />
            </View>
            {review.comment ? <Text style={st.reviewComment}>{review.comment}</Text> : null}
        </View>
    );
}

export default function MaidDetailScreen({ route, navigation }) {
    const { maid, userLocation } = route.params;
    const [reviews, setReviews] = useState([]);
    const [loadingReviews, setLoadingReviews] = useState(true);

    // Booking state
    const [bookingMode, setBookingMode] = useState('SCHEDULED');
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedHour, setSelectedHour] = useState(null);
    const [selectedMinute, setSelectedMinute] = useState(null);
    const [durationHours, setDurationHours] = useState(2);
    const [contractDays, setContractDays] = useState(null);
    const [selectedService, setSelectedService] = useState(null);
    const [address, setAddress] = useState(userLocation?.name || '');
    const [booking, setBooking] = useState(false);

    const services = maid.servicesOffered ? maid.servicesOffered.split(',').map(s => s.trim()).filter(Boolean) : [];
    const hourlyRate = parseInt(maid.hourlyRate) || 0;

    useEffect(() => { fetchReviews(); }, []);

    const fetchReviews = async () => {
        try {
            const response = await getMaidReviews(maid.maidId);
            setReviews(response.data || []);
        } catch (e) { console.log('Could not load reviews:', e.message); }
        finally { setLoadingReviews(false); }
    };

    // Calculate total price
    const getTotal = () => {
        if (bookingMode === 'CONTRACT' && contractDays) {
            return hourlyRate * durationHours * contractDays;
        }
        return hourlyRate * durationHours;
    };

    const handleBook = async () => {
        const serviceType = selectedService || (services.length > 0 ? services[0] : 'cleaning');

        // Validation
        if (bookingMode === 'SCHEDULED' || bookingMode === 'CONTRACT') {
            if (!selectedDate) { Alert.alert('Select Date', 'Please pick a date.'); return; }
            if (selectedHour == null) { Alert.alert('Select Time', 'Please pick a time.'); return; }
        }
        if (bookingMode === 'CONTRACT' && !contractDays) {
            Alert.alert('Select Duration', 'Please select a contract duration.'); return;
        }
        if (!address.trim()) { Alert.alert('Enter Address', 'Please enter your address.'); return; }

        // Build scheduledAt
        let scheduledAt;
        if (bookingMode === 'INSTANT') {
            scheduledAt = new Date().toISOString();
        } else {
            const d = new Date(selectedDate);
            d.setHours(selectedHour, selectedMinute, 0, 0);
            scheduledAt = d.toISOString();
        }

        const payload = {
            maidId: maid.maidId,
            bookingType: bookingMode,
            scheduledAt,
            durationHours,
            serviceType,
            address: address || 'Customer location',
            ...(bookingMode === 'CONTRACT' && { contractDays }),
        };

        setBooking(true);
        try {
            console.log('📤 Booking payload:', JSON.stringify(payload));
            await createBooking(payload);
            const typeLabels = { INSTANT: 'instantly hired', SCHEDULED: 'scheduled', CONTRACT: 'contracted' };
            Alert.alert(
                'Booked! ✅',
                `You have ${typeLabels[bookingMode]} ${maid.name}. Check the Bookings tab.`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            console.error('Booking failed:', error.message);
            Alert.alert('Booking Failed', error.message || 'Could not create booking. Please try again.');
        } finally {
            setBooking(false);
        }
    };

    const avatarColor = maid.color || AVATAR_COLORS[0];
    const btnLabels = { INSTANT: 'Hire Now ⚡', SCHEDULED: 'Schedule Booking', CONTRACT: 'Start Contract' };

    return (
        <View style={st.container}>
            {/* Header */}
            <View style={st.headerBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={st.headerTitle}>Maid Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scrollContent}>
                {/* Profile */}
                <View style={st.profileSection}>
                    <View style={[st.avatarLarge, { backgroundColor: avatarColor + '20' }]}>
                        <Ionicons name="person" size={48} color={avatarColor} />
                    </View>
                    <Text style={st.name}>{maid.name}</Text>
                    <View style={st.ratingRow}>
                        <StarRating rating={parseFloat(maid.rating) || 0} size={18} />
                        <Text style={st.ratingText}>{maid.rating}</Text>
                        <Text style={st.reviewCount}>({maid.reviews} reviews)</Text>
                    </View>
                    {maid.bio ? <Text style={st.bio}>{maid.bio}</Text> : null}
                </View>

                {/* Stats */}
                <View style={st.statsRow}>
                    <View style={st.statItem}>
                        <Ionicons name="cash-outline" size={20} color="#3b82f6" />
                        <Text style={st.statValue}>₹{maid.hourlyRate}/hr</Text>
                        <Text style={st.statLabel}>Rate</Text>
                    </View>
                    <View style={st.statDivider} />
                    <View style={st.statItem}>
                        <Ionicons name="time-outline" size={20} color="#8b5cf6" />
                        <Text style={st.statValue}>{maid.experience}</Text>
                        <Text style={st.statLabel}>Experience</Text>
                    </View>
                    <View style={st.statDivider} />
                    <View style={st.statItem}>
                        <Ionicons name="navigate-outline" size={20} color="#06b6d4" />
                        <Text style={st.statValue}>{maid.distance}</Text>
                        <Text style={st.statLabel}>Away</Text>
                    </View>
                </View>

                {/* Services */}
                {services.length > 0 && (
                    <View style={st.section}>
                        <Text style={st.sectionTitle}>Services Offered</Text>
                        <View style={st.chipRow}>
                            {services.map((svc, idx) => (
                                <View key={idx} style={st.chip}>
                                    <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                                    <Text style={st.chipText}>{svc}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Reviews */}
                <View style={st.section}>
                    <Text style={st.sectionTitle}>Reviews</Text>
                    {loadingReviews ? <ActivityIndicator size="small" color="#3b82f6" style={{ marginVertical: 16 }} /> :
                        reviews.length === 0 ? (
                            <View style={st.emptyReviews}>
                                <Ionicons name="chatbubble-outline" size={32} color="#d1d5db" />
                                <Text style={st.emptyText}>No reviews yet</Text>
                            </View>
                        ) : reviews.slice(0, 5).map((r, i) => <ReviewCard key={r.id || i} review={r} />)}
                </View>

                {/* ── Booking Section ── */}
                <View style={st.section}>
                    <Text style={st.sectionTitle}>Book {maid.name}</Text>

                    {/* Mode Selector */}
                    <View style={st.modeRow}>
                        {BOOKING_MODES.map(mode => (
                            <TouchableOpacity
                                key={mode.key}
                                style={[st.modeCard, bookingMode === mode.key && st.modeCardActive]}
                                onPress={() => setBookingMode(mode.key)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name={mode.icon} size={22} color={bookingMode === mode.key ? '#3b82f6' : '#9ca3af'} />
                                <Text style={[st.modeLabel, bookingMode === mode.key && st.modeLabelActive]}>{mode.label}</Text>
                                <Text style={st.modeSub}>{mode.sub}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Calendar (for SCHEDULED & CONTRACT) */}
                    {bookingMode !== 'INSTANT' && (
                        <>
                            <Text style={st.fieldLabel}>{bookingMode === 'CONTRACT' ? 'Start Date' : 'Date'}</Text>
                            <CalendarPicker selectedDate={selectedDate} onSelectDate={setSelectedDate} />
                        </>
                    )}

                    {/* Time Picker (for SCHEDULED & CONTRACT) */}
                    {bookingMode !== 'INSTANT' && (
                        <>
                            <Text style={st.fieldLabel}>Time</Text>
                            <TimePicker
                                selectedHour={selectedHour}
                                selectedMinute={selectedMinute}
                                onSelectTime={(h, m) => { setSelectedHour(h); setSelectedMinute(m); }}
                                selectedDate={selectedDate}
                            />
                        </>
                    )}

                    {/* Contract Duration */}
                    {bookingMode === 'CONTRACT' && (
                        <>
                            <Text style={st.fieldLabel}>Contract Duration</Text>
                            <View style={st.optionRow}>
                                {CONTRACT_OPTIONS.map(opt => (
                                    <TouchableOpacity
                                        key={opt.days}
                                        style={[st.optionChip, contractDays === opt.days && st.optionChipActive]}
                                        onPress={() => setContractDays(opt.days)}
                                    >
                                        <Text style={[st.optionText, contractDays === opt.days && st.optionTextActive]}>{opt.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </>
                    )}

                    {/* Duration (hours per session) */}
                    <Text style={st.fieldLabel}>{bookingMode === 'CONTRACT' ? 'Hours / Day' : 'Duration'}</Text>
                    <View style={st.optionRow}>
                        {DURATION_OPTIONS.map(hr => (
                            <TouchableOpacity
                                key={hr}
                                style={[st.optionChip, durationHours === hr && st.optionChipActive]}
                                onPress={() => setDurationHours(hr)}
                            >
                                <Text style={[st.optionText, durationHours === hr && st.optionTextActive]}>{hr} hr{hr > 1 ? 's' : ''}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Service Type */}
                    {services.length > 0 && (
                        <>
                            <Text style={st.fieldLabel}>Service Type</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {services.map(svc => (
                                    <TouchableOpacity
                                        key={svc}
                                        style={[st.optionChip, selectedService === svc && st.optionChipActive, { marginRight: 8 }]}
                                        onPress={() => setSelectedService(svc)}
                                    >
                                        <Text style={[st.optionText, selectedService === svc && st.optionTextActive]}>{svc}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </>
                    )}

                    {/* Address */}
                    <Text style={st.fieldLabel}>Address</Text>
                    <TextInput
                        style={[st.input, { height: 60, textAlignVertical: 'top' }]}
                        placeholder="Enter your address"
                        placeholderTextColor="#9ca3af"
                        value={address}
                        onChangeText={setAddress}
                        multiline
                    />

                    {/* Price Summary */}
                    <View style={st.priceBox}>
                        <Text style={st.priceLabel}>
                            {bookingMode === 'CONTRACT' && contractDays
                                ? `₹${hourlyRate} × ${durationHours}hrs × ${contractDays} days`
                                : `₹${hourlyRate} × ${durationHours}hrs`}
                        </Text>
                        <Text style={st.priceValue}>₹{getTotal()}</Text>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Bottom Book Button */}
            <View style={st.bottomBar}>
                <View style={st.bottomPrice}>
                    <Text style={st.bottomPriceLabel}>Total</Text>
                    <Text style={st.bottomPriceValue}>₹{getTotal()}</Text>
                </View>
                <TouchableOpacity
                    style={[st.bookNowBtn, booking && { opacity: 0.6 }]}
                    onPress={handleBook}
                    disabled={booking}
                >
                    {booking ? <ActivityIndicator size="small" color="#fff" /> :
                        <Text style={st.bookNowText}>{btnLabels[bookingMode]}</Text>}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const st = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 54 : 40, paddingBottom: 12, paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#1f2937' },
    scrollContent: { paddingBottom: 20 },

    // Profile
    profileSection: { alignItems: 'center', backgroundColor: '#fff', paddingVertical: 24, paddingHorizontal: 20 },
    avatarLarge: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
    name: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    ratingText: { fontSize: 16, fontWeight: '700', color: '#374151' },
    reviewCount: { fontSize: 14, color: '#9ca3af' },
    bio: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20, paddingHorizontal: 10 },

    // Stats
    statsRow: { flexDirection: 'row', backgroundColor: '#fff', marginTop: 8, marginHorizontal: 16, borderRadius: 16, padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
    statItem: { flex: 1, alignItems: 'center', gap: 4 },
    statValue: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
    statLabel: { fontSize: 11, color: '#9ca3af' },
    statDivider: { width: 1, backgroundColor: '#f3f4f6', marginVertical: 4 },

    // Sections
    section: { backgroundColor: '#fff', marginTop: 8, marginHorizontal: 16, borderRadius: 16, padding: 18, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
    sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#1f2937', marginBottom: 14 },

    // Chips
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f0fdf4', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#bbf7d0' },
    chipText: { fontSize: 13, color: '#166534', fontWeight: '500', textTransform: 'capitalize' },

    // Reviews
    emptyReviews: { alignItems: 'center', paddingVertical: 20, gap: 8 },
    emptyText: { fontSize: 14, color: '#9ca3af' },
    reviewCard: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingVertical: 12 },
    reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
    reviewerAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
    reviewerName: { fontSize: 13, fontWeight: '600', color: '#374151' },
    reviewDate: { fontSize: 11, color: '#9ca3af' },
    reviewComment: { fontSize: 13, color: '#6b7280', lineHeight: 19, marginLeft: 42 },

    // Booking Mode Selector
    modeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    modeCard: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6, borderRadius: 14, backgroundColor: '#f9fafb', borderWidth: 1.5, borderColor: '#e5e7eb', gap: 4 },
    modeCardActive: { backgroundColor: '#eff6ff', borderColor: '#3b82f6' },
    modeLabel: { fontSize: 12, fontWeight: '700', color: '#6b7280', textAlign: 'center' },
    modeLabelActive: { color: '#3b82f6' },
    modeSub: { fontSize: 10, color: '#9ca3af', textAlign: 'center' },

    // Form
    fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 14 },
    input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827' },

    // Option chips (duration, contract)
    optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    optionChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: 'transparent' },
    optionChipActive: { backgroundColor: '#eff6ff', borderColor: '#3b82f6' },
    optionText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
    optionTextActive: { color: '#3b82f6' },

    // Price box
    priceBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0fdf4', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginTop: 16, borderWidth: 1, borderColor: '#bbf7d0' },
    priceLabel: { fontSize: 13, color: '#166534', fontWeight: '500' },
    priceValue: { fontSize: 20, fontWeight: 'bold', color: '#166534' },

    // Bottom Bar
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 14, paddingBottom: Platform.OS === 'ios' ? 30 : 16, borderTopWidth: 1, borderTopColor: '#f3f4f6', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 8 },
    bottomPrice: { gap: 2 },
    bottomPriceLabel: { fontSize: 12, color: '#9ca3af' },
    bottomPriceValue: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
    bookNowBtn: { backgroundColor: '#3b82f6', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14, elevation: 4, shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    bookNowText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
