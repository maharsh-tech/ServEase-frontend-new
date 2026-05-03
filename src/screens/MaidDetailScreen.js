import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMaidReviews, createBooking } from '../services/apiService';
import { addBooking } from '../services/bookingStore';
import { auth } from '../config/firebaseConfig';

const TIME_SLOTS = [
    '08:00-10:00', '10:00-12:00', '12:00-14:00',
    '14:00-16:00', '16:00-18:00', '18:00-20:00',
];

const AVATAR_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'];

function StarRating({ rating, size = 14 }) {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.5;
    for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
            stars.push(<Ionicons key={i} name="star" size={size} color="#f59e0b" />);
        } else if (i === fullStars && hasHalf) {
            stars.push(<Ionicons key={i} name="star-half" size={size} color="#f59e0b" />);
        } else {
            stars.push(<Ionicons key={i} name="star-outline" size={size} color="#d1d5db" />);
        }
    }
    return <View style={{ flexDirection: 'row', gap: 2 }}>{stars}</View>;
}

function ReviewCard({ review }) {
    return (
        <View style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
                <View style={styles.reviewerAvatar}>
                    <Ionicons name="person" size={16} color="#6b7280" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.reviewerName}>{review.customerName || 'Customer'}</Text>
                    <Text style={styles.reviewDate}>
                        {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''}
                    </Text>
                </View>
                <StarRating rating={review.rating || 0} size={12} />
            </View>
            {review.comment ? (
                <Text style={styles.reviewComment}>{review.comment}</Text>
            ) : null}
        </View>
    );
}

