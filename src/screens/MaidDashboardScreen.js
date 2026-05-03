import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Alert,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import {
    getCurrentUser,
    getMyBookings,
    getPendingRequests,
    acceptBookingAPI,
    rejectBookingAPI,
    updateBookingStatus,
    cancelBooking,
    syncMaidLocation,
} from '../services/apiService';
import { auth } from '../config/firebaseConfig';

const STATUS_COLORS = {
    PENDING: { bg: '#fef3c7', text: '#92400e' },
    CONFIRMED: { bg: '#dbeafe', text: '#1e40af' },
    IN_PROGRESS: { bg: '#fce7f3', text: '#9d174d' },
    COMPLETED: { bg: '#d1fae5', text: '#065f46' },
    CANCELLED: { bg: '#fee2e2', text: '#991b1b' },
};

const formatDate = (b) => {
    if (b.scheduledAt) {
        const d = new Date(b.scheduledAt);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return b.bookingDate || 'N/A';
};
const formatTime = (b) => {
    if (b.scheduledAt) {
        const d = new Date(b.scheduledAt);
        const hrs = b.durationHours || 2;
        const end = new Date(d.getTime() + hrs * 60 * 60 * 1000);
        return `${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return b.timeSlot || 'N/A';
};

function StatCard({ icon, label, value, color }) {
    return (
        <View style={[styles.statCard, { borderLeftColor: color }]}>
            <Ionicons name={icon} size={22} color={color} />
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

function BookingRequestCard({ booking, onAccept, onDecline, onStartJob, onComplete }) {
    const statusStyle = STATUS_COLORS[booking.status] || STATUS_COLORS.PENDING;
    const isPending = booking.status === 'PENDING';
    const isConfirmed = booking.status === 'CONFIRMED';
    const isInProgress = booking.status === 'IN_PROGRESS';

    return (
        <View style={styles.bookingItem}>
            <View style={styles.bookingHeader}>
                <View style={styles.bookingLeft}>
                    <Text style={styles.bookingService}>{booking.serviceType || 'Service'}</Text>
                    <Text style={styles.bookingCustomer}>
                        <Ionicons name="person-outline" size={12} color="#6b7280" />
                        {'  '}{booking.customerName || 'Customer'}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>{booking.status}</Text>
                </View>
            </View>

            <View style={styles.bookingDetails}>
                <View style={styles.detailItem}>
                    <Ionicons name="calendar-outline" size={14} color="#9ca3af" />
                    <Text style={styles.detailText}>{formatDate(booking)}</Text>
                </View>
                <View style={styles.detailItem}>
                    <Ionicons name="time-outline" size={14} color="#9ca3af" />
                    <Text style={styles.detailText}>{formatTime(booking)}</Text>
                </View>
                {booking.address && (
                    <View style={styles.detailItem}>
                        <Ionicons name="location-outline" size={14} color="#9ca3af" />
                        <Text style={styles.detailText} numberOfLines={1}>{booking.address}</Text>
                    </View>
                )}
                {booking.totalAmount ? (
                    <View style={styles.detailItem}>
                        <Ionicons name="cash-outline" size={14} color="#9ca3af" />
                        <Text style={[styles.detailText, { fontWeight: '700', color: '#10b981' }]}>
                            ₹{booking.totalAmount}
                        </Text>
                    </View>
                ) : null}
            </View>

            {isPending && (
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.declineBtn]}
                        onPress={() => onDecline(booking)}
                    >
                        <Ionicons name="close" size={18} color="#ef4444" />
                        <Text style={styles.declineBtnText}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.acceptBtn]}
                        onPress={() => onAccept(booking)}
                    >
                        <Ionicons name="checkmark" size={18} color="#fff" />
                        <Text style={styles.acceptBtnText}>Accept</Text>
                    </TouchableOpacity>
                </View>
            )}

            {isConfirmed && (
                <TouchableOpacity
                    style={[styles.actionBtn, styles.startJobBtn, { marginTop: 12 }]}
                    onPress={() => onStartJob(booking)}
                >
                    <Ionicons name="play" size={18} color="#fff" />
                    <Text style={styles.startJobBtnText}>Start Job</Text>
                </TouchableOpacity>
            )}

            {isInProgress && (
                <TouchableOpacity
                    style={[styles.actionBtn, styles.completeBtn, { marginTop: 12 }]}
                    onPress={() => onComplete(booking)}
                >
                    <Ionicons name="checkmark-done" size={18} color="#fff" />
                    <Text style={styles.completeBtnText}>Mark as Completed</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

import { connectSocket, disconnectSocket } from '../services/socketService';

export default function MaidDashboardScreen({ navigation }) {
    const [profile, setProfile] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        try {
            // Load profile
            try {
                const profileRes = await getCurrentUser();
                setProfile(profileRes?.data || profileRes || null);
            } catch (err) {
                console.log('Profile load failed:', err.message);
            }

            // Load bookings from backend
            try {
                const bookingsRes = await getMyBookings();
                setBookings(bookingsRes?.data || []);
            } catch (err) {
                console.log('Backend bookings unavailable:', err.message);
                setBookings([]);
            }
        } catch (err) {
            console.error('Error loading maid dashboard:', err.message);
            setBookings([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { loadData(); }, []));

    // Real-time Sockets and Polling Fallback
    useEffect(() => {
        let pollInterval;
        let activeSocket;

        const setupRealtime = async () => {
            activeSocket = await connectSocket();
            if (activeSocket) {
                console.log('🎧 Listening for real-time booking events...');
                
                // When a new booking request comes in
                activeSocket.on('new_booking', (booking) => {
                    console.log('🔔 REAL-TIME: New booking received!', booking.id);
                    loadData(); // Refresh the list
                });

                // When a booking status is updated or cancelled
                activeSocket.on('booking_updated', () => loadData());
                activeSocket.on('booking_cancelled', () => loadData());
            }

            // Fallback Polling: Every 10 seconds, silently check for updates
            // This ensures reliability if the socket disconnects temporarily
            pollInterval = setInterval(() => {
                // Only poll if not already refreshing manually
                if (!refreshing) {
                    loadData();
                }
            }, 10000);
        };

        setupRealtime();

        return () => {
            if (pollInterval) clearInterval(pollInterval);
            disconnectSocket();
        };
    }, []);

    // 📍 Maid Location Tracking — send live location to backend
    useEffect(() => {
        let locationSubscription = null;

        const startLocationTracking = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    console.log('⚠️ Location permission not granted for maid tracking');
                    return;
                }

                // Send initial location immediately
                try {
                    const loc = await Location.getCurrentPositionAsync({});
                    await syncMaidLocation(loc.coords.latitude, loc.coords.longitude);
                    console.log('📍 Initial maid location synced');
                } catch (e) {
                    console.log('Initial location sync failed:', e.message);
                }

                // Watch for continuous updates (every ~10 seconds or 50m movement)
                locationSubscription = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.Balanced,
                        timeInterval: 10000,     // 10 seconds
                        distanceInterval: 50,    // 50 meters
                    },
                    async (loc) => {
                        try {
                            await syncMaidLocation(loc.coords.latitude, loc.coords.longitude);
                        } catch (e) {
                            // Silently fail — location sync is non-critical
                            console.log('Location sync failed:', e.message);
                        }
                    }
                );
                console.log('📍 Maid location tracking started');
            } catch (error) {
                console.error('Failed to start location tracking:', error.message);
            }
        };

        startLocationTracking();

        return () => {
            if (locationSubscription) {
                locationSubscription.remove();
                console.log('📍 Maid location tracking stopped');
            }
        };
    }, []);

    const onRefresh = () => { setRefreshing(true); loadData(); };

    const handleAccept = (booking) => {
        Alert.alert(
            'Accept Booking',
            `Accept ${booking.serviceType} booking from ${booking.customerName}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Accept',
                    onPress: async () => {
                        try {
                            await acceptBookingAPI(booking.id);
                            Alert.alert('Accepted ✅', 'Booking confirmed!');
                        } catch (e) {
                            console.error('Accept failed:', e.message);
                            Alert.alert('Error', e.message || 'Could not accept booking.');
                        }
                        loadData();
                    },
                },
            ]
        );
    };

    const handleDecline = (booking) => {
        Alert.alert(
            'Decline Booking',
            `Decline this booking from ${booking.customerName}?`,
            [
                { text: 'Keep', style: 'cancel' },
                {
                    text: 'Decline',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await rejectBookingAPI(booking.id, 'Declined by maid');
                            Alert.alert('Declined', 'Booking has been declined.');
                        } catch (e) {
                            console.error('Decline failed:', e.message);
                            Alert.alert('Error', e.message || 'Could not decline booking.');
                        }
                        loadData();
                    },
                },
            ]
        );
    };

    const handleStartJob = (booking) => {
        Alert.alert(
            'Start Job',
            `Start working on ${booking.serviceType} for ${booking.customerName}?`,
            [
                { text: 'Not Yet', style: 'cancel' },
                {
                    text: 'Start',
                    onPress: async () => {
                        try {
                            await updateBookingStatus(booking.id, 'IN_PROGRESS');
                            Alert.alert('Started! 🚀', 'Job is now in progress.');
                        } catch (e) {
                            console.error('Start job failed:', e.message);
                            Alert.alert('Error', e.message || 'Could not start job.');
                        }
                        loadData();
                    },
                },
            ]
        );
    };

    const handleComplete = (booking) => {
        Alert.alert(
            'Complete Booking',
            `Mark ${booking.serviceType} as completed?`,
            [
                { text: 'Not Yet', style: 'cancel' },
                {
                    text: 'Complete',
                    onPress: async () => {
                        try {
                            await updateBookingStatus(booking.id, 'COMPLETED');
                            Alert.alert('Completed 🎉', 'Great job! Booking marked as completed.');
                        } catch (e) {
                            console.error('Complete failed:', e.message);
                            Alert.alert('Error', e.message || 'Could not update booking.');
                        }
                        loadData();
                    },
                },
            ]
        );
    };

    const totalEarnings = bookings
        .filter(b => b.status === 'COMPLETED')
        .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    const completedCount = bookings.filter(b => b.status === 'COMPLETED').length;
    const pendingCount = bookings.filter(b => b.status === 'PENDING').length;
    const rating = profile?.avgRating != null ? Number(profile.avgRating).toFixed(1) : '0.0';
    const userName = profile?.fullName || auth.currentUser?.displayName || 'Maid';

    const pendingBookings = bookings.filter(b => b.status === 'PENDING');
    const activeBookings = bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS');
    const pastBookings = bookings.filter(b => b.status === 'COMPLETED' || b.status === 'CANCELLED');

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7c3aed" />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
        >
            {/* Header */}
            <LinearGradient colors={['#4c1d95', '#7c3aed']} style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.greeting}>Good day! 👋</Text>
                        <Text style={styles.headerName}>{userName}</Text>
                    </View>
                    <TouchableOpacity style={styles.editBtn} onPress={() => navigation.getParent()?.navigate('Profile')}>
                        <Ionicons name="create-outline" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Stats */}
            <View style={styles.statsRow}>
                <StatCard icon="star" label="Rating" value={rating} color="#f59e0b" />
                <StatCard icon="checkmark-done" label="Done" value={completedCount} color="#10b981" />
                <StatCard icon="time-outline" label="Pending" value={pendingCount} color="#f59e0b" />
                <StatCard icon="cash" label="Earned" value={`₹${totalEarnings}`} color="#7c3aed" />
            </View>

            {/* New Requests */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>📨 New Requests</Text>
                    {pendingCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{pendingCount}</Text>
                        </View>
                    )}
                </View>
                {pendingBookings.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="mail-open-outline" size={40} color="#d1d5db" />
                        <Text style={styles.emptyText}>No pending requests</Text>
                        <Text style={styles.emptySubtext}>New booking requests will appear here</Text>
                    </View>
                ) : (
                    pendingBookings.map((b) => (
                        <BookingRequestCard
                            key={String(b.id)}
                            booking={b}
                            onAccept={handleAccept}
                            onDecline={handleDecline}
                            onStartJob={handleStartJob}
                            onComplete={handleComplete}
                        />
                    ))
                )}
            </View>

            {/* Active Bookings */}
            {activeBookings.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🔵 Active Bookings</Text>
                    {activeBookings.map((b) => (
                        <BookingRequestCard
                            key={String(b.id)}
                            booking={b}
                            onAccept={handleAccept}
                            onDecline={handleDecline}
                            onStartJob={handleStartJob}
                            onComplete={handleComplete}
                        />
                    ))}
                </View>
            )}

            {/* Past */}
            {pastBookings.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📋 History</Text>
                    {pastBookings.map((b) => (
                        <BookingRequestCard
                            key={String(b.id)}
                            booking={b}
                            onAccept={handleAccept}
                            onDecline={handleDecline}
                            onStartJob={handleStartJob}
                            onComplete={handleComplete}
                        />
                    ))}
                </View>
            )}

            <View style={{ height: 24 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f3ff' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f3ff' },
    header: { paddingTop: 54, paddingBottom: 24, paddingHorizontal: 20 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    greeting: { fontSize: 14, color: 'rgba(255,255,255,0.75)' },
    headerName: { fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 2 },
    editBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
    },
    statsRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 16, gap: 8 },
    statCard: {
        flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12,
        alignItems: 'center', elevation: 2, shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4,
        borderLeftWidth: 3, gap: 4,
    },
    statValue: { fontSize: 16, fontWeight: '800', color: '#111827' },
    statLabel: { fontSize: 10, color: '#6b7280', fontWeight: '600', textAlign: 'center' },
    section: {
        marginHorizontal: 16, marginBottom: 16, backgroundColor: '#fff',
        borderRadius: 16, padding: 16, elevation: 2, shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937', marginBottom: 4 },
    badge: {
        backgroundColor: '#ef4444', borderRadius: 12, paddingHorizontal: 8,
        paddingVertical: 2, minWidth: 24, alignItems: 'center',
    },
    badgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
    bookingItem: {
        backgroundColor: '#fafafa', borderRadius: 14, padding: 14,
        marginBottom: 10, borderWidth: 1, borderColor: '#f3f4f6',
    },
    bookingHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 10,
    },
    bookingLeft: { flex: 1, marginRight: 10 },
    bookingService: { fontSize: 15, fontWeight: '700', color: '#1f2937', textTransform: 'capitalize' },
    bookingCustomer: { fontSize: 13, color: '#6b7280', marginTop: 3 },
    bookingDetails: { gap: 5 },
    detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    detailText: { fontSize: 12, color: '#6b7280', flex: 1 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
    statusText: { fontSize: 10, fontWeight: '700' },
    actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    actionBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 12,
    },
    declineBtn: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
    declineBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 14 },
    acceptBtn: {
        backgroundColor: '#22c55e', elevation: 2,
        shadowColor: '#22c55e', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3, shadowRadius: 4,
    },
    acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    startJobBtn: {
        backgroundColor: '#22c55e', elevation: 2,
        shadowColor: '#22c55e', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3, shadowRadius: 4,
    },
    startJobBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    completeBtn: {
        backgroundColor: '#3b82f6', elevation: 2,
        shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3, shadowRadius: 4,
    },
    completeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    emptyState: { alignItems: 'center', paddingVertical: 24 },
    emptyText: { fontSize: 16, fontWeight: '700', color: '#374151', marginTop: 8 },
    emptySubtext: { fontSize: 13, color: '#9ca3af', textAlign: 'center', marginTop: 4 },
});
