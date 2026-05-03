import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Clock-style time picker — scrollable list of hour:minute slots.
 * Disables past times when selectedDate is today.
 * Props: selectedHour, selectedMinute, onSelectTime(hour, minute), selectedDate
 */
export default function TimePicker({ selectedHour, selectedMinute, onSelectTime, selectedDate }) {
    const scrollRef = useRef(null);
    const now = new Date();
    const isToday = selectedDate &&
        selectedDate.getFullYear() === now.getFullYear() &&
        selectedDate.getMonth() === now.getMonth() &&
        selectedDate.getDate() === now.getDate();

    // Generate time slots: 6:00 AM to 10:00 PM in 30-min increments
    const slots = [];
    for (let h = 6; h <= 22; h++) {
        slots.push({ h, m: 0 });
        if (h < 22) slots.push({ h, m: 30 });
    }

    const isPast = (h, m) => {
        if (!isToday) return false;
        if (h < now.getHours()) return true;
        if (h === now.getHours() && m <= now.getMinutes()) return true;
        return false;
    };

    const formatTime = (h, m) => {
        const suffix = h >= 12 ? 'PM' : 'AM';
        const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
        return `${displayH}:${String(m).padStart(2, '0')} ${suffix}`;
    };

    const isSelected = (h, m) => selectedHour === h && selectedMinute === m;

    // Auto-scroll to selected or first available
    useEffect(() => {
        const idx = slots.findIndex(s => isSelected(s.h, s.m));
        const scrollIdx = idx >= 0 ? idx : slots.findIndex(s => !isPast(s.h, s.m));
        if (scrollRef.current && scrollIdx >= 0) {
            setTimeout(() => {
                scrollRef.current?.scrollTo({ y: Math.max(0, scrollIdx * 48 - 48), animated: true });
            }, 100);
        }
    }, [selectedDate]);

    return (
        <View style={s.container}>
            <View style={s.header}>
                <Ionicons name="time-outline" size={18} color="#3b82f6" />
                <Text style={s.title}>Select Time</Text>
                {selectedHour != null && (
                    <Text style={s.selected}>{formatTime(selectedHour, selectedMinute)}</Text>
                )}
            </View>
            <ScrollView ref={scrollRef} style={s.scroll} showsVerticalScrollIndicator={false}>
                {slots.map(({ h, m }, i) => {
                    const past = isPast(h, m);
                    const sel = isSelected(h, m);
                    return (
                        <TouchableOpacity
                            key={i}
                            style={[s.slot, sel && s.slotActive, past && s.slotDisabled]}
                            onPress={() => !past && onSelectTime(h, m)}
                            disabled={past}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={sel ? 'radio-button-on' : 'radio-button-off'}
                                size={18}
                                color={past ? '#d1d5db' : sel ? '#3b82f6' : '#9ca3af'}
                            />
                            <Text style={[s.slotText, sel && s.slotTextActive, past && s.slotTextPast]}>
                                {formatTime(h, m)}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    container: { marginTop: 8 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    title: { fontSize: 14, fontWeight: '600', color: '#374151', flex: 1 },
    selected: { fontSize: 14, fontWeight: '700', color: '#3b82f6' },
    scroll: { maxHeight: 240, backgroundColor: '#f9fafb', borderRadius: 14, padding: 6 },
    slot: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, marginBottom: 2 },
    slotActive: { backgroundColor: '#eff6ff' },
    slotDisabled: { opacity: 0.4 },
    slotText: { fontSize: 15, fontWeight: '500', color: '#374151' },
    slotTextActive: { color: '#3b82f6', fontWeight: '700' },
    slotTextPast: { color: '#d1d5db' },
});
