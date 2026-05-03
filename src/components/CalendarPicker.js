import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function CalendarPicker({ selectedDate, onSelectDate, minDate }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const min = minDate || today;

    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());

    const calendarDays = useMemo(() => {
        const firstDay = new Date(viewYear, viewMonth, 1);
        let startDow = firstDay.getDay() - 1;
        if (startDow < 0) startDow = 6;

        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const cells = [];

        for (let i = 0; i < startDow; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(d);
        while (cells.length % 7 !== 0) cells.push(null);

        return cells;
    }, [viewYear, viewMonth]);

    const goBack = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
        else setViewMonth(viewMonth - 1);
    };
    const goForward = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
        else setViewMonth(viewMonth + 1);
    };

    const canGoBack = viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth > today.getMonth());

    const isSelected = (day) => {
        if (!day || !selectedDate) return false;
        return selectedDate.getFullYear() === viewYear && selectedDate.getMonth() === viewMonth && selectedDate.getDate() === day;
    };
    const isToday = (day) => {
        if (!day) return false;
        return today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
    };
    const isPast = (day) => {
        if (!day) return true;
        const d = new Date(viewYear, viewMonth, day);
        d.setHours(0, 0, 0, 0);
        return d < min;
    };

    const handleSelect = (day) => {
        if (!day || isPast(day)) return;
        onSelectDate(new Date(viewYear, viewMonth, day));
    };

    return (
        <View style={s.container}>
            <View style={s.header}>
                <TouchableOpacity onPress={goBack} disabled={!canGoBack} style={s.navBtn}>
                    <Ionicons name="chevron-back" size={20} color={canGoBack ? '#1f2937' : '#d1d5db'} />
                </TouchableOpacity>
                <Text style={s.monthLabel}>{MONTHS[viewMonth]} {viewYear}</Text>
                <TouchableOpacity onPress={goForward} style={s.navBtn}>
                    <Ionicons name="chevron-forward" size={20} color="#1f2937" />
                </TouchableOpacity>
            </View>

            <View style={s.daysRow}>
                {DAYS.map(d => <Text key={d} style={s.dayLabel}>{d}</Text>)}
            </View>

            <View style={s.grid}>
                {calendarDays.map((day, i) => {
                    const past = isPast(day);
                    const sel = isSelected(day);
                    const tod = isToday(day);
                    return (
                        <TouchableOpacity
                            key={i}
                            style={[s.cell, sel && s.cellSelected, tod && !sel && s.cellToday]}
                            onPress={() => handleSelect(day)}
                            disabled={!day || past}
                            activeOpacity={0.7}
                        >
                            {day ? (
                                <Text style={[s.cellText, past && s.cellPast, sel && s.cellTextSelected, tod && !sel && s.cellTextToday]}>
                                    {day}
                                </Text>
                            ) : null}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container: { backgroundColor: '#f9fafb', borderRadius: 16, padding: 12, marginTop: 8 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    navBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
    monthLabel: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
    daysRow: { flexDirection: 'row', marginBottom: 6 },
    dayLabel: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#9ca3af' },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
    cellSelected: { backgroundColor: '#3b82f6' },
    cellToday: { borderWidth: 1.5, borderColor: '#3b82f6' },
    cellText: { fontSize: 14, fontWeight: '500', color: '#374151' },
    cellPast: { color: '#d1d5db' },
    cellTextSelected: { color: '#fff', fontWeight: '700' },
    cellTextToday: { color: '#3b82f6', fontWeight: '700' },
});
