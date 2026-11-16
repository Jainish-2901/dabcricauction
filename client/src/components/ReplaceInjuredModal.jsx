import React, { useState, useEffect } from 'react';
import { X, HeartPulse, ArrowRight, Shield, User, AlertTriangle, CheckCircle2, Calculator, Sparkles } from 'lucide-react';
import axios from 'axios';
import { getBudgetUnits } from '../utils/currency';
import toast from '../lib/toast';
import SafeImage from './SafeImage';
import { supabase } from '../lib/supabase';

const ReplaceInjuredModal = ({
    isOpen,
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

    const { smallUnit, largeUnit, formatAmount } = getBudgetUnits(tournament);

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
        if (isOpen) {
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
    }, [isOpen, preSelectedPlayer, team]);

    const injuredPlayer = teamSquad.find(p => p._id === selectedInjuredId);
    const replacementPlayer = unsoldPool.find(p => p._id === selectedReplacementId);

    // Auto-fill replacement fee when replacement player is picked
    const handlePickReplacement = (id) => {
        setSelectedReplacementId(id);
        const rep = unsoldPool.find(p => p._id === id);
        if (rep) {
            setReplacementFee(String(rep.basePrice || 20));
        } else {
            setReplacementFee('');
        }
    };

    if (!isOpen || !team) return null;

    const oldPrice = Number(injuredPlayer?.soldPrice || injuredPlayer?.currentBid || injuredPlayer?.basePrice) || 0;
    const newPrice = Number(replacementFee) || 0;
    const priceDiff = newPrice - oldPrice;
    const diffInLarge = Number((priceDiff / 100).toFixed(2));
    const currentRemainingPurse = (Number(team.budget) || 100) - (Number(team.spent) || 0);
    const newRemainingPurse = Number((currentRemainingPurse - diffInLarge).toFixed(2));
    const hasInsufficientPurse = diffInLarge > 0 && diffInLarge > currentRemainingPurse;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedInjuredId) {
            toast.error('Please select the injured player to replace');
            return;
        }
        if (!selectedReplacementId) {
            toast.error('Please select a replacement player from the unsold pool');
            return;
        }
        if (hasInsufficientPurse) {
            toast.error(`Insufficient team purse! Need ₹${priceDiff} ${smallUnit} more.`);
            return;
        }

        try {
            setSubmitting(true);
            const tourneyId = tournament?._id || team.tournamentId;
            const res = await axios.post(`/api/tournaments/${tourneyId}/replace-injured`, {
                teamId: team._id,
                injuredPlayerId: selectedInjuredId,
                replacementPlayerId: selectedReplacementId,
                replacementPrice: newPrice
            });

            toast.success(`🚑 Successfully replaced ${injuredPlayer?.name} with ${replacementPlayer?.name}!`);
            if (onReplaced) onReplaced(res.data);
            onClose();
            return;
        } catch (err) {
            console.warn('Replace API failed, trying direct Supabase fallback...', err);
        }

        // Direct Supabase Cloud DB Fallback
        try {
            const tourneyId = tournament?._id || team.tournamentId;
            const diffLarge = Number((priceDiff / 100).toFixed(2));
            const currentSpent = Number(team.spent || 0);
            const newSpent = Math.max(0, Number((currentSpent + diffLarge).toFixed(2)));

            const p1 = supabase.from('players').update({
                status: 'injured',
                is_injured: true,
                sold_to_team_id: null,
                sold_to_team_name: null,
                updated_at: new Date().toISOString()
            }).eq('_id', selectedInjuredId);

            const p2 = supabase.from('players').update({
                status: 'sold',
                sold_to_team_id: team._id,
                sold_to_team_name: team.name,
                sold_price: newPrice,
                current_bid: newPrice,
                updated_at: new Date().toISOString()
            }).eq('_id', selectedReplacementId);

            const p3 = supabase.from('teams').update({
                spent: newSpent,
                updated_at: new Date().toISOString()
            }).eq('_id', team._id);

            const txRecord = {
                _id: 'trf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                tournament_id: tourneyId,
                type: 'injury_replacement',
                team_id: team._id,
                team_name: team.name,
                team_logo: team.logo,
                injured_player_id: selectedInjuredId,
                injured_player_name: injuredPlayer?.name,
                injured_player_price: oldPrice,
                replacement_player_id: selectedReplacementId,
                replacement_player_name: replacementPlayer?.name,
                replacement_player_price: newPrice,
                refund_amount: oldPrice,
                replacement_fee: newPrice,
                price_difference: priceDiff,
                created_at: new Date().toISOString()
            };
            const p4 = supabase.from('transfers').insert(txRecord);

            await Promise.all([p1, p2, p3, p4]);

            toast.success(`🚑 Successfully replaced ${injuredPlayer?.name} with ${replacementPlayer?.name}!`);
            if (onReplaced) onReplaced({ team: { ...team, spent: newSpent } });
            onClose();
        } catch (supaErr) {
            console.error('Supabase replace error:', supaErr);
            toast.error('Failed to replace player');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-2xs">
                            <HeartPulse className="w-5 h-5 text-rose-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                Injury Replacement Window
                            </h2>
                            <p className="text-xs text-slate-500 font-semibold">
                                Team: <strong className="text-slate-800">{team.name}</strong> • Remaining Purse: ₹{currentRemainingPurse.toFixed(2)} {largeUnit}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                    {/* Step 1: Select Injured Player */}
                    <div>
                        <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                            1. Select Injured Player (from {team.name} squad)
                        </label>
                        {teamSquad.length === 0 ? (
                            <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400 font-bold">
                                No eligible squad players found to replace.
                            </div>
                        ) : (
                            <select
                                value={selectedInjuredId}
                                onChange={(e) => setSelectedInjuredId(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-rose-500 focus:outline-none transition-all"
                                required
                            >
                                <option value="">-- Choose Injured / Unavailable Player --</option>
                                {teamSquad.map(p => (
                                    <option key={p._id} value={p._id}>
                                        {p.name} ({p.category}) • Sold at: ₹{p.soldPrice || p.currentBid || p.basePrice} {smallUnit}
                                    </option>
                                ))}
                            </select>
                        )}
                        {injuredPlayer && (
                            <div className="mt-2 p-3 bg-rose-50/70 border border-rose-200 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-white border border-rose-200 overflow-hidden shrink-0 flex items-center justify-center">
                                        <SafeImage src={injuredPlayer.image} alt={injuredPlayer.name} className="w-full h-full object-cover" fallback={<User size={14} className="text-slate-400" />} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-black text-rose-950">{injuredPlayer.name}</div>
                                        <div className="text-[10px] text-rose-700 font-bold">{injuredPlayer.category} • Will be marked as Injured</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-black uppercase text-rose-600 block">Sold Price</span>
                                    <span className="text-xs font-black text-rose-950">₹{oldPrice} {smallUnit}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Step 2: Select Replacement Player from Unsold Pool */}
                    <div>
                        <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                            2. Select Replacement Player (from Unsold Pool - {unsoldPool.length} available)
                        </label>
                        {unsoldPool.length === 0 ? (
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center text-xs text-amber-800 font-bold">
                                ⚠️ No unsold players available in this tournament to pick as a replacement.
                            </div>
                        ) : (
                            <select
                                value={selectedReplacementId}
                                onChange={(e) => handlePickReplacement(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
                                required
                            >
                                <option value="">-- Choose Replacement from Unsold Pool --</option>
                                {unsoldPool.map(p => (
                                    <option key={p._id} value={p._id}>
                                        {p.name} ({p.category}) • Base Price: ₹{p.basePrice} {smallUnit}
                                    </option>
                                ))}
                            </select>
                        )}
                        {replacementPlayer && (
                            <div className="mt-2 p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-white border border-emerald-200 overflow-hidden shrink-0 flex items-center justify-center">
                                        <SafeImage src={replacementPlayer.image} alt={replacementPlayer.name} className="w-full h-full object-cover" fallback={<User size={14} className="text-slate-400" />} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-black text-emerald-950">{replacementPlayer.name}</div>
                                        <div className="text-[10px] text-emerald-700 font-bold">{replacementPlayer.category} • Joining {team.name}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-black uppercase text-emerald-600 block">Base Price</span>
                                    <span className="text-xs font-black text-emerald-950">₹{replacementPlayer.basePrice} {smallUnit}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Step 3: Replacement Fee Input */}
                    {replacementPlayer && (
                        <div>
                            <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-1.5">
                                3. Replacement Signed Price (₹ {smallUnit})
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={replacementFee}
                                onChange={(e) => setReplacementFee(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                                placeholder={`e.g. ${replacementPlayer.basePrice || 20}`}
                                required
                            />
                            <p className="text-[10px] text-slate-400 font-semibold mt-1">
                                Defaults to player's base price. Can be adjusted per tournament committee rules.
                            </p>
                        </div>
                    )}

                    {/* Financial Summary & Purse Box */}
                    {injuredPlayer && replacementPlayer && (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-500">Refund for {injuredPlayer.name}:</span>
                                <span className="font-black text-emerald-600">+₹{oldPrice} {smallUnit}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-500">Deduction for {replacementPlayer.name}:</span>
                                <span className="font-black text-rose-600">-₹{newPrice} {smallUnit}</span>
                            </div>
                            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                                <span className="font-black text-slate-700 flex items-center gap-1">
                                    <Calculator className="w-3.5 h-3.5 text-blue-600" /> Net Purse Impact:
                                </span>
                                <span className={`font-black ${priceDiff > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {priceDiff > 0 ? `-₹${priceDiff} ${smallUnit}` : `+₹${Math.abs(priceDiff)} ${smallUnit}`}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-slate-600">Updated Remaining Purse:</span>
                                <span className={`text-sm font-black ${hasInsufficientPurse ? 'text-rose-600' : 'text-emerald-700'}`}>
                                    ₹{newRemainingPurse.toFixed(2)} {largeUnit}
                                </span>
                            </div>

                            {hasInsufficientPurse && (
                                <div className="mt-2 p-2.5 bg-rose-100 border border-rose-300 rounded-xl text-rose-900 text-xs font-bold flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                                    <span>Team has insufficient purse to absorb this replacement price difference!</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || hasInsufficientPurse || !selectedInjuredId || !selectedReplacementId}
                            className={`px-5 py-2.5 rounded-xl font-black text-xs text-white flex items-center gap-2 shadow-sm transition-all cursor-pointer ${
                                submitting || hasInsufficientPurse || !selectedInjuredId || !selectedReplacementId
                                    ? 'bg-slate-300 cursor-not-allowed shadow-none'
                                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/25 active:scale-95'
                            }`}
                        >
                            <HeartPulse className="w-4 h-4" />
                            <span>{submitting ? 'Processing Replacement...' : 'Confirm Injury Replacement'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReplaceInjuredModal;

