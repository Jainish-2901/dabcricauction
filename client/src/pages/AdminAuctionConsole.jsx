import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    Gavel, ArrowRight, User, Users, CheckCircle2, AlertCircle, 
    Pause, Play, RotateCcw, Shuffle, Undo2, ArrowLeft, Timer, Coffee, Sparkles, TrendingUp, Layers, X, Flag, Trophy, Crown, FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import socket from '../socket';
import { getBudgetUnits } from '../utils/currency';

const getBidIncrement = (bid, rules) => {
    const list = Array.isArray(rules) && rules.length > 0 ? rules : [
        { upTo: 100, increment: 10 },
        { upTo: 500, increment: 25 },
        { upTo: 1000, increment: 50 },
        { upTo: 999999, increment: 100 }
    ];
    const sorted = [...list].sort((a, b) => Number(a.upTo) - Number(b.upTo));
    for (const rule of sorted) {
        if (Number(bid) < Number(rule.upTo)) {
            return Number(rule.increment) || 10;
        }
    }
    return Number(sorted[sorted.length - 1]?.increment) || 100;
};

const AdminAuctionConsole = () => {
    const { user } = useAuth();
    const { tournamentId } = useParams();
    const navigate = useNavigate();

    const [tournament, setTournament] = useState(null);
    const { largeUnit, smallUnit, formatAmount, formatBid } = getBudgetUnits(tournament);
    const [allTournaments, setAllTournaments] = useState([]);
    const [players, setPlayers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [slots, setSlots] = useState([]);
    const [activeSlotId, setActiveSlotId] = useState(null);
    const [showSlotSelectModal, setShowSlotSelectModal] = useState(false);
    const [slotModalContext, setSlotModalContext] = useState('start'); // 'start' | 'resume' | 'manual' | 'completed'
    const [onlyActiveSlotInQueue, setOnlyActiveSlotInQueue] = useState(false);

    const [currentPlayer, setCurrentPlayer] = useState(null);
    const [currentBid, setCurrentBid] = useState(0);
    const [winningTeam, setWinningTeam] = useState(null);
    const [sidebarTab, setSidebarTab] = useState('teams');
    const [bidLogs, setBidLogs] = useState([]);
    const [playerFilter, setPlayerFilter] = useState('all');
    const [notice, setNotice] = useState(null);
    const [biddingState, setBiddingState] = useState('active');
    const [lastSoldPlayer, setLastSoldPlayer] = useState(null);
    const [adminPrice, setAdminPrice] = useState('');
    const [viewingTeam, setViewingTeam] = useState(null);
    const [countdownTimer, setCountdownTimer] = useState(null);
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
        fetchData();

        const handleConnect = () => {
            socket.emit('join_auction', tournamentId);
            fetchData();
        };
        socket.on('connect', handleConnect);
        if (socket.connected) {
            handleConnect();
        }

        socket.on('bid_update', (data) => {
            setCurrentBid(data.amount);
            setWinningTeam(data.team);
            setBidLogs(prev => [{
                team: data.team,
                amount: data.amount,
                time: data.timestamp ? new Date(data.timestamp) : new Date(),
                playerId: data.playerId
            }, ...prev]);
        });

        socket.on('player_sold', (data) => {
            fetchData();
            if (data?.team) {
                setTeams(prev => prev.map(t => (t._id === data.team._id || t.id === data.team._id) ? { ...t, ...data.team } : t));
            }
            if (data?.player) {
                setPlayers(prev => prev.map(p => (p._id === data.player._id || p.id === data.player._id) ? { ...p, ...data.player } : p));
                setLastSoldPlayer(data.player);
                setAnnouncementModal({
                    type: 'sold',
                    player: data.player,
                    team: data.team,
                    price: data.player.soldPrice || data.player.currentBid || 0
                });
            }
            setCountdownTimer(null);
            showNotice('success', `🔨 ${data?.player?.name || 'Player'} SOLD to ${data?.team?.name || 'Winner'} for ₹${data?.player?.soldPrice || data?.player?.currentBid || 0} ${smallUnit}!`);
            nextPlayer();
        });

        socket.on('player_unsold', (data) => {
            fetchData();
            const unsoldPlayer = data?.player || currentPlayer;
            if (unsoldPlayer) {
                setPlayers(prev => prev.map(p => (p._id === unsoldPlayer._id || p.id === unsoldPlayer._id) ? { ...p, status: 'unsold' } : p));
                setAnnouncementModal({
                    type: 'unsold',
                    player: unsoldPlayer
                });
            }
            setCountdownTimer(null);
            showNotice('info', `${unsoldPlayer?.name || 'Player'} marked as Unsold.`);
            nextPlayer();
        });

        socket.on('bidding_state_changed', ({ state }) => {
            setBiddingState(state);
            showNotice('info', `Bidding ${state.toUpperCase()}`);
        });

        socket.on('team_updated', (data) => {
            if (data?.team) {
                setTeams(prev => prev.map(t => (t._id === data.team._id || t.id === data.team._id) ? { ...t, ...data.team } : t));
            }
        });

        socket.on('slot_changed', (data) => {
            setActiveSlotId(data.activeSlotId || null);
            if (data?.tournament) {
                setTournament(prev => ({ ...prev, ...data.tournament, activeSlotId: data.activeSlotId || null }));
            }
        });

        socket.on('bid_undone', (data) => {
            setCurrentBid(data.currentBid);
            setWinningTeam(data.leadTeam);
            showNotice('info', 'Last bid was undone by Auctioneer.');
        });

        socket.on('sale_rolled_back', (data) => {
            fetchData();
            if (data?.player) {
                setCurrentPlayer(data.player);
                setCurrentBid(data.player.currentBid || data.player.basePrice);
                setWinningTeam(data.player.currentLeadTeamId);
            }
            setLastSoldPlayer(null);
            showNotice('info', `Sale rolled back! Bidding reopened on ${data?.player?.name || 'Player'}.`);
        });

        // 10-Second Timer Listeners
        socket.on('timer_tick', (data) => {
            setCountdownTimer(data);
        });

        socket.on('timer_cancelled', (data) => {
            setCountdownTimer(null);
            if (data?.reason === 'new_bid') {
                showNotice('info', `⚡ New bid placed (₹${data.amount}${smallUnit})! 10s timer cancelled.`);
            } else {
                showNotice('info', 'Countdown timer cancelled by Admin.');
            }
        });

        socket.on('timer_completed', (data) => {
            setCountdownTimer(null);
            if (data?.outcome === 'sold') {
                showNotice('success', `⏱️ Time Expired! ${data?.player?.name || 'Player'} SOLD!`);
            } else {
                showNotice('info', `⏱️ Time Expired! Marked Unsold.`);
            }
        });

        socket.on('auction_status_changed', (data) => {
            if (data?.tournament) {
                setTournament(prev => ({ ...prev, ...data.tournament }));
                if (data.tournament.activeSlotId !== undefined) {
                    setActiveSlotId(data.tournament.activeSlotId || null);
                }
            }
            if (data?.biddingState) {
                setBiddingState(data.biddingState);
            }
        });

        socket.on('unsold_reopened_to_slot', (data) => {
            if (data?.players) {
                setPlayers(prev => prev.map(p => {
                    const match = data.players.find(rp => rp._id === p._id || rp.id === p._id);
                    return match ? { ...p, ...match } : p;
                }));
            }
            if (data?.unsoldSlot) {
                setActiveSlotId(data.unsoldSlot._id);
            }
            showNotice('info', `📢 All ${data?.reopenedCount || ''} unsold players brought into Re-Auction slot!`);
        });

        return () => {
            socket.off('bid_update');
            socket.off('player_sold');
            socket.off('player_unsold');
            socket.off('bidding_state_changed');
            socket.off('slot_changed');
            socket.off('bid_undone');
            socket.off('sale_rolled_back');
            socket.off('timer_tick');
            socket.off('timer_cancelled');
            socket.off('timer_completed');
            socket.off('auction_status_changed');
            socket.off('team_updated');
            socket.off('unsold_reopened_to_slot');
            socket.off('connect', handleConnect);
        };
    }, [tournamentId]);

    const showNotice = (type, text) => {
        setNotice({ type, text });
        setTimeout(() => setNotice(null), 4000);
    };

    const fetchData = async () => {
        try {
            const [tRes, pRes, teamRes, sRes, allTRes] = await Promise.all([
                axios.get(`/api/tournaments/${tournamentId}`),
                axios.get(`/api/players/${tournamentId}`),
                axios.get(`/api/teams/${tournamentId}`),
                axios.get(`/api/tournaments/${tournamentId}/slots`).catch(() => ({ data: [] })),
                axios.get('/api/tournaments').catch(() => ({ data: [] }))
            ]);
            setTournament(tRes.data);
            setPlayers(pRes.data);
            setTeams(teamRes.data);
            const slotList = sRes.data || [];
            setSlots(slotList);

            const initialSlotId = tRes.data.activeSlotId || (slotList.length > 0 ? slotList[0]._id : null);
            setActiveSlotId(initialSlotId);

            if (Array.isArray(allTRes.data)) setAllTournaments(allTRes.data);

            if (!currentPlayer) {
                const pool = initialSlotId
                    ? pRes.data.filter(p => p.slotId === initialSlotId && p.status === 'pending')
                    : pRes.data.filter(p => p.status === 'pending');
                const pending = pool[0] || pRes.data.find(p => p.status === 'pending');
                if (pending) {
                    selectPlayer(pending);
                }
            }
        } catch (err) {
            console.error('Error fetching auction data:', err);
        }
    };

    const handleBringAllUnsoldToSlot = async () => {
        // 1. Immediate optimistic local state update (zero lag or failure)
        const targetSlotId = `slot_unsold_${tournamentId}`;
        const targetSlot = slots.find(s => s._id === targetSlotId || s.isDefaultUnsold || s.slotType === 'unsold') || {
            _id: targetSlotId,
            tournamentId,
            name: 'Unsold Players (Re-Auction)',
            role: 'Re-Auction',
            basePrice: 20,
            order: 999,
            isDefaultUnsold: true,
            slotType: 'unsold'
        };

        const updatedLocal = players.map(p => {
            if (p.status === 'unsold' || p.slotId === targetSlot._id) {
                return {
                    ...p,
                    status: 'pending',
                    slotId: targetSlot._id,
                    isReAuction: true,
                    currentBid: p.basePrice || 20,
                    currentLeadTeamId: null,
                    soldToTeamId: null,
                    soldPrice: null
                };
            }
            return p;
        });

        setPlayers(updatedLocal);
        setActiveSlotId(targetSlot._id);
        setTournament(prev => ({ ...prev, activeSlotId: targetSlot._id, biddingState: 'active' }));
        setShowSlotSelectModal(false);

        const firstUnsold = updatedLocal.find(p => p.slotId === targetSlot._id && p.status === 'pending');
        if (firstUnsold) {
            selectPlayer(firstUnsold);
        }

        // 2. Broadcast via socket with acknowledgment
        socket.emit('bring_unsold_to_auction', { tournamentId }, (res) => {
            if (res?.success && res.players) {
                setPlayers(prev => prev.map(p => {
                    const match = res.players.find(rp => rp._id === p._id || rp.id === p._id);
                    return match ? { ...p, ...match } : p;
                }));
            }
        });

        // 3. Fallback background sync
        try {
            await axios.post(`/api/tournaments/${tournamentId}/slots/reopen-unsold`).catch(() =>
                axios.post(`/api/tournaments/${tournamentId}/reopen-unsold`)
            );
        } catch (e) {
            console.log("REST fallback notice:", e?.message);
        }

        showNotice('success', `🎉 Brought all unsold players into Re-Auction slot!`);
    };

    const handleStartOfficialAuctionClick = () => {
        if (slots.length > 0) {
            setSlotModalContext('start');
            setShowSlotSelectModal(true);
        } else {
            handleConfirmStartOfficialAuction(null);
        }
    };

    const handleConfirmStartOfficialAuction = async (selectedSlotId) => {
        const slotObj = slots.find(s => s._id === selectedSlotId);
        if (slotObj && (slotObj.isDefaultUnsold || slotObj.slotType === 'unsold')) {
            await handleBringAllUnsoldToSlot();
            try {
                await axios.put(`/api/tournaments/${tournamentId}`, {
                    status: 'live',
                    biddingState: 'active'
                });
            } catch (e) {}
            socket.emit('start_auction', { tournamentId, activeSlotId: selectedSlotId });
            setTournament(prev => ({ ...prev, status: 'live', biddingState: 'active' }));
            setBiddingState('active');
            return;
        }

        try {
            await axios.put(`/api/tournaments/${tournamentId}`, {
                status: 'live',
                biddingState: 'active',
                activeSlotId: selectedSlotId || null
            });
        } catch (e) {
            console.error("Error updating tournament status:", e);
        }

        socket.emit('start_auction', { tournamentId, activeSlotId: selectedSlotId });
        setTournament(prev => ({
            ...prev,
            status: 'live',
            biddingState: 'active',
            activeSlotId: selectedSlotId || null
        }));
        setBiddingState('active');
        setActiveSlotId(selectedSlotId || null);
        setShowSlotSelectModal(false);

        // Pick first pending player from this slot onto the stage
        const pool = selectedSlotId
            ? players.filter(p => p.slotId === selectedSlotId && p.status === 'pending')
            : players.filter(p => p.status === 'pending');
        if (pool.length > 0) {
            selectPlayer(pool[0]);
        }

        showNotice('success', `🚀 Official Auction LIVE! Active Slot: ${slotObj ? slotObj.name : 'All Players'}`);
    };

    const handleSelectSlot = async (slotId, autoSelectFirst = true) => {
        const slotObj = slots.find(s => s._id === slotId);
        if (slotObj && (slotObj.isDefaultUnsold || slotObj.slotType === 'unsold')) {
            await handleBringAllUnsoldToSlot();
            return;
        }

        try {
            await axios.put(`/api/tournaments/${tournamentId}`, {
                activeSlotId: slotId || null
            });
        } catch (e) {
            console.error("Error setting active slot:", e);
        }

        socket.emit('set_active_slot', { tournamentId, slotId: slotId || null });
        setActiveSlotId(slotId || null);
        setTournament(prev => ({ ...prev, activeSlotId: slotId || null }));
        setShowSlotSelectModal(false);

        showNotice('success', `Active Slot set to: ${slotObj ? slotObj.name : 'All Players'}`);

        if (autoSelectFirst) {
            const pool = slotId
                ? players.filter(p => p.slotId === slotId && p.status === 'pending')
                : players.filter(p => p.status === 'pending');
            if (pool.length > 0) {
                selectPlayer(pool[0]);
            }
        }
    };

    const handleResumeWithSlot = async (slotId) => {
        if (slotId !== undefined && slotId !== activeSlotId) {
            await handleSelectSlot(slotId, true);
        }
        handleToggleBiddingState('active');
        setShowSlotSelectModal(false);
    };

    const handleTrigger10sTimer = () => {
        if (!currentPlayer) {
            showNotice('error', 'Select a player to trigger 10s countdown!');
            return;
        }
        socket.emit('trigger_final_countdown', { tournamentId, playerId: currentPlayer._id });
        showNotice('info', '⏱️ 10-Second Final Call Started! (Going Once, Going Twice...)');
    };

    const handleCancelTimer = () => {
        socket.emit('cancel_final_countdown', { tournamentId });
        setCountdownTimer(null);
        showNotice('info', 'Countdown timer cancelled.');
    };

    const fetchBidsForPlayer = async (pId) => {
        if (!pId || !tournamentId) return;
        try {
            const res = await axios.get(`/api/tournaments/${tournamentId}/bids?playerId=${pId}`);
            if (Array.isArray(res.data) && res.data.length > 0) {
                setBidLogs(res.data.map(b => ({
                    team: { name: b.teamName, _id: b.teamId, logo: b.teamLogo, shortName: b.teamShortName },
                    amount: b.bidAmount,
                    time: new Date(b.createdAt),
                    playerId: b.playerId
                })));
            }
        } catch (e) {
            console.warn('Could not fetch bids:', e);
        }
    };

    const selectPlayer = (player) => {
        setCurrentPlayer(player);
        setCurrentBid(player.basePrice || 20);
        setWinningTeam(null);
        setAdminPrice('');
        setBidLogs([]);
        if (player?._id) {
            fetchBidsForPlayer(player._id);
        }
        socket.emit('select_player', { tournamentId, playerId: player._id });
    };

    const handleToggleBiddingState = async (newState) => {
        setBiddingState(newState);
        try {
            const statusUpdate = newState === 'stopped' ? 'upcoming' : (newState === 'paused' || newState === 'break') ? 'paused' : 'live';
            await axios.put(`/api/tournaments/${tournamentId}`, {
                biddingState: newState,
                status: statusUpdate
            });
        } catch (e) {
            console.error("Error toggling state via API:", e);
        }
        socket.emit('set_bidding_state', { tournamentId, state: newState });
    };

    const handleUndoLastBid = () => {
        if (!currentPlayer) return;
        socket.emit('undo_last_bid', { tournamentId, playerId: currentPlayer._id });
    };

    const handleRollbackLastSale = () => {
        const playerToRollback = lastSoldPlayer || players.find(p => p.status === 'sold');
        if (!playerToRollback) {
            showNotice('error', 'No recent sold player to rollback');
            return;
        }

        if (window.confirm(`Are you sure you want to rollback the sale of ${playerToRollback.name}? This will refund the team purse and reopen bidding.`)) {
            socket.emit('rollback_sale', { tournamentId, playerId: playerToRollback._id });
        }
    };

    const handleEndAuction = async () => {
        if (!window.confirm('Are you sure you want to officially END and COMPLETE this auction? Bidding will be concluded and the tournament will be marked as Completed.')) {
            return;
        }

        try {
            await axios.put(`/api/tournaments/${tournamentId}`, {
                status: 'completed',
                biddingState: 'stopped'
            });
        } catch (e) {
            console.error("Error updating tournament status to completed:", e);
        }

        socket.emit('end_auction', { tournamentId });
        socket.emit('set_bidding_state', { tournamentId, state: 'stopped' });
        setTournament(prev => ({ ...prev, status: 'completed', biddingState: 'stopped' }));
        setBiddingState('stopped');
        showNotice('success', '🏆 Auction officially completed and concluded!');
    };

    const handleReopenAuction = async () => {
        if (!window.confirm('Do you want to re-open this completed auction and resume live bidding?')) {
            return;
        }
        await handleToggleBiddingState('active');
        showNotice('info', 'Auction re-opened for live bidding.');
    };

    const handlePickRandomPlayer = (category = null) => {
        let pool = activeSlotId
            ? players.filter(p => p.slotId === activeSlotId && p.status === 'pending')
            : players.filter(p => p.status === 'pending');

        if (category) {
            pool = pool.filter(p => p.category?.toLowerCase() === category.toLowerCase());
        }

        if (pool.length === 0) {
            const currentSlotObj = slots.find(s => s._id === activeSlotId);
            showNotice('info', `No pending players found in ${category ? `${category} (` + (currentSlotObj?.name || 'current pool') + `)` : (currentSlotObj?.name || 'current pool')}`);
            return;
        }

        const randomIndex = Math.floor(Math.random() * pool.length);
        const selected = pool[randomIndex];
        selectPlayer(selected);
        showNotice('success', `Selected: ${selected.name} (${selected.category})`);
    };

    const handleSellAtCurrentBid = () => {
        if (!currentPlayer || !winningTeam) {
            showNotice('error', 'No active bid to sell!');
            return;
        }
        socket.emit('sell_player', { playerId: currentPlayer._id, tournamentId });
    };

    const handleAdminSell = async (teamId) => {
        if (!currentPlayer) return;
        if (!adminPrice || Number(adminPrice) < currentPlayer.basePrice) {
            showNotice('error', `Price must be at least the base price (₹${currentPlayer.basePrice} ${smallUnit})`);
            return;
        }

        socket.emit('place_bid', {
            playerId: currentPlayer._id,
            tournamentId,
            bidAmount: Number(adminPrice),
            teamId
        });

        setTimeout(() => {
            socket.emit('sell_player', {
                playerId: currentPlayer._id,
                tournamentId
            });
        }, 300);
    };

    const handleAdminTeamBid = (team, e) => {
        if (e) e.stopPropagation();
        if (!currentPlayer) {
            showNotice('error', 'Select a player to bid on!');
            return;
        }
        const dynamicInc = getBidIncrement(currentBid, tournament?.bidIncrementRules);
        let nextBid;
        if (!winningTeam) {
            nextBid = Number(currentBid || currentPlayer.basePrice || 10);
        } else {
            nextBid = Number(currentBid || 0) + dynamicInc;
        }

        const remainingPurseLakhs = Math.max(0, ((Number(team.budget) || 0) - (Number(team.spent) || 0)) * 100);
        if (nextBid > remainingPurseLakhs) {
            showNotice('error', `${team.name} has insufficient budget!`);
            return;
        }

        socket.emit('place_bid', {
            playerId: currentPlayer._id,
            tournamentId,
            bidAmount: nextBid,
            teamId: team._id
        });
        showNotice('success', `Bid of ₹${formatAmount(nextBid)} placed for ${team.name}!`);
    };

    const handleUnsold = () => {
        if (!currentPlayer) return;
        socket.emit('mark_unsold', { playerId: currentPlayer._id, tournamentId });
        nextPlayer();
    };

    const nextPlayer = () => {
        let pool = activeSlotId
            ? players.filter(p => p.slotId === activeSlotId && p.status === 'pending')
            : players.filter(p => p.status === 'pending');

        const currentIdx = currentPlayer ? pool.findIndex(p => p._id === currentPlayer._id) : -1;
        const next = pool.slice(currentIdx + 1)[0] || pool.find(p => p._id !== currentPlayer?._id);

        if (next) {
            selectPlayer(next);
        } else {
            setCurrentPlayer(null);
            setWinningTeam(null);
            if (activeSlotId) {
                const currentSlotObj = slots.find(s => s._id === activeSlotId);
                const otherSlotsWithPending = slots.filter(s => s._id !== activeSlotId && (
                    players.some(p => p.slotId === s._id && p.status === 'pending') ||
                    ((s.isDefaultUnsold || s.slotType === 'unsold') && players.some(p => p.status === 'unsold'))
                ));
                if (otherSlotsWithPending.length > 0) {
                    setSlotModalContext('completed');
                    setShowSlotSelectModal(true);
                    showNotice('info', `🎉 Slot "${currentSlotObj?.name || 'Current'}" completed! Please choose the next slot.`);
                } else {
                    showNotice('info', `🎉 All players in slot "${currentSlotObj?.name || 'Current'}" concluded! No other unauctioned slots.`);
                }
            } else {
                showNotice('info', 'No more pending players in this tournament.');
            }
        }
    };

    const filteredPlayers = players.filter(p => {
        if (onlyActiveSlotInQueue && activeSlotId && p.slotId !== activeSlotId) return false;
        if (playerFilter === 'all') return true;
        return p.status === playerFilter;
    });

    const unsoldPlayers = players.filter(p => p.status === 'unsold');
    const dynamicInc = getBidIncrement(currentBid, tournament?.bidIncrementRules);
    const nextAdminBidAmount = !winningTeam ? Number(currentBid || currentPlayer?.basePrice || 10) : (Number(currentBid || 0) + dynamicInc);

    const activeSlotObj = slots.find(s => s._id === activeSlotId);
    const slotPlayers = activeSlotId ? players.filter(p => p.slotId === activeSlotId) : players;
    const slotPendingCount = slotPlayers.filter(p => p.status === 'pending').length;
    const slotTotalCount = slotPlayers.length;
    const slotCompletedCount = slotPlayers.filter(p => p.status === 'sold' || p.status === 'unsold').length;

    if (!tournament) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-800">
                <div className="flex items-center gap-3">
                    <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="font-semibold text-sm">Loading Auction Console...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6">
            {/* Header */}
            <header className="flex flex-wrap justify-between items-center gap-4 mb-5 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(user?.role === 'auctioneer' ? '/auctioneer/dashboard' : '/admin')}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all"
                        title="Back to Dashboard"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Dashboard</span>
                    </button>

                    <img src="/logo.png" alt="Dab Cric Auction" className="w-10 h-10 rounded-xl object-contain bg-white border border-slate-200 p-0.5 shadow-sm shrink-0" />
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-black text-slate-900">
                                {tournament.name} <span className="text-blue-600 font-extrabold text-sm">— Dab Cric Auction Console</span>
                            </h1>

                            {allTournaments.length > 1 && (
                                <select
                                    value={tournamentId}
                                    onChange={(e) => navigate(`/admin/console/${e.target.value}`)}
                                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                                    title="Switch Tournament Console"
                                >
                                    {allTournaments.map(t => (
                                        <option key={t._id} value={t._id}>Switch: {t.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${
                                biddingState === 'active' ? 'bg-emerald-500 animate-pulse' :
                                biddingState === 'paused' ? 'bg-amber-500' : 
                                biddingState === 'break' ? 'bg-purple-500' : 'bg-rose-500'
                            }`} />
                            <span className="text-xs uppercase font-bold tracking-wider text-slate-600">
                                Bidding {biddingState}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Master State Controls: Pause / Break / Resume */}
                    {biddingState === 'active' ? (
                        <>
                            <button
                                onClick={() => handleToggleBiddingState('paused')}
                                className="px-3.5 py-2 bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                                title="Pause bidding temporarily"
                            >
                                <Pause className="w-3.5 h-3.5 text-amber-600" /> Pause
                            </button>
                            <button
                                onClick={() => handleToggleBiddingState('break')}
                                className="px-3.5 py-2 bg-purple-50 border border-purple-200 text-purple-800 hover:bg-purple-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                                title="Put auction on a short break (public screen will show on break)"
                            >
                                <Coffee className="w-3.5 h-3.5 text-purple-600" /> Take Break
                            </button>
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleToggleBiddingState('active')}
                                className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm"
                            >
                                <Play className="w-3.5 h-3.5" /> Resume Bidding
                            </button>
                            {slots.length > 0 && (
                                <button
                                    onClick={() => {
                                        setSlotModalContext('resume');
                                        setShowSlotSelectModal(true);
                                    }}
                                    className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                                    title="Select a different slot before resuming"
                                >
                                    <Layers className="w-3.5 h-3.5 text-purple-600" /> Choose Slot & Resume
                                </button>
                            )}
                        </div>
                    )}

                    {/* Rollback Last Sale Action */}
                    <button
                        onClick={handleRollbackLastSale}
                        className="px-3.5 py-2 bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                        title="Revert the last completed player sale and reopen bidding"
                    >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-600" /> Rollback Sale
                    </button>

                    {/* Final End Auction Button */}
                    <button
                        onClick={handleEndAuction}
                        className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all"
                        title="Officially finish and conclude this auction (marks tournament as Completed)"
                    >
                        <Flag className="w-3.5 h-3.5" /> End Auction
                    </button>

                    {notice && (
                        <div className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border shadow-sm ${
                            notice.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                            notice.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
                            'bg-blue-50 border-blue-200 text-blue-800'
                        }`}>
                            {notice.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                            {notice.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600" />}
                            {notice.text}
                        </div>
                    )}
                </div>
            </header>

            {/* Auction Completed Banner */}
            {tournament.status === 'completed' ? (
                <div className="mb-6 p-6 bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border-2 border-purple-500/40">
                    <div>
                        <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-widest mb-1.5">
                            <Crown className="w-4 h-4 text-amber-400" /> OFFICIAL AUCTION CONCLUDED
                        </div>
                        <h2 className="text-xl font-black text-white">🏆 Auction is Officially Completed!</h2>
                        <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                            All auction bidding rounds have concluded. You can review squads, download the complete summary CSV, or reopen if additional bidding is required.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            onClick={() => window.open(`/api/tournaments/${tournamentId}/export-teams-summary-csv`, '_blank')}
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                        >
                            <FileText className="w-4 h-4" /> Download Summary CSV
                        </button>
                        <button
                            onClick={handleReopenAuction}
                            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all border border-white/20"
                        >
                            🔄 Reopen Live Auction
                        </button>
                    </div>
                </div>
            ) : (!tournament.status || tournament.status === 'upcoming' || tournament.status === 'inactive' || biddingState === 'stopped') && (
                <div className="mb-6 p-6 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border-2 border-blue-500/30">
                    <div>
                        <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-widest mb-1.5">
                            <AlertCircle className="w-4 h-4" /> AUCTION HAS NOT OFFICIALLY STARTED
                        </div>
                        <h2 className="text-xl font-black text-white">Ready to begin the official live auction?</h2>
                        <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                            Click below to select the opening slot and begin live bidding. Until started, public and owner screens display the standby notice.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            onClick={() => navigate(user?.role === 'auctioneer' ? '/auctioneer/dashboard' : '/admin')}
                            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all"
                        >
                            Back to Dashboard
                        </button>
                        <button
                            onClick={handleStartOfficialAuctionClick}
                            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                        >
                            <Play className="w-4 h-4 fill-slate-950" /> Start Official Auction
                        </button>
                    </div>
                </div>
            )}

            {/* Active Slot / Set Control Bar */}
            <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200 rounded-2xl p-4 mb-5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                        <Layers className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                                ACTIVE AUCTION SLOT / SET
                            </span>
                            {activeSlotObj && (
                                <span className="text-xs font-black text-slate-800">
                                    Base Price: ₹{activeSlotObj.basePrice} {smallUnit} • {activeSlotObj.role}
                                </span>
                            )}
                        </div>
                        <h3 className="text-sm font-black text-slate-900 mt-0.5">
                            {activeSlotObj ? activeSlotObj.name : 'All Pending Players (No Slot Filter)'}
                        </h3>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {activeSlotObj && (
                        <div className="text-right hidden sm:block">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">Slot Progress</span>
                            <span className="text-xs font-black text-slate-800">
                                {slotCompletedCount} / {slotTotalCount} Completed
                                {slotPendingCount > 0 ? (
                                    <span className="text-emerald-700 ml-1.5 font-bold">({slotPendingCount} Pending)</span>
                                ) : (
                                    <span className="text-amber-700 ml-1.5 font-bold">(All Done!)</span>
                                )}
                            </span>
                        </div>
                    )}

                    <button
                        onClick={handleBringAllUnsoldToSlot}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer ${
                            unsoldPlayers.length > 0
                                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                                : 'bg-white hover:bg-amber-50 text-amber-800 border border-amber-300'
                        }`}
                        title="Bring all unsold players into the Re-Auction slot together"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Re-Auction Unsold ({unsoldPlayers.length})</span>
                    </button>

                    <button
                        onClick={() => {
                            setSlotModalContext('manual');
                            setShowSlotSelectModal(true);
                        }}
                        className="px-3.5 py-2 bg-white hover:bg-slate-50 text-purple-900 border border-purple-300 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                    >
                        <Layers className="w-3.5 h-3.5 text-purple-600" />
                        <span>Select / Switch Slot</span>
                    </button>
                </div>
            </div>

            {/* Quick Random Slot Draw */}
            <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 mb-5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
                <div className="flex items-center gap-2 text-slate-700">
                    <Shuffle className="w-4 h-4 text-blue-600" />
                    <span className="font-extrabold uppercase tracking-wider text-[11px] text-slate-700">Category Random Draw:</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => handlePickRandomPlayer()}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold transition-all text-xs"
                    >
                        Any Pending
                    </button>
                    <button
                        onClick={() => handlePickRandomPlayer('Batsman')}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-lg font-bold transition-all text-xs"
                    >
                        Random Batsman
                    </button>
                    <button
                        onClick={() => handlePickRandomPlayer('Bowler')}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg font-bold transition-all text-xs"
                    >
                        Random Bowler
                    </button>
                    <button
                        onClick={() => handlePickRandomPlayer('All-Rounder')}
                        className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 rounded-lg font-bold transition-all text-xs"
                    >
                        Random All-Rounder
                    </button>
                    <button
                        onClick={() => handlePickRandomPlayer('Wicket Keeper')}
                        className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 rounded-lg font-bold transition-all text-xs"
                    >
                        Random Wicket Keeper
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-190px)]">
                {/* Center Stage */}
                <div className="lg:col-span-8 flex flex-col gap-4">
                    <div className="bg-white border border-slate-200 rounded-3xl p-8 flex-1 flex flex-col items-center justify-center relative overflow-hidden shadow-sm">
                        {/* Paused Overlay Banner */}
                        {biddingState === 'paused' && (
                            <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3.5 py-1.5 bg-amber-100 border border-amber-300 text-amber-900 rounded-full text-xs font-black animate-pulse">
                                <Pause className="w-3.5 h-3.5 text-amber-700" /> Bidding Paused by Auctioneer
                            </div>
                        )}

                        {currentPlayer ? (
                            <>
                                <div className="w-36 h-36 rounded-2xl border-2 border-slate-200 overflow-hidden mb-4 shadow-sm relative bg-slate-50">
                                    {currentPlayer.image ? (
                                        <img src={currentPlayer.image} alt={currentPlayer.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                                            <User className="w-16 h-16" />
                                        </div>
                                    )}
                                </div>

                                <h2 className="text-3xl md:text-4xl font-black mb-2 text-slate-900">{currentPlayer.name}</h2>
                                <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                                    <span className="px-3 py-1 bg-slate-100 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-700 border border-slate-200">
                                        {currentPlayer.category}
                                    </span>
                                    <span className="px-3 py-1 bg-blue-50 rounded-xl text-xs font-bold text-blue-700 border border-blue-200">
                                        Base: ₹{currentPlayer.basePrice} {smallUnit}
                                    </span>
                                    <span className="px-3 py-1 bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200">
                                        🏏 {currentPlayer.battingStyle || 'Right-Hand Bat'}
                                    </span>
                                    <span className="px-3 py-1 bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200">
                                        ⚾ {currentPlayer.bowlingStyle || 'Right-Arm'}
                                    </span>
                                </div>

                                {/* Cricket Career Stats Bar */}
                                {currentPlayer.stats && (
                                    <div className="flex flex-wrap items-center justify-center gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200 mb-5 max-w-lg w-full">
                                        <span className="font-extrabold text-slate-400 text-[10px] uppercase mr-1">Career Stats:</span>
                                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-bold text-slate-700">Matches: {currentPlayer.stats.matches || 0}</span>
                                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-bold text-slate-700">Runs: {currentPlayer.stats.runs || 0}</span>
                                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-bold text-slate-700">HS: {currentPlayer.stats.highestScore || 0}</span>
                                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-bold text-slate-700">Wickets: {currentPlayer.stats.wickets || 0}</span>
                                        {currentPlayer.stats.bestBowling && currentPlayer.stats.bestBowling !== '-' && (
                                            <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-bold text-slate-700">BB: {currentPlayer.stats.bestBowling}</span>
                                        )}
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

                                {/* Bidding Display */}
                                <div className="text-center p-6 bg-slate-50 rounded-2xl w-full max-w-md border border-slate-200 shadow-inner relative">
                                    <div className="text-xs text-slate-500 uppercase tracking-widest font-black mb-1">Current Bid</div>
                                    <div className={`text-6xl font-black tabular-nums tracking-tight ${currentBid > currentPlayer.basePrice ? 'text-emerald-600' : 'text-slate-800'}`}>
                                        ₹{currentBid} <span className="text-2xl font-bold text-slate-500">{smallUnit}</span>
                                    </div>
                                    {winningTeam ? (
                                        <div className="mt-3 text-sm font-black text-emerald-700 flex items-center justify-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            Leading Bidder: {winningTeam.name}
                                        </div>
                                    ) : (
                                        <div className="mt-3 text-xs text-slate-500 font-medium">Awaiting opening bid...</div>
                                    )}

                                    {/* 10-Second Countdown Active Box */}
                                    {countdownTimer?.status === 'running' && (
                                        <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-400 rounded-2xl animate-pulse shadow-sm">
                                            <div className="flex items-center justify-center gap-2 text-amber-900 font-black text-xs uppercase tracking-wider">
                                                <Timer className="w-4 h-4 text-amber-600 animate-spin" />
                                                <span>GOING ONCE... GOING TWICE...</span>
                                            </div>
                                            <div className="text-5xl font-black text-amber-600 my-1 tabular-nums">{countdownTimer.timeLeft}s</div>
                                            <p className="text-[11px] text-amber-900 font-extrabold">
                                                {winningTeam ? `Auto-selling to ${winningTeam.name} at ₹${currentBid}${smallUnit} if no higher bid!` : 'Will be marked unsold if no bids!'}
                                            </p>
                                            <button
                                                onClick={handleCancelTimer}
                                                className="mt-2 text-[10px] px-3 py-1 bg-white hover:bg-rose-50 text-rose-700 font-bold rounded-lg border border-rose-200 transition-colors inline-block shadow-2xs"
                                            >
                                                Cancel Countdown
                                            </button>
                                        </div>
                                    )}

                                    {/* Dynamic Increment Indicator */}
                                    <div className="mt-3 text-[11px] font-bold text-slate-500 bg-white/70 py-1.5 px-3 rounded-xl border border-slate-200/80 inline-flex items-center gap-1.5">
                                        <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                                        <span>Next Min Increment: <strong className="text-blue-700 font-black">+₹{getBidIncrement(currentBid, tournament.bidIncrementRules)} {smallUnit}</strong> (Rule Configured)</span>
                                    </div>

                                    {/* Quick Undo Last Bid Button */}
                                    {currentBid > currentPlayer.basePrice && !countdownTimer && (
                                        <button
                                            onClick={handleUndoLastBid}
                                            className="mt-3 text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center justify-center gap-1 mx-auto transition-colors"
                                            title="Undo last placed bid"
                                        >
                                            <Undo2 className="w-3.5 h-3.5" /> Undo Last Bid
                                        </button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12">
                                <Users className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                                <h3 className="text-xl font-bold text-slate-700 mb-1">No Active Player</h3>
                                <p className="text-xs text-slate-500 mb-4">Pick a random category above or select from the queue.</p>
                                <button
                                    onClick={nextPlayer}
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                                >
                                    Select Next Available Player
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Stage Action Controls */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap gap-3 justify-between items-center shadow-sm">
                        <button
                            onClick={handleUnsold}
                            disabled={!currentPlayer}
                            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-xl font-bold text-xs transition-all"
                        >
                            Mark Unsold
                        </button>

                        {/* 10-Second Timer Trigger (Going Once, Twice...) */}
                        <button
                            onClick={countdownTimer ? handleCancelTimer : handleTrigger10sTimer}
                            disabled={!currentPlayer}
                            className={`px-5 py-2.5 rounded-xl font-black text-xs shadow-sm transition-all flex items-center gap-2 ${
                                countdownTimer
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                            }`}
                            title="Trigger 10s countdown. Sells player to lead team automatically if no one bids!"
                        >
                            <Timer className="w-4 h-4" />
                            <span>{countdownTimer ? `Cancel 10s Timer (${countdownTimer.timeLeft}s)` : '⏱️ Final Call (10s Timer)'}</span>
                        </button>

                        {tournament.auctionType === 'owner_driven' ? (
                            <button
                                onClick={handleSellAtCurrentBid}
                                disabled={!currentPlayer || !winningTeam}
                                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-bold shadow-sm transition-all flex items-center gap-2 text-xs"
                            >
                                <Gavel className="w-4 h-4" /> Hammer Sold to ({winningTeam?.shortName || winningTeam?.name || 'Leader'})
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    placeholder="Final Price (L)"
                                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 text-xs w-36 focus:border-blue-600 focus:outline-none"
                                    value={adminPrice}
                                    onChange={e => setAdminPrice(e.target.value)}
                                />
                                <span className="text-[11px] text-slate-500 hidden sm:inline">Select a team in sidebar</span>
                            </div>
                        )}

                        <button
                            onClick={nextPlayer}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
                        >
                            Pass / Next <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Sidebar: Teams & Player Queue Tabs */}
                <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-5 flex flex-col overflow-hidden shadow-sm">
                    {/* Tab Selector */}
                    <div className="flex p-1 bg-slate-100 rounded-xl mb-4">
                        <button
                            onClick={() => setSidebarTab('teams')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                sidebarTab === 'teams' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            Teams ({teams.length})
                        </button>
                        <button
                            onClick={() => setSidebarTab('players')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                sidebarTab === 'players' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            Queue ({filteredPlayers.length})
                        </button>
                        <button
                            onClick={() => setSidebarTab('unsold')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                sidebarTab === 'unsold' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            Unsold ({unsoldPlayers.length})
                        </button>
                        <button
                            onClick={() => setSidebarTab('bids')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                sidebarTab === 'bids' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            Bids ({bidLogs.length})
                        </button>
                    </div>

                    {/* Tab 1: Teams List */}
                    {sidebarTab === 'teams' && (
                        <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
                            <p className="text-[11px] text-slate-500 font-medium mb-1">
                                {tournament.auctionType === 'admin_driven' && adminPrice
                                    ? 'Click a team to force-sell the player at the specified price:'
                                    : 'Connected tournament teams and purses (1-click to bid for a team):'}
                            </p>

                            {teams.map(team => {
                                const remaining = ((Number(team.budget) || 0) - (Number(team.spent) || 0)).toFixed(2);
                                const isLeader = winningTeam?._id === team._id;
                                const teamSquad = players.filter(p => p.soldToTeamId === team._id);

                                return (
                                    <div
                                        key={team._id}
                                        onClick={() => {
                                            if (tournament.auctionType === 'admin_driven' && adminPrice) {
                                                handleAdminSell(team._id);
                                            } else {
                                                setViewingTeam(team);
                                            }
                                        }}
                                        className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                                            isLeader
                                                ? 'border-emerald-300 bg-emerald-50/80 shadow-2xs'
                                                : 'hover:border-blue-400 hover:bg-blue-50/60 border-slate-200 bg-slate-50 shadow-2xs'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-black text-xs uppercase border border-slate-200 text-slate-700 shadow-2xs overflow-hidden shrink-0">
                                                {team.logo ? (
                                                    <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    team.shortName || team.name?.substring(0, 2)
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                                                    {team.name}
                                                    {isLeader && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-black">Leading</span>}
                                                </div>
                                                <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                                                    <span>Purse: <strong className="text-emerald-700 font-bold">₹{remaining} {largeUnit}</strong></span>
                                                    <span>•</span>
                                                    <span className="text-blue-600 font-bold">{teamSquad.length} {teamSquad.length === 1 ? 'player' : 'players'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            {tournament.auctionType === 'admin_driven' && adminPrice ? (
                                                <span className="text-[10px] font-bold px-2.5 py-1 bg-blue-600 text-white rounded-lg shadow-2xs">
                                                    Sell ₹{adminPrice}{smallUnit}
                                                </span>
                                            ) : (
                                                <div className="flex items-center gap-1.5">
                                                    {currentPlayer && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleAdminTeamBid(team, e)}
                                                            disabled={winningTeam?._id === team._id}
                                                            className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all shadow-xs ${
                                                                winningTeam?._id === team._id
                                                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                                                                    : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95'
                                                            }`}
                                                            title={`Register bid of ₹${nextAdminBidAmount}${smallUnit} for ${team.name}`}
                                                        >
                                                            {winningTeam?._id === team._id ? '✓ Leader' : `+Bid ₹${nextAdminBidAmount}${smallUnit}`}
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); setViewingTeam(team); }}
                                                        className="text-[11px] font-bold text-slate-500 hover:text-blue-600 bg-white hover:bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                                                        title="View Squad"
                                                    >
                                                        Squad ↗
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Tab 2: Player Queue */}
                    {sidebarTab === 'players' && (
                        <div className="flex flex-col flex-1 overflow-hidden">
                            {/* Filter Chips & Slot Toggle */}
                            <div className="space-y-2 mb-3">
                                {activeSlotObj && (
                                    <button
                                        onClick={() => setOnlyActiveSlotInQueue(!onlyActiveSlotInQueue)}
                                        className={`w-full py-1.5 px-3 rounded-lg text-xs font-black flex items-center justify-between transition-all border ${
                                            onlyActiveSlotInQueue
                                                ? 'bg-purple-50 text-purple-800 border-purple-300'
                                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        <span className="flex items-center gap-1.5">
                                            <Layers className="w-3.5 h-3.5 text-purple-600" />
                                            <span>Current Slot Only ({activeSlotObj.name})</span>
                                        </span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                            onlyActiveSlotInQueue ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-700'
                                        }`}>
                                            {onlyActiveSlotInQueue ? 'Active' : 'Show All'}
                                        </span>
                                    </button>
                                )}

                                <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
                                    {['all', 'pending', 'sold', 'unsold'].map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setPlayerFilter(f)}
                                            className={`px-3 py-1 rounded-lg capitalize font-bold text-xs transition-all ${
                                                playerFilter === f
                                                    ? 'bg-blue-600 text-white shadow-xs'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Players List */}
                            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                                {filteredPlayers.length === 0 ? (
                                    <div className="text-xs text-slate-400 text-center py-8">No players found</div>
                                ) : (
                                    filteredPlayers.map(p => {
                                        const isCurrent = currentPlayer?._id === p._id;

                                        return (
                                            <div
                                                key={p._id}
                                                onClick={() => p.status !== 'sold' && selectPlayer(p)}
                                                className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                                                    isCurrent
                                                        ? 'border-blue-400 bg-blue-50'
                                                        : p.status === 'sold'
                                                        ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                                                        : 'border-slate-200 bg-white hover:border-slate-300 cursor-pointer shadow-2xs'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 border border-slate-200">
                                                        {p.name.substring(0, 1)}
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-slate-900">{p.name}</div>
                                                        <div className="text-[11px] text-slate-500">
                                                            {p.category} • ₹{p.basePrice}{smallUnit}
                                                        </div>
                                                    </div>
                                                </div>

                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                                    p.status === 'sold'
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                        : p.status === 'unsold'
                                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                        : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {p.status}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Unsold Players Pool */}
                    {sidebarTab === 'unsold' && (
                        <div className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-2 mb-2 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs font-bold flex items-center justify-between">
                                <span>Unsold Pool ({unsoldPlayers.length})</span>
                                <span className="text-[10px] text-amber-700">Ready for Re-Auction</span>
                            </div>

                            {unsoldPlayers.length > 0 && (
                                <button
                                    onClick={handleBringAllUnsoldToSlot}
                                    className="w-full mb-3 py-2 px-3 bg-linear-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl font-black text-xs shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    <span>⚡ Bring All ({unsoldPlayers.length}) to Re-Auction Slot</span>
                                </button>
                            )}

                            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                                {unsoldPlayers.length === 0 ? (
                                    <div className="text-xs text-slate-400 text-center py-12 italic">
                                        No unsold players in this auction yet.
                                    </div>
                                ) : (
                                    unsoldPlayers.map(p => (
                                        <div
                                            key={p._id}
                                            className="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-all"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                                    {p.image ? (
                                                        <img src={p.image} alt={p.name} className="w-full h-full object-cover grayscale" />
                                                    ) : (
                                                        <User className="w-5 h-5 text-slate-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-slate-900">{p.name}</div>
                                                    <div className="text-[10px] text-slate-500">
                                                        {p.category} • Base ₹{p.basePrice}{smallUnit}
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => selectPlayer(p)}
                                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center gap-1 active:scale-95 cursor-pointer"
                                                title="Bring back to auction stage"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" /> Re-Auction
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tab 4: Live Bids Log Feed */}
                    {sidebarTab === 'bids' && (
                        <div className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-2 mb-2 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 text-xs font-bold flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                                    Live Bids Log ({bidLogs.length})
                                </span>
                                <span className="text-[10px] text-blue-700">Real-time Stream</span>
                            </div>

                            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                                {bidLogs.length === 0 ? (
                                    <div className="text-xs text-slate-400 text-center py-12 italic">
                                        No bids recorded for current player yet.
                                    </div>
                                ) : (
                                    bidLogs.map((b, i) => (
                                        <div
                                            key={i}
                                            className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2 shadow-2xs hover:border-blue-300 transition-all"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-black text-slate-700 overflow-hidden shadow-2xs">
                                                    {b.team?.logo ? (
                                                        <img src={b.team.logo} className="w-full h-full object-cover" />
                                                    ) : (
                                                        b.team?.shortName || b.team?.name?.substring(0, 2) || 'TM'
                                                    )}
                                                </div>
                                                <div>
                                                    <span className="font-extrabold text-slate-900 text-xs block leading-tight">
                                                        {b.team?.name || 'Bidder'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-semibold">
                                                        {b.time ? (typeof b.time.toLocaleTimeString === 'function' ? b.time.toLocaleTimeString() : new Date(b.time).toLocaleTimeString()) : ''}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="font-black text-emerald-700 text-xs px-2 py-0.5 bg-emerald-50 rounded-lg border border-emerald-200">
                                                ₹{b.amount} {smallUnit}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Slot Selection Modal */}
            {showSlotSelectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-6 bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-white flex justify-between items-center">
                            <div>
                                <span className="px-2.5 py-0.5 bg-white/20 rounded-md text-[10px] font-black tracking-widest uppercase mb-1 inline-block">
                                    AUCTIONEER SLOT SELECTION
                                </span>
                                <h2 className="text-xl font-black text-white">
                                    {slotModalContext === 'start' ? '🚀 Select Starting Slot to Begin Auction' :
                                     slotModalContext === 'completed' ? '🎉 Slot Complete! Select Next Slot' :
                                     slotModalContext === 'resume' ? '☕ Select Slot & Resume Bidding' :
                                     '🎯 Switch Active Auction Slot'}
                                </h2>
                                <p className="text-xs text-purple-100 mt-1">
                                    {slotModalContext === 'start' ? 'Select which set of players will open the bidding. The stage will automatically load the first player in this slot.' :
                                     slotModalContext === 'completed' ? 'All players in the previous slot have been auctioned. Pick the next slot from the remaining unauctioned sets.' :
                                     'Players from this slot will be called up for live bidding.'}
                                </p>
                            </div>

                            {slotModalContext !== 'start' && slotModalContext !== 'completed' && (
                                <button
                                    onClick={() => setShowSlotSelectModal(false)}
                                    className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        {/* Slots List */}
                        <div className="p-6 overflow-y-auto space-y-3 flex-1">
                            {slots.length === 0 ? (
                                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl">
                                    <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                    <h4 className="text-sm font-bold text-slate-700">No Custom Slots Created Yet</h4>
                                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                                        You have not created any custom slots/sets for this tournament yet. You can auction all pending players in the general queue.
                                    </p>
                                    <button
                                        onClick={() => {
                                            if (slotModalContext === 'start') {
                                                handleConfirmStartOfficialAuction(null);
                                            } else {
                                                handleSelectSlot(null);
                                            }
                                        }}
                                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-sm cursor-pointer"
                                    >
                                        Auction All Pending Players
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Dedicated Re-Auction Unsold Card */}
                                    <div className={`p-4 rounded-2xl border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3 ${
                                        activeSlotId?.startsWith('slot_unsold')
                                            ? 'border-amber-500 bg-amber-100/70 shadow-sm'
                                            : 'border-amber-300 bg-amber-50/70 hover:border-amber-400 shadow-2xs'
                                    }`}>
                                        <div className="flex items-center gap-3.5">
                                            <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-base shrink-0 shadow-xs">
                                                🔄
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-black text-slate-900 text-sm">Unsold Players (Re-Auction Round)</h4>
                                                    <span className="px-2 py-0.5 bg-amber-600 text-white rounded text-[10px] font-black uppercase">
                                                        Default Re-Auction Slot
                                                    </span>
                                                    {activeSlotId?.startsWith('slot_unsold') && (
                                                        <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-black uppercase">
                                                            Active Now
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
                                                    <span className="text-amber-900 font-extrabold bg-amber-100 px-2 py-0.5 rounded">
                                                        {unsoldPlayers.length} Unsold Players Available
                                                    </span>
                                                    <span className="text-slate-400">•</span>
                                                    <span className="text-slate-600 font-semibold">Brings all unsold players into auction together</span>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleBringAllUnsoldToSlot}
                                            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 self-end sm:self-center shrink-0"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                            <span>
                                                {slotModalContext === 'start' ? 'Start with Re-Auction' : 'Activate Unsold Re-Auction'} ({unsoldPlayers.length})
                                            </span>
                                        </button>
                                    </div>

                                    <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mt-4 mb-2">
                                        Custom Slots / Sets ({slots.filter(s => !s.isDefaultUnsold && s.slotType !== 'unsold').length})
                                    </p>

                                    {slots.map(slot => {
                                        const isUnsoldSlot = slot.isDefaultUnsold || slot.slotType === 'unsold';
                                        const sPlayers = players.filter(p => p.slotId === slot._id);
                                        const sPending = isUnsoldSlot
                                            ? players.filter(p => p.status === 'unsold' || (p.slotId === slot._id && p.status === 'pending'))
                                            : sPlayers.filter(p => p.status === 'pending');
                                        const sSold = sPlayers.filter(p => p.status === 'sold');
                                        const isCurrent = activeSlotId === slot._id;
                                        const isFinished = isUnsoldSlot ? sPending.length === 0 : (sPlayers.length > 0 && sPending.length === 0);

                                        return (
                                            <div
                                                key={slot._id}
                                                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                                                    isCurrent
                                                        ? isUnsoldSlot ? 'border-amber-500 bg-amber-50/70 shadow-sm' : 'border-purple-500 bg-purple-50/70 shadow-sm'
                                                        : isFinished
                                                        ? 'border-slate-200 bg-slate-50/60 opacity-60'
                                                        : isUnsoldSlot
                                                        ? 'border-amber-300 bg-amber-50/40 hover:border-amber-400 shadow-2xs'
                                                        : 'border-slate-200 bg-white hover:border-purple-300 shadow-2xs'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3.5">
                                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                                                        isCurrent
                                                            ? isUnsoldSlot ? 'bg-amber-600 text-white' : 'bg-purple-600 text-white'
                                                            : isFinished
                                                            ? 'bg-slate-200 text-slate-500'
                                                            : isUnsoldSlot
                                                            ? 'bg-amber-100 border border-amber-300 text-amber-800'
                                                            : 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                                                    }`}>
                                                        {isUnsoldSlot ? '🔄' : (slot.order || slot.name.substring(0, 2))}
                                                    </div>

                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-black text-slate-900 text-sm">{slot.name}</h4>
                                                            {isUnsoldSlot && (
                                                                <span className="px-2 py-0.5 bg-amber-500 text-white rounded text-[10px] font-black uppercase">
                                                                    Default Re-Auction
                                                                </span>
                                                            )}
                                                            {isCurrent && (
                                                                <span className="px-2 py-0.5 bg-purple-600 text-white rounded text-[10px] font-black uppercase">
                                                                    Active
                                                                </span>
                                                            )}
                                                            {isFinished && (
                                                                <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px] font-black uppercase">
                                                                    {isUnsoldSlot ? 'No Unsold' : 'Completed'}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
                                                            <span className={`font-bold px-2 py-0.5 rounded ${isUnsoldSlot ? 'text-amber-800 bg-amber-100' : 'text-purple-700 bg-purple-100/70'}`}>
                                                                Base: ₹{slot.basePrice} {smallUnit}
                                                            </span>
                                                            <span className="text-slate-500">•</span>
                                                            <span className="text-slate-600 font-semibold">{slot.role}</span>
                                                            <span className="text-slate-500">•</span>
                                                            <span className={`font-bold ${isUnsoldSlot ? 'text-amber-700' : 'text-emerald-700'}`}>
                                                                {sPending.length} {isUnsoldSlot ? 'Unsold Waiting' : 'Pending'}
                                                            </span>
                                                            {!isUnsoldSlot && <span className="text-slate-400">({sSold.length} Sold)</span>}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 self-end sm:self-center">
                                                    <button
                                                        onClick={() => {
                                                            if (slotModalContext === 'start') {
                                                                handleConfirmStartOfficialAuction(slot._id);
                                                            } else if (slotModalContext === 'resume') {
                                                                handleResumeWithSlot(slot._id);
                                                            } else {
                                                                handleSelectSlot(slot._id);
                                                            }
                                                        }}
                                                        disabled={isFinished && sPending.length === 0}
                                                        className={`px-4 py-2 rounded-xl text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                                                            isCurrent
                                                                ? isUnsoldSlot ? 'bg-amber-700 text-white hover:bg-amber-800' : 'bg-purple-700 text-white hover:bg-purple-800'
                                                                : isFinished
                                                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                                : isUnsoldSlot
                                                                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                                        }`}
                                                    >
                                                        <Play className="w-3.5 h-3.5" />
                                                        <span>
                                                            {slotModalContext === 'start'
                                                                ? (isUnsoldSlot ? 'Start Re-Auction Slot' : 'Start with this Slot')
                                                                : isCurrent
                                                                ? 'Continue Slot'
                                                                : (isUnsoldSlot ? 'Bring All to Auction Slot' : 'Activate this Slot')}
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Option to clear slot filter */}
                                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                                        <span className="text-xs text-slate-500 font-medium">Or auction all unslotted & general pool players:</span>
                                        <button
                                            onClick={() => {
                                                if (slotModalContext === 'start') {
                                                    handleConfirmStartOfficialAuction(null);
                                                } else if (slotModalContext === 'resume') {
                                                    handleResumeWithSlot(null);
                                                } else {
                                                    handleSelectSlot(null);
                                                }
                                            }}
                                            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                        >
                                            Auction All Players (No Slot)
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
                            <span className="text-slate-500">
                                Total {players.length} players registered in tournament
                            </span>
                            {slotModalContext !== 'start' && slotModalContext !== 'completed' && (
                                <button
                                    onClick={() => setShowSlotSelectModal(false)}
                                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-bold transition-all cursor-pointer"
                                >
                                    Dismiss
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Team Purchased Squad Modal for Auctioneer */}
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
                                    {viewingTeam.logo ? (
                                        <img src={viewingTeam.logo} alt={viewingTeam.name} className="w-full h-full object-cover" />
                                    ) : (
                                        viewingTeam.shortName || viewingTeam.name?.substring(0, 2)
                                    )}
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
                                        Purse Remaining: <strong className="text-emerald-700 font-black">₹{viewingTeam.budget - (viewingTeam.spent || 0)} {largeUnit}</strong> • Spent: ₹{viewingTeam.spent || 0} {largeUnit}
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
                                const teamSquad = players.filter(p => p.soldToTeamId === viewingTeam._id || p.soldToTeamId === viewingTeam.id);
                                return (
                                    <>
                                        <div className="flex flex-wrap justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-200 gap-2">
                                            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                                <Users className="w-4 h-4 text-blue-600" />
                                                Acquired Players: <strong className="text-slate-900 font-black">{teamSquad.length}</strong> / {tournament?.squadSizeLimit || 25}
                                            </span>
                                            <span className="text-xs font-bold text-slate-600">
                                                Total Spent: <strong className="text-emerald-700 font-black">₹{teamSquad.reduce((acc, p) => acc + (Number(p.soldPrice) || 0), 0)} {smallUnit}</strong>
                                            </span>
                                        </div>

                                        {teamSquad.length > 0 ? (
                                            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                                                {teamSquad.map((p, idx) => (
                                                    <div key={p._id || idx} className="p-3.5 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                                                {p.image ? (
                                                                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <User className="w-5 h-5 text-slate-400" />
                                                                )}
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
                                                                ₹{p.soldPrice || p.currentBid || 0} {smallUnit}
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
                                        {announcementModal.player?.image ? (
                                            <img src={announcementModal.player.image} alt={announcementModal.player.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                <User className="w-12 h-12" />
                                            </div>
                                        )}
                                    </div>

                                    <h3 className="text-2xl font-black text-slate-900">{announcementModal.player?.name}</h3>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                                        {announcementModal.player?.category} • Base ₹{announcementModal.player?.basePrice} {smallUnit}
                                    </p>

                                    {/* Winning Team & Price Card */}
                                    <div className="mt-5 p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 flex items-center justify-between">
                                        <div className="flex items-center gap-3 text-left">
                                            <div className="w-12 h-12 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-slate-800 font-black text-sm shadow-2xs overflow-hidden shrink-0">
                                                {announcementModal.team?.logo ? (
                                                    <img src={announcementModal.team.logo} alt={announcementModal.team.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    announcementModal.team?.shortName || announcementModal.team?.name?.substring(0, 2)
                                                )}
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
                                        {announcementModal.player?.image ? (
                                            <img src={announcementModal.player.image} alt={announcementModal.player.name} className="w-full h-full object-cover grayscale" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                <User className="w-10 h-10" />
                                            </div>
                                        )}
                                    </div>

                                    <h3 className="text-2xl font-black text-slate-900">{announcementModal.player?.name}</h3>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                                        {announcementModal.player?.category} • Base ₹{announcementModal.player?.basePrice} {smallUnit}
                                    </p>

                                    <div className="mt-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
                                        No bids received. Player moved to Unsold Pool and can be re-auctioned from the Unsold tab!
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

export default AdminAuctionConsole;
