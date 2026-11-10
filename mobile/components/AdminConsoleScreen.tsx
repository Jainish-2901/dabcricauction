import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    SafeAreaView,
    StatusBar,
    Alert,
    Platform,
    Modal,
    TextInput
} from 'react-native';
import SafeImage from './SafeImage';
import {
    Play,
    Pause,
    RotateCcw,
    Undo2,
    Shuffle,
    Gavel,
    ArrowRight,
    Users,
    LogOut,
    CheckCircle2,
    Shield,
    ArrowLeft,
    Timer,
    Coffee,
    Clock,
    Layers,
    X,
    ChevronRight,
    Flag,
    Trophy,
    Radio,
    Search,
    Sparkles,
    FileText
} from 'lucide-react-native';
import socket from '../lib/socket';
import { apiFetch } from '../lib/api';
import { getBudgetUnits } from '../lib/currency';
import { toast } from '../lib/toast';
import { handleExportCSVAction } from '../lib/csvExport';

export interface AdminConsoleScreenProps {
    tournamentId: string;
    tournamentName?: string;
    onLogout: () => void;
    onSwitchRole?: () => void;
    onBackToDashboard?: () => void;
    canSwitchRole?: boolean;
}

const getBidIncrement = (bid: number, rules?: any[]) => {
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

export const AdminConsoleScreen: React.FC<AdminConsoleScreenProps> = ({
    tournamentId,
    tournamentName = 'Tournament Auction',
    onLogout,
    onSwitchRole,
    onBackToDashboard,
    canSwitchRole = false
}) => {
    const [players, setPlayers] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [slots, setSlots] = useState<any[]>([]);
    const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
    const [showSlotModal, setShowSlotModal] = useState<boolean>(false);
    const [slotModalContext, setSlotModalContext] = useState<'start' | 'resume' | 'manual' | 'completed'>('start');
    const [viewingTeam, setViewingTeam] = useState<any | null>(null);

    const [currentPlayer, setCurrentPlayer] = useState<any>(null);
    const [currentBid, setCurrentBid] = useState<number>(0);
    const [leadTeam, setLeadTeam] = useState<any>(null);
    const [biddingState, setBiddingState] = useState<'active' | 'paused' | 'break' | 'stopped'>('active');
    const [tournament, setTournament] = useState<any>(null);
    const { largeUnit, smallUnit, formatAmount, formatBid, isKtoL } = getBudgetUnits(tournament);
    const [countdownTimer, setCountdownTimer] = useState<{ timeLeft: number } | null>(null);
    const [lastSoldPlayer, setLastSoldPlayer] = useState<any>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [bidLogs, setBidLogs] = useState<any[]>([]);
    const [announcementModal, setAnnouncementModal] = useState<{ type: 'sold' | 'unsold'; player: any; team?: any; price?: number } | null>(null);
    const [consoleTab, setConsoleTab] = useState<'stage' | 'players'>('stage');
    const [playerFilter, setPlayerFilter] = useState<'all' | 'remaining' | 'pending' | 'passed' | 'unsold' | 'sold'>('all');
    const [playerSearch, setPlayerSearch] = useState('');
    const [onlyActiveSlotInQueue, setOnlyActiveSlotInQueue] = useState(false);

    useEffect(() => {
        if (announcementModal) {
            const timer = setTimeout(() => {
                setAnnouncementModal(null);
            }, 5500);
            return () => clearTimeout(timer);
        }
    }, [announcementModal]);

    // Local smooth countdown interval
    useEffect(() => {
        if (!countdownTimer || countdownTimer.timeLeft <= 0) return;
        const interval = setInterval(() => {
            setCountdownTimer(prev => {
                if (!prev || prev.timeLeft <= 1) {
                    clearInterval(interval);
                    return null;
                }
                return { ...prev, timeLeft: prev.timeLeft - 1 };
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [countdownTimer?.timeLeft]);

    const fetchBidsForPlayer = async (pId: string) => {
        if (!pId || !tournamentId) return;
        try {
            const res = await apiFetch(`/api/tournaments/${tournamentId}/bids?playerId=${pId}`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    setBidLogs(data.map(b => ({
                        team: { name: b.teamName, _id: b.teamId, logo: b.teamLogo, shortName: b.teamShortName },
                        amount: b.bidAmount,
                        time: new Date(b.createdAt)
                    })));
                }
            }
        } catch (e) {
            // ignore
        }
    };

    useEffect(() => {
        socket.connect();
        
        const handleConnect = () => {
            socket.emit('join_auction', tournamentId);
            fetchAuctionData();
            fetchTournament();
        };
        socket.on('connect', handleConnect);
        if (socket.connected) {
            handleConnect();
        }

        socket.on('bid_update', (data: { amount: number; team: any; timestamp?: string }) => {
            setCurrentBid(data.amount);
            setLeadTeam(data.team);
            setBidLogs(prev => [{
                team: data.team,
                amount: data.amount,
                time: data.timestamp ? new Date(data.timestamp) : new Date()
            }, ...prev]);
        });

        socket.on('bidding_state_changed', ({ state }: { state: 'active' | 'paused' | 'break' | 'stopped' }) => {
            setBiddingState(state);
            showNotice(`Bidding ${state.toUpperCase()}`);
        });

        socket.on('slot_changed', (data: any) => {
            setActiveSlotId(data.activeSlotId || null);
            if (data?.tournament) setTournament((prev: any) => ({ ...prev, ...data.tournament }));
        });

        socket.on('auction_status_changed', (data: any) => {
            if (data?.tournament) {
                setTournament((prev: any) => ({ ...prev, ...data.tournament }));
                if (data.tournament.activeSlotId !== undefined) {
                    setActiveSlotId(data.tournament.activeSlotId || null);
                }
            }
            if (data?.biddingState) setBiddingState(data.biddingState);
        });

        socket.on('timer_tick', (data: { timeLeft: number }) => {
            setCountdownTimer(data);
        });

        socket.on('timer_cancelled', (data?: any) => {
            setCountdownTimer(null);
            if (data?.reason === 'new_bid') {
                showNotice(`Final call cancelled by new bid: ₹${data.amount}${smallUnit}!`);
            } else {
                showNotice('10s Timer cancelled.');
            }
        });

        socket.on('timer_completed', () => {
            setCountdownTimer(null);
        });

        socket.on('player_sold', (data: { player: any; team: any }) => {
            if (data?.team) {
                setTeams(prev => prev.map(t => (t._id === data.team._id || (t as any).id === data.team._id) ? { ...t, ...data.team } : t));
            }
            if (data?.player) {
                setPlayers(prev => prev.map(p => (p._id === data.player._id || (p as any).id === data.player._id) ? { ...p, ...data.player } : p));
                setLastSoldPlayer(data.player);
                setAnnouncementModal({
                    type: 'sold',
                    player: data.player,
                    team: data.team,
                    price: data.player.soldPrice || data.player.currentBid || 0
                });
            }
            setCountdownTimer(null);
            showNotice(`Sold ${data.player?.name} to ${data.team?.name || 'Winner'}!`);
            handleNextPlayer();
        });

        socket.on('team_updated', (data: { team: any }) => {
            if (data?.team) {
                setTeams(prev => prev.map(t => (t._id === data.team._id || (t as any).id === data.team._id) ? { ...t, ...data.team } : t));
            }
        });

        socket.on('player_unsold', (data: { player: any }) => {
            const unsoldP = data?.player || currentPlayer;
            if (unsoldP) {
                setPlayers(prev => prev.map(p => (p._id === unsoldP._id || (p as any).id === unsoldP._id) ? { ...p, status: 'unsold' } : p));
                setAnnouncementModal({
                    type: 'unsold',
                    player: unsoldP
                });
            }
            setCountdownTimer(null);
            showNotice(`${unsoldP?.name || 'Player'} marked as Unsold.`);
            handleNextPlayer();
        });

        socket.on('bid_undone', (data: { currentBid: number; leadTeam: any }) => {
            setCurrentBid(data.currentBid);
            setLeadTeam(data.leadTeam);
            showNotice('Last bid was undone.');
        });

        socket.on('sale_rolled_back', (data: { player: any }) => {
            fetchTournament();
            fetchAuctionData();
            if (data?.player) {
                setCurrentPlayer(data.player);
                setCurrentBid(data.player.currentBid || data.player.basePrice);
                setLeadTeam(data.player.currentLeadTeamId);
            }
            setLastSoldPlayer(null);
            showNotice(`Sale rolled back! Reopened ${data.player?.name}.`);
        });

        socket.on('unsold_reopened_to_slot', (data: any) => {
            if (data?.players) {
                setPlayers(prev => prev.map(p => {
                    const match = data.players.find((rp: any) => rp._id === p._id || rp.id === p._id);
                    return match ? { ...p, ...match } : p;
                }));
            }
            if (data?.unsoldSlot) {
                setActiveSlotId(data.unsoldSlot._id);
            }
            showNotice(`📢 Re-Auction Round: ${data?.reopenedCount || ''} unsold players brought into slot!`);
        });

        socket.on('player_passed', (data: any) => {
            const passedP = data?.player;
            if (passedP) {
                setPlayers(prev => prev.map(p => (p._id === passedP._id || (p as any).id === passedP._id) ? { ...p, status: 'passed', currentLeadTeamId: null } : p));
            }
        });

        socket.on('passed_reopened', (data: any) => {
            if (data?.players) {
                setPlayers(prev => prev.map(p => {
                    const match = data.players.find((rp: any) => rp._id === p._id || rp.id === p._id);
                    return match ? { ...p, ...match } : p;
                }));
            }
            showNotice(`🔄 Brought ${data?.reopenedCount || ''} passed players back to auction!`);
        });

        socket.on('auction_ended', (data: any) => {
            setTournament((prev: any) => ({ ...prev, status: 'completed' }));
            setBiddingState('stopped');
            setCountdownTimer(null);
            showNotice('🏆 AUCTION OFFICIALLY CONCLUDED!');
        });

        return () => {
            socket.off('bid_update');
            socket.off('bidding_state_changed');
            socket.off('slot_changed');
            socket.off('auction_status_changed');
            socket.off('timer_tick');
            socket.off('timer_cancelled');
            socket.off('timer_completed');
            socket.off('player_sold');
            socket.off('player_unsold');
            socket.off('team_updated');
            socket.off('bid_undone');
            socket.off('sale_rolled_back');
            socket.off('unsold_reopened_to_slot');
            socket.off('player_passed');
            socket.off('passed_reopened');
            socket.off('auction_ended');
            socket.off('connect', handleConnect);
            socket.disconnect();
        };
    }, [tournamentId]);

    const fetchTournament = async () => {
        try {
            const [tRes, sRes] = await Promise.all([
                apiFetch(`/api/tournaments/${tournamentId}`).then(r => r.json()),
                apiFetch(`/api/tournaments/${tournamentId}/slots`).then(r => r.json()).catch(() => [])
            ]);
            if (tRes && tRes._id) {
                setTournament(tRes);
                if (tRes.activeSlotId) {
                    setActiveSlotId(tRes.activeSlotId);
                } else if (Array.isArray(sRes) && sRes.length > 0 && !activeSlotId) {
                    setActiveSlotId(sRes[0]._id);
                }
            }
            if (Array.isArray(sRes)) {
                setSlots(sRes);
            }
        } catch (err) {
            console.error('Error fetching tournament/slots:', err);
        }
    };

    const showNotice = (msg: string) => {
        setNotice(msg);
        setTimeout(() => setNotice(null), 3500);
    };

    const fetchAuctionData = async () => {
        try {
            const [pRes, tRes] = await Promise.all([
                apiFetch(`/api/players/${tournamentId}`).then(r => r.json()),
                apiFetch(`/api/teams/${tournamentId}`).then(r => r.json())
            ]);

            if (Array.isArray(pRes)) {
                setPlayers(pRes);
                const pending = pRes.find((p: any) => p.status === 'pending');
                if (pending && !currentPlayer) {
                    selectPlayer(pending);
                }
            }
            if (Array.isArray(tRes)) {
                setTeams(tRes);
            }
        } catch {
            // Local fallback demo data
            setPlayers([
                { _id: 'p1', name: 'Virat Kohli', category: 'Batsman', basePrice: 200, status: 'pending' },
                { _id: 'p2', name: 'Jasprit Bumrah', category: 'Bowler', basePrice: 200, status: 'pending' },
                { _id: 'p3', name: 'Hardik Pandya', category: 'All-Rounder', basePrice: 150, status: 'pending' }
            ]);
            setTeams([
                { _id: 't1', name: 'Mumbai Strikers', shortName: 'MS', budget: 100, spent: 0 },
                { _id: 't2', name: 'Delhi Titans', shortName: 'DT', budget: 100, spent: 0 }
            ]);
            selectPlayer({ _id: 'p1', name: 'Virat Kohli', category: 'Batsman', basePrice: 200, status: 'pending' });
        }
    };

    const selectPlayer = (player: any) => {
        setCurrentPlayer(player);
        setCurrentBid(player.basePrice || 20);
        setLeadTeam(null);
        setBidLogs([]);
        if (player?._id) {
            fetchBidsForPlayer(player._id);
        }
        socket.emit('select_player', { tournamentId, playerId: player._id });
    };

    const handleToggleState = () => {
        const next = biddingState === 'active' ? 'paused' : 'active';
        setBiddingState(next);
        socket.emit('set_bidding_state', { tournamentId, state: next });
    };

    const handleTakeBreak = () => {
        const next = biddingState === 'break' ? 'active' : 'break';
        setBiddingState(next);
        socket.emit('set_bidding_state', { tournamentId, state: next });
        showNotice(next === 'break' ? 'Auction is now on BREAK' : 'Auction RESUMED from break');
    };

    const handleEndOfficialAuction = () => {
        Alert.alert(
            '🏁 End Auction Officially?',
            'This will mark the auction as COMPLETED, finalize all team rosters, and stop any new bids.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'End Auction Now',
                    style: 'destructive',
                    onPress: () => {
                        socket.emit('end_auction', { tournamentId });
                        setTournament((prev: any) => ({ ...prev, status: 'completed' }));
                        setBiddingState('stopped');
                        showNotice('🏆 AUCTION OFFICIALLY CONCLUDED!');
                    }
                }
            ]
        );
    };

    const handleBringAllUnsoldToSlot = async () => {
        // 1. Immediate optimistic local update
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
        setTournament((prev: any) => ({ ...prev, activeSlotId: targetSlot._id, biddingState: 'active' }));
        setShowSlotModal(false);

        const firstUnsold = updatedLocal.find(p => p.slotId === targetSlot._id && p.status === 'pending');
        if (firstUnsold) {
            selectPlayer(firstUnsold);
        }

        // 2. Broadcast via socket with acknowledgment
        socket.emit('bring_unsold_to_auction', { tournamentId }, (res: any) => {
            if (res?.success && res.players) {
                setPlayers(prev => prev.map(p => {
                    const match = res.players.find((rp: any) => rp._id === p._id || rp.id === p._id);
                    return match ? { ...p, ...match } : p;
                }));
            }
        });

        // 3. Fallback background sync
        try {
            await apiFetch(`/api/tournaments/${tournamentId}/slots/reopen-unsold`, { method: 'POST' })
                .catch(() => apiFetch(`/api/tournaments/${tournamentId}/reopen-unsold`, { method: 'POST' }));
        } catch (e) {
            console.log('Background REST reopen note:', e);
        }

        showNotice(`🎉 Brought all unsold players into Re-Auction slot!`);
    };

    const handleStartOfficialAuction = () => {
        if (slots.length > 0) {
            setSlotModalContext('start');
            setShowSlotModal(true);
        } else {
            handleConfirmStartAuction(null);
        }
    };

    const handleConfirmStartAuction = async (selectedSlotId: string | null) => {
        const slotObj = slots.find(s => s._id === selectedSlotId);
        if (slotObj && (slotObj.isDefaultUnsold || slotObj.slotType === 'unsold')) {
            await handleBringAllUnsoldToSlot();
            try {
                await apiFetch(`/api/tournaments/${tournamentId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        status: 'live',
                        biddingState: 'active',
                        activeSlotId: selectedSlotId || null
                    })
                });
            } catch (e) {}
            socket.emit('start_auction', { tournamentId, activeSlotId: selectedSlotId || null });
            setTournament((prev: any) => ({
                ...prev,
                status: 'live',
                biddingState: 'active',
                activeSlotId: selectedSlotId || null
            }));
            setBiddingState('active');
            return;
        }

        try {
            await apiFetch(`/api/tournaments/${tournamentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'live',
                    biddingState: 'active',
                    activeSlotId: selectedSlotId || null
                })
            });
        } catch (e) {
            console.error("API update error:", e);
        }

        socket.emit('start_auction', { tournamentId, activeSlotId: selectedSlotId || null });
        setTournament((prev: any) => ({
            ...prev,
            status: 'live',
            biddingState: 'active',
            activeSlotId: selectedSlotId || null
        }));
        setBiddingState('active');
        setActiveSlotId(selectedSlotId || null);
        setShowSlotModal(false);

        const pool = selectedSlotId
            ? players.filter(p => p.slotId === selectedSlotId && p.status === 'pending')
            : players.filter(p => p.status === 'pending');
        if (pool.length > 0) {
            selectPlayer(pool[0]);
        }

        showNotice('🚀 Official Live Auction Started!');
    };

    const handleSelectSlot = async (slotId: string | null, autoSelectFirst = true) => {
        const slotObj = slots.find(s => s._id === slotId);
        if (slotObj && (slotObj.isDefaultUnsold || slotObj.slotType === 'unsold')) {
            await handleBringAllUnsoldToSlot();
            return;
        }

        try {
            await apiFetch(`/api/tournaments/${tournamentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activeSlotId: slotId || null })
            });
        } catch (e) {
            console.error(e);
        }

        socket.emit('set_active_slot', { tournamentId, slotId: slotId || null });
        setActiveSlotId(slotId || null);
        setTournament((prev: any) => ({ ...prev, activeSlotId: slotId || null }));
        setShowSlotModal(false);

        showNotice(`Active Slot: ${slotObj ? slotObj.name : 'All Players'}`);

        if (autoSelectFirst) {
            const pool = slotId
                ? players.filter(p => p.slotId === slotId && p.status === 'pending')
                : players.filter(p => p.status === 'pending');
            if (pool.length > 0) {
                selectPlayer(pool[0]);
            }
        }
    };

    const handleResumeWithSlot = async (slotId: string | null) => {
        if (slotId !== undefined && slotId !== activeSlotId) {
            await handleSelectSlot(slotId, true);
        }
        handleToggleState();
        setShowSlotModal(false);
    };

    const handleTrigger10sTimer = () => {
        if (!currentPlayer) {
            toast.warning('No Player', 'Please bring a player to the auction stage first.');
            return;
        }
        socket.emit('trigger_final_countdown', {
            tournamentId,
            playerId: currentPlayer._id,
            duration: 10
        });
        setCountdownTimer({ timeLeft: 10 });
        showNotice('10s Final countdown started!');
    };

    const handleCancelTimer = () => {
        socket.emit('cancel_final_countdown', { tournamentId });
        showNotice('10s Countdown cancelled.');
    };

    const handleRandomDraw = (category?: string) => {
        let pool = activeSlotId
            ? players.filter(p => p.slotId === activeSlotId && p.status === 'pending')
            : players.filter(p => p.status === 'pending');

        if (category) {
            pool = pool.filter(p => p.category?.toLowerCase() === category.toLowerCase());
        }

        if (pool.length === 0) {
            const currentSlotObj = slots.find(s => s._id === activeSlotId);
            toast.info('Pool Empty', `No pending players found in ${category || currentSlotObj?.name || 'pool'}`);
            return;
        }

        const picked = pool[Math.floor(Math.random() * pool.length)];
        selectPlayer(picked);
        showNotice(`Selected ${picked.name}`);
    };

    const handleSell = () => {
        if (!currentPlayer || !leadTeam) {
            toast.warning('No Bid', 'There is no active bid to hammer sell.');
            return;
        }
        socket.emit('sell_player', { tournamentId, playerId: currentPlayer._id });
    };

    const handleUnsold = () => {
        if (!currentPlayer) return;
        socket.emit('mark_unsold', { tournamentId, playerId: currentPlayer._id });
        handleNextPlayer();
    };

    const handleUndoBid = () => {
        if (!currentPlayer) return;
        socket.emit('undo_last_bid', { tournamentId, playerId: currentPlayer._id });
    };

    const handleRollbackSale = () => {
        const target = lastSoldPlayer || players.find(p => p.status === 'sold');
        if (!target) {
            toast.info('Notice', 'No recently sold player to rollback.');
            return;
        }

        Alert.alert(
            'Confirm Rollback',
            `Revert the sale of ${target.name}? Purse will be refunded and bidding reopened.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Rollback',
                    style: 'destructive',
                    onPress: () => socket.emit('rollback_sale', { tournamentId, playerId: target._id })
                }
            ]
        );
    };

    const handlePassAndNext = () => {
        if (currentPlayer && currentPlayer.status !== 'sold' && currentPlayer.status !== 'unsold') {
            socket.emit('pass_player', { tournamentId, playerId: currentPlayer._id });
            setPlayers(prev => prev.map(p => p._id === currentPlayer._id ? { ...p, status: 'passed', currentLeadTeamId: null } : p));
            // Fallback API/Supabase update
            apiFetch(`/api/players/${currentPlayer._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'passed', currentLeadTeamId: null, currentBid: currentPlayer.basePrice || 0 })
            }).catch(() => {});
        }
        handleNextPlayer();
    };

    const handleBringPassedToAuction = async () => {
        if (passedPlayers.length === 0) return;

        socket.emit('reopen_passed_to_auction', { tournamentId }, (res: any) => {
            if (res?.success) {
                fetchTournament();
                showNotice(`🔄 Brought ${res.reopenedCount || passedPlayers.length} passed players back to pending!`);
            }
        });

        // Optimistic & direct fallback sync
        const targets = [...passedPlayers];
        setPlayers(prev => prev.map(p => (
            (p.status === 'passed' || (p.status === 'bidding' && p._id !== currentPlayer?._id))
                ? { ...p, status: 'pending', currentLeadTeamId: null, currentBid: p.basePrice || 0 }
                : p
        )));

        for (const p of targets) {
            apiFetch(`/api/players/${p._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'pending', currentLeadTeamId: null, currentBid: p.basePrice || 0 })
            }).catch(() => {});
        }
        showNotice(`🔄 Brought ${targets.length} passed players back to auction queue!`);
    };

    const handleNextPlayer = () => {
        let pool = activeSlotId
            ? players.filter(p => p.slotId === activeSlotId && p.status === 'pending')
            : players.filter(p => p.status === 'pending');

        const curIdx = currentPlayer ? pool.findIndex(p => p._id === currentPlayer._id) : -1;
        const next = pool.slice(curIdx + 1)[0] || pool.find(p => p._id !== currentPlayer?._id);

        if (next) {
            selectPlayer(next);
        } else {
            setCurrentPlayer(null);
            setLeadTeam(null);
            if (activeSlotId) {
                const currentSlotObj = slots.find(s => s._id === activeSlotId);
                const otherSlots = slots.filter(s => s._id !== activeSlotId && (
                    players.some(p => p.slotId === s._id && p.status === 'pending') ||
                    ((s.isDefaultUnsold || s.slotType === 'unsold') && players.some(p => p.status === 'unsold'))
                ));
                if (otherSlots.length > 0) {
                    setSlotModalContext('completed');
                    setShowSlotModal(true);
                    showNotice(`Slot ${currentSlotObj?.name || ''} completed! Select next slot.`);
                } else {
                    showNotice('All players concluded in this slot.');
                }
            } else {
                showNotice('All players concluded.');
            }
        }
    };

    const dynamicInc = getBidIncrement(currentBid, tournament?.bidIncrementRules);
    const nextBidAmount = (!leadTeam && currentBid === (currentPlayer?.basePrice || 0))
        ? (currentPlayer?.basePrice || 20)
        : currentBid + dynamicInc;

    const unsoldPlayers = players.filter(p => p.status === 'unsold');
    const soldPlayers = players.filter(p => p.status === 'sold');
    const pendingPlayers = players.filter(p => p.status === 'pending');
    const passedPlayers = players.filter(p => p.status === 'passed' || (p.status === 'bidding' && p._id !== currentPlayer?._id));
    const remainingPlayers = players.filter(p => p.status !== 'sold');

    const filteredPlayersList = players.filter(p => {
        if (onlyActiveSlotInQueue && activeSlotId && p.slotId !== activeSlotId) return false;
        if (playerSearch.trim()) {
            const q = playerSearch.trim().toLowerCase();
            if (!p.name?.toLowerCase().includes(q) && !p.category?.toLowerCase().includes(q)) return false;
        }
        if (playerFilter === 'all') return true;
        if (playerFilter === 'remaining') return p.status !== 'sold';
        if (playerFilter === 'passed') return p.status === 'passed' || (p.status === 'bidding' && p._id !== currentPlayer?._id);
        return p.status === playerFilter;
    });

    const handleAdminTeamBid = (team: any) => {
        if (!currentPlayer || biddingState !== 'active') return;
        const remainingPurseLakhs = Math.max(0, ((team.budget || 0) - (team.spent || 0)) * 100);
        if (remainingPurseLakhs < nextBidAmount) {
            toast.error('Insufficient Purse', `${team.name} only has ₹${(remainingPurseLakhs / 100).toFixed(2)} ${largeUnit} remaining.`);
            return;
        }
        socket.emit('place_bid', {
            tournamentId,
            teamId: team._id,
            amount: nextBidAmount
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTopRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        {onBackToDashboard && (
                            <TouchableOpacity onPress={onBackToDashboard} style={styles.backDashBtn}>
                                <ArrowLeft size={16} color="#0f172a" />
                            </TouchableOpacity>
                        )}
                        <Image
                            source={require('../assets/logo.png')}
                            style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' }}
                            resizeMode="contain"
                        />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.headerTitle} numberOfLines={1}>{tournamentName}</Text>
                            <Text style={styles.headerSub}>Dab Cric Auction • Master Console</Text>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {canSwitchRole && onSwitchRole && (
                            <TouchableOpacity onPress={onSwitchRole} style={styles.iconButton}>
                                <Shield size={16} color="#2563eb" />
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity onPress={onLogout} style={styles.iconButton}>
                            <LogOut size={16} color="#64748b" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Responsive Non-Overflowing Control Action Strip */}
                <View style={styles.headerActionBar}>
                    <TouchableOpacity
                        style={[styles.actionStripBtn, biddingState === 'active' ? styles.stateActive : styles.statePaused]}
                        onPress={handleToggleState}
                    >
                        {biddingState === 'active' ? (
                            <>
                                <Pause size={12} color="#b45309" />
                                <Text style={styles.stateTextPaused}>Pause</Text>
                            </>
                        ) : (
                            <>
                                <Play size={12} color="#15803d" />
                                <Text style={styles.stateTextActive}>Resume</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionStripBtn, biddingState === 'break' ? styles.stateBreak : styles.stateBreakInactive]}
                        onPress={handleTakeBreak}
                    >
                        <Coffee size={12} color={biddingState === 'break' ? '#1d4ed8' : '#64748b'} />
                        <Text style={[styles.stateTextBreak, biddingState === 'break' && { color: '#1d4ed8' }]}>
                            {biddingState === 'break' ? 'End Break' : 'Break'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionStripBtn, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}
                        onPress={handleEndOfficialAuction}
                    >
                        <Flag size={12} color="#dc2626" />
                        <Text style={[styles.stateTextBreak, { color: '#dc2626', fontWeight: '900' }]}>
                            End
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Console View Tab Bar: Stage vs Players Pool */}
                <View style={styles.consoleTabRow}>
                    <TouchableOpacity
                        style={[styles.consoleTabBtn, consoleTab === 'stage' && styles.consoleTabBtnActive]}
                        onPress={() => setConsoleTab('stage')}
                    >
                        <Gavel size={13} color={consoleTab === 'stage' ? '#ffffff' : '#64748b'} />
                        <Text style={[styles.consoleTabText, consoleTab === 'stage' && styles.consoleTabTextActive]}>
                            Live Stage
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.consoleTabBtn, consoleTab === 'players' && styles.consoleTabBtnActive]}
                        onPress={() => setConsoleTab('players')}
                    >
                        <Users size={13} color={consoleTab === 'players' ? '#ffffff' : '#64748b'} />
                        <Text style={[styles.consoleTabText, consoleTab === 'players' && styles.consoleTabTextActive]}>
                            Players List ({players.length})
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* In-App Notice */}
            {notice && (
                <View style={styles.noticeBanner}>
                    <CheckCircle2 size={14} color="#15803d" />
                    <Text style={styles.noticeText}>{notice}</Text>
                </View>
            )}

            {consoleTab === 'players' ? (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Player Search & Slot Toggle */}
                    <View style={styles.poolSearchCard}>
                        <View style={styles.poolSearchRow}>
                            <Search size={15} color="#94a3b8" />
                            <TextInput
                                style={styles.poolSearchInput}
                                placeholder="Search players by name or role..."
                                placeholderTextColor="#94a3b8"
                                value={playerSearch}
                                onChangeText={setPlayerSearch}
                            />
                            {playerSearch.length > 0 && (
                                <TouchableOpacity onPress={() => setPlayerSearch('')}>
                                    <X size={14} color="#94a3b8" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {activeSlotId && (
                            <TouchableOpacity
                                style={[
                                    styles.slotFilterPill,
                                    onlyActiveSlotInQueue && styles.slotFilterPillActive
                                ]}
                                onPress={() => setOnlyActiveSlotInQueue(!onlyActiveSlotInQueue)}
                            >
                                <Layers size={12} color={onlyActiveSlotInQueue ? '#ffffff' : '#7c3aed'} />
                                <Text style={[styles.slotFilterPillText, onlyActiveSlotInQueue && { color: '#ffffff' }]}>
                                    {onlyActiveSlotInQueue
                                        ? `Filtering Active Slot: ${slots.find(s => s._id === activeSlotId)?.name || 'Slot'}`
                                        : `Show Active Slot Only (${slots.find(s => s._id === activeSlotId)?.name || 'Slot'})`}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Status Filter Pills */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.poolFilterRow}
                    >
                        {[
                            { id: 'all', label: `All (${players.length})` },
                            { id: 'remaining', label: `Remaining (${remainingPlayers.length})` },
                            { id: 'pending', label: `Pending (${pendingPlayers.length})` },
                            { id: 'passed', label: `Passed (${passedPlayers.length})` },
                            { id: 'unsold', label: `Unsold (${unsoldPlayers.length})` },
                            { id: 'sold', label: `Sold (${soldPlayers.length})` }
                        ].map(f => (
                            <TouchableOpacity
                                key={f.id}
                                style={[styles.poolFilterChip, playerFilter === f.id && styles.poolFilterChipActive]}
                                onPress={() => setPlayerFilter(f.id as any)}
                            >
                                <Text style={[styles.poolFilterChipText, playerFilter === f.id && styles.poolFilterChipTextActive]}>
                                    {f.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Re-open Passed Players Banner */}
                    {passedPlayers.length > 0 && (playerFilter === 'passed' || playerFilter === 'remaining' || playerFilter === 'all') && (
                        <TouchableOpacity
                            style={styles.bringPassedBtn}
                            onPress={handleBringPassedToAuction}
                        >
                            <RotateCcw size={14} color="#ffffff" />
                            <Text style={styles.bringPassedBtnText}>
                                🔄 Bring All Passed ({passedPlayers.length}) Back to Auction
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* Bring Unsold to Re-Auction Slot Banner */}
                    {unsoldPlayers.length > 0 && (playerFilter === 'unsold' || playerFilter === 'remaining') && (
                        <TouchableOpacity
                            style={styles.bringAllUnsoldBtn}
                            onPress={handleBringAllUnsoldToSlot}
                        >
                            <Sparkles size={14} color="#ffffff" />
                            <Text style={styles.bringAllUnsoldBtnText}>
                                ⚡ Bring All Unsold ({unsoldPlayers.length}) to Re-Auction Slot
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* Players List */}
                    {filteredPlayersList.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Users size={30} color="#94a3b8" />
                            <Text style={styles.emptyTitle}>No Players Found</Text>
                            <Text style={styles.emptySub}>No players match the selected filter or search.</Text>
                        </View>
                    ) : (
                        <View style={{ gap: 8 }}>
                            {filteredPlayersList.map((p, idx) => {
                                const isCurrent = currentPlayer?._id === p._id;
                                const isPassed = p.status === 'passed' || (p.status === 'bidding' && !isCurrent);
                                const soldTeam = p.status === 'sold' ? teams.find(t => t._id === p.soldToTeamId || (t as any).id === p.soldToTeamId) : null;

                                return (
                                    <View
                                        key={p._id || idx}
                                        style={[
                                            styles.poolPlayerCard,
                                            isCurrent && styles.poolPlayerCardLive,
                                            p.status === 'sold' && styles.poolPlayerCardSold
                                        ]}
                                    >
                                        <View style={styles.poolPlayerAvatar}>
                                            <SafeImage
                                                uri={p.image}
                                                style={styles.poolPlayerAvatarImg}
                                                fallback={<Text style={styles.poolPlayerInitial}>{p.name?.substring(0, 1) || 'P'}</Text>}
                                            />
                                        </View>

                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.poolPlayerName} numberOfLines={1}>{p.name}</Text>
                                            <Text style={styles.poolPlayerMeta} numberOfLines={1}>
                                                {p.category} • Base ₹{p.basePrice}{smallUnit}
                                            </Text>
                                            {p.status === 'sold' && (
                                                <Text style={styles.poolPlayerSoldInfo} numberOfLines={1}>
                                                    Sold to {soldTeam?.name || 'Team'} • ₹{p.soldPrice || p.currentBid}{smallUnit}
                                                </Text>
                                            )}
                                        </View>

                                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                                            <View style={[
                                                styles.poolStatusBadge,
                                                isCurrent ? styles.poolStatusLive :
                                                p.status === 'sold' ? styles.poolStatusSold :
                                                p.status === 'unsold' ? styles.poolStatusUnsold :
                                                isPassed ? styles.poolStatusPassed : styles.poolStatusPending
                                            ]}>
                                                <Text style={[
                                                    styles.poolStatusText,
                                                    isCurrent ? { color: '#ffffff' } :
                                                    p.status === 'sold' ? { color: '#15803d' } :
                                                    p.status === 'unsold' ? { color: '#dc2626' } :
                                                    isPassed ? { color: '#b45309' } : { color: '#475569' }
                                                ]}>
                                                    {isCurrent ? 'LIVE' : isPassed ? 'PASSED' : (p.status || 'pending').toUpperCase()}
                                                </Text>
                                            </View>

                                            {p.status !== 'sold' && !isCurrent && (
                                                <TouchableOpacity
                                                    style={styles.bringToStageBtn}
                                                    onPress={() => {
                                                        selectPlayer(p);
                                                        setConsoleTab('stage');
                                                        showNotice(`Brought ${p.name} to Live Bidding Stage!`);
                                                    }}
                                                >
                                                    <Play size={10} color="#ffffff" />
                                                    <Text style={styles.bringToStageBtnText}>
                                                        {isPassed || p.status === 'unsold' ? 'Re-Auction' : 'Auction'}
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </ScrollView>
            ) : (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Official Completed Celebration Banner */}
                {tournament?.status === 'completed' && (
                    <View style={styles.completedCard}>
                        <Trophy size={28} color="#d97706" />
                        <Text style={styles.completedTitle}>🏆 AUCTION OFFICIALLY CONCLUDED</Text>
                        <Text style={styles.completedSub}>
                            All bidding rounds have finished. Total Sold: {players.filter(p => p.status === 'sold').length} • Unsold: {players.filter(p => p.status === 'unsold').length}
                        </Text>
                        <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#059669', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginTop: 10 }}
                            onPress={() => handleExportCSVAction({
                                type: 'summary',
                                tournament,
                                teams,
                                players
                            })}
                        >
                            <FileText size={14} color="#ffffff" />
                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#ffffff' }}>Download Summary CSV</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Official Auction Not Started Banner */}
                {(tournament?.status === 'upcoming' || (biddingState === 'stopped' && tournament?.status !== 'completed')) && (
                    <View style={styles.startAuctionCard}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.startAuctionTitle}>Auction Has Not Started Yet</Text>
                            <Text style={styles.startAuctionSub}>Spectators and team owners see a standby screen until you officially launch.</Text>
                        </View>
                        <TouchableOpacity style={styles.startAuctionBtn} onPress={handleStartOfficialAuction}>
                            <Play size={14} color="#ffffff" />
                            <Text style={styles.startAuctionBtnText}>Start Auction</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Active Slot Banner */}
                <View style={styles.activeSlotCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View style={styles.activeSlotIconBox}>
                            <Layers size={18} color="#7c3aed" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.activeSlotTag}>CURRENT ACTIVE SET / SLOT</Text>
                            <Text style={styles.activeSlotName} numberOfLines={1}>
                                {slots.find(s => s._id === activeSlotId)?.name || 'All Players (No Slot Filter)'}
                            </Text>
                            {slots.find(s => s._id === activeSlotId) && (() => {
                                const actSlot = slots.find(s => s._id === activeSlotId);
                                const isUnsold = actSlot?.isDefaultUnsold || actSlot?.slotType === 'unsold' || actSlot?.basePrice == null;
                                return (
                                    <Text style={styles.activeSlotDetail}>
                                        {isUnsold ? `Base: Per Player • ${actSlot?.role}` : `Base: ₹${actSlot?.basePrice}${smallUnit} • ${actSlot?.role}`}
                                    </Text>
                                );
                            })()}
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TouchableOpacity
                            style={styles.reAuctionHeaderBtn}
                            onPress={handleBringAllUnsoldToSlot}
                        >
                            <RotateCcw size={12} color="#ffffff" />
                            <Text style={styles.reAuctionHeaderBtnText}>
                                Re-Auction ({unsoldPlayers.length})
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.switchSlotBtn}
                            onPress={() => {
                                setSlotModalContext('manual');
                                setShowSlotModal(true);
                            }}
                        >
                            <Text style={styles.switchSlotBtnText}>Switch</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Random Draw Quick Chips */}
                <View style={styles.drawSection}>
                    <View style={styles.drawHeader}>
                        <Shuffle size={14} color="#2563eb" />
                        <Text style={styles.drawTitle}>RANDOM CATEGORY DRAW</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                        <TouchableOpacity style={styles.chip} onPress={() => handleRandomDraw()}>
                            <Text style={styles.chipText}>Any Pending</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.chip, styles.chipBlue]} onPress={() => handleRandomDraw('Batsman')}>
                            <Text style={styles.chipTextBlue}>Batsman</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.chip, styles.chipGreen]} onPress={() => handleRandomDraw('Bowler')}>
                            <Text style={styles.chipTextGreen}>Bowler</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.chip, styles.chipPurple]} onPress={() => handleRandomDraw('All-Rounder')}>
                            <Text style={styles.chipTextPurple}>All-Rounder</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.chip, styles.chipAmber]} onPress={() => handleRandomDraw('Wicket Keeper')}>
                            <Text style={styles.chipTextAmber}>Wicket Keeper</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                {/* Stage Player Card */}
                {currentPlayer ? (
                    <View style={styles.card}>
                        <View style={styles.playerStage}>
                            <View style={styles.avatarBox}>
                                <SafeImage
                                    uri={currentPlayer.image}
                                    style={styles.avatar}
                                    fallback={<Users size={32} color="#94a3b8" />}
                                />
                            </View>
                            <Text style={styles.playerName}>{currentPlayer.name}</Text>
                            <View style={styles.badgeRow}>
                                <View style={styles.categoryBadge}>
                                    <Text style={styles.categoryText}>{currentPlayer.category}</Text>
                                </View>
                                <View style={styles.baseBadge}>
                                    <Text style={styles.baseText}>Base: ₹{currentPlayer.basePrice}{smallUnit}</Text>
                                </View>
                            </View>

                            {/* Career Stats Grid */}
                            <View style={styles.statsGrid}>
                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>M</Text>
                                    <Text style={styles.statVal}>{currentPlayer.matches || currentPlayer.stats?.matches || '-'}</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>RUNS</Text>
                                    <Text style={styles.statVal}>{currentPlayer.runs || currentPlayer.stats?.runs || '-'}</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>HS</Text>
                                    <Text style={styles.statVal}>{currentPlayer.highestScore || currentPlayer.stats?.highestScore || '-'}</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>WKTS</Text>
                                    <Text style={styles.statVal}>{currentPlayer.wickets || currentPlayer.stats?.wickets || '-'}</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>BEST</Text>
                                    <Text style={styles.statVal}>{currentPlayer.bestBowling || currentPlayer.stats?.bestBowling || '-'}</Text>
                                </View>
                            </View>

                            {(currentPlayer.battingStyle || currentPlayer.bowlingStyle) && (
                                <View style={styles.styleRow}>
                                    {currentPlayer.battingStyle && (
                                        <Text style={styles.styleText}>Bat: <Text style={styles.styleBold}>{currentPlayer.battingStyle}</Text></Text>
                                    )}
                                    {currentPlayer.battingStyle && currentPlayer.bowlingStyle && <Text style={styles.styleDot}>•</Text>}
                                    {currentPlayer.bowlingStyle && (
                                        <Text style={styles.styleText}>Bowl: <Text style={styles.styleBold}>{currentPlayer.bowlingStyle}</Text></Text>
                                    )}
                                </View>
                            )}
                        </View>

                        {/* Final 10s Timer Banner */}
                        {countdownTimer && (
                            <View style={styles.timerBanner}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                    <Timer size={16} color="#ffffff" />
                                    <Text style={styles.timerBannerText}>FINAL CALL HAMMER TIMEOUT:</Text>
                                </View>
                                <View style={styles.timerSecBox}>
                                    <Text style={styles.timerSecText}>{countdownTimer.timeLeft}s</Text>
                                </View>
                                <TouchableOpacity style={styles.cancelTimerBtn} onPress={handleCancelTimer}>
                                    <Text style={styles.cancelTimerText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Bid Status */}
                        <View style={styles.bidBox}>
                            <Text style={styles.bidBoxLabel}>ACTIVE BID AMOUNT</Text>
                            <Text style={styles.bidBoxAmount}>₹ {currentBid} <Text style={styles.bidBoxUnit}>{smallUnit}</Text></Text>
                            {leadTeam ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
                                    <SafeImage uri={leadTeam.logo} style={{ width: 18, height: 18, borderRadius: 4, resizeMode: 'contain' }} />
                                    <Text style={styles.leaderHighlight}>
                                        Leader: <Text style={styles.leaderName}>{leadTeam.name}</Text>
                                    </Text>
                                </View>
                            ) : (
                                <Text style={styles.noBidText}>Awaiting bids from owners...</Text>
                            )}

                            {currentBid > (currentPlayer.basePrice || 0) && (
                                <TouchableOpacity style={styles.undoButton} onPress={handleUndoBid}>
                                    <Undo2 size={12} color="#dc2626" />
                                    <Text style={styles.undoText}>Undo Last Bid</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Master Auctioneer Control Actions */}
                        <View style={styles.controlButtons}>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.timerTriggerBtn, countdownTimer && styles.timerTriggerActive]}
                                onPress={countdownTimer ? handleCancelTimer : handleTrigger10sTimer}
                                disabled={!currentPlayer}
                            >
                                <Timer size={16} color="#ffffff" />
                                <Text style={styles.timerTriggerBtnText}>
                                    {countdownTimer ? `⏱️ Stop Final Countdown (${countdownTimer.timeLeft}s)` : '⏱️ Trigger Final Call (10s Timer)'}
                                </Text>
                            </TouchableOpacity>

                            {leadTeam ? (
                                <TouchableOpacity
                                    style={[styles.actionBtn, styles.sellBtn]}
                                    onPress={handleSell}
                                >
                                    <Gavel size={16} color="#ffffff" />
                                    <Text style={styles.sellBtnText}>
                                        🔨 Hammer Sold to {leadTeam.name} (₹{currentBid} {smallUnit})
                                    </Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.awaitingBidsNotice}>
                                    <Clock size={16} color="#d97706" />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.awaitingBidsTitle}>⏳ Awaiting Owner Bids</Text>
                                        <Text style={styles.awaitingBidsSub}>
                                            Owners place bids from their devices. Hammer activates once an owner bids.
                                        </Text>
                                    </View>
                                </View>
                            )}

                            <View style={styles.actionBtnRow}>
                                <TouchableOpacity
                                    style={[styles.actionBtn, styles.unsoldBtn]}
                                    onPress={handleUnsold}
                                >
                                    <Text style={styles.unsoldBtnText}>Mark Unsold</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionBtn, styles.nextBtn]}
                                    onPress={handlePassAndNext}
                                >
                                    <Text style={styles.nextBtnText}>Pass / Next</Text>
                                    <ArrowRight size={14} color="#ffffff" />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={styles.rollbackBtn}
                                onPress={handleRollbackSale}
                            >
                                <RotateCcw size={14} color="#7c3aed" />
                                <Text style={styles.rollbackBtnText}>Rollback Previous Sale</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <View style={styles.emptyCard}>
                        <Users size={36} color="#94a3b8" />
                        <Text style={styles.emptyTitle}>No Active Player</Text>
                        <Text style={styles.emptySub}>Select a category from the draw chips above or click below.</Text>
                        <TouchableOpacity style={styles.pickNextBtn} onPress={handleNextPlayer}>
                            <Text style={styles.pickNextBtnText}>Select Next In Queue</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Live Bid Logs Stream Card */}
                <View style={[styles.teamsCard, { marginBottom: 12 }]}>
                    <View style={styles.teamsHeaderRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Radio size={16} color="#e11d48" />
                            <Text style={styles.teamsTitle}>Live Bids Stream</Text>
                        </View>
                        <Text style={styles.teamsSub}>
                            {bidLogs.length} {bidLogs.length === 1 ? 'bid' : 'bids'}
                        </Text>
                    </View>

                    {bidLogs.length === 0 ? (
                        <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                            <Text style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                                No bids placed on current player yet.
                            </Text>
                        </View>
                    ) : (
                        <View style={{ gap: 8 }}>
                            {bidLogs.slice(0, 8).map((b, i) => (
                                <View
                                    key={i}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: 8,
                                        borderRadius: 10,
                                        backgroundColor: '#f8fafc',
                                        borderWidth: 1,
                                        borderColor: '#e2e8f0'
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <View
                                            style={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: 6,
                                                backgroundColor: '#ffffff',
                                                borderWidth: 1,
                                                borderColor: '#e2e8f0',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <Text style={{ fontSize: 9, fontWeight: '900', color: '#1e293b' }}>
                                                {b.team?.shortName || b.team?.name?.substring(0, 2) || 'TM'}
                                            </Text>
                                        </View>
                                        <View>
                                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#0f172a' }}>
                                                {b.team?.name || 'Bidder'}
                                            </Text>
                                            <Text style={{ fontSize: 9, color: '#94a3b8' }}>
                                                {b.time ? (typeof b.time.toLocaleTimeString === 'function' ? b.time.toLocaleTimeString() : new Date(b.time).toLocaleTimeString()) : ''}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={{ fontSize: 11, fontWeight: '900', color: '#16a34a' }}>
                                        ₹{b.amount} {smallUnit}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Team Purses Overview */}
                <View style={styles.teamsCard}>
                    <View style={styles.teamsHeaderRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Users size={16} color="#2563eb" />
                            <Text style={styles.teamsTitle}>Connected Teams ({teams.length})</Text>
                        </View>
                        <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}
                            onPress={() => handleExportCSVAction({
                                type: 'summary',
                                tournament,
                                teams,
                                players
                            })}
                        >
                            <FileText size={12} color="#047857" />
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#047857' }}>Summary CSV</Text>
                        </TouchableOpacity>
                    </View>

                    {teams.map(t => {
                        const tPlayers = players.filter(p => p.soldToTeamId === t._id || p.soldToTeamId === (t as any).id);
                        return (
                            <TouchableOpacity
                                key={t._id}
                                style={styles.teamRow}
                                onPress={() => setViewingTeam(t)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.teamLeft}>
                                    <View style={styles.teamTag}>
                                        <SafeImage
                                            uri={t.logo}
                                            style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                                            fallback={<Text style={styles.teamTagText}>{t.shortName || t.name.substring(0, 2)}</Text>}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.teamRowName}>{t.name}</Text>
                                        <Text style={styles.teamSquadCount}>
                                            {tPlayers.length} {tPlayers.length === 1 ? 'player' : 'players'} • Tap squad
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.teamRight}>
                                    <View style={styles.teamPursePill}>
                                        <Text style={styles.teamRowPurse}>₹{Math.max(0, ((t.budget || 0) - (t.spent || 0))).toFixed(2)} {largeUnit}</Text>
                                    </View>
                                    {tournament?.auctionType === 'admin_driven' ? (
                                        <TouchableOpacity
                                            style={[
                                                styles.quickBidBtn,
                                                (!currentPlayer || biddingState !== 'active' || leadTeam?._id === t._id) && styles.quickBidBtnDisabled
                                            ]}
                                            onPress={(e) => {
                                                (e as any)?.stopPropagation?.();
                                                handleAdminTeamBid(t);
                                            }}
                                            disabled={!currentPlayer || biddingState !== 'active' || leadTeam?._id === t._id}
                                        >
                                            <Text style={styles.quickBidBtnText}>+Bid ₹{nextBidAmount}{smallUnit}</Text>
                                        </TouchableOpacity>
                                    ) : (leadTeam?._id === t._id || (leadTeam as any)?.id === t._id) ? (
                                        <View style={styles.leadTeamBadge}>
                                            <Text style={styles.leadTeamBadgeText}>👑 Leader</Text>
                                        </View>
                                    ) : null}
                                    <ChevronRight size={16} color="#94a3b8" />
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Unsold Pool Card */}
                {unsoldPlayers.length > 0 && (
                    <View style={[styles.teamsCard, { marginTop: 14 }]}>
                        <View style={styles.teamsHeaderRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <RotateCcw size={16} color="#d97706" />
                                <Text style={[styles.teamsTitle, { color: '#b45309' }]}>Unsold Pool ({unsoldPlayers.length})</Text>
                            </View>
                            <Text style={styles.teamsSub}>Tap Re-Auction to recall</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.bringAllUnsoldBtn}
                            onPress={handleBringAllUnsoldToSlot}
                        >
                            <RotateCcw size={14} color="#ffffff" />
                            <Text style={styles.bringAllUnsoldBtnText}>
                                ⚡ Bring All ({unsoldPlayers.length}) to Re-Auction Slot
                            </Text>
                        </TouchableOpacity>

                        {unsoldPlayers.map((p, idx) => (
                            <View key={p._id || idx} style={styles.unsoldRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.unsoldPlayerName}>{p.name}</Text>
                                    <Text style={styles.unsoldPlayerSub}>{p.category} • Base ₹{p.basePrice}{smallUnit}</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.reAuctionBtn}
                                    onPress={() => {
                                        selectPlayer(p);
                                        showNotice(`Recalled ${p.name} for Re-Auction`);
                                    }}
                                >
                                    <RotateCcw size={12} color="#ffffff" />
                                    <Text style={styles.reAuctionBtnText}>Re-Auction</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                {/* Quick Player Pool Overview Card on Stage */}
                <View style={[styles.teamsCard, { marginTop: 14 }]}>
                    <View style={styles.teamsHeaderRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Users size={16} color="#2563eb" />
                            <Text style={styles.teamsTitle}>Player Pool Status ({players.length})</Text>
                        </View>
                        <TouchableOpacity onPress={() => { setPlayerFilter('all'); setConsoleTab('players'); }}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#2563eb' }}>View List →</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                        <TouchableOpacity
                            style={[styles.poolStatMiniCard, { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }]}
                            onPress={() => { setPlayerFilter('pending'); setConsoleTab('players'); }}
                        >
                            <Text style={[styles.poolStatCount, { color: '#0f172a' }]}>{pendingPlayers.length}</Text>
                            <Text style={styles.poolStatLabel}>PENDING</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.poolStatMiniCard, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}
                            onPress={() => { setPlayerFilter('passed'); setConsoleTab('players'); }}
                        >
                            <Text style={[styles.poolStatCount, { color: '#b45309' }]}>{passedPlayers.length}</Text>
                            <Text style={styles.poolStatLabel}>PASSED</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.poolStatMiniCard, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}
                            onPress={() => { setPlayerFilter('unsold'); setConsoleTab('players'); }}
                        >
                            <Text style={[styles.poolStatCount, { color: '#dc2626' }]}>{unsoldPlayers.length}</Text>
                            <Text style={styles.poolStatLabel}>UNSOLD</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.poolStatMiniCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}
                            onPress={() => { setPlayerFilter('sold'); setConsoleTab('players'); }}
                        >
                            <Text style={[styles.poolStatCount, { color: '#15803d' }]}>{soldPlayers.length}</Text>
                            <Text style={styles.poolStatLabel}>SOLD</Text>
                        </TouchableOpacity>
                    </View>

                    {passedPlayers.length > 0 && (
                        <TouchableOpacity
                            style={[styles.bringPassedBtn, { marginTop: 10, marginBottom: 0 }]}
                            onPress={handleBringPassedToAuction}
                        >
                            <RotateCcw size={13} color="#ffffff" />
                            <Text style={styles.bringPassedBtnText}>
                                🔄 Bring Passed ({passedPlayers.length}) Back to Auction
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
            )}

            {/* Mobile Slot Selection Modal */}
            <Modal
                visible={showSlotModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowSlotModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTag}>AUCTIONEER SLOT SELECTION</Text>
                                <Text style={styles.modalTitle}>
                                    {slotModalContext === 'start' ? '🚀 Select Starting Slot' :
                                     slotModalContext === 'completed' ? '🎉 Slot Done! Next Slot' :
                                     slotModalContext === 'resume' ? '☕ Select Slot & Resume' :
                                     '🎯 Switch Active Slot'}
                                </Text>
                                <Text style={styles.modalSub}>
                                    {slotModalContext === 'start' ? 'Choose which set will open live auction.' :
                                     slotModalContext === 'completed' ? 'All players in previous slot auctioned. Pick next set.' :
                                     'Players from this slot will be called up for bidding.'}
                                </Text>
                            </View>
                            {slotModalContext !== 'start' && slotModalContext !== 'completed' && (
                                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowSlotModal(false)}>
                                    <X size={18} color="#64748b" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Slots List */}
                        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                            {/* Dedicated Re-Auction Unsold Card */}
                            <View style={styles.modalUnsoldCard}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                    <View style={styles.modalUnsoldIcon}>
                                        <RotateCcw size={16} color="#d97706" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={styles.modalUnsoldTitle}>Unsold Players (Re-Auction)</Text>
                                            <Text style={styles.unsoldSlotChip}>Default Slot</Text>
                                        </View>
                                        <Text style={styles.modalUnsoldSub}>
                                            {unsoldPlayers.length} Unsold Players available to re-auction
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={styles.modalUnsoldActionBtn}
                                    onPress={handleBringAllUnsoldToSlot}
                                >
                                    <Text style={styles.modalUnsoldActionBtnText}>
                                        Activate ({unsoldPlayers.length})
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            {slots.length === 0 ? (
                                <View style={{ padding: 20, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 12 }}>
                                        No custom slots created yet.
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.unslottedBtn}
                                        onPress={() => {
                                            if (slotModalContext === 'start') {
                                                handleConfirmStartAuction(null);
                                            } else {
                                                handleSelectSlot(null);
                                            }
                                        }}
                                    >
                                        <Text style={styles.unslottedBtnText}>Auction All Pending Players</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <>
                                    {slots.map(s => {
                                        const isUnsoldSlot = s.isDefaultUnsold || s.slotType === 'unsold';
                                        const sPlayers = players.filter(p => p.slotId === s._id);
                                        const sPending = isUnsoldSlot
                                            ? players.filter(p => p.status === 'unsold' || (p.slotId === s._id && p.status === 'pending'))
                                            : sPlayers.filter(p => p.status === 'pending');
                                        const isCurrent = activeSlotId === s._id;
                                        const isFinished = isUnsoldSlot ? sPending.length === 0 : (sPlayers.length > 0 && sPending.length === 0);

                                        return (
                                            <TouchableOpacity
                                                key={s._id}
                                                style={[
                                                    styles.slotCard,
                                                    isUnsoldSlot && styles.slotCardUnsold,
                                                    isCurrent && (isUnsoldSlot ? styles.slotCardUnsoldActive : styles.slotCardActive),
                                                    isFinished && { opacity: 0.5 }
                                                ]}
                                                onPress={() => {
                                                    if (slotModalContext === 'start') {
                                                        handleConfirmStartAuction(s._id);
                                                    } else if (slotModalContext === 'resume') {
                                                        handleResumeWithSlot(s._id);
                                                    } else {
                                                        handleSelectSlot(s._id);
                                                    }
                                                }}
                                                disabled={isFinished && sPending.length === 0}
                                            >
                                                <View style={{ flex: 1 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                        <Text style={styles.slotCardTitle}>{s.name}</Text>
                                                        {isUnsoldSlot && <Text style={styles.unsoldSlotChip}>Default</Text>}
                                                        {isCurrent && <Text style={styles.activeSlotChip}>Active</Text>}
                                                        {isFinished && <Text style={styles.doneSlotChip}>{isUnsoldSlot ? 'No Unsold' : 'Done'}</Text>}
                                                    </View>
                                                    <Text style={styles.slotCardSub}>
                                                        {isUnsoldSlot || s.basePrice == null ? 'Base: Per Player' : `Base: ₹${s.basePrice}${smallUnit}`} • {s.role} • {sPending.length} {isUnsoldSlot ? 'Unsold Waiting' : 'Pending'}
                                                    </Text>
                                                </View>
                                                <View style={[styles.slotPickBtn, isUnsoldSlot && { backgroundColor: '#d97706' }]}>
                                                    <Play size={12} color="#ffffff" />
                                                    <Text style={styles.slotPickBtnText}>
                                                        {slotModalContext === 'start'
                                                            ? (isUnsoldSlot ? 'Re-Auction' : 'Start')
                                                            : isCurrent
                                                            ? 'Keep'
                                                            : (isUnsoldSlot ? 'Re-Auction All' : 'Select')}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}

                                    <TouchableOpacity
                                        style={styles.unslottedBtn}
                                        onPress={() => {
                                            if (slotModalContext === 'start') {
                                                handleConfirmStartAuction(null);
                                            } else if (slotModalContext === 'resume') {
                                                handleResumeWithSlot(null);
                                            } else {
                                                handleSelectSlot(null);
                                            }
                                        }}
                                    >
                                        <Text style={styles.unslottedBtnText}>Auction All Players (No Slot Filter)</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
            {/* Team Purchased Squad Modal */}
            <Modal
                visible={!!viewingTeam}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setViewingTeam(null)}
            >
                <View style={styles.squadModalOverlay}>
                    <View style={styles.squadModalCard}>
                        {viewingTeam && (
                            <>
                                <View style={styles.squadModalHeader}>
                                    <View style={styles.squadModalTeamRow}>
                                        <View style={styles.squadModalLogo}>
                                            <SafeImage
                                                uri={viewingTeam.logo}
                                                style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                                                fallback={
                                                    <Text style={styles.squadModalLogoText}>
                                                        {viewingTeam.shortName || viewingTeam.name.substring(0, 2)}
                                                    </Text>
                                                }
                                            />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 10 }}>
                                            <Text style={styles.squadModalTitle}>{viewingTeam.name}</Text>
                                            <Text style={styles.squadModalSub}>
                                                Purse: ₹{viewingTeam.budget - (viewingTeam.spent || 0)} {largeUnit} • Spent: ₹{viewingTeam.spent || 0} {largeUnit}
                                            </Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => setViewingTeam(null)}
                                        style={styles.squadModalCloseBtn}
                                    >
                                        <X size={20} color="#64748b" />
                                    </TouchableOpacity>
                                </View>

                                {(() => {
                                    const teamPlayers = players.filter(p => p.soldToTeamId === viewingTeam._id || p.soldToTeamId === (viewingTeam as any).id);
                                    return (
                                        <ScrollView style={styles.squadModalScroll} showsVerticalScrollIndicator={false}>
                                            <View style={styles.squadModalStatsBar}>
                                                <Text style={styles.squadModalStatsText}>
                                                    Acquired: <Text style={styles.squadModalStatsBold}>{teamPlayers.length}</Text> / {tournament?.squadSizeLimit || 25}
                                                </Text>
                                                <Text style={styles.squadModalStatsText}>
                                                    Total Spent: <Text style={styles.squadModalStatsBold}>₹{teamPlayers.reduce((acc, p) => acc + (Number(p.soldPrice) || 0), 0)} {smallUnit}</Text>
                                                </Text>
                                            </View>

                                            {teamPlayers.length === 0 ? (
                                                <View style={styles.squadModalEmpty}>
                                                    <Users size={36} color="#94a3b8" />
                                                    <Text style={styles.squadModalEmptyTitle}>No Players Purchased Yet</Text>
                                                    <Text style={styles.squadModalEmptySub}>
                                                        {viewingTeam.name} has not won any bids in this auction yet.
                                                    </Text>
                                                </View>
                                            ) : (
                                                teamPlayers.map((p, idx) => (
                                                    <View key={p._id || idx} style={styles.squadModalPlayerRow}>
                                                        <View style={styles.squadModalPlayerIndex}>
                                                            <Text style={styles.squadModalPlayerIndexText}>{idx + 1}</Text>
                                                        </View>
                                                        <View style={styles.squadModalPlayerInfo}>
                                                            <Text style={styles.squadModalPlayerName}>{p.name}</Text>
                                                            <Text style={styles.squadModalPlayerCategory}>
                                                                {p.category} {p.battingStyle ? `• ${p.battingStyle}` : ''}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.squadModalPlayerPrice}>
                                                            <Text style={styles.squadModalPlayerPriceText}>₹{p.soldPrice || p.currentBid} {smallUnit}</Text>
                                                            <Text style={styles.squadModalPlayerBasePrice}>Base: ₹{p.basePrice}{smallUnit}</Text>
                                                        </View>
                                                    </View>
                                                ))
                                            )}
                                        </ScrollView>
                                    );
                                })()}

                                <View style={styles.squadModalFooter}>
                                    <TouchableOpacity
                                        style={styles.squadModalDoneBtn}
                                        onPress={() => setViewingTeam(null)}
                                    >
                                        <Text style={styles.squadModalDoneBtnText}>Close</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Real-Time Sold / Unsold Announcement Pop-Up Modal */}
            <Modal
                visible={!!announcementModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setAnnouncementModal(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { maxHeight: 420, alignItems: 'center', padding: 24 }]}>
                        {announcementModal && (
                            <>
                                <View style={{
                                    paddingHorizontal: 16,
                                    paddingVertical: 6,
                                    borderRadius: 20,
                                    backgroundColor: announcementModal.type === 'sold' ? '#dcfce7' : '#fef3c7',
                                    borderWidth: 1,
                                    borderColor: announcementModal.type === 'sold' ? '#86efac' : '#fde68a',
                                    marginBottom: 16
                                }}>
                                    <Text style={{
                                        fontSize: 14,
                                        fontWeight: '900',
                                        color: announcementModal.type === 'sold' ? '#15803d' : '#b45309',
                                        textTransform: 'uppercase'
                                    }}>
                                        {announcementModal.type === 'sold' ? '🎉 SOLD!' : '⚠️ UNSOLD'}
                                    </Text>
                                </View>

                                <SafeImage
                                    uri={announcementModal.player?.image}
                                    style={{ width: 88, height: 88, borderRadius: 16, marginBottom: 12 }}
                                    fallback={
                                        <View style={{ width: 88, height: 88, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                            <Users size={36} color="#94a3b8" />
                                        </View>
                                    }
                                />

                                <Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a', textAlign: 'center', marginBottom: 4 }}>
                                    {announcementModal.player?.name}
                                </Text>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: 16 }}>
                                    {announcementModal.player?.category} • Base ₹{announcementModal.player?.basePrice} {smallUnit}
                                </Text>

                                {announcementModal.type === 'sold' ? (
                                    <View style={{ width: '100%', padding: 14, backgroundColor: '#f0fdf4', borderRadius: 16, borderWidth: 1, borderColor: '#bbf7d0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 }}>
                                            <SafeImage uri={announcementModal.team?.logo} style={{ width: 34, height: 34, borderRadius: 8, resizeMode: 'contain', backgroundColor: '#ffffff' }} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 10, fontWeight: '800', color: '#16a34a', textTransform: 'uppercase' }}>Sold To</Text>
                                                <Text style={{ fontSize: 15, fontWeight: '900', color: '#0f172a' }} numberOfLines={1}>{announcementModal.team?.name || 'Winner'}</Text>
                                            </View>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Sold Price</Text>
                                            <Text style={{ fontSize: 18, fontWeight: '900', color: '#15803d' }}>
                                                ₹{formatAmount(announcementModal.price || 0)}
                                            </Text>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={{ width: '100%', padding: 12, backgroundColor: '#fffbeb', borderRadius: 14, borderWidth: 1, borderColor: '#fef3c7', marginBottom: 16 }}>
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#b45309', textAlign: 'center' }}>
                                            No bids received. Player moved to Unsold Pool and will be eligible for Re-Auction.
                                        </Text>
                                    </View>
                                )}

                                <TouchableOpacity
                                    onPress={() => setAnnouncementModal(null)}
                                    style={{ paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#0f172a', borderRadius: 12 }}
                                >
                                    <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '800' }}>Dismiss</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 12,
    },
    header: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
    },
    headerActionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
        width: '100%',
    },
    actionStripBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 7,
        paddingHorizontal: 4,
        borderRadius: 8,
        borderWidth: 1,
    },
    awaitingBidsNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#fffbeb',
        borderWidth: 1,
        borderColor: '#fde68a',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
    },
    awaitingBidsTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#92400e',
    },
    awaitingBidsSub: {
        fontSize: 11,
        color: '#b45309',
        marginTop: 2,
    },
    leadTeamBadge: {
        backgroundColor: '#fef3c7',
        borderWidth: 1,
        borderColor: '#fde68a',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    leadTeamBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#b45309',
    },
    backDashBtn: {
        padding: 6,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
    },
    headerTitle: {
        fontSize: 15,
        fontWeight: '900',
        color: '#0f172a',
    },
    headerSub: {
        fontSize: 11,
        color: '#2563eb',
        fontWeight: '700',
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
    },
    stateActive: {
        backgroundColor: '#fef3c7',
        borderColor: '#fde68a',
    },
    statePaused: {
        backgroundColor: '#f0fdf4',
        borderColor: '#bbf7d0',
    },
    stateBreak: {
        backgroundColor: '#eff6ff',
        borderColor: '#bfdbfe',
    },
    stateBreakInactive: {
        backgroundColor: '#f8fafc',
        borderColor: '#e2e8f0',
    },
    stateTextBreak: {
        fontSize: 11,
        fontWeight: '800',
        color: '#64748b',
    },
    stateTextPaused: {
        fontSize: 11,
        fontWeight: '800',
        color: '#b45309',
    },
    stateTextActive: {
        fontSize: 11,
        fontWeight: '800',
        color: '#15803d',
    },
    iconButton: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    noticeBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#f0fdf4',
        borderBottomWidth: 1,
        borderBottomColor: '#bbf7d0',
        paddingVertical: 6,
    },
    noticeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#15803d',
    },
    scrollContent: {
        padding: 16,
    },
    activeSlotCard: {
        backgroundColor: '#f5f3ff',
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: '#ddd6fe',
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    activeSlotIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#ede9fe',
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeSlotTag: {
        fontSize: 9,
        fontWeight: '900',
        color: '#6d28d9',
        letterSpacing: 0.5,
    },
    activeSlotName: {
        fontSize: 13,
        fontWeight: '900',
        color: '#0f172a',
    },
    activeSlotDetail: {
        fontSize: 10,
        color: '#64748b',
        fontWeight: '600',
    },
    switchSlotBtn: {
        backgroundColor: '#ffffff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#c4b5fd',
    },
    switchSlotBtnText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#6d28d9',
    },
    drawSection: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 14,
    },
    startAuctionCard: {
        backgroundColor: '#fffbeb',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#fde68a',
        marginBottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    startAuctionTitle: {
        fontSize: 13,
        fontWeight: '900',
        color: '#92400e',
        marginBottom: 2,
    },
    startAuctionSub: {
        fontSize: 10,
        fontWeight: '600',
        color: '#b45309',
    },
    startAuctionBtn: {
        backgroundColor: '#16a34a',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    startAuctionBtnText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '900',
    },
    timerBanner: {
        backgroundColor: '#dc2626',
        borderRadius: 12,
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    timerBannerText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '900',
    },
    timerSecBox: {
        backgroundColor: '#ffffff',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginHorizontal: 8,
    },
    timerSecText: {
        color: '#dc2626',
        fontSize: 15,
        fontWeight: '900',
    },
    cancelTimerBtn: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    cancelTimerText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: '800',
    },
    timerTriggerBtn: {
        backgroundColor: '#ea580c',
    },
    timerTriggerActive: {
        backgroundColor: '#b91c1c',
    },
    timerTriggerBtnText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '900',
    },
    drawHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    drawTitle: {
        fontSize: 10,
        fontWeight: '800',
        color: '#475569',
        letterSpacing: 0.8,
    },
    chipRow: {
        flexDirection: 'row',
        gap: 6,
    },
    chip: {
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    chipText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#334155',
    },
    chipBlue: {
        backgroundColor: '#eff6ff',
        borderColor: '#bfdbfe',
    },
    chipTextBlue: {
        fontSize: 11,
        fontWeight: '700',
        color: '#1d4ed8',
    },
    chipGreen: {
        backgroundColor: '#f0fdf4',
        borderColor: '#bbf7d0',
    },
    chipTextGreen: {
        fontSize: 11,
        fontWeight: '700',
        color: '#15803d',
    },
    chipPurple: {
        backgroundColor: '#faf5ff',
        borderColor: '#e9d5ff',
    },
    chipTextPurple: {
        fontSize: 11,
        fontWeight: '700',
        color: '#7e22ce',
    },
    chipAmber: {
        backgroundColor: '#fffbeb',
        borderColor: '#fde68a',
    },
    chipTextAmber: {
        fontSize: 11,
        fontWeight: '700',
        color: '#b45309',
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 16,
        marginBottom: 14,
        shadowColor: '#64748b',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    playerStage: {
        alignItems: 'center',
        marginBottom: 16,
    },
    avatarBox: {
        width: 80,
        height: 80,
        borderRadius: 16,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    playerName: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0f172a',
        marginBottom: 4,
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 6,
    },
    categoryBadge: {
        backgroundColor: '#f1f5f9',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    categoryText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#475569',
    },
    baseBadge: {
        backgroundColor: '#eff6ff',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    baseText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#1d4ed8',
    },
    bidBox: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 14,
        padding: 14,
        alignItems: 'center',
        marginBottom: 16,
    },
    bidBoxLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#64748b',
        letterSpacing: 0.8,
        marginBottom: 2,
    },
    bidBoxAmount: {
        fontSize: 34,
        fontWeight: '900',
        color: '#0f172a',
    },
    bidBoxUnit: {
        fontSize: 16,
        fontWeight: '700',
        color: '#64748b',
    },
    leaderHighlight: {
        fontSize: 11,
        color: '#475569',
        marginTop: 4,
    },
    leaderName: {
        fontWeight: '800',
        color: '#15803d',
    },
    noBidText: {
        fontSize: 11,
        color: '#94a3b8',
        marginTop: 4,
    },
    undoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    undoText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#dc2626',
    },
    controlButtons: {
        gap: 8,
    },
    actionBtn: {
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    sellBtn: {
        backgroundColor: '#16a34a',
    },
    sellBtnText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '800',
    },
    actionBtnRow: {
        flexDirection: 'row',
        gap: 8,
    },
    unsoldBtn: {
        flex: 1,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#cbd5e1',
    },
    unsoldBtnText: {
        color: '#475569',
        fontSize: 12,
        fontWeight: '800',
    },
    nextBtn: {
        flex: 1,
        backgroundColor: '#2563eb',
    },
    nextBtnText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '800',
    },
    rollbackBtn: {
        backgroundColor: '#faf5ff',
        borderWidth: 1,
        borderColor: '#e9d5ff',
        borderRadius: 12,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
        marginTop: 2,
    },
    rollbackBtnText: {
        color: '#7c3aed',
        fontSize: 12,
        fontWeight: '800',
    },
    emptyCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 14,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#334155',
        marginTop: 8,
        marginBottom: 4,
    },
    emptySub: {
        fontSize: 11,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 16,
    },
    pickNextBtn: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
    },
    pickNextBtnText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '800',
    },
    teamsCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    teamsHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    teamsTitle: {
        fontSize: 13,
        fontWeight: '900',
        color: '#0f172a',
    },
    teamsSub: {
        fontSize: 10,
        fontWeight: '700',
        color: '#2563eb',
    },
    teamRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    teamLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
    },
    teamTag: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    teamTagText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#334155',
    },
    teamRowName: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1e293b',
    },
    teamSquadCount: {
        fontSize: 10,
        fontWeight: '600',
        color: '#64748b',
        marginTop: 1,
    },
    teamRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    teamPursePill: {
        backgroundColor: '#f0fdf4',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#dcfce7',
    },
    teamRowPurse: {
        fontSize: 12,
        fontWeight: '900',
        color: '#15803d',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        maxHeight: '80%',
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#6d28d9',
    },
    modalTag: {
        fontSize: 9,
        fontWeight: '900',
        color: '#e9d5ff',
        letterSpacing: 0.5,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#ffffff',
        marginTop: 2,
    },
    modalSub: {
        fontSize: 11,
        color: '#ddd6fe',
        marginTop: 2,
    },
    modalCloseBtn: {
        padding: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 8,
    },
    modalScroll: {
        padding: 16,
    },
    slotCard: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 14,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    slotCardActive: {
        backgroundColor: '#f5f3ff',
        borderColor: '#a78bfa',
    },
    slotCardTitle: {
        fontSize: 13,
        fontWeight: '900',
        color: '#0f172a',
    },
    slotCardSub: {
        fontSize: 10,
        color: '#64748b',
        fontWeight: '700',
        marginTop: 2,
    },
    activeSlotChip: {
        fontSize: 9,
        fontWeight: '900',
        color: '#6d28d9',
        backgroundColor: '#ede9fe',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
    },
    doneSlotChip: {
        fontSize: 9,
        fontWeight: '900',
        color: '#475569',
        backgroundColor: '#e2e8f0',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
    },
    slotPickBtn: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    slotPickBtnText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '800',
    },
    unslottedBtn: {
        backgroundColor: '#f1f5f9',
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 4,
        marginBottom: 14,
    },
    unslottedBtnText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#475569',
    },
    squadModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'center',
        padding: 16,
    },
    squadModalCard: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        maxHeight: '82%',
        overflow: 'hidden',
    },
    squadModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        backgroundColor: '#f8fafc',
    },
    squadModalTeamRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    squadModalLogo: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#2563eb',
        justifyContent: 'center',
        alignItems: 'center',
    },
    squadModalLogoText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#ffffff',
    },
    squadModalTitle: {
        fontSize: 15,
        fontWeight: '900',
        color: '#0f172a',
    },
    squadModalSub: {
        fontSize: 11,
        fontWeight: '700',
        color: '#16a34a',
        marginTop: 2,
    },
    squadModalCloseBtn: {
        padding: 6,
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
    },
    squadModalScroll: {
        padding: 16,
    },
    squadModalStatsBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 10,
        marginBottom: 12,
    },
    squadModalStatsText: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '600',
    },
    squadModalStatsBold: {
        color: '#0f172a',
        fontWeight: '900',
    },
    squadModalEmpty: {
        alignItems: 'center',
        paddingVertical: 36,
    },
    squadModalEmptyTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#334155',
        marginTop: 8,
    },
    squadModalEmptySub: {
        fontSize: 11,
        color: '#94a3b8',
        textAlign: 'center',
        marginTop: 4,
        paddingHorizontal: 20,
    },
    squadModalPlayerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    squadModalPlayerIndex: {
        width: 24,
        height: 24,
        borderRadius: 6,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    squadModalPlayerIndexText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#64748b',
    },
    squadModalPlayerInfo: {
        flex: 1,
    },
    squadModalPlayerName: {
        fontSize: 13,
        fontWeight: '800',
        color: '#0f172a',
    },
    squadModalPlayerCategory: {
        fontSize: 10,
        fontWeight: '600',
        color: '#64748b',
        marginTop: 1,
    },
    squadModalPlayerPrice: {
        alignItems: 'flex-end',
    },
    squadModalPlayerPriceText: {
        fontSize: 13,
        fontWeight: '900',
        color: '#15803d',
    },
    squadModalPlayerBasePrice: {
        fontSize: 10,
        fontWeight: '600',
        color: '#94a3b8',
    },
    squadModalFooter: {
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        alignItems: 'flex-end',
        backgroundColor: '#f8fafc',
    },
    squadModalDoneBtn: {
        backgroundColor: '#0f172a',
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 10,
    },
    squadModalDoneBtnText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '800',
    },
    statsGrid: {
        flexDirection: 'row',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 8,
        marginTop: 10,
        width: '100%',
        justifyContent: 'space-around',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    statBox: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#64748b',
    },
    statVal: {
        fontSize: 12,
        fontWeight: '900',
        color: '#0f172a',
        marginTop: 2,
    },
    styleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        gap: 6,
    },
    styleText: {
        fontSize: 11,
        color: '#64748b',
    },
    styleBold: {
        fontWeight: '800',
        color: '#334155',
    },
    styleDot: {
        color: '#cbd5e1',
        fontSize: 10,
    },
    quickBidBtn: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 8,
    },
    quickBidBtnDisabled: {
        backgroundColor: '#cbd5e1',
        opacity: 0.6,
    },
    quickBidBtnText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: '800',
    },
    unsoldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    unsoldPlayerName: {
        fontSize: 12,
        fontWeight: '800',
        color: '#0f172a',
    },
    unsoldPlayerSub: {
        fontSize: 10,
        color: '#64748b',
        marginTop: 1,
    },
    reAuctionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#d97706',
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 8,
    },
    reAuctionBtnText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: '800',
    },
    bringAllUnsoldBtn: {
        backgroundColor: '#d97706',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 10,
    },
    bringAllUnsoldBtnText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '900',
    },
    slotCardUnsold: {
        backgroundColor: '#fffbeb',
        borderColor: '#fde68a',
    },
    slotCardUnsoldActive: {
        backgroundColor: '#fef3c7',
        borderColor: '#f59e0b',
    },
    unsoldSlotChip: {
        fontSize: 9,
        fontWeight: '900',
        color: '#b45309',
        backgroundColor: '#fef3c7',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
    },
    reAuctionHeaderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#d97706',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    reAuctionHeaderBtnText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#ffffff',
    },
    modalUnsoldCard: {
        backgroundColor: '#fffbeb',
        borderWidth: 1.5,
        borderColor: '#fde68a',
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    modalUnsoldIcon: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: '#fef3c7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalUnsoldTitle: {
        fontSize: 12,
        fontWeight: '900',
        color: '#92400e',
    },
    modalUnsoldSub: {
        fontSize: 10,
        fontWeight: '600',
        color: '#b45309',
        marginTop: 1,
    },
    modalUnsoldActionBtn: {
        backgroundColor: '#d97706',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 8,
    },
    modalUnsoldActionBtnText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#ffffff',
    },
    completedCard: {
        backgroundColor: '#fffbeb',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1.5,
        borderColor: '#fde68a',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    completedTitle: {
        fontSize: 15,
        fontWeight: '900',
        color: '#92400e',
        marginTop: 6,
        letterSpacing: 0.5,
    },
    completedSub: {
        fontSize: 11,
        fontWeight: '700',
        color: '#b45309',
        textAlign: 'center',
        marginTop: 3,
    },
    consoleTabRow: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 10,
        backgroundColor: '#f1f5f9',
        padding: 4,
        borderRadius: 12,
    },
    consoleTabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
        borderRadius: 9,
    },
    consoleTabBtnActive: {
        backgroundColor: '#2563eb',
        shadowColor: '#2563eb',
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    consoleTabText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#64748b',
    },
    consoleTabTextActive: {
        color: '#ffffff',
    },
    poolSearchCard: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 14,
        padding: 10,
        marginBottom: 10,
        gap: 8,
    },
    poolSearchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 7,
        gap: 8,
    },
    poolSearchInput: {
        flex: 1,
        fontSize: 12,
        fontWeight: '600',
        color: '#0f172a',
        padding: 0,
    },
    slotFilterPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#f5f3ff',
        borderWidth: 1,
        borderColor: '#ddd6fe',
        borderRadius: 10,
        paddingVertical: 7,
        paddingHorizontal: 10,
    },
    slotFilterPillActive: {
        backgroundColor: '#7c3aed',
        borderColor: '#7c3aed',
    },
    slotFilterPillText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#6d28d9',
        flex: 1,
    },
    poolFilterRow: {
        gap: 6,
        paddingBottom: 10,
    },
    poolFilterChip: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    poolFilterChipActive: {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
    },
    poolFilterChipText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#475569',
    },
    poolFilterChipTextActive: {
        color: '#ffffff',
    },
    bringPassedBtn: {
        backgroundColor: '#4f46e5',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 10,
    },
    bringPassedBtnText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '900',
    },
    poolPlayerCard: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 14,
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    poolPlayerCardLive: {
        borderColor: '#3b82f6',
        backgroundColor: '#eff6ff',
    },
    poolPlayerCardSold: {
        backgroundColor: '#f8fafc',
        opacity: 0.85,
    },
    poolPlayerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    poolPlayerAvatarImg: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    poolPlayerInitial: {
        fontSize: 15,
        fontWeight: '900',
        color: '#475569',
    },
    poolPlayerName: {
        fontSize: 13,
        fontWeight: '800',
        color: '#0f172a',
    },
    poolPlayerMeta: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748b',
        marginTop: 1,
    },
    poolPlayerSoldInfo: {
        fontSize: 10,
        fontWeight: '800',
        color: '#15803d',
        marginTop: 2,
    },
    poolStatusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
    },
    poolStatusLive: {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
    },
    poolStatusSold: {
        backgroundColor: '#f0fdf4',
        borderColor: '#bbf7d0',
    },
    poolStatusUnsold: {
        backgroundColor: '#fef2f2',
        borderColor: '#fecaca',
    },
    poolStatusPassed: {
        backgroundColor: '#fffbeb',
        borderColor: '#fde68a',
    },
    poolStatusPending: {
        backgroundColor: '#f1f5f9',
        borderColor: '#e2e8f0',
    },
    poolStatusText: {
        fontSize: 9,
        fontWeight: '900',
    },
    bringToStageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#2563eb',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    bringToStageBtnText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#ffffff',
    },
    poolStatMiniCard: {
        flex: 1,
        minWidth: '22%',
        paddingVertical: 10,
        paddingHorizontal: 6,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
    },
    poolStatCount: {
        fontSize: 16,
        fontWeight: '900',
    },
    poolStatLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#64748b',
        marginTop: 2,
    },
});

export default AdminConsoleScreen;
