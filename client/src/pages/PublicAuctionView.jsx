import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
    User, ArrowLeft, Trophy, Clock, Timer, Coffee, Radio, Shield, 
    AlertCircle, Sparkles, Layers, Users, Wallet, ChevronRight, X, ExternalLink, Crown, Search
} from 'lucide-react';
import socket from '../socket';
import { getBudgetUnits } from '../utils/currency';
import SafeImage from '../components/SafeImage';

const PublicAuctionView = () => {
    const { tournamentId } = useParams();
    const [tournament, setTournament] = useState(null);
    const { largeUnit, smallUnit, formatAmount, formatBid } = getBudgetUnits(tournament);
    const [teams, setTeams] = useState([]);
    const [allPlayers, setAllPlayers] = useState([]);
    const [slots, setSlots] = useState([]);

    // Live auction states
    const [currentPlayer, setCurrentPlayer] = useState(null);
    const [currentBid, setCurrentBid] = useState(0);
    const [currentLeadTeam, setCurrentLeadTeam] = useState(null);
    const [bidHistory, setBidHistory] = useState([]);
    const [soldLog, setSoldLog] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [biddingState, setBiddingState] = useState('stopped');
    const [countdownTimer, setCountdownTimer] = useState(null);

    // Navigation and modals
    const [activeTab, setActiveTab] = useState('live'); // 'live' | 'teams' | 'slots' | 'sold' | 'unsold'
    const [selectedSlotFilter, setSelectedSlotFilter] = useState('all');
    const [slotSearchQuery, setSlotSearchQuery] = useState('');
    const [viewingTeam, setViewingTeam] = useState(null);
    const [announcementModal, setAnnouncementModal] = useState(null);

    useEffect(() => {
        if (announcementModal) {
            const timer = setTimeout(() => {
                setAnnouncementModal(null);
            }, 5500);
            return () => clearTimeout(timer);
        }
    }, [announcementModal]);

    useEffect(() => {
        fetchTournamentData();

        const handleConnect = () => {
            setIsConnected(true);
            socket.emit('join_auction', tournamentId);
            fetchTournamentData();
        };
        socket.on('connect', handleConnect);
        if (socket.connected) {
            handleConnect();
        }

        socket.on('new_player', (player) => {
            setCurrentPlayer(player);
            setCurrentBid(player.currentBid || player.basePrice);
            setCurrentLeadTeam(player.currentLeadTeamId || null);
            setBidHistory([]);
        });

        socket.on('bid_update', (data) => {
            setCurrentBid(data.amount);
            setCurrentLeadTeam(data.team);
            setBidHistory(prev => [{
                team: data.team,
                amount: data.amount,
                time: data.timestamp ? new Date(data.timestamp) : new Date()
            }, ...prev]);
        });

        socket.on('bidding_state_changed', ({ state }) => {
            setBiddingState(state);
        });

        socket.on('slot_changed', (data) => {
            if (data?.tournament) {
                setTournament(prev => ({ ...prev, ...data.tournament }));
            }
            if (data?.activeSlotId !== undefined) {
                setTournament(prev => ({ ...prev, activeSlotId: data.activeSlotId }));
            }
        });

        socket.on('auction_status_changed', (data) => {
            if (data?.tournament) {
                setTournament(prev => ({ ...prev, ...data.tournament }));
            }
            if (data?.biddingState) {
                setBiddingState(data.biddingState);
            }
            if (data?.status) {
                setTournament(prev => ({ ...prev, status: data.status }));
            }
        });

        socket.on('timer_tick', (data) => {
            setCountdownTimer(data);
        });

        socket.on('timer_cancelled', () => {
            setCountdownTimer(null);
        });

        socket.on('timer_completed', () => {
            setCountdownTimer(null);
        });

        socket.on('bid_undone', (data) => {
            setCurrentBid(data.currentBid);
            setCurrentLeadTeam(data.leadTeam);
            setBidHistory(prev => prev.slice(1));
        });

        socket.on('sale_rolled_back', (data) => {
            fetchTournamentData();
            if (data?.player) {
                setCurrentPlayer(data.player);
                setCurrentBid(data.player.currentBid || data.player.basePrice);
                setCurrentLeadTeam(data.player.currentLeadTeamId);
            }
            setSoldLog(prev => prev.filter(log => log.player?._id !== data?.player?._id && log.player?.id !== data?.player?._id));
        });

        socket.on('player_sold', (data) => {
            if (data?.team) {
                setTeams(prev => prev.map(t => (t._id === data.team._id || t.id === data.team._id) ? { ...t, ...data.team } : t));
            }
            if (data?.player) {
                setAllPlayers(prev => {
                    const exists = prev.some(p => p._id === data.player._id || p.id === data.player._id);
                    if (exists) return prev.map(p => (p._id === data.player._id || p.id === data.player._id) ? { ...p, ...data.player } : p);
                    return [...prev, data.player];
                });
                setAnnouncementModal({
                    type: 'sold',
                    player: data.player,
                    team: data.team,
                    price: data.player.soldPrice || data.player.sold_price || data.player.currentBid || 0
                });
            }
            setSoldLog(prev => [{
                player: data.player,
                team: data.team,
                price: data.player?.soldPrice || data.player?.sold_price || data.player?.currentBid || 0,
                status: 'sold'
            }, ...prev]);
            fetchTournamentData();
            setCurrentPlayer(null);
            setCurrentLeadTeam(null);
            setCountdownTimer(null);
        });

        socket.on('team_updated', (data) => {
            if (data?.team) {
                setTeams(prev => prev.map(t => (t._id === data.team._id || t.id === data.team._id) ? { ...t, ...data.team } : t));
            }
        });

        socket.on('player_unsold', (data) => {
            const unsoldP = data?.player || currentPlayer;
            if (unsoldP) {
                setAllPlayers(prev => {
                    const exists = prev.some(p => p._id === unsoldP._id || p.id === unsoldP._id);
                    if (exists) return prev.map(p => (p._id === unsoldP._id || p.id === unsoldP._id) ? { ...p, status: 'unsold' } : p);
                    return [...prev, { ...unsoldP, status: 'unsold' }];
                });
                setAnnouncementModal({
                    type: 'unsold',
                    player: unsoldP
                });
                setSoldLog(prev => [{
                    player: unsoldP,
                    team: null,
                    price: 0,
                    status: 'unsold'
                }, ...prev]);
            }
            fetchTournamentData();
            setCurrentPlayer(null);
            setCurrentLeadTeam(null);
            setBidHistory([]);
            setCountdownTimer(null);
        });

        socket.on('unsold_reopened_to_slot', (data) => {
            if (data?.players) {
                setAllPlayers(prev => prev.map(p => {
                    const match = data.players.find(rp => rp._id === p._id || rp.id === p._id);
                    return match ? { ...p, ...match } : p;
                }));
            }
        });

        return () => {
            socket.off('new_player');
            socket.off('bid_update');
            socket.off('player_sold');
            socket.off('player_unsold');
            socket.off('bidding_state_changed');
            socket.off('auction_status_changed');
            socket.off('timer_tick');
            socket.off('timer_cancelled');
            socket.off('timer_completed');
            socket.off('slot_changed');
            socket.off('bid_undone');
            socket.off('sale_rolled_back');
            socket.off('team_updated');
            socket.off('unsold_reopened_to_slot');
            socket.off('connect');
        };
    }, [tournamentId]);

    const fetchBidsForPlayer = async (pId) => {
        if (!pId || !tournamentId) return;
        try {
            const res = await axios.get(`/api/tournaments/${tournamentId}/bids?playerId=${pId}`);
            if (Array.isArray(res.data) && res.data.length > 0) {
                setBidHistory(res.data.map(b => ({
                    team: { name: b.teamName, _id: b.teamId, shortName: b.teamShortName, logo: b.teamLogo },
                    amount: b.bidAmount,
                    time: new Date(b.createdAt)
                })));
            }
        } catch (e) {
            console.warn('Failed to load bids for player:', e);
        }
    };

    const fetchTournamentData = async () => {
        try {
            const [tRes, teamRes, sRes, pRes] = await Promise.all([
                axios.get(`/api/tournaments/${tournamentId}`),
                axios.get(`/api/teams/${tournamentId}`).catch(() => ({ data: [] })),
                axios.get(`/api/tournaments/${tournamentId}/slots`).catch(() => ({ data: [] })),
                axios.get(`/api/players/${tournamentId}`).catch(() => ({ data: [] }))
            ]);
            setTournament(tRes.data);
            setTeams(teamRes.data || []);
            setSlots(sRes.data || []);
            const playersList = pRes.data || [];
            setAllPlayers(playersList);
            setBiddingState(tRes.data.biddingState || (tRes.data.status === 'live' ? 'active' : 'stopped'));

            // Build historical sold log if empty
            if (soldLog.length === 0) {
                const finished = playersList
                    .filter(p => p.status === 'sold' || p.status === 'unsold')
                    .map(p => ({
                        player: p,
                        team: p.soldToTeamId ? (teamRes.data || []).find(t => t._id === p.soldToTeamId) : null,
                        price: p.soldPrice || p.sold_price || p.currentBid || 0,
                        status: p.status
                    }));
                if (finished.length > 0) setSoldLog(finished.reverse());
            }

            if (tRes.data.currentBiddingPlayerId) {
                const active = playersList.find(p => p._id === tRes.data.currentBiddingPlayerId);
                if (active) {
                    setCurrentPlayer(active);
                    setCurrentBid(active.currentBid || active.basePrice);
                    if (active.currentLeadTeamId) {
                        const lead = (teamRes.data || []).find(t => t._id === (active.currentLeadTeamId._id || active.currentLeadTeamId));
                        if (lead) setCurrentLeadTeam(lead);
                    }
                    fetchBidsForPlayer(active._id);
                }
            }
        } catch (err) {
            console.error("Failed to load auction data", err);
        }
    };

    if (!tournament) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-700 font-bold">
                <div className="flex items-center gap-3">
                    <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Loading Live Auction Broadcast...</span>
                </div>
            </div>
        );
    }

    const soldPlayers = allPlayers.filter(p => p.status === 'sold');
    const unsoldPlayers = allPlayers.filter(p => p.status === 'unsold');

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-center mb-6 max-w-7xl mx-auto bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Link to="/" className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <img src="/logo.png" alt="Dab Cric Auction" className="w-11 h-11 rounded-xl object-contain bg-white border border-slate-200 p-1 shadow-sm shrink-0" />
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
                            {tournament.name}
                        </h1>
                        <p className="text-slate-500 text-xs font-semibold flex items-center gap-1.5 mt-0.5">
                            <Radio className="w-3.5 h-3.5 text-blue-600" /> Dab Cric Auction • Live Spectator Arena
                        </p>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex p-1 bg-slate-100 rounded-xl overflow-x-auto w-full md:w-auto">
                    <button
                        onClick={() => setActiveTab('live')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'live' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Live Stage
                    </button>
                    <button
                        onClick={() => setActiveTab('teams')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'teams' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Teams & Purses ({teams.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('slots')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                            activeTab === 'slots' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Layers className="w-3.5 h-3.5 text-purple-600" />
                        Slots / Sets ({slots.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('sold')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'sold' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Sold Log ({soldPlayers.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('unsold')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'unsold' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Unsold Pool ({unsoldPlayers.length})
                    </button>
                </div>

                <div className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full shrink-0">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-emerald-700 font-mono text-xs font-bold tracking-wider uppercase">
                        {isConnected ? 'Broadcast LIVE' : 'Connecting...'}
                    </span>
                </div>
            </header>

            {/* TAB 1: LIVE AUCTION STAGE */}
            {activeTab === 'live' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
                    {/* Main Stage Card */}
                    <div className="lg:col-span-8">
                        <div className="relative bg-white border border-slate-200 rounded-3xl p-8 md:p-10 overflow-hidden shadow-sm min-h-[480px] flex flex-col justify-center">

                            {/* CASE 0: AUCTION OFFICIALLY COMPLETED */}
                            {tournament.status === 'completed' ? (
                                <div className="text-center py-10 px-4 max-w-xl mx-auto">
                                    <div className="w-20 h-20 bg-purple-50 border-2 border-purple-300 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                        <Trophy className="w-10 h-10 text-purple-600 animate-bounce" />
                                    </div>
                                    <span className="px-3.5 py-1 bg-purple-100 text-purple-900 border border-purple-300 rounded-full text-xs font-black uppercase tracking-wider inline-block mb-3">
                                        🏆 AUCTION OFFICIALLY COMPLETED
                                    </span>
                                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">
                                        {tournament.name} Auction Has Concluded!
                                    </h2>
                                    <p className="text-xs md:text-sm text-slate-500 font-semibold leading-relaxed mb-6">
                                        All bidding rounds have finished. Congratulations to all participating team franchises, owners, and cricket players!
                                    </p>

                                    <div className="grid grid-cols-3 gap-3 text-center">
                                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Players Sold</span>
                                            <span className="text-xl font-black text-emerald-600">{soldPlayers.length}</span>
                                        </div>
                                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Unsold Pool</span>
                                            <span className="text-xl font-black text-rose-600">{unsoldPlayers.length}</span>
                                        </div>
                                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Teams</span>
                                            <span className="text-xl font-black text-blue-700">{teams.length}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (!tournament.status || tournament.status === 'upcoming' || tournament.status === 'inactive' || biddingState === 'stopped') ? (
                                <div className="text-center py-12 px-4 max-w-xl mx-auto">
                                    <div className="w-20 h-20 bg-blue-50 border-2 border-blue-200 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-xs">
                                        <Trophy className="w-10 h-10 text-blue-600" />
                                    </div>
                                    <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-xs font-black uppercase tracking-wider inline-block mb-3">
                                        Standby Screen
                                    </span>
                                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">
                                        AUCTION HAS NOT STARTED YET
                                    </h2>
                                    <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed mb-6">
                                        The official live auction for <strong className="text-slate-800">{tournament.name}</strong> will begin shortly. Teams and officials are assembling. Please stay tuned!
                                    </p>

                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-left">
                                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Squad Limit</span>
                                            <span className="text-sm font-black text-slate-900">{tournament.squadSizeLimit || 25} Players / Team</span>
                                        </div>
                                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Teams</span>
                                            <span className="text-sm font-black text-slate-900">{teams.length} Registered</span>
                                        </div>
                                        <div className="col-span-2 md:col-span-1 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Format</span>
                                            <span className="text-sm font-black text-blue-700 capitalize">{tournament.auctionType?.replace('_', ' ') || 'Owner Driven'}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : biddingState === 'break' ? (
                                /* CASE 2: AUCTION ON SHORT BREAK */
                                <div className="text-center py-14 px-4 max-w-xl mx-auto">
                                    <div className="w-20 h-20 bg-amber-50 border-2 border-amber-200 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-xs animate-bounce">
                                        <Coffee className="w-10 h-10 text-amber-600" />
                                    </div>
                                    <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-xs font-black uppercase tracking-wider inline-block mb-3">
                                        Break in Progress
                                    </span>
                                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">
                                        AUCTION IS ON A SHORT BREAK
                                    </h2>
                                    <p className="text-xs md:text-sm text-slate-600 font-medium leading-relaxed mb-6">
                                        Please wait for a while. The auction for <strong className="text-slate-800">{tournament.name}</strong> will resume shortly after the break!
                                    </p>
                                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl inline-flex items-center gap-2 text-xs font-bold text-slate-600">
                                        <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                                        <span>Live feed will resume automatically</span>
                                    </div>
                                </div>
                            ) : currentPlayer ? (
                                /* CASE 3: ACTIVE PLAYER ON STAGE */
                                <>
                                    {biddingState === 'paused' && (
                                        <div className="relative z-20 mb-6 p-3.5 rounded-2xl bg-amber-100 border border-amber-300 text-amber-900 font-black text-xs flex items-center justify-center gap-2 animate-pulse">
                                            <span className="w-2 h-2 rounded-full bg-amber-600" />
                                            AUCTION BIDDING IS CURRENTLY PAUSED BY AUCTIONEER
                                        </div>
                                    )}

                                    {/* 10-Second Countdown Banner */}
                                    {countdownTimer?.status === 'running' && (
                                        <div className="relative z-20 mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-lg animate-pulse flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-lg">
                                                    <Timer className="w-5 h-5 text-white animate-spin" />
                                                </div>
                                                <div>
                                                    <span className="text-xs font-black uppercase tracking-wider block">FINAL CALL — GOING ONCE, GOING TWICE...</span>
                                                    <span className="text-xs text-amber-100 font-semibold">
                                                        {currentLeadTeam ? `Current Lead: ₹${currentBid}${smallUnit} by ${currentLeadTeam.name}` : 'Awaiting last-second bid!'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-3xl md:text-4xl font-black bg-white/20 px-4 py-1 rounded-xl tabular-nums">
                                                {countdownTimer.timeLeft}s
                                            </div>
                                        </div>
                                    )}

                                    <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
                                        <div className="w-44 h-44 md:w-56 md:h-56 rounded-2xl border-2 border-slate-200 p-2 shadow-sm bg-slate-50 overflow-hidden shrink-0">
                                            <SafeImage
                                                src={currentPlayer.image}
                                                alt={currentPlayer.name}
                                                previewable={true}
                                                previewTitle={currentPlayer.name}
                                                className="w-full h-full rounded-xl object-cover"
                                                fallback={<div className="w-full h-full flex items-center justify-center text-slate-400"><User className="w-20 h-20" /></div>}
                                            />
                                        </div>

                                        <div className="flex-1 text-center md:text-left pt-2">
                                            <div className="flex items-center gap-2 justify-center md:justify-start mb-3 flex-wrap">
                                                {slots.find(s => s._id === tournament?.activeSlotId) && (
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 border border-purple-200 rounded-full text-purple-800 text-xs font-black uppercase tracking-wider">
                                                        <Layers className="w-3.5 h-3.5 text-purple-600" />
                                                        <span>Set: {slots.find(s => s._id === tournament?.activeSlotId).name}</span>
                                                    </div>
                                                )}
                                                <div className="inline-block px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-blue-700 text-xs font-bold uppercase tracking-wider">
                                                    {currentPlayer.category}
                                                </div>
                                            </div>
                                            <h2 className="text-3xl md:text-5xl font-black mb-2 tracking-tight text-slate-900">{currentPlayer.name}</h2>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 mt-5">
                                                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                                                    <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">Base Price</div>
                                                    <div className="text-base font-black text-slate-800">₹{currentPlayer.basePrice} {smallUnit}</div>
                                                </div>
                                                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                                                    <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">Role</div>
                                                    <div className="text-base font-black text-blue-700">{currentPlayer.category}</div>
                                                </div>
                                                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                                                    <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">Batting</div>
                                                    <div className="text-xs font-bold text-slate-800">{currentPlayer.battingStyle || 'Right-Hand'}</div>
                                                </div>
                                                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                                                    <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">Bowling</div>
                                                    <div className="text-xs font-bold text-slate-800">{currentPlayer.bowlingStyle || 'None'}</div>
                                                </div>
                                            </div>

                                            {/* Cricket Career Stats Bar */}
                                            {currentPlayer.stats && (
                                                <div className="flex flex-wrap items-center gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                                    <span className="font-extrabold text-slate-500 text-[10px] uppercase mr-1">Career:</span>
                                                    <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-bold text-slate-700">Matches: {currentPlayer.stats.matches || 0}</span>
                                                    <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-bold text-slate-700">Runs: {currentPlayer.stats.runs || 0}</span>
                                                    <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-bold text-slate-700">High: {currentPlayer.stats.highestScore || 0}</span>
                                                    <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-bold text-slate-700">Wickets: {currentPlayer.stats.wickets || 0}</span>
                                                    {currentPlayer.stats.bestBowling && currentPlayer.stats.bestBowling !== '-' && (
                                                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-bold text-slate-700">BB: {currentPlayer.stats.bestBowling}</span>
                                                    )}
                                                    {currentPlayer.cricHeroesProfileUrl && (
                                                        <a
                                                            href={currentPlayer.cricHeroesProfileUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="ml-auto text-blue-600 hover:text-blue-800 font-bold text-[11px] underline flex items-center gap-1"
                                                        >
                                                            <span>CricHeroes</span>
                                                            <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Bidding Display */}
                                    <div className="mt-8 border-t border-slate-100 pt-6">
                                        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                                            <div>
                                                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Current Highest Bid</p>
                                                <div className="text-6xl font-black text-emerald-700 tabular-nums tracking-tight">
                                                    ₹{currentBid} <span className="text-2xl text-slate-500 font-semibold">{smallUnit}</span>
                                                </div>
                                            </div>

                                            {currentLeadTeam ? (
                                                <div className="flex items-center gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                                                    <div className="text-right">
                                                        <p className="text-[11px] text-slate-500 uppercase font-bold mb-0.5">Leading Bidder</p>
                                                        <p className="text-lg font-black text-slate-900 leading-none">{currentLeadTeam.name}</p>
                                                    </div>
                                                    <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center font-black text-base text-blue-700 shadow-sm border border-slate-200 uppercase overflow-hidden">
                                                        <SafeImage
                                                            src={currentLeadTeam.logo}
                                                            alt={currentLeadTeam.name || 'Team'}
                                                            className="w-full h-full object-cover"
                                                            fallback={currentLeadTeam.shortName || 'TM'}
                                                            previewable={true}
                                                            previewTitle={currentLeadTeam.name}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-sm text-slate-500 font-medium">
                                                    Waiting for opening bid...
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-20">
                                    <Trophy className="w-14 h-14 mx-auto mb-3 text-slate-300" />
                                    <h2 className="text-2xl font-black text-slate-700 mb-1">Waiting for next player...</h2>
                                    <p className="text-xs text-slate-500">The auctioneer is currently bringing up the next player to auction.</p>
                                </div>
                            )}
                        </div>

                        {/* Live Ticker - Sold Log */}
                        {soldLog.length > 0 && (
                            <div className="mt-6 overflow-hidden relative">
                                <div className="flex gap-3 overflow-x-auto pb-2">
                                    {soldLog.map((log, i) => (
                                        <div key={i} className="inline-flex items-center gap-2 bg-white border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 min-w-max shadow-2xs">
                                            <span className={`w-2 h-2 rounded-full ${log.status === 'unsold' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                            {log.status === 'unsold' ? (
                                                <span>Unsold: {log.player?.name}</span>
                                            ) : (
                                                <span>Sold: {log.player?.name} to {log.team?.name || 'Winner'} for ₹{formatAmount(log.price)}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar - Recent Bids */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 h-[480px] flex flex-col shadow-sm">
                            <h3 className="text-base font-black mb-4 flex items-center gap-2 text-slate-900">
                                Live Bid Stream
                            </h3>
                            {bidHistory.length > 0 ? (
                                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                                    {bidHistory.map((bid, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-slate-700 shadow-2xs bg-white border border-slate-200 overflow-hidden">
                                                    <SafeImage
                                                        src={bid.team?.logo}
                                                        alt={bid.team?.name || 'Team'}
                                                        className="w-full h-full object-cover"
                                                        fallback={bid.team?.shortName || 'TM'}
                                                        previewable={true}
                                                        previewTitle={bid.team?.name || 'Team'}
                                                    />
                                                </div>
                                                <div>
                                                    <span className="font-bold text-slate-900 block text-xs">{bid.team?.name || 'Unknown Team'}</span>
                                                    <span className="text-[10px] text-slate-400 font-semibold">{bid.time.toLocaleTimeString()}</span>
                                                </div>
                                            </div>
                                            <span className="font-black text-emerald-700 text-xs">₹{bid.amount} {smallUnit}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-slate-400 text-xs italic">
                                    No bids placed on current player yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: TEAMS & PURSES */}
            {activeTab === 'teams' && (
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {teams.map(t => {
                            const teamSquad = allPlayers.filter(p => p.soldToTeamId === t._id || p.soldToTeamId === t.id);
                            const remaining = ((Number(t.budget) || 0) - (Number(t.spent) || 0)).toFixed(2);

                            return (
                                <div
                                    key={t._id}
                                    className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:border-blue-300 transition-all flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex items-center gap-3.5 mb-4">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black flex items-center justify-center text-xl shadow-xs uppercase overflow-hidden shrink-0">
                                                <SafeImage
                                                    src={t.logo}
                                                    alt={t.name}
                                                    className="w-full h-full object-cover"
                                                    fallback={t.shortName || t.name?.substring(0, 2)}
                                                    previewable={true}
                                                    previewTitle={t.name}
                                                />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-base text-slate-900 leading-snug">{t.name}</h3>
                                                <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded uppercase mt-0.5 inline-block">
                                                    {t.shortName || 'Team'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center mb-4">
                                            <div>
                                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Remaining Purse</span>
                                                <span className="text-lg font-black text-emerald-700 tabular-nums">₹{remaining} <span className="text-xs">{largeUnit}</span></span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Total Spent</span>
                                                <span className="text-lg font-black text-slate-800 tabular-nums">₹{(Number(t.spent) || 0).toFixed(2)} <span className="text-xs">{largeUnit}</span></span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-4 px-1">
                                            <span>Squad Size:</span>
                                            <strong className="text-slate-900 font-black">{teamSquad.length} / {tournament.squadSizeLimit || 25}</strong>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setViewingTeam(t)}
                                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                                    >
                                        <Users className="w-3.5 h-3.5" /> View Acquired Squad ({teamSquad.length})
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* TAB 3: SLOTS / SETS WISE PLAYERS */}
            {activeTab === 'slots' && (
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                    <Layers className="w-5 h-5 text-purple-600" />
                                    Slots / Sets Wise Players List
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Browse players by configured auction slots, upcoming sets, and live bidding status.
                                </p>
                            </div>
                            <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-black">
                                {slots.length} Slots Configured
                            </span>
                        </div>

                        {/* Search & Slot filter */}
                        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between mb-5">
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Search players by name, role or style across slots..."
                                    value={slotSearchQuery}
                                    onChange={(e) => setSlotSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                />
                            </div>
                            {slots.length > 0 && (
                                <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs shrink-0 max-w-full">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedSlotFilter('all')}
                                        className={`px-3 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer shrink-0 ${
                                            selectedSlotFilter === 'all'
                                                ? 'bg-purple-600 text-white shadow-xs'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        All Slots ({slots.length})
                                    </button>
                                    {slots.map(s => {
                                        const isCurrentActive = tournament?.activeSlotId === s._id;
                                        return (
                                            <button
                                                key={s._id}
                                                type="button"
                                                onClick={() => setSelectedSlotFilter(s._id)}
                                                className={`px-3 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                                                    selectedSlotFilter === s._id
                                                        ? 'bg-purple-600 text-white shadow-xs'
                                                        : isCurrentActive
                                                        ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                            >
                                                {isCurrentActive && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                                                <span>{s.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Displaying Slots and their players */}
                        {(() => {
                            const filteredSlots = selectedSlotFilter === 'all'
                                ? slots
                                : slots.filter(s => s._id === selectedSlotFilter);

                            const q = slotSearchQuery.trim().toLowerCase();

                            if (slots.length === 0) {
                                const displayPlayers = allPlayers.filter(p => !q || p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q));
                                return (
                                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
                                        <Layers className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                                        <p className="font-bold text-slate-700 text-sm">No custom slots configured for this tournament yet.</p>
                                        <p className="text-xs text-slate-500 mt-1">Showing all {displayPlayers.length} tournament players in general pool.</p>
                                    </div>
                                );
                            }

                            return (
                                <div className="space-y-4">
                                    {filteredSlots.map(slot => {
                                        const isUnsoldSlot = slot.isDefaultUnsold || slot.slotType === 'unsold';
                                        const isActive = tournament?.activeSlotId === slot._id;
                                        let sPlayers = allPlayers.filter(p =>
                                            p.slotId === slot._id ||
                                            p.originalSlotId === slot._id ||
                                            (isUnsoldSlot && (p.slotId === slot._id || p.status === 'unsold'))
                                        );

                                        if (q) {
                                            sPlayers = sPlayers.filter(p =>
                                                p.name?.toLowerCase().includes(q) ||
                                                p.category?.toLowerCase().includes(q) ||
                                                p.battingStyle?.toLowerCase().includes(q) ||
                                                p.bowlingStyle?.toLowerCase().includes(q)
                                            );
                                        }

                                        const sSold = sPlayers.filter(p => p.status === 'sold');
                                        const sPending = sPlayers.filter(p => p.status === 'pending' || (isUnsoldSlot && p.status === 'unsold'));

                                        return (
                                            <div
                                                key={slot._id}
                                                className={`border rounded-2xl overflow-hidden transition-all ${
                                                    isActive
                                                        ? 'border-purple-300 bg-purple-50/20 shadow-sm'
                                                        : 'border-slate-200 bg-white'
                                                }`}
                                            >
                                                {/* Slot Header */}
                                                <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${
                                                    isActive ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 border-slate-200'
                                                }`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                                                            isActive ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-700'
                                                        }`}>
                                                            {isUnsoldSlot ? '🔄' : (slot.order || slot.name.substring(0, 2))}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-black text-slate-900 text-sm">{slot.name}</h4>
                                                                {isActive && (
                                                                    <span className="px-2 py-0.5 bg-purple-600 text-white rounded text-[10px] font-black uppercase flex items-center gap-1">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                                        Active Slot Now
                                                                    </span>
                                                                )}
                                                                {slot.role && (
                                                                    <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-bold">
                                                                        {slot.role}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                                                Base Price: <strong className="text-slate-800">₹{slot.basePrice ? `${slot.basePrice} ${smallUnit}` : 'Player Base Price'}</strong>
                                                                {slot.description ? ` • ${slot.description}` : ''}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 text-[11px] font-bold">
                                                        <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700">
                                                            Total: {sPlayers.length}
                                                        </span>
                                                        <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800">
                                                            Sold: {sSold.length}
                                                        </span>
                                                        <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                                                            Upcoming: {sPending.length}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Slot Players Table */}
                                                {sPlayers.length === 0 ? (
                                                    <div className="p-6 text-center text-slate-400 text-xs italic">
                                                        No players found in this slot matching criteria.
                                                    </div>
                                                ) : (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left text-xs border-collapse">
                                                            <thead className="bg-slate-50/60 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
                                                                <tr>
                                                                    <th className="p-3 w-10">#</th>
                                                                    <th className="p-3">Player</th>
                                                                    <th className="p-3">Role / Styles</th>
                                                                    <th className="p-3 text-right">Base Price</th>
                                                                    <th className="p-3 text-right">Status / Price</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                                {sPlayers.map((p, idx) => {
                                                                    const isCurrent = currentPlayer?._id === p._id;
                                                                    const buyerTeam = teams.find(t => t._id === p.soldToTeamId || t.id === p.soldToTeamId);

                                                                    return (
                                                                        <tr
                                                                            key={p._id || idx}
                                                                            className={`hover:bg-slate-50 transition-colors ${
                                                                                isCurrent ? 'bg-purple-50/60 font-semibold' : ''
                                                                            }`}
                                                                        >
                                                                            <td className="p-3 text-slate-400 font-bold">{idx + 1}</td>
                                                                            <td className="p-3 font-extrabold text-slate-900 flex items-center gap-2.5">
                                                                                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                                                                    <SafeImage
                                                                                        src={p.image}
                                                                                        alt={p.name}
                                                                                        previewable={true}
                                                                                        previewTitle={p.name}
                                                                                        className="w-full h-full object-cover"
                                                                                        fallback={<User className="w-4 h-4 text-slate-400" />}
                                                                                    />
                                                                                </div>
                                                                                <span>{p.name}</span>
                                                                                {isCurrent && (
                                                                                    <span className="px-2 py-0.5 bg-purple-600 text-white rounded text-[9px] font-black uppercase animate-pulse">
                                                                                        Live Now
                                                                                    </span>
                                                                                )}
                                                                            </td>
                                                                            <td className="p-3 text-slate-600">
                                                                                <span className="font-bold text-slate-800">{p.category}</span>
                                                                                <div className="text-[10px] text-slate-400">
                                                                                    {[p.battingStyle, p.bowlingStyle].filter(Boolean).join(' • ') || 'All-Rounder'}
                                                                                </div>
                                                                            </td>
                                                                            <td className="p-3 text-right font-bold text-slate-700">
                                                                                ₹{p.basePrice || slot.basePrice || 0} {smallUnit}
                                                                            </td>
                                                                            <td className="p-3 text-right">
                                                                                {p.status === 'sold' ? (
                                                                                    <div>
                                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black text-[11px]">
                                                                                            SOLD ₹{p.soldPrice || p.sold_price || p.currentBid || 0} {smallUnit}
                                                                                        </span>
                                                                                        {buyerTeam && (
                                                                                            <span className="block text-[10px] font-bold text-emerald-700 mt-0.5">
                                                                                                → {buyerTeam.name}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                ) : isCurrent ? (
                                                                                    <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-black text-[11px]">
                                                                                        BIDDING: ₹{currentBid} {smallUnit}
                                                                                    </span>
                                                                                ) : p.status === 'unsold' ? (
                                                                                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[11px]">
                                                                                        UNSOLD
                                                                                    </span>
                                                                                ) : p.status === 'injured' ? (
                                                                                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[11px]">
                                                                                        INJURED
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold text-[11px]">
                                                                                        UPCOMING
                                                                                    </span>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* TAB 4: SOLD PLAYERS LOG */}
            {activeTab === 'sold' && (
                <div className="max-w-7xl mx-auto bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-5">
                        <div>
                            <h3 className="text-lg font-black text-slate-900">Sold Players List ({soldPlayers.length})</h3>
                            <p className="text-xs text-slate-500">Every player successfully sold in this tournament auction.</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                                <tr>
                                    <th className="p-3.5 rounded-l-xl border-y border-slate-200">Player</th>
                                    <th className="p-3.5 border-y border-slate-200">Role & Style</th>
                                    <th className="p-3.5 border-y border-slate-200">Base Price</th>
                                    <th className="p-3.5 border-y border-slate-200">Purchased By</th>
                                    <th className="p-3.5 rounded-r-xl text-right border-y border-slate-200">Final Sold Price</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {soldPlayers.length > 0 ? soldPlayers.map(p => {
                                    const buyerTeam = teams.find(t => t._id === p.soldToTeamId || t.id === p.soldToTeamId);
                                    return (
                                        <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-3.5 font-bold text-slate-900 flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                                    <SafeImage
                                                        src={p.image}
                                                        alt={p.name}
                                                        previewable={true}
                                                        previewTitle={p.name}
                                                        className="w-full h-full object-cover"
                                                        fallback={<User size={16} className="text-slate-400" />}
                                                    />
                                                </div>
                                                <span className="font-black text-sm">{p.name}</span>
                                            </td>
                                            <td className="p-3.5">
                                                <span className="font-bold text-slate-700 block">{p.category}</span>
                                                <span className="text-[11px] text-slate-500">{p.battingStyle || '-'}{p.bowlingStyle ? ` • ${p.bowlingStyle}` : ''}</span>
                                            </td>
                                            <td className="p-3.5 font-bold text-slate-600">₹{p.basePrice} {smallUnit}</td>
                                            <td className="p-3.5 font-bold text-blue-700">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-[10px] font-black text-slate-700">
                                                        <SafeImage src={buyerTeam?.logo} alt={buyerTeam?.name || 'Team'} className="w-full h-full object-cover" fallback={buyerTeam?.shortName || 'TM'} />
                                                    </div>
                                                    <span>{buyerTeam?.name || 'Assigned Team'}</span>
                                                </div>
                                            </td>
                                            <td className="p-3.5 text-right font-black text-emerald-700 text-sm">
                                                ₹{formatAmount(p.soldPrice || p.sold_price || p.currentBid || p.basePrice)}
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan="5" className="p-12 text-center text-slate-400 italic">No players sold yet in this auction.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 4: UNSOLD PLAYERS */}
            {activeTab === 'unsold' && (
                <div className="max-w-7xl mx-auto bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-5">
                        <div>
                            <h3 className="text-lg font-black text-slate-900">Unsold Players ({unsoldPlayers.length})</h3>
                            <p className="text-xs text-slate-500">Players who passed without bids and are waiting for the re-auction round.</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                                <tr>
                                    <th className="p-3.5 rounded-l-xl border-y border-slate-200">Player</th>
                                    <th className="p-3.5 border-y border-slate-200">Role</th>
                                    <th className="p-3.5 border-y border-slate-200">Styles</th>
                                    <th className="p-3.5 rounded-r-xl text-right border-y border-slate-200">Base Price</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {unsoldPlayers.length > 0 ? unsoldPlayers.map(p => (
                                    <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-3.5 font-bold text-slate-900 flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                                <SafeImage
                                                    src={p.image}
                                                    alt={p.name}
                                                    previewable={true}
                                                    previewTitle={p.name}
                                                    className="w-full h-full object-cover grayscale"
                                                    fallback={<User size={16} className="text-slate-400" />}
                                                />
                                            </div>
                                            <div>
                                                <span className="font-black text-sm block">{p.name}</span>
                                                <span className="text-[10px] text-amber-600 font-extrabold uppercase">Unsold (Re-Auction Eligible)</span>
                                            </div>
                                        </td>
                                        <td className="p-3.5 text-slate-700 font-bold">{p.category}</td>
                                        <td className="p-3.5 text-slate-500">
                                            {p.battingStyle || '-'}{p.bowlingStyle ? ` • ${p.bowlingStyle}` : ''}
                                        </td>
                                        <td className="p-3.5 text-right font-black text-slate-900">₹{p.basePrice} {smallUnit}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" className="p-12 text-center text-slate-400 italic">No unsold players yet in this auction.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Team Acquired Squad Modal */}
            {viewingTeam && (
                <div 
                    className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
                    onClick={() => setViewingTeam(null)}
                >
                    <div 
                        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-5 md:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                            <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black flex items-center justify-center text-lg shadow-xs uppercase overflow-hidden">
                                    <SafeImage
                                        src={viewingTeam.logo}
                                        alt={viewingTeam.name}
                                        className="w-full h-full object-cover"
                                        fallback={viewingTeam.shortName || viewingTeam.name?.substring(0, 2)}
                                        previewable={true}
                                        previewTitle={viewingTeam.name}
                                    />
                                </div>
                                <div>
                                    <h3 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2">
                                        {viewingTeam.name}
                                        {viewingTeam.shortName && (
                                            <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-extrabold uppercase">
                                                {viewingTeam.shortName}
                                            </span>
                                        )}
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                                        Purse Remaining: <strong className="text-emerald-700 font-black">₹{((Number(viewingTeam.budget) || 0) - (Number(viewingTeam.spent) || 0)).toFixed(2)} {largeUnit}</strong> • Spent: ₹{(Number(viewingTeam.spent) || 0).toFixed(2)} {largeUnit}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setViewingTeam(null)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Content - Player List */}
                        <div className="p-5 md:p-6 overflow-y-auto flex-1 space-y-4">
                            {(() => {
                                const teamSquad = allPlayers.filter(p => p.soldToTeamId === viewingTeam._id || p.soldToTeamId === viewingTeam.id);
                                return (
                                    <>
                                        <div className="flex flex-wrap justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-200 gap-2">
                                            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                                <Users className="w-4 h-4 text-blue-600" />
                                                Acquired Players: <strong className="text-slate-900 font-black">{teamSquad.length}</strong> / {tournament.squadSizeLimit || 25}
                                            </span>
                                            <span className="text-xs font-bold text-slate-600">
                                                Total Spent: <strong className="text-emerald-700 font-black">₹{teamSquad.reduce((acc, p) => acc + (Number(p.soldPrice || p.sold_price || p.currentBid || p.basePrice) || 0), 0)} {smallUnit}</strong>
                                            </span>
                                        </div>

                                        {teamSquad.length > 0 || viewingTeam.isOwnerCaptain ? (
                                            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                                                {viewingTeam.isOwnerCaptain && !teamSquad.some(p => p.isCaptain) && (
                                                    <div className="p-3.5 bg-amber-50/80 border-b border-amber-200/90 flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 overflow-hidden flex items-center justify-center shrink-0">
                                                                <SafeImage
                                                                    src={viewingTeam.captainPhoto}
                                                                    alt="Captain"
                                                                    previewable={true}
                                                                    previewTitle={viewingTeam.captainName || 'Team Captain'}
                                                                    className="w-full h-full object-cover"
                                                                    fallback={<Crown className="w-5 h-5 text-amber-600" />}
                                                                />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <h4 className="text-sm font-black text-slate-900 leading-snug">{viewingTeam.captainName || 'Team Captain'}</h4>
                                                                    <span className="px-1.5 py-0.5 bg-amber-200 text-amber-900 text-[9px] font-black rounded uppercase flex items-center gap-0.5">
                                                                        <Crown className="w-2.5 h-2.5" /> Captain
                                                                    </span>
                                                                </div>
                                                                <div className="text-[11px] font-semibold text-amber-800">Direct Retained Squad Leader</div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <div className="text-sm font-black text-amber-900 tabular-nums">₹{viewingTeam.captainPrice || 0} {smallUnit}</div>
                                                            <div className="text-[10px] text-amber-700 font-bold">Retained</div>
                                                        </div>
                                                    </div>
                                                )}
                                                {teamSquad.map((p, idx) => (
                                                    <div key={p._id || idx} className="p-3.5 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                                                <SafeImage
                                                                    src={p.image}
                                                                    alt={p.name}
                                                                    previewable={true}
                                                                    previewTitle={p.name}
                                                                    className="w-full h-full object-cover"
                                                                    fallback={<User className="w-5 h-5 text-slate-400" />}
                                                                />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-sm font-bold text-slate-900 leading-snug">{p.name}</h4>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                                                        {p.category}
                                                                    </span>
                                                                    {p.battingStyle && (
                                                                        <span className="text-[10px] text-slate-400 hidden sm:inline">
                                                                            🏏 {p.battingStyle}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="text-right shrink-0">
                                                            <div className="text-sm font-black text-slate-900 tabular-nums">
                                                                ₹{p.soldPrice || p.sold_price || p.currentBid || p.basePrice || 0} {smallUnit}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400">
                                                                Base: ₹{p.basePrice || 0} {smallUnit}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                                <p className="text-sm font-bold text-slate-700">No Players Purchased Yet</p>
                                                <p className="text-xs text-slate-400 mt-0.5">{viewingTeam.name} has not won any bids in this auction yet.</p>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setViewingTeam(null)}
                                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs active:scale-95"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Real-time Sold / Unsold Announcement Pop-Up Modal */}
            {announcementModal && (
                <div 
                    className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setAnnouncementModal(null)}
                >
                    <div 
                        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 relative text-center"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="h-1.5 w-full bg-slate-100 overflow-hidden">
                            <div className={`h-full ${announcementModal.type === 'sold' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
                        </div>

                        <button 
                            onClick={() => setAnnouncementModal(null)}
                            className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer z-10"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="p-6 md:p-8">
                            {announcementModal.type === 'sold' ? (
                                <>
                                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-sm uppercase tracking-wider mb-4 animate-bounce">
                                        <Sparkles className="w-4 h-4 text-emerald-600" />
                                        🎉 SOLD!
                                    </div>

                                    {/* Player image */}
                                    <div className="w-28 h-28 mx-auto rounded-2xl border-4 border-emerald-200 overflow-hidden shadow-md bg-slate-100 mb-3">
                                        <SafeImage
                                            src={announcementModal.player?.image}
                                            alt={announcementModal.player?.name}
                                            previewable={true}
                                            previewTitle={announcementModal.player?.name}
                                            className="w-full h-full object-cover"
                                            fallback={
                                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                    <User className="w-12 h-12" />
                                                </div>
                                            }
                                        />
                                    </div>

                                    <h3 className="text-2xl font-black text-slate-900">{announcementModal.player?.name}</h3>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                                        {announcementModal.player?.category} • Base ₹{announcementModal.player?.basePrice} {smallUnit}
                                    </p>

                                    {/* Winning Team & Price Card */}
                                    <div className="mt-5 p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 flex items-center justify-between">
                                        <div className="flex items-center gap-3 text-left">
                                            <div className="w-12 h-12 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-slate-800 font-black text-sm shadow-2xs overflow-hidden shrink-0">
                                                <SafeImage
                                                    src={announcementModal.team?.logo}
                                                    alt={announcementModal.team?.name}
                                                    className="w-full h-full object-cover"
                                                    fallback={announcementModal.team?.shortName || announcementModal.team?.name?.substring(0, 2)}
                                                    previewable={true}
                                                    previewTitle={announcementModal.team?.name || 'Winner Team'}
                                                />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-extrabold uppercase text-emerald-700 tracking-wider block">Sold To</span>
                                                <span className="text-sm font-black text-slate-900 block">{announcementModal.team?.name || 'Winning Team'}</span>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">Sold Price</span>
                                            <span className="text-xl font-black text-emerald-700 tabular-nums">
                                                ₹{formatAmount(announcementModal.price)}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-black text-sm uppercase tracking-wider mb-4">
                                        <AlertCircle className="w-4 h-4 text-amber-600" />
                                        ⚠️ UNSOLD
                                    </div>

                                    <div className="w-24 h-24 mx-auto rounded-2xl border-4 border-amber-200 overflow-hidden shadow-md bg-slate-100 mb-3">
                                        <SafeImage
                                            src={announcementModal.player?.image}
                                            alt={announcementModal.player?.name}
                                            previewable={true}
                                            previewTitle={announcementModal.player?.name}
                                            className="w-full h-full object-cover grayscale"
                                            fallback={
                                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                    <User className="w-10 h-10" />
                                                </div>
                                            }
                                        />
                                    </div>

                                    <h3 className="text-2xl font-black text-slate-900">{announcementModal.player?.name}</h3>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                                        {announcementModal.player?.category} • Base ₹{announcementModal.player?.basePrice} {smallUnit}
                                    </p>

                                    <div className="mt-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
                                        No bids received. Player moved to Unsold Pool and will be eligible for the Re-Auction round.
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                            <button
                                onClick={() => setAnnouncementModal(null)}
                                className="text-xs font-bold text-slate-600 hover:text-slate-900 px-4 py-1.5 rounded-lg hover:bg-slate-200 transition-colors"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublicAuctionView;