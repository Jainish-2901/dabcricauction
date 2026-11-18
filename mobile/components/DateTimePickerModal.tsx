import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    Pressable,
    ScrollView
} from 'react-native';
import {
    Calendar as CalendarIcon,
    Clock as ClockIcon,
    ChevronLeft,
    ChevronRight,
    Check,
    X,
    Plus,
    Minus
} from 'lucide-react-native';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// ==========================================
// 1. DATE PICKER MODAL
// ==========================================
export interface DatePickerModalProps {
    visible: boolean;
    currentDate?: string; // YYYY-MM-DD
    onSelect: (dateStr: string) => void;
    onClose: () => void;
    title?: string;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
    visible,
    currentDate,
    onSelect,
    onClose,
    title = 'Select Tournament Start Date'
}) => {
    const parseInitialDate = () => {
        if (currentDate && /^\d{4}-\d{2}-\d{2}$/.test(currentDate)) {
            const [y, m, d] = currentDate.split('-').map(Number);
            return new Date(y, m - 1, d);
        }
        return new Date();
    };

    const [viewDate, setViewDate] = useState<Date>(parseInitialDate());
    const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
        if (currentDate && /^\d{4}-\d{2}-\d{2}$/.test(currentDate)) {
            const [y, m, d] = currentDate.split('-').map(Number);
            return new Date(y, m - 1, d);
        }
        return null;
    });

    useEffect(() => {
        if (visible) {
            const init = parseInitialDate();
            setViewDate(init);
            if (currentDate && /^\d{4}-\d{2}-\d{2}$/.test(currentDate)) {
                setSelectedDate(init);
            }
        }
    }, [visible, currentDate]);

    if (!visible) return null;

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const handlePrevMonth = () => {
        setViewDate(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(year, month + 1, 1));
    };

    const handleSelectDay = (day: number) => {
        const picked = new Date(year, month, day);
        setSelectedDate(picked);
    };

    const handleQuickToday = () => {
        const now = new Date();
        setViewDate(now);
        setSelectedDate(now);
    };

    const handleClear = () => {
        setSelectedDate(null);
        onSelect('');
        onClose();
    };

    const handleConfirm = () => {
        if (!selectedDate) {
            onSelect('');
        } else {
            const y = selectedDate.getFullYear();
            const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const d = String(selectedDate.getDate()).padStart(2, '0');
            onSelect(`${y}-${m}-${d}`);
        }
        onClose();
    };

    const today = new Date();
    const isToday = (day: number) =>
        today.getFullYear() === year &&
        today.getMonth() === month &&
        today.getDate() === day;

    const isSelected = (day: number) =>
        selectedDate !== null &&
        selectedDate.getFullYear() === year &&
        selectedDate.getMonth() === month &&
        selectedDate.getDate() === day;

    // Build 6 weeks x 7 days matrix
    const matrix: { day: number; inMonth: boolean }[] = [];
    // Leading days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
        matrix.push({ day: prevMonthTotalDays - i, inMonth: false });
    }
    // Month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
        matrix.push({ day: d, inMonth: true });
    }
    // Trailing days
    const remaining = (7 - (matrix.length % 7)) % 7;
    for (let t = 1; t <= remaining; t++) {
        matrix.push({ day: t, inMonth: false });
    }

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={styles.dialogCard} onPress={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <View style={styles.dialogHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={styles.headerIconBox}>
                                <CalendarIcon size={16} color="#2563eb" />
                            </View>
                            <View>
                                <Text style={styles.dialogTitle}>{title}</Text>
                                <Text style={styles.dialogSub}>Tap to pick match date</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <X size={16} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    {/* Month / Year Navigator */}
                    <View style={styles.monthNavigator}>
                        <TouchableOpacity style={styles.navArrowBtn} onPress={handlePrevMonth}>
                            <ChevronLeft size={18} color="#1e293b" />
                        </TouchableOpacity>
                        <Text style={styles.monthYearText}>
                            {MONTH_NAMES[month]} {year}
                        </Text>
                        <TouchableOpacity style={styles.navArrowBtn} onPress={handleNextMonth}>
                            <ChevronRight size={18} color="#1e293b" />
                        </TouchableOpacity>
                    </View>

                    {/* Day of Week Labels */}
                    <View style={styles.daysRow}>
                        {DAY_LABELS.map((lbl, idx) => (
                            <Text key={idx} style={[styles.dayLabelText, (idx === 0 || idx === 6) && { color: '#ef4444' }]}>
                                {lbl}
                            </Text>
                        ))}
                    </View>

                    {/* Calendar Grid */}
                    <View style={styles.calendarGrid}>
                        {matrix.map((cell, idx) => {
                            if (!cell.inMonth) {
                                return (
                                    <View key={idx} style={styles.dayCell}>
                                        <Text style={styles.dayTextMuted}>{cell.day}</Text>
                                    </View>
                                );
                            }

                            const active = isSelected(cell.day);
                            const currentDay = isToday(cell.day);

                            return (
                                <TouchableOpacity
                                    key={idx}
                                    style={[
                                        styles.dayCell,
                                        active && styles.dayCellSelected,
                                        !active && currentDay && styles.dayCellToday
                                    ]}
                                    onPress={() => handleSelectDay(cell.day)}
                                >
                                    <Text style={[
                                        styles.dayText,
                                        active && styles.dayTextSelected,
                                        !active && currentDay && styles.dayTextToday
                                    ]}>
                                        {cell.day}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Quick Selection Toolbar */}
                    <View style={styles.quickBar}>
                        <TouchableOpacity style={styles.quickBtn} onPress={handleQuickToday}>
                            <Text style={styles.quickBtnText}>Today</Text>
                        </TouchableOpacity>
                        {selectedDate && (
                            <TouchableOpacity style={styles.quickBtn} onPress={handleClear}>
                                <Text style={[styles.quickBtnText, { color: '#ef4444' }]}>Clear</Text>
                            </TouchableOpacity>
                        )}
                        <Text style={styles.previewDateText}>
                            {selectedDate ? selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date set'}
                        </Text>
                    </View>

                    {/* Footer Actions */}
                    <View style={styles.dialogFooter}>
                        <TouchableOpacity style={styles.footerCancelBtn} onPress={onClose}>
                            <Text style={styles.footerCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.footerConfirmBtn} onPress={handleConfirm}>
                            <Check size={14} color="#ffffff" />
                            <Text style={styles.footerConfirmText}>Set Date</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

// ==========================================
// 2. TIME PICKER MODAL
// ==========================================
export interface TimePickerModalProps {
    visible: boolean;
    currentTime?: string; // e.g. "09:30 AM" or "14:00"
    onSelect: (timeStr: string) => void;
    onClose: () => void;
    title?: string;
}

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTE_PRESETS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const QUICK_TIME_PRESETS = [
    { label: 'Morning', time: '09:00 AM' },
    { label: 'Noon', time: '12:00 PM' },
    { label: 'Afternoon', time: '03:00 PM' },
    { label: 'Evening', time: '06:00 PM' },
    { label: 'Night', time: '08:00 PM' }
];

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
    visible,
    currentTime,
    onSelect,
    onClose,
    title = 'Select Tournament Start Time'
}) => {
    const parseInitialTime = () => {
        let h = 9;
        let m = 0;
        let p: 'AM' | 'PM' = 'AM';

        if (currentTime && currentTime.trim()) {
            const raw = currentTime.trim();
            // Match "09:30 AM" or "9:30 PM"
            const match12 = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
            if (match12) {
                h = parseInt(match12[1], 10) || 9;
                m = parseInt(match12[2], 10) || 0;
                if (match12[3]) {
                    p = match12[3].toUpperCase() as 'AM' | 'PM';
                }
            } else {
                // Match 24hr format "14:30"
                const match24 = raw.match(/^(\d{1,2}):(\d{2})$/);
                if (match24) {
                    const rawH = parseInt(match24[1], 10) || 9;
                    m = parseInt(match24[2], 10) || 0;
                    if (rawH >= 12) {
                        p = 'PM';
                        h = rawH === 12 ? 12 : rawH - 12;
                    } else {
                        p = 'AM';
                        h = rawH === 0 ? 12 : rawH;
                    }
                }
            }
        }
        if (h < 1 || h > 12) h = 9;
        if (m < 0 || m > 59) m = 0;
        return { h, m, p };
    };

    const [hour, setHour] = useState<number>(9);
    const [minute, setMinute] = useState<number>(0);
    const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

    useEffect(() => {
        if (visible) {
            const parsed = parseInitialTime();
            setHour(parsed.h);
            setMinute(parsed.m);
            setPeriod(parsed.p);
        }
    }, [visible, currentTime]);

    if (!visible) return null;

    const handleStepMinute = (delta: number) => {
        setMinute(prev => {
            let next = prev + delta;
            if (next > 59) next = 0;
            if (next < 0) next = 59;
            return next;
        });
    };

    const handleApplyPreset = (timeStr: string) => {
        const parts = timeStr.match(/^(\d{2}):(\d{2})\s*(AM|PM)$/i);
        if (parts) {
            setHour(parseInt(parts[1], 10));
            setMinute(parseInt(parts[2], 10));
            setPeriod(parts[3].toUpperCase() as 'AM' | 'PM');
        }
    };

    const handleConfirm = () => {
        const formattedH = String(hour).padStart(2, '0');
        const formattedM = String(minute).padStart(2, '0');
        onSelect(`${formattedH}:${formattedM} ${period}`);
        onClose();
    };

    const formattedPreview = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={styles.dialogCard} onPress={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <View style={styles.dialogHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={styles.headerIconBox}>
                                <ClockIcon size={16} color="#2563eb" />
                            </View>
                            <View>
                                <Text style={styles.dialogTitle}>{title}</Text>
                                <Text style={styles.dialogSub}>Pick hour, minute and AM/PM</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <X size={16} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    {/* Large Clock Display */}
                    <View style={styles.clockDisplayRow}>
                        <View style={styles.clockDigitBox}>
                            <Text style={styles.clockDigitText}>{String(hour).padStart(2, '0')}</Text>
                            <Text style={styles.clockDigitLabel}>HOUR</Text>
                        </View>
                        <Text style={styles.clockColon}>:</Text>
                        <View style={styles.clockDigitBox}>
                            <Text style={styles.clockDigitText}>{String(minute).padStart(2, '0')}</Text>
                            <Text style={styles.clockDigitLabel}>MIN</Text>
                        </View>
                        <View style={styles.periodPillsCol}>
                            <TouchableOpacity
                                style={[styles.periodPill, period === 'AM' && styles.periodPillActive]}
                                onPress={() => setPeriod('AM')}
                            >
                                <Text style={[styles.periodPillText, period === 'AM' && styles.periodPillTextActive]}>AM</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.periodPill, period === 'PM' && styles.periodPillActive]}
                                onPress={() => setPeriod('PM')}
                            >
                                <Text style={[styles.periodPillText, period === 'PM' && styles.periodPillTextActive]}>PM</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
                        {/* Quick Presets */}
                        <Text style={styles.sectionHeading}>COMMON MATCH TIMES</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsRow}>
                            {QUICK_TIME_PRESETS.map((p, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={[styles.presetChip, formattedPreview === p.time && styles.presetChipActive]}
                                    onPress={() => handleApplyPreset(p.time)}
                                >
                                    <Text style={[styles.presetChipText, formattedPreview === p.time && styles.presetChipTextActive]}>
                                        {p.time}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Hour Selector (1-12) */}
                        <Text style={styles.sectionHeading}>SELECT HOUR</Text>
                        <View style={styles.gridRowWrap}>
                            {HOURS.map((h) => {
                                const isActive = hour === h;
                                return (
                                    <TouchableOpacity
                                        key={h}
                                        style={[styles.numBtn, isActive && styles.numBtnActive]}
                                        onPress={() => setHour(h)}
                                    >
                                        <Text style={[styles.numBtnText, isActive && styles.numBtnTextActive]}>
                                            {h}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Minute Selector (5-min intervals + stepper) */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 6 }}>
                            <Text style={[styles.sectionHeading, { marginTop: 0, marginBottom: 0 }]}>SELECT MINUTE</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <TouchableOpacity style={styles.stepperBtn} onPress={() => handleStepMinute(-1)}>
                                    <Minus size={12} color="#1e293b" />
                                </TouchableOpacity>
                                <Text style={styles.stepperValText}>{String(minute).padStart(2, '0')}</Text>
                                <TouchableOpacity style={styles.stepperBtn} onPress={() => handleStepMinute(1)}>
                                    <Plus size={12} color="#1e293b" />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={styles.gridRowWrap}>
                            {MINUTE_PRESETS.map((m) => {
                                const isActive = minute === m;
                                return (
                                    <TouchableOpacity
                                        key={m}
                                        style={[styles.numBtn, isActive && styles.numBtnActive]}
                                        onPress={() => setMinute(m)}
                                    >
                                        <Text style={[styles.numBtnText, isActive && styles.numBtnTextActive]}>
                                            :{String(m).padStart(2, '0')}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>

                    {/* Footer Actions */}
                    <View style={styles.dialogFooter}>
                        <TouchableOpacity style={styles.footerCancelBtn} onPress={onClose}>
                            <Text style={styles.footerCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.footerConfirmBtn} onPress={handleConfirm}>
                            <Check size={14} color="#ffffff" />
                            <Text style={styles.footerConfirmText}>Set Time ({formattedPreview})</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16
    },
    dialogCard: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 18,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    dialogHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9'
    },
    headerIconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#dbeafe',
        justifyContent: 'center',
        alignItems: 'center'
    },
    dialogTitle: {
        fontSize: 13,
        fontWeight: '900',
        color: '#0f172a'
    },
    dialogSub: {
        fontSize: 10.5,
        fontWeight: '500',
        color: '#64748b'
    },
    closeBtn: {
        padding: 6,
        borderRadius: 6,
        backgroundColor: '#f1f5f9'
    },

    // Date Picker Calendar Styles
    monthNavigator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10
    },
    navArrowBtn: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        justifyContent: 'center',
        alignItems: 'center'
    },
    monthYearText: {
        fontSize: 13,
        fontWeight: '900',
        color: '#0f172a'
    },
    daysRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9'
    },
    dayLabelText: {
        width: 38,
        textAlign: 'center',
        fontSize: 10,
        fontWeight: '800',
        color: '#64748b'
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingVertical: 6
    },
    dayCell: {
        width: 38,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 18,
        marginVertical: 2
    },
    dayCellSelected: {
        backgroundColor: '#2563eb',
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3
    },
    dayCellToday: {
        borderWidth: 1.5,
        borderColor: '#3b82f6',
        backgroundColor: '#eff6ff'
    },
    dayText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1e293b'
    },
    dayTextSelected: {
        color: '#ffffff',
        fontWeight: '900'
    },
    dayTextToday: {
        color: '#2563eb',
        fontWeight: '900'
    },
    dayTextMuted: {
        fontSize: 11,
        fontWeight: '500',
        color: '#cbd5e1'
    },
    quickBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9'
    },
    quickBtn: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    quickBtnText: {
        fontSize: 10.5,
        fontWeight: '800',
        color: '#2563eb'
    },
    previewDateText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#0f172a'
    },

    // Time Picker Styles
    clockDisplayRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 6
    },
    clockDigitBox: {
        width: 68,
        height: 58,
        borderRadius: 12,
        backgroundColor: '#f8fafc',
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        justifyContent: 'center',
        alignItems: 'center'
    },
    clockDigitText: {
        fontSize: 26,
        fontWeight: '900',
        color: '#0f172a'
    },
    clockDigitLabel: {
        fontSize: 8,
        fontWeight: '800',
        color: '#94a3b8',
        letterSpacing: 0.5
    },
    clockColon: {
        fontSize: 26,
        fontWeight: '900',
        color: '#94a3b8',
        marginHorizontal: 2
    },
    periodPillsCol: {
        flexDirection: 'column',
        gap: 4,
        marginLeft: 6
    },
    periodPill: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 7,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    periodPillActive: {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb'
    },
    periodPillText: {
        fontSize: 10.5,
        fontWeight: '900',
        color: '#64748b'
    },
    periodPillTextActive: {
        color: '#ffffff'
    },
    sectionHeading: {
        fontSize: 9.5,
        fontWeight: '900',
        color: '#64748b',
        letterSpacing: 0.5,
        marginTop: 10,
        marginBottom: 6
    },
    presetsRow: {
        flexDirection: 'row',
        paddingBottom: 4
    },
    presetChip: {
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 7,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginRight: 6
    },
    presetChipActive: {
        backgroundColor: '#eff6ff',
        borderColor: '#3b82f6'
    },
    presetChipText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#475569'
    },
    presetChipTextActive: {
        color: '#2563eb'
    },
    gridRowWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6
    },
    numBtn: {
        width: 44,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        justifyContent: 'center',
        alignItems: 'center'
    },
    numBtnActive: {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
        elevation: 2
    },
    numBtnText: {
        fontSize: 11.5,
        fontWeight: '800',
        color: '#1e293b'
    },
    numBtnTextActive: {
        color: '#ffffff',
        fontWeight: '900'
    },
    stepperBtn: {
        width: 22,
        height: 22,
        borderRadius: 5,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        justifyContent: 'center',
        alignItems: 'center'
    },
    stepperValText: {
        fontSize: 11.5,
        fontWeight: '900',
        color: '#0f172a',
        width: 24,
        textAlign: 'center'
    },

    // Dialog Footer
    dialogFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9'
    },
    footerCancelBtn: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 8,
        backgroundColor: '#f1f5f9'
    },
    footerCancelText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#64748b'
    },
    footerConfirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 8,
        backgroundColor: '#2563eb',
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2
    },
    footerConfirmText: {
        fontSize: 11.5,
        fontWeight: '900',
        color: '#ffffff'
    }
});
