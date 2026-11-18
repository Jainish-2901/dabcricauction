import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator
} from 'react-native';
import { X, ArrowLeftRight, AlertTriangle, CheckCircle2, Calculator } from 'lucide-react-native';
import SafeImage from './SafeImage';
import { apiFetch } from '../lib/api';
import { getBudgetUnits } from '../lib/currency';
import { toast } from '../lib/toast';

interface TradePlayersModalProps {
    visible: boolean;
    onClose: () => void;
    tournament: any;
    teams: any[];
    players: any[];
    onTraded: () => void;
}

export const TradePlayersModal: React.FC<TradePlayersModalProps> = ({
    visible,
    onClose,
    tournament,
    teams = [],
    players = [],
    onTraded
}) => {
    const [teamAId, setTeamAId] = useState('');
    const [playerAId, setPlayerAId] = useState('');
    const [teamBId, setTeamBId] = useState('');
    const [playerBId, setPlayerBId] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const { smallUnit, largeUnit } = getBudgetUnits(tournament);

    useEffect(() => {
        if (visible) {
            if (teams.length >= 2) {
                setTeamAId(teams[0]._id || teams[0].id);
                setTeamBId(teams[1]._id || teams[1].id);
            } else {
                setTeamAId('');
                setTeamBId('');
            }
            setPlayerAId('');
            setPlayerBId('');
        }
    }, [visible, teams]);

    const teamA = teams.find(t => (t._id || t.id) === teamAId);
    const teamB = teams.find(t => (t._id || t.id) === teamBId);

    // Eligible squads (non-captains, sold to respective teams, not injured)
    const squadA = (players || []).filter(p =>
        (p.soldToTeamId === teamAId || (teamA?.players && teamA.players.includes(p._id))) &&
        !p.isCaptain &&
        !String(p._id || '').startsWith('pl_cap_') &&
        p.status !== 'injured'
    );

    const squadB = (players || []).filter(p =>
        (p.soldToTeamId === teamBId || (teamB?.players && teamB.players.includes(p._id))) &&
        !p.isCaptain &&
        !String(p._id || '').startsWith('pl_cap_') &&
        p.status !== 'injured'
    );

    const playerA = squadA.find(p => p._id === playerAId);
    const playerB = squadB.find(p => p._id === playerBId);

    // Financial calculations
    const priceA = Number(playerA?.soldPrice || playerA?.sold_price || playerA?.currentBid || playerA?.basePrice || 0);
    const priceB = Number(playerB?.soldPrice || playerB?.sold_price || playerB?.currentBid || playerB?.basePrice || 0);
    const priceDifferenceSmall = priceB - priceA;
    const priceDifferenceLarge = priceDifferenceSmall / 100;

    const teamASpent = Number(teamA?.spent || 0);
    const teamABudget = Number(teamA?.budget || 100);
    const teamARemaining = Math.max(0, teamABudget - teamASpent);
    const newTeamARemaining = teamABudget - (teamASpent + priceDifferenceLarge);
    const teamAExceeds = newTeamARemaining < 0;

    const teamBSpent = Number(teamB?.spent || 0);
    const teamBBudget = Number(teamB?.budget || 100);
    const teamBRemaining = Math.max(0, teamBBudget - teamBSpent);
    const newTeamBRemaining = teamBBudget - (teamBSpent - priceDifferenceLarge);
    const teamBExceeds = newTeamBRemaining < 0;

    const isValid = playerA && playerB && !teamAExceeds && !teamBExceeds && teamAId !== teamBId;

    const handleConfirmTrade = async () => {
        if (!teamAId || !teamBId) {
            toast.warning('Selection Required', 'Please select two teams.');
            return;
        }
        if (!playerAId || !playerBId) {
            toast.warning('Selection Required', 'Please select a player from each team.');
            return;
        }
        if (teamAExceeds) {
            toast.error('Budget Limit', `${teamA?.name} cannot afford player difference of ₹${Math.abs(priceDifferenceSmall)} ${smallUnit}`);
            return;
        }
        if (teamBExceeds) {
            toast.error('Budget Limit', `${teamB?.name} cannot afford player difference of ₹${Math.abs(priceDifferenceSmall)} ${smallUnit}`);
            return;
        }

        setSubmitting(true);
        try {
            const res = await apiFetch(`/api/tournaments/${tournament?._id}/trade-players`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    teamAId,
                    playerAId,
                    teamBId,
                    playerBId
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to execute trade');
            }

            toast.success(
                'Trade Executed!',
                `${playerA?.name} ↔ ${playerB?.name} trade completed between ${teamA?.name} and ${teamB?.name}.`
            );
            onTraded();
            onClose();
        } catch (err: any) {
            toast.error('Trade Failed', err.message || 'Error processing player trade');
        } finally {
            setSubmitting(false);
        }
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
                    <View style={styles.modalHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={styles.iconCircle}>
                                <ArrowLeftRight size={20} color="#4f46e5" />
                            </View>
                            <View>
                                <Text style={styles.modalTitle}>Trade / Exchange Players</Text>
                                <Text style={styles.modalSub}>
                                    Swap squad players between two franchises
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={20} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                        {/* Team A Selection Section */}
                        <View style={styles.teamSection}>
                            <Text style={styles.teamSectionLabel}>TEAM A</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                                {teams.map(t => {
                                    const isSel = (t._id || t.id) === teamAId;
                                    return (
                                        <TouchableOpacity
                                            key={t._id || t.id}
                                            onPress={() => {
                                                setTeamAId(t._id || t.id);
                                                setPlayerAId('');
                                            }}
                                            style={[styles.teamPill, isSel && styles.teamPillSelected]}
                                        >
                                            <Text style={[styles.teamPillText, isSel && styles.teamPillTextSelected]}>
                                                {t.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            <Text style={styles.subLabel}>Select Player from {teamA?.name || 'Team A'}:</Text>
                            {squadA.length === 0 ? (
                                <Text style={styles.emptyNotice}>No trade-eligible players in this squad.</Text>
                            ) : (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                                    {squadA.map(p => {
                                        const isSel = p._id === playerAId;
                                        const pPrice = p.soldPrice || p.sold_price || p.currentBid || p.basePrice || 0;
                                        return (
                                            <TouchableOpacity
                                                key={p._id}
                                                onPress={() => setPlayerAId(p._id)}
                                                style={[styles.playerCard, isSel && styles.playerCardSelected]}
                                            >
                                                <Text style={[styles.playerName, isSel && { color: '#4f46e5' }]} numberOfLines={1}>
                                                    {p.name}
                                                </Text>
                                                <Text style={styles.playerRole}>{p.category}</Text>
                                                <Text style={styles.playerPrice}>Sold: ₹{pPrice}{smallUnit}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            )}
                        </View>

                        {/* Trade Divider Arrow */}
                        <View style={styles.dividerBox}>
                            <View style={styles.dividerLine} />
                            <View style={styles.swapBadge}>
                                <ArrowLeftRight size={16} color="#4f46e5" />
                            </View>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Team B Selection Section */}
                        <View style={styles.teamSection}>
                            <Text style={[styles.teamSectionLabel, { color: '#059669' }]}>TEAM B</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                                {teams.filter(t => (t._id || t.id) !== teamAId).map(t => {
                                    const isSel = (t._id || t.id) === teamBId;
                                    return (
                                        <TouchableOpacity
                                            key={t._id || t.id}
                                            onPress={() => {
                                                setTeamBId(t._id || t.id);
                                                setPlayerBId('');
                                            }}
                                            style={[styles.teamPill, isSel && { backgroundColor: '#059669', borderColor: '#059669' }]}
                                        >
                                            <Text style={[styles.teamPillText, isSel && styles.teamPillTextSelected]}>
                                                {t.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            <Text style={styles.subLabel}>Select Player from {teamB?.name || 'Team B'}:</Text>
                            {squadB.length === 0 ? (
                                <Text style={styles.emptyNotice}>No trade-eligible players in this squad.</Text>
                            ) : (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                                    {squadB.map(p => {
                                        const isSel = p._id === playerBId;
                                        const pPrice = p.soldPrice || p.sold_price || p.currentBid || p.basePrice || 0;
                                        return (
                                            <TouchableOpacity
                                                key={p._id}
                                                onPress={() => setPlayerBId(p._id)}
                                                style={[styles.playerCard, isSel && { borderColor: '#059669', backgroundColor: '#f0fdf4' }]}
                                            >
                                                <Text style={[styles.playerName, isSel && { color: '#059669' }]} numberOfLines={1}>
                                                    {p.name}
                                                </Text>
                                                <Text style={styles.playerRole}>{p.category}</Text>
                                                <Text style={styles.playerPrice}>Sold: ₹{pPrice}{smallUnit}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            )}
                        </View>

                        {/* Live Financial Balance Preview */}
                        {playerA && playerB && (
                            <View style={styles.previewBox}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                    <Calculator size={16} color="#4f46e5" />
                                    <Text style={styles.previewTitle}>Purse Impact Analysis</Text>
                                </View>

                                <View style={styles.previewRow}>
                                    <Text style={styles.previewLabel}>{teamA?.name} ({playerA.name} - ₹{priceA}{smallUnit}):</Text>
                                    <Text style={[styles.previewValue, teamAExceeds ? { color: '#dc2626' } : { color: '#16a34a' }]}>
                                        Purse: ₹{newTeamARemaining.toFixed(2)} {largeUnit}
                                    </Text>
                                </View>

                                <View style={styles.previewRow}>
                                    <Text style={styles.previewLabel}>{teamB?.name} ({playerB.name} - ₹{priceB}{smallUnit}):</Text>
                                    <Text style={[styles.previewValue, teamBExceeds ? { color: '#dc2626' } : { color: '#16a34a' }]}>
                                        Purse: ₹{newTeamBRemaining.toFixed(2)} {largeUnit}
                                    </Text>
                                </View>

                                <View style={[styles.previewRow, { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 6, marginTop: 6 }]}>
                                    <Text style={styles.previewLabelBold}>Price Differential:</Text>
                                    <Text style={styles.previewValueBold}>
                                        ₹{Math.abs(priceDifferenceSmall)} {smallUnit}
                                    </Text>
                                </View>

                                {(teamAExceeds || teamBExceeds) && (
                                    <View style={styles.errorAlert}>
                                        <AlertTriangle size={14} color="#dc2626" />
                                        <Text style={styles.errorAlertText}>
                                            Trade blocked: {teamAExceeds ? teamA?.name : teamB?.name} lacks sufficient purse!
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.modalFooter}>
                        <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleConfirmTrade}
                            disabled={submitting || !isValid}
                            style={[styles.submitBtn, (submitting || !isValid) && { opacity: 0.5 }]}
                        >
                            {submitting ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                                <Text style={styles.submitBtnText}>Execute Trade</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'flex-end'
    },
    modalContainer: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '90%',
        paddingBottom: 20
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9'
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#eef2ff',
        alignItems: 'center',
        justifyContent: 'center'
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#0f172a'
    },
    modalSub: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '500'
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center'
    },
    modalBody: {
        paddingHorizontal: 20,
        paddingVertical: 12
    },
    teamSection: {
        backgroundColor: '#f8fafc',
        borderRadius: 18,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    teamSectionLabel: {
        fontSize: 11,
        fontWeight: '900',
        color: '#4f46e5',
        letterSpacing: 0.5
    },
    subLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#475569',
        marginTop: 4
    },
    teamPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        marginRight: 8
    },
    teamPillSelected: {
        backgroundColor: '#4f46e5',
        borderColor: '#4f46e5'
    },
    teamPillText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#334155'
    },
    teamPillTextSelected: {
        color: '#ffffff'
    },
    emptyNotice: {
        fontSize: 11,
        color: '#94a3b8',
        marginTop: 6,
        fontStyle: 'italic'
    },
    playerCard: {
        width: 130,
        padding: 10,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        backgroundColor: '#ffffff',
        marginRight: 8
    },
    playerCardSelected: {
        borderColor: '#4f46e5',
        backgroundColor: '#eef2ff'
    },
    playerName: {
        fontSize: 12,
        fontWeight: '800',
        color: '#0f172a'
    },
    playerRole: {
        fontSize: 10,
        color: '#64748b',
        fontWeight: '600',
        marginTop: 2
    },
    playerPrice: {
        fontSize: 11,
        fontWeight: '800',
        color: '#2563eb',
        marginTop: 4
    },
    dividerBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 12
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#e2e8f0'
    },
    swapBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#eef2ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 10
    },
    previewBox: {
        backgroundColor: '#f1f5f9',
        borderRadius: 16,
        padding: 14,
        marginTop: 14,
        borderWidth: 1,
        borderColor: '#cbd5e1'
    },
    previewTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: '#0f172a'
    },
    previewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 3
    },
    previewLabel: {
        fontSize: 11,
        color: '#475569',
        fontWeight: '600',
        flex: 1
    },
    previewLabelBold: {
        fontSize: 12,
        fontWeight: '800',
        color: '#0f172a'
    },
    previewValue: {
        fontSize: 12,
        fontWeight: '800'
    },
    previewValueBold: {
        fontSize: 12,
        fontWeight: '900',
        color: '#4f46e5'
    },
    errorAlert: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
        backgroundColor: '#fee2e2',
        padding: 8,
        borderRadius: 10
    },
    errorAlertText: {
        fontSize: 11,
        color: '#dc2626',
        fontWeight: '700'
    },
    modalFooter: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        paddingTop: 10
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 14,
        backgroundColor: '#f1f5f9',
        alignItems: 'center'
    },
    cancelBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#475569'
    },
    submitBtn: {
        flex: 2,
        paddingVertical: 13,
        borderRadius: 14,
        backgroundColor: '#4f46e5',
        alignItems: 'center'
    },
    submitBtnText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#ffffff'
    }
});

export default TradePlayersModal;
