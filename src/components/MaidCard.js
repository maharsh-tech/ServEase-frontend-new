import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

function MaidCard({ maid, isSelected, onPress, onBook }) {
    return (
        <TouchableOpacity
            style={[styles.card, isSelected && styles.selectedCard]}
            onPress={onPress}
            activeOpacity={0.85}
        >
            {/* Avatar */}
            <View style={[styles.avatar, { backgroundColor: maid.color + '20' }]}>
                <Ionicons name="person" size={28} color={maid.color || '#3b82f6'} />
            </View>

            {/* Info */}
            <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>{maid.name}</Text>

                <View style={styles.ratingRow}>
                    <Ionicons name="star" size={13} color="#f59e0b" />
                    <Text style={styles.rating}>{maid.rating}</Text>
                    <Text style={styles.reviews}>({maid.reviews} reviews)</Text>
                </View>

                <View style={styles.detailsRow}>
                    <View style={styles.detail}>
                        <Ionicons name="navigate-outline" size={12} color="#6b7280" />
                        <Text style={styles.detailText}>{maid.distance}</Text>
                    </View>
                    <View style={styles.detail}>
                        <Ionicons name="time-outline" size={12} color="#6b7280" />
                        <Text style={styles.detailText}>{maid.experience}</Text>
                    </View>
                </View>
            </View>

            {/* Price & Book */}
            <View style={styles.priceSection}>
                <Text style={styles.price}>₹{maid.hourlyRate}</Text>
                <Text style={styles.perHour}>/hr</Text>
                <TouchableOpacity style={styles.bookBtn} onPress={() => onBook && onBook(maid)}>
                    <Text style={styles.bookText}>Book</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 14,
        marginRight: 12,
        width: 300,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selectedCard: {
        borderColor: '#3b82f6',
        backgroundColor: '#eff6ff',
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 3,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    rating: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
        marginLeft: 3,
    },
    reviews: {
        fontSize: 11,
        color: '#9ca3af',
        marginLeft: 3,
    },
    detailsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    detail: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    detailText: {
        fontSize: 11,
        color: '#6b7280',
    },
    priceSection: {
        alignItems: 'center',
        marginLeft: 8,
    },
    price: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#3b82f6',
    },
    perHour: {
        fontSize: 11,
        color: '#9ca3af',
        marginBottom: 6,
    },
    bookBtn: {
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 6,
    },
    bookText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: 'bold',
    },
});

export default React.memo(MaidCard);
