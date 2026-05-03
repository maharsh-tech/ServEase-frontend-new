import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Alert, RefreshControl, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getMyBookings, cancelBooking } from '../services/apiService';

const formatDate = (booking) => {
    if (booking.scheduledAt) {
        const d = new Date(booking.scheduledAt);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return 'N/A';
};

const formatTime = (booking) => {
    if (booking.scheduledAt) {
        const d = new Date(booking.scheduledAt);
        const hrs = booking.durationHours || 2;
        const end = new Date(d.getTime() + hrs * 60 * 60 * 1000);
        return `${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return 'N/A';
};

const STATUS_COLORS = {
    PENDING: { bg: '#fef3c7', text: '#92400e', icon: 'time-outline' },
    CONFIRMED: { bg: '#dbeafe', text: '#1e40af', icon: 'checkmark-circle-outline' },
    IN_PROGRESS: { bg: '#fce7f3', text: '#9d174d', icon: 'play-circle-outline' },
    COMPLETED: { bg: '#d1fae5', text: '#065f46', icon: 'checkmark-done-outline' },
    CANCELLED: { bg: '#fee2e2', text: '#991b1b', icon: 'close-circle-outline' },
};

const TYPE_BADGES = {
    INSTANT: { label: '⚡ Instant', bg: '#fef3c7', text: '#92400e' },
    SCHEDULED: { label: '📅 Scheduled', bg: '#dbeafe', text: '#1e40af' },
    CONTRACT: { label: '📝 Contract', bg: '#ede9fe', text: '#6d28d9' },
};

function BookingCard({ booking, onCancel }) {
    const statusStyle = STATUS_COLORS[booking.status] || STATUS_COLORS.PENDING;
    const typeBadge = TYPE_BADGES[booking.bookingType] || TYPE_BADGES.SCHEDULED;
    const canCancel = booking.status === 'PENDING' || booking.status === 'CONFIRMED';

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.serviceInfo}>
                    <Text style={styles.serviceType}>{booking.serviceType || 'Service'}</Text>
                    <Text style={styles.maidName}>by {booking.maidName || 'Unknown'}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Ionicons name={statusStyle.icon} size={14} color={statusStyle.text} />
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>{booking.status}</Text>
                </View>
            </View>

            {/* Booking Type Badge */}
            <View style={[styles.typeBadge, { backgroundColor: typeBadge.bg }]}>
                <Text style={[styles.typeText, { color: typeBadge.text }]}>{typeBadge.label}</Text>
                {booking.bookingType === 'CONTRACT' && booking.contractDays && (
                    <Text style={[styles.typeText, { color: typeBadge.text }]}> · {booking.contractDays} days</Text>
                )}
            </View>

            <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                    <Text style={styles.detailText}>{formatDate(booking)}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={16} color="#6b7280" />
                    <Text style={styles.detailText}>{formatTime(booking)} ({booking.durationHours}hrs{booking.bookingType === 'CONTRACT' ? '/day' : ''})</Text>
                </View>
                <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={16} color="#6b7280" />
                    <Text style={styles.detailText} numberOfLines={1}>{booking.address || 'N/A'}</Text>
                </View>
                {booking.totalAmount != null && (
                    <View style={styles.detailRow}>
                        <Ionicons name="cash-outline" size={16} color="#6b7280" />
                        <Text style={styles.detailText}>₹{booking.totalAmount}</Text>
                    </View>
                )}
            </View>

            {canCancel && (
                <TouchableOpacity style={styles.cancelBtn} onPress={() => onCancel(booking)}>
                    <Text style={styles.cancelText}>Cancel Booking</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

export default function BookingsScreen() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchBookings = async () => {
        try {
            const response = await getMyBookings();
            setBookings(response.data || []);
        } catch (error) {
            console.error('Failed to fetch bookings:', error.message);
            Alert.alert('Error', 'Could not load bookings. Pull down to retry.');
            setBookings([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchBookings(); }, []));

    const handleCancel = (booking) => {
        Alert.alert(
            'Cancel Booking',
            `Are you sure you want to cancel your booking with ${booking.maidName}?`,
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await cancelBooking(booking.id, 'Cancelled by customer');
                            Alert.alert('Cancelled', 'Your booking has been cancelled.');
                            fetchBookings();
                        } catch (e) {
                            Alert.alert('Error', e.message || 'Could not cancel booking.');
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Bookings</Text>
            </View>

            {bookings.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="calendar-outline" size={64} color="#d1d5db" />
                    <Text style={styles.emptyTitle}>No Bookings Yet</Text>
                    <Text style={styles.emptySubtitle}>Your upcoming and past bookings will appear here</Text>
                </View>
            ) : (
                <FlatList
                    data={bookings}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => <BookingCard booking={item} onCancel={handleCancel} />}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchBookings(); }} />}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
    header: { paddingTop: Platform.OS === 'ios' ? 54 : 40, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1f2937' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
    emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#1f2937', marginTop: 16 },
    emptySubtitle: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 8 },
    listContent: { padding: 16 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    serviceInfo: { flex: 1 },
    serviceType: { fontSize: 17, fontWeight: 'bold', color: '#1f2937', textTransform: 'capitalize' },
    maidName: { fontSize: 13, color: '#6b7280', marginTop: 2 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 4 },
    statusText: { fontSize: 11, fontWeight: '700' },
    typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: 10, flexDirection: 'row' },
    typeText: { fontSize: 11, fontWeight: '600' },
    cardDetails: { gap: 6 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    detailText: { fontSize: 13, color: '#6b7280', flex: 1 },
    cancelBtn: { marginTop: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: '#fef2f2', alignItems: 'center' },
    cancelText: { color: '#ef4444', fontWeight: '600', fontSize: 14 },
});
