import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    Alert,
    Platform
} from 'react-native';
import {
    Play,
    Users,
    KeyRound,
    Share2,
    UserPlus,
    Edit3,
    Eye,
    X,
    Trophy,
    Copy,
    Check,
    Layers,
    Trash2
} from 'lucide-react-native';
import { apiFetch } from '../lib/api';

interface TournamentHubModalProps {
    visible: boolean;
    tournament: any;
    onClose: () => void;
    onLaunchConsole: (tournamentId: string) => void;
    onLaunchBiddingRoom: (tournamentId: string) => void;
    onOpenSpectator: (tournamentId: string) => void;
    onOpenPlayerRegistration: (tournamentId: string) => void;
    onOpenManageCredentials: (tournament: any) => void;
    onOpenRoster?: (tournament: any) => void;
    onDeleteTournament?: (tournamentId: string, name: string) => void;
}

export const TournamentHubModal: React.FC<TournamentHubModalProps> = ({
    visible,
    tournament,
    onClose,
    onLaunchConsole,
    onLaunchBiddingRoom,
    onOpenSpectator,
    onOpenPlayerRegistration,
    onOpenManageCredentials,
    onOpenRoster,
    onDeleteTournament
}) => {
    const [copiedLink, setCopiedLink] = useState<'spectator' | 'player' | null>(null);
    const [isRegOpen, setIsRegOpen] = useState(tournament?.registrationOpen !== false);
    const [togglingReg, setTogglingReg] = useState(false);

    useEffect(() => {
        if (tournament) {
            setIsRegOpen(tournament.registrationOpen !== false);
        }
    }, [tournament?.registrationOpen]);

    if (!tournament) return null;

    const spectatorUrl = `http://localhost:5173/auction/${tournament._id}`;
    const playerRegUrl = `http://localhost:5173/register-player/${tournament._id}`;

    const handleToggleRegistration = async () => {
        try {
            setTogglingReg(true);
            const nextState = !isRegOpen;
            const res = await apiFetch(`/api/tournaments/${tournament._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ registrationOpen: nextState })
            });
            if (res.ok) {
                setIsRegOpen(nextState);
                tournament.registrationOpen = nextState;
                Alert.alert(
                    'Registration Status',
                    `Player entry form is now ${nextState ? 'OPEN' : 'CLOSED'}`
                );
            } else {
                Alert.alert('Error', 'Failed to update registration status');
            }
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'Network error');
        } finally {
            setTogglingReg(false);
        }
    };

    const handleCopy = (type: 'spectator' | 'player', url: string) => {
        setCopiedLink(type);
        setTimeout(() => setCopiedLink(null), 3000);
        Alert.alert(
            'Link Ready to Share',
            `${type === 'spectator' ? 'Public Broadcast View' : 'Player Self-Registration'} Link:\n\n${url}`,
            [{ text: 'OK' }]
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerTitleWrap}>
                            <Trophy size={20} color="#2563eb" />
                            <View style={{ marginLeft: 8, flex: 1 }}>
                                <Text style={styles.headerTitle} numberOfLines={1}>{tournament.name}</Text>
                                <View style={styles.badgeRow}>
                                    <View style={[styles.statusBadge, tournament.status === 'live' && styles.statusLive]}>
                                        <Text style={[styles.statusText, tournament.status === 'live' && styles.statusTextLive]}>
                                            {tournament.status?.toUpperCase() || 'UPCOMING'}
                                        </Text>
                                    </View>
                                    <Text style={styles.auctionTypeTag}>
                                        {tournament.auctionType === 'admin_driven' ? 'Admin Driven' : 'Team Owner Driven'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={20} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                        <Text style={styles.sectionHeading}>AUCTION CONTROLS</Text>

                        {/* 1. Launch Auctioneer Console */}
                        <TouchableOpacity
                            style={[styles.actionCard, styles.actionCardPrimary]}
                            onPress={() => {
                                onClose();
                                onLaunchConsole(tournament._id);
                            }}
                        >
                            <View style={[styles.iconCircle, { backgroundColor: '#2563eb' }]}>
                                <Play size={18} color="#ffffff" />
                            </View>
                            <View style={styles.actionTextWrap}>
                                <Text style={styles.actionTitlePrimary}>Auction Console</Text>
                                <Text style={styles.actionSubPrimary}>Official gavel screen to conduct bidding, timer & sales</Text>
                            </View>
                        </TouchableOpacity>

                        {/* 2. Live Bidding Room */}
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => {
                                onClose();
                                onLaunchBiddingRoom(tournament._id);
                            }}
                        >
                            <View style={[styles.iconCircle, { backgroundColor: '#eff6ff' }]}>
                                <Users size={18} color="#2563eb" />
                            </View>
                            <View style={styles.actionTextWrap}>
                                <Text style={styles.actionTitle}>Team Owner Bidding Room</Text>
                                <Text style={styles.actionSub}>Test real-time team bidding keypad & purse management</Text>
                            </View>
                        </TouchableOpacity>

                        <Text style={styles.sectionHeading}>CREDENTIALS & ACCESS</Text>

                        {/* 3. Manage Credentials */}
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => {
                                onClose();
                                onOpenManageCredentials(tournament);
                            }}
                        >
                            <View style={[styles.iconCircle, { backgroundColor: '#fef3c7' }]}>
                                <KeyRound size={18} color="#d97706" />
                            </View>
                            <View style={styles.actionTextWrap}>
                                <Text style={styles.actionTitle}>Manage Credentials</Text>
                                <Text style={styles.actionSub}>Set Auctioneer & Team Owners passwords + WhatsApp share</Text>
                            </View>
                        </TouchableOpacity>

                        <Text style={styles.sectionHeading}>PUBLIC LINKS & REGISTRATION</Text>

                        {/* 4. Share Public Live View */}
                        <View style={styles.linkCard}>
                            <View style={styles.linkCardHeader}>
                                <Eye size={16} color="#059669" />
                                <Text style={styles.linkCardTitle}>Public Live View / Broadcast</Text>
                            </View>
                            <Text style={styles.linkCardSub}>For spectators, fans & audience with live bids & sold boards.</Text>
                            <View style={styles.linkBtnRow}>
                                <TouchableOpacity
                                    style={styles.linkSecondaryBtn}
                                    onPress={() => handleCopy('spectator', spectatorUrl)}
                                >
                                    {copiedLink === 'spectator' ? <Check size={14} color="#16a34a" /> : <Copy size={14} color="#475569" />}
                                    <Text style={styles.linkSecondaryBtnText}>
                                        {copiedLink === 'spectator' ? 'Copied' : 'Share Link'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.linkPrimaryBtn}
                                    onPress={() => {
                                        onClose();
                                        onOpenSpectator(tournament._id);
                                    }}
                                >
                                    <Text style={styles.linkPrimaryBtnText}>Open Spectator</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* 5. Player Registration Link */}
                        <View style={styles.linkCard}>
                            <View style={styles.linkCardHeader}>
                                <UserPlus size={16} color="#2563eb" />
                                <Text style={styles.linkCardTitle}>Player Self-Registration Form</Text>
                            </View>
                            <Text style={styles.linkCardSub}>Cricket player form for stats, CricHeroes link, and player photo.</Text>

                            {/* Entry Open / Close Toggle */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: isRegOpen ? '#f0fdf4' : '#fef2f2', borderRadius: 8, borderWidth: 1, borderColor: isRegOpen ? '#bbf7d0' : '#fecaca' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isRegOpen ? '#16a34a' : '#dc2626' }} />
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: isRegOpen ? '#166534' : '#991b1b' }}>
                                        {isRegOpen ? 'ENTRIES ARE OPEN' : 'ENTRIES ARE CLOSED'}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={handleToggleRegistration}
                                    disabled={togglingReg}
                                    style={{
                                        paddingHorizontal: 10,
                                        paddingVertical: 4,
                                        borderRadius: 6,
                                        backgroundColor: isRegOpen ? '#fee2e2' : '#dcfce7',
                                        borderWidth: 1,
                                        borderColor: isRegOpen ? '#fca5a5' : '#86efac'
                                    }}
                                >
                                    <Text style={{ fontSize: 10, fontWeight: '900', color: isRegOpen ? '#dc2626' : '#16a34a' }}>
                                        {togglingReg ? 'SAVING...' : (isRegOpen ? 'CLOSE FORM' : 'OPEN FORM')}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.linkBtnRow}>
                                <TouchableOpacity
                                    style={styles.linkSecondaryBtn}
                                    onPress={() => handleCopy('player', playerRegUrl)}
                                >
                                    {copiedLink === 'player' ? <Check size={14} color="#16a34a" /> : <Copy size={14} color="#475569" />}
                                    <Text style={styles.linkSecondaryBtnText}>
                                        {copiedLink === 'player' ? 'Copied' : 'Share Form Link'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.linkPrimaryBtn, !isRegOpen && { backgroundColor: '#64748b' }]}
                                    onPress={() => {
                                        onClose();
                                        onOpenPlayerRegistration(tournament._id);
                                    }}
                                >
                                    <Text style={styles.linkPrimaryBtnText}>
                                        {isRegOpen ? 'Register Player' : 'Open Form (Closed)'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* 6. Teams & Players Quick Roster */}
                        {onOpenRoster && (
                            <TouchableOpacity
                                style={styles.actionCard}
                                onPress={() => {
                                    onClose();
                                    onOpenRoster(tournament);
                                }}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: '#f1f5f9' }]}>
                                    <Layers size={18} color="#475569" />
                                </View>
                                <View style={styles.actionTextWrap}>
                                    <Text style={styles.actionTitle}>Teams & Players Roster</Text>
                                    <Text style={styles.actionSub}>Add teams, review registered players and slot orders</Text>
                                </View>
                            </TouchableOpacity>
                        )}

                        {/* 7. Delete Tournament */}
                        {onDeleteTournament && (
                            <TouchableOpacity
                                style={[styles.actionCard, { borderColor: '#fecaca', backgroundColor: '#fff5f5', marginTop: 8 }]}
                                onPress={() => {
                                    onClose();
                                    onDeleteTournament(tournament._id, tournament.name);
                                }}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: '#fee2e2' }]}>
                                    <Trash2 size={18} color="#dc2626" />
                                </View>
                                <View style={styles.actionTextWrap}>
                                    <Text style={[styles.actionTitle, { color: '#dc2626' }]}>Delete Tournament</Text>
                                    <Text style={styles.actionSub}>Permanently delete this tournament and its database</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    headerTitleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0f172a',
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 6,
    },
    statusBadge: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusLive: {
        backgroundColor: '#fef2f2',
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#64748b',
    },
    statusTextLive: {
        color: '#dc2626',
    },
    auctionTypeTag: {
        fontSize: 11,
        color: '#64748b',
    },
    closeBtn: {
        padding: 6,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
    },
    body: {
        padding: 16,
    },
    sectionHeading: {
        fontSize: 11,
        fontWeight: '800',
        color: '#94a3b8',
        letterSpacing: 0.5,
        marginTop: 10,
        marginBottom: 8,
    },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 10,
    },
    actionCardPrimary: {
        backgroundColor: '#eff6ff',
        borderColor: '#bfdbfe',
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    actionTextWrap: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0f172a',
    },
    actionTitlePrimary: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1e40af',
    },
    actionSub: {
        fontSize: 11,
        color: '#64748b',
        marginTop: 2,
    },
    actionSubPrimary: {
        fontSize: 11,
        color: '#3b82f6',
        marginTop: 2,
    },
    linkCard: {
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 12,
    },
    linkCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    linkCardTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#0f172a',
        marginLeft: 6,
    },
    linkCardSub: {
        fontSize: 11,
        color: '#64748b',
        marginBottom: 10,
    },
    linkBtnRow: {
        flexDirection: 'row',
        gap: 8,
    },
    linkSecondaryBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
    },
    linkSecondaryBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#334155',
    },
    linkPrimaryBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2563eb',
        paddingVertical: 8,
        borderRadius: 8,
    },
    linkPrimaryBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#ffffff',
    },
});

export default TournamentHubModal;

