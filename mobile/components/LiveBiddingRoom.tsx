import React, { useState, useEffect, useRef } from 'react';
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
    Modal
} from 'react-native';
import { Shield, Users, Pause, LogOut, CheckCircle2, AlertCircle, ArrowLeft, Timer, Coffee, Clock, Gavel, X, ChevronRight, Wallet, Radio } from 'lucide-react-native';
import socket from '../lib/socket';
import { apiFetch } from '../lib/api';
import { getBudgetUnits } from '../lib/currency';
import { toast } from '../lib/toast';
import SafeImage from './SafeImage';

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

export interface Player {
    _id: string;
    name: string;
    category: string;
    basePrice: number;
    currentBid?: number;
    currentLeadTeamId?: any;
    image?: string;
    soldPrice?: number;
    soldToTeamId?: string;
    battingStyle?: string;
    bowlingStyle?: string;
    status?: string;
    stats?: {
        matches: number;
        runs: number;
        wickets: number;
    };
}

export interface TeamData {
    _id: string;
    name: string;
    shortName?: string;
    budget: number;
    spent: number;
    logo?: string;
}

export interface LiveBiddingRoomProps {
    team: TeamData;
    tournamentId: string;
    onLogout: () => void;
    onSwitchRole?: () => void;
    canSwitchRole?: boolean;
    onBackToDashboard?: () => void;
}

