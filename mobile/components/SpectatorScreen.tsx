import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    StatusBar,
    TouchableOpacity,
    Image,
    Platform,
    Modal,
    TextInput
} from 'react-native';
import {
    Trophy,
    Users,
    LogIn,
    Radio,
    Clock,
    Coffee,
    Timer,
    Wallet,
    ChevronRight,
    X,
    AlertCircle,
    Sparkles,
    Crown,
    Search,
    User,
    Layers,
    Pause
} from 'lucide-react-native';
import socket from '../lib/socket';
import { apiFetch } from '../lib/api';
import SafeImage from './SafeImage';
import { getBudgetUnits } from '../lib/currency';

export interface SpectatorScreenProps {
    tournamentId: string;
    tournamentName?: string;
    onGoToLogin: () => void;
}

export const SpectatorScreen: React.FC<SpectatorScreenProps> = ({
    tournamentId,
    tournamentName = 'Live Tournament Auction',
    onGoToLogin
}) => {
    const [currentPlayer, setCurrentPlayer] = useState<any>(null);
    const [currentBid, setCurrentBid] = useState<number>(0);
    const [leadTeam, setLeadTeam] = useState<any>(null);
    const [biddingState, setBiddingState] = useState<'active' | 'paused' | 'break' | 'stopped'>('active');
    const [tournament, setTournament] = useState<any>(null);
    const { largeUnit, smallUnit, formatAmount, formatPrice, formatPriceParts, formatBid, isKtoL } = getBudgetUnits(tournament);
    const [teams, setTeams] = useState<any[]>([]);
    const [allPlayers, setAllPlayers] = useState<any[]>([]);
    const [slots, setSlots] = useState<any[]>([]);
    const [countdownTimer, setCountdownTimer] = useState<{ timeLeft: number } | null>(null);
    const [bidHistory, setBidHistory] = useState<any[]>([]);
    const [isConnected, setIsConnected] = useState<boolean>(false);

    const [activeTab, setActiveTab] = useState<'live' | 'teams' | 'slots' | 'sold' | 'unsold'>('live');
    const [selectedSlotMobile, setSelectedSlotMobile] = useState<string>('all');
    const [slotMobileSearch, setSlotMobileSearch] = useState<string>('');
    const [viewingTeam, setViewingTeam] = useState<any | null>(null);
    const [announcementModal, setAnnouncementModal] = useState<{ type: 'sold' | 'unsold'; player: any; team?: any; price?: number } | null>(null);

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
                    setBidHistory(data.map(b => ({
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
            setIsConnected(true);
            fetchTournament();
        };
        socket.on('connect', handleConnect);
        if (socket.connected) {
            handleConnect();
        }

        socket.on('new_player', (player: any) => {
            setCurrentPlayer(player);
            setCurrentBid(player.basePrice || 20);
            setLeadTeam(null);
            setBidHistory([]);
            if (player?._id) {
                fetchBidsForPlayer(player._id);
            }
        });

        socket.on('bid_update', (data: { amount: number; team: any; timestamp?: string }) => {
            setCurrentBid(data.amount);
            setLeadTeam(data.team);
            setBidHistory(prev => [
                { team: data.team, amount: data.amount, time: data.timestamp ? new Date(data.timestamp) : new Date() },
                ...prev
            ]);
        });

        socket.on('bidding_state_changed', ({ state }: { state: 'active' | 'paused' | 'break' | 'stopped' }) => {
            setBiddingState(state);
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

        socket.on('timer_cancelled', () => {
            setCountdownTimer(null);
        });

        socket.on('timer_completed', () => {
            setCountdownTimer(null);
        });

        socket.on('player_sold', (data: { player: any; team: any }) => {
            setCountdownTimer(null);
            if (data?.team) {
                setTeams(prev => prev.map(t => (t._id === data.team._id || (t as any).id === data.team._id) ? { ...t, ...data.team } : t));
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
                    price: data.player.soldPrice || data.player.sold_price || data.player.currentBid || 0
                });
            }
            fetchTournament();
            setCurrentPlayer(null);
            setLeadTeam(null);
        });

        socket.on('player_unsold', (data?: { player?: any }) => {
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
        });

        socket.on('team_updated', (data: { team: any }) => {
            if (data?.team) {
                setTeams(prev => prev.map(t => (t._id === data.team._id || (t as any).id === data.team._id) ? { ...t, ...data.team } : t));
            }
        });

        socket.on('bid_undone', (data: { currentBid: number; leadTeam: any; bids?: any[] }) => {
            setCurrentBid(data.currentBid);
            setLeadTeam(data.leadTeam);
            setCountdownTimer(null);
            if (Array.isArray(data.bids)) {
                setBidHistory(data.bids.map((b: any) => ({
                    team: { name: b.teamName, _id: b.teamId, logo: b.teamLogo, shortName: b.teamShortName },
                    amount: b.bidAmount,
                    time: new Date(b.createdAt),
                    playerId: b.playerId
                })));
            } else {
                setBidHistory(prev => prev.slice(1));
            }
        });

        socket.on('unsold_reopened_to_slot', (data: any) => {
            if (data?.players) {
                setAllPlayers(prev => prev.map(p => {
                    const match = data.players.find((rp: any) => rp._id === p._id || rp.id === p._id);
                    return match ? { ...p, ...match } : p;
                }));
            }
        });

        socket.on('auction_ended', () => {
            setTournament((prev: any) => ({ ...prev, status: 'completed' }));
            setBiddingState('stopped');
            setCountdownTimer(null);
        });

        socket.on('player_released_to_pending', (data: any) => {
            fetchTournament();
            if (data?.player) {
                setAllPlayers(prev => prev.map(p => (p._id === data.player._id || p.id === data.player._id) ? { ...p, ...data.player } : p));
            }
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
            socket.off('team_updated');
            socket.off('bid_undone');
            socket.off('unsold_reopened_to_slot');
            socket.off('auction_ended');
            socket.off('player_released_to_pending');
            socket.off('connect', handleConnect);
            socket.disconnect();
        };
    }, [tournamentId]);

    // CRITICAL: Always load data immediately when tournamentId changes,
    // don't wait for socket.connect()!
    useEffect(() => {
        if (tournamentId) {
            fetchTournament();
        }
    }, [tournamentId]);

    const fetchTournament = async () => {
        try {
            const [tRes, sRes, teamRes, pRes] = await Promise.all([
                apiFetch(`/api/tournaments/${tournamentId}`).then(r => r.json()).catch(() => null),
                apiFetch(`/api/tournaments/${tournamentId}/slots`).then(r => r.json()).catch(() => []),
                apiFetch(`/api/teams/${tournamentId}`).then(r => r.json()).catch(() => []),
                apiFetch(`/api/players/${tournamentId}`).then(r => r.json()).catch(() => [])
            ]);
            const tourneyObj = tRes?.tournament || tRes;
            if (tourneyObj && (tourneyObj._id || tourneyObj.id)) {
                setTournament(tourneyObj);
            }
            if (Array.isArray(sRes)) {
                setSlots(sRes);
            }
            if (Array.isArray(teamRes)) {
                setTeams(teamRes);
            }
            if (Array.isArray(pRes)) {
                setAllPlayers(pRes);
                const active = pRes.find((p: any) => p._id === tourneyObj?.currentBiddingPlayerId || p.status === 'bidding');
                if (active) {
                    setCurrentPlayer(active);
                    setCurrentBid(active.currentBid || active.basePrice);
                    if (active.currentLeadTeamId) setLeadTeam(active.currentLeadTeamId);
                    fetchBidsForPlayer(active._id);
                }
            }
        } catch (err) {
            console.error('Error fetching tournament data:', err);
        }
    };

    const soldPlayers = allPlayers.filter(p => p.status === 'sold');
    const unsoldPlayers = allPlayers.filter(p => p.status === 'unsold');

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <Image
                        source={require('../assets/logo.png')}
                        style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' }}
                        resizeMode="contain"
                    />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle} numberOfLines={1}>{tournamentName}</Text>
                        <View style={styles.liveTagRow}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveTagText}>DAB CRIC AUCTION LIVE</Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity style={styles.loginPill} onPress={onGoToLogin}>
                    <LogIn size={14} color="#ffffff" />
                    <Text style={styles.loginPillText}>Login</Text>
                </TouchableOpacity>
            </View>

            {/* Navigation Tabs */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'live' && styles.activeTabItem]}
                    onPress={() => setActiveTab('live')}
                >
                    <Text style={[styles.tabText, activeTab === 'live' && styles.activeTabText]}>
                        Live
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'teams' && styles.activeTabItem]}
                    onPress={() => setActiveTab('teams')}
                >
                    <Text style={[styles.tabText, activeTab === 'teams' && styles.activeTabText]}>
                        Teams ({teams.length})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'slots' && styles.activeTabItem]}
                    onPress={() => setActiveTab('slots')}
                >
                    <Text style={[styles.tabText, activeTab === 'slots' && styles.activeTabText]}>
                        Slots ({slots.length})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'sold' && styles.activeTabItem]}
                    onPress={() => setActiveTab('sold')}
                >
                    <Text style={[styles.tabText, activeTab === 'sold' && styles.activeTabText]}>
                        Sold ({soldPlayers.length})
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

            {/* Content Tabs */}
            {activeTab === 'live' ? (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* 10s Timer Call */}
                    {countdownTimer && (
                        <View style={styles.timerBanner}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Timer size={16} color="#ffffff" />
                                <Text style={styles.timerBannerText}>FINAL CALL! HAMMER FALLS IN:</Text>
                            </View>
                            <View style={styles.timerBox}>
                                <Text style={styles.timerText}>{countdownTimer.timeLeft}s</Text>
                            </View>
                        </View>
                    )}

                    {/* Main Stage Card */}
                    {tournament?.status === 'completed' ? (
                        <View style={[styles.card, { alignItems: 'center', paddingVertical: 28 }]}>
                            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#f3e8ff', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                <Trophy size={32} color="#7e22ce" />
                            </View>
                            <View style={{ backgroundColor: '#f3e8ff', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 8 }}>
                                <Text style={{ fontSize: 10, fontWeight: '900', color: '#7e22ce', textTransform: 'uppercase' }}>🏆 AUCTION OFFICIALLY COMPLETED</Text>
                            </View>
                            <Text style={{ fontSize: 16, fontWeight: '900', color: '#1e1b4b', textAlign: 'center', marginBottom: 4 }}>
                                {tournament?.name || 'Tournament'} Auction Concluded!
                            </Text>
                            <Text style={{ fontSize: 12, color: '#64748b', textAlign: 'center', paddingHorizontal: 16, marginBottom: 16, lineHeight: 18 }}>
                                All bidding rounds have finished. Final squad rosters are locked!
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                                <View style={{ flex: 1, backgroundColor: '#f8fafc', padding: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' }}>
                                    <Text style={{ fontSize: 9, fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Sold</Text>
                                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#16a34a', marginTop: 2 }}>
                                        {allPlayers.filter(p => p.status === 'sold').length}
                                    </Text>
                                </View>
                                <View style={{ flex: 1, backgroundColor: '#f8fafc', padding: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' }}>
                                    <Text style={{ fontSize: 9, fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Unsold</Text>
                                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#dc2626', marginTop: 2 }}>
                                        {allPlayers.filter(p => p.status === 'unsold').length}
                                    </Text>
                                </View>
                                <View style={{ flex: 1, backgroundColor: '#f8fafc', padding: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' }}>
                                    <Text style={{ fontSize: 9, fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Teams</Text>
                                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#2563eb', marginTop: 2 }}>
                                        {teams.length}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ) : (tournament?.status === 'upcoming' || (biddingState === 'stopped' && !currentPlayer)) ? (
                        <View style={[styles.card, { alignItems: 'center', paddingVertical: 28 }]}>
                            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                <Clock size={32} color="#2563eb" />
                            </View>
                            <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, marginBottom: 8 }}>
                                <Text style={{ fontSize: 10, fontWeight: '900', color: '#92400e', textTransform: 'uppercase' }}>Standby Screen</Text>
                            </View>
                            <Text style={{ fontSize: 16, fontWeight: '900', color: '#0f172a', textAlign: 'center', marginBottom: 4 }}>
                                AUCTION HAS NOT STARTED YET
                            </Text>
                            <Text style={{ fontSize: 12, color: '#64748b', textAlign: 'center', paddingHorizontal: 16, marginBottom: 16, lineHeight: 18 }}>
                                The live auction for {tournament?.name || 'this tournament'} will begin shortly. Teams and officials are assembling. Please stay tuned!
                            </Text>
                        </View>
                    ) : (biddingState === 'break') ? (
                        <View style={[styles.card, { alignItems: 'center', paddingVertical: 28 }]}>
                            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                <Coffee size={32} color="#1d4ed8" />
                            </View>
                            <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, marginBottom: 8 }}>
                                <Text style={{ fontSize: 10, fontWeight: '900', color: '#92400e', textTransform: 'uppercase' }}>Break in Progress</Text>
                            </View>
                            <Text style={{ fontSize: 16, fontWeight: '900', color: '#0f172a', textAlign: 'center', marginBottom: 4 }}>
                                AUCTION IS ON A SHORT BREAK
                            </Text>
                            <Text style={{ fontSize: 12, color: '#64748b', textAlign: 'center', paddingHorizontal: 16, marginBottom: 16, lineHeight: 18 }}>
                                Please wait for a while. The auction will resume shortly after the break!
                            </Text>
                        </View>
                    ) : currentPlayer ? (
                        <View style={styles.card}>
                            {/* In-Card Paused Notification */}
                            {biddingState === 'paused' && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fde68a', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, marginBottom: 12 }}>
                                    <Pause size={14} color="#d97706" />
                                    <Text style={{ fontSize: 11, fontWeight: '900', color: '#92400e' }}>AUCTION BIDDING IS CURRENTLY PAUSED BY AUCTIONEER</Text>
                                </View>
                            )}

                            <View style={styles.playerSection}>
                                <View style={styles.avatar}>
                                    <SafeImage
                                        uri={currentPlayer.image}
                                        style={styles.avatarImg}
                                        previewable={true}
                                        previewTitle={currentPlayer.name}
                                        fallback={<Users size={36} color="#94a3b8" />}
                                    />
                                </View>

                                <Text style={styles.playerName}>{currentPlayer.name}</Text>
                                <View style={styles.categoryRow}>
                                    {slots.find(s => s._id === tournament?.activeSlotId) && (
                                        <View style={[styles.catBadge, { backgroundColor: '#f3e8ff' }]}>
                                            <Text style={[styles.catBadgeTxt, { color: '#7e22ce' }]}>
                                                Set: {slots.find(s => s._id === tournament?.activeSlotId)?.name}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={styles.catBadge}>
                                        <Text style={styles.catBadgeTxt}>{currentPlayer.category}</Text>
                                    </View>
                                    <View style={styles.baseBadge}>
                                        <Text style={styles.baseBadgeTxt}>Base: {formatPrice(currentPlayer.basePrice)}</Text>
                                    </View>
                                </View>

                                {/* Career Stats */}
                                {currentPlayer.stats && (
                                    <View style={styles.statsBar}>
                                        <Text style={styles.statItem}>M: {currentPlayer.stats.matches || 0}</Text>
                                        <Text style={styles.statDot}>•</Text>
                                        <Text style={styles.statItem}>R: {currentPlayer.stats.runs || 0}</Text>
                                        <Text style={styles.statDot}>•</Text>
                                        <Text style={styles.statItem}>HS: {currentPlayer.stats.highestScore || 0}</Text>
                                        <Text style={styles.statDot}>•</Text>
                                        <Text style={styles.statItem}>W: {currentPlayer.stats.wickets || 0}</Text>
                                    </View>
                                )}
                            </View>

                            {/* Bid Highlight */}
                            <View style={styles.bidHighlight}>
                                <Text style={styles.bidHighlightLabel}>CURRENT HIGHEST BID</Text>
                                {(() => {
                                    const { amount, unit } = formatPriceParts(currentBid);
                                    return (
                                        <Text style={styles.bidHighlightAmount}>₹ {amount} <Text style={styles.bidHighlightUnit}>{unit}</Text></Text>
                                    );
                                })()}
                                {leadTeam ? (
                                    <Text style={styles.leaderTxt}>
                                        Leading: <Text style={styles.leaderName}>{leadTeam.name}</Text>
                                    </Text>
                                ) : (
                                    <Text style={styles.waitingTxt}>Awaiting opening bid</Text>
                                )}
                            </View>
                        </View>
                    ) : (
                        <View style={styles.emptyCard}>
                            <Trophy size={36} color="#94a3b8" />
                            <Text style={styles.emptyTitle}>Next Player Coming Up</Text>
                            <Text style={styles.emptySub}>The auctioneer is bringing the next player to the stage.</Text>
                        </View>
                    )}

                    {/* Live Bid Stream */}
                    <View style={styles.streamCard}>
                        <Text style={styles.streamTitle}>Live Bid Stream</Text>
                        {bidHistory.length === 0 ? (
                            <Text style={styles.emptyStreamText}>No bids placed on this player yet.</Text>
                        ) : (
                            bidHistory.map((b, i) => (
                                <View key={i} style={styles.streamRow}>
                                    <View style={styles.streamTeamBadge}>
                                        <SafeImage
                                            uri={b.team?.logo}
                                            style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                                            fallback={<Text style={styles.streamTeamBadgeTxt}>{b.team?.shortName || b.team?.name?.substring(0, 2) || 'TM'}</Text>}
                                            previewable={true}
                                            previewTitle={b.team?.name || 'Team'}
                                        />
                                    </View>
                                    <View style={styles.streamInfo}>
                                        <Text style={styles.streamTeamName}>{b.team?.name || 'Competitor'}</Text>
                                        <Text style={styles.streamTime}>{b.time?.toLocaleTimeString()}</Text>
                                    </View>
                                    <Text style={styles.streamAmount}>{formatPrice(b.amount)}</Text>
                                </View>
                            ))
                        )}
                    </View>
                </ScrollView>
            ) : activeTab === 'teams' ? (
                /* Teams & Purses Tab */
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Connected Teams & Purses</Text>
                        <Text style={styles.sectionSubtitle}>Tap a team to inspect their acquired players</Text>

                        <View style={{ marginTop: 12, gap: 10 }}>
                            {teams.map(t => {
                                const teamSquad = allPlayers.filter(p => p.soldToTeamId === t._id || p.soldToTeamId === (t as any).id);
                                const hasCap = (t as any).isOwnerCaptain || (t as any).captainName;
                                const squadCount = teamSquad.length + (hasCap ? 1 : 0);
                                const remaining = ((Number(t.budget) || 0) - (Number(t.spent) || 0)).toFixed(2);

                                return (
                                    <TouchableOpacity
                                        key={t._id}
                                        style={styles.teamCard}
                                        onPress={() => setViewingTeam(t)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.teamCardLeft}>
                                            <View style={styles.teamCardLogo}>
                                                <SafeImage
                                                    uri={t.logo}
                                                    style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                                                    fallback={<Text style={styles.teamCardLogoTxt}>{t.shortName || t.name.substring(0, 2)}</Text>}
                                                    previewable={true}
                                                    previewTitle={t.name}
                                                />
                                            </View>
                                            <View>
                                                <Text style={styles.teamCardName}>{t.name}</Text>
                                                <Text style={styles.teamCardSquad}>
                                                    {squadCount} {squadCount === 1 ? 'player' : 'players'} • Tap for squad
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <View style={styles.pursePill}>
                                                <Text style={styles.pursePillTxt}>₹{remaining} {largeUnit}</Text>
                                            </View>
                                            <ChevronRight size={16} color="#94a3b8" />
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </ScrollView>
            ) : activeTab === 'slots' ? (
                /* Slots Tab */
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.card}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <View>
                                <Text style={styles.sectionTitle}>Slots / Sets Wise Players</Text>
                                <Text style={styles.sectionSubtitle}>
                                    Upcoming auction slots and players list
                                </Text>
                            </View>
                            <View style={{ backgroundColor: '#f3e8ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: '#7e22ce' }}>
                                    {slots.length} Slots
                                </Text>
                            </View>
                        </View>

                        {/* Search in Slots */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 12 }}>
                            <Search size={14} color="#94a3b8" />
                            <TextInput
                                placeholder="Search players in slots..."
                                placeholderTextColor="#94a3b8"
                                value={slotMobileSearch}
                                onChangeText={setSlotMobileSearch}
                                style={{ flex: 1, fontSize: 12, marginLeft: 6, color: '#0f172a', padding: 0 }}
                            />
                        </View>

                        {/* Horizontal Slot Chips */}
                        {slots.length > 0 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                                <TouchableOpacity
                                    onPress={() => setSelectedSlotMobile('all')}
                                    style={[{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f1f5f9', marginRight: 6 }, selectedSlotMobile === 'all' && { backgroundColor: '#7e22ce' }]}
                                >
                                    <Text style={[{ fontSize: 11, fontWeight: '800', color: '#475569' }, selectedSlotMobile === 'all' && { color: '#ffffff' }]}>
                                        All Slots ({slots.length})
                                    </Text>
                                </TouchableOpacity>
                                {slots.map(s => {
                                    const isActive = tournament?.activeSlotId === s._id;
                                    const isSel = selectedSlotMobile === s._id;
                                    return (
                                        <TouchableOpacity
                                            key={s._id}
                                            onPress={() => setSelectedSlotMobile(s._id)}
                                            style={[{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f1f5f9', marginRight: 6 }, isSel && { backgroundColor: '#7e22ce' }]}
                                        >
                                            <Text style={[{ fontSize: 11, fontWeight: '800', color: '#475569' }, isSel && { color: '#ffffff' }]}>
                                                {isActive ? '🔥 ' : ''}{s.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        )}

                        {/* Slot Cards List */}
                        {(() => {
                            const filtered = selectedSlotMobile === 'all' ? slots : slots.filter(s => s._id === selectedSlotMobile);
                            const q = slotMobileSearch.trim().toLowerCase();

                            if (slots.length === 0) {
                                return (
                                    <View style={{ padding: 20, alignItems: 'center' }}>
                                        <Text style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>No custom slots configured for this tournament.</Text>
                                    </View>
                                );
                            }

                            return filtered.map(slot => {
                                const isUnsoldSlot = slot.isDefaultUnsold || slot.slotType === 'unsold';
                                const isActive = tournament?.activeSlotId === slot._id;
                                let sPlayers = allPlayers.filter(p =>
                                    p.slotId === slot._id ||
                                    (p as any).originalSlotId === slot._id ||
                                    (isUnsoldSlot && (p.slotId === slot._id || p.status === 'unsold'))
                                );
                                if (q) {
                                    sPlayers = sPlayers.filter(p => p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q));
                                }

                                const sSold = sPlayers.filter(p => p.status === 'sold');
                                const sPending = sPlayers.filter(p => p.status === 'pending' || (isUnsoldSlot && p.status === 'unsold'));

                                return (
                                    <View key={slot._id} style={{ marginBottom: 16, borderWidth: 1, borderColor: isActive ? '#c084fc' : '#e2e8f0', borderRadius: 14, overflow: 'hidden', backgroundColor: '#ffffff' }}>
                                        {/* Slot Header */}
                                        <View style={{ padding: 10, backgroundColor: isActive ? '#f3e8ff' : '#f8fafc', borderBottomWidth: 1, borderColor: isActive ? '#d8b4fe' : '#e2e8f0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                                                <View style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: isActive ? '#7e22ce' : '#cbd5e1', justifyContent: 'center', alignItems: 'center', marginRight: 8 }}>
                                                    <Text style={{ fontSize: 11, fontWeight: '900', color: isActive ? '#ffffff' : '#334155' }}>
                                                        {isUnsoldSlot ? '🔄' : (slot.order || slot.name?.substring(0, 2))}
                                                    </Text>
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }} numberOfLines={1}>{slot.name}</Text>
                                                        {isActive && (
                                                            <View style={{ backgroundColor: '#7e22ce', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                                                                <Text style={{ fontSize: 8, fontWeight: '900', color: '#ffffff' }}>ACTIVE</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                    <Text style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>
                                                        Base: ₹{slot.basePrice || 'Player Base'} • {sPlayers.length} total • {sPending.length} upcoming
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>

                                        {/* Slot Players */}
                                        {sPlayers.length === 0 ? (
                                            <View style={{ padding: 14, alignItems: 'center' }}>
                                                <Text style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>No players found in this slot.</Text>
                                            </View>
                                        ) : (
                                            sPlayers.map((player, pIdx) => {
                                                const isCur = currentPlayer?._id === player._id;
                                                const buyer = teams.find(t => t._id === player.soldToTeamId || (t as any).id === player.soldToTeamId);

                                                return (
                                                    <View key={player._id || pIdx} style={{ flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderColor: '#f1f5f9', backgroundColor: isCur ? '#faf5ff' : '#ffffff' }}>
                                                        <Text style={{ width: 20, fontSize: 11, color: '#94a3b8', fontWeight: 'bold' }}>{pIdx + 1}</Text>
                                                        <View style={{ width: 34, height: 34, borderRadius: 8, overflow: 'hidden', backgroundColor: '#f1f5f9', marginRight: 8, justifyContent: 'center', alignItems: 'center' }}>
                                                            <SafeImage
                                                                uri={player.image}
                                                                style={{ width: '100%', height: '100%' }}
                                                                previewable={true}
                                                                previewTitle={player.name}
                                                                fallback={<User size={16} color="#94a3b8" />}
                                                            />
                                                        </View>
                                                        <View style={{ flex: 1, marginRight: 6 }}>
                                                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }} numberOfLines={1}>{player.name}</Text>
                                                            <Text style={{ fontSize: 10, color: '#64748b' }}>
                                                                {player.category} {player.battingStyle ? `• ${player.battingStyle}` : ''}
                                                            </Text>
                                                        </View>
                                                        <View style={{ alignItems: 'flex-end' }}>
                                                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>{formatPrice(player.basePrice || slot.basePrice || 0)}</Text>
                                                            {player.status === 'sold' ? (
                                                                <Text style={{ fontSize: 10, fontWeight: '800', color: '#16a34a' }}>
                                                                    SOLD: {formatPrice(player.soldPrice || player.sold_price || player.currentBid || 0)} {buyer?.shortName ? `(${buyer.shortName})` : ''}
                                                                </Text>
                                                            ) : isCur ? (
                                                                <Text style={{ fontSize: 10, fontWeight: '900', color: '#7e22ce' }}>LIVE NOW</Text>
                                                            ) : player.status === 'unsold' ? (
                                                                <Text style={{ fontSize: 10, fontWeight: '700', color: '#d97706' }}>UNSOLD</Text>
                                                            ) : (
                                                                <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b' }}>UPCOMING</Text>
                                                            )}
                                                        </View>
                                                    </View>
                                                );
                                            })
                                        )}
                                    </View>
                                );
                            });
                        })()}
                    </View>
                </ScrollView>
            ) : activeTab === 'sold' ? (
                /* Sold Players Tab */
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Sold Players ({soldPlayers.length})</Text>
                        <Text style={styles.sectionSubtitle}>Completed sales in this tournament</Text>

                        {soldPlayers.length === 0 ? (
                            <View style={styles.emptyBox}>
                                <Text style={styles.emptyText}>No players sold yet in this auction.</Text>
                            </View>
                        ) : (
                            soldPlayers.map((p, idx) => {
                                const buyer = teams.find(t => t._id === p.soldToTeamId || t.id === p.soldToTeamId);
                                return (
                                    <View key={p._id || idx} style={styles.playerRow}>
                                        <View style={styles.playerIdxBox}>
                                            <Text style={styles.playerIdxTxt}>{idx + 1}</Text>
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 10 }}>
                                            <Text style={styles.rowPlayerName}>{p.name}</Text>
                                            <Text style={styles.rowPlayerSub}>
                                                {p.category} • Sold to: <Text style={{ fontWeight: 'bold', color: '#16a34a' }}>{buyer?.name || 'Assigned Team'}</Text>
                                            </Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={styles.rowSoldPrice}>
                                                {formatPrice(p.soldPrice || p.sold_price || p.currentBid || p.basePrice)}
                                            </Text>
                                            <Text style={styles.rowBasePrice}>Base: {formatPrice(p.basePrice)}</Text>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>
                </ScrollView>
            ) : (
                /* Unsold Players Tab */
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Unsold Players Pool ({unsoldPlayers.length})</Text>
                        <Text style={styles.sectionSubtitle}>Waiting for Re-Auction round</Text>

                        {unsoldPlayers.length === 0 ? (
                            <View style={styles.emptyBox}>
                                <Text style={styles.emptyText}>No unsold players yet in this auction.</Text>
                            </View>
                        ) : (
                            unsoldPlayers.map((p, idx) => (
                                <View key={p._id || idx} style={styles.playerRow}>
                                    <View style={styles.playerIdxBox}>
                                        <Text style={styles.playerIdxTxt}>{idx + 1}</Text>
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                        <Text style={styles.rowPlayerName}>{p.name}</Text>
                                        <Text style={styles.rowPlayerSub}>
                                            {p.category} {p.battingStyle ? `• ${p.battingStyle}` : ''}
                                        </Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={[styles.rowSoldPrice, { color: '#0f172a' }]}>Base: {formatPrice(p.basePrice)}</Text>
                                        <Text style={{ fontSize: 10, color: '#d97706', fontWeight: 'bold' }}>Unsold</Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                </ScrollView>
            )}

            {/* Team Squad Modal */}
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
                                                previewable={true}
                                                previewTitle={viewingTeam.name}
                                            />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 10 }}>
                                            <Text style={styles.modalTeamName}>{viewingTeam.name}</Text>
                                            <Text style={styles.modalTeamSub}>
                                                Purse: ₹{((Number(viewingTeam.budget) || 0) - (Number(viewingTeam.spent) || 0)).toFixed(2)} {largeUnit} • Spent: ₹{(Number(viewingTeam.spent) || 0).toFixed(2)} {largeUnit}
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
                                    const rawBought = allPlayers.filter(p => {
                                        const soldId = typeof p.soldToTeamId === 'object' && p.soldToTeamId ? (p.soldToTeamId._id || p.soldToTeamId.id) : p.soldToTeamId;
                                        return soldId && (soldId === viewingTeam._id || soldId === (viewingTeam as any).id) && p.status === 'sold';
                                    });

                                    let captainPlayer = rawBought.find((p: any) => p.isCaptain || String(p._id || '').startsWith('pl_cap_') || String(p._id || '').startsWith('owner_cap_'));

                                    if (!captainPlayer && (viewingTeam.isOwnerCaptain || (viewingTeam as any).captainName)) {
                                        captainPlayer = {
                                            _id: `owner_cap_${viewingTeam._id}`,
                                            name: viewingTeam.captainName || `${viewingTeam.name} Captain`,
                                            image: viewingTeam.captainPhoto || '',
                                            category: 'Captain (All-Rounder)',
                                            battingStyle: 'Right-Hand Bat',
                                            bowlingStyle: 'Right-Arm Medium',
                                            basePrice: Number(viewingTeam.captainPrice) || 0,
                                            soldPrice: Number(viewingTeam.captainPrice) || 0,
                                            sold_price: Number(viewingTeam.captainPrice) || 0,
                                            status: 'sold',
                                            isCaptain: true,
                                            soldToTeamId: viewingTeam._id,
                                            soldToTeamName: viewingTeam.name
                                        };
                                    }

                                    let teamPlayers = rawBought;
                                    if (captainPlayer) {
                                        const capPrice = Number(viewingTeam.captainPrice) || Number(captainPlayer.soldPrice) || Number(captainPlayer.basePrice) || 0;
                                        const updatedCap = {
                                            ...captainPlayer,
                                            basePrice: capPrice,
                                            soldPrice: capPrice,
                                            sold_price: capPrice,
                                            isCaptain: true
                                        };
                                        teamPlayers = [updatedCap, ...rawBought.filter((p: any) => p._id !== captainPlayer._id)];
                                    }

                                    return (
                                        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                                            <View style={styles.modalStatsBar}>
                                                <Text style={styles.modalStatsText}>
                                                    Acquired: <Text style={{ fontWeight: '900', color: '#0f172a' }}>{teamPlayers.length}</Text> / {tournament?.squadSizeLimit || 25}
                                                </Text>
                                                <Text style={styles.modalStatsText}>
                                                    Total: <Text style={{ fontWeight: '900', color: '#16a34a' }}>{formatPrice(teamPlayers.reduce((acc, p) => acc + (p.soldPrice || p.sold_price || p.currentBid || p.basePrice || 0), 0))}</Text>
                                                </Text>
                                            </View>

                                            {teamPlayers.length === 0 ? (
                                                <View style={styles.modalEmptyBox}>
                                                    <Users size={32} color="#cbd5e1" />
                                                    <Text style={styles.modalEmptyText}>No players acquired yet</Text>
                                                </View>
                                            ) : (
                                                teamPlayers.map((p, idx) => (
                                                    <View key={p._id || idx} style={[styles.modalPlayerRow, p.isCaptain && { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
                                                        <View style={styles.modalPlayerAvatar}>
                                                            <SafeImage
                                                                uri={p.image}
                                                                style={{ width: 32, height: 32, borderRadius: 8 }}
                                                                previewable={true}
                                                                previewTitle={p.name}
                                                                fallback={<Users size={16} color="#94a3b8" />}
                                                            />
                                                        </View>
                                                        <View style={{ flex: 1 }}>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                                <Text style={styles.modalPlayerName}>{p.name}</Text>
                                                                {p.isCaptain && (
                                                                    <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 }}>
                                                                        <Text style={{ fontSize: 8, fontWeight: '900', color: '#92400e' }}>👑 C</Text>
                                                                    </View>
                                                                )}
                                                            </View>
                                                            <Text style={styles.modalPlayerCategory}>
                                                                {p.category} {p.battingStyle ? `• ${p.battingStyle}` : ''}
                                                            </Text>
                                                        </View>
                                                        <View style={{ alignItems: 'flex-end' }}>
                                                            <Text style={styles.modalPlayerPriceText}>{formatPrice(p.soldPrice || p.sold_price || p.currentBid || p.basePrice)}</Text>
                                                            <Text style={styles.modalPlayerBasePrice}>{p.isCaptain ? 'Retention Fee' : `Base: ${formatPrice(p.basePrice)}`}</Text>
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
                                    previewable={true}
                                    previewTitle={announcementModal.player?.name}
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
                                    {announcementModal.player?.category} • Base {formatPrice(announcementModal.player?.basePrice)}
                                </Text>

                                {announcementModal.type === 'sold' ? (
                                    <View style={{ width: '100%', padding: 14, backgroundColor: '#f0fdf4', borderRadius: 16, borderWidth: 1, borderColor: '#bbf7d0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 }}>
                                            <SafeImage
                                                uri={announcementModal.team?.logo}
                                                style={{ width: 34, height: 34, borderRadius: 8, resizeMode: 'contain', backgroundColor: '#ffffff' }}
                                                previewable={true}
                                                previewTitle={announcementModal.team?.name || 'Winner Team'}
                                            />
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
    },
    headerTitle: {
        fontSize: 15,
        fontWeight: '900',
        color: '#0f172a',
    },
    liveTagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#22c55e',
    },
    liveTagText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#15803d',
        letterSpacing: 0.5,
    },
    loginPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#2563eb',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
    },
    loginPillText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#ffffff',
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        padding: 4,
        marginHorizontal: 16,
        marginTop: 10,
        borderRadius: 14,
    },
    tabItem: {
        flex: 1,
        paddingVertical: 7,
        alignItems: 'center',
        borderRadius: 10,
    },
    activeTabItem: {
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    tabText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748b',
    },
    activeTabText: {
        color: '#0f172a',
        fontWeight: '800',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
    },
    stateBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        padding: 12,
        borderRadius: 14,
        marginBottom: 12,
    },
    stateBannerText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#475569',
        flex: 1,
    },
    timerBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ea580c',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
        marginBottom: 12,
    },
    timerBannerText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#ffffff',
    },
    timerBox: {
        backgroundColor: '#ffffff',
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderRadius: 8,
    },
    timerText: {
        fontSize: 16,
        fontWeight: '900',
        color: '#ea580c',
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 14,
    },
    pauseBadge: {
        alignSelf: 'center',
        backgroundColor: '#fef3c7',
        borderWidth: 1,
        borderColor: '#fde68a',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 10,
    },
    pauseBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#b45309',
    },
    playerSection: {
        alignItems: 'center',
        marginBottom: 16,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 18,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        overflow: 'hidden',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    playerName: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0f172a',
        textAlign: 'center',
    },
    categoryRow: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 6,
        alignItems: 'center',
    },
    catBadge: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    catBadgeTxt: {
        fontSize: 10,
        fontWeight: '700',
        color: '#475569',
    },
    baseBadge: {
        backgroundColor: '#eff6ff',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    baseBadgeTxt: {
        fontSize: 10,
        fontWeight: '700',
        color: '#2563eb',
    },
    statsBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    statItem: {
        fontSize: 10,
        fontWeight: '700',
        color: '#334155',
    },
    statDot: {
        fontSize: 10,
        color: '#94a3b8',
    },
    bidHighlight: {
        backgroundColor: '#f8fafc',
        padding: 14,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    bidHighlightLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#64748b',
        letterSpacing: 0.5,
    },
    bidHighlightAmount: {
        fontSize: 28,
        fontWeight: '900',
        color: '#15803d',
        marginVertical: 4,
    },
    bidHighlightUnit: {
        fontSize: 16,
        color: '#64748b',
    },
    leaderTxt: {
        fontSize: 11,
        color: '#475569',
    },
    leaderName: {
        fontWeight: '800',
        color: '#0f172a',
    },
    waitingTxt: {
        fontSize: 11,
        color: '#94a3b8',
        fontStyle: 'italic',
    },
    emptyCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 28,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 14,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0f172a',
        marginTop: 8,
    },
    emptySub: {
        fontSize: 11,
        color: '#64748b',
        textAlign: 'center',
        marginTop: 4,
    },
    streamCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    streamTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 10,
    },
    emptyStreamText: {
        fontSize: 11,
        color: '#94a3b8',
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: 12,
    },
    streamRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    streamTeamBadge: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    streamTeamBadgeTxt: {
        fontSize: 11,
        fontWeight: '800',
        color: '#334155',
    },
    streamInfo: {
        flex: 1,
    },
    streamTeamName: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0f172a',
    },
    streamTime: {
        fontSize: 9,
        color: '#94a3b8',
    },
    streamAmount: {
        fontSize: 13,
        fontWeight: '800',
        color: '#15803d',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: '#0f172a',
    },
    sectionSubtitle: {
        fontSize: 11,
        color: '#64748b',
        marginTop: 2,
    },
    teamCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        backgroundColor: '#f8fafc',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    teamCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    teamCardLogo: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    teamCardLogoTxt: {
        fontSize: 12,
        fontWeight: '900',
        color: '#2563eb',
    },
    teamCardName: {
        fontSize: 13,
        fontWeight: '800',
        color: '#0f172a',
    },
    teamCardSquad: {
        fontSize: 10,
        color: '#64748b',
        marginTop: 2,
    },
    pursePill: {
        backgroundColor: '#dcfce7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    pursePillTxt: {
        fontSize: 11,
        fontWeight: '800',
        color: '#15803d',
    },
    emptyBox: {
        paddingVertical: 24,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 11,
        color: '#94a3b8',
        fontStyle: 'italic',
    },
    playerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    playerIdxBox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    playerIdxTxt: {
        fontSize: 10,
        fontWeight: '700',
        color: '#64748b',
    },
    rowPlayerName: {
        fontSize: 13,
        fontWeight: '800',
        color: '#0f172a',
    },
    rowPlayerSub: {
        fontSize: 10,
        color: '#64748b',
        marginTop: 2,
    },
    rowSoldPrice: {
        fontSize: 13,
        fontWeight: '900',
        color: '#15803d',
    },
    rowBasePrice: {
        fontSize: 10,
        color: '#94a3b8',
        marginTop: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    modalCard: {
        width: '100%',
        maxWidth: 480,
        maxHeight: '80%',
        backgroundColor: '#ffffff',
        borderRadius: 24,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#f8fafc',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
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
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTeamLogoText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#ffffff',
    },
    modalTeamName: {
        fontSize: 15,
        fontWeight: '900',
        color: '#0f172a',
    },
    modalTeamSub: {
        fontSize: 10,
        color: '#64748b',
        marginTop: 2,
    },
    modalCloseBtn: {
        padding: 6,
        borderRadius: 10,
        backgroundColor: '#f1f5f9',
    },
    modalScroll: {
        padding: 16,
    },
    modalStatsBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 10,
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 12,
    },
    modalStatsText: {
        fontSize: 11,
        color: '#64748b',
    },
    modalEmptyBox: {
        paddingVertical: 32,
        alignItems: 'center',
    },
    modalEmptyText: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 8,
    },
    modalPlayerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    modalPlayerAvatar: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        overflow: 'hidden',
    },
    modalPlayerName: {
        fontSize: 12,
        fontWeight: '800',
        color: '#0f172a',
    },
    modalPlayerCategory: {
        fontSize: 10,
        color: '#64748b',
        marginTop: 1,
    },
    modalPlayerPriceText: {
        fontSize: 12,
        fontWeight: '900',
        color: '#15803d',
    },
    modalPlayerBasePrice: {
        fontSize: 9,
        color: '#94a3b8',
    },
    modalFooter: {
        padding: 14,
        backgroundColor: '#f8fafc',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        alignItems: 'flex-end',
    },
    modalDoneBtn: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        backgroundColor: '#0f172a',
        borderRadius: 10,
    },
    modalDoneBtnText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#ffffff',
    },
});

export default SpectatorScreen;
