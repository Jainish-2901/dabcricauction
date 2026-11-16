import React, { useState, useEffect } from 'react';
import { X, ArrowLeftRight, Shield, User, AlertTriangle, CheckCircle2, Calculator, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { getBudgetUnits } from '../utils/currency';
import toast from '../lib/toast';
import SafeImage from './SafeImage';
import { supabase } from '../lib/supabase';

const TradePlayersModal = ({
    isOpen,
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

    const { smallUnit, largeUnit, formatAmount } = getBudgetUnits(tournament);

    useEffect(() => {
        if (isOpen) {
            if (teams.length >= 2) {
                setTeamAId(teams[0]._id);
                setTeamBId(teams[1]._id);
            } else {
                setTeamAId('');
                setTeamBId('');
            }
            setPlayerAId('');
            setPlayerBId('');
        }
    }, [isOpen, teams]);

    // Squad for Team A (non-captain, sold)
    const teamASquad = (players || []).filter(p =>
        (p.soldToTeamId === teamAId || p.soldToTeamId === teamAId) &&
        !p.isCaptain &&
        !String(p._id || '').startsWith('pl_cap_') &&
        p.status === 'sold'
    );

    // Squad for Team B (non-captain, sold)
    const teamBSquad = (players || []).filter(p =>
        (p.soldToTeamId === teamBId || p.soldToTeamId === teamBId) &&
        !p.isCaptain &&
        !String(p._id || '').startsWith('pl_cap_') &&
        p.status === 'sold'
    );

    const teamA = teams.find(t => t._id === teamAId);
    const teamB = teams.find(t => t._id === teamBId);
    const playerA = teamASquad.find(p => p._id === playerAId);
    const playerB = teamBSquad.find(p => p._id === playerBId);

    if (!isOpen) return null;

    const pAPrice = Number(playerA?.soldPrice || playerA?.currentBid || playerA?.basePrice) || 0;
    const pBPrice = Number(playerB?.soldPrice || playerB?.currentBid || playerB?.basePrice) || 0;

    // Team A gives playerA, gets playerB. Net spent change for Team A: (pBPrice - pAPrice) / 100
    const diffInLargeA = Number(((pBPrice - pAPrice) / 100).toFixed(2));
    // Team B gives playerB, gets playerA. Net spent change for Team B: (pAPrice - pBPrice) / 100
    const diffInLargeB = Number(((pAPrice - pBPrice) / 100).toFixed(2));

    const remA = teamA ? (Number(teamA.budget) || 100) - (Number(teamA.spent) || 0) : 0;
    const remB = teamB ? (Number(teamB.budget) || 100) - (Number(teamB.spent) || 0) : 0;

    const newRemA = Number((remA - diffInLargeA).toFixed(2));
    const newRemB = Number((remB - diffInLargeB).toFixed(2));

    const teamAInsufficient = diffInLargeA > 0 && diffInLargeA > remA;
    const teamBInsufficient = diffInLargeB > 0 && diffInLargeB > remB;
    const hasError = teamAInsufficient || teamBInsufficient || teamAId === teamBId;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!teamAId || !teamBId) {
            toast.error('Please select both teams involved in the trade');
            return;
        }
        if (teamAId === teamBId) {
            toast.error('Cannot trade players within the same team');
            return;
        }
        if (!playerAId || !playerBId) {
            toast.error('Please select players from both teams to exchange');
            return;
        }
        if (teamAInsufficient) {
            toast.error(`${teamA?.name} has insufficient purse!`);
            return;
        }
        if (teamBInsufficient) {
            toast.error(`${teamB?.name} has insufficient purse!`);
            return;
        }

        try {
            setSubmitting(true);
            const tourneyId = tournament?._id || teamA.tournamentId;
            const res = await axios.post(`/api/tournaments/${tourneyId}/trade-players`, {
                teamAId,
                playerAId,
                teamBId,
                playerBId
            });

            toast.success(`🔄 Trade executed! ${playerA?.name} ⇄ ${playerB?.name}`);
            if (onTraded) onTraded(res.data);
            onClose();
            return;
        } catch (err) {
            console.warn('Trade API failed, trying direct Supabase fallback...', err);
        }

        // Direct Supabase Cloud DB Fallback
        try {
            const tourneyId = tournament?._id || teamA.tournamentId;
            const priceA = Number(playerA.soldPrice || playerA.sold_price || playerA.basePrice || 0);
            const priceB = Number(playerB.soldPrice || playerB.sold_price || playerB.basePrice || 0);
            const priceDiff = priceB - priceA;
            const diffLarge = Number((priceDiff / 100).toFixed(2));

            const teamASpent = Number(teamA.spent || 0);
            const teamBSpent = Number(teamB.spent || 0);
            const newTeamASpent = Math.max(0, Number((teamASpent + diffLarge).toFixed(2)));
            const newTeamBSpent = Math.max(0, Number((teamBSpent - diffLarge).toFixed(2)));

            const p1 = supabase.from('players').update({
                sold_to_team_id: teamBId,
                sold_to_team_name: teamB.name,
                updated_at: new Date().toISOString()
            }).eq('_id', playerAId);

            const p2 = supabase.from('players').update({
                sold_to_team_id: teamAId,
                sold_to_team_name: teamA.name,
                updated_at: new Date().toISOString()
            }).eq('_id', playerBId);

            const p3 = supabase.from('teams').update({
                spent: newTeamASpent,
                updated_at: new Date().toISOString()
            }).eq('_id', teamAId);

            const p4 = supabase.from('teams').update({
                spent: newTeamBSpent,
                updated_at: new Date().toISOString()
            }).eq('_id', teamBId);

            const txRecord = {
                _id: 'trf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                tournament_id: tourneyId,
                type: 'trade',
                team_a_id: teamAId,
                team_a_name: teamA.name,
                team_a_logo: teamA.logo,
                player_a_id: playerAId,
                player_a_name: playerA.name,
                player_a_price: priceA,
                team_b_id: teamBId,
                team_b_name: teamB.name,
                team_b_logo: teamB.logo,
                player_b_id: playerBId,
                player_b_name: playerB.name,
                player_b_price: priceB,
                price_difference: Math.abs(priceB - priceA),
                created_at: new Date().toISOString()
            };
            const p5 = supabase.from('transfers').insert(txRecord);

            await Promise.all([p1, p2, p3, p4, p5]);

            toast.success(`🔄 Trade executed! ${playerA?.name} ⇄ ${playerB?.name}`);
            if (onTraded) onTraded({ teamA: { ...teamA, spent: newTeamASpent }, teamB: { ...teamB, spent: newTeamBSpent } });
            onClose();
        } catch (supaErr) {
            console.error('Supabase trade error:', supaErr);
            toast.error('Failed to execute trade');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
                            <ArrowLeftRight className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                Player Trade & Exchange Window
                            </h2>
                            <p className="text-xs text-slate-500 font-semibold">
                                Swap players between two franchises with automated purse adjustments
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
                    {/* Two-Column Trade Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Team A Box */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                                    Franchise A
                                </span>
                                {teamA && (
                                    <span className="text-xs font-black text-emerald-700">
                                        Purse: ₹{remA.toFixed(2)} {largeUnit}
                                    </span>
                                )}
                            </div>

                            <div>
                                <label className="block text-[11px] font-black uppercase text-slate-600 mb-1">
                                    Select Team A
                                </label>
                                <select
                                    value={teamAId}
                                    onChange={(e) => {
                                        setTeamAId(e.target.value);
                                        setPlayerAId('');
                                    }}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                                    required
                                >
                                    <option value="">-- Select Team A --</option>
                                    {teams.map(t => (
                                        <option key={t._id} value={t._id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-black uppercase text-slate-600 mb-1">
                                    Select Player to Trade Out ({teamASquad.length} available)
                                </label>
                                <select
                                    value={playerAId}
                                    onChange={(e) => setPlayerAId(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                                    required
                                >
                                    <option value="">-- Choose Player A --</option>
                                    {teamASquad.map(p => (
                                        <option key={p._id} value={p._id}>
                                            {p.name} ({p.category}) • ₹{p.soldPrice || p.currentBid || p.basePrice} {smallUnit}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {playerA && (
                                <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                            <SafeImage src={playerA.image} alt={playerA.name} className="w-full h-full object-cover" fallback={<User size={14} className="text-slate-400" />} />
                                        </div>
                                        <div>
                                            <div className="text-xs font-black text-slate-900">{playerA.name}</div>
                                            <div className="text-[10px] text-slate-500 font-semibold">{playerA.category}</div>
                                        </div>
                                    </div>
                                    <span className="text-xs font-black text-slate-900">₹{pAPrice} {smallUnit}</span>
                                </div>
                            )}
                        </div>

                        {/* Team B Box */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                                    Franchise B
                                </span>
                                {teamB && (
                                    <span className="text-xs font-black text-emerald-700">
                                        Purse: ₹{remB.toFixed(2)} {largeUnit}
                                    </span>
                                )}
                            </div>

                            <div>
                                <label className="block text-[11px] font-black uppercase text-slate-600 mb-1">
                                    Select Team B
                                </label>
                                <select
                                    value={teamBId}
                                    onChange={(e) => {
                                        setTeamBId(e.target.value);
                                        setPlayerBId('');
                                    }}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:border-purple-500 focus:outline-none"
                                    required
                                >
                                    <option value="">-- Select Team B --</option>
                                    {teams.filter(t => t._id !== teamAId).map(t => (
                                        <option key={t._id} value={t._id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-black uppercase text-slate-600 mb-1">
                                    Select Player to Trade Out ({teamBSquad.length} available)
                                </label>
                                <select
                                    value={playerBId}
                                    onChange={(e) => setPlayerBId(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:border-purple-500 focus:outline-none"
                                    required
                                >
                                    <option value="">-- Choose Player B --</option>
                                    {teamBSquad.map(p => (
                                        <option key={p._id} value={p._id}>
                                            {p.name} ({p.category}) • ₹{p.soldPrice || p.currentBid || p.basePrice} {smallUnit}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {playerB && (
                                <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                            <SafeImage src={playerB.image} alt={playerB.name} className="w-full h-full object-cover" fallback={<User size={14} className="text-slate-400" />} />
                                        </div>
                                        <div>
                                            <div className="text-xs font-black text-slate-900">{playerB.name}</div>
                                            <div className="text-[10px] text-slate-500 font-semibold">{playerB.category}</div>
                                        </div>
                                    </div>
                                    <span className="text-xs font-black text-slate-900">₹{pBPrice} {smallUnit}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Trade Exchange Strip & Purse Impact */}
                    {playerA && playerB && (
                        <div className="p-4 bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl space-y-3">
                            <div className="flex items-center justify-between text-xs font-black text-slate-900">
                                <span className="flex items-center gap-1.5">
                                    <span className="text-blue-700">{playerA.name}</span>
                                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{teamB?.name}</span>
                                </span>
                                <span>⇄</span>
                                <span className="flex items-center gap-1.5">
                                    <span className="text-purple-700">{playerB.name}</span>
                                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{teamA?.name}</span>
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-blue-200/80 text-xs">
                                <div>
                                    <span className="text-[10px] font-black uppercase text-slate-500 block">{teamA?.name} Purse Impact:</span>
                                    <div className={`font-black ${diffInLargeA > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                                        {diffInLargeA > 0 ? `-₹${(pBPrice - pAPrice)} ${smallUnit}` : `+₹${Math.abs(pBPrice - pAPrice)} ${smallUnit}`}
                                        <span className="text-[10px] text-slate-500 ml-1">(New Purse: ₹{newRemA.toFixed(2)} {largeUnit})</span>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase text-slate-500 block">{teamB?.name} Purse Impact:</span>
                                    <div className={`font-black ${diffInLargeB > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                                        {diffInLargeB > 0 ? `-₹${(pAPrice - pBPrice)} ${smallUnit}` : `+₹${Math.abs(pAPrice - pBPrice)} ${smallUnit}`}
                                        <span className="text-[10px] text-slate-500 ml-1">(New Purse: ₹{newRemB.toFixed(2)} {largeUnit})</span>
                                    </div>
                                </div>
                            </div>

                            {(teamAInsufficient || teamBInsufficient) && (
                                <div className="p-2.5 bg-rose-100 border border-rose-300 rounded-xl text-rose-900 text-xs font-bold flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                                    <span>
                                        {teamAInsufficient ? `${teamA?.name} does not have enough purse balance!` : `${teamB?.name} does not have enough purse balance!`}
                                    </span>
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
                            disabled={submitting || hasError || !playerAId || !playerBId}
                            className={`px-5 py-2.5 rounded-xl font-black text-xs text-white flex items-center gap-2 shadow-sm transition-all cursor-pointer ${
                                submitting || hasError || !playerAId || !playerBId
                                    ? 'bg-slate-300 cursor-not-allowed shadow-none'
                                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25 active:scale-95'
                            }`}
                        >
                            <ArrowLeftRight className="w-4 h-4" />
                            <span>{submitting ? 'Executing Trade...' : 'Execute Player Trade'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TradePlayersModal;