export const LiveBiddingRoom: React.FC<LiveBiddingRoomProps> = ({
    team,
    tournamentId,
    onLogout,
    onSwitchRole,
    canSwitchRole = false,
    onBackToDashboard
}) => {
    const [teamData, setTeamData] = useState<TeamData>(team);
    const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
    const [currentBid, setCurrentBid] = useState<number>(0);
    const [leadTeam, setLeadTeam] = useState<any>(null);
    const [biddingState, setBiddingState] = useState<'active' | 'paused' | 'break' | 'stopped'>('active');
    const [tournament, setTournament] = useState<any>(null);
    const { largeUnit, smallUnit, formatAmount, formatBid, isKtoL } = getBudgetUnits(tournament);
    const [slots, setSlots] = useState<any[]>([]);
    const [countdownTimer, setCountdownTimer] = useState<{ timeLeft: number } | null>(null);
    const [squad, setSquad] = useState<Player[]>([]);
    const [allPlayers, setAllPlayers] = useState<Player[]>([]);
    const [otherTeams, setOtherTeams] = useState<TeamData[]>([]);
    const [viewingTeam, setViewingTeam] = useState<TeamData | null>(null);
    const [activeTab, setActiveTab] = useState<'auction' | 'squad' | 'teams' | 'unsold'>('auction');
    const [notice, setNotice] = useState<string | null>(null);
    const [bidLogs, setBidLogs] = useState<any[]>([]);
    const [announcementModal, setAnnouncementModal] = useState<{ type: 'sold' | 'unsold'; player: any; team?: any; price?: number } | null>(null);
    const lastBidTime = useRef(0);

    const remainingPurse = ((Number(teamData.budget) || 0) - (Number(teamData.spent) || 0)).toFixed(2);
    const isLeading = leadTeam?._id === team._id || leadTeam === team._id;
    const dynamicInc = getBidIncrement(currentBid, tournament?.bidIncrementRules);
    const nextBidAmount = !leadTeam ? Number(currentBid || currentPlayer?.basePrice || 10) : (Number(currentBid || 0) + dynamicInc);
    const unsoldPlayers = allPlayers.filter(p => p.status === 'unsold');

    const formatInc = (inc: number) => {
        if (inc >= 100) {
            const large = (inc / 100).toFixed(inc % 100 === 0 ? 0 : 2);
            return `+₹${large} ${largeUnit}`;
        }
        return `+₹${inc} ${smallUnit}`;
    };

    useEffect(() => {
        if (announcementModal) {
            const timer = setTimeout(() => {
                setAnnouncementModal(null);
            }, 5500);
            return () => clearTimeout(timer);
        }
    }, [announcementModal]);

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
            fetchTournament();
        };
        socket.on('connect', handleConnect);
        if (socket.connected) {
            handleConnect();
        }

        socket.on('new_player', (player: Player) => {
            setCurrentPlayer(player);
            setCurrentBid(player.basePrice || 20);
            setLeadTeam(null);
            setBidLogs([]);
            if (player?._id) {
                fetchBidsForPlayer(player._id);
            }
            showNotice(`New Player: ${player.name}`);
        });

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
            showNotice(`Auction Bidding ${state.toUpperCase()}`);
        });

        socket.on('slot_changed', (data: any) => {
            if (data?.tournament) setTournament((prev: any) => ({ ...prev, ...data.tournament }));
            if (data?.activeSlotId !== undefined) {
                setTournament((prev: any) => ({ ...prev, activeSlotId: data.activeSlotId }));
            }
        });

        socket.on('auction_status_changed', (data: any) => {
            if (data?.tournament) setTournament((prev: any) => ({ ...prev, ...data.tournament }));
            if (data?.biddingState) setBiddingState(data.biddingState);
        });

        socket.on('timer_tick', (data: { timeLeft: number }) => {
            setCountdownTimer(data);
        });

        socket.on('timer_cancelled', (data?: any) => {
            setCountdownTimer(null);
            if (data?.reason === 'new_bid') {
                showNotice(`Timer cancelled by new bid: ₹${data.amount}${smallUnit}!`);
            } else {
                showNotice('Timer cancelled.');
            }
        });

        socket.on('timer_completed', () => {
            setCountdownTimer(null);
        });

        socket.on('player_sold', (data: { player: Player; team: TeamData }) => {
            setCountdownTimer(null);
            if (data?.team) {
                setOtherTeams(prev => prev.map(t => (t._id === data.team._id || (t as any).id === data.team._id) ? { ...t, ...data.team } : t));
                if (data.team._id === team._id) {
                    setTeamData(prev => ({ ...prev, ...data.team }));
                    setSquad(prev => [...prev, data.player]);
                }
            }
            if (data?.player) {
                setAllPlayers(prev => {
                    const exists = prev.some(p => p._id === data.player._id || (p as any).id === data.player._id);
                    if (exists) return prev.map(p => (p._id === data.player._id || (p as any).id === data.player._id) ? { ...p, ...data.player } : p);
                    return [...prev, data.player];
                });
                setAnnouncementModal({
                    type: 'sold',
                    player: data.player,
                    team: data.team,
                    price: data.player.soldPrice || data.player.currentBid || 0
                });
            }
            fetchTournament();
            setCurrentPlayer(null);
            setLeadTeam(null);
        });

        socket.on('player_unsold', (data?: { player?: Player }) => {
            setCountdownTimer(null);
            const unsoldP = data?.player || currentPlayer;
            if (unsoldP) {
                setAllPlayers(prev => {
                    const exists = prev.some(p => p._id === unsoldP._id || (p as any).id === unsoldP._id);
                    if (exists) return prev.map(p => (p._id === unsoldP._id || (p as any).id === unsoldP._id) ? { ...p, status: 'unsold' } : p);
                    return [...prev, { ...unsoldP, status: 'unsold' }];
                });
                setAnnouncementModal({
                    type: 'unsold',
                    player: unsoldP
                });
            }
            fetchTournament();
            setCurrentPlayer(null);
            setLeadTeam(null);
            showNotice('Player marked as Unsold.');
        });

        socket.on('team_updated', (data: { team: any }) => {
            if (data?.team) {
                setOtherTeams(prev => prev.map(t => (t._id === data.team._id || (t as any).id === data.team._id) ? { ...t, ...data.team } : t));
                if (data.team._id === team._id) {
                    setTeamData(prev => ({ ...prev, ...data.team }));
                }
            }
        });

        socket.on('sale_rolled_back', (data: { player: Player; refundedTeamId: string; refundedAmount: number }) => {
            if (data.refundedTeamId === team._id) {
                setTeamData(prev => ({
                    ...prev,
                    spent: Math.max(0, (prev.spent || 0) - (data.refundedAmount || 0))
                }));
                setSquad(prev => prev.filter(p => p._id !== data.player._id));
            }
            if (data.player) {
                setCurrentPlayer(data.player);
                setCurrentBid(data.player.currentBid || data.player.basePrice);
                setLeadTeam(data.player.currentLeadTeamId || null);
            }
            fetchTournament();
            toast.info('Sale Rolled Back', `Sale reverted! Bidding reopened on ${data.player?.name}.`);
        });

        socket.on('bid_undone', (data: { currentBid: number; leadTeam: any }) => {
            setCurrentBid(data.currentBid);
            setLeadTeam(data.leadTeam);
            showNotice('Previous bid undone by Auctioneer.');
        });

        socket.on('unsold_reopened_to_slot', (data: any) => {
            if (data?.players) {
                setAllPlayers(prev => prev.map(p => {
                    const match = data.players.find((rp: any) => rp._id === p._id || rp.id === p._id);
                    return match ? { ...p, ...match } : p;
                }));
            }
            showNotice(`📢 Re-Auction Round: ${data?.reopenedCount || ''} unsold players brought into slot!`);
        });

        socket.on('auction_ended', () => {
            setTournament((prev: any) => ({ ...prev, status: 'completed' }));
            setBiddingState('stopped');
            setCountdownTimer(null);
            showNotice('🏆 AUCTION OFFICIALLY CONCLUDED!');
        });

        return () => {
            socket.off('new_player');
            socket.off('bid_update');
            socket.off('bidding_state_changed');
            socket.off('slot_changed');
            socket.off('auction_status_changed');
            socket.off('timer_tick');
            socket.off('timer_cancelled');
            socket.off('timer_completed');
            socket.off('player_sold');
            socket.off('player_unsold');
            socket.off('sale_rolled_back');
            socket.off('bid_undone');
            socket.off('unsold_reopened_to_slot');
            socket.off('auction_ended');
            socket.off('connect', handleConnect);
            socket.disconnect();
        };
    }, [tournamentId, team._id]);

    const fetchTournament = async () => {
        try {
            const [tRes, sRes, pRes, teamRes] = await Promise.all([
                apiFetch(`/api/tournaments/${tournamentId}`).then(r => r.json()),
                apiFetch(`/api/tournaments/${tournamentId}/slots`).then(r => r.json()).catch(() => []),
                apiFetch(`/api/players/${tournamentId}`).then(r => r.json()).catch(() => []),
                apiFetch(`/api/teams/${tournamentId}`).then(r => r.json()).catch(() => [])
            ]);
            if (tRes && tRes._id) {
                setTournament(tRes);
                if (tRes.biddingState) {
                    setBiddingState(tRes.biddingState);
                } else if (tRes.status === 'live') {
                    setBiddingState('active');
                }

                // Sync all players and my squad
                const playerList = Array.isArray(pRes) ? pRes : [];
                setAllPlayers(playerList);
                const mySquad = playerList.filter((p: any) => p.soldToTeamId === team._id);
                setSquad(mySquad);

                // Sync current bidding player
                let active = null;
                if (tRes.currentBiddingPlayerId) {
                    active = playerList.find((p: any) => p._id === tRes.currentBiddingPlayerId);
                }
                if (!active) {
                    active = playerList.find((p: any) => p.status === 'bidding');
                }
                if (active) {
                    setCurrentPlayer(active);
                    setCurrentBid(active.currentBid || active.basePrice);
                    if (active.currentLeadTeamId) {
                        setLeadTeam(active.currentLeadTeamId);
                    }
                    fetchBidsForPlayer(active._id);
                }
            }
            if (Array.isArray(sRes)) {
                setSlots(sRes);
            }
            if (Array.isArray(teamRes)) {
                const currentTeam = teamRes.find((t: any) => t._id === team._id);
                if (currentTeam) setTeamData(currentTeam);
                setOtherTeams(teamRes.filter((t: any) => t._id !== team._id));
            }
        } catch (err) {
            console.error('Error fetching tournament/slots:', err);
        }
    };

    const showNotice = (msg: string) => {
        setNotice(msg);
        setTimeout(() => setNotice(null), 3500);
    };

    const handlePlaceBid = (increment?: number) => {
        if (biddingState === 'break') {
            toast.info('On Break', 'Auction is currently on a short break. It will resume shortly.');
            return;
        }

        if (biddingState === 'paused') {
            toast.warning('Paused', 'Bidding is currently paused by the auctioneer.');
            return;
        }

        if (!currentPlayer) {
            toast.warning('No Player', 'No player is currently on stage for bidding.');
            return;
        }

        if ((tournament?.status === 'upcoming' || biddingState === 'stopped') && !currentPlayer) {
            toast.info('Upcoming', 'Auction has not officially started yet!');
            return;
        }

        if (tournament && squad.length >= (tournament.squadSizeLimit || 25)) {
            toast.error('Squad Full', `Max squad limit of ${tournament.squadSizeLimit || 25} players reached.`);
            return;
        }

        const dynamicInc = getBidIncrement(currentBid, tournament?.bidIncrementRules);
        let newBid: number;
        if (!leadTeam) {
            newBid = Number(currentBid || currentPlayer.basePrice || 10);
        } else {
            newBid = Number(currentBid || 0) + Number(increment || dynamicInc);
        }

        const remainingPurseLakhs = Math.max(0, ((Number(teamData.budget) || 0) - (Number(teamData.spent) || 0)) * 100);

        if (newBid > remainingPurseLakhs) {
            toast.error('Insufficient Budget', `Remaining purse is ₹${((Number(teamData.budget) || 0) - (Number(teamData.spent) || 0)).toFixed(2)} ${largeUnit} (₹${remainingPurseLakhs.toFixed(0)} ${smallUnit}).`);
            return;
        }

        const now = Date.now();
        if (now - lastBidTime.current < 500) return;
        lastBidTime.current = now;

        socket.emit('place_bid', {
            playerId: currentPlayer._id,
            tournamentId,
            bidAmount: newBid,
            teamId: team._id
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header: Team & Purse Overview */}
            <View style={styles.header}>
                <View style={styles.teamInfo}>
                    {onBackToDashboard && (
                        <TouchableOpacity onPress={onBackToDashboard} style={[styles.iconButton, { marginRight: 8, backgroundColor: '#f1f5f9' }]}>
                            <ArrowLeft size={16} color="#0f172a" />
                        </TouchableOpacity>
                    )}
                    <View style={styles.teamLogoBadge}>
                        <SafeImage
                            uri={teamData.logo}
                            style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                            fallback={<Text style={styles.teamLogoText}>{teamData.shortName || teamData.name.substring(0, 2)}</Text>}
                        />
                    </View>
                    <View>
                        <Text style={styles.teamName}>{teamData.name}</Text>
                        <Text style={styles.teamSub}>Dab Cric Auction • Owner Room</Text>
                    </View>
                </View>

                <View style={styles.headerRight}>
                    <View style={styles.purseBadge}>
                        <Text style={styles.purseLabel}>PURSE LEFT</Text>
                        <Text style={styles.purseAmount}>₹ {remainingPurse} <Text style={styles.purseUnit}>{largeUnit}</Text></Text>
                    </View>
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

            {/* Navigation Tabs */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'auction' && styles.activeTabItem]}
                    onPress={() => setActiveTab('auction')}
                >
                    <Text style={[styles.tabText, activeTab === 'auction' && styles.activeTabText]}>Live Auction</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'squad' && styles.activeTabItem]}
                    onPress={() => setActiveTab('squad')}
                >
                    <Text style={[styles.tabText, activeTab === 'squad' && styles.activeTabText]}>
                        Squad ({squad.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'teams' && styles.activeTabItem]}
                    onPress={() => setActiveTab('teams')}
                >
                    <Text style={[styles.tabText, activeTab === 'teams' && styles.activeTabText]}>
                        Teams ({otherTeams.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'unsold' && styles.activeTabItem]}
                    onPress={() => setActiveTab('unsold')}
                >
                    <Text style={[styles.tabText, activeTab === 'unsold' && styles.activeTabText]}>
                        Unsold ({unsoldPlayers.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {/* In-App Notice Banner */}
            {notice && (
                <View style={styles.noticeBanner}>
                    <CheckCircle2 size={14} color="#16a34a" />
                    <Text style={styles.noticeText}>{notice}</Text>
                </View>
            )}

            {/* Upcoming / Not Started State Notification */}
            {(tournament?.status === 'upcoming' || biddingState === 'stopped') && (
                <View style={styles.upcomingBanner}>
                    <Clock size={14} color="#475569" />
                    <Text style={styles.upcomingText}>AUCTION HAS NOT STARTED YET - PLEASE STAY TUNED</Text>
                </View>
            )}

            {/* Short Break State Notification */}
            {biddingState === 'break' && (
                <View style={styles.breakBanner}>
                    <Coffee size={14} color="#1d4ed8" />
                    <Text style={styles.breakText}>AUCTION IS ON A SHORT BREAK - RESUMING SHORTLY</Text>
                </View>
            )}

            {/* Paused State Notification */}
            {biddingState === 'paused' && (
                <View style={styles.pausedBanner}>
                    <Pause size={14} color="#d97706" />
                    <Text style={styles.pausedText}>BIDDING IS CURRENTLY PAUSED BY AUCTIONEER</Text>
                </View>
            )}

            {/* Final Call 10s Countdown Banner */}
            {countdownTimer && (
                <View style={styles.countdownBanner}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Timer size={16} color="#ffffff" />
                        <Text style={styles.countdownBannerText}>FINAL CALL! HAMMER FALLS IN:</Text>
                    </View>
                    <View style={styles.countdownSecBox}>
                        <Text style={styles.countdownSecText}>{countdownTimer.timeLeft}s</Text>
                    </View>
                </View>
            )}

            {activeTab === 'auction' ? (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {currentPlayer ? (
                        <View style={styles.card}>
                            {/* Player Header & Avatar */}
                            <View style={styles.playerHero}>
                                <View style={styles.avatarContainer}>
                                    <SafeImage
                                        uri={currentPlayer.image}
                                        style={styles.avatar}
                                        fallback={
                                            <View style={styles.avatarFallback}>
                                                <Users size={36} color="#94a3b8" />
                                            </View>
                                        }
                                    />
                                </View>
                                <Text style={styles.playerName}>{currentPlayer.name}</Text>
                                <View style={styles.badgeRow}>
                                    {slots.find(s => s._id === tournament?.activeSlotId) && (
                                        <View style={[styles.categoryBadge, { backgroundColor: '#f3e8ff' }]}>
                                            <Text style={[styles.categoryBadgeText, { color: '#7e22ce' }]}>
                                                Set: {slots.find(s => s._id === tournament?.activeSlotId)?.name}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={styles.categoryBadge}>
                                        <Text style={styles.categoryBadgeText}>{currentPlayer.category}</Text>
                                    </View>
                                    <View style={styles.basePriceBadge}>
                                        <Text style={styles.basePriceText}>Base: ₹{currentPlayer.basePrice} {smallUnit}</Text>
                                    </View>
                                </View>

                                {/* Cricket Stats */}
                                {currentPlayer.stats && (
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 8, padding: 8, backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' }}>
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>M: {currentPlayer.stats.matches || 0}</Text>
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>•</Text>
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>R: {currentPlayer.stats.runs || 0}</Text>
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>•</Text>
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>HS: {(currentPlayer.stats as any).highestScore || 0}</Text>
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>•</Text>
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>W: {currentPlayer.stats.wickets || 0}</Text>
                                    </View>
                                )}
                            </View>

                            {/* Current Highest Bid Section */}
                            <View style={[styles.bidDisplay, isLeading ? styles.bidDisplayLeading : styles.bidDisplayStandard]}>
                                <Text style={styles.bidDisplayLabel}>CURRENT HIGHEST BID</Text>
                                <Text style={[styles.bidAmount, isLeading ? styles.bidAmountLeading : styles.bidAmountStandard]}>
                                    ₹ {currentBid} <Text style={styles.bidUnit}>{smallUnit}</Text>
                                </Text>
                                {leadTeam ? (
                                    <View style={styles.leaderRow}>
                                        <View style={[styles.leaderDot, isLeading && styles.leaderDotActive]} />
                                        <Text style={[styles.leaderText, isLeading && styles.leaderTextActive]}>
                                            {isLeading ? 'You are leading this bid!' : `Leader: ${leadTeam.name || 'Opponent'}`}
                                        </Text>
                                    </View>
                                ) : (
                                    <Text style={styles.awaitingText}>Awaiting opening bid...</Text>
                                )}
                            </View>

                            {/* Quick Bid Action Buttons */}
                            <View style={styles.biddingActions}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <Text style={styles.actionsTitle}>DYNAMIC BID INCREMENT</Text>
                                    <Text style={styles.slabInfoText}>Admin Slab: {formatInc(dynamicInc)}</Text>
                                </View>

                                {/* Main Hammer Bid Button */}
                                <TouchableOpacity
                                    style={[
                                        styles.hammerMainButton,
                                        isLeading && styles.hammerMainButtonLeading,
                                        (biddingState === 'paused' || biddingState === 'break' || ((tournament?.status === 'upcoming' || biddingState === 'stopped') && !currentPlayer)) && styles.hammerMainButtonDisabled
                                    ]}
                                    onPress={() => handlePlaceBid()}
                                    disabled={isLeading || biddingState !== 'active'}
                                    activeOpacity={0.85}
                                >
                                    <View style={styles.hammerIconCircle}>
                                        <Gavel size={22} color={isLeading ? '#15803d' : '#ffffff'} />
                                    </View>
                                    <View style={styles.hammerTextCol}>
                                        <Text style={[styles.hammerSubText, isLeading && styles.hammerSubTextLeading]}>
                                            {isLeading ? 'YOU HOLD WINNING BID' : !leadTeam ? 'OPEN AT BASE PRICE' : 'SMASH HAMMER TO BID'}
                                        </Text>
                                        <Text style={[styles.hammerMainText, isLeading && styles.hammerMainTextLeading]}>
                                            {isLeading ? `Leading at ₹${currentBid} ${smallUnit}` : !leadTeam ? `HAMMER OPENING: ₹${nextBidAmount} ${smallUnit}` : `HAMMER BID: ₹${nextBidAmount} ${smallUnit}`}
                                        </Text>
                                    </View>
                                    {!isLeading && (
                                        <View style={styles.hammerIncCol}>
                                            <Text style={styles.hammerIncLabel}>{!leadTeam ? 'Opening' : 'Slab'}</Text>
                                            <Text style={styles.hammerIncVal}>{!leadTeam ? 'Base' : formatInc(dynamicInc)}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.emptyStage}>
                            <View style={styles.emptyIconCircle}>
                                <Users size={40} color="#94a3b8" />
                            </View>
                            <Text style={styles.emptyTitle}>Stage is Quiet</Text>
                            <Text style={styles.emptySubtitle}>
                                The auctioneer is preparing the next player. The live card will appear automatically.
                            </Text>
                        </View>
                    )}

                    {/* Live Bid Stream Card */}
                    <View style={[styles.card, { marginTop: 12 }]}>
                        <View style={styles.sectionHeaderRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Radio size={16} color="#e11d48" />
                                <Text style={styles.sectionTitle}>Live Bid Activity</Text>
                            </View>
                            <Text style={styles.sectionSub}>
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
                            <View style={{ gap: 8, marginTop: 4 }}>
                                {bidLogs.slice(0, 8).map((b, i) => {
                                    const isMyTeam = b.team?._id === team._id;
                                    return (
                                        <View
                                            key={i}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: 8,
                                                borderRadius: 10,
                                                backgroundColor: isMyTeam ? '#eff6ff' : '#f8fafc',
                                                borderWidth: 1,
                                                borderColor: isMyTeam ? '#bfdbfe' : '#e2e8f0'
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
                                                    <Text style={{ fontSize: 11, fontWeight: '800', color: isMyTeam ? '#1d4ed8' : '#0f172a' }}>
                                                        {b.team?.name || 'Bidder'} {isMyTeam ? '👑 (You)' : ''}
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
                                    );
                                })}
                            </View>
                        )}
                    </View>

                    {/* Competitor Purses Quick Section on Live Tab */}
                    {otherTeams.length > 0 && (
                        <View style={[styles.card, { marginTop: 12 }]}>
                            <View style={styles.sectionHeaderRow}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Wallet size={16} color="#16a34a" />
                                    <Text style={styles.sectionTitle}>Competitor Purses</Text>
                                </View>
                                <Text style={styles.sectionSub}>Tap team to view squad</Text>
                            </View>

                            <View style={styles.competitorList}>
                                {otherTeams.map(t => {
                                    const tPlayers = allPlayers.filter(p => p.soldToTeamId === t._id || p.soldToTeamId === (t as any).id);
                                    return (
                                        <TouchableOpacity
                                            key={t._id}
                                            style={styles.competitorRow}
                                            onPress={() => setViewingTeam(t)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.competitorLeft}>
                                                <View style={styles.competitorLogoBadge}>
                                                    <SafeImage
                                                        uri={t.logo}
                                                        style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                                                        fallback={
                                                            <Text style={styles.competitorLogoText}>
                                                                {t.shortName?.substring(0, 3) || t.name.substring(0, 2)}
                                                            </Text>
                                                        }
                                                    />
                                                </View>
                                                <View>
                                                    <Text style={styles.competitorName}>{t.name}</Text>
                                                    <Text style={styles.competitorSquadCount}>
                                                        {tPlayers.length} {tPlayers.length === 1 ? 'player' : 'players'} • Tap squad
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={styles.competitorRight}>
                                                <View style={styles.competitorPursePill}>
                                                    <Text style={styles.competitorPurseText}>₹{t.budget - (t.spent || 0)} {largeUnit}</Text>
                                                </View>
                                                <ChevronRight size={16} color="#94a3b8" />
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    )}
                </ScrollView>
            ) : activeTab === 'squad' ? (
                /* Squad Tab */
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.card}>
                        <View style={styles.squadHeader}>
                            <Text style={styles.squadTitle}>Acquired Squad ({squad.length})</Text>
                            <Text style={styles.squadSpent}>Total Spent: ₹{teamData.spent} {largeUnit}</Text>
                        </View>

                        {squad.length === 0 ? (
                            <View style={styles.emptySquad}>
                                <Text style={styles.emptySquadText}>No players acquired yet in this auction.</Text>
                            </View>
                        ) : (
                            squad.map((player, idx) => (
                                <View key={player._id || idx} style={styles.squadRow}>
                                    <View style={styles.squadIndex}>
                                        <Text style={styles.squadIndexText}>{idx + 1}</Text>
                                    </View>
                                    <View style={styles.squadInfo}>
                                        <Text style={styles.squadName}>{player.name}</Text>
                                        <Text style={styles.squadCategory}>{player.category}</Text>
                                    </View>
                                    <View style={styles.squadPrice}>
                                        <Text style={styles.squadPriceText}>₹ {player.soldPrice || player.currentBid} {smallUnit}</Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                </ScrollView>
            ) : activeTab === 'teams' ? (
                /* Competitors Tab */
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.card}>
                        <View style={styles.squadHeader}>
                            <Text style={styles.squadTitle}>Competitor Teams ({otherTeams.length})</Text>
                            <Text style={styles.sectionSub}>Tap any team to inspect squad</Text>
                        </View>

                        <View style={styles.competitorList}>
                            {otherTeams.map(t => {
                                const tPlayers = allPlayers.filter(p => p.soldToTeamId === t._id || p.soldToTeamId === (t as any).id);
                                return (
                                    <TouchableOpacity
                                        key={t._id}
                                        style={styles.competitorRow}
                                        onPress={() => setViewingTeam(t)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.competitorLeft}>
                                            <View style={styles.competitorLogoBadge}>
                                                <Text style={styles.competitorLogoText}>
                                                    {t.shortName?.substring(0, 3) || t.name.substring(0, 2)}
                                                </Text>
                                            </View>
                                            <View>
                                                <Text style={styles.competitorName}>{t.name}</Text>
                                                <Text style={styles.competitorSquadCount}>
                                                    {tPlayers.length} acquired • Purse: ₹{t.budget - (t.spent || 0)} {largeUnit}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.competitorRight}>
                                            <View style={styles.competitorPursePill}>
                                                <Text style={styles.competitorPurseText}>View Squad</Text>
                                            </View>
                                            <ChevronRight size={16} color="#94a3b8" />
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                            {otherTeams.length === 0 && (
                                <View style={styles.emptySquad}>
                                    <Text style={styles.emptySquadText}>No competitor teams found.</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </ScrollView>
            ) : (
                /* Unsold Tab */
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.card}>
                        <View style={styles.squadHeader}>
                            <Text style={styles.squadTitle}>Unsold Players Pool ({unsoldPlayers.length})</Text>
                            <Text style={styles.sectionSub}>Eligible for Re-Auction round</Text>
                        </View>

                        {unsoldPlayers.length === 0 ? (
                            <View style={styles.emptySquad}>
                                <Text style={styles.emptySquadText}>No unsold players yet in this auction.</Text>
                            </View>
                        ) : (
                            unsoldPlayers.map((player, idx) => (
                                <View key={player._id || idx} style={styles.squadRow}>
                                    <View style={styles.squadIndex}>
                                        <Text style={styles.squadIndexText}>{idx + 1}</Text>
                                    </View>
                                    <View style={styles.squadInfo}>
                                        <Text style={styles.squadName}>{player.name}</Text>
                                        <Text style={styles.squadCategory}>
                                            {player.category} {player.battingStyle ? `• ${player.battingStyle}` : ''}
                                        </Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={[styles.squadPrice, { color: '#0f172a' }]}>Base: ₹{player.basePrice} {smallUnit}</Text>
                                        <Text style={{ fontSize: 10, color: '#d97706', fontWeight: 'bold' }}>Unsold</Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                </ScrollView>
            )}

            {/* Competitor Team Purchased Squad Modal */}
            <Modal
                visible={!!viewingTeam}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setViewingTeam(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        {viewingTeam && (
                            <>
                                <View style={styles.modalHeader}>
                                    <View style={styles.modalTeamRow}>
                                        <View style={styles.modalTeamLogo}>
                                            <SafeImage
                                                uri={viewingTeam.logo}
                                                style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                                                fallback={
                                                    <Text style={styles.modalTeamLogoText}>
                                                        {viewingTeam.shortName || viewingTeam.name.substring(0, 2)}
                                                    </Text>
                                                }
                                            />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 10 }}>
                                            <Text style={styles.modalTeamName}>{viewingTeam.name}</Text>
                                            <Text style={styles.modalTeamSub}>
                                                Purse: ₹{viewingTeam.budget - (viewingTeam.spent || 0)} {largeUnit} • Spent: ₹{viewingTeam.spent || 0} {largeUnit}
                                            </Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => setViewingTeam(null)}
                                        style={styles.modalCloseBtn}
                                    >
                                        <X size={20} color="#64748b" />
                                    </TouchableOpacity>
                                </View>

                                {(() => {
                                    const teamPlayers = allPlayers.filter(p => p.soldToTeamId === viewingTeam._id || p.soldToTeamId === (viewingTeam as any).id);
                                    return (
                                        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                                            <View style={styles.modalStatsBar}>
                                                <Text style={styles.modalStatsText}>
                                                    Acquired: <Text style={styles.modalStatsBold}>{teamPlayers.length}</Text> / {tournament?.squadSizeLimit || 25}
                                                </Text>
                                                <Text style={styles.modalStatsText}>
                                                    Total Spent: <Text style={styles.modalStatsBold}>₹{teamPlayers.reduce((acc, p) => acc + (Number(p.soldPrice) || 0), 0)} {smallUnit}</Text>
                                                </Text>
                                            </View>

                                            {teamPlayers.length === 0 ? (
                                                <View style={styles.modalEmpty}>
                                                    <Users size={36} color="#94a3b8" />
                                                    <Text style={styles.modalEmptyTitle}>No Players Purchased Yet</Text>
                                                    <Text style={styles.modalEmptySub}>
                                                        {viewingTeam.name} has not won any bids in this auction yet.
                                                    </Text>
                                                </View>
                                            ) : (
                                                teamPlayers.map((p, idx) => (
                                                    <View key={p._id || idx} style={styles.modalPlayerRow}>
                                                        <View style={styles.modalPlayerIndex}>
                                                            <Text style={styles.modalPlayerIndexText}>{idx + 1}</Text>
                                                        </View>
                                                        <View style={styles.modalPlayerInfo}>
                                                            <Text style={styles.modalPlayerName}>{p.name}</Text>
                                                            <Text style={styles.modalPlayerCategory}>
                                                                {p.category} {p.battingStyle ? `• ${p.battingStyle}` : ''}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.modalPlayerPrice}>
                                                            <Text style={styles.modalPlayerPriceText}>₹{p.soldPrice || p.currentBid} {smallUnit}</Text>
                                                            <Text style={styles.modalPlayerBasePrice}>Base: ₹{p.basePrice}{smallUnit}</Text>
                                                        </View>
                                                    </View>
                                                ))
                                            )}
                                        </ScrollView>
                                    );
                                })()}

                                <View style={styles.modalFooter}>
                                    <TouchableOpacity
                                        style={styles.modalDoneBtn}
                                        onPress={() => setViewingTeam(null)}
                                    >
                                        <Text style={styles.modalDoneBtnText}>Close</Text>
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
                    <View style={[styles.modalCard, { maxHeight: 420, alignItems: 'center', padding: 24 }]}>
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
                                                ₹{formatAmount(announcementModal.price)}
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        elevation: 2,
    },
    teamInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    teamLogoBadge: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: '#2563eb',
        justifyContent: 'center',
        alignItems: 'center',
    },
    teamLogoText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '900',
    },
    teamName: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0f172a',
    },
    teamSub: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '600',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    purseBadge: {
        backgroundColor: '#f0fdf4',
        borderWidth: 1,
        borderColor: '#bbf7d0',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignItems: 'flex-end',
    },
    purseLabel: {
        fontSize: 8,
        fontWeight: '800',
        color: '#16a34a',
        letterSpacing: 0.5,
    },
    purseAmount: {
        fontSize: 13,
        fontWeight: '900',
        color: '#15803d',
    },
    purseUnit: {
        fontSize: 10,
        color: '#16a34a',
        fontWeight: '600',
    },
    iconButton: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        paddingHorizontal: 16,
    },
    tabItem: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTabItem: {
        borderBottomColor: '#2563eb',
    },
    tabText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748b',
    },
    activeTabText: {
        color: '#2563eb',
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
    pausedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#fef3c7',
        borderBottomWidth: 1,
        borderBottomColor: '#fde68a',
        paddingVertical: 6,
    },
    pausedText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#b45309',
        letterSpacing: 0.5,
    },
    upcomingBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#f1f5f9',
        borderBottomWidth: 1,
        borderBottomColor: '#cbd5e1',
        paddingVertical: 8,
    },
    upcomingText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#475569',
        letterSpacing: 0.5,
    },
    breakBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#eff6ff',
        borderBottomWidth: 1,
        borderBottomColor: '#bfdbfe',
        paddingVertical: 8,
    },
    breakText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#1d4ed8',
        letterSpacing: 0.5,
    },
    countdownBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#dc2626',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    countdownBannerText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#ffffff',
        letterSpacing: 0.5,
    },
    countdownSecBox: {
        backgroundColor: '#ffffff',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    countdownSecText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#dc2626',
    },
    slabInfoText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#2563eb',
    },
    scrollContent: {
        padding: 16,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 20,
        shadowColor: '#64748b',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    playerHero: {
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarContainer: {
        width: 110,
        height: 110,
        borderRadius: 22,
        backgroundColor: '#f1f5f9',
        borderWidth: 2,
        borderColor: '#e2e8f0',
        overflow: 'hidden',
        marginBottom: 12,
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    avatarFallback: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playerName: {
        fontSize: 22,
        fontWeight: '900',
        color: '#0f172a',
        marginBottom: 6,
        textAlign: 'center',
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 6,
    },
    categoryBadge: {
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    categoryBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#475569',
    },
    basePriceBadge: {
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#bfdbfe',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    basePriceText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#1d4ed8',
    },
    bidDisplay: {
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
    },
    bidDisplayStandard: {
        backgroundColor: '#f8fafc',
        borderColor: '#e2e8f0',
    },
    bidDisplayLeading: {
        backgroundColor: '#f0fdf4',
        borderColor: '#86efac',
    },
    bidDisplayLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#64748b',
        letterSpacing: 1,
        marginBottom: 4,
    },
    bidAmount: {
        fontSize: 42,
        fontWeight: '900',
    },
    bidAmountStandard: {
        color: '#0f172a',
    },
    bidAmountLeading: {
        color: '#15803d',
    },
    bidUnit: {
        fontSize: 20,
        fontWeight: '700',
        color: '#64748b',
    },
    leaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 6,
    },
    leaderDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#94a3b8',
    },
    leaderDotActive: {
        backgroundColor: '#16a34a',
    },
    leaderText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
    },
    leaderTextActive: {
        color: '#15803d',
    },
    awaitingText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94a3b8',
        marginTop: 4,
    },
    biddingActions: {
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        paddingTop: 16,
    },
    actionsTitle: {
        fontSize: 10,
        fontWeight: '800',
        color: '#64748b',
        letterSpacing: 0.8,
        marginBottom: 10,
        textAlign: 'center',
    },
    hammerMainButton: {
        backgroundColor: '#2563eb',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        elevation: 3,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    hammerMainButtonLeading: {
        backgroundColor: '#f0fdf4',
        borderWidth: 1.5,
        borderColor: '#86efac',
        shadowColor: '#16a34a',
    },
    hammerMainButtonDisabled: {
        backgroundColor: '#e2e8f0',
        elevation: 0,
        shadowOpacity: 0,
    },
    hammerIconCircle: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    hammerTextCol: {
        flex: 1,
        marginLeft: 12,
    },
    hammerSubText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#bfdbfe',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    hammerSubTextLeading: {
        color: '#16a34a',
    },
    hammerMainText: {
        fontSize: 16,
        fontWeight: '900',
        color: '#ffffff',
    },
    hammerMainTextLeading: {
        color: '#15803d',
    },
    hammerIncCol: {
        alignItems: 'flex-end',
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(255,255,255,0.25)',
        paddingLeft: 10,
    },
    hammerIncLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: '#bfdbfe',
        textTransform: 'uppercase',
    },
    hammerIncVal: {
        fontSize: 13,
        fontWeight: '900',
        color: '#fef08a',
    },
    bidButtonsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    bidButton: {
        flex: 1,
        borderRadius: 14,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    bidButtonSecondary: {
        backgroundColor: '#f8fafc',
        borderColor: '#cbd5e1',
    },
    bidButtonPrimary: {
        backgroundColor: '#2563eb',
        borderColor: '#1d4ed8',
    },
    bidButtonAccent: {
        backgroundColor: '#16a34a',
        borderColor: '#15803d',
    },
    bidButtonSmall: {
        fontSize: 11,
        fontWeight: '700',
        color: '#475569',
    },
    bidButtonCalc: {
        fontSize: 13,
        fontWeight: '900',
        color: '#0f172a',
    },
    bidButtonSmallPrimary: {
        fontSize: 11,
        fontWeight: '700',
        color: '#bfdbfe',
    },
    bidButtonCalcPrimary: {
        fontSize: 13,
        fontWeight: '900',
        color: '#ffffff',
    },
    bidButtonSmallAccent: {
        fontSize: 11,
        fontWeight: '700',
        color: '#bbf7d0',
    },
    bidButtonCalcAccent: {
        fontSize: 13,
        fontWeight: '900',
        color: '#ffffff',
    },
    emptyStage: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyIconCircle: {
        width: 72,
        height: 72,
        borderRadius: 24,
        backgroundColor: '#e2e8f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#334155',
        marginBottom: 6,
    },
    emptySubtitle: {
        fontSize: 12,
        color: '#64748b',
        textAlign: 'center',
        maxWidth: 260,
        lineHeight: 18,
    },
    squadHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    squadTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0f172a',
    },
    squadSpent: {
        fontSize: 12,
        fontWeight: '700',
        color: '#16a34a',
    },
    emptySquad: {
        paddingVertical: 32,
        alignItems: 'center',
    },
    emptySquadText: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '500',
    },
    squadRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    squadIndex: {
        width: 24,
        alignItems: 'center',
    },
    squadIndexText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94a3b8',
    },
    squadInfo: {
        flex: 1,
        paddingHorizontal: 10,
    },
    squadName: {
        fontSize: 13,
        fontWeight: '800',
        color: '#0f172a',
    },
    squadCategory: {
        fontSize: 11,
        color: '#64748b',
    },
    squadPrice: {
        paddingLeft: 10,
    },
    squadPriceText: {
        fontSize: 13,
        fontWeight: '900',
        color: '#15803d',
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0f172a',
    },
    sectionSub: {
        fontSize: 10,
        fontWeight: '600',
        color: '#94a3b8',
    },
    competitorList: {
        gap: 8,
    },
    competitorRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 14,
        padding: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    competitorLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    competitorLogoBadge: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    competitorLogoText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#334155',
        textTransform: 'uppercase',
    },
    competitorName: {
        fontSize: 12,
        fontWeight: '800',
        color: '#0f172a',
    },
    competitorSquadCount: {
        fontSize: 10,
        color: '#64748b',
        fontWeight: '600',
        marginTop: 2,
    },
    competitorRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    competitorPursePill: {
        backgroundColor: '#f0fdf4',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#bbf7d0',
    },
    competitorPurseText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#15803d',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
        paddingBottom: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        backgroundColor: '#f8fafc',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    modalTeamRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    modalTeamLogo: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#2563eb',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalTeamLogoText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '900',
    },
    modalTeamName: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0f172a',
    },
    modalTeamSub: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '600',
        marginTop: 2,
    },
    modalCloseBtn: {
        padding: 6,
        borderRadius: 10,
        backgroundColor: '#f1f5f9',
    },
    modalScroll: {
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    modalStatsBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 12,
    },
    modalStatsText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748b',
    },
    modalStatsBold: {
        fontWeight: '900',
        color: '#0f172a',
    },
    modalEmpty: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    modalEmptyTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#334155',
        marginTop: 8,
    },
    modalEmptySub: {
        fontSize: 11,
        color: '#94a3b8',
        marginTop: 4,
        textAlign: 'center',
    },
    modalPlayerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    modalPlayerIndex: {
        width: 24,
        alignItems: 'center',
    },
    modalPlayerIndexText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94a3b8',
    },
    modalPlayerInfo: {
        flex: 1,
        paddingHorizontal: 10,
    },
    modalPlayerName: {
        fontSize: 13,
        fontWeight: '800',
        color: '#0f172a',
    },
    modalPlayerCategory: {
        fontSize: 11,
        color: '#64748b',
        marginTop: 1,
    },
    modalPlayerPrice: {
        alignItems: 'flex-end',
    },
    modalPlayerPriceText: {
        fontSize: 13,
        fontWeight: '900',
        color: '#15803d',
    },
    modalPlayerBasePrice: {
        fontSize: 9,
        color: '#94a3b8',
    },
    modalFooter: {
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    modalDoneBtn: {
        backgroundColor: '#0f172a',
        borderRadius: 14,
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalDoneBtnText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '800',
    },
});

export default LiveBiddingRoom;
