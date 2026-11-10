import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Platform
} from 'react-native';
import {
    CheckCircle2,
    AlertCircle,
    AlertTriangle,
    Info,
    X,
    Share2
} from 'lucide-react-native';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastPayload {
    id: number;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
    actionLabel?: string;
    onAction?: () => void;
}

type Listener = (toast: ToastPayload | null) => void;
const listeners = new Set<Listener>();
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let counter = 0;

const notifyListeners = (payload: ToastPayload | null) => {
    listeners.forEach(fn => {
        try {
            fn(payload);
        } catch {}
    });
};

export const toast = {
    show(
        type: ToastType,
        title: string,
        message?: string,
        options?: { duration?: number; actionLabel?: string; onAction?: () => void }
    ) {
        if (hideTimer) clearTimeout(hideTimer);
        const id = ++counter;
        const duration = options?.duration ?? (options?.actionLabel ? 4500 : 3200);
        notifyListeners({
            id,
            type,
            title,
            message,
            duration,
            actionLabel: options?.actionLabel,
            onAction: options?.onAction
        });

        hideTimer = setTimeout(() => {
            notifyListeners(null);
        }, duration);
    },

    success(title: string, message?: string, options?: { duration?: number; actionLabel?: string; onAction?: () => void }) {
        this.show('success', title, message, options);
    },

    error(title: string, message?: string, options?: { duration?: number; actionLabel?: string; onAction?: () => void }) {
        this.show('error', title, message, options);
    },

    warning(title: string, message?: string, options?: { duration?: number; actionLabel?: string; onAction?: () => void }) {
        this.show('warning', title, message, options);
    },

    info(title: string, message?: string, options?: { duration?: number; actionLabel?: string; onAction?: () => void }) {
        this.show('info', title, message, options);
    },

    dismiss() {
        if (hideTimer) clearTimeout(hideTimer);
        notifyListeners(null);
    }
};

export const ToastOverlay: React.FC<{ isModal?: boolean }> = ({ isModal = false }) => {
    const [current, setCurrent] = useState<ToastPayload | null>(null);
    const translateY = useRef(new Animated.Value(-100)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const listener: Listener = (payload) => {
            if (payload) {
                setCurrent(payload);
                translateY.setValue(-80);
                opacity.setValue(0);
                Animated.parallel([
                    Animated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 80,
                        friction: 10
                    }),
                    Animated.timing(opacity, {
                        toValue: 1,
                        duration: 180,
                        useNativeDriver: true
                    })
                ]).start();
            } else {
                Animated.parallel([
                    Animated.timing(translateY, {
                        toValue: -80,
                        duration: 180,
                        useNativeDriver: true
                    }),
                    Animated.timing(opacity, {
                        toValue: 0,
                        duration: 180,
                        useNativeDriver: true
                    })
                ]).start(() => setCurrent(null));
            }
        };

        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    }, []);

    if (!current) return null;

    const themeMap = {
        success: {
            bg: '#f0fdf4',
            border: '#86efac',
            iconBg: '#dcfce7',
            titleColor: '#14532d',
            msgColor: '#166534',
            accent: '#16a34a',
            Icon: CheckCircle2
        },
        error: {
            bg: '#fef2f2',
            border: '#fca5a5',
            iconBg: '#fee2e2',
            titleColor: '#7f1d1d',
            msgColor: '#991b1b',
            accent: '#dc2626',
            Icon: AlertCircle
        },
        warning: {
            bg: '#fffbeb',
            border: '#fde68a',
            iconBg: '#fef3c7',
            titleColor: '#78350f',
            msgColor: '#92400e',
            accent: '#d97706',
            Icon: AlertTriangle
        },
        info: {
            bg: '#eff6ff',
            border: '#bfdbfe',
            iconBg: '#dbeafe',
            titleColor: '#1e3a8a',
            msgColor: '#1e40af',
            accent: '#2563eb',
            Icon: Info
        }
    };

    const t = themeMap[current.type];
    const IconComp = t.Icon;

    return (
        <Animated.View
            pointerEvents="box-none"
            style={[
                styles.wrapper,
                {
                    top: isModal ? (Platform.OS === 'ios' ? 46 : 18) : (Platform.OS === 'ios' ? 54 : 38),
                    transform: [{ translateY }],
                    opacity
                }
            ]}
        >
            <View
                style={[
                    styles.card,
                    {
                        backgroundColor: t.bg,
                        borderColor: t.border
                    }
                ]}
            >
                <View style={[styles.iconBox, { backgroundColor: t.iconBg }]}>
                    <IconComp size={18} color={t.accent} />
                </View>

                <View style={styles.textWrap}>
                    <Text style={[styles.title, { color: t.titleColor }]} numberOfLines={1}>
                        {current.title}
                    </Text>
                    {current.message ? (
                        <Text style={[styles.message, { color: t.msgColor }]} numberOfLines={3}>
                            {current.message}
                        </Text>
                    ) : null}
                </View>

                {current.actionLabel && current.onAction ? (
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: t.accent }]}
                        onPress={() => {
                            const fn = current.onAction;
                            toast.dismiss();
                            fn?.();
                        }}
                    >
                        <Share2 size={11} color="#ffffff" />
                        <Text style={styles.actionBtnText}>{current.actionLabel}</Text>
                    </TouchableOpacity>
                ) : null}

                <TouchableOpacity onPress={() => toast.dismiss()} style={styles.closeBtn}>
                    <X size={15} color={t.msgColor} />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        left: 14,
        right: 14,
        zIndex: 99999,
        elevation: 999,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: 16,
        paddingVertical: 10,
        paddingHorizontal: 12,
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.14,
        shadowRadius: 12,
        elevation: 12,
        gap: 10,
    },
    iconBox: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    textWrap: {
        flex: 1,
    },
    title: {
        fontSize: 13,
        fontWeight: '900',
    },
    message: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
        lineHeight: 15,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    actionBtnText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '800',
    },
    closeBtn: {
        padding: 4,
    },
});

