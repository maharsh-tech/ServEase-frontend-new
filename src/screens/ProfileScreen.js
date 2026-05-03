import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
    ScrollView, TextInput, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { auth } from '../config/firebaseConfig';
import { logoutUser } from '../services/authService';
import { getCurrentUser, updateProfile } from '../services/apiService';

export default function ProfileScreen({ navigation }) {
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [saving, setSaving] = useState(false);

    useFocusEffect(
        useCallback(() => {
            const fetchProfile = async () => {
                setLoading(true);
                try {
                    const response = await getCurrentUser();
                    const data = response?.data || response;
                    setUserProfile(data);
                    setEditName(data?.fullName || '');
                    setEditPhone(data?.phone || data?.phoneNumber || '');
                } catch (error) {
                    console.error('Error fetching profile:', error.message);
                } finally {
                    setLoading(false);
                }
            };
            fetchProfile();
        }, [])
    );

    const handleLogout = async () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Logout',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await logoutUser();
                        navigation.getParent()?.reset({
                            index: 0,
                            routes: [{ name: 'Auth' }],
                        });
                    } catch (error) {
                        console.error(error);
                    }
                }
            }
        ]);
    };

    const handleSave = async () => {
        if (!editName.trim()) {
            Alert.alert('Validation', 'Full name cannot be empty.');
            return;
        }
        setSaving(true);
        try {
            await updateProfile({ fullName: editName.trim(), phone: editPhone.trim() });
            setUserProfile(prev => ({ ...prev, fullName: editName.trim(), phone: editPhone.trim() }));
            setEditing(false);
            Alert.alert('Saved', 'Profile updated successfully!');
        } catch (err) {
            Alert.alert('Error', err.message || 'Could not save changes.');
        } finally {
            setSaving(false);
        }
    };

    const userName = userProfile?.fullName || auth.currentUser?.displayName || 'User';
    const userPhone = userProfile?.phone || userProfile?.phoneNumber || auth.currentUser?.phoneNumber || '—';
    const userEmail = userProfile?.email || auth.currentUser?.email || '—';
    const userRole = userProfile?.role || 'CUSTOMER';
    const isMaid = userRole === 'MAID';

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={isMaid ? '#7c3aed' : '#3b82f6'} />
            </View>
        );
    }

    const accentColor = isMaid ? '#7c3aed' : '#2563eb';
    const gradientColors = isMaid ? ['#4c1d95', '#7c3aed'] : ['#1e3a5f', '#2563eb'];

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <LinearGradient colors={gradientColors} style={styles.header}>
                <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitial}>
                        {userName.charAt(0).toUpperCase()}
                    </Text>
                </View>
                <Text style={styles.headerName}>{userName}</Text>
                <Text style={styles.headerEmail}>{userEmail}</Text>
                <View style={[styles.roleBadge, { backgroundColor: isMaid ? '#ede9fe' : '#dbeafe' }]}>
                    <Ionicons
                        name={isMaid ? 'briefcase-outline' : 'person-outline'}
                        size={12}
                        color={isMaid ? '#7c3aed' : '#2563eb'}
                    />
                    <Text style={[styles.roleText, { color: isMaid ? '#7c3aed' : '#2563eb' }]}>
                        {isMaid ? 'Maid / Service Provider' : 'Customer'}
                    </Text>
                </View>
            </LinearGradient>

            {/* Profile Details Card */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Profile Details</Text>
                    {!editing ? (
                        <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
                            <Ionicons name="create-outline" size={16} color={accentColor} />
                            <Text style={[styles.editBtnText, { color: accentColor }]}>Edit</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(false)}>
                            <Ionicons name="close-outline" size={16} color="#9ca3af" />
                            <Text style={[styles.editBtnText, { color: '#9ca3af' }]}>Cancel</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <InfoRow icon="person-outline" label="Full Name">
                    {editing ? (
                        <TextInput
                            style={[styles.editInput, { borderColor: accentColor }]}
                            value={editName}
                            onChangeText={setEditName}
                            autoFocus
                        />
                    ) : (
                        <Text style={styles.infoValue}>{userName}</Text>
                    )}
                </InfoRow>

                <InfoRow icon="call-outline" label="Phone">
                    {editing ? (
                        <TextInput
                            style={[styles.editInput, { borderColor: accentColor }]}
                            value={editPhone}
                            onChangeText={setEditPhone}
                            keyboardType="phone-pad"
                            maxLength={10}
                        />
                    ) : (
                        <Text style={styles.infoValue}>{userPhone}</Text>
                    )}
                </InfoRow>

                <InfoRow icon="mail-outline" label="Email">
                    <Text style={styles.infoValue}>{userEmail}</Text>
                </InfoRow>

                {isMaid && userProfile?.hourlyRate && (
                    <InfoRow icon="cash-outline" label="Hourly Rate">
                        <Text style={styles.infoValue}>₹{userProfile.hourlyRate}/hr</Text>
                    </InfoRow>
                )}

                {isMaid && userProfile?.avgRating !== undefined && (
                    <InfoRow icon="star-outline" label="Rating">
                        <Text style={styles.infoValue}>
                            {userProfile.avgRating ? `${userProfile.avgRating.toFixed(1)} ⭐` : 'No ratings yet'}
                        </Text>
                    </InfoRow>
                )}

                {editing && (
                    <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: accentColor }, saving && styles.saveBtnDisabled]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-outline" size={18} color="#fff" />
                                <Text style={styles.saveBtnText}>Save Changes</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </View>

            {/* Menu Items */}
            <View style={styles.card}>
                <MenuItem icon="document-text-outline" label="My Bookings" color={accentColor}
                    onPress={() => navigation.getParent()?.navigate('Bookings')} />
                <MenuItem icon="help-circle-outline" label="Help & Support" color={accentColor} />
                <MenuItem icon="information-circle-outline" label="About ServeEase" color={accentColor} />
            </View>

            {/* Logout */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>

            <View style={{ height: 30 }} />
        </ScrollView>
    );
}

function InfoRow({ icon, label, children }) {
    return (
        <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
                <Ionicons name={icon} size={16} color="#9ca3af" />
                <Text style={styles.infoLabel}>{label}</Text>
            </View>
            <View style={styles.infoRight}>{children}</View>
        </View>
    );
}

function MenuItem({ icon, label, color, onPress }) {
    return (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <View style={[styles.menuIconBg, { backgroundColor: color + '18' }]}>
                <Ionicons name={icon} size={18} color={color} />
            </View>
            <Text style={styles.menuLabel}>{label}</Text>
            <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
        </TouchableOpacity>
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
        backgroundColor: '#f9fafb',
    },
    header: {
        paddingTop: 56,
        paddingBottom: 28,
        alignItems: 'center',
    },
    avatarCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    avatarInitial: {
        fontSize: 34,
        fontWeight: '800',
        color: '#fff',
    },
    headerName: {
        fontSize: 22,
        fontWeight: '800',
        color: '#fff',
    },
    headerEmail: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.75)',
        marginTop: 3,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 10,
        paddingHorizontal: 14,
        paddingVertical: 5,
        borderRadius: 20,
    },
    roleText: {
        fontSize: 12,
        fontWeight: '700',
    },
    card: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 16,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
    },
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    editBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    infoLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        width: 110,
    },
    infoLabel: {
        fontSize: 13,
        color: '#9ca3af',
        fontWeight: '500',
    },
    infoRight: {
        flex: 1,
    },
    infoValue: {
        fontSize: 14,
        color: '#111827',
        fontWeight: '500',
    },
    editInput: {
        borderWidth: 1.5,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        fontSize: 14,
        color: '#111827',
        backgroundColor: '#fafafa',
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 16,
        borderRadius: 12,
        paddingVertical: 12,
    },
    saveBtnDisabled: { opacity: 0.7 },
    saveBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        gap: 12,
    },
    menuIconBg: {
        width: 34,
        height: 34,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuLabel: {
        flex: 1,
        fontSize: 15,
        color: '#374151',
        fontWeight: '500',
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 16,
        marginTop: 16,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: '#fef2f2',
        gap: 8,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ef4444',
    },
});