export default function MaidDetailScreen({ route, navigation }) {
    const { maid, userLocation } = route.params;

    const [reviews, setReviews] = useState([]);
    const [loadingReviews, setLoadingReviews] = useState(true);

    // Booking form state
    const [bookingDate, setBookingDate] = useState('');
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [selectedService, setSelectedService] = useState(null);
    const [address, setAddress] = useState(userLocation?.name || '');
    const [booking, setBooking] = useState(false);

    const services = maid.servicesOffered
        ? maid.servicesOffered.split(',').map(s => s.trim()).filter(Boolean)
        : [];

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            const response = await getMaidReviews(maid.maidId);
            setReviews(response.data || []);
        } catch (error) {
            console.log('Could not load reviews:', error.message);
        } finally {
            setLoadingReviews(false);
        }
    };

    const getTodayString = () => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    const handleBookNow = async () => {
        const dateToUse = bookingDate.trim() || getTodayString();

        if (bookingDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(bookingDate.trim())) {
            Alert.alert('Invalid Date', 'Please enter date in YYYY-MM-DD format.');
            return;
        }
        if (!selectedSlot) {
            Alert.alert('Select Time Slot', 'Please select a time slot for your booking.');
            return;
        }

        const serviceType = selectedService || (services.length > 0 ? services[0] : 'cleaning');

        // Build scheduledAt from date + time slot start (e.g. "08:00-10:00" → "08:00")
        const slotStartHour = selectedSlot.split('-')[0]; // "08:00"
        // Build a future datetime — if date is today and time passed, use tomorrow
        let scheduledAt = `${dateToUse}T${slotStartHour}:00`;
        const scheduledDate = new Date(scheduledAt);
        if (scheduledDate <= new Date()) {
            // Move to tomorrow if the selected time is in the past
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const yyyy = tomorrow.getFullYear();
            const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
            const dd = String(tomorrow.getDate()).padStart(2, '0');
            scheduledAt = `${yyyy}-${mm}-${dd}T${slotStartHour}:00`;
        }

        // Duration = 2 hours per slot
        const durationHours = 2;

        setBooking(true);
        try {
            // Try backend first
            const payload = {
                maidId: maid.maidId,
                scheduledAt,
                durationHours,
                serviceType,
                address: address || 'Customer location',
            };
            console.log('📤 Booking payload:', JSON.stringify(payload));
            await createBooking(payload);
            Alert.alert(
                'Booked! ✅',
                `You have booked ${maid.name}. Check the Bookings tab.`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            console.log('Backend booking failed, saving locally:', error.message);
            // Fallback: save booking locally for demo
            const customerName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Customer';
            addBooking({
                maidId: maid.maidId,
                maidName: maid.name,
                customerName,
                customerEmail: auth.currentUser?.email || '',
                bookingDate: dateToUse,
                timeSlot: selectedSlot,
                serviceType,
                address: address || 'Customer location',
                totalAmount: parseInt(maid.hourlyRate) * durationHours || 500,
            });
            Alert.alert(
                'Booked! ✅',
                `You have booked ${maid.name}. Check the Bookings tab.`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } finally {
            setBooking(false);
        }
    };

    const avatarColor = maid.color || AVATAR_COLORS[0];

    return (
        <View style={styles.container}>
            {/* Header Bar */}
            <View style={styles.headerBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Maid Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* ── Profile Header ── */}
                <View style={styles.profileSection}>
                    <View style={[styles.avatarLarge, { backgroundColor: avatarColor + '20' }]}>
                        <Ionicons name="person" size={48} color={avatarColor} />
                    </View>
                    <Text style={styles.name}>{maid.name}</Text>

                    <View style={styles.ratingRow}>
                        <StarRating rating={parseFloat(maid.rating) || 0} size={18} />
                        <Text style={styles.ratingText}>{maid.rating}</Text>
                        <Text style={styles.reviewCount}>({maid.reviews} reviews)</Text>
                    </View>

                    {maid.bio ? <Text style={styles.bio}>{maid.bio}</Text> : null}
                </View>

                {/* ── Quick Stats ── */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Ionicons name="cash-outline" size={20} color="#3b82f6" />
                        <Text style={styles.statValue}>₹{maid.hourlyRate}/hr</Text>
                        <Text style={styles.statLabel}>Rate</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Ionicons name="time-outline" size={20} color="#8b5cf6" />
                        <Text style={styles.statValue}>{maid.experience}</Text>
                        <Text style={styles.statLabel}>Experience</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Ionicons name="navigate-outline" size={20} color="#06b6d4" />
                        <Text style={styles.statValue}>{maid.distance}</Text>
                        <Text style={styles.statLabel}>Away</Text>
                    </View>
                </View>

                {/* ── Services Offered ── */}
                {services.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Services Offered</Text>
                        <View style={styles.chipRow}>
                            {services.map((service, idx) => (
                                <View key={idx} style={styles.chip}>
                                    <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                                    <Text style={styles.chipText}>{service}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* ── Reviews ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Reviews</Text>
                    {loadingReviews ? (
                        <ActivityIndicator size="small" color="#3b82f6" style={{ marginVertical: 16 }} />
                    ) : reviews.length === 0 ? (
                        <View style={styles.emptyReviews}>
                            <Ionicons name="chatbubble-outline" size={32} color="#d1d5db" />
                            <Text style={styles.emptyText}>No reviews yet</Text>
                        </View>
                    ) : (
                        reviews.slice(0, 5).map((review, idx) => (
                            <ReviewCard key={review.id || idx} review={review} />
                        ))
                    )}
                </View>

                {/* ── Booking Form ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Book {maid.name}</Text>

                    {/* Date */}
                    <Text style={styles.fieldLabel}>Date</Text>
                    <TextInput
                        style={styles.input}
                        placeholder={`e.g. ${getTodayString()}`}
                        placeholderTextColor="#9ca3af"
                        value={bookingDate}
                        onChangeText={setBookingDate}
                        keyboardType={Platform.OS === 'ios' ? 'default' : 'default'}
                    />

                    {/* Time Slots */}
                    <Text style={styles.fieldLabel}>Time Slot</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.slotScroll}>
                        {TIME_SLOTS.map((slot) => (
                            <TouchableOpacity
                                key={slot}
                                style={[styles.slotChip, selectedSlot === slot && styles.slotChipActive]}
                                onPress={() => setSelectedSlot(slot)}
                            >
                                <Text style={[styles.slotText, selectedSlot === slot && styles.slotTextActive]}>
                                    {slot}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Service Type */}
                    {services.length > 0 && (
                        <>
                            <Text style={styles.fieldLabel}>Service Type</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.slotScroll}>
                                {services.map((svc) => (
                                    <TouchableOpacity
                                        key={svc}
                                        style={[styles.slotChip, selectedService === svc && styles.slotChipActive]}
                                        onPress={() => setSelectedService(svc)}
                                    >
                                        <Text style={[styles.slotText, selectedService === svc && styles.slotTextActive]}>
                                            {svc}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </>
                    )}

                    {/* Address */}
                    <Text style={styles.fieldLabel}>Address</Text>
                    <TextInput
                        style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                        placeholder="Enter your address"
                        placeholderTextColor="#9ca3af"
                        value={address}
                        onChangeText={setAddress}
                        multiline
                    />
                </View>

                {/* spacer for the fixed button */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* ── Fixed Book Now Button ── */}
            <View style={styles.bottomBar}>
                <View style={styles.bottomPrice}>
                    <Text style={styles.bottomPriceLabel}>Total</Text>
                    <Text style={styles.bottomPriceValue}>₹{maid.hourlyRate}/hr</Text>
                </View>
                <TouchableOpacity
                    style={[styles.bookNowBtn, booking && { opacity: 0.6 }]}
                    onPress={handleBookNow}
                    disabled={booking}
                >
                    {booking ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.bookNowText}>Book Now</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 54 : 40,
        paddingBottom: 12,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1f2937',
    },
    scrollContent: {
        paddingBottom: 20,
    },

    // ── Profile
    profileSection: {
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingVertical: 24,
        paddingHorizontal: 20,
    },
    avatarLarge: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 8,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
    },
    ratingText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#374151',
    },
    reviewCount: {
        fontSize: 14,
        color: '#9ca3af',
    },
    bio: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 10,
    },

    // ── Stats
    statsRow: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        marginTop: 8,
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    statValue: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1f2937',
    },
    statLabel: {
        fontSize: 11,
        color: '#9ca3af',
    },
    statDivider: {
        width: 1,
        backgroundColor: '#f3f4f6',
        marginVertical: 4,
    },

    // ── Sections
    section: {
        backgroundColor: '#fff',
        marginTop: 8,
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 18,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 14,
    },

    // ── Chips
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#f0fdf4',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#bbf7d0',
    },
    chipText: {
        fontSize: 13,
        color: '#166534',
        fontWeight: '500',
        textTransform: 'capitalize',
    },

    // ── Reviews
    emptyReviews: {
        alignItems: 'center',
        paddingVertical: 20,
        gap: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#9ca3af',
    },
    reviewCard: {
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        paddingVertical: 12,
    },
    reviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 6,
    },
    reviewerAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    reviewerName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
    },
    reviewDate: {
        fontSize: 11,
        color: '#9ca3af',
    },
    reviewComment: {
        fontSize: 13,
        color: '#6b7280',
        lineHeight: 19,
        marginLeft: 42,
    },

    // ── Form
    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6,
        marginTop: 12,
    },
    input: {
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#111827',
    },
    slotScroll: {
        marginBottom: 4,
    },
    slotChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#f3f4f6',
        marginRight: 8,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    slotChipActive: {
        backgroundColor: '#eff6ff',
        borderColor: '#3b82f6',
    },
    slotText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6b7280',
    },
    slotTextActive: {
        color: '#3b82f6',
    },

    // ── Bottom Bar
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: Platform.OS === 'ios' ? 30 : 16,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
    },
    bottomPrice: {
        gap: 2,
    },
    bottomPriceLabel: {
        fontSize: 12,
        color: '#9ca3af',
    },
    bottomPriceValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    bookNowBtn: {
        backgroundColor: '#3b82f6',
        borderRadius: 14,
        paddingHorizontal: 36,
        paddingVertical: 14,
        elevation: 4,
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    bookNowText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
