import React, { useState, useEffect, useRef } from 'react';
import { Gavel, Users, Wallet, Shield, LogOut, User, Timer, TrendingUp, Coffee, Clock, AlertCircle, Layers, Sparkles, Zap, X, ChevronRight, Eye, Crown, Radio, Trophy, Pause, Search, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';
import { getBudgetUnits, getBidIncrement } from '../utils/currency';
import toast from '../lib/toast';
import SafeImage from '../components/SafeImage';
import { useVoiceChat } from '../hooks/useVoiceChat';
import VoiceChatPanel from '../components/voice/VoiceChatPanel';

const OwnerDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [teamData, setTeamData] = useState(null);
    const [squad, setSquad] = useState([]);
    const [allPlayers, setAllPlayers] = useState([]);
    const [otherTeams, setOtherTeams] = useState([]);
    const [tournament, setTournament] = useState(null);
    const { largeUnit, smallUnit, formatAmount, formatPrice, formatPriceParts, formatBid } = getBudgetUnits(tournament);
    const [slots, setSlots] = useState([]);
    const [viewingTeam, setViewingTeam] = useState(null);
    const [announcementModal, setAnnouncementModal] = useState(null);
    const [leftTab, setLeftTab] = useState('squad'); // 'squad' | 'slots' | 'unsold'
    const [selectedSlotFilter, setSelectedSlotFilter] = useState('all');
    const [slotSearchQuery, setSlotSearchQuery] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const ownerTourneyId = user?.tournamentId ? (typeof user.tournamentId === 'object' ? user.tournamentId._id : user.tournamentId) : null;
    const isOwnerModerator = ['superadmin', 'admin', 'auctioneer'].includes((user?.role || '').toLowerCase());
    const voice = useVoiceChat({ tournamentId: ownerTourneyId, user });

    // Auction State
    const [currentPlayer, setCurrentPlayer] = useState(null);
    const [currentBid, setCurrentBid] = useState(0);
    const [currentLeadTeam, setCurrentLeadTeam] = useState(null);
    const [biddingState, setBiddingState] = useState('active');
    const [countdownTimer, setCountdownTimer] = useState(null);
    const [hammerStriking, setHammerStriking] = useState(false);
    const [bidLogs, setBidLogs] = useState([]);
    const lastBidTime = useRef(0);

    useEffect(() => {
        if (announcementModal) {
            const timer = setTimeout(() => {
                setAnnouncementModal(null);
            }, 5500);
            return () => clearTimeout(timer);
        }
    }, [announcementModal]);

    useEffect(() => {
        if (user?.teamId) {
            fetchTeamData();
            fetchSquad();
        }
        if (user?.tournamentId) {
            const tourneyId = typeof user.tournamentId === 'object' ? user.tournamentId._id : user.tournamentId;
            fetchTournament();

            // Socket setup - ensure room join on connect and reconnect
            const handleConnect = () => {
                socket.emit('join_auction', tourneyId);
            };
            socket.on('connect', handleConnect);
            if (socket.connected) {
                handleConnect();
            }

            socket.on('new_player', (player) => {
                setCurrentPlayer(player);
                setCurrentBid(player.currentBid || player.basePrice);
                setCurrentLeadTeam(player.currentLeadTeamId || null);
                setBidLogs([]);
                if (player?._id) {
                    fetchBidsForPlayer(player._id);
                }
            });

            socket.on('bid_update', (data) => {
                setCurrentBid(data.amount);
                setCurrentLeadTeam(data.team);
                setBidLogs(prev => [{
                    team: data.team,
                    amount: data.amount,
                    time: data.timestamp ? new Date(data.timestamp) : new Date(),
                    playerId: data.playerId
                }, ...prev]);
            });

            socket.on('player_sold', (data) => {
                if (data?.team) {
                    setOtherTeams(prev => prev.map(t => (t._id === data.team._id || t.id === data.team._id || t._id === data.team.id) ? { ...t, ...data.team } : t));
                    const myTeamId = typeof user.teamId === 'object' ? user.teamId._id : user.teamId;
                    if (data.team._id === myTeamId || data.team.id === myTeamId) {
                        setTeamData(prev => ({ ...prev, ...data.team }));
                    }
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
                fetchTeamData();
                fetchSquad();
                setCurrentPlayer(null);
                setCurrentLeadTeam(null);
                setCountdownTimer(null);
            });

            socket.on('team_updated', (data) => {
                if (data?.team) {
                    setOtherTeams(prev => prev.map(t => (t._id === data.team._id || t.id === data.team._id || t._id === data.team.id) ? { ...t, ...data.team } : t));
                    const myTeamId = typeof user.teamId === 'object' ? user.teamId._id : user.teamId;
                    if (data.team._id === myTeamId || data.team.id === myTeamId) {
                        setTeamData(prev => ({ ...prev, ...data.team }));
                    }
                }
            });

            socket.on('player_unsold', (data) => {
                const targetPlayer = data?.player || currentPlayer;
                if (targetPlayer) {
                    setAllPlayers(prev => {
                        const exists = prev.some(p => p._id === targetPlayer._id || p.id === targetPlayer._id);
                        if (exists) return prev.map(p => (p._id === targetPlayer._id || p.id === targetPlayer._id) ? { ...p, status: 'unsold' } : p);
                        return [...prev, { ...targetPlayer, status: 'unsold' }];
                    });
                    setAnnouncementModal({
                        type: 'unsold',
                        player: targetPlayer
                    });
                }
                setCurrentPlayer(null);
                setCurrentLeadTeam(null);
                setCountdownTimer(null);
            });

            socket.on('bidding_state_changed', ({ state }) => {
                setBiddingState(state);
            });

            socket.on('slot_changed', (data) => {
                if (data?.tournament) setTournament(prev => ({ ...prev, ...data.tournament }));
                if (data?.activeSlotId !== undefined) {
                    setTournament(prev => ({ ...prev, activeSlotId: data.activeSlotId }));
                }
            });

            socket.on('auction_status_changed', (data) => {
                if (data?.tournament) setTournament(prev => ({ ...prev, ...data.tournament }));
                if (data?.biddingState) setBiddingState(data.biddingState);
                if (data?.status) setTournament(prev => ({ ...prev, status: data.status }));
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
                setCountdownTimer(null);
                if (Array.isArray(data.bids)) {
                    setBidLogs(data.bids.map(b => ({
                        team: { name: b.teamName, _id: b.teamId, logo: b.teamLogo, shortName: b.teamShortName },
                        amount: b.bidAmount,
                        time: new Date(b.createdAt),
                        playerId: b.playerId
                    })));
                } else {
                    setBidLogs(prev => prev.slice(1));
                }
                toast.info(data.message || 'Auctioneer erased the last bid. Bidding resumed.');
            });

            socket.on('sale_rolled_back', (data) => {
                fetchTeamData();
                fetchSquad();
                if (data?.player) {
                    setCurrentPlayer(data.player);
                    setCurrentBid(data.player.currentBid || data.player.basePrice);
                    setCurrentLeadTeam(data.player.currentLeadTeamId);
                }
            });

            socket.on('unsold_reopened_to_slot', (data) => {
                if (data?.players) {
                    setAllPlayers(prev => prev.map(p => {
                        const match = data.players.find(rp => rp._id === p._id || rp.id === p._id);
                        return match ? { ...p, ...match } : p;
                    }));
                }
            });

            socket.on('player_released_to_pending', (data) => {
                fetchTeamData();
                fetchSquad();
                if (data?.player) {
                    setAllPlayers(prev => prev.map(p => (p._id === data.player._id || p.id === data.player._id) ? { ...p, ...data.player } : p));
                }
                if (data?.message) toast.info(data.message);
            });

            return () => {
                socket.off('connect', handleConnect);
                socket.off('new_player');
                socket.off('bid_update');
                socket.off('player_sold');
                socket.off('player_unsold');
                socket.off('bidding_state_changed');
                socket.off('slot_changed');
                socket.off('auction_status_changed');
                socket.off('timer_tick');
                socket.off('timer_cancelled');
                socket.off('timer_completed');
                socket.off('team_updated');
                socket.off('bid_undone');
                socket.off('sale_rolled_back');
                socket.off('unsold_reopened_to_slot');
                socket.off('player_released_to_pending');
            };
        }
    }, [user]);

    const fetchBidsForPlayer = async (pId) => {
        const tourneyId = typeof user?.tournamentId === 'object' ? user.tournamentId._id : user?.tournamentId;
        if (!pId || !tourneyId) return;
        try {
            const res = await axios.get(`/api/tournaments/${tourneyId}/bids?playerId=${pId}`);
            if (Array.isArray(res.data) && res.data.length > 0) {
                setBidLogs(res.data.map(b => ({
                    team: { name: b.teamName, _id: b.teamId, logo: b.teamLogo, shortName: b.teamShortName },
                    amount: b.bidAmount,
                    time: new Date(b.createdAt),
                    playerId: b.playerId
                })));
            }
        } catch (e) {
            console.warn('Failed to load bids for player:', e);
        }
    };

    const buildFullSquad = (targetTeam, playersList) => {
        if (!targetTeam) return [];
        const teamId = targetTeam._id || targetTeam.id;
        const acquired = (playersList || []).filter(p => {
            const soldId = typeof p.soldToTeamId === 'object' && p.soldToTeamId ? (p.soldToTeamId._id || p.soldToTeamId.id) : p.soldToTeamId;
            return (soldId === teamId || (targetTeam.players && targetTeam.players.includes(p._id))) && p.status === 'sold';
        });

        let captainPlayer = acquired.find(p => p.isCaptain || String(p._id || '').startsWith('pl_cap_') || String(p._id || '').startsWith('owner_cap_'));

        const myTeamId = typeof user?.teamId === 'object' ? user?.teamId?._id : user?.teamId;
        const hasCaptain = targetTeam.isOwnerCaptain || targetTeam.captainName || (teamId === myTeamId && user?.captainName);

        if (!captainPlayer && hasCaptain) {
            const capName = targetTeam.captainName || (teamId === myTeamId ? (user?.captainName || user?.name || user?.username) : null) || `${targetTeam.name} Captain`;
            const capPhoto = targetTeam.captainPhoto || (teamId === myTeamId ? user?.captainPhoto : '') || '';
            const capPrice = Number(targetTeam.captainPrice) || 0;

            captainPlayer = {
                _id: `owner_cap_${teamId}`,
                name: capName,
                image: capPhoto,
                category: targetTeam.category || (teamId === myTeamId ? user?.category : null) || 'Captain (All-Rounder)',
                battingStyle: targetTeam.battingStyle || (teamId === myTeamId ? user?.battingStyle : null) || 'Right-Hand Bat',
                bowlingStyle: targetTeam.bowlingStyle || (teamId === myTeamId ? user?.bowlingStyle : null) || 'Right-Arm Medium',
                basePrice: capPrice,
                soldPrice: capPrice,
                sold_price: capPrice,
                status: 'sold',
                isCaptain: true,
                soldToTeamId: teamId,
                soldToTeamName: targetTeam.name
            };
        }

        if (captainPlayer) {
            const capPrice = Number(targetTeam.captainPrice) || Number(captainPlayer.soldPrice) || Number(captainPlayer.basePrice) || 0;
            const updatedCap = {
                ...captainPlayer,
                basePrice: capPrice,
                soldPrice: capPrice,
                sold_price: capPrice,
                isCaptain: true
            };
            const nonCaptains = acquired.filter(p => p._id !== captainPlayer._id);
            return [updatedCap, ...nonCaptains];
        }

        return acquired;
    };

    useEffect(() => {
        if (teamData && allPlayers) {
            setSquad(buildFullSquad(teamData, allPlayers));
        }
    }, [teamData, allPlayers]);

    const fetchTournament = async () => {
        try {
            const tourneyId = typeof user.tournamentId === 'object' ? user.tournamentId._id : user.tournamentId;
            const teamId = typeof user.teamId === 'object' ? user.teamId._id : user.teamId;
            const [tRes, sRes, pRes, teamsRes] = await Promise.all([
                axios.get(`/api/tournaments/${tourneyId}`),
                axios.get(`/api/tournaments/${tourneyId}/slots`).catch(() => ({ data: [] })),
                axios.get(`/api/players/${tourneyId}`).catch(() => ({ data: [] })),
                axios.get(`/api/teams/${tourneyId}`).catch(() => ({ data: [] }))
            ]);
            setTournament(tRes.data);
            setSlots(sRes.data || []);
            
            if (tRes.data?.biddingState) {
                setBiddingState(tRes.data.biddingState);
            } else if (tRes.data?.status === 'live') {
                setBiddingState('active');
            }

            const playersList = pRes.data || [];
            setAllPlayers(playersList);

            if (teamsRes.data && Array.isArray(teamsRes.data)) {
                const myTeam = teamsRes.data.find(t => t._id === teamId || t.id === teamId);
                if (myTeam) {
                    setTeamData(myTeam);
                    setSquad(buildFullSquad(myTeam, playersList));
                }
                setOtherTeams(teamsRes.data.filter(t => t._id !== teamId && t.id !== teamId));
            }

            let active = null;
            if (tRes.data?.currentBiddingPlayerId) {
                active = playersList.find(p => p._id === tRes.data.currentBiddingPlayerId);
            }
            if (!active) {
                active = playersList.find(p => p.status === 'bidding');
            }
            if (active) {
                setCurrentPlayer(active);
                setCurrentBid(active.currentBid || active.basePrice);
                if (active.currentLeadTeamId) {
                    setCurrentLeadTeam(active.currentLeadTeamId);
                }
                fetchBidsForPlayer(active._id);
            }
        } catch (err) {
            console.error("Failed to fetch tournament", err);
        }
    };

    const fetchTeamData = async () => {
        try {
            const teamId = typeof user.teamId === 'object' ? user.teamId._id : user.teamId;
            const tourneyId = typeof user.tournamentId === 'object' ? user.tournamentId._id : user.tournamentId;
            const allTeamsRes = await axios.get(`/api/teams/${tourneyId}`);
            const myTeam = allTeamsRes.data.find(t => t._id === teamId || t.id === teamId);
            setTeamData(myTeam);
            setOtherTeams(allTeamsRes.data.filter(t => t._id !== teamId && t.id !== teamId));
            if (allPlayers && allPlayers.length > 0 && myTeam) {
                setSquad(buildFullSquad(myTeam, allPlayers));
            }
        } catch (err) {
            console.error("Failed to fetch team data", err);
        }
    };

    const fetchSquad = async () => {
        try {
            const tourneyId = typeof user.tournamentId === 'object' ? user.tournamentId._id : user.tournamentId;
            const res = await axios.get(`/api/players/${tourneyId}`);
            const allP = res.data || [];
            setAllPlayers(allP);
            if (teamData) {
                setSquad(buildFullSquad(teamData, allP));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const placeBid = (increment) => {
        if (biddingState === 'break') {
            toast.info("Auction is currently on a break!");
            return;
        }
        if (biddingState === 'paused') {
            toast.warning("Bidding is currently paused by the auctioneer!");
            return;
        }
        if (tournament?.status === 'completed') {
            toast.info("Auction is officially completed!");
            return;
        }
        if (!currentPlayer) {
            toast.warning("No player is currently on stage for bidding!");
            return;
        }
        if ((tournament?.status === 'upcoming' || biddingState === 'stopped') && !currentPlayer) {
            toast.info("Auction has not officially started yet!");
            return;
        }

        if (!teamData) return;

        // Auto-increment logic:
        // Opening bid on fresh player is at Base Price.
        // Subsequent bids jump by the dynamic slab configured in tournament settings.
        const dynamicInc = getBidIncrement(currentBid, tournament?.bidIncrementRules, tournament?.budgetScale);
        let newBid;
        if (!currentLeadTeam) {
            newBid = Number(currentBid || currentPlayer.basePrice || 10);
        } else {
            newBid = Number(currentBid || 0) + Number(increment || dynamicInc);
        }

        // Budget is in large units, bids in small units. 1 Large = 100 Small.
        const remainingPurseLakhs = Math.max(0, ((Number(teamData.budget) || 0) - (Number(teamData.spent) || 0)) * 100);

        if (newBid > remainingPurseLakhs) {
            toast.error(`Insufficient Budget! Remaining purse: ₹${((Number(teamData.budget) || 0) - (Number(teamData.spent) || 0)).toFixed(2)} ${largeUnit} (₹${remainingPurseLakhs.toFixed(0)} ${smallUnit}).`);
            return;
        }

        if (tournament && squad.length >= (tournament.squadSizeLimit || 25)) {
            toast.error("Squad Full! Maximum squad size limit reached.");
            return;
        }

        const now = Date.now();
        if (now - lastBidTime.current < 400) return;
        lastBidTime.current = now;

        setHammerStriking(true);
        setTimeout(() => setHammerStriking(false), 500);

        const teamId = typeof user.teamId === 'object' ? user.teamId._id : user.teamId;
        const tourneyId = typeof user.tournamentId === 'object' ? user.tournamentId._id : user.tournamentId;

        socket.emit('place_bid', {
            playerId: currentPlayer._id,
            tournamentId: tourneyId,
            bidAmount: newBid,
            teamId: teamId
        });
    };

    if (!user?.teamId) return <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center font-bold">No Team Assigned</div>;
    if (!teamData) return <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center font-bold">Loading Team Data...</div>;

    const remainingPurse = ((Number(teamData.budget) || 0) - (Number(teamData.spent) || 0)).toFixed(2);
    const myTeamId = typeof user.teamId === 'object' ? user.teamId._id : user.teamId;
    const isLeading = currentLeadTeam === myTeamId || currentLeadTeam?._id === myTeamId;
    const dynamicInc = getBidIncrement(currentBid, tournament?.bidIncrementRules, tournament?.budgetScale);
    const nextBidAmount = !currentLeadTeam ? Number(currentBid || currentPlayer?.basePrice || 10) : (Number(currentBid || 0) + dynamicInc);
    const unsoldPlayers = allPlayers.filter(p => p.status === 'unsold');

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-6">
            <header className="flex flex-col md:flex-row justify-between items-center mb-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center font-black text-xl text-white shadow-sm uppercase overflow-hidden">
                        <SafeImage
                            src={teamData.logo}
                            alt={teamData.name}
                            className="w-full h-full object-cover"
                            fallback={teamData.shortName || teamData.name?.substring(0, 2)}
                            previewable={true}
                            previewTitle={teamData.name}
                        />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900">{teamData.name}</h1>
                        <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5">
                            <Shield className="w-3.5 h-3.5 text-blue-600" /> Dab Cric Auction • Team Owner Room
                        </p>
                        {teamData.isOwnerCaptain && (
                            <div className="flex items-center gap-1.5 mt-1">
                                <SafeImage
                                    src={teamData.captainPhoto}
                                    alt="Captain"
                                    previewable={true}
                                    previewTitle={teamData.captainName || user.captainName || user.name || 'Owner & Captain'}
                                    className="w-5 h-5 rounded-full object-cover border border-amber-300"
                                    fallback={<Crown className="w-3.5 h-3.5 text-amber-600" />}
                                />
                                <span className="text-[11px] font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                    👑 Captain: {teamData.captainName || user.captainName || user.name || 'Owner & Captain'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-4 md:gap-8 w-full md:w-auto justify-between md:justify-end bg-slate-50 p-3 rounded-xl border border-slate-200 items-center">
                    <div className="text-center md:text-right">
                        <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Purse Left</p>
                        <p className="text-xl md:text-2xl font-black text-emerald-700 tabular-nums">₹{remainingPurse} <span className="text-xs text-slate-500">{largeUnit}</span></p>
                    </div>
                    <div className="w-px bg-slate-200 h-8 hidden md:block" />
                    <div className="text-center md:text-right">
                        <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Squad</p>
                        <p className="text-xl md:text-2xl font-black text-slate-800 tabular-nums">{squad.length} <span className="text-xs text-slate-500">/ {tournament?.squadSizeLimit || 25}</span></p>
                    </div>
                    <button
                        onClick={async () => {
                            setIsRefreshing(true);
                            try {
                                await fetchData();
                                toast.success("Auction data refreshed!");
                            } catch (e) {
                                toast.error("Refresh failed");
                            } finally {
                                setTimeout(() => setIsRefreshing(false), 500);
                            }
                        }}
                        disabled={isRefreshing}
                        className="ml-2 p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 text-blue-600 hover:text-blue-700 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                        title="Refresh auction data"
                    >
                        <RotateCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={handleLogout} className="ml-2 p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-all shadow-xs cursor-pointer" title="Logout">
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Live Auction Feed */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-white border border-slate-200 rounded-3xl p-8 relative overflow-hidden shadow-sm flex flex-col items-center justify-center min-h-[400px]">
                        <div className="absolute top-4 right-4 z-10">
                            {tournament?.status === 'completed' ? (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-purple-100 border border-purple-300 text-purple-900 rounded-full text-xs font-bold">
                                    <Trophy className="w-3.5 h-3.5 text-purple-600" />
                                    AUCTION COMPLETED
                                </span>
                            ) : biddingState === 'paused' ? (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 border border-amber-300 text-amber-900 rounded-full text-xs font-bold animate-pulse">
                                    <Pause className="w-3.5 h-3.5 text-amber-700" />
                                    BIDDING PAUSED
                                </span>
                            ) : biddingState === 'break' ? (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-100 border border-blue-300 text-blue-900 rounded-full text-xs font-bold">
                                    <Coffee className="w-3.5 h-3.5 text-blue-700" />
                                    SHORT BREAK
                                </span>
                            ) : (!tournament?.status || tournament.status === 'upcoming' || tournament.status === 'inactive' || biddingState === 'stopped') ? (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-300 text-slate-700 rounded-full text-xs font-bold">
                                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                                    STANDBY
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-bold">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                    LIVE BIDDING
                                </span>
                            )}
                        </div>

                        {/* CASE 0: AUCTION OFFICIALLY COMPLETED */}
                        {tournament?.status === 'completed' ? (
                            <div className="text-center py-10 px-4 max-w-xl mx-auto">
                                <div className="w-20 h-20 bg-purple-50 border-2 border-purple-300 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                    <Trophy className="w-10 h-10 text-purple-600 animate-bounce" />
                                </div>
                                <span className="px-3.5 py-1 bg-purple-100 text-purple-900 border border-purple-300 rounded-full text-xs font-black uppercase tracking-wider inline-block mb-3">
                                    🏆 AUCTION OFFICIALLY COMPLETED
                                </span>
                                <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">
                                    {tournament?.name} Auction Has Concluded!
                                </h2>
                                <p className="text-xs md:text-sm text-slate-500 font-semibold leading-relaxed mb-6">
                                    All bidding rounds have finished. Congratulations to all participating team franchises, owners, and cricket players!
                                </p>

                                <div className="grid grid-cols-3 gap-3 text-center">
                                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Players Sold</span>
                                        <span className="text-xl font-black text-emerald-600">{allPlayers.filter(p => p.status === 'sold').length}</span>
                                    </div>
                                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Unsold Pool</span>
                                        <span className="text-xl font-black text-rose-600">{allPlayers.filter(p => p.status === 'unsold').length}</span>
                                    </div>
                                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Teams</span>
                                        <span className="text-xl font-black text-blue-700">{otherTeams.length + 1}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (!tournament?.status || tournament.status === 'upcoming' || tournament.status === 'inactive' || biddingState === 'stopped') ? (
                            <div className="text-center py-12 px-4 max-w-xl mx-auto">
                                <div className="w-20 h-20 bg-blue-50 border-2 border-blue-200 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-xs">
                                    <Clock className="w-10 h-10 text-blue-600" />
                                </div>
                                <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-xs font-black uppercase tracking-wider inline-block mb-3">
                                    Standby Screen
                                </span>
                                <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">
                                    AUCTION HAS NOT STARTED YET
                                </h2>
                                <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed mb-6">
                                    The official live auction for <strong className="text-slate-800">{tournament?.name}</strong> will begin shortly. Teams and officials are assembling. Please stay tuned!
                                </p>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-left">
                                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Squad Limit</span>
                                        <span className="text-sm font-black text-slate-900">{tournament?.squadSizeLimit || 25} Players / Team</span>
                                    </div>
                                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Teams</span>
                                        <span className="text-sm font-black text-slate-900">{otherTeams.length + 1} Registered</span>
                                    </div>
                                    <div className="col-span-2 md:col-span-1 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Format</span>
                                        <span className="text-sm font-black text-blue-700 capitalize">{tournament?.auctionType?.replace('_', ' ') || 'Owner Driven'}</span>
                                    </div>
                                </div>
                            </div>
                        ) : biddingState === 'break' ? (
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
                                    Please wait for a while. The auction for <strong className="text-slate-800">{tournament?.name}</strong> will resume shortly after the break!
                                </p>
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl inline-flex items-center gap-2 text-xs font-bold text-slate-600">
                                    <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                                    <span>Live feed will resume automatically</span>
                                </div>
                            </div>
                        ) : currentPlayer ? (
                            <div className="w-full max-w-xl flex flex-col items-center">
                                {/* PAUSED Banner at Top of Player Card */}
                                {biddingState === 'paused' && (
                                    <div className="w-full mb-5 p-4 rounded-2xl bg-amber-100 border-2 border-amber-300 text-amber-950 font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-sm animate-pulse">
                                        <Pause className="w-4 h-4 text-amber-700" />
                                        <span>AUCTION BIDDING IS CURRENTLY PAUSED BY AUCTIONEER</span>
                                    </div>
                                )}
                                <div className="w-36 h-36 rounded-2xl border-2 border-slate-200 overflow-hidden mb-4 shadow-sm bg-slate-50 relative">
                                    <SafeImage
                                        src={currentPlayer.image}
                                        alt={currentPlayer.name}
                                        previewable={true}
                                        previewTitle={currentPlayer.name}
                                        className="w-full h-full object-cover"
                                        fallback={<div className="w-full h-full flex items-center justify-center text-slate-400"><User className="w-16 h-16" /></div>}
                                    />
                                </div>
                                <h2 className="text-3xl font-black mb-1.5 text-slate-900">{currentPlayer.name}</h2>
                                <div className="flex gap-2 mb-3 flex-wrap justify-center">
                                    {slots.find(s => s._id === tournament?.activeSlotId) && (
                                        <span className="px-3 py-1 bg-purple-50 rounded-lg text-xs font-black border border-purple-200 text-purple-700 flex items-center gap-1">
                                            <Layers className="w-3.5 h-3.5 text-purple-600" />
                                            Set: {slots.find(s => s._id === tournament?.activeSlotId).name}
                                        </span>
                                    )}
                                    <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold border border-slate-200 text-slate-700">{currentPlayer.category}</span>
                                    <span className="px-3 py-1 bg-blue-50 rounded-lg text-xs font-bold border border-blue-200 text-blue-700">Base: {formatPrice(currentPlayer.basePrice)}</span>
                                    {currentPlayer.battingStyle && (
                                        <span className="px-3 py-1 bg-slate-50 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700">
                                            🏏 {currentPlayer.battingStyle}
                                        </span>
                                    )}
                                    {currentPlayer.bowlingStyle && (
                                        <span className="px-3 py-1 bg-slate-50 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700">
                                            ⚾ {currentPlayer.bowlingStyle}
                                        </span>
                                    )}
                                </div>

                                {/* Cricket Career Stats Bar */}
                                {currentPlayer.stats && (
                                    <div className="flex flex-wrap items-center justify-center gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200 mb-5 max-w-lg w-full">
                                        <span className="font-extrabold text-slate-400 text-[10px] uppercase mr-1">Stats:</span>
                                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-bold text-slate-700">M: {currentPlayer.stats.matches || 0}</span>
                                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-bold text-slate-700">R: {currentPlayer.stats.runs || 0}</span>
                                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-bold text-slate-700">HS: {currentPlayer.stats.highestScore || 0}</span>
                                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-bold text-slate-700">W: {currentPlayer.stats.wickets || 0}</span>
                                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-bold text-slate-700">Best: {currentPlayer.stats?.bestBowling || currentPlayer.bestBowling || '-'}</span>
                                        {currentPlayer.cricHeroesProfileUrl && (
                                            <a
                                                href={currentPlayer.cricHeroesProfileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800 font-bold text-[11px] underline ml-auto"
                                            >
                                                CricHeroes ↗
                                            </a>
                                        )}
                                    </div>
                                )}

                                {/* Bid Status & Controls */}
                                <div className={`w-full p-6 rounded-2xl border ${isLeading ? 'bg-emerald-50/70 border-emerald-300' : 'bg-slate-50 border-slate-200'} transition-all`}>
                                    <div className="text-center mb-5">
                                        <div className="text-xs text-slate-500 uppercase tracking-widest font-black mb-1">Current Highest Bid</div>
                                        <div className={`text-5xl md:text-6xl font-black tabular-nums tracking-tight ${isLeading ? 'text-emerald-700' : 'text-slate-900'}`}>
                                            {(() => {
                                                const { amount, unit } = formatPriceParts(currentBid);
                                                return (
                                                    <>
                                                        ₹{amount} <span className="text-2xl font-bold text-slate-500">{unit}</span>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                        {currentLeadTeam && (
                                            <div className={`mt-2 text-xs font-black ${isLeading ? 'text-emerald-700' : 'text-slate-600'}`}>
                                                {isLeading ? '✓ You hold the highest bid!' : `Held by: ${currentLeadTeam.name || 'Opponent'}`}
                                            </div>
                                        )}
                                    </div>

                                    {/* Final Call 10s Countdown Banner */}
                                    {countdownTimer && (
                                        <div className="mb-4 p-3 bg-red-600 text-white rounded-xl flex items-center justify-between shadow-lg animate-pulse">
                                            <div className="flex items-center gap-2 font-black text-xs md:text-sm">
                                                <Timer className="w-5 h-5" />
                                                <span>FINAL CALL! HAMMER FALLS IN:</span>
                                            </div>
                                            <div className="text-2xl font-black bg-white text-red-600 px-3 py-0.5 rounded-lg tabular-nums shadow-inner">
                                                {countdownTimer.timeLeft}s
                                            </div>
                                        </div>
                                    )}

                                    {/* Standby / Paused / Break / Completed / Admin-driven states vs Live Hammer Bid */}
                                    {tournament?.status === 'completed' ? (
                                        <div className="text-center py-4 px-4 bg-purple-50 rounded-xl border border-purple-300 text-purple-900 font-bold text-xs flex items-center justify-center gap-2">
                                            <Crown className="w-4 h-4 text-purple-600" />
                                            🏆 Auction is Officially Completed! Final squad roster is locked.
                                        </div>
                                    ) : (tournament?.status === 'upcoming' || biddingState === 'stopped') && !currentPlayer ? (
                                        <div className="text-center py-4 px-4 bg-slate-100 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs flex items-center justify-center gap-2">
                                            <Clock className="w-4 h-4 text-slate-500" />
                                            Auction has not officially started yet. Please stay tuned!
                                        </div>
                                    ) : biddingState === 'break' ? (
                                        <div className="text-center py-4 px-4 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 font-bold text-xs flex items-center justify-center gap-2">
                                            <Coffee className="w-4 h-4 text-blue-600" />
                                            Auction is currently on a short break. Resuming shortly!
                                        </div>
                                    ) : biddingState === 'paused' ? (
                                        <div className="text-center py-4 px-4 bg-amber-100 rounded-xl border border-amber-300 text-amber-950 font-black text-sm flex items-center justify-center gap-2 shadow-sm animate-pulse">
                                            <Pause className="w-4 h-4 text-amber-700" />
                                            Auction Bidding is Currently Paused by Auctioneer
                                        </div>
                                    ) : tournament?.auctionType === 'admin_driven' ? (
                                        <div className="text-center py-4 px-4 bg-blue-50 rounded-xl border border-blue-200 italic text-blue-700 text-xs font-medium">
                                            Admin-driven auction. The auctioneer manages bids from the console.
                                        </div>
                                    ) : (
                                        <div className="space-y-3.5">
                                            {/* Leading Banner if isLeading */}
                                            {isLeading && (
                                                <div className="p-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl shadow-xs border border-emerald-400 flex items-center justify-between">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                                            <Gavel className="w-5 h-5 text-amber-300 animate-bounce" />
                                                        </div>
                                                        <div>
                                                            <span className="text-xs font-black uppercase tracking-wider block">YOU ARE IN THE LEAD!</span>
                                                            <span className="text-[11px] text-emerald-100 font-semibold">Your team holds the highest bid at ₹{formatAmount(currentBid)}</span>
                                                        </div>
                                                    </div>
                                                    <span className="px-2.5 py-1 bg-white/25 rounded-lg text-[10px] font-black uppercase tracking-wider">Top Bidder</span>
                                                </div>
                                            )}

                                            {/* PRIMARY PROMINENT HAMMER BID BUTTON */}
                                            <button
                                                onClick={() => placeBid()}
                                                disabled={isLeading || biddingState !== 'active'}
                                                className={`w-full py-4 px-5 md:px-6 rounded-2xl font-black text-white transition-all flex items-center justify-between cursor-pointer border shadow-lg group active:scale-95 ${
                                                    isLeading
                                                        ? 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed shadow-none'
                                                        : biddingState !== 'active'
                                                        ? 'bg-amber-100 border-amber-300 text-amber-900 cursor-not-allowed shadow-none'
                                                        : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 border-blue-400/40 shadow-blue-500/25'
                                                } ${hammerStriking ? 'scale-95 ring-4 ring-blue-400' : ''}`}
                                            >
                                                <div className="flex items-center gap-3.5">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform ${
                                                        isLeading ? 'bg-slate-300 text-slate-500' : biddingState !== 'active' ? 'bg-amber-200 text-amber-800' : 'bg-white/20 text-white group-hover:rotate-[-20deg] shadow-inner'
                                                    }`}>
                                                        {biddingState === 'paused' ? <Pause className="w-7 h-7 text-amber-800" /> : <Gavel className={`w-7 h-7 ${hammerStriking ? 'animate-bounce text-amber-300' : ''}`} />}
                                                    </div>
                                                    <div className="text-left">
                                                        <span className={`text-[10px] uppercase tracking-wider font-extrabold block ${biddingState !== 'active' ? 'text-amber-800' : 'text-blue-200'}`}>
                                                            {biddingState === 'paused' ? 'BIDDING PAUSED BY AUCTIONEER' : isLeading ? 'Leading Current Bid' : 'SMASH HAMMER TO BID'}
                                                        </span>
                                                        <span className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-1.5">
                                                            {biddingState === 'paused'
                                                                ? 'Auction Paused'
                                                                : isLeading 
                                                                ? `Leading at ₹${formatAmount(currentBid)}` 
                                                                : !currentLeadTeam 
                                                                    ? `HAMMER OPENING BID: ₹${formatAmount(nextBidAmount)}` 
                                                                    : `HAMMER BID: ₹${formatAmount(nextBidAmount)}`}
                                                        </span>
                                                    </div>
                                                </div>

                                                {!isLeading && biddingState === 'active' && (
                                                    <div className="text-right pl-3 border-l border-white/20">
                                                        <span className="text-[10px] text-blue-200 uppercase font-bold block">{!currentLeadTeam ? 'Opening' : 'Slab Jump'}</span>
                                                        <span className="text-base font-black text-amber-300">{!currentLeadTeam ? 'Base Price' : `+${formatAmount(dynamicInc)}`}</span>
                                                    </div>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <Gavel className="w-14 h-14 mx-auto mb-3 text-slate-300" />
                                <h2 className="text-xl font-bold text-slate-700 mb-1">Waiting for Auctioneer...</h2>
                                <p className="text-xs text-slate-500">The next player will appear here as soon as brought up to auction.</p>
                            </div>
                        )}
                    </div>

                    {/* My Squad, Slots & Unsold Tabs */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                            <div className="flex p-1 bg-slate-100 rounded-xl gap-1 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => setLeftTab('squad')}
                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                        leftTab === 'squad' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                                    }`}
                                >
                                    <Users className="w-3.5 h-3.5 text-blue-600" />
                                    My Acquired Squad ({squad.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLeftTab('slots')}
                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                        leftTab === 'slots' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                                    }`}
                                >
                                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                                    Slots / Sets Wise ({slots.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLeftTab('unsold')}
                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                        leftTab === 'unsold' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                                    }`}
                                >
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                    Unsold Players ({unsoldPlayers.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLeftTab('voice')}
                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                        leftTab === 'voice' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    {voice.isJoined && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                                    🎙️ Voice Room {voice.participants.length > 0 ? `(${voice.participants.length})` : ''}
                                </button>
                            </div>
                        </div>

                        {leftTab === 'squad' ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-slate-100 text-slate-600 uppercase tracking-wider text-[11px] font-black border-y border-slate-200">
                                        <tr>
                                            <th className="p-3 rounded-l-xl">#</th>
                                            <th className="p-3">Player</th>
                                            <th className="p-3">Role</th>
                                            <th className="p-3 text-right">Base Price</th>
                                            <th className="p-3 rounded-r-xl text-right">Sold Price</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-sans">
                                        {squad.length > 0 ? squad.map((p, idx) => (
                                            <tr key={p._id || idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-3 text-slate-400 font-black">{idx + 1}</td>
                                                <td className="p-3 font-extrabold text-slate-900 flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                                        <SafeImage
                                                            src={p.image}
                                                            alt={p.name}
                                                            previewable={true}
                                                            previewTitle={p.name}
                                                            className="w-full h-full object-cover"
                                                            fallback={<User size={14} className="text-slate-400" />}
                                                        />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span>{p.name}</span>
                                                            {p.isCaptain && (
                                                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black rounded">👑 CAPTAIN</span>
                                                            )}
                                                            {p.status === 'injured' && (
                                                                <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 text-[9px] font-black rounded">🚑 INJURED</span>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 font-medium">{p.battingStyle || 'Right-Hand Bat'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-slate-600 font-bold">{p.category}</td>
                                                <td className="p-3 text-right font-semibold text-slate-500 tabular-nums">
                                                    {formatPrice(p.basePrice || 0)}
                                                </td>
                                                <td className="p-3 text-right font-black text-emerald-700 tabular-nums">
                                                    {formatPrice(p.soldPrice || p.sold_price || p.currentBid || p.basePrice || 0)}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="5" className="p-8 text-center text-slate-400 italic">No players purchased yet.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                    {/* Excel Sheet Style Summary Statement Footer */}
                                    {squad.length > 0 && (() => {
                                        const totalBase = squad.reduce((sum, p) => sum + (Number(p.basePrice) || 0), 0);
                                        const totalSold = squad.reduce((sum, p) => sum + (Number(p.soldPrice || p.sold_price || p.currentBid || p.basePrice) || 0), 0);
                                        const budgetLarge = Number(teamData?.budget) || 100;
                                        const spentLarge = Number(teamData?.spent) || 0;
                                        const remainingLarge = Math.max(0, budgetLarge - spentLarge).toFixed(2);

                                        return (
                                            <tfoot className="border-t-2 border-slate-300">
                                                {/* Subtotal Row */}
                                                <tr className="bg-slate-100/90 text-slate-800 font-black text-xs border-b border-slate-200">
                                                    <td colSpan="3" className="p-3 uppercase tracking-wider text-[11px]">
                                                        TOTAL SQUAD ACQUISITION ({squad.length} / {tournament?.squadSizeLimit || 25} PLAYERS)
                                                    </td>
                                                    <td className="p-3 text-right text-slate-600 tabular-nums font-extrabold">
                                                        {formatPrice(totalBase)}
                                                    </td>
                                                    <td className="p-3 text-right text-emerald-800 tabular-nums font-black text-sm">
                                                        {formatPrice(totalSold)}
                                                    </td>
                                                </tr>
                                                {/* Excel Balance Statement Row */}
                                                <tr className="bg-gradient-to-r from-blue-50/80 via-emerald-50/70 to-emerald-100/80 text-slate-900 border-b border-emerald-300">
                                                    <td colSpan="2" className="p-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-black rounded uppercase tracking-wider">
                                                                BALANCE STATEMENT
                                                            </span>
                                                            <span className="text-xs font-bold text-slate-700">
                                                                Total Budget: <strong className="font-black text-slate-900">₹{budgetLarge} {largeUnit}</strong>
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-center text-xs font-extrabold text-slate-700">
                                                        Total Spent: <strong className="text-rose-600 font-black">₹{spentLarge.toFixed(2)} {largeUnit}</strong>
                                                    </td>
                                                    <td colSpan="2" className="p-3 text-right">
                                                        <div className="inline-flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded-xl shadow-xs">
                                                            <span className="text-[10px] font-black uppercase tracking-wider opacity-90">Remaining Balance:</span>
                                                            <span className="text-sm font-black tabular-nums">₹{remainingLarge} {largeUnit}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        );
                                    })()}
                                </table>
                            </div>
                        ) : leftTab === 'slots' ? (
                            <div className="space-y-4">
                                {/* Search & Slot filter */}
                                <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
                                    <div className="relative flex-1">
                                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            placeholder="Search players by name, role or style across slots..."
                                            value={slotSearchQuery}
                                            onChange={(e) => setSlotSearchQuery(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                        />
                                    </div>
                                    {slots.length > 0 && (
                                        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs shrink-0 max-w-full">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedSlotFilter('all')}
                                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer shrink-0 ${
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
                                                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
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
                                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
                                                <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
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
                                                                <span className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-700">
                                                                    Total: {sPlayers.length}
                                                                </span>
                                                                <span className="px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800">
                                                                    Sold: {sSold.length}
                                                                </span>
                                                                <span className="px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
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
                                                                            const buyerTeam = otherTeams.find(t => t._id === p.soldToTeamId) || (teamData?._id === p.soldToTeamId ? teamData : null);

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
                                                                                                fallback={<User size={14} className="text-slate-400" />}
                                                                                            />
                                                                                        </div>
                                                                                        <div>
                                                                                            <span className="block">{p.name}</span>
                                                                                            {isCurrent && (
                                                                                                <span className="text-[10px] text-purple-700 font-black uppercase flex items-center gap-1">
                                                                                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
                                                                                                    Bidding In Progress Now
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="p-3">
                                                                                        <span className="font-bold text-slate-700 block">{p.category}</span>
                                                                                        <span className="text-[10px] text-slate-400">
                                                                                            {p.battingStyle || '-'}{p.bowlingStyle ? ` • ${p.bowlingStyle}` : ''}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="p-3 text-right font-bold text-slate-700 tabular-nums">
                                                                                        {formatPrice(p.basePrice || slot.basePrice || 0)}
                                                                                    </td>
                                                                                    <td className="p-3 text-right">
                                                                                        {p.status === 'sold' ? (
                                                                                            <div className="inline-flex flex-col items-end">
                                                                                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-black text-[11px] tabular-nums">
                                                                                                    SOLD: {formatPrice(p.soldPrice || p.sold_price || p.finalPrice || p.currentBid || 0)}
                                                                                                </span>
                                                                                                {buyerTeam && (
                                                                                                    <span className="text-[10px] text-slate-500 font-bold mt-0.5">
                                                                                                        to {buyerTeam.name}
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                        ) : p.status === 'unsold' ? (
                                                                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-black text-[10px] uppercase">
                                                                                                Unsold
                                                                                            </span>
                                                                                        ) : p.status === 'injured' ? (
                                                                                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded font-black text-[10px] uppercase">
                                                                                                Injured
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-black text-[10px] uppercase">
                                                                                                Upcoming
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

                                            {/* Unassigned / General Pool if any */}
                                            {(() => {
                                                const assignedIds = new Set(slots.map(s => s._id));
                                                let unassigned = allPlayers.filter(p => !p.slotId || !assignedIds.has(p.slotId));
                                                if (q) {
                                                    unassigned = unassigned.filter(p =>
                                                        p.name?.toLowerCase().includes(q) ||
                                                        p.category?.toLowerCase().includes(q)
                                                    );
                                                }
                                                if (unassigned.length === 0) return null;

                                                return (
                                                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                                                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-black text-slate-900 text-sm">General Pool / Unassigned Slot</h4>
                                                                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-bold">
                                                                    {unassigned.length} Players
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-left text-xs border-collapse">
                                                                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
                                                                    <tr>
                                                                        <th className="p-3 w-10">#</th>
                                                                        <th className="p-3">Player</th>
                                                                        <th className="p-3">Role</th>
                                                                        <th className="p-3 text-right">Base Price</th>
                                                                        <th className="p-3 text-right">Status</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {unassigned.map((p, idx) => (
                                                                        <tr key={p._id || idx} className="hover:bg-slate-50 transition-colors">
                                                                            <td className="p-3 text-slate-400 font-bold">{idx + 1}</td>
                                                                            <td className="p-3 font-extrabold text-slate-900 flex items-center gap-2.5">
                                                                                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                                                                    <SafeImage
                                                                                        src={p.image}
                                                                                        alt={p.name}
                                                                                        previewable={true}
                                                                                        previewTitle={p.name}
                                                                                        className="w-full h-full object-cover"
                                                                                        fallback={<User size={14} className="text-slate-400" />}
                                                                                    />
                                                                                </div>
                                                                                <span>{p.name}</span>
                                                                            </td>
                                                                            <td className="p-3 font-bold text-slate-700">{p.category}</td>
                                                                            <td className="p-3 text-right font-bold text-slate-700 tabular-nums">{formatPrice(p.basePrice || 0)}</td>
                                                                            <td className="p-3 text-right">
                                                                                <span className={`px-2 py-0.5 rounded font-black text-[10px] uppercase ${
                                                                                    p.status === 'sold' ? 'bg-emerald-100 text-emerald-800' : p.status === 'unsold' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-800'
                                                                                }`}>
                                                                                    {p.status || 'Pending'}
                                                                                </span>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    );
                                })()}
                            </div>
                        ) : leftTab === 'voice' ? (
                            <VoiceChatPanel voice={voice} isModerator={isOwnerModerator} />
                        ) : (
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
                                                <td className="p-3.5 font-bold text-slate-900 flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                                                        <SafeImage
                                                            src={p.image}
                                                            alt={p.name}
                                                            previewable={true}
                                                            previewTitle={p.name}
                                                            className="w-full h-full object-cover"
                                                            fallback={<User size={14} className="text-slate-400" />}
                                                        />
                                                    </div>
                                                    <div>
                                                        <span className="block">{p.name}</span>
                                                        <span className="text-[10px] text-amber-600 font-extrabold uppercase">Unsold (Eligible for Re-Auction)</span>
                                                    </div>
                                                </td>
                                                <td className="p-3.5 text-slate-600 font-medium">{p.category}</td>
                                                <td className="p-3.5 text-slate-500 text-[11px]">
                                                    {p.battingStyle || '-'}{p.bowlingStyle ? ` • ${p.bowlingStyle}` : ''}
                                                </td>
                                                <td className="p-3.5 text-right font-bold text-slate-900">{formatPrice(p.basePrice)}</td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="4" className="p-8 text-center text-slate-400 italic">No unsold players yet in this auction.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Sidebar - Other Teams */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Live Bid Stream Card */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-extrabold text-sm flex items-center gap-2 text-slate-900">
                                <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
                                Live Bid Stream
                            </h3>
                            <span className="text-[10px] font-bold text-slate-400">
                                {bidLogs.length} {bidLogs.length === 1 ? 'bid' : 'bids'}
                            </span>
                        </div>

                        {bidLogs.length > 0 ? (
                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                {bidLogs.map((b, i) => {
                                    const isMyTeam = b.team?._id === (typeof user?.teamId === 'object' ? user.teamId._id : user?.teamId);
                                    return (
                                        <div
                                            key={i}
                                            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                                                isMyTeam
                                                    ? 'bg-blue-50/80 border-blue-200 text-blue-900 shadow-2xs'
                                                    : 'bg-slate-50 border-slate-200 text-slate-800'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-700 overflow-hidden shadow-2xs shrink-0">
                                                    <SafeImage
                                                        src={b.team?.logo}
                                                        alt={b.team?.name || 'Team'}
                                                        className="w-full h-full object-cover"
                                                        fallback={b.team?.shortName || b.team?.name?.substring(0, 2) || 'TM'}
                                                        previewable={true}
                                                        previewTitle={b.team?.name || 'Team'}
                                                    />
                                                </div>
                                                <div>
                                                    <span className="font-extrabold block text-xs leading-tight">
                                                        {b.team?.name || 'Unknown Team'} {isMyTeam ? '👑 (Your Bid)' : ''}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-semibold">
                                                        {b.time ? (typeof b.time.toLocaleTimeString === 'function' ? b.time.toLocaleTimeString() : new Date(b.time).toLocaleTimeString()) : ''}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="font-black text-emerald-700 text-xs px-2 py-0.5 bg-emerald-50 rounded-lg border border-emerald-200">
                                                {formatPrice(b.amount)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-6 text-center text-slate-400 text-xs italic">
                                No bids placed on current player yet.
                            </div>
                        )}
                    </div>

                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-extrabold text-base flex items-center gap-2 text-slate-900">
                                <Wallet className="w-4 h-4 text-emerald-600" />
                                Competitor Purses
                            </h3>
                            <span className="text-[11px] font-semibold text-slate-400">Click team to view squad</span>
                        </div>

                        <div className="space-y-2.5">
                            {otherTeams.map(t => {
                                const teamSquad = buildFullSquad(t, allPlayers);
                                return (
                                    <button
                                        key={t._id}
                                        type="button"
                                        onClick={() => setViewingTeam(t)}
                                        className="w-full text-left flex items-center justify-between p-3.5 bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-2xl transition-all group cursor-pointer shadow-2xs hover:shadow-xs"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-slate-700 bg-white border border-slate-200 uppercase group-hover:border-blue-400 transition-colors shadow-2xs shrink-0 overflow-hidden">
                                                <SafeImage
                                                    src={t.logo}
                                                    alt={t.name}
                                                    className="w-full h-full object-cover"
                                                    fallback={t.shortName?.substring(0, 3) || t.name.substring(0, 2)}
                                                    previewable={true}
                                                    previewTitle={t.name}
                                                />
                                            </div>
                                            <div>
                                                <span className="font-bold text-xs text-slate-800 group-hover:text-blue-700 transition-colors block">
                                                    {t.name}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                                    <Users className="w-3 h-3 text-slate-400 group-hover:text-blue-500" />
                                                    {teamSquad.length} {teamSquad.length === 1 ? 'player' : 'players'} • Click to view squad
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="font-bold text-emerald-700 text-xs bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                                ₹{((Number(t.budget) || 0) - (Number(t.spent) || 0)).toFixed(2)} {largeUnit}
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                                        </div>
                                    </button>
                                );
                            })}
                            {otherTeams.length === 0 && <div className="text-center text-slate-400 text-xs py-4">No other teams.</div>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Competitor Team Purchased Squad Modal */}
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
                                const teamSquad = buildFullSquad(viewingTeam, allPlayers);
                                return (
                                    <>
                                        <div className="flex flex-wrap justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-200 gap-2">
                                            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                                <Users className="w-4 h-4 text-blue-600" />
                                                Acquired Players: <strong className="text-slate-900 font-black">{teamSquad.length}</strong> / {tournament?.squadSizeLimit || 25}
                                            </span>
                                            <span className="text-xs font-bold text-slate-600">
                                                Total Spent: <strong className="text-emerald-700 font-black">{formatPrice(teamSquad.reduce((acc, p) => acc + (Number(p.soldPrice || p.sold_price || p.currentBid || p.basePrice) || 0), 0))}</strong>
                                            </span>
                                        </div>

                                        {teamSquad.length > 0 ? (
                                            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                                                {teamSquad.map((p, idx) => (
                                                    <div key={p._id || idx} className={`p-3.5 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3 ${p.isCaptain ? 'bg-amber-50/40' : ''}`}>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                                                <SafeImage
                                                                    src={p.image}
                                                                    alt={p.name}
                                                                    className="w-full h-full object-cover"
                                                                    fallback={<User className="w-5 h-5 text-slate-400" />}
                                                                    previewable={true}
                                                                    previewTitle={p.name}
                                                                />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-sm font-bold text-slate-900 leading-snug flex items-center gap-1.5">
                                                                    {p.isCaptain && <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />}
                                                                    {p.name}
                                                                    {p.isCaptain && (
                                                                        <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-black rounded border border-amber-300 uppercase">
                                                                            👑 CAPTAIN
                                                                        </span>
                                                                    )}
                                                                </h4>
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
                                                                {formatPrice(p.soldPrice || p.sold_price || p.currentBid || p.basePrice || 0)}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400">
                                                                {p.isCaptain ? 'Retention Fee' : `Base: ${formatPrice(p.basePrice || 0)}`}
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
                                        {announcementModal.player?.category} • Base {formatPrice(announcementModal.player?.basePrice)}
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
                                        {announcementModal.player?.category} • Base {formatPrice(announcementModal.player?.basePrice)}
                                    </p>

                                    <div className="mt-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
                                        No bids received. Player moves to the Unsold Pool and will be eligible for the Re-Auction round.
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

export default OwnerDashboard;
