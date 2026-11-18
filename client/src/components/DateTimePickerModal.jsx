import React, { useState, useEffect } from 'react';
import {
    Calendar as CalendarIcon,
    Clock as ClockIcon,
    ChevronLeft,
    ChevronRight,
    Check,
    X,
    Plus,
    Minus
} from 'lucide-react';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// ==========================================
// 1. WEB DATE PICKER MODAL
// ==========================================
export const WebDatePickerModal = ({
    isOpen,
    onClose,
    currentDate,
    onSelect,
    title = 'Select Tournament Start Date'
}) => {
    const parseInitialDate = () => {
        if (currentDate && /^\d{4}-\d{2}-\d{2}$/.test(currentDate)) {
            const [y, m, d] = currentDate.split('-').map(Number);
            return new Date(y, m - 1, d);
        }
        return new Date();
    };

    const [viewDate, setViewDate] = useState(parseInitialDate);
    const [selectedDate, setSelectedDate] = useState(() => {
        if (currentDate && /^\d{4}-\d{2}-\d{2}$/.test(currentDate)) {
            const [y, m, d] = currentDate.split('-').map(Number);
            return new Date(y, m - 1, d);
        }
        return null;
    });

    useEffect(() => {
        if (isOpen) {
            const init = parseInitialDate();
            setViewDate(init);
            if (currentDate && /^\d{4}-\d{2}-\d{2}$/.test(currentDate)) {
                setSelectedDate(init);
            }
        }
    }, [isOpen, currentDate]);

    if (!isOpen) return null;

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const handlePrevMonth = (e) => {
        e.preventDefault();
        setViewDate(new Date(year, month - 1, 1));
    };

    const handleNextMonth = (e) => {
        e.preventDefault();
        setViewDate(new Date(year, month + 1, 1));
    };

    const handleSelectDay = (day) => {
        setSelectedDate(new Date(year, month, day));
    };

    const handleQuickToday = (e) => {
        e.preventDefault();
        const now = new Date();
        setViewDate(now);
        setSelectedDate(now);
    };

    const handleClear = (e) => {
        e.preventDefault();
        setSelectedDate(null);
        onSelect('');
        onClose();
    };

    const handleConfirm = (e) => {
        e.preventDefault();
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
    const isToday = (day) =>
        today.getFullYear() === year &&
        today.getMonth() === month &&
        today.getDate() === day;

    const isSelected = (day) =>
        selectedDate !== null &&
        selectedDate.getFullYear() === year &&
        selectedDate.getMonth() === month &&
        selectedDate.getDate() === day;

    // Build 6 weeks x 7 days matrix
    const matrix = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
        matrix.push({ day: prevMonthTotalDays - i, inMonth: false });
    }
    for (let d = 1; d <= totalDaysInMonth; d++) {
        matrix.push({ day: d, inMonth: true });
    }
    const remaining = (7 - (matrix.length % 7)) % 7;
    for (let t = 1; t <= remaining; t++) {
        matrix.push({ day: t, inMonth: false });
    }

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xs shadow-2xl p-4 animate-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                            <CalendarIcon className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-xs font-black text-slate-900 leading-tight">{title}</h3>
                            <p className="text-[10px] text-slate-500 font-medium">Click to select start date</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Month / Year Navigator */}
                <div className="flex items-center justify-between py-2.5">
                    <button
                        type="button"
                        onClick={handlePrevMonth}
                        className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-black text-slate-900">
                        {MONTH_NAMES[month]} {year}
                    </span>
                    <button
                        type="button"
                        onClick={handleNextMonth}
                        className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Day Labels */}
                <div className="grid grid-cols-7 gap-1 text-center pb-1.5 border-b border-slate-100 text-[10px] font-black text-slate-500">
                    {DAY_LABELS.map((lbl, idx) => (
                        <span key={idx} className={idx === 0 || idx === 6 ? 'text-red-500' : ''}>
                            {lbl}
                        </span>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1 py-2 text-center text-xs">
                    {matrix.map((cell, idx) => {
                        if (!cell.inMonth) {
                            return (
                                <span key={idx} className="w-8 h-8 flex items-center justify-center text-slate-300 text-[11px] mx-auto select-none">
                                    {cell.day}
                                </span>
                            );
                        }

                        const active = isSelected(cell.day);
                        const currentDay = isToday(cell.day);

                        return (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => handleSelectDay(cell.day)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto text-xs font-bold transition-all ${
                                    active
                                        ? 'bg-blue-600 text-white font-black shadow-xs scale-105'
                                        : currentDay
                                        ? 'border border-blue-500 bg-blue-50 text-blue-700 font-black'
                                        : 'hover:bg-slate-100 text-slate-800'
                                }`}
                            >
                                {cell.day}
                            </button>
                        );
                    })}
                </div>

                {/* Quick Selection Toolbar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={handleQuickToday}
                            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 font-bold text-blue-700 transition-colors text-[10.5px]"
                        >
                            Today
                        </button>
                        {selectedDate && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 font-bold text-red-600 transition-colors text-[10.5px]"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    <span className="text-[10.5px] font-black text-slate-700">
                        {selectedDate ? selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date'}
                    </span>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-2 pt-2.5 mt-2 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-1 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="px-3 py-1 rounded-lg text-xs font-black text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1 shadow-xs transition-colors"
                    >
                        <Check className="w-3.5 h-3.5" />
                        Set Date
                    </button>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 2. WEB TIME PICKER MODAL
// ==========================================
const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTE_PRESETS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const QUICK_TIME_PRESETS = [
    { label: 'Morning', time: '09:00 AM' },
    { label: 'Noon', time: '12:00 PM' },
    { label: 'Afternoon', time: '03:00 PM' },
    { label: 'Evening', time: '06:00 PM' },
    { label: 'Night', time: '08:00 PM' }
];

export const WebTimePickerModal = ({
    isOpen,
    onClose,
    currentTime,
    onSelect,
    title = 'Select Tournament Start Time'
}) => {
    const parseInitialTime = () => {
        let h = 9;
        let m = 0;
        let p = 'AM';

        if (currentTime && currentTime.trim()) {
            const raw = currentTime.trim();
            const match12 = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
            if (match12) {
                h = parseInt(match12[1], 10) || 9;
                m = parseInt(match12[2], 10) || 0;
                if (match12[3]) p = match12[3].toUpperCase();
            } else {
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

    const [hour, setHour] = useState(9);
    const [minute, setMinute] = useState(0);
    const [period, setPeriod] = useState('AM');

    useEffect(() => {
        if (isOpen) {
            const parsed = parseInitialTime();
            setHour(parsed.h);
            setMinute(parsed.m);
            setPeriod(parsed.p);
        }
    }, [isOpen, currentTime]);

    if (!isOpen) return null;

    const handleStepMinute = (delta, e) => {
        e.preventDefault();
        setMinute(prev => {
            let next = prev + delta;
            if (next > 59) next = 0;
            if (next < 0) next = 59;
            return next;
        });
    };

    const handleApplyPreset = (presetTime, e) => {
        e.preventDefault();
        const parts = presetTime.match(/^(\d{2}):(\d{2})\s*(AM|PM)$/i);
        if (parts) {
            setHour(parseInt(parts[1], 10));
            setMinute(parseInt(parts[2], 10));
            setPeriod(parts[3].toUpperCase());
        }
    };

    const handleConfirm = (e) => {
        e.preventDefault();
        const formattedH = String(hour).padStart(2, '0');
        const formattedM = String(minute).padStart(2, '0');
        onSelect(`${formattedH}:${formattedM} ${period}`);
        onClose();
    };

    const formattedPreview = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xs shadow-2xl p-4 animate-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                            <ClockIcon className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-xs font-black text-slate-900 leading-tight">{title}</h3>
                            <p className="text-[10px] text-slate-500 font-medium">Pick hour, minute and AM/PM</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Digital Clock Banner */}
                <div className="flex items-center justify-center py-3.5 gap-2">
                    <div className="w-16 h-14 rounded-xl bg-slate-50 border-2 border-slate-200 flex flex-col items-center justify-center">
                        <span className="text-xl font-black text-slate-900">{String(hour).padStart(2, '0')}</span>
                        <span className="text-[8px] font-black text-slate-400 tracking-wider">HOUR</span>
                    </div>
                    <span className="text-xl font-black text-slate-400">:</span>
                    <div className="w-16 h-14 rounded-xl bg-slate-50 border-2 border-slate-200 flex flex-col items-center justify-center">
                        <span className="text-xl font-black text-slate-900">{String(minute).padStart(2, '0')}</span>
                        <span className="text-[8px] font-black text-slate-400 tracking-wider">MIN</span>
                    </div>
                    <div className="flex flex-col gap-1 ml-1.5">
                        <button
                            type="button"
                            onClick={() => setPeriod('AM')}
                            className={`px-2.5 py-1 rounded-md text-[10.5px] font-black transition-all ${
                                period === 'AM'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            AM
                        </button>
                        <button
                            type="button"
                            onClick={() => setPeriod('PM')}
                            className={`px-2.5 py-1 rounded-md text-[10.5px] font-black transition-all ${
                                period === 'PM'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            PM
                        </button>
                    </div>
                </div>

                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-0.5">
                    {/* Common Match Presets */}
                    <div>
                        <span className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                            COMMON MATCH TIMES
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {QUICK_TIME_PRESETS.map((p, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={(e) => handleApplyPreset(p.time, e)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                                        formattedPreview === p.time
                                            ? 'bg-blue-50 border-blue-400 text-blue-700'
                                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                    }`}
                                >
                                    {p.time}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Hour Selector (1-12) */}
                    <div>
                        <span className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                            SELECT HOUR
                        </span>
                        <div className="grid grid-cols-6 gap-1.5">
                            {HOURS.map((h) => {
                                const isActive = hour === h;
                                return (
                                    <button
                                        key={h}
                                        type="button"
                                        onClick={() => setHour(h)}
                                        className={`py-1 rounded-lg text-xs font-bold border transition-all ${
                                            isActive
                                                ? 'bg-blue-600 border-blue-600 text-white font-black shadow-xs'
                                                : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                                        }`}
                                    >
                                        {h}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Minute Selector */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider">
                                SELECT MINUTE
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={(e) => handleStepMinute(-1, e)}
                                    className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700"
                                >
                                    <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-xs font-black text-slate-900 w-6 text-center">
                                    {String(minute).padStart(2, '0')}
                                </span>
                                <button
                                    type="button"
                                    onClick={(e) => handleStepMinute(1, e)}
                                    className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700"
                                >
                                    <Plus className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-6 gap-1.5">
                            {MINUTE_PRESETS.map((m) => {
                                const isActive = minute === m;
                                return (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => setMinute(m)}
                                        className={`py-1 rounded-lg text-xs font-bold border transition-all ${
                                            isActive
                                                ? 'bg-blue-600 border-blue-600 text-white font-black shadow-xs'
                                                : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                                        }`}
                                    >
                                        :{String(m).padStart(2, '0')}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-2 pt-2.5 mt-2 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-1 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="px-3 py-1 rounded-lg text-xs font-black text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1 shadow-xs transition-colors"
                    >
                        <Check className="w-3.5 h-3.5" />
                        Set Time ({formattedPreview})
                    </button>
                </div>
            </div>
        </div>
    );
};
