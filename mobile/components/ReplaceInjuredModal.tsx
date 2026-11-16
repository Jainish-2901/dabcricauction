import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Alert
} from 'react-native';
import { X, HeartPulse, ArrowRight, Shield, AlertTriangle, CheckCircle2, Calculator } from 'lucide-react-native';
import SafeImage from './SafeImage';
import { apiFetch } from '../lib/api';
import { getBudgetUnits } from '../lib/currency';
import { toast } from '../lib/toast';

interface ReplaceInjuredModalProps {
    visible: boolean;
    onClose: () => void;
    tournament: any;
    team: any;
    preSelectedPlayer?: any;
    players: any[];
    onReplaced: () => void;
}

export const ReplaceInjuredModal: React.FC<ReplaceInjuredModalProps> = ({
    visible,
    onClose,
    tournament,
    team,
    preSelectedPlayer,
    players = [],
    onReplaced
}) => {
    const [selectedInjuredId, setSelectedInjuredId] = useState('');
    const [selectedReplacementId, setSelectedReplacementId] = useState('');
    const [replacementFee, setReplacementFee] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const { smallUnit, largeUnit } = getBudgetUnits(tournament);

    // Eligible players in team's squad (non-captains, sold)
    const teamSquad = (players || []).filter(p =>
        (p.soldToTeamId === team?._id || p.soldToTeamId === team?.id) &&
        !p.isCaptain &&
        !String(p._id || '').startsWith('pl_cap_') &&
        p.status !== 'injured'
    );

    // Available unsold players pool
    const unsoldPool = (players || []).filter(p => p.status === 'unsold');

    useEffect(() => {
        if (visible) {
            if (preSelectedPlayer && preSelectedPlayer._id) {
                setSelectedInjuredId(preSelectedPlayer._id);
            } else if (teamSquad.length > 0) {
                setSelectedInjuredId(teamSquad[0]._id);
            } else {
                setSelectedInjuredId('');
            }
            setSelectedReplacementId('');
            setReplacementFee('');
        }
    }, [visible, preSelectedPlayer, team]);

    const injuredPlayer = teamSquad.find(p => p._id === selectedInjuredId) || preSelectedPlayer;
    const replacementPlayer = unsoldPool.find(p => p._id === selectedReplacementId);

    // Auto-fill replacement fee when candidate is selected
    useEffect(() => {
        if (replacementPlayer) {
            setReplacementFee(String(replacementPlayer.basePrice || 0));
        }
    }, [selectedReplacementId]);

    const refundAmount = Number(injuredPlayer?.soldPrice || injuredPlayer?.currentBid || injuredPlayer?.basePrice || 0);
    const feeAmount = parseFloat(replacementFee) || 0;
    const netDifferenceSmall = feeAmount - refundAmount;
    const netDifferenceLarge = netDifferenceSmall / 100;

    const currentSpentLarge = Number(team?.spent || 0);
    const totalBudgetLarge = Number(team?.budget || 100);
    const currentRemainingLarge = Math.max(0, totalBudgetLarge - currentSpentLarge);
    const newRemainingLarge = totalBudgetLarge - (currentSpentLarge + netDifferenceLarge);
    const exceedsBudget = newRemainingLarge < 0;

    const handleConfirm = async () => {
        if (!selectedInjuredId) {
            toast.warning('Selection Required', 'Please select the injured player.');
            return;
        }
        if (!selectedReplacementId) {
            toast.warning('Selection Required', 'Please select an unsold player as replacement.');
            return;
        }
        if (isNaN(feeAmount) || feeAmount < 0) {
            toast.warning('Invalid Price', 'Please enter a valid replacement fee.');
            return;
        }
        if (exceedsBudget) {
            toast.error('Budget Exceeded', `Replacement requires ₹${feeAmount} ${smallUnit}, which exceeds remaining purse.`);
            return;
        }

        setSubmitting(true);
        try {
            const res = await apiFetch(`/api/tournaments/${tournament?._id}/replace-injured`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    teamId: team?._id || team?.id,
                    injuredPlayerId: selectedInjuredId,
                    replacementPlayerId: selectedReplacementId,
                    replacementPrice: feeAmount
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to replace player');
            }

            toast.success(
                'Replacement Complete',
                `${replacementPlayer?.name} replaced injured ${injuredPlayer?.name} for ${team?.name}.`
            );
            onReplaced();
            onClose();
        } catch (err: any) {
            toast.error('Replacement Failed', err.message || 'Error processing replacement');
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
                                <HeartPulse size={20} color="#e11d48" />
                            </View>
                            <View>
                                <Text style={styles.modalTitle}>Injury Replacement</Text>
                                <Text style={styles.modalSub}>
                                    Substitute injured player from unsold pool
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={20} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                        {/* Team Banner */}
                        <View style={styles.teamBanner}>
                            <View style={styles.teamBadge}>
                                <Text style={styles.teamBadgeText}>{team?.shortName || 'TM'}</Text>
                            </View>
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={styles.teamName}>{team?.name}</Text>
                                <Text style={styles.teamPurse}>
                                    Purse: ₹{currentRemainingLarge.toFixed(2)} {largeUnit} remaining
                                </Text>
                            </View>
                        </View>

                        {/* Step 1: Select Injured Player */}
                        <View style={styles.sectionBox}>
                            <Text style={styles.sectionLabel}>1. SELECT INJURED PLAYER (SQUAD)</Text>
                            {teamSquad.length === 0 ? (
                                <Text style={styles.emptyNotice}>No eligible players in this squad.</Text>
                            ) : (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                                    {teamSquad.map(p => {
                                        const isSelected = p._id === selectedInjuredId;
                                        const pPrice = p.soldPrice || p.currentBid || p.basePrice || 0;
                                        return (
                                            <TouchableOpacity
                                                key={p._id}
                                                onPress={() => setSelectedInjuredId(p._id)}
                                                style={[
                                                    styles.playerPickCard,
                                                    isSelected && styles.playerPickCardSelected
                                                ]}
                                            >
                                                <Text style={[styles.playerPickName, isSelected && { color: '#e11d48' }]} numberOfLines={1}>
                                                    {p.name}
                                                </Text>
                                                <Text style={styles.playerPickRole}>{p.category}</Text>
                                                <Text style={styles.playerPickPrice}>Sold: ₹{pPrice}{smallUnit}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            )}
                        </View>

                        {/* Step 2: Select Replacement from Unsold */}
                        <View style={styles.sectionBox}>
                            <Text style={styles.sectionLabel}>2. SELECT REPLACEMENT (UNSOLD POOL)</Text>
                            {unsoldPool.length === 0 ? (
                                <Text style={styles.emptyNotice}>No unsold players available for replacement.</Text>
                            ) : (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                                    {unsoldPool.map(p => {
                                        const isSelected = p._id === selectedReplacementId;
                                        return (
                                            <TouchableOpacity
                                                key={p._id}
                                                onPress={() => setSelectedReplacementId(p._id)}
                                                style={[
                                                    styles.playerPickCard,
                                                    isSelected && { borderColor: '#16a34a', backgroundColor: '#f0fdf4' }
                                                ]}
                                            >
                                                <Text style={[styles.playerPickName, isSelected && { color: '#16a34a' }]} numberOfLines={1}>
                                                    {p.name}
                                                </Text>
                                                <Text style={styles.playerPickRole}>{p.category}</Text>
                                                <Text style={styles.playerPickPrice}>Base: ₹{p.basePrice || 0}{smallUnit}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            )}
                        </View>

                        {/* Step 3: Replacement Fee */}
                        {replacementPlayer && (
                            <View style={styles.sectionBox}>
                                <Text style={styles.sectionLabel}>3. REPLACEMENT FEE (IN ₹{smallUnit})</Text>
                                <TextInput
                                    style={styles.priceInput}
                                    value={replacementFee}
                                    onChangeText={setReplacementFee}
                                    keyboardType="numeric"
                                    placeholder={`e.g. ${replacementPlayer.basePrice || 20}`}
                                    placeholderTextColor="#94a3b8"
                                />
                            </View>
                        )}

                        {/* Financial Impact Breakdown */}
                        {injuredPlayer && replacementPlayer && (
                            <View style={[styles.impactBox, exceedsBudget && styles.impactBoxError]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                    <Calculator size={16} color={exceedsBudget ? '#dc2626' : '#2563eb'} />
                                    <Text style={[styles.impactTitle, exceedsBudget && { color: '#dc2626' }]}>
                                        Purse Financial Impact
                                    </Text>
                                </View>

                                <View style={styles.impactRow}>
                                    <Text style={styles.impactLabel}>Purse Refund for Injured:</Text>
                                    <Text style={[styles.impactValue, { color: '#16a34a' }]}>+₹{refundAmount} {smallUnit}</Text>
                                </View>
                                <View style={styles.impactRow}>
                                    <Text style={styles.impactLabel}>Replacement Fee:</Text>
                                    <Text style={[styles.impactValue, { color: '#dc2626' }]}>-₹{feeAmount} {smallUnit}</Text>
                                </View>
                                <View style={[styles.impactRow, styles.impactDivider]}>
                                    <Text style={styles.impactLabelBold}>New Remaining Purse:</Text>
                                    <Text style={[styles.impactValueBold, exceedsBudget && { color: '#dc2626' }]}>
                                        ₹{newRemainingLarge.toFixed(2)} {largeUnit}
                                    </Text>
                                </View>

                                {exceedsBudget && (
                                    <View style={styles.errorAlert}>
                                        <AlertTriangle size={14} color="#dc2626" />
                                        <Text style={styles.errorAlertText}>
                                            Insufficient purse! This team cannot afford the fee.
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
                            onPress={handleConfirm}
                            disabled={submitting || exceedsBudget || !selectedReplacementId || !selectedInjuredId}
                            style={[
                                styles.submitBtn,
                                (submitting || exceedsBudget || !selectedReplacementId || !selectedInjuredId) && { opacity: 0.5 }
                            ]}
                        >
                            {submitting ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                                <Text style={styles.submitBtnText}>Confirm Replacement</Text>
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
        backgroundColor: '#ffe4e6',
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
    teamBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 14
    },
    teamBadge: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#2563eb',
        alignItems: 'center',
        justifyContent: 'center'
    },
    teamBadgeText: {
        color: '#ffffff',
        fontWeight: '900',
        fontSize: 14
    },
    teamName: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0f172a'
    },
    teamPurse: {
        fontSize: 11,
        fontWeight: '600',
        color: '#16a34a',
        marginTop: 2
    },
    sectionBox: {
        marginBottom: 16
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: '#64748b',
        letterSpacing: 0.5
    },
    emptyNotice: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 6,
        fontStyle: 'italic'
    },
    playerPickCard: {
        width: 140,
        padding: 10,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        backgroundColor: '#ffffff',
        marginRight: 10
    },
    playerPickCardSelected: {
        borderColor: '#e11d48',
        backgroundColor: '#fff1f2'
    },
    playerPickName: {
        fontSize: 12,
        fontWeight: '800',
        color: '#0f172a'
    },
    playerPickRole: {
        fontSize: 10,
        color: '#64748b',
        fontWeight: '600',
        marginTop: 2
    },
    playerPickPrice: {
        fontSize: 11,
        fontWeight: '800',
        color: '#2563eb',
        marginTop: 4
    },
    priceInput: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
        fontWeight: '800',
        color: '#0f172a',
        marginTop: 6
    },
    impactBox: {
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#bfdbfe',
        borderRadius: 16,
        padding: 14,
        marginBottom: 14
    },
    impactBoxError: {
        backgroundColor: '#fef2f2',
        borderColor: '#fecaca'
    },
    impactTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: '#1d4ed8'
    },
    impactRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 3
    },
    impactDivider: {
        borderTopWidth: 1,
        borderTopColor: '#cbd5e1',
        paddingTop: 6,
        marginTop: 6
    },
    impactLabel: {
        fontSize: 11,
        color: '#475569',
        fontWeight: '600'
    },
    impactLabelBold: {
        fontSize: 12,
        color: '#0f172a',
        fontWeight: '800'
    },
    impactValue: {
        fontSize: 12,
        fontWeight: '800'
    },
    impactValueBold: {
        fontSize: 13,
        fontWeight: '900',
        color: '#16a34a'
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
        backgroundColor: '#e11d48',
        alignItems: 'center'
    },
    submitBtnText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#ffffff'
    }
});

export default ReplaceInjuredModal;
