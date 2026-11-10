import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    StatusBar,
    TextInput,
    Alert,
    Platform,
    Modal,
    ActivityIndicator,
    KeyboardAvoidingView,
    Image,
    Share
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import SafeImage from './SafeImage';
import {
    Trophy,
    Users,
    Shield,
    Plus,
    LogOut,
    Play,
    KeyRound,
    UserPlus,
    Eye,
    EyeOff,
    ChevronDown,
    Trash2,
    Sparkles,
    CheckSquare,
    Square,
    Crown,
    Edit2,
    X,
    Save,
    Layers,
    Radio,
    Search,
    Filter,
    Copy,
    Check,
    ArrowRight,
    FileText,
    ExternalLink,
    RefreshCw,
    Camera,
    Upload,
    User,
    TrendingUp
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import TournamentHubModal from './TournamentHubModal';
import ManageCredentialsModal from './ManageCredentialsModal';
import AddTeamModal from './AddTeamModal';
import AddPlayerModal from './AddPlayerModal';
import { apiFetch, getApiUrl } from '../lib/api';
import { getBudgetUnits } from '../lib/currency';
import { checkForAppUpdates } from '../lib/updateManager';
import { toast, ToastOverlay } from '../lib/toast';
import { handleExportCSVAction } from '../lib/csvExport';

const DEFAULT_SLABS_L_CR = [
    { upTo: 100, increment: 10, label: 'Up to ₹1 Cr (100 L)' },
    { upTo: 500, increment: 25, label: '₹1 Cr - ₹5 Cr (500 L)' },
    { upTo: 1000, increment: 50, label: '₹5 Cr - ₹10 Cr (1000 L)' },
    { upTo: 999999, increment: 100, label: 'Above ₹10 Cr (> 1000 L)' }
];

const DEFAULT_SLABS_K_L = [
    { upTo: 100, increment: 10, label: 'Up to ₹1 L (100 K)' },
    { upTo: 500, increment: 25, label: '₹1 L - ₹5 L (500 K)' },
    { upTo: 1000, increment: 50, label: '₹5 L - ₹10 L (1000 K)' },
    { upTo: 999999, increment: 100, label: 'Above ₹10 L (> 1000 K)' }
];

export type SuperAdminTab = 'tournaments' | 'teams' | 'players' | 'slots' | 'credentials';

export interface SuperAdminScreenProps {
    onLogout: () => void;
    onLaunchConsole: (tournamentId: string) => void;
    onLaunchBiddingRoom: (tournamentId: string) => void;
    onOpenSpectator?: (tournamentId: string) => void;
    onOpenPlayerRegistration?: (tournamentId: string) => void;
}

export const SuperAdminScreen: React.FC<SuperAdminScreenProps> = ({
    onLogout,
    onLaunchConsole,
    onLaunchBiddingRoom,
    onOpenSpectator = () => {},
    onOpenPlayerRegistration = () => {}
}) => {
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [selectedTournament, setSelectedTournament] = useState<any>(null);
    const { largeUnit, smallUnit, largeName, smallName, isKtoL } = getBudgetUnits(selectedTournament);
    const [hubModalVisible, setHubModalVisible] = useState(false);
    const [credentialsModalVisible, setCredentialsModalVisible] = useState(false);
    const [tourneyDropdownVisible, setTourneyDropdownVisible] = useState(false);
    const [activeTab, setActiveTab] = useState<SuperAdminTab>('tournaments');

    // Scoped entities for selected tournament
    const [teams, setTeams] = useState<any[]>([]);
    const [players, setPlayers] = useState<any[]>([]);
    const [slots, setSlots] = useState<any[]>([]);
    const [credentialsList, setCredentialsList] = useState<any[]>([]);

    // Tournaments Tab States
    const [tourneyFilter, setTourneyFilter] = useState<'ALL' | 'LIVE' | 'UPCOMING' | 'COMPLETED'>('ALL');
    const [newTourneyName, setNewTourneyName] = useState('');
    const [newTourneySquadLimit, setNewTourneySquadLimit] = useState('25');
    const [newTourneyScale, setNewTourneyScale] = useState<'L_TO_CR' | 'K_TO_L'>('L_TO_CR');

    // Teams Tab States
    const [newTeamName, setNewTeamName] = useState('');
    const [newTeamShort, setNewTeamShort] = useState('');
    const [newTeamBudget, setNewTeamBudget] = useState('100');
    const [newTeamLogo, setNewTeamLogo] = useState('');
    const [isOwnerCaptain, setIsOwnerCaptain] = useState(false);
    const [captainName, setCaptainName] = useState('');
    const [captainPhoto, setCaptainPhoto] = useState('');
    const [captainPrice, setCaptainPrice] = useState('15');
    const [viewingSquadTeam, setViewingSquadTeam] = useState<any>(null);
    const [squadModalVisible, setSquadModalVisible] = useState(false);

    // Players Tab States
    const [playerSearchQuery, setPlayerSearchQuery] = useState('');
    const [playerRoleFilter, setPlayerRoleFilter] = useState('ALL');
    const [playerStatusFilter, setPlayerStatusFilter] = useState('ALL');
    const [newPlayerName, setNewPlayerName] = useState('');
    const [newPlayerCategory, setNewPlayerCategory] = useState('Batsman');
    const [newPlayerBase, setNewPlayerBase] = useState('20');
    const [newPlayerImage, setNewPlayerImage] = useState('');

    // Slots Tab States
    const [selectedSlot, setSelectedSlot] = useState<any>(null);
    const [editingSlot, setEditingSlot] = useState<any>(null);
    const [newSlotName, setNewSlotName] = useState('');
    const [newSlotRole, setNewSlotRole] = useState('Batsman');
    const [newSlotBasePrice, setNewSlotBasePrice] = useState(isKtoL ? '20' : '100');
    const [slotSearchQuery, setSlotSearchQuery] = useState('');
    const [slotRoleFilter, setSlotRoleFilter] = useState('ALL');
    const [savingSlot, setSavingSlot] = useState(false);

    // Credentials Tab States
    const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // Edit Tournament Modal States
    const [editTourneyModalVisible, setEditTourneyModalVisible] = useState(false);
    const [editingTourney, setEditingTourney] = useState<any>(null);
    const [editTourneyName, setEditTourneyName] = useState('');
    const [editTourneySquadLimit, setEditTourneySquadLimit] = useState('25');
    const [editTourneyScale, setEditTourneyScale] = useState<'L_TO_CR' | 'K_TO_L'>('L_TO_CR');
    const [editTourneyAuctionType, setEditTourneyAuctionType] = useState<'owner_driven' | 'admin_driven'>('owner_driven');
    const [editTourneyStartDate, setEditTourneyStartDate] = useState('');
    const [editTourneyTime, setEditTourneyTime] = useState('');
    const [editTourneyBidRules, setEditTourneyBidRules] = useState<any[]>(DEFAULT_SLABS_L_CR);
    const [savingTourney, setSavingTourney] = useState(false);

    // Edit Player Modal States
    const [addTeamModalVisible, setAddTeamModalVisible] = useState(false);
    const [editingTeamData, setEditingTeamData] = useState<any>(null);
    const [addPlayerModalVisible, setAddPlayerModalVisible] = useState(false);
    const [editingPlayerData, setEditingPlayerData] = useState<any>(null);
    const [editPlayerModalVisible, setEditPlayerModalVisible] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState<any>(null);
    const [editPlayerName, setEditPlayerName] = useState('');
    const [editPlayerCategory, setEditPlayerCategory] = useState('Batsman');
    const [editPlayerBattingStyle, setEditPlayerBattingStyle] = useState('Right-Hand Bat');
    const [editPlayerBowlingStyle, setEditPlayerBowlingStyle] = useState('Right-Arm Medium');
    const [editPlayerBasePrice, setEditPlayerBasePrice] = useState('20');
    const [editPlayerAge, setEditPlayerAge] = useState('');
    const [editPlayerCricHeroes, setEditPlayerCricHeroes] = useState('');
    const [editPlayerImage, setEditPlayerImage] = useState('');
    const [editPlayerMatches, setEditPlayerMatches] = useState('0');
    const [editPlayerRuns, setEditPlayerRuns] = useState('0');
    const [editPlayerWickets, setEditPlayerWickets] = useState('0');
    const [savingPlayer, setSavingPlayer] = useState(false);

    // Image Picker Helper with 1:1 Frame Cropping
    const pickImageWith1to1Crop = async (): Promise<string | null> => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                toast.warning('Permission Denied', 'Gallery access permission is needed to pick and crop photos.');
                return null;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1], // Exactly 1:1 square crop frame!
                quality: 0.7,
                base64: true
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                return asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
            }
            return null;
        } catch (err: any) {
            toast.error('Image Picker Error', err.message || 'Failed to select image');
            return null;
        }
    };

    const handlePickTeamLogo = async () => {
        const cropped = await pickImageWith1to1Crop();
        if (cropped) setNewTeamLogo(cropped);
    };

    const handlePickCaptainPhoto = async () => {
        const cropped = await pickImageWith1to1Crop();
        if (cropped) setCaptainPhoto(cropped);
    };

    const handlePickNewPlayerImage = async () => {
        const cropped = await pickImageWith1to1Crop();
        if (cropped) setNewPlayerImage(cropped);
    };

    const handlePickEditPlayerImage = async () => {
        const cropped = await pickImageWith1to1Crop();
        if (cropped) setEditPlayerImage(cropped);
    };

    useEffect(() => {
        fetchTournaments();
    }, []);

    useEffect(() => {
        if (selectedTournament?._id) {
            fetchTournamentDetails(selectedTournament._id);
        }
    }, [selectedTournament?._id, activeTab]);

    // Keep slot base price aligned with current tournament currency scale
    useEffect(() => {
        setNewSlotBasePrice(isKtoL ? '20' : '100');
        setNewPlayerBase(isKtoL ? '10' : '20');
    }, [isKtoL]);

    const fetchTournaments = async () => {
        try {
            const res = await apiFetch('/api/tournaments');
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                setTournaments(data);
                if (!selectedTournament) {
                    setSelectedTournament(data[0]);
                }
            } else {
                setTournaments([]);
            }
        } catch {
            setTournaments([]);
        }
    };

    const fetchTournamentDetails = async (tId: string) => {
        try {
            const [teamRes, playRes, slotRes, credRes] = await Promise.all([
                apiFetch(`/api/teams/${tId}`).then(r => r.json()).catch(() => []),
                apiFetch(`/api/players/${tId}`).then(r => r.json()).catch(() => []),
                apiFetch(`/api/tournaments/${tId}/slots`).then(r => r.json()).catch(() => []),
                apiFetch(`/api/tournaments/${tId}/credentials`).then(r => r.json()).catch(() => ({ credentials: [] }))
            ]);

            if (Array.isArray(teamRes)) setTeams(teamRes);
            if (Array.isArray(playRes)) setPlayers(playRes);
            
            if (Array.isArray(slotRes)) {
                setSlots(slotRes);
                setSelectedSlot((prev: any) => {
                    if (!prev) return slotRes.length > 0 ? slotRes[0] : null;
                    const stillExists = slotRes.find((s: any) => s._id === prev._id);
                    return stillExists || (slotRes.length > 0 ? slotRes[0] : null);
                });
            } else {
                setSlots([]);
                setSelectedSlot(null);
            }

            if (credRes?.credentials && Array.isArray(credRes.credentials)) {
                setCredentialsList(credRes.credentials);
            } else if (Array.isArray(credRes)) {
                setCredentialsList(credRes);
            } else {
                setCredentialsList([]);
            }
        } catch {
            setTeams([]);
            setPlayers([]);
            setSlots([]);
            setSelectedSlot(null);
            setCredentialsList([]);
        }
    };

    // --- TOURNAMENTS HANDLERS ---
    const handleCreateTournament = async () => {
        if (!newTourneyName.trim()) {
            toast.warning('Required Field', 'Please enter a tournament name.');
            return;
        }
        const squadLimit = parseInt(newTourneySquadLimit) || 25;
        const defaultRules = newTourneyScale === 'K_TO_L' ? [
            { upTo: 20, increment: 2 },
            { upTo: 50, increment: 5 },
            { upTo: 100, increment: 10 },
            { upTo: 999999, increment: 25 }
        ] : [
            { upTo: 100, increment: 10 },
            { upTo: 500, increment: 25 },
            { upTo: 1000, increment: 50 },
            { upTo: 999999, increment: 100 }
        ];

        const newT = {
            _id: 'tourney_' + Date.now(),
            name: newTourneyName.trim(),
            status: 'upcoming',
            biddingState: 'stopped',
            auctionType: 'owner_driven',
            squadSizeLimit: squadLimit,
            budgetScale: newTourneyScale,
            bidIncrementRules: defaultRules
        };
        try {
            await apiFetch('/api/tournaments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newT)
            });
        } catch {}

        setTournaments(prev => [newT, ...prev]);
        setSelectedTournament(newT);
        setNewTourneyName('');
        setNewTourneySquadLimit('25');
        toast.success('Tournament Created', `"${newT.name}" (${newTourneyScale === 'K_TO_L' ? 'K → L' : 'L → Cr'} Scale) • Limit: ${squadLimit}`);
    };

    const handleToggleTournamentStatus = async (t: any) => {
        let newStatus = 'active';
        if (t.status === 'active' || t.status === 'live') {
            newStatus = 'completed';
        } else if (t.status === 'completed') {
            newStatus = 'inactive';
        } else {
            newStatus = 'active';
        }

        try {
            await apiFetch(`/api/tournaments/${t._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
        } catch {}
        setTournaments(prev => prev.map(item => item._id === t._id ? { ...item, status: newStatus } : item));
        if (selectedTournament?._id === t._id) {
            setSelectedTournament((prev: any) => ({ ...prev, status: newStatus }));
        }
        toast.info('Status Updated', `${t.name} is now ${newStatus.toUpperCase()}`);
    };

    const handleDeleteTournament = (tournamentId: string, name: string) => {
        Alert.alert(
            'Delete Tournament',
            `Are you sure you want to permanently delete "${name}"?\n\nThis will remove all associated teams, players, credentials, and slots.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Permanently',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiFetch(`/api/tournaments/${tournamentId}`, { method: 'DELETE' });
                            setTournaments(prev => prev.filter(t => t._id !== tournamentId));
                            if (selectedTournament?._id === tournamentId) {
                                setSelectedTournament(null);
                            }
                            toast.success('Deleted', `"${name}" deleted permanently.`);
                        } catch (e: any) {
                            toast.error('Delete Failed', e.message || 'Failed to delete tournament');
                        }
                    }
                }
            ]
        );
    };

    const handleOpenEditTournament = (t: any) => {
        if (!t) return;
        setEditingTourney(t);
        setEditTourneyName(t.name || '');
        setEditTourneySquadLimit(String(t.squadSizeLimit || 25));

        const scale = t.budgetScale === 'K_TO_L' ? 'K_TO_L' : 'L_TO_CR';
        setEditTourneyScale(scale);
        setEditTourneyAuctionType(t.auctionType === 'admin_driven' ? 'admin_driven' : 'owner_driven');

        let dateStr = '';
        if (t.startDate) {
            try {
                const d = new Date(t.startDate);
                dateStr = isNaN(d.getTime()) ? String(t.startDate) : d.toISOString().split('T')[0];
            } catch {
                dateStr = String(t.startDate);
            }
        }
        setEditTourneyStartDate(dateStr);
        setEditTourneyTime(t.time || '');

        const defaultSlabs = scale === 'K_TO_L' ? DEFAULT_SLABS_K_L : DEFAULT_SLABS_L_CR;
        const slabs = (t.bidIncrementRules && t.bidIncrementRules.length > 0)
            ? t.bidIncrementRules.map((r: any, i: number) => ({
                upTo: Number(r.upTo) || 100,
                increment: Number(r.increment) || 10,
                label: r.label || defaultSlabs[i]?.label || `Up to ₹${r.upTo} ${scale === 'K_TO_L' ? 'K' : 'L'}`
            }))
            : defaultSlabs;
        setEditTourneyBidRules(slabs);
        setEditTourneyModalVisible(true);
    };

    const handleSwitchEditScale = (newScale: 'L_TO_CR' | 'K_TO_L') => {
        setEditTourneyScale(newScale);
        const defaultSlabs = newScale === 'K_TO_L' ? DEFAULT_SLABS_K_L : DEFAULT_SLABS_L_CR;
        setEditTourneyBidRules(prev => prev.map((r, i) => ({
            ...r,
            label: defaultSlabs[i]?.label || `Up to ₹${r.upTo} ${newScale === 'K_TO_L' ? 'K' : 'L'}`
        })));
    };

    const handleSaveEditTournament = async () => {
        if (!editingTourney || !editTourneyName.trim()) {
            toast.warning('Required Field', 'Tournament name is required.');
            return;
        }
        setSavingTourney(true);
        try {
            const payload = {
                name: editTourneyName.trim(),
                startDate: editTourneyStartDate.trim() || null,
                time: editTourneyTime.trim() || null,
                squadSizeLimit: parseInt(editTourneySquadLimit) || 25,
                budgetScale: editTourneyScale,
                auctionType: editTourneyAuctionType,
                bidIncrementRules: editTourneyBidRules.map(s => ({
                    upTo: Number(s.upTo) || 100,
                    increment: Number(s.increment) || 10,
                    label: s.label
                }))
            };

            const res = await apiFetch(`/api/tournaments/${editingTourney._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const updatedObj = { ...editingTourney, ...payload };
                setTournaments(prev => prev.map(item => item._id === editingTourney._id ? updatedObj : item));
                if (selectedTournament?._id === editingTourney._id) {
                    setSelectedTournament(updatedObj);
                }
                setEditTourneyModalVisible(false);
                toast.success('Updated', 'Tournament updated successfully!');
            } else {
                const errData = await res.json().catch(() => ({}));
                toast.error('Update Error', errData.message || 'Failed to save tournament.');
            }
        } catch (err: any) {
            toast.error('Network Error', err.message || 'Failed to save tournament.');
        } finally {
            setSavingTourney(false);
        }
    };

    // --- TEAMS HANDLERS ---
    const handleCreateTeam = async () => {
        if (!newTeamName.trim() || !newTeamShort.trim() || !selectedTournament?._id) {
            toast.warning('Required Fields', 'Team Name and Short Code are required.');
            return;
        }
        const budget = Number(newTeamBudget) || 100;
        const capPrice = isOwnerCaptain ? (Number(captainPrice) || 0) : 0;
        const newTm = {
            _id: 'tm_' + Date.now(),
            tournamentId: selectedTournament._id,
            name: newTeamName.trim(),
            shortName: newTeamShort.trim().toUpperCase(),
            budget,
            spent: capPrice,
            isOwnerCaptain,
            captainName: isOwnerCaptain ? (captainName.trim() || undefined) : undefined,
            captainPhoto: isOwnerCaptain ? captainPhoto.trim() : undefined,
            captainPrice: capPrice,
            logo: newTeamLogo.trim()
        };
        let createdTeam = newTm;
        try {
            const res = await apiFetch('/api/teams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTm)
            });
            if (res.ok) {
                createdTeam = await res.json();
            }
        } catch {}
        setTeams(prev => [...prev, createdTeam]);
        setNewTeamName('');
        setNewTeamShort('');
        setNewTeamLogo('');
        setIsOwnerCaptain(false);
        setCaptainName('');
        setCaptainPhoto('');
        toast.success('Team Added', `"${newTm.name}" registered • Purse: ₹${budget} ${largeUnit}`);
    };

    const handleDeleteTeam = async (id: string, name: string) => {
        Alert.alert('Delete Team', `Remove ${name} from this tournament?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await apiFetch(`/api/teams/${id}`, { method: 'DELETE' });
                        toast.success('Team Deleted', `Removed ${name}`);
                    } catch {}
                    setTeams(prev => prev.filter(t => t._id !== id));
                }
            }
        ]);
    };

    const handleOpenSquadModal = (team: any) => {
        setViewingSquadTeam(team);
        setSquadModalVisible(true);
    };

    // --- PLAYERS HANDLERS ---
    const handleCreatePlayer = async () => {
        if (!newPlayerName.trim() || !selectedTournament?._id) {
            toast.warning('Required Field', 'Please enter player name.');
            return;
        }
        const newP = {
            _id: 'pl_' + Date.now(),
            tournamentId: selectedTournament._id,
            name: newPlayerName.trim(),
            category: newPlayerCategory,
            basePrice: Number(newPlayerBase) || 20,
            image: newPlayerImage.trim(),
            status: 'pending'
        };
        let createdPlayer = newP;
        try {
            const res = await apiFetch('/api/players', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newP)
            });
            if (res.ok) {
                createdPlayer = await res.json();
            }
        } catch {}
        setPlayers(prev => [...prev, createdPlayer]);
        setNewPlayerName('');
        setNewPlayerImage('');
        toast.success('Player Added', `${newP.name} added to ${selectedTournament.name}`);
    };

    const handleDeletePlayer = async (id: string, name: string) => {
        Alert.alert('Delete Player', `Remove ${name} from this tournament?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await apiFetch(`/api/players/${id}`, { method: 'DELETE' });
                        if (selectedTournament?._id) fetchTournamentDetails(selectedTournament._id);
                        toast.success('Player Removed', `Removed ${name}`);
                    } catch {}
                    setPlayers(prev => prev.filter(p => p._id !== id));
                }
            }
        ]);
    };

    const handleOpenEditPlayer = (p: any) => {
        setEditingPlayer(p);
        setEditPlayerName(p.name || '');
        setEditPlayerCategory(p.category || 'Batsman');
        setEditPlayerBattingStyle(p.battingStyle || 'Right-Hand Bat');
        setEditPlayerBowlingStyle(p.bowlingStyle || 'Right-Arm Medium');
        setEditPlayerBasePrice(String(p.basePrice ?? 20));
        setEditPlayerAge(p.age ? String(p.age) : '');
        setEditPlayerCricHeroes(p.cricHeroesProfileUrl || '');
        setEditPlayerImage(p.image || '');
        setEditPlayerMatches(String(p.stats?.matches ?? 0));
        setEditPlayerRuns(String(p.stats?.runs ?? 0));
        setEditPlayerWickets(String(p.stats?.wickets ?? 0));
        setEditPlayerModalVisible(true);
    };

    const handleSaveEditPlayer = async () => {
        if (!editingPlayer || !editPlayerName.trim()) {
            toast.warning('Required Field', 'Player name is required');
            return;
        }

        setSavingPlayer(true);
        try {
            const payload: any = {
                name: editPlayerName.trim(),
                category: editPlayerCategory,
                battingStyle: editPlayerBattingStyle,
                bowlingStyle: editPlayerBowlingStyle,
                basePrice: Number(editPlayerBasePrice) || 0,
                age: editPlayerAge ? Number(editPlayerAge) : undefined,
                cricHeroesProfileUrl: editPlayerCricHeroes.trim(),
                image: editPlayerImage.trim(),
                stats: {
                    matches: Number(editPlayerMatches) || 0,
                    runs: Number(editPlayerRuns) || 0,
                    wickets: Number(editPlayerWickets) || 0,
                    highestScore: editingPlayer.stats?.highestScore || '',
                    bestBowling: editingPlayer.stats?.bestBowling || ''
                }
            };

            if (editingPlayer.isCaptain) {
                payload.isCaptain = true;
                payload.soldPrice = payload.basePrice;
            }

            const res = await apiFetch(`/api/players/${editingPlayer._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const updated = await res.json();
                setPlayers(prev => prev.map(p => p._id === editingPlayer._id ? { ...p, ...updated, image: updated.image ?? editPlayerImage.trim() } : p));
                setEditPlayerModalVisible(false);
                toast.success('Updated', `Player "${editPlayerName}" updated successfully`);
                if (selectedTournament?._id) {
                    fetchTournamentDetails(selectedTournament._id);
                }
            } else {
                const errData = await res.json().catch(() => ({}));
                toast.error('Update Error', errData?.message || 'Failed to update player');
            }
        } catch (err: any) {
            toast.error('Network Error', err?.message || 'Error while updating player');
        } finally {
            setSavingPlayer(false);
        }
    };

    // --- SLOTS HANDLERS ---
    const handleStartEditSlot = (slot: any) => {
        if (!slot || slot.isDefaultUnsold || slot.slotType === 'unsold') return;
        setEditingSlot(slot);
        setNewSlotName(slot.name || '');
        setNewSlotRole(slot.role || 'Batsman');
        setNewSlotBasePrice(String(slot.basePrice ?? (isKtoL ? '20' : '100')));
    };

    const handleCancelEditSlot = () => {
        setEditingSlot(null);
        setNewSlotName('');
        setNewSlotRole('Batsman');
        setNewSlotBasePrice(isKtoL ? '20' : '100');
    };

    const handleSaveSlot = async () => {
        if (!newSlotName.trim()) {
            toast.warning('Required Field', 'Slot name is required');
            return;
        }
        if (!selectedTournament?._id) return;

        setSavingSlot(true);
        try {
            if (editingSlot) {
                const payload = {
                    name: newSlotName.trim(),
                    role: newSlotRole,
                    basePrice: Number(newSlotBasePrice) || (isKtoL ? 20 : 100)
                };

                const res = await apiFetch(`/api/tournaments/${selectedTournament._id}/slots/${editingSlot._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    const data = await res.json();
                    const updated = data.slot;
                    setSlots(prev => prev.map(s => (s._id === editingSlot._id ? updated : s)));
                    setSelectedSlot((prevSel: any) => (prevSel?._id === editingSlot._id ? updated : prevSel));
                    setPlayers(prev => prev.map(p => (
                        p.slotId === editingSlot._id && p.status === 'pending'
                            ? { ...p, basePrice: updated.basePrice, currentBid: updated.basePrice }
                            : p
                    )));
                    handleCancelEditSlot();
                    toast.success('Slot Updated', `"${updated.name}" updated • Base ₹${updated.basePrice} ${smallUnit}`);
                } else {
                    toast.error('Error', 'Failed to update slot');
                }
            } else {
                const payload = {
                    name: newSlotName.trim(),
                    role: newSlotRole,
                    basePrice: Number(newSlotBasePrice) || (isKtoL ? 20 : 100),
                    order: slots.length + 1
                };

                const res = await apiFetch(`/api/tournaments/${selectedTournament._id}/slots`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    const data = await res.json();
                    const created = data.slot;
                    setSlots(prev => [...prev, created]);
                    setSelectedSlot(created);
                    setNewSlotName('');
                    toast.success('Slot Created', `"${created.name}" created • Base ₹${created.basePrice} ${smallUnit}`);
                } else {
                    toast.error('Error', 'Failed to create slot');
                }
            }
        } catch {
            toast.error('Network Error', editingSlot ? 'Failed to update slot' : 'Failed to create slot');
        } finally {
            setSavingSlot(false);
        }
    };

    const handleDeleteSlot = async (slotId: string, slotName: string) => {
        Alert.alert(
            'Delete Slot',
            `Delete slot "${slotName}"? Assigned players will keep their base price but become unslotted.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiFetch(`/api/tournaments/${selectedTournament._id}/slots/${slotId}`, {
                                method: 'DELETE'
                            });
                            if (editingSlot?._id === slotId) handleCancelEditSlot();
                            setSlots(prev => {
                                const remaining = prev.filter(s => s._id !== slotId);
                                setSelectedSlot((prevSel: any) => (prevSel?._id === slotId ? (remaining[0] || null) : prevSel));
                                return remaining;
                            });
                            setPlayers(prev => prev.map(p => (p.slotId === slotId ? { ...p, slotId: null } : p)));
                            toast.success('Slot Deleted', `Removed "${slotName}"`);
                        } catch {
                            toast.error('Error', 'Failed to delete slot');
                        }
                    }
                }
            ]
        );
    };

    const handleShiftPlayerToSlot = async (player: any, slot: any) => {
        if (!slot) {
            toast.warning('Select Slot', 'Please select a target slot first.');
            return;
        }
        try {
            const res = await apiFetch(`/api/tournaments/${selectedTournament._id}/slots/${slot._id}/assign-players`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerIds: [player._id] })
            });

            if (res.ok) {
                const isUnsoldSlot = slot.isDefaultUnsold || slot.slotType === 'unsold' || slot.basePrice == null;
                setPlayers(prev => prev.map(p => {
                    if (p._id === player._id) {
                        return isUnsoldSlot
                            ? { ...p, slotId: slot._id }
                            : { ...p, slotId: slot._id, basePrice: slot.basePrice, currentBid: slot.basePrice };
                    }
                    return p;
                }));
                toast.success(
                    'Player Shifted',
                    isUnsoldSlot
                        ? `"${player.name}" assigned to "${slot.name}" (Retains player's ₹${player.basePrice} ${smallUnit})`
                        : `"${player.name}" assigned to "${slot.name}" (Base ₹${slot.basePrice} ${smallUnit})`
                );
            } else {
                toast.error('Error', 'Failed to assign player to slot');
            }
        } catch {
            toast.error('Network Error', 'Error while assigning player');
        }
    };

    const handleRemovePlayerFromSlot = async (player: any) => {
        try {
            const res = await apiFetch(`/api/players/${player._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slotId: null })
            });

            if (res.ok) {
                setPlayers(prev => prev.map(p => p._id === player._id ? { ...p, slotId: null } : p));
                toast.info('Unslotted', `Removed "${player.name}" from slot.`);
            } else {
                toast.error('Error', 'Failed to unslot player');
            }
        } catch {
            toast.error('Network Error', 'Error while removing player');
        }
    };

    const handleReopenUnsoldPlayers = async () => {
        if (!selectedTournament?._id) return;
        Alert.alert(
            'Re-Auction Unsold Players',
            'Bring all unsold players into the designated Re-Auction slot so teams can bid on them again?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Bring to Re-Auction',
                    onPress: async () => {
                        try {
                            const res = await apiFetch(`/api/tournaments/${selectedTournament._id}/slots/reopen-unsold`, {
                                method: 'POST'
                            });
                            if (res.ok) {
                                toast.success('Re-Auction Ready', 'Unsold players brought to re-auction slot!');
                                fetchTournamentDetails(selectedTournament._id);
                            } else {
                                toast.info('Notice', 'No unsold players or default re-auction slot ready.');
                            }
                        } catch {
                            toast.error('Network Error', 'Failed while processing re-auction.');
                        }
                    }
                }
            ]
        );
    };

    // --- CREDENTIALS HANDLERS ---
    const handleTogglePassword = (userId: string) => {
        setShowPasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
    };

    const handleCopyDetails = async (label: string, text: string, key: string) => {
        try {
            await Clipboard.setStringAsync(text);
        } catch (err) {
            console.warn('Clipboard copy failed:', err);
        }
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 3000);
        toast.success(
            `${label} Copied!`,
            text,
            {
                actionLabel: 'Share',
                onAction: () => Share.share({ title: label, message: `${label}:\n${text}` }).catch(() => {})
            }
        );
    };

    const handleOpenHub = (tournament: any) => {
        setSelectedTournament(tournament);
        setHubModalVisible(true);
    };

    // Filtered lists
    const filteredTournaments = tournaments.filter(t => {
        if (tourneyFilter === 'ALL') return true;
        if (tourneyFilter === 'LIVE') return t.status === 'live' || t.status === 'active';
        if (tourneyFilter === 'UPCOMING') return t.status === 'upcoming' || t.status === 'inactive';
        if (tourneyFilter === 'COMPLETED') return t.status === 'completed';
        return true;
    });

    const liveCount = tournaments.filter(t => t.status === 'live' || t.status === 'active').length;

    // Retained Captains derived for Players Tab
    const retainedCaptains = (teams || [])
        .filter(t => t.isOwnerCaptain)
        .map(t => {
            const alreadyInPlayers = players.find(
                p => (p.isCaptain || String(p._id || '').startsWith('pl_cap_')) && (p.soldToTeamId === t._id || p.soldToTeamId === t.id)
            );
            if (alreadyInPlayers) return null;
            return {
                _id: `owner_cap_${t._id}`,
                name: t.captainName || `${t.name} Captain`,
                image: t.captainPhoto || '',
                category: 'Captain (All-Rounder)',
                battingStyle: 'Right-Hand Bat',
                bowlingStyle: 'Right-Arm Medium',
                basePrice: t.captainPrice || (isKtoL ? 3 : 15),
                soldPrice: t.captainPrice || (isKtoL ? 3 : 15),
                status: 'retained',
                isCaptain: true,
                isDirectOwnerCaptain: true,
                soldToTeamId: t._id,
                soldToTeamName: t.name,
                teamCode: t.shortName
            };
        })
        .filter(Boolean);

    const allDisplayPlayers = [...retainedCaptains, ...players];

    const filteredPlayers = allDisplayPlayers.filter(p => {
        if (playerSearchQuery.trim()) {
            const q = playerSearchQuery.toLowerCase().trim();
            if (!p.name?.toLowerCase().includes(q)) return false;
        }
        if (playerRoleFilter !== 'ALL' && p.category !== playerRoleFilter) return false;
        if (playerStatusFilter !== 'ALL') {
            if (playerStatusFilter === 'Sold' && p.status !== 'sold' && !p.isCaptain) return false;
            if (playerStatusFilter === 'Unsold' && p.status !== 'unsold') return false;
            if (playerStatusFilter === 'Available' && (p.status === 'sold' || p.status === 'unsold' || p.isCaptain)) return false;
        }
        return true;
    });

    // For Slots Tab
    const assignedPlayersInSelectedSlot = selectedSlot ? players.filter(p => p.slotId === selectedSlot._id) : [];
    const pendingUnslottedPlayers = players.filter(p => {
        if (p.slotId) return false;
        if (p.isCaptain || p.status === 'sold') return false;
        if (slotRoleFilter !== 'ALL' && p.category !== slotRoleFilter) return false;
        if (slotSearchQuery.trim() && !p.name.toLowerCase().includes(slotSearchQuery.toLowerCase().trim())) return false;
        return true;
    });

    const webBaseUrl = process.env.EXPO_PUBLIC_WEB_URL || 'https://dabcricauction.vercel.app';
    const spectatorUrl = `${webBaseUrl}/auction/${selectedTournament?._id || ''}`;
    const registrationUrl = `${webBaseUrl}/register-player/${selectedTournament?._id || ''}`;

    return (
        <SafeAreaView style={[styles.container, styles.safeTop]}>
            <StatusBar barStyle="dark-content" />

            {/* Top Brand Header */}
            <View style={styles.header}>
                <View style={styles.brandRow}>
                    <Image
                        source={require('../assets/logo.png')}
                        style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' }}
                        resizeMode="contain"
                    />
                    <View>
                        <Text style={styles.headerTitle}>Dab Cric Auction</Text>
                        <Text style={styles.headerSub}>Executive Control Hub</Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                        onPress={() => checkForAppUpdates(true)}
                        style={[styles.logoutBtn, { borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }]}
                    >
                        <RefreshCw size={14} color="#2563eb" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
                        <LogOut size={16} color="#64748b" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Tournament Selector Dropdown (Replaces horizontal scroll pills) */}
            <View style={styles.selectorStrip}>
                <Text style={styles.selectorLabel}>ACTIVE TOURNAMENT SCOPE</Text>
                <TouchableOpacity
                    style={styles.dropdownTrigger}
                    onPress={() => setTourneyDropdownVisible(true)}
                    activeOpacity={0.8}
                >
                    <View style={styles.dropdownLeft}>
                        <View style={styles.dropdownBadge}>
                            <Trophy size={14} color="#2563eb" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.dropdownTitle} numberOfLines={1}>
                                {selectedTournament?.name || 'Select a Tournament'}
                            </Text>
                            <Text style={styles.dropdownSub} numberOfLines={1}>
                                {selectedTournament
                                    ? `${selectedTournament.status === 'completed' ? '🏆 Completed' : (selectedTournament.status === 'live' || selectedTournament.status === 'active') ? '● Live' : '○ Upcoming'} • Squad: ${selectedTournament.squadSizeLimit || 25} • ${selectedTournament.budgetScale === 'K_TO_L' ? 'K → L' : 'L → Cr'}`
                                    : 'Tap to choose tournament'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.dropdownRight}>
                        <Text style={styles.dropdownSwitchText}>Switch</Text>
                        <ChevronDown size={14} color="#2563eb" />
                    </View>
                </TouchableOpacity>
            </View>

            {/* 5-Tab Bar (100% Screen Width - Zero Horizontal Cutoff) */}
            <View style={styles.tabBarContainer}>
                <View style={styles.tabBarRow}>
                    <TouchableOpacity
                        style={[styles.tabItem, activeTab === 'tournaments' && styles.tabItemActive]}
                        onPress={() => setActiveTab('tournaments')}
                    >
                        <Trophy size={14} color={activeTab === 'tournaments' ? '#2563eb' : '#64748b'} />
                        <Text style={[styles.tabText, activeTab === 'tournaments' && styles.tabTextActive]} numberOfLines={1}>
                            Tourney ({tournaments.length})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabItem, activeTab === 'teams' && styles.tabItemActive]}
                        onPress={() => setActiveTab('teams')}
                    >
                        <Shield size={14} color={activeTab === 'teams' ? '#2563eb' : '#64748b'} />
                        <Text style={[styles.tabText, activeTab === 'teams' && styles.tabTextActive]} numberOfLines={1}>
                            Teams ({teams.length})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabItem, activeTab === 'players' && styles.tabItemActive]}
                        onPress={() => setActiveTab('players')}
                    >
                        <Users size={14} color={activeTab === 'players' ? '#2563eb' : '#64748b'} />
                        <Text style={[styles.tabText, activeTab === 'players' && styles.tabTextActive]} numberOfLines={1}>
                            Players ({allDisplayPlayers.length})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabItem, activeTab === 'slots' && styles.tabItemActivePurple]}
                        onPress={() => setActiveTab('slots')}
                    >
                        <Layers size={14} color={activeTab === 'slots' ? '#7c3aed' : '#64748b'} />
                        <Text style={[styles.tabText, activeTab === 'slots' && { color: '#7c3aed', fontWeight: '900' }]} numberOfLines={1}>
                            Slots ({slots.length})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabItem, activeTab === 'credentials' && styles.tabItemActiveAmber]}
                        onPress={() => setActiveTab('credentials')}
                    >
                        <KeyRound size={14} color={activeTab === 'credentials' ? '#d97706' : '#64748b'} />
                        <Text style={[styles.tabText, activeTab === 'credentials' && { color: '#d97706', fontWeight: '900' }]} numberOfLines={1}>
                            Logins ({credentialsList.length})
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    automaticallyAdjustKeyboardInsets={true}
                    keyboardDismissMode="on-drag"
                >
                    {/* ========================================================================= */}
                    {/* TAB 1: TOURNAMENTS HUB */}
                    {/* ========================================================================= */}
                    {activeTab === 'tournaments' && (
                        <View>
                            {/* KPI Metrics */}
                            <View style={styles.kpiGrid}>
                                <View style={styles.kpiCard}>
                                    <View style={styles.kpiHeader}>
                                        <Text style={styles.kpiLabel}>TOURNAMENTS</Text>
                                        <Trophy size={14} color="#2563eb" />
                                    </View>
                                    <Text style={styles.kpiValue}>{tournaments.length}</Text>
                                    <Text style={styles.kpiSub}>Total events</Text>
                                </View>

                                <View style={styles.kpiCard}>
                                    <View style={styles.kpiHeader}>
                                        <Text style={styles.kpiLabel}>LIVE ROOMS</Text>
                                        <Radio size={14} color="#16a34a" />
                                    </View>
                                    <Text style={[styles.kpiValue, { color: '#16a34a' }]}>{liveCount}</Text>
                                    <Text style={styles.kpiSub}>Active auctions</Text>
                                </View>

                                <View style={styles.kpiCard}>
                                    <View style={styles.kpiHeader}>
                                        <Text style={styles.kpiLabel}>TEAMS</Text>
                                        <Shield size={14} color="#4f46e5" />
                                    </View>
                                    <Text style={styles.kpiValue}>{teams.length}</Text>
                                    <Text style={styles.kpiSub}>In selected</Text>
                                </View>

                                <View style={styles.kpiCard}>
                                    <View style={styles.kpiHeader}>
                                        <Text style={styles.kpiLabel}>PLAYERS</Text>
                                        <Users size={14} color="#d97706" />
                                    </View>
                                    <Text style={styles.kpiValue}>{allDisplayPlayers.length}</Text>
                                    <Text style={styles.kpiSub}>Incl. captains</Text>
                                </View>
                            </View>

                            {/* Status Filter Chips */}
                            <View style={styles.filterChipRow}>
                                {(['ALL', 'LIVE', 'UPCOMING', 'COMPLETED'] as const).map(chip => (
                                    <TouchableOpacity
                                        key={chip}
                                        style={[styles.filterChip, tourneyFilter === chip && styles.filterChipActive]}
                                        onPress={() => setTourneyFilter(chip)}
                                    >
                                        <Text style={[styles.filterChipText, tourneyFilter === chip && styles.filterChipTextActive]}>
                                            {chip === 'ALL' ? 'All Tournaments' : chip}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Create Tournament Form */}
                            <View style={styles.formCard}>
                                <View style={styles.formCardHeader}>
                                    <Sparkles size={14} color="#2563eb" />
                                    <Text style={styles.formTitle}>CREATE NEW TOURNAMENT</Text>
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Tournament Name (e.g. World Cricket League 2026)"
                                    placeholderTextColor="#94a3b8"
                                    value={newTourneyName}
                                    onChangeText={setNewTourneyName}
                                />
                                <View style={{ marginBottom: 6 }}>
                                    <Text style={styles.inputLabel}>SQUAD LIMIT PER TEAM</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Max Squad Players (e.g. 15, 18 or 25)"
                                        placeholderTextColor="#94a3b8"
                                        keyboardType="numeric"
                                        value={newTourneySquadLimit}
                                        onChangeText={setNewTourneySquadLimit}
                                    />
                                </View>
                                <View style={{ marginBottom: 8 }}>
                                    <Text style={styles.inputLabel}>CURRENCY / BUDGET SCALE</Text>
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <TouchableOpacity
                                            style={[
                                                styles.scaleOptionBtn,
                                                newTourneyScale === 'L_TO_CR' && styles.scaleOptionBtnActive
                                            ]}
                                            onPress={() => setNewTourneyScale('L_TO_CR')}
                                        >
                                            <Text style={[
                                                styles.scaleOptionText,
                                                newTourneyScale === 'L_TO_CR' && styles.scaleOptionTextActive
                                            ]}>
                                                L → Cr (IPL Scale)
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.scaleOptionBtn,
                                                newTourneyScale === 'K_TO_L' && styles.scaleOptionBtnActive
                                            ]}
                                            onPress={() => setNewTourneyScale('K_TO_L')}
                                        >
                                            <Text style={[
                                                styles.scaleOptionText,
                                                newTourneyScale === 'K_TO_L' && styles.scaleOptionTextActive
                                            ]}>
                                                K → L (Club Scale)
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <TouchableOpacity style={styles.addBtn} onPress={handleCreateTournament}>
                                    <Plus size={14} color="#ffffff" />
                                    <Text style={styles.addBtnText}>Create Tournament</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.listTitle}>All Tournaments ({filteredTournaments.length})</Text>
                            <Text style={styles.listHint}>Tap any tournament to inspect Console, Credentials, Links & Settings</Text>

                            {filteredTournaments.map(t => {
                                const isSelected = selectedTournament?._id === t._id;
                                return (
                                    <TouchableOpacity
                                        key={t._id}
                                        style={[styles.tourneyCard, isSelected && styles.tourneyCardSelected]}
                                        onPress={() => handleOpenHub(t)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.tourneyCardTop}>
                                            <View style={{ flex: 1, marginRight: 8 }}>
                                                <Text style={styles.tourneyName}>{t.name}</Text>
                                                <Text style={styles.tourneyMeta}>
                                                    {t.auctionType === 'admin_driven' ? 'Admin Driven' : 'Owner Driven'} • Squad: {t.squadSizeLimit || 25} • {t.budgetScale === 'K_TO_L' ? 'K → L (Club)' : 'L → Cr (IPL)'}
                                                </Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <TouchableOpacity
                                                    style={[
                                                        styles.statusBadge,
                                                        t.status === 'completed'
                                                            ? styles.statusCompleted
                                                            : (t.status === 'live' || t.status === 'active') && styles.statusLive
                                                    ]}
                                                    onPress={() => handleToggleTournamentStatus(t)}
                                                >
                                                    <Text style={[
                                                        styles.statusText,
                                                        t.status === 'completed'
                                                            ? styles.statusTextCompleted
                                                            : (t.status === 'live' || t.status === 'active') && styles.statusTextLive
                                                    ]}>
                                                        {t.status === 'completed' ? '🏆 COMPLETED' : (t.status === 'live' || t.status === 'active') ? '● ACTIVE' : '○ INACTIVE'}
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.deleteTourneyBtn, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}
                                                    onPress={() => handleOpenEditTournament(t)}
                                                >
                                                    <Edit2 size={13} color="#2563eb" />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.deleteTourneyBtn}
                                                    onPress={() => handleDeleteTournament(t._id, t.name)}
                                                >
                                                    <Trash2 size={13} color="#dc2626" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        {/* Action Chips */}
                                        <View style={styles.actionChipRow}>
                                            <TouchableOpacity
                                                style={styles.actionChipPrimary}
                                                onPress={() => onLaunchConsole(t._id)}
                                            >
                                                <Play size={11} color="#ffffff" />
                                                <Text style={styles.actionChipPrimaryText}>Console</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={styles.actionChipPurple}
                                                onPress={() => {
                                                    setSelectedTournament(t);
                                                    setActiveTab('slots');
                                                }}
                                            >
                                                <Layers size={11} color="#7c3aed" />
                                                <Text style={styles.actionChipPurpleText}>Slots</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={styles.actionChipAmber}
                                                onPress={() => {
                                                    setSelectedTournament(t);
                                                    setActiveTab('credentials');
                                                }}
                                            >
                                                <KeyRound size={11} color="#b45309" />
                                                <Text style={styles.actionChipAmberText}>Credentials</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={styles.actionChip}
                                                onPress={() => onOpenPlayerRegistration(t._id)}
                                            >
                                                <UserPlus size={11} color="#2563eb" />
                                                <Text style={styles.actionChipText}>Self-Reg</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={styles.actionChip}
                                                onPress={() => onOpenSpectator(t._id)}
                                            >
                                                <Eye size={11} color="#059669" />
                                                <Text style={styles.actionChipText}>Spectator</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}

                    {/* ========================================================================= */}
                    {/* TAB 2: TEAMS ROSTER */}
                    {/* ========================================================================= */}
                    {activeTab === 'teams' && (
                        <View>
                            <View style={styles.scopeBanner}>
                                <Shield size={14} color="#2563eb" />
                                <Text style={styles.scopeBannerText} numberOfLines={1}>
                                    Managing Teams for: <Text style={{ fontWeight: '900' }}>{selectedTournament?.name}</Text>
                                </Text>
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.listTitle}>Registered Teams ({teams.length})</Text>
                                    <Text style={styles.listHint}>Tap any team card to inspect Squad</Text>
                                </View>
                                <TouchableOpacity
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#059669', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 }}
                                    onPress={() => handleExportCSVAction({
                                        type: 'summary',
                                        tournament: selectedTournament,
                                        teams,
                                        players: allDisplayPlayers
                                    })}
                                >
                                    <FileText size={13} color="#ffffff" />
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#ffffff' }}>Summary CSV</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}
                                    onPress={() => {
                                        setEditingTeamData(null);
                                        setAddTeamModalVisible(true);
                                    }}
                                >
                                    <Plus size={14} color="#ffffff" />
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#ffffff' }}>Add Team</Text>
                                </TouchableOpacity>
                            </View>

                            {teams.map(tm => {
                                const teamAcquired = players.filter(p => (p.soldToTeamId === tm._id || p.soldToTeamId === tm.id) && !p.isCaptain && !String(p._id || '').startsWith('pl_cap_'));
                                const squadCount = teamAcquired.length + (tm.isOwnerCaptain ? 1 : 0);
                                const remainingPurse = Math.max(0, (tm.budget || 100) - (tm.spent || 0)).toFixed(2);

                                return (
                                    <TouchableOpacity
                                        key={tm._id}
                                        style={styles.card}
                                        onPress={() => handleOpenSquadModal(tm)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.cardHeader}>
                                            <View style={styles.teamHeaderRow}>
                                                <View style={styles.teamLogoBox}>
                                                    <SafeImage
                                                        uri={tm.logo}
                                                        style={styles.teamLogoImg}
                                                        fallback={<Text style={styles.teamLogoFallbackText}>{tm.shortName || tm.name?.substring(0, 3)}</Text>}
                                                    />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.cardTitle}>{tm.name}</Text>
                                                    <View style={styles.codeBadge}>
                                                        <Text style={styles.codeBadgeText}>{tm.shortName}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setEditingTeamData(tm);
                                                        setAddTeamModalVisible(true);
                                                    }}
                                                    style={[styles.deleteIcon, { backgroundColor: '#eff6ff', borderRadius: 8, borderWidth: 1, borderColor: '#bfdbfe' }]}
                                                    accessibilityLabel="Edit Team"
                                                >
                                                    <Edit2 size={13} color="#2563eb" />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => handleDeleteTeam(tm._id, tm.name)}
                                                    style={styles.deleteIcon}
                                                >
                                                    <Trash2 size={14} color="#dc2626" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        {/* Captain Banner */}
                                        {tm.isOwnerCaptain && (
                                            <View style={styles.captainBanner}>
                                                <SafeImage
                                                    uri={tm.captainPhoto}
                                                    style={{ width: 20, height: 20, borderRadius: 10, marginRight: 6 }}
                                                    fallback={<Crown size={12} color="#b45309" />}
                                                />
                                                <Text style={styles.captainBannerText}>
                                                    Captain: <Text style={{ fontWeight: '900' }}>{tm.captainName || `${tm.name} Captain`}</Text> (₹{tm.captainPrice || (isKtoL ? 3 : 15)} {smallUnit} Retained)
                                                </Text>
                                            </View>
                                        )}

                                        {/* Financial Grid */}
                                        <View style={styles.statsStrip}>
                                            <Text style={styles.statItem}>Purse: <Text style={styles.statBold}>₹{tm.budget} {largeUnit}</Text></Text>
                                            <Text style={styles.statItem}>Spent: <Text style={[styles.statBold, { color: '#dc2626' }]}>₹{tm.spent || 0} {largeUnit}</Text></Text>
                                            <Text style={styles.statItem}>Remaining: <Text style={[styles.statBold, { color: '#16a34a' }]}>₹{remainingPurse} {largeUnit}</Text></Text>
                                        </View>

                                        <View style={styles.teamRosterFooter}>
                                            <Text style={styles.squadLimitNote}>
                                                Squad: {squadCount} / {selectedTournament?.squadSizeLimit || 25} players
                                            </Text>
                                            <Text style={styles.viewSquadLink}>View Squad & Sold Prices →</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}

                            {/* Unsold Players Section */}
                            <View style={styles.unsoldSection}>
                                <View style={styles.unsoldHeaderRow}>
                                    <View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={styles.unsoldTitle}>
                                                Unsold Players Pool ({players.filter(p => p.status === 'unsold').length})
                                            </Text>
                                            <View style={styles.reAuctionBadge}>
                                                <Text style={styles.reAuctionBadgeText}>Re-Auction</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.unsoldSub}>
                                            Players who went unsold in initial rounds
                                        </Text>
                                    </View>
                                    {players.filter(p => p.status === 'unsold').length > 0 && (
                                        <TouchableOpacity
                                            style={styles.reAuctionActionBtn}
                                            onPress={handleReopenUnsoldPlayers}
                                        >
                                            <RefreshCw size={12} color="#ffffff" />
                                            <Text style={styles.reAuctionActionBtnText}>Re-Auction Slot</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {players.filter(p => p.status === 'unsold').length === 0 ? (
                                    <View style={styles.emptySlotBox}>
                                        <Text style={styles.emptySlotText}>No unsold players currently in this tournament.</Text>
                                    </View>
                                ) : (
                                    players.filter(p => p.status === 'unsold').map(p => (
                                        <View key={p._id} style={styles.unsoldPlayerCard}>
                                            <View>
                                                <Text style={styles.unsoldPlayerName}>{p.name}</Text>
                                                <Text style={styles.unsoldPlayerMeta}>
                                                    {p.category} • Base: ₹{p.basePrice || 0} {smallUnit}
                                                </Text>
                                            </View>
                                            <View style={styles.unsoldTag}>
                                                <Text style={styles.unsoldTagText}>UNSOLD</Text>
                                            </View>
                                        </View>
                                    ))
                                )}
                            </View>
                        </View>
                    )}

                    {/* ========================================================================= */}
                    {/* TAB 3: PLAYERS POOL */}
                    {/* ========================================================================= */}
                    {activeTab === 'players' && (
                        <View>
                            <View style={styles.scopeBanner}>
                                <Users size={14} color="#2563eb" />
                                <Text style={styles.scopeBannerText} numberOfLines={1}>
                                    Managing Players for: <Text style={{ fontWeight: '900' }}>{selectedTournament?.name}</Text>
                                </Text>
                            </View>

                            {/* Search & Role Filter Bar */}
                            <View style={styles.searchBarContainer}>
                                <Search size={14} color="#94a3b8" />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search player by name..."
                                    placeholderTextColor="#94a3b8"
                                    value={playerSearchQuery}
                                    onChangeText={setPlayerSearchQuery}
                                />
                                {playerSearchQuery ? (
                                    <TouchableOpacity onPress={() => setPlayerSearchQuery('')}>
                                        <X size={14} color="#94a3b8" />
                                    </TouchableOpacity>
                                ) : null}
                            </View>

                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipScroll}>
                                {['ALL', 'Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper'].map(role => (
                                    <TouchableOpacity
                                        key={role}
                                        style={[styles.filterChip, playerRoleFilter === role && styles.filterChipActive]}
                                        onPress={() => setPlayerRoleFilter(role)}
                                    >
                                        <Text style={[styles.filterChipText, playerRoleFilter === role && styles.filterChipTextActive]}>
                                            {role === 'ALL' ? 'All Roles' : role.split(' ')[0]}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipScroll}>
                                {['ALL', 'Available', 'Sold', 'Unsold'].map(status => (
                                    <TouchableOpacity
                                        key={status}
                                        style={[styles.statusFilterChip, playerStatusFilter === status && styles.statusFilterChipActive]}
                                        onPress={() => setPlayerStatusFilter(status)}
                                    >
                                        <Text style={[styles.statusFilterChipText, playerStatusFilter === status && styles.statusFilterChipTextActive]}>
                                            {status}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 6, flexWrap: 'wrap' }}>
                                <Text style={[styles.listTitle, { marginBottom: 0, flex: 1 }]}>Auction Players ({filteredPlayers.length})</Text>
                                <TouchableOpacity
                                    onPress={() => handleExportCSVAction({
                                        type: 'players',
                                        tournament: selectedTournament,
                                        teams,
                                        players: allDisplayPlayers
                                    })}
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 }}
                                >
                                    <FileText size={12} color="#475569" />
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#334155' }}>CSV</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => onOpenPlayerRegistration(selectedTournament?._id)}
                                    style={styles.publicFormLinkBtn}
                                >
                                    <Text style={styles.publicFormLinkText}>Self-Reg</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        setEditingPlayerData(null);
                                        setAddPlayerModalVisible(true);
                                    }}
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#2563eb', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                                >
                                    <Plus size={13} color="#ffffff" />
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#ffffff' }}>Add Player</Text>
                                </TouchableOpacity>
                            </View>

                            {filteredPlayers.map(p => {
                                const isCap = p.isCaptain || p.isDirectOwnerCaptain;
                                const teamAssigned = p.soldToTeamName || (p.soldToTeamId && teams.find(t => t._id === p.soldToTeamId)?.name);

                                return (
                                    <View key={p._id} style={[styles.card, isCap && styles.captainCard]}>
                                        <View style={styles.cardHeader}>
                                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1, paddingRight: 8 }}>
                                                <View style={styles.playerAvatarBox}>
                                                    <SafeImage
                                                        uri={p.image}
                                                        style={styles.playerAvatarImg}
                                                        fallback={isCap ? <Crown size={20} color="#b45309" /> : <User size={20} color="#94a3b8" />}
                                                    />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                        <Text style={styles.cardTitle}>{p.name}</Text>
                                                        {isCap && (
                                                            <View style={styles.captainPill}>
                                                                <Crown size={10} color="#b45309" />
                                                                <Text style={styles.captainPillText}>OWNER & CAPTAIN</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                    <Text style={styles.cardSub}>
                                                        Role: {p.category} • {isCap ? `Fee: ₹${p.soldPrice || p.basePrice} ${smallUnit}` : `Base: ₹${p.basePrice} ${smallUnit}`}
                                                    </Text>

                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                                                        <View style={{
                                                            backgroundColor: isCap ? '#fef3c7' : p.status === 'sold' ? '#dcfce7' : p.status === 'unsold' ? '#fee2e2' : '#f1f5f9',
                                                            paddingHorizontal: 7,
                                                            paddingVertical: 2,
                                                            borderRadius: 6
                                                        }}>
                                                            <Text style={{
                                                                fontSize: 10,
                                                                fontWeight: '800',
                                                                color: isCap ? '#92400e' : p.status === 'sold' ? '#15803d' : p.status === 'unsold' ? '#b91c1c' : '#64748b'
                                                            }}>
                                                                {isCap ? `🚫 DIRECT SQUAD (₹${p.soldPrice || p.basePrice} ${smallUnit})` : `${(p.status || 'AVAILABLE').toUpperCase()}${p.soldPrice ? ` (₹${p.soldPrice} ${smallUnit})` : ''}`}
                                                            </Text>
                                                        </View>
                                                        {teamAssigned && (
                                                            <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                                                                <Text style={{ fontSize: 10, fontWeight: '800', color: '#1d4ed8' }}>
                                                                    {teamAssigned}
                                                                </Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                </View>
                                            </View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setEditingPlayerData(p);
                                                        setAddPlayerModalVisible(true);
                                                    }}
                                                    style={[styles.deleteIcon, { backgroundColor: '#eff6ff', borderRadius: 8, borderWidth: 1, borderColor: '#bfdbfe' }]}
                                                    accessibilityLabel="Edit Player"
                                                >
                                                    <Edit2 size={13} color="#2563eb" />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => handleDeletePlayer(p._id, p.name)}
                                                    style={styles.deleteIcon}
                                                >
                                                    <Trash2 size={14} color="#dc2626" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* ========================================================================= */}
                    {/* TAB 4: SLOTS / SETS (PER-TOURNAMENT TIER SETS) */}
                    {/* ========================================================================= */}
                    {activeTab === 'slots' && (
                        <View>
                            <View style={[styles.scopeBanner, { backgroundColor: '#f5f3ff', borderColor: '#ddd6fe' }]}>
                                <Layers size={14} color="#7c3aed" />
                                <Text style={[styles.scopeBannerText, { color: '#6d28d9' }]} numberOfLines={1}>
                                    Configure Slots / Sets for: <Text style={{ fontWeight: '900' }}>{selectedTournament?.name}</Text>
                                </Text>
                            </View>

                            {/* Create / Edit Slot Form */}
                            <View style={[styles.formCard, editingSlot && { borderColor: '#818cf8', backgroundColor: '#eef2ff' }]}>
                                <View style={[styles.formCardHeader, { justifyContent: 'space-between' }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                        <Layers size={14} color={editingSlot ? '#4338ca' : '#7c3aed'} />
                                        <Text style={[styles.formTitle, { color: editingSlot ? '#3730a3' : '#6d28d9' }]}>
                                            {editingSlot ? `EDIT SLOT: ${editingSlot.name}` : 'CREATE NEW SLOT / TIER SET'}
                                        </Text>
                                    </View>
                                    {editingSlot && (
                                        <TouchableOpacity
                                            onPress={handleCancelEditSlot}
                                            style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1' }}
                                        >
                                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#475569' }}>Cancel</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Slot Name (e.g. Marquee Batsmen Tier 1)"
                                    placeholderTextColor="#94a3b8"
                                    value={newSlotName}
                                    onChangeText={setNewSlotName}
                                />
                                <View style={styles.pickerRow}>
                                    {['Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper'].map(role => (
                                        <TouchableOpacity
                                            key={role}
                                            style={[styles.catPick, newSlotRole === role && styles.catPickActivePurple]}
                                            onPress={() => setNewSlotRole(role)}
                                        >
                                            <Text style={[styles.catPickText, newSlotRole === role && { color: '#7c3aed', fontWeight: '900' }]}>
                                                {role.split(' ')[0]}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <Text style={styles.inputLabel}>SLOT BASE PRICE (₹ {smallName.toUpperCase()} / {smallUnit})</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder={`Base Price in ${smallUnit} (e.g. ${isKtoL ? '20' : '100'})`}
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="numeric"
                                    value={newSlotBasePrice}
                                    onChangeText={setNewSlotBasePrice}
                                />
                                <TouchableOpacity
                                    style={[styles.addBtn, { backgroundColor: editingSlot ? '#4338ca' : '#7c3aed' }]}
                                    onPress={handleSaveSlot}
                                    disabled={savingSlot}
                                >
                                    {savingSlot ? (
                                        <ActivityIndicator size="small" color="#ffffff" />
                                    ) : (
                                        <>
                                            {editingSlot ? <Check size={14} color="#ffffff" /> : <Plus size={14} color="#ffffff" />}
                                            <Text style={styles.addBtnText}>
                                                {editingSlot ? 'Update Slot Details' : 'Add Slot (Auto-Sets Base Price)'}
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>

                            {/* Configured Slots List */}
                            <Text style={styles.listTitle}>Active Slots ({slots.length})</Text>
                            <Text style={styles.listHint}>Tap a slot to select target, inspect assigned players, and shift pool</Text>

                            {slots.length === 0 ? (
                                <View style={styles.emptySlotBox}>
                                    <Text style={styles.emptySlotText}>No slots created yet. Add one above to organize players into tier sets.</Text>
                                </View>
                            ) : (
                                slots.map(slot => {
                                    const isSelected = selectedSlot?._id === slot._id;
                                    const count = players.filter(p => p.slotId === slot._id).length;
                                    return (
                                        <TouchableOpacity
                                            key={slot._id}
                                            style={[styles.slotCard, isSelected && styles.slotCardActive]}
                                            onPress={() => setSelectedSlot(slot)}
                                            activeOpacity={0.8}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.slotName}>{slot.name}</Text>
                                                <View style={styles.slotMetaRow}>
                                                    <View style={[styles.slotPriceBadge, (slot.isDefaultUnsold || slot.slotType === 'unsold' || slot.basePrice == null) && { backgroundColor: '#fef3c7' }]}>
                                                        <Text style={[styles.slotPriceText, (slot.isDefaultUnsold || slot.slotType === 'unsold' || slot.basePrice == null) && { color: '#b45309' }]}>
                                                            {(slot.isDefaultUnsold || slot.slotType === 'unsold' || slot.basePrice == null) ? 'Per Player Base' : `₹${slot.basePrice} ${smallUnit} Base`}
                                                        </Text>
                                                    </View>
                                                    <Text style={styles.slotSub}>{slot.role} • {count} Players</Text>
                                                </View>
                                            </View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                {slot.isDefaultUnsold || slot.slotType === 'unsold' ? (
                                                    <View style={styles.reAuctionTag}>
                                                        <Text style={styles.reAuctionTagText}>DEFAULT RE-AUCTION</Text>
                                                    </View>
                                                ) : (
                                                    <>
                                                        <TouchableOpacity
                                                            onPress={() => handleStartEditSlot(slot)}
                                                            style={[styles.deleteIcon, { backgroundColor: '#eef2ff', borderColor: '#c7d2fe', borderWidth: 1, borderRadius: 8 }]}
                                                            accessibilityLabel="Edit Slot"
                                                        >
                                                            <Edit2 size={13} color="#4338ca" />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            onPress={() => handleDeleteSlot(slot._id, slot.name)}
                                                            style={styles.deleteIcon}
                                                            accessibilityLabel="Delete Slot"
                                                        >
                                                            <Trash2 size={13} color="#dc2626" />
                                                        </TouchableOpacity>
                                                    </>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })
                            )}

                            {/* Active Target Slot Management Panel */}
                            {selectedSlot ? (
                                <View style={styles.slotTargetPanel}>
                                    <View style={styles.slotTargetHeader}>
                                        <View style={{ flex: 1, marginRight: 8 }}>
                                            <Text style={styles.slotTargetLabel}>ACTIVE TARGET SLOT</Text>
                                            <Text style={styles.slotTargetTitle}>{selectedSlot.name}</Text>
                                            <Text style={styles.slotTargetSub}>
                                                {(selectedSlot.isDefaultUnsold || selectedSlot.slotType === 'unsold' || selectedSlot.basePrice == null)
                                                    ? 'Base price is NOT auto-set — each player keeps their own base price'
                                                    : `Shifting players here auto-sets base price to ₹${selectedSlot.basePrice} ${smallUnit}`}
                                            </Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            {!(selectedSlot.isDefaultUnsold || selectedSlot.slotType === 'unsold') && (
                                                <TouchableOpacity
                                                    onPress={() => handleStartEditSlot(selectedSlot)}
                                                    style={{ padding: 8, borderRadius: 10, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#ddd6fe' }}
                                                >
                                                    <Edit2 size={14} color="#4338ca" />
                                                </TouchableOpacity>
                                            )}
                                            <View style={styles.slotTargetPriceBox}>
                                                {(selectedSlot.isDefaultUnsold || selectedSlot.slotType === 'unsold' || selectedSlot.basePrice == null) ? (
                                                    <>
                                                        <Text style={[styles.slotTargetPriceVal, { fontSize: 12, color: '#b45309' }]}>Per</Text>
                                                        <Text style={[styles.slotTargetPriceUnit, { color: '#b45309' }]}>Player</Text>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Text style={styles.slotTargetPriceVal}>₹{selectedSlot.basePrice}</Text>
                                                        <Text style={styles.slotTargetPriceUnit}>{smallUnit}</Text>
                                                    </>
                                                )}
                                            </View>
                                        </View>
                                    </View>

                                    {/* Assigned Players */}
                                    <Text style={[styles.listTitle, { marginTop: 14, fontSize: 12 }]}>
                                        Assigned Players in Slot ({assignedPlayersInSelectedSlot.length})
                                    </Text>
                                    {assignedPlayersInSelectedSlot.length === 0 ? (
                                        <View style={styles.emptySlotBox}>
                                            <Text style={styles.emptySlotText}>No players shifted into this slot yet. Shift players from pending pool below.</Text>
                                        </View>
                                    ) : (
                                        assignedPlayersInSelectedSlot.map(p => (
                                            <View key={p._id} style={styles.assignedPlayerRow}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.assignedPlayerName}>{p.name}</Text>
                                                    <Text style={styles.assignedPlayerMeta}>{p.category} • Base: ₹{p.basePrice} {smallUnit}</Text>
                                                </View>
                                                <TouchableOpacity
                                                    onPress={() => handleRemovePlayerFromSlot(p)}
                                                    style={styles.removeSlotBtn}
                                                >
                                                    <Text style={styles.removeSlotBtnText}>Remove</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ))
                                    )}

                                    {/* Pending Players Pool */}
                                    <View style={{ marginTop: 16 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <Text style={[styles.listTitle, { fontSize: 12, marginBottom: 0 }]}>
                                                Pending Players Pool ({pendingUnslottedPlayers.length})
                                            </Text>
                                            <View style={styles.alreadyShiftedBadge}>
                                                <Text style={styles.alreadyShiftedText}>
                                                    {players.filter(p => p.slotId).length} Already Shifted
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Search & Filter */}
                                        <View style={styles.searchBarContainer}>
                                            <Search size={14} color="#94a3b8" />
                                            <TextInput
                                                style={styles.searchInput}
                                                placeholder="Search unslotted player..."
                                                placeholderTextColor="#94a3b8"
                                                value={slotSearchQuery}
                                                onChangeText={setSlotSearchQuery}
                                            />
                                        </View>

                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipScroll}>
                                            {['ALL', 'Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper'].map(role => (
                                                <TouchableOpacity
                                                    key={role}
                                                    style={[styles.filterChip, slotRoleFilter === role && styles.filterChipActivePurple]}
                                                    onPress={() => setSlotRoleFilter(role)}
                                                >
                                                    <Text style={[styles.filterChipText, slotRoleFilter === role && { color: '#7c3aed', fontWeight: '900' }]}>
                                                        {role === 'ALL' ? 'All Roles' : role.split(' ')[0]}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>

                                        {pendingUnslottedPlayers.length === 0 ? (
                                            <View style={styles.emptySlotBox}>
                                                <Text style={styles.emptySlotText}>
                                                    {players.filter(p => !p.slotId && !p.isCaptain && p.status !== 'sold').length === 0
                                                        ? '🎉 All players have been shifted to slots!'
                                                        : 'No unassigned players match this search/filter.'}
                                                </Text>
                                            </View>
                                        ) : (
                                            pendingUnslottedPlayers.map(p => (
                                                <View key={p._id} style={styles.unassignedPlayerRow}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.assignedPlayerName}>{p.name}</Text>
                                                        <Text style={styles.assignedPlayerMeta}>{p.category} • Current: ₹{p.basePrice || 0} {smallUnit}</Text>
                                                    </View>
                                                    <TouchableOpacity
                                                        onPress={() => handleShiftPlayerToSlot(p, selectedSlot)}
                                                        style={styles.shiftBtn}
                                                    >
                                                        <Text style={styles.shiftBtnText}>Shift to Slot</Text>
                                                        <ArrowRight size={12} color="#ffffff" />
                                                    </TouchableOpacity>
                                                </View>
                                            ))
                                        )}
                                    </View>
                                </View>
                            ) : null}
                        </View>
                    )}

                    {/* ========================================================================= */}
                    {/* TAB 5: CREDENTIALS (TEAM OWNERS & AUCTIONEER LOGINS) */}
                    {/* ========================================================================= */}
                    {activeTab === 'credentials' && (
                        <View>
                            <View style={[styles.scopeBanner, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
                                <KeyRound size={14} color="#d97706" />
                                <Text style={[styles.scopeBannerText, { color: '#92400e' }]} numberOfLines={1}>
                                    Manage Logins for: <Text style={{ fontWeight: '900' }}>{selectedTournament?.name}</Text>
                                </Text>
                            </View>

                            {/* Share Links Card */}
                            <View style={styles.shareLinksCard}>
                                <Text style={styles.formTitle}>QUICK SHARE & ACCESS LINKS</Text>
                                
                                <View style={styles.linkRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.linkTitle}>Public Live Stream URL</Text>
                                        <Text style={styles.linkSub} numberOfLines={1}>{spectatorUrl}</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.copyBtn}
                                        onPress={() => handleCopyDetails('Public Live URL', spectatorUrl, 'spectator')}
                                    >
                                        <Copy size={13} color="#2563eb" />
                                        <Text style={styles.copyBtnText}>
                                            {copiedKey === 'spectator' ? 'Copied' : 'Copy'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={[styles.linkRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.linkTitle}>Player Self-Registration URL</Text>
                                        <Text style={styles.linkSub} numberOfLines={1}>{registrationUrl}</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.copyBtn}
                                        onPress={() => handleCopyDetails('Player Registration URL', registrationUrl, 'register')}
                                    >
                                        <Copy size={13} color="#2563eb" />
                                        <Text style={styles.copyBtnText}>
                                            {copiedKey === 'register' ? 'Copied' : 'Copy'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Add / Manage Credentials Button */}
                            <TouchableOpacity
                                style={[styles.addBtn, { backgroundColor: '#d97706', marginBottom: 16 }]}
                                onPress={() => setCredentialsModalVisible(true)}
                            >
                                <Plus size={14} color="#ffffff" />
                                <Text style={styles.addBtnText}>+ Add / Edit Tournament Credential</Text>
                            </TouchableOpacity>

                            <Text style={styles.listTitle}>Registered Credentials ({credentialsList.length})</Text>
                            <Text style={styles.listHint}>Credentials for Team Owners and Official Auctioneers</Text>

                            {credentialsList.length === 0 ? (
                                <View style={styles.emptySlotBox}>
                                    <Text style={styles.emptySlotText}>No credentials registered yet. Click the button above to add team owner and auctioneer logins.</Text>
                                </View>
                            ) : (
                                credentialsList.map(cred => {
                                    const isAuctioneer = cred.role === 'auctioneer';
                                    const pwShown = !!showPasswords[cred._id];

                                    return (
                                        <View key={cred._id} style={styles.card}>
                                            <View style={styles.cardHeader}>
                                                <View style={{ flex: 1 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                        <Text style={styles.cardTitle}>
                                                            {isAuctioneer ? 'Official Auctioneer' : (cred.teamName || 'Team Owner')}
                                                        </Text>
                                                        <View style={{
                                                            backgroundColor: isAuctioneer ? '#eff6ff' : '#fef3c7',
                                                            paddingHorizontal: 6,
                                                            paddingVertical: 2,
                                                            borderRadius: 4
                                                        }}>
                                                            <Text style={{
                                                                fontSize: 9,
                                                                fontWeight: '900',
                                                                color: isAuctioneer ? '#1d4ed8' : '#92400e'
                                                            }}>
                                                                {isAuctioneer ? 'AUCTIONEER' : 'TEAM OWNER'}
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    {!isAuctioneer && cred.captainName && (
                                                        <Text style={styles.cardSub}>
                                                            Captain: {cred.captainName} (Fee: ₹{cred.captainPrice || (isKtoL ? 3 : 15)} {smallUnit})
                                                        </Text>
                                                    )}

                                                    {/* Credentials strip */}
                                                    <View style={styles.credDetailsBox}>
                                                        <Text style={styles.credText}>
                                                            Username: <Text style={{ fontWeight: '800', color: '#0f172a' }}>{cred.username}</Text>
                                                        </Text>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                                            <Text style={styles.credText}>
                                                                Passcode: <Text style={{ fontWeight: '800', color: '#0f172a' }}>
                                                                    {pwShown ? (cred.plainPassword || '••••••••') : '••••••••'}
                                                                </Text>
                                                            </Text>
                                                            <TouchableOpacity
                                                                onPress={() => handleTogglePassword(cred._id)}
                                                                style={{ padding: 2 }}
                                                            >
                                                                {pwShown ? (
                                                                    <EyeOff size={13} color="#64748b" />
                                                                ) : (
                                                                    <Eye size={13} color="#64748b" />
                                                                )}
                                                            </TouchableOpacity>
                                                        </View>
                                                    </View>
                                                </View>

                                                <TouchableOpacity
                                                    style={styles.copyBtn}
                                                    onPress={() => handleCopyDetails(
                                                        `${cred.username} Credentials`,
                                                        `User: ${cred.username}\nPass: ${cred.plainPassword || ''}`,
                                                        cred._id
                                                    )}
                                                >
                                                    <Copy size={12} color="#2563eb" />
                                                    <Text style={styles.copyBtnText}>
                                                        {copiedKey === cred._id ? 'Copied' : 'Copy'}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    );
                                })
                            )}
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Team Squad Roster Modal */}
            <Modal
                visible={squadModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSquadModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <View style={styles.teamLogoBoxSmall}>
                                        <SafeImage
                                            uri={viewingSquadTeam?.logo}
                                            style={styles.teamLogoImg}
                                            fallback={<Text style={styles.teamLogoFallbackTextSmall}>{viewingSquadTeam?.shortName}</Text>}
                                        />
                                    </View>
                                    <View>
                                        <Text style={styles.modalTitle}>{viewingSquadTeam?.name}</Text>
                                        <Text style={styles.modalSub}>
                                            Code: {viewingSquadTeam?.shortName} • {selectedTournament?.name}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setSquadModalVisible(false)} style={styles.modalCloseBtn}>
                                <X size={20} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            {/* Financial Stats */}
                            <View style={styles.statsStrip}>
                                <Text style={styles.statItem}>Purse: <Text style={styles.statBold}>₹{viewingSquadTeam?.budget} {largeUnit}</Text></Text>
                                <Text style={styles.statItem}>Spent: <Text style={[styles.statBold, { color: '#dc2626' }]}>₹{viewingSquadTeam?.spent || 0} {largeUnit}</Text></Text>
                                <Text style={styles.statItem}>Remaining: <Text style={[styles.statBold, { color: '#16a34a' }]}>
                                    ₹{Math.max(0, (viewingSquadTeam?.budget || 100) - (viewingSquadTeam?.spent || 0)).toFixed(2)} {largeUnit}
                                </Text></Text>
                            </View>

                            {/* Retained Captain if applicable */}
                            {viewingSquadTeam?.isOwnerCaptain && (
                                <View style={[styles.captainBanner, { marginVertical: 12 }]}>
                                    <SafeImage
                                        uri={viewingSquadTeam?.captainPhoto}
                                        style={{ width: 28, height: 28, borderRadius: 14, marginRight: 8 }}
                                        fallback={<Crown size={14} color="#b45309" />}
                                    />
                                    <View style={{ flex: 1, marginLeft: 6 }}>
                                        <Text style={{ fontSize: 11, fontWeight: '900', color: '#92400e' }}>
                                            RETAINED CAPTAIN: {viewingSquadTeam?.captainName || `${viewingSquadTeam?.name} Captain`}
                                        </Text>
                                        <Text style={{ fontSize: 10, color: '#b45309' }}>
                                            Price: ₹{viewingSquadTeam?.captainPrice || (isKtoL ? 3 : 15)} {smallUnit} (Auto-deducted)
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {/* Acquired Players List */}
                            <Text style={[styles.listTitle, { marginTop: 12 }]}>
                                Acquired Players ({players.filter(p => p.soldToTeamId === viewingSquadTeam?._id || p.soldToTeamId === viewingSquadTeam?.id).length})
                            </Text>

                            {players.filter(p => p.soldToTeamId === viewingSquadTeam?._id || p.soldToTeamId === viewingSquadTeam?.id).length === 0 ? (
                                <View style={styles.emptySlotBox}>
                                    <Text style={styles.emptySlotText}>No auction players bought yet.</Text>
                                </View>
                            ) : (
                                players.filter(p => p.soldToTeamId === viewingSquadTeam?._id || p.soldToTeamId === viewingSquadTeam?.id).map(p => (
                                    <View key={p._id} style={styles.squadPlayerCard}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.cardTitle}>{p.name}</Text>
                                            <Text style={styles.cardSub}>{p.category} • {p.battingStyle || 'Right-Hand Bat'}</Text>
                                        </View>
                                        <View style={styles.soldPriceBadge}>
                                            <Text style={styles.soldPriceText}>Sold: ₹{p.soldPrice || p.basePrice} {smallUnit}</Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Tournament Hub Modal */}
            <TournamentHubModal
                visible={hubModalVisible}
                tournament={selectedTournament}
                onClose={() => setHubModalVisible(false)}
                onLaunchConsole={onLaunchConsole}
                onLaunchBiddingRoom={onLaunchBiddingRoom}
                onOpenSpectator={onOpenSpectator}
                onOpenPlayerRegistration={onOpenPlayerRegistration}
                onOpenManageCredentials={(t) => {
                    setSelectedTournament(t);
                    if (t?._id) fetchTournamentDetails(t._id);
                    setCredentialsModalVisible(true);
                }}
                onOpenRoster={() => setActiveTab('teams')}
                onEditTournament={handleOpenEditTournament}
                onDeleteTournament={handleDeleteTournament}
            />

            {/* Manage Credentials Modal */}
            <ManageCredentialsModal
                visible={credentialsModalVisible}
                tournament={selectedTournament}
                tournaments={tournaments}
                onSelectTournament={(t) => setSelectedTournament(t)}
                teams={teams}
                onUpdated={() => {
                    if (selectedTournament?._id) {
                        fetchTournamentDetails(selectedTournament._id);
                    }
                }}
                onClose={() => {
                    setCredentialsModalVisible(false);
                    if (selectedTournament?._id) {
                        fetchTournamentDetails(selectedTournament._id);
                    }
                }}
            />

            {/* Web-Parity Add / Edit Team Modal */}
            <AddTeamModal
                visible={addTeamModalVisible}
                onClose={() => {
                    setAddTeamModalVisible(false);
                    setEditingTeamData(null);
                }}
                tournamentId={selectedTournament?._id}
                tournament={selectedTournament}
                initialData={editingTeamData}
                isEdit={!!editingTeamData}
                onAdded={() => {
                    if (selectedTournament?._id) {
                        fetchTournamentDetails(selectedTournament._id);
                    }
                }}
            />

            {/* Web-Parity Add / Edit Player Modal (Manual + 1:1 Crop + Cricket Styles + CSV Feed Import) */}
            <AddPlayerModal
                visible={addPlayerModalVisible}
                onClose={() => {
                    setAddPlayerModalVisible(false);
                    setEditingPlayerData(null);
                }}
                tournamentId={selectedTournament?._id}
                tournament={selectedTournament}
                initialData={editingPlayerData}
                isEdit={!!editingPlayerData}
                onAdded={() => {
                    if (selectedTournament?._id) {
                        fetchTournamentDetails(selectedTournament._id);
                    }
                }}
            />

            {/* Edit Tournament Modal (1:1 Web Parity) */}
            <Modal
                visible={editTourneyModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setEditTourneyModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <ToastOverlay isModal />
                    <View style={styles.modalContainer}>
                        {/* Fixed Header */}
                        <View style={styles.modalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                <View style={styles.editTourneyIconBox}>
                                    <Trophy size={16} color="#2563eb" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.modalTitle}>Edit Tournament</Text>
                                    <Text style={styles.modalSub} numberOfLines={1}>
                                        Set tournament rules and bidding format
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setEditTourneyModalVisible(false)} style={styles.modalCloseBtn}>
                                <X size={18} color="#475569" />
                            </TouchableOpacity>
                        </View>

                        {/* Smooth Scrollable Body */}
                        <ScrollView
                            style={styles.modalBody}
                            contentContainerStyle={{ paddingBottom: 24 }}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* 1. Tournament Name */}
                            <Text style={styles.fieldLabel}>TOURNAMENT NAME *</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={editTourneyName}
                                onChangeText={setEditTourneyName}
                                placeholder="e.g. IPL Season 2026"
                                placeholderTextColor="#94a3b8"
                            />

                            {/* 2. Start Date & Time */}
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.fieldLabel}>START DATE</Text>
                                    <TextInput
                                        style={styles.modalInput}
                                        value={editTourneyStartDate}
                                        onChangeText={setEditTourneyStartDate}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor="#94a3b8"
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.fieldLabel}>TIME</Text>
                                    <TextInput
                                        style={styles.modalInput}
                                        value={editTourneyTime}
                                        onChangeText={setEditTourneyTime}
                                        placeholder="09:00 AM"
                                        placeholderTextColor="#94a3b8"
                                    />
                                </View>
                            </View>

                            {/* 3. Squad Size Limit per Team */}
                            <View style={styles.fieldHeaderRow}>
                                <Text style={[styles.fieldLabel, { marginBottom: 0 }]}>SQUAD SIZE LIMIT PER TEAM *</Text>
                                <View style={styles.fixedAdminBadge}>
                                    <Text style={styles.fixedAdminText}>Fixed by Admin</Text>
                                </View>
                            </View>
                            <TextInput
                                style={[styles.modalInput, { fontWeight: '900', marginBottom: 3 }]}
                                value={editTourneySquadLimit}
                                onChangeText={setEditTourneySquadLimit}
                                keyboardType="numeric"
                                placeholder="e.g. 15, 18 or 25"
                                placeholderTextColor="#94a3b8"
                            />
                            <Text style={styles.fieldHelperNote}>
                                Strict roster capacity. Teams cannot buy players once limit is reached.
                            </Text>

                            {/* 4. Auction Scale & Currency Unit */}
                            <View style={[styles.fieldHeaderRow, { marginTop: 10 }]}>
                                <Text style={[styles.fieldLabel, { marginBottom: 0 }]}>AUCTION SCALE & CURRENCY UNIT *</Text>
                                <View style={styles.scaleTagBadge}>
                                    <Text style={styles.scaleTagText}>
                                        {editTourneyScale === 'K_TO_L' ? 'Thousands → Lakhs' : 'Lakhs → Crores'}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.richCardRow}>
                                <TouchableOpacity
                                    style={[
                                        styles.richSelectCard,
                                        editTourneyScale === 'K_TO_L' && styles.richSelectCardPurple
                                    ]}
                                    onPress={() => handleSwitchEditScale('K_TO_L')}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.richCardTop}>
                                        <Text style={styles.richCardTitle}>Thousands to Lakhs</Text>
                                        <View style={[styles.unitPill, { backgroundColor: '#ede9fe' }]}>
                                            <Text style={[styles.unitPillText, { color: '#5b21b6' }]}>K → L</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.richCardDesc}>
                                        Bids in <Text style={{ fontWeight: '800', color: '#7c3aed' }}>Thousands (K)</Text>, Purse in{' '}
                                        <Text style={{ fontWeight: '800', color: '#7c3aed' }}>Lakhs (L)</Text>. (Club scale)
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.richSelectCard,
                                        editTourneyScale === 'L_TO_CR' && styles.richSelectCardBlue
                                    ]}
                                    onPress={() => handleSwitchEditScale('L_TO_CR')}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.richCardTop}>
                                        <Text style={styles.richCardTitle}>Lakhs to Crores</Text>
                                        <View style={[styles.unitPill, { backgroundColor: '#dbeafe' }]}>
                                            <Text style={[styles.unitPillText, { color: '#1e40af' }]}>L → Cr</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.richCardDesc}>
                                        Bids in <Text style={{ fontWeight: '800', color: '#2563eb' }}>Lakhs (L)</Text>, Purse in{' '}
                                        <Text style={{ fontWeight: '800', color: '#2563eb' }}>Crores (Cr)</Text>. (IPL scale)
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* 5. Bidding Mode */}
                            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>BIDDING MODE</Text>
                            <View style={styles.richCardRow}>
                                <TouchableOpacity
                                    style={[
                                        styles.richSelectCard,
                                        editTourneyAuctionType === 'owner_driven' && styles.richSelectCardBlue
                                    ]}
                                    onPress={() => setEditTourneyAuctionType('owner_driven')}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.richCardTitle}>Team Owners Bid</Text>
                                    <Text style={[styles.richCardDesc, { marginTop: 3 }]}>
                                        Real-time mobile & web bids.
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.richSelectCard,
                                        editTourneyAuctionType === 'admin_driven' && styles.richSelectCardBlue
                                    ]}
                                    onPress={() => setEditTourneyAuctionType('admin_driven')}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.richCardTitle}>Admin Bids</Text>
                                    <Text style={[styles.richCardDesc, { marginTop: 3 }]}>
                                        Auctioneer enters bids manually.
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* 6. Bid Increment Slabs Section */}
                            <View style={styles.slabsBox}>
                                <View style={styles.slabsHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <TrendingUp size={14} color="#2563eb" />
                                        <Text style={styles.slabsTitle}>BID INCREMENT SLABS</Text>
                                    </View>
                                    <View style={styles.dynamicRulesBadge}>
                                        <Text style={styles.dynamicRulesText}>Dynamic Rules</Text>
                                    </View>
                                </View>
                                <Text style={styles.slabsSub}>
                                    Configure how much bid increases at each price tier:
                                </Text>

                                <View style={styles.slabsGrid}>
                                    {editTourneyBidRules.map((slab, idx) => (
                                        <View key={idx} style={styles.slabItemCard}>
                                            <Text style={styles.slabItemLabel} numberOfLines={1}>
                                                {slab.label}
                                            </Text>
                                            <View style={styles.slabInputRow}>
                                                <Text style={styles.slabCurrencyPrefix}>+₹</Text>
                                                <TextInput
                                                    style={styles.slabInput}
                                                    keyboardType="numeric"
                                                    value={String(slab.increment)}
                                                    onChangeText={(txt) => {
                                                        const val = parseInt(txt) || 0;
                                                        setEditTourneyBidRules(prev => {
                                                            const next = [...prev];
                                                            next[idx] = { ...next[idx], increment: val };
                                                            return next;
                                                        });
                                                    }}
                                                />
                                                <Text style={styles.slabUnitSuffix}>
                                                    {editTourneyScale === 'K_TO_L' ? 'K' : 'L'}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </ScrollView>

                        {/* Fixed Footer */}
                        <View style={styles.editModalFooter}>
                            <TouchableOpacity
                                style={styles.editModalCancelBtn}
                                onPress={() => setEditTourneyModalVisible(false)}
                                disabled={savingTourney}
                            >
                                <Text style={styles.editModalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.editModalSubmitBtn, savingTourney && { opacity: 0.6 }]}
                                onPress={handleSaveEditTournament}
                                disabled={savingTourney}
                            >
                                {savingTourney ? (
                                    <ActivityIndicator size="small" color="#ffffff" />
                                ) : (
                                    <Text style={styles.editModalSubmitText}>Update Tournament</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Edit Player Modal */}
            <Modal
                visible={editPlayerModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setEditPlayerModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <ToastOverlay isModal />
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={styles.modalTitle}>Edit Player Profile</Text>
                                    {editingPlayer?.isCaptain && (
                                        <View style={styles.captainPill}>
                                            <Crown size={10} color="#b45309" />
                                            <Text style={styles.captainPillText}>CAPTAIN</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.modalSub}>{editingPlayer?.name} • {selectedTournament?.name}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setEditPlayerModalVisible(false)} style={styles.modalCloseBtn}>
                                <X size={20} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.modalBody}
                            contentContainerStyle={{ paddingBottom: 160 }}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Profile Image (1:1 Frame) */}
                            <Text style={styles.fieldLabel}>PLAYER PHOTO (1:1 CROP & UPLOAD)</Text>
                            <View style={[styles.logoInputRow, { marginBottom: 12 }]}>
                                <View style={styles.playerAvatarBox}>
                                    <SafeImage
                                        uri={editPlayerImage}
                                        style={styles.playerAvatarImg}
                                        fallback={<User size={22} color="#94a3b8" />}
                                    />
                                </View>
                                <View style={{ flex: 1, gap: 6 }}>
                                    <TouchableOpacity style={styles.uploadBtnSmall} onPress={handlePickEditPlayerImage}>
                                        <Camera size={13} color="#2563eb" />
                                        <Text style={styles.uploadBtnSmallText}>
                                            {editPlayerImage ? 'Change Photo (1:1)' : 'Upload Photo (1:1 Crop)'}
                                        </Text>
                                    </TouchableOpacity>
                                    {editPlayerImage ? (
                                        <TouchableOpacity onPress={() => setEditPlayerImage('')}>
                                            <Text style={styles.clearLogoText}>✕ Remove Photo</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                            </View>

                            <Text style={styles.fieldLabel}>FULL NAME *</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={editPlayerName}
                                onChangeText={setEditPlayerName}
                                placeholder="Player Full Name"
                                placeholderTextColor="#94a3b8"
                            />

                            <Text style={styles.fieldLabel}>CATEGORY / ROLE *</Text>
                            <View style={styles.pickerRow}>
                                {['Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper'].map(cat => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[styles.catPick, editPlayerCategory === cat && styles.catPickActive]}
                                        onPress={() => setEditPlayerCategory(cat)}
                                    >
                                        <Text style={[styles.catPickText, editPlayerCategory === cat && styles.catPickTextActive]}>
                                            {cat.split(' ')[0]}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.fieldLabel}>BATTING STYLE</Text>
                            <View style={styles.pickerRow}>
                                {['Right-Hand Bat', 'Left-Hand Bat'].map(b => (
                                    <TouchableOpacity
                                        key={b}
                                        style={[styles.catPick, editPlayerBattingStyle === b && styles.catPickActive]}
                                        onPress={() => setEditPlayerBattingStyle(b)}
                                    >
                                        <Text style={[styles.catPickText, editPlayerBattingStyle === b && styles.catPickTextActive]}>
                                            {b}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.fieldLabel}>BOWLING STYLE</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={editPlayerBowlingStyle}
                                onChangeText={setEditPlayerBowlingStyle}
                                placeholder="e.g. Right-Arm Fast / Off Spin"
                                placeholderTextColor="#94a3b8"
                            />

                            <Text style={styles.fieldLabel}>
                                {editingPlayer?.isCaptain ? `RETAINED CAPTAIN PRICE (₹ ${smallName.toUpperCase()}) *` : `BASE PRICE (₹ ${smallName.toUpperCase()}) *`}
                            </Text>
                            <TextInput
                                style={styles.modalInput}
                                value={editPlayerBasePrice}
                                onChangeText={setEditPlayerBasePrice}
                                keyboardType="numeric"
                                placeholder="e.g. 20"
                                placeholderTextColor="#94a3b8"
                            />

                            <Text style={styles.fieldLabel}>AGE</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={editPlayerAge}
                                onChangeText={setEditPlayerAge}
                                keyboardType="numeric"
                                placeholder="e.g. 24"
                                placeholderTextColor="#94a3b8"
                            />

                            <Text style={styles.fieldLabel}>CRICHEROES PROFILE URL</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={editPlayerCricHeroes}
                                onChangeText={setEditPlayerCricHeroes}
                                placeholder="https://cricheroes.in/player/..."
                                placeholderTextColor="#94a3b8"
                                autoCapitalize="none"
                            />

                            <Text style={styles.fieldLabel}>CAREER STATS</Text>
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.statMiniLabel}>MATCHES</Text>
                                    <TextInput
                                        style={[styles.modalInput, { textAlign: 'center' }]}
                                        value={editPlayerMatches}
                                        onChangeText={setEditPlayerMatches}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.statMiniLabel}>RUNS</Text>
                                    <TextInput
                                        style={[styles.modalInput, { textAlign: 'center' }]}
                                        value={editPlayerRuns}
                                        onChangeText={setEditPlayerRuns}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.statMiniLabel}>WICKETS</Text>
                                    <TextInput
                                        style={[styles.modalInput, { textAlign: 'center' }]}
                                        value={editPlayerWickets}
                                        onChangeText={setEditPlayerWickets}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.modalSaveBtn, savingPlayer && { opacity: 0.7 }]}
                                onPress={handleSaveEditPlayer}
                                disabled={savingPlayer}
                            >
                                {savingPlayer ? (
                                    <ActivityIndicator size="small" color="#ffffff" />
                                ) : (
                                    <>
                                        <Save size={16} color="#ffffff" />
                                        <Text style={styles.modalSaveBtnText}>Save Player Changes</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setEditPlayerModalVisible(false)}
                                disabled={savingPlayer}
                            >
                                <Text style={styles.modalCancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Tournament Selector Dropdown Modal */}
            <Modal
                visible={tourneyDropdownVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setTourneyDropdownVisible(false)}
            >
                <TouchableOpacity
                    style={styles.dropdownModalOverlay}
                    activeOpacity={1}
                    onPress={() => setTourneyDropdownVisible(false)}
                >
                    <View style={styles.dropdownModalCard}>
                        <View style={styles.dropdownModalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Trophy size={16} color="#2563eb" />
                                <Text style={styles.dropdownModalTitle}>Select Tournament</Text>
                            </View>
                            <TouchableOpacity onPress={() => setTourneyDropdownVisible(false)} style={styles.modalCloseBtn}>
                                <X size={18} color="#64748b" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                            {tournaments.map(t => {
                                const isSelected = selectedTournament?._id === t._id;
                                return (
                                    <TouchableOpacity
                                        key={t._id}
                                        style={[styles.dropdownOptionRow, isSelected && styles.dropdownOptionRowActive]}
                                        onPress={() => {
                                            setSelectedTournament(t);
                                            setTourneyDropdownVisible(false);
                                        }}
                                    >
                                        <View style={{ flex: 1, paddingRight: 8 }}>
                                            <Text style={[styles.dropdownOptionName, isSelected && styles.dropdownOptionNameActive]}>
                                                {t.name}
                                            </Text>
                                            <Text style={styles.dropdownOptionMeta}>
                                                {t.status === 'completed' ? '🏆 Completed' : (t.status === 'live' || t.status === 'active') ? '● Live' : '○ Upcoming'} • Squad: {t.squadSizeLimit || 25} • {t.budgetScale === 'K_TO_L' ? 'K → L Scale' : 'L → Cr Scale'}
                                            </Text>
                                        </View>
                                        {isSelected && (
                                            <View style={styles.dropdownCheckBadge}>
                                                <Check size={14} color="#ffffff" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    safeTop: {
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        backgroundColor: '#ffffff',
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    brandBadge: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: '#2563eb',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#0f172a',
    },
    headerSub: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '600',
    },
    logoutBtn: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
    },
    selectorStrip: {
        backgroundColor: '#ffffff',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    selectorLabel: {
        fontSize: 9,
        fontWeight: '900',
        color: '#94a3b8',
        letterSpacing: 0.8,
        marginBottom: 6,
    },
    dropdownTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    dropdownLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    dropdownBadge: {
        width: 34,
        height: 34,
        borderRadius: 8,
        backgroundColor: '#eff6ff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dropdownTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0f172a',
    },
    dropdownSub: {
        fontSize: 11,
        color: '#64748b',
        marginTop: 2,
    },
    dropdownRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#ffffff',
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    dropdownSwitchText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#2563eb',
    },
    tabBarRow: {
        flexDirection: 'row',
        width: '100%',
        backgroundColor: '#ffffff',
    },
    dropdownModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    dropdownModalCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        width: '100%',
        maxHeight: '80%',
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 8,
    },
    dropdownModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        marginBottom: 8,
    },
    dropdownModalTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0f172a',
    },
    dropdownOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        marginBottom: 8,
        backgroundColor: '#ffffff',
    },
    dropdownOptionRowActive: {
        borderColor: '#2563eb',
        backgroundColor: '#eff6ff',
    },
    dropdownOptionName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0f172a',
    },
    dropdownOptionNameActive: {
        color: '#2563eb',
        fontWeight: '800',
    },
    dropdownOptionMeta: {
        fontSize: 11,
        color: '#64748b',
        marginTop: 3,
    },
    dropdownCheckBadge: {
        marginLeft: 8,
    },
    selectorScroll: {
        gap: 6,
    },
    pill: {
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    pillActive: {
        backgroundColor: '#eff6ff',
        borderColor: '#2563eb',
    },
    pillText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#475569',
    },
    pillTextActive: {
        color: '#2563eb',
        fontWeight: '800',
    },
    tabBarContainer: {
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    tabScroll: {
        paddingHorizontal: 12,
        gap: 6,
    },
    tabItem: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 2,
        gap: 3,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabItemActive: {
        borderBottomColor: '#2563eb',
    },
    tabItemActivePurple: {
        borderBottomColor: '#7c3aed',
    },
    tabItemActiveAmber: {
        borderBottomColor: '#d97706',
    },
    tabText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#64748b',
        textAlign: 'center',
    },
    tabTextActive: {
        color: '#2563eb',
        fontWeight: '900',
    },
    content: {
        padding: 16,
        paddingBottom: 280,
    },
    kpiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 14,
    },
    kpiCard: {
        flex: 1,
        minWidth: '46%',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 14,
        padding: 12,
    },
    kpiHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    kpiLabel: {
        fontSize: 9,
        fontWeight: '900',
        color: '#94a3b8',
        letterSpacing: 0.5,
    },
    kpiValue: {
        fontSize: 20,
        fontWeight: '900',
        color: '#0f172a',
    },
    kpiSub: {
        fontSize: 10,
        color: '#64748b',
        fontWeight: '500',
        marginTop: 1,
    },
    filterChipRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 14,
    },
    filterChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    filterChipActive: {
        backgroundColor: '#eff6ff',
        borderColor: '#2563eb',
    },
    filterChipActivePurple: {
        backgroundColor: '#f5f3ff',
        borderColor: '#7c3aed',
    },
    filterChipText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#475569',
    },
    filterChipTextActive: {
        color: '#2563eb',
        fontWeight: '900',
    },
    filterChipScroll: {
        gap: 6,
        marginBottom: 10,
    },
    statusFilterChip: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    statusFilterChipActive: {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
    },
    statusFilterChipText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#64748b',
    },
    statusFilterChipTextActive: {
        color: '#ffffff',
        fontWeight: '900',
    },
    scopeBanner: {
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#bfdbfe',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    scopeBannerText: {
        fontSize: 11,
        color: '#1e40af',
        fontWeight: '600',
        flex: 1,
    },
    formCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
    },
    formCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    formTitle: {
        fontSize: 11,
        fontWeight: '900',
        color: '#0f172a',
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 9,
        fontSize: 13,
        color: '#0f172a',
        marginBottom: 8,
        fontWeight: '600',
    },
    inputLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#64748b',
        letterSpacing: 0.5,
        marginBottom: 4,
        marginTop: 2,
    },
    scaleOptionBtn: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scaleOptionBtnActive: {
        borderColor: '#2563eb',
        backgroundColor: '#eff6ff',
    },
    scaleOptionText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#64748b',
    },
    scaleOptionTextActive: {
        color: '#2563eb',
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    checkboxLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0f172a',
    },
    checkboxSub: {
        fontSize: 10,
        color: '#64748b',
        fontWeight: '500',
    },
    deductionBox: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        padding: 10,
        marginBottom: 8,
    },
    calcText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#475569',
        marginTop: 4,
    },
    calcHighlight: {
        fontWeight: '900',
        color: '#2563eb',
    },
    addBtn: {
        backgroundColor: '#2563eb',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 11,
        borderRadius: 10,
        gap: 6,
        marginTop: 2,
    },
    addBtnText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '800',
    },
    listTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: '#0f172a',
        marginBottom: 4,
    },
    listHint: {
        fontSize: 11,
        color: '#64748b',
        marginBottom: 12,
    },
    tourneyCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    tourneyCardSelected: {
        borderColor: '#2563eb',
        backgroundColor: '#fafcff',
    },
    tourneyCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    tourneyName: {
        fontSize: 15,
        fontWeight: '900',
        color: '#0f172a',
    },
    tourneyMeta: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '500',
        marginTop: 2,
    },
    statusBadge: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    statusLive: {
        backgroundColor: '#fef2f2',
    },
    statusText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#64748b',
    },
    statusTextLive: {
        color: '#dc2626',
    },
    statusCompleted: {
        backgroundColor: '#fef3c7',
        borderWidth: 1,
        borderColor: '#fde68a',
    },
    statusTextCompleted: {
        color: '#b45309',
        fontWeight: '900',
    },
    deleteTourneyBtn: {
        padding: 5,
        borderRadius: 6,
        backgroundColor: '#fee2e2',
    },
    actionChipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    actionChipPrimary: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2563eb',
        paddingHorizontal: 9,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
    },
    actionChipPrimaryText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#ffffff',
    },
    actionChipPurple: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f3ff',
        borderWidth: 1,
        borderColor: '#ddd6fe',
        paddingHorizontal: 9,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
    },
    actionChipPurpleText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#7c3aed',
    },
    actionChipAmber: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fffbeb',
        borderWidth: 1,
        borderColor: '#fde68a',
        paddingHorizontal: 9,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
    },
    actionChipAmberText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#b45309',
    },
    actionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
    },
    actionChipText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#334155',
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 10,
    },
    captainCard: {
        backgroundColor: '#fffbeb',
        borderColor: '#fde68a',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0f172a',
    },
    cardSub: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '500',
        marginTop: 2,
    },
    codeBadge: {
        backgroundColor: '#eff6ff',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    codeBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#1d4ed8',
    },
    captainBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fef3c7',
        borderWidth: 1,
        borderColor: '#fde68a',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        marginBottom: 8,
        gap: 6,
    },
    captainBannerText: {
        fontSize: 11,
        color: '#92400e',
        fontWeight: '600',
        flex: 1,
    },
    statsStrip: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        padding: 8,
        marginTop: 4,
    },
    statItem: {
        fontSize: 10,
        color: '#64748b',
        fontWeight: '600',
    },
    statBold: {
        fontWeight: '800',
        color: '#0f172a',
    },
    teamRosterFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    squadLimitNote: {
        fontSize: 10,
        color: '#64748b',
        fontWeight: '600',
    },
    viewSquadLink: {
        fontSize: 11,
        fontWeight: '800',
        color: '#2563eb',
    },
    deleteIcon: {
        padding: 4,
    },
    pickerRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 8,
    },
    catPick: {
        flex: 1,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        paddingVertical: 6,
        borderRadius: 8,
        alignItems: 'center',
    },
    catPickActive: {
        backgroundColor: '#eff6ff',
        borderColor: '#2563eb',
    },
    catPickActivePurple: {
        backgroundColor: '#f5f3ff',
        borderColor: '#7c3aed',
    },
    catPickText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#475569',
    },
    catPickTextActive: {
        color: '#2563eb',
        fontWeight: '900',
    },
    publicFormLinkBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: '#eff6ff',
        borderRadius: 6,
    },
    publicFormLinkText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#2563eb',
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 7,
        gap: 6,
        marginBottom: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 12,
        color: '#0f172a',
        fontWeight: '600',
        padding: 0,
    },
    captainPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fef3c7',
        borderWidth: 1,
        borderColor: '#fde68a',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        gap: 4,
    },
    captainPillText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#b45309',
    },
    logoInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 10,
    },
    logoPreviewBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    logoPreviewImg: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    playerAvatarBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    playerAvatarImg: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    uploadBtnSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#bfdbfe',
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    uploadBtnSmallText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#2563eb',
    },
    clearLogoText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#dc2626',
        marginTop: 2,
    },
    teamHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    teamLogoBox: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    teamLogoBoxSmall: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    teamLogoImg: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    teamLogoFallbackText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#2563eb',
    },
    teamLogoFallbackTextSmall: {
        fontSize: 10,
        fontWeight: '900',
        color: '#2563eb',
    },
    unsoldSection: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    unsoldHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    unsoldTitle: {
        fontSize: 13,
        fontWeight: '900',
        color: '#0f172a',
    },
    unsoldSub: {
        fontSize: 10,
        color: '#64748b',
        fontWeight: '500',
        marginTop: 1,
    },
    reAuctionBadge: {
        backgroundColor: '#fee2e2',
        borderWidth: 1,
        borderColor: '#fca5a5',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 6,
    },
    reAuctionBadgeText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#b91c1c',
    },
    reAuctionActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#2563eb',
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 8,
    },
    reAuctionActionBtnText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#ffffff',
    },
    unsoldPlayerCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#fee2e2',
        borderRadius: 12,
        padding: 10,
        marginBottom: 6,
    },
    unsoldPlayerName: {
        fontSize: 12,
        fontWeight: '800',
        color: '#0f172a',
    },
    unsoldPlayerMeta: {
        fontSize: 10,
        color: '#64748b',
        marginTop: 2,
    },
    unsoldTag: {
        backgroundColor: '#fee2e2',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    unsoldTagText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#b91c1c',
    },
    emptySlotBox: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#cbd5e1',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    emptySlotText: {
        fontSize: 11,
        color: '#94a3b8',
        fontWeight: '600',
        textAlign: 'center',
    },
    slotCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    slotCardActive: {
        backgroundColor: '#f5f3ff',
        borderColor: '#7c3aed',
    },
    slotName: {
        fontSize: 13,
        fontWeight: '900',
        color: '#0f172a',
    },
    slotMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    slotPriceBadge: {
        backgroundColor: '#f5f3ff',
        borderWidth: 1,
        borderColor: '#ddd6fe',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
    },
    slotPriceText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#7c3aed',
    },
    slotSub: {
        fontSize: 10,
        color: '#64748b',
        fontWeight: '600',
    },
    reAuctionTag: {
        backgroundColor: '#fef3c7',
        borderWidth: 1,
        borderColor: '#fde68a',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    reAuctionTagText: {
        fontSize: 8,
        fontWeight: '900',
        color: '#92400e',
    },
    slotTargetPanel: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 16,
        padding: 14,
        marginTop: 12,
    },
    slotTargetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f5f3ff',
        borderWidth: 1,
        borderColor: '#ddd6fe',
        borderRadius: 12,
        padding: 12,
    },
    slotTargetLabel: {
        fontSize: 9,
        fontWeight: '900',
        color: '#7c3aed',
        letterSpacing: 0.5,
    },
    slotTargetTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: '#0f172a',
        marginTop: 2,
    },
    slotTargetSub: {
        fontSize: 10,
        color: '#6d28d9',
        marginTop: 2,
        fontWeight: '600',
    },
    slotTargetPriceBox: {
        alignItems: 'flex-end',
    },
    slotTargetPriceVal: {
        fontSize: 18,
        fontWeight: '900',
        color: '#6d28d9',
    },
    slotTargetPriceUnit: {
        fontSize: 10,
        fontWeight: '800',
        color: '#7c3aed',
    },
    assignedPlayerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        padding: 10,
        marginTop: 6,
    },
    assignedPlayerName: {
        fontSize: 12,
        fontWeight: '800',
        color: '#0f172a',
    },
    assignedPlayerMeta: {
        fontSize: 10,
        color: '#64748b',
        marginTop: 1,
    },
    removeSlotBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: '#fee2e2',
        borderRadius: 6,
    },
    removeSlotBtnText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#dc2626',
    },
    alreadyShiftedBadge: {
        backgroundColor: '#f5f3ff',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    alreadyShiftedText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#7c3aed',
    },
    unassignedPlayerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        padding: 10,
        marginTop: 6,
    },
    shiftBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#7c3aed',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 8,
    },
    shiftBtnText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#ffffff',
    },
    shareLinksCard: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 16,
        padding: 14,
        marginBottom: 14,
    },
    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        gap: 8,
    },
    linkTitle: {
        fontSize: 11,
        fontWeight: '800',
        color: '#0f172a',
    },
    linkSub: {
        fontSize: 10,
        color: '#64748b',
        marginTop: 2,
    },
    copyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#bfdbfe',
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 8,
    },
    copyBtnText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#2563eb',
    },
    credDetailsBox: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        padding: 8,
        marginTop: 6,
    },
    credText: {
        fontSize: 11,
        color: '#475569',
    },
    squadPlayerCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        padding: 10,
        marginBottom: 6,
    },
    soldPriceBadge: {
        backgroundColor: '#dcfce7',
        borderWidth: 1,
        borderColor: '#bbf7d0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    soldPriceText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#15803d',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '92%',
        paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#0f172a',
    },
    modalSub: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '600',
        marginTop: 2,
    },
    modalCloseBtn: {
        padding: 6,
        borderRadius: 8,
        backgroundColor: '#f8fafc',
    },
    modalBody: {
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    fieldLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: '#64748b',
        letterSpacing: 0.8,
        marginBottom: 6,
        marginTop: 8,
    },
    statMiniLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#94a3b8',
        textAlign: 'center',
        marginBottom: 4,
    },
    modalInput: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 9,
        fontSize: 13,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 4,
    },
    modalSaveBtn: {
        backgroundColor: '#2563eb',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 13,
        borderRadius: 12,
        marginTop: 14,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    modalSaveBtnText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '900',
    },
    modalCancelBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 11,
        borderRadius: 12,
        marginTop: 6,
        marginBottom: 10,
    },
    modalCancelBtnText: {
        color: '#64748b',
        fontSize: 12,
        fontWeight: '700',
    },
    editTourneyIconBox: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#dbeafe',
        alignItems: 'center',
        justifyContent: 'center',
    },
    fieldHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    fixedAdminBadge: {
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#dbeafe',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 5,
    },
    fixedAdminText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#2563eb',
    },
    fieldHelperNote: {
        fontSize: 10,
        color: '#94a3b8',
        fontWeight: '500',
        marginBottom: 4,
    },
    scaleTagBadge: {
        backgroundColor: '#faf5ff',
        borderWidth: 1,
        borderColor: '#e9d5ff',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 5,
    },
    scaleTagText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#7e22ce',
    },
    richCardRow: {
        flexDirection: 'row',
        gap: 8,
    },
    richSelectCard: {
        flex: 1,
        padding: 10,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
    },
    richSelectCardPurple: {
        backgroundColor: '#faf5ff',
        borderColor: '#a855f7',
    },
    richSelectCardBlue: {
        backgroundColor: '#eff6ff',
        borderColor: '#3b82f6',
    },
    richCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    richCardTitle: {
        fontSize: 11,
        fontWeight: '900',
        color: '#0f172a',
        flex: 1,
    },
    unitPill: {
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 5,
    },
    unitPillText: {
        fontSize: 9,
        fontWeight: '900',
    },
    richCardDesc: {
        fontSize: 9.5,
        color: '#64748b',
        lineHeight: 13,
    },
    slabsBox: {
        marginTop: 14,
        padding: 12,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 14,
    },
    slabsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    slabsTitle: {
        fontSize: 10,
        fontWeight: '900',
        color: '#0f172a',
        letterSpacing: 0.5,
    },
    dynamicRulesBadge: {
        backgroundColor: '#dbeafe',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 5,
    },
    dynamicRulesText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#1d4ed8',
    },
    slabsSub: {
        fontSize: 10,
        color: '#64748b',
        fontWeight: '500',
        marginBottom: 10,
    },
    slabsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    slabItemCard: {
        width: '48%',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        padding: 8,
    },
    slabItemLabel: {
        fontSize: 9.5,
        fontWeight: '800',
        color: '#475569',
        marginBottom: 5,
    },
    slabInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    slabCurrencyPrefix: {
        fontSize: 11,
        fontWeight: '800',
        color: '#94a3b8',
    },
    slabInput: {
        flex: 1,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 4,
        fontSize: 12,
        fontWeight: '900',
        color: '#0f172a',
    },
    slabUnitSuffix: {
        fontSize: 10,
        fontWeight: '800',
        color: '#64748b',
    },
    editModalFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#f8fafc',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    editModalCancelBtn: {
        paddingHorizontal: 14,
        paddingVertical: 9,
    },
    editModalCancelText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748b',
    },
    editModalSubmitBtn: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    editModalSubmitText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '900',
    },
});

export default SuperAdminScreen;
