import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator
} from 'react-native';
import {
    Mic,
    MicOff,
    PhoneCall,
    PhoneOff,
    Hand,
    Volume2,
    VolumeX,
    ShieldAlert,
    Crown,
    Wifi,
    WifiOff,
    AlertCircle
} from 'lucide-react-native';
import SafeImage from '../SafeImage';
import { VoiceParticipant } from '../../hooks/useVoiceChat';

interface VoiceChatPanelProps {
    voice: ReturnType<typeof import('../../hooks/useVoiceChat').useVoiceChat>;
    isModerator?: boolean;
}

export const VoiceChatPanel: React.FC<VoiceChatPanelProps> = ({
    voice,
    isModerator = false
}) => {
    const {
        voiceStatus,
        voiceError,
        participants,
        selfSocketId,
        isJoined,
        isConnecting,
        isMicOn,
        isAdminMuted,
        isHandRaised,
        isSpeakerOn,
        moderatorNotice,
        isNativeWebRTCAvailable,
        joinVoiceRoom,
        leaveVoiceRoom,
        toggleMic,
        toggleSpeaker,
        toggleHand,
        muteParticipant,
        unmuteParticipant,
        muteAll,
        unmuteAll,
        lowerParticipantHand
    } = voice;

    const raisedHandsQueue = participants
        .filter((p) => p.isHandRaised)
        .sort((a, b) => (a.handRaisedAt || 0) - (b.handRaisedAt || 0));

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>🎙️ Live Auction Voice Room</Text>
                    <Text style={styles.subtitle}>Real-time audio-only room for Admin &amp; Owners</Text>
                </View>

                {!isJoined ? (
                    <TouchableOpacity
                        style={[styles.joinBtn, isConnecting && { opacity: 0.7 }]}
                        onPress={joinVoiceRoom}
                        disabled={isConnecting}
                    >
                        {isConnecting ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                            <PhoneCall size={15} color="#ffffff" />
                        )}
                        <Text style={styles.joinBtnText}>
                            {isConnecting ? 'Connecting...' : 'Join Voice'}
                        </Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.leaveBtn} onPress={leaveVoiceRoom}>
                        <PhoneOff size={14} color="#ffffff" />
                        <Text style={styles.leaveBtnText}>Leave</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Connection Status Pill */}
            <View
                style={[
                    styles.statusPill,
                    voiceStatus === 'connected'
                        ? styles.statusConnected
                        : voiceStatus === 'error'
                            ? styles.statusError
                            : styles.statusOffline
                ]}
            >
                {voiceStatus === 'connected' ? (
                    <Wifi size={13} color="#059669" />
                ) : voiceStatus === 'error' ? (
                    <AlertCircle size={13} color="#e11d48" />
                ) : (
                    <WifiOff size={13} color="#64748b" />
                )}
                <Text
                    style={[
                        styles.statusText,
                        voiceStatus === 'connected'
                            ? { color: '#047857' }
                            : voiceStatus === 'error'
                                ? { color: '#be123c' }
                                : { color: '#475569' }
                    ]}
                >
                    {voiceStatus === 'connected'
                        ? `Live Audio • ${participants.length} Connected`
                        : voiceStatus === 'connecting'
                            ? 'Connecting Voice...'
                            : voiceStatus === 'error'
                                ? 'Voice Error'
                                : 'Voice Offline'}
                </Text>
            </View>

            {!isNativeWebRTCAvailable && (
                <View style={[styles.errorBanner, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
                    <AlertCircle size={14} color="#d97706" />
                    <Text style={[styles.errorText, { color: '#92400e' }]}>
                        Native WebRTC module not found in Expo Go. Use an EAS Development or Preview APK build for live voice.
                    </Text>
                </View>
            )}

            {voiceError && (
                <View style={styles.errorBanner}>
                    <AlertCircle size={14} color="#e11d48" />
                    <Text style={styles.errorText}>{voiceError}</Text>
                </View>
            )}

            {isJoined && isAdminMuted && (
                <View style={styles.errorBanner}>
                    <ShieldAlert size={14} color="#e11d48" />
                    <Text style={styles.errorText}>
                        {moderatorNotice || 'You have been muted by the Admin. Only the Admin can unmute you.'}
                    </Text>
                </View>
            )}

            {/* Admin Moderation Toolbar */}
            {isJoined && isModerator && (
                <View style={styles.modToolbar}>
                    <Text style={styles.modLabel}>MODERATOR</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity style={styles.modMuteAllBtn} onPress={muteAll}>
                            <VolumeX size={13} color="#be123c" />
                            <Text style={styles.modMuteAllText}>Mute All</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modUnmuteAllBtn} onPress={unmuteAll}>
                            <Volume2 size={13} color="#047857" />
                            <Text style={styles.modUnmuteAllText}>Unmute All</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Raised Hands Queue */}
            {isJoined && raisedHandsQueue.length > 0 && (
                <View style={styles.handQueueBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <Hand size={13} color="#d97706" />
                        <Text style={styles.handQueueTitle}>
                            Raised Hands ({raisedHandsQueue.length})
                        </Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                        {raisedHandsQueue.map((p) => (
                            <View key={p.socketId} style={styles.handQueueChip}>
                                <Text style={styles.handQueueChipName}>{p.name}</Text>
                                {isModerator && p.socketId !== selfSocketId && (
                                    <TouchableOpacity onPress={() => lowerParticipantHand(p.socketId)}>
                                        <Text style={styles.handQueueLower}>Lower</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Responsive Square Participants Grid */}
            {participants.length === 0 ? (
                <View style={styles.emptyBox}>
                    <Text style={styles.emptyTitle}>No one in Voice Room yet</Text>
                    <Text style={styles.emptySub}>Tap &quot;Join Voice&quot; to talk live with Admins &amp; Team Owners.</Text>
                </View>
            ) : (
                <View style={styles.grid}>
                    {participants.map((p: VoiceParticipant) => {
                        const isSelf = p.socketId === selfSocketId;
                        const isEffectiveOn = Boolean(p.isEffectiveMicOn);
                        const isSpeaking = Boolean(p.isSpeaking) && isEffectiveOn;

                        return (
                            <View
                                key={p.socketId}
                                style={[
                                    styles.card,
                                    isSpeaking && styles.cardSpeaking,
                                    isSelf && !isSpeaking && styles.cardSelf
                                ]}
                            >
                                {/* Top Row: Name + You + Hand */}
                                <View style={styles.cardTop}>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                            <Text
                                                numberOfLines={1}
                                                style={[
                                                    styles.cardName,
                                                    p.isModerator
                                                        ? { color: '#b45309' }
                                                        : isSelf
                                                            ? { color: '#047857' }
                                                            : { color: '#1d4ed8' }
                                                ]}
                                            >
                                                {p.name}
                                            </Text>
                                            {isSelf && (
                                                <View style={styles.youBadge}>
                                                    <Text style={styles.youBadgeText}>YOU</Text>
                                                </View>
                                            )}
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                                            {p.isModerator && <Crown size={10} color="#d97706" />}
                                            <Text numberOfLines={1} style={styles.cardRole}>
                                                {p.roleLabel}{p.teamName ? ` • ${p.teamName}` : ''}
                                            </Text>
                                        </View>
                                    </View>

                                    {p.isHandRaised && (
                                        <View style={styles.handBadge}>
                                            <Hand size={11} color="#b45309" />
                                        </View>
                                    )}
                                </View>

                                {/* Middle Row: Avatar + Speaking/Mic Indicator */}
                                <View style={styles.cardMid}>
                                    {p.avatar ? (
                                        <SafeImage
                                            uri={p.avatar}
                                            style={[
                                                styles.avatar,
                                                isSpeaking && { borderColor: '#10b981' }
                                            ]}
                                            fallback={
                                                <View style={[styles.avatarFallback, isSpeaking && { borderColor: '#10b981', backgroundColor: '#d1fae5' }]}>
                                                    <Text style={[styles.avatarFallbackText, isSpeaking && { color: '#047857' }]}>
                                                        {(p.name || 'P').charAt(0).toUpperCase()}
                                                    </Text>
                                                </View>
                                            }
                                        />
                                    ) : (
                                        <View style={[styles.avatarFallback, isSpeaking && { borderColor: '#10b981', backgroundColor: '#d1fae5' }]}>
                                            <Text style={[styles.avatarFallbackText, isSpeaking && { color: '#047857' }]}>
                                                {(p.name || 'P').charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                    )}

                                    <View style={{ alignItems: 'flex-end' }}>
                                        {isSpeaking ? (
                                            <View style={styles.waveContainer}>
                                                <View style={[styles.waveBar, { height: 8 }]} />
                                                <View style={[styles.waveBar, { height: 15 }]} />
                                                <View style={[styles.waveBar, { height: 19 }]} />
                                                <View style={[styles.waveBar, { height: 12 }]} />
                                                <View style={[styles.waveBar, { height: 7 }]} />
                                            </View>
                                        ) : p.isAdminMuted ? (
                                            <View style={styles.adminMutedPill}>
                                                <ShieldAlert size={10} color="#be123c" />
                                                <Text style={styles.adminMutedText}>Admin Muted</Text>
                                            </View>
                                        ) : !isEffectiveOn ? (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                <MicOff size={13} color="#e11d48" />
                                                <Text style={{ fontSize: 10, color: '#e11d48', fontWeight: '700' }}>Muted</Text>
                                            </View>
                                        ) : (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                <Mic size={13} color="#059669" />
                                                <Text style={{ fontSize: 10, color: '#059669', fontWeight: '700' }}>Live</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                {/* Bottom Row: Self controls OR Admin moderation controls */}
                                <View style={styles.cardBottom}>
                                    {isSelf ? (
                                        <View style={{ flexDirection: 'row', gap: 6, flex: 1 }}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.cardBtn,
                                                    p.isAdminMuted
                                                        ? styles.cardBtnLocked
                                                        : isEffectiveOn
                                                            ? styles.cardBtnActive
                                                            : styles.cardBtnMuted
                                                ]}
                                                onPress={toggleMic}
                                                disabled={p.isAdminMuted}
                                            >
                                                {isEffectiveOn ? (
                                                    <Mic size={11} color="#047857" />
                                                ) : (
                                                    <MicOff size={11} color="#be123c" />
                                                )}
                                                <Text
                                                    style={[
                                                        styles.cardBtnText,
                                                        isEffectiveOn && !p.isAdminMuted
                                                            ? { color: '#047857' }
                                                            : p.isAdminMuted
                                                                ? { color: '#be123c' }
                                                                : { color: '#334155' }
                                                    ]}
                                                >
                                                    {p.isAdminMuted ? 'Locked' : isEffectiveOn ? 'Mute' : 'Unmute'}
                                                </Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[
                                                    styles.cardHandBtn,
                                                    p.isHandRaised && styles.cardHandBtnActive
                                                ]}
                                                onPress={toggleHand}
                                            >
                                                <Hand size={11} color={p.isHandRaised ? '#b45309' : '#475569'} />
                                            </TouchableOpacity>
                                        </View>
                                    ) : isModerator ? (
                                        <View style={{ flexDirection: 'row', gap: 6, flex: 1 }}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.cardBtn,
                                                    p.isAdminMuted ? styles.cardBtnActive : styles.cardBtnLocked
                                                ]}
                                                onPress={() =>
                                                    p.isAdminMuted
                                                        ? unmuteParticipant(p.socketId)
                                                        : muteParticipant(p.socketId)
                                                }
                                            >
                                                {p.isAdminMuted ? (
                                                    <>
                                                        <Mic size={11} color="#047857" />
                                                        <Text style={[styles.cardBtnText, { color: '#047857' }]}>Unmute</Text>
                                                    </>
                                                ) : (
                                                    <>
                                                        <MicOff size={11} color="#be123c" />
                                                        <Text style={[styles.cardBtnText, { color: '#be123c' }]}>Mute</Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                            {p.isHandRaised && (
                                                <TouchableOpacity
                                                    style={styles.cardHandBtnActive}
                                                    onPress={() => lowerParticipantHand(p.socketId)}
                                                >
                                                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#b45309' }}>↓ ✋</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    ) : (
                                        <Text style={styles.cardStatusHint}>
                                            {p.isAdminMuted
                                                ? 'Muted by Admin'
                                                : isEffectiveOn
                                                    ? isSpeaking
                                                        ? 'Speaking...'
                                                        : 'Mic ON'
                                                    : 'Mic Muted'}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}

            {/* Light Theme Bottom Call Bar */}
            {isJoined && (
                <View style={styles.bottomBar}>
                    <TouchableOpacity
                        style={[styles.barBtn, isSpeakerOn && styles.barBtnActive]}
                        onPress={toggleSpeaker}
                    >
                        {isSpeakerOn ? (
                            <Volume2 size={16} color="#ffffff" />
                        ) : (
                            <VolumeX size={16} color="#475569" />
                        )}
                        <Text style={[styles.barBtnLabel, isSpeakerOn && { color: '#ffffff' }]}>
                            {isSpeakerOn ? 'Speaker' : 'Earpiece'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.barBtn,
                            isAdminMuted
                                ? styles.barBtnDanger
                                : isMicOn
                                    ? styles.barBtnMicOn
                                    : styles.barBtnMuted
                        ]}
                        onPress={toggleMic}
                    >
                        {isMicOn && !isAdminMuted ? (
                            <Mic size={16} color="#ffffff" />
                        ) : (
                            <MicOff size={16} color={isAdminMuted ? '#ffffff' : '#e11d48'} />
                        )}
                        <Text
                            style={[
                                styles.barBtnLabel,
                                (isAdminMuted || isMicOn) && { color: '#ffffff' }
                            ]}
                        >
                            {isAdminMuted ? 'Admin Muted' : isMicOn ? 'Mic ON' : 'Mic OFF'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.barBtn, isHandRaised && styles.barBtnHand]}
                        onPress={toggleHand}
                    >
                        <Hand size={16} color={isHandRaised ? '#ffffff' : '#475569'} />
                        <Text style={[styles.barBtnLabel, isHandRaised && { color: '#ffffff' }]}>
                            {isHandRaised ? 'Lower' : 'Hand'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.barBtnLeave} onPress={leaveVoiceRoom}>
                        <PhoneOff size={16} color="#ffffff" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#f8fafc',
        borderRadius: 20,
        padding: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        gap: 12
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10
    },
    title: {
        color: '#0f172a',
        fontSize: 15,
        fontWeight: '900'
    },
    subtitle: {
        color: '#64748b',
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2
    },
    joinBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#059669',
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 12
    },
    joinBtnText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '900'
    },
    leaveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#e11d48',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12
    },
    leaveBtnText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '800'
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1
    },
    statusConnected: {
        backgroundColor: '#ecfdf5',
        borderColor: '#a7f3d0'
    },
    statusError: {
        backgroundColor: '#fff1f2',
        borderColor: '#fecdd3'
    },
    statusOffline: {
        backgroundColor: '#f1f5f9',
        borderColor: '#cbd5e1'
    },
    statusText: {
        fontSize: 11,
        fontWeight: '800'
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#fff1f2',
        borderColor: '#fecdd3',
        borderWidth: 1,
        padding: 10,
        borderRadius: 12
    },
    errorText: {
        flex: 1,
        color: '#be123c',
        fontSize: 11,
        fontWeight: '700'
    },
    modToolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    modLabel: {
        color: '#b45309',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.7
    },
    modMuteAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#fff1f2',
        borderColor: '#fecdd3',
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8
    },
    modMuteAllText: {
        color: '#be123c',
        fontSize: 11,
        fontWeight: '800'
    },
    modUnmuteAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#ecfdf5',
        borderColor: '#a7f3d0',
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8
    },
    modUnmuteAllText: {
        color: '#047857',
        fontSize: 11,
        fontWeight: '800'
    },
    handQueueBox: {
        backgroundColor: '#fffbeb',
        borderColor: '#fde68a',
        borderWidth: 1,
        borderRadius: 12,
        padding: 10
    },
    handQueueTitle: {
        color: '#92400e',
        fontSize: 11,
        fontWeight: '900'
    },
    handQueueChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#ffffff',
        borderColor: '#fcd34d',
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8
    },
    handQueueChipName: {
        color: '#78350f',
        fontSize: 11,
        fontWeight: '700'
    },
    handQueueLower: {
        color: '#b45309',
        fontSize: 10,
        fontWeight: '900',
        textDecorationLine: 'underline'
    },
    emptyBox: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#cbd5e1'
    },
    emptyTitle: {
        color: '#334155',
        fontSize: 13,
        fontWeight: '800'
    },
    emptySub: {
        color: '#64748b',
        fontSize: 11,
        textAlign: 'center',
        marginTop: 4
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10
    },
    card: {
        width: '48.2%',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 10,
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        justifyContent: 'space-between',
        minHeight: 145
    },
    cardSpeaking: {
        borderColor: '#10b981',
        backgroundColor: '#ecfdf5'
    },
    cardSelf: {
        borderColor: '#fcd34d',
        backgroundColor: '#fffdf5'
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 4
    },
    cardName: {
        fontSize: 12,
        fontWeight: '900',
        maxWidth: '72%'
    },
    youBadge: {
        backgroundColor: '#fef3c7',
        borderColor: '#fcd34d',
        borderWidth: 1,
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4
    },
    youBadgeText: {
        color: '#92400e',
        fontSize: 8,
        fontWeight: '900'
    },
    cardRole: {
        color: '#64748b',
        fontSize: 10,
        fontWeight: '700'
    },
    handBadge: {
        backgroundColor: '#fef3c7',
        borderColor: '#fcd34d',
        borderWidth: 1,
        padding: 4,
        borderRadius: 8
    },
    cardMid: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginVertical: 10
    },
    avatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 2,
        borderColor: '#cbd5e1'
    },
    avatarFallback: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#f1f5f9',
        borderWidth: 2,
        borderColor: '#cbd5e1',
        alignItems: 'center',
        justifyContent: 'center'
    },
    avatarFallbackText: {
        color: '#334155',
        fontSize: 15,
        fontWeight: '900'
    },
    waveContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2.5,
        height: 22
    },
    waveBar: {
        width: 3,
        backgroundColor: '#10b981',
        borderRadius: 2
    },
    adminMutedPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#fff1f2',
        borderColor: '#fecdd3',
        borderWidth: 1,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6
    },
    adminMutedText: {
        color: '#be123c',
        fontSize: 9,
        fontWeight: '800'
    },
    cardBottom: {
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        flexDirection: 'row',
        alignItems: 'center'
    },
    cardBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1
    },
    cardBtnActive: {
        backgroundColor: '#ecfdf5',
        borderColor: '#a7f3d0'
    },
    cardBtnMuted: {
        backgroundColor: '#f1f5f9',
        borderColor: '#cbd5e1'
    },
    cardBtnLocked: {
        backgroundColor: '#fff1f2',
        borderColor: '#fecdd3'
    },
    cardBtnText: {
        color: '#334155',
        fontSize: 10,
        fontWeight: '800'
    },
    cardHandBtn: {
        backgroundColor: '#f1f5f9',
        borderColor: '#cbd5e1',
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center'
    },
    cardHandBtnActive: {
        backgroundColor: '#fef3c7',
        borderColor: '#fcd34d',
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center'
    },
    cardStatusHint: {
        flex: 1,
        textAlign: 'center',
        color: '#64748b',
        fontSize: 10,
        fontWeight: '700'
    },
    bottomBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        padding: 10,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        gap: 8
    },
    barBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#f1f5f9'
    },
    barBtnActive: {
        backgroundColor: '#2563eb'
    },
    barBtnMicOn: {
        backgroundColor: '#059669'
    },
    barBtnMuted: {
        backgroundColor: '#f1f5f9'
    },
    barBtnDanger: {
        backgroundColor: '#e11d48'
    },
    barBtnHand: {
        backgroundColor: '#f59e0b'
    },
    barBtnLabel: {
        color: '#334155',
        fontSize: 11,
        fontWeight: '800'
    },
    barBtnLeave: {
        backgroundColor: '#e11d48',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center'
    }
});

export default VoiceChatPanel;
