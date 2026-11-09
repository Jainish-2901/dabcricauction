import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    TextInput,
    Alert,
    ActivityIndicator,
    Platform,
    KeyboardAvoidingView,
    Image
} from 'react-native';
import {
    KeyRound,
    Users,
    Shield,
    Copy,
    Save,
    X,
    Check,
    Plus,
    Trash2,
    Edit2,
    Eye,
    EyeOff,
    Crown,
    Sparkles,
    Camera,
    User
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch, getApiUrl } from '../lib/api';

interface ManageCredentialsModalProps {
    visible: boolean;
    tournament: any;
    tournaments?: any[];
    onSelectTournament?: (t: any) => void;
    teams?: any[];
    onClose: () => void;
}

export const ManageCredentialsModal: React.FC<ManageCredentialsModalProps> = ({
    visible,
    tournament,
    tournaments = [],
    onSelectTournament,
    teams = [],
    onClose
}) => {
    const [currentTournament, setCurrentTournament] = useState(tournament);
    const [loading, setLoading] = useState(false);
    const [credentialsList, setCredentialsList] = useState<any[]>([]);
    const [copied, setCopied] = useState(false);
    const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});

    useEffect(() => {
        if (tournament) {
            setCurrentTournament(tournament);
        } else if (tournaments.length > 0 && !currentTournament) {
            setCurrentTournament(tournaments[0]);
        }
    }, [tournament, tournaments]);

    // Add / Edit Form Modal
    const [formVisible, setFormVisible] = useState(false);
    const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [formRole, setFormRole] = useState<'team_owner' | 'auctioneer'>('team_owner');
    const [formTeamId, setFormTeamId] = useState<string>('');
    const [formUsername, setFormUsername] = useState('');
    const [formPassword, setFormPassword] = useState('');

    // Captain details for Team Owner
    const [captainName, setCaptainName] = useState('');
    const [captainPhoto, setCaptainPhoto] = useState('');
    const [category, setCategory] = useState('All-Rounder');
    const [battingStyle, setBattingStyle] = useState('Right Handed');
    const [bowlingStyle, setBowlingStyle] = useState('Right-arm Fast');
    const [captainPrice, setCaptainPrice] = useState('15');
    const [age, setAge] = useState('28');
    const [cricHeroesProfileUrl, setCricHeroesProfileUrl] = useState('');

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (visible && currentTournament?._id) {
            fetchCredentials();
        }
    }, [visible, currentTournament?._id]);

    const fetchCredentials = async () => {
        if (!currentTournament?._id) return;
        setLoading(true);
        try {
            const res = await apiFetch(`/api/tournaments/${currentTournament._id}/credentials`);
            if (res.ok) {
                const data = await res.json();
                if (data.credentials && Array.isArray(data.credentials)) {
                    setCredentialsList(data.credentials);
                } else {
                    setCredentialsList([]);
                }
            } else {
                setCredentialsList([]);
            }
        } catch {
            setCredentialsList([]);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAdd = () => {
        setFormMode('add');
        setSelectedUserId(null);
        setFormRole('team_owner');
        setFormTeamId(teams[0]?._id || '');
        setFormUsername('');
        setFormPassword('');
        setCaptainName('');
        setCaptainPhoto('');
        setCategory('All-Rounder');
        setBattingStyle('Right Handed');
        setBowlingStyle('Right-arm Fast');
        setCaptainPrice('15');
        setAge('28');
        setCricHeroesProfileUrl('');
        setFormVisible(true);
    };

    const pickCaptainImageWithCrop = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Gallery access permission is needed to pick captain photo.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
                base64: true
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                const base64Uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
                setCaptainPhoto(base64Uri);
            }
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to select image');
        }
    };

    const handleOpenEdit = (cred: any) => {
        setFormMode('edit');
        setSelectedUserId(cred._id);
        setFormRole(cred.role);
        setFormTeamId(cred.teamId || '');
        setFormUsername(cred.username);
        setFormPassword(cred.plainPassword || '');
        setCaptainName(cred.captainName || cred.username || '');
        setCaptainPhoto(cred.captainPhoto || cred.image || '');
        setCategory(cred.category || 'All-Rounder');
        setBattingStyle(cred.battingStyle || 'Right Handed');
        setBowlingStyle(cred.bowlingStyle || 'Right-arm Fast');
        setCaptainPrice((cred.captainPrice || 15).toString());
        setAge((cred.age || 28).toString());
        setCricHeroesProfileUrl(cred.cricHeroesProfileUrl || '');
        setFormVisible(true);
    };

    const handleDelete = async (userId: string, username: string) => {
        Alert.alert(
            'Confirm Delete',
            `Delete credentials for "${username}"? Associated captain player will also be removed.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiFetch(`/api/tournaments/${currentTournament._id}/credentials/${userId}`, {
                                method: 'DELETE'
                            });
                        } catch {}
                        setCredentialsList(prev => prev.filter(c => c._id !== userId));
                    }
                }
            ]
        );
    };

    const handleSaveForm = async () => {
        if (!formUsername.trim() || !formPassword.trim()) {
            Alert.alert('Required', 'Username and password are required.');
            return;
        }

        if (formRole === 'team_owner' && !formTeamId) {
            Alert.alert('Required', 'Please select a team for this owner & captain.');
            return;
        }

        setSaving(true);

        const payload = {
            role: formRole,
            teamId: formRole === 'team_owner' ? formTeamId : null,
            username: formUsername.trim(),
            password: formPassword.trim(),
            captainName: formRole === 'team_owner' ? (captainName || formUsername).trim() : undefined,
            captainPhoto: formRole === 'team_owner' ? (captainPhoto.trim() || undefined) : undefined,
            category: formRole === 'team_owner' ? category : undefined,
            battingStyle: formRole === 'team_owner' ? battingStyle : undefined,
            bowlingStyle: formRole === 'team_owner' ? bowlingStyle : undefined,
            captainPrice: formRole === 'team_owner' ? (Number(captainPrice) || 0) : 0,
            age: formRole === 'team_owner' ? (Number(age) || 28) : undefined,
            cricHeroesProfileUrl: formRole === 'team_owner' ? cricHeroesProfileUrl.trim() : undefined
        };

        try {
            if (formMode === 'add') {
                const res = await apiFetch(`/api/tournaments/${currentTournament._id}/credentials/add`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) {
                    let errMsg = 'Failed to add credential';
                    try {
                        const err = await res.json();
                        errMsg = err.message || errMsg;
                    } catch {
                        const txt = await res.text();
                        if (txt && !txt.startsWith('<')) errMsg = txt;
                    }
                    throw new Error(errMsg);
                }
            } else {
                const res = await apiFetch(`/api/tournaments/${currentTournament._id}/credentials/${selectedUserId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) {
                    let errMsg = 'Failed to update credential';
                    try {
                        const err = await res.json();
                        errMsg = err.message || errMsg;
                    } catch {
                        const txt = await res.text();
                        if (txt && !txt.startsWith('<')) errMsg = txt;
                    }
                    throw new Error(errMsg);
                }
            }
            setFormVisible(false);
            fetchCredentials();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Operation failed');
        } finally {
            setSaving(false);
        }
    };

    const handleCopyAll = () => {
        let text = `🏏 Dab Cric Auction Credentials - ${currentTournament?.name || 'Tournament'}\n`;
        text += `====================================\n\n`;
        
        credentialsList.forEach(c => {
            const role = c.role === 'auctioneer' ? 'Official Auctioneer' : `Captain: ${c.captainName || c.username} (${c.teamName || 'Team'})`;
            text += `• ${role}:\n`;
            text += `  User: ${c.username} | Pass: ${c.plainPassword || '••••••••'}\n\n`;
        });
        const webUrl = process.env.EXPO_PUBLIC_WEB_URL || 'https://dabcricauction.vercel.app';
        text += `====================================\n`;
        text += `🌐 Web Login: ${webUrl}/login\n`;
        text += `📱 Mobile App: Enter same credentials`;

        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
        Alert.alert('Credentials Summary', text);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalOverlay}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
            >
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerTitleWrap}>
                            <KeyRound size={20} color="#2563eb" />
                            <View style={{ marginLeft: 8, flex: 1 }}>
                                <Text style={styles.headerTitle}>Tournament Credentials & Captains</Text>
                                <Text style={styles.headerSub} numberOfLines={1}>{currentTournament?.name}</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={20} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    {/* Tournament Switcher Strip */}
                    {tournaments && tournaments.length > 1 && (
                        <View style={styles.tourneySwitchStrip}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                                {tournaments.map(t => {
                                    const isSel = currentTournament?._id === t._id;
                                    return (
                                        <TouchableOpacity
                                            key={t._id}
                                            style={[styles.tPill, isSel && styles.tPillActive]}
                                            onPress={() => {
                                                setCurrentTournament(t);
                                                if (onSelectTournament) onSelectTournament(t);
                                            }}
                                        >
                                            <Text style={[styles.tPillText, isSel && styles.tPillTextActive]} numberOfLines={1}>
                                                {t.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    )}

                    {/* Top Action Bar */}
                    <View style={styles.actionBar}>
                        <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd}>
                            <Plus size={16} color="#ffffff" />
                            <Text style={styles.addBtnText}>Add Owner & Captain</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.copyBtn} onPress={handleCopyAll}>
                            <Copy size={14} color="#334155" />
                            <Text style={styles.copyBtnText}>{copied ? 'Copied' : 'Share'}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Content List */}
                    {loading ? (
                        <View style={styles.centerBox}>
                            <ActivityIndicator size="large" color="#2563eb" />
                            <Text style={styles.loadingText}>Loading credentials...</Text>
                        </View>
                    ) : credentialsList.length === 0 ? (
                        <View style={styles.centerBox}>
                            <KeyRound size={36} color="#cbd5e1" />
                            <Text style={{ fontSize: 14, fontWeight: '800', color: '#475569', marginTop: 10 }}>No Credentials Yet</Text>
                            <Text style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 4 }}>
                                Tap "Add Owner & Captain" to create team logins and enroll captains.
                            </Text>
                        </View>
                    ) : (
                        <ScrollView
                            style={styles.body}
                            contentContainerStyle={{ paddingBottom: 160 }}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            automaticallyAdjustKeyboardInsets={true}
                            keyboardDismissMode="on-drag"
                        >
                            {credentialsList.map((cred) => {
                                const isAuc = cred.role === 'auctioneer';
                                const isVisible = !!showPasswords[cred._id];
                                return (
                                    <View key={cred._id} style={styles.credCard}>
                                        <View style={styles.credCardTop}>
                                            <View style={styles.roleTagWrap}>
                                                <View style={[styles.roleBadge, isAuc ? styles.roleBadgeAuc : styles.roleBadgeTeam]}>
                                                    <Text style={[styles.roleBadgeText, isAuc ? styles.roleBadgeTextAuc : styles.roleBadgeTextTeam]}>
                                                        {isAuc ? '👑 AUCTIONEER' : `🏏 ${cred.shortName || 'TEAM OWNER'}`}
                                                    </Text>
                                                </View>
                                                <Text style={styles.teamTitle} numberOfLines={1}>
                                                    {cred.teamName || (isAuc ? 'Official Auctioneer' : 'Team')}
                                                </Text>
                                                {!isAuc && (
                                                    <View style={styles.capStrip}>
                                                        <Crown size={11} color="#d97706" />
                                                        <Text style={styles.capStripText}>
                                                            Captain: {cred.captainName || cred.username} (₹{cred.captainPrice || 0} Cr)
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>

                                            <View style={styles.cardActions}>
                                                <TouchableOpacity
                                                    style={styles.iconAction}
                                                    onPress={() => handleOpenEdit(cred)}
                                                >
                                                    <Edit2 size={14} color="#2563eb" />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.iconAction}
                                                    onPress={() => handleDelete(cred._id, cred.username)}
                                                >
                                                    <Trash2 size={14} color="#dc2626" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        {/* Credentials Pill Box */}
                                        <View style={styles.credDetailsBox}>
                                            <View style={styles.credRow}>
                                                <Text style={styles.credLabel}>USERNAME</Text>
                                                <Text style={styles.credValue}>{cred.username}</Text>
                                            </View>
                                            <View style={styles.divider} />
                                            <View style={styles.credRow}>
                                                <Text style={styles.credLabel}>PASSWORD</Text>
                                                <View style={styles.pwWrap}>
                                                    <Text style={styles.credValue}>
                                                        {isVisible ? (cred.plainPassword || 'Not Set') : '••••••••'}
                                                    </Text>
                                                    <TouchableOpacity
                                                        onPress={() => setShowPasswords(prev => ({ ...prev, [cred._id]: !prev[cred._id] }))}
                                                        style={{ padding: 4 }}
                                                    >
                                                        {isVisible ? <EyeOff size={14} color="#64748b" /> : <Eye size={14} color="#64748b" />}
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    )}

                    {/* Add / Edit Drawer Modal */}
                    {formVisible && (
                        <Modal visible={formVisible} transparent animationType="slide">
                            <View style={styles.formOverlay}>
                                <View style={styles.formContainer}>
                                    <View style={styles.formHeader}>
                                        <Text style={styles.formTitle}>
                                            {formMode === 'add' ? 'Add Owner & Captain' : 'Edit Credential & Captain'}
                                        </Text>
                                        <TouchableOpacity onPress={() => setFormVisible(false)}>
                                            <X size={18} color="#64748b" />
                                        </TouchableOpacity>
                                    </View>

                                    <ScrollView
                                        showsVerticalScrollIndicator={false}
                                        style={{ maxHeight: 500 }}
                                        contentContainerStyle={{ paddingBottom: 180 }}
                                        keyboardShouldPersistTaps="handled"
                                        automaticallyAdjustKeyboardInsets={true}
                                        keyboardDismissMode="on-drag"
                                    >
                                        {/* Role Selection */}
                                        <Text style={styles.inputLabel}>ROLE TYPE</Text>
                                        <View style={styles.roleChoiceRow}>
                                            <TouchableOpacity
                                                style={[styles.roleChoice, formRole === 'team_owner' && styles.roleChoiceActive]}
                                                onPress={() => setFormRole('team_owner')}
                                            >
                                                <Text style={[styles.roleChoiceText, formRole === 'team_owner' && styles.roleChoiceTextActive]}>
                                                    🏏 Owner & Captain
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.roleChoice, formRole === 'auctioneer' && styles.roleChoiceActive]}
                                                onPress={() => setFormRole('auctioneer')}
                                            >
                                                <Text style={[styles.roleChoiceText, formRole === 'auctioneer' && styles.roleChoiceTextActive]}>
                                                    👑 Auctioneer
                                                </Text>
                                            </TouchableOpacity>
                                        </View>

                                        {/* Team Selection for Owner */}
                                        {formRole === 'team_owner' && (
                                            <>
                                                <Text style={styles.inputLabel}>ASSIGN TO TEAM *</Text>
                                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                                                    {teams.map(t => {
                                                        const isSel = formTeamId === t._id;
                                                        return (
                                                            <TouchableOpacity
                                                                key={t._id}
                                                                style={[styles.teamSelectPill, isSel && styles.teamSelectPillActive]}
                                                                onPress={() => setFormTeamId(t._id)}
                                                            >
                                                                <Text style={[styles.teamSelectPillText, isSel && styles.teamSelectPillTextActive]}>
                                                                    {t.name} ({t.shortName || 'TM'})
                                                                </Text>
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                                </ScrollView>

                                                {/* Captain Banner */}
                                                <View style={styles.captainBanner}>
                                                    <Crown size={14} color="#d97706" />
                                                    <Text style={styles.captainBannerText}>
                                                        Owner will be enrolled as Team Captain at the top of the player roster.
                                                    </Text>
                                                </View>

                                                {/* Captain Player Details */}
                                                <Text style={styles.inputLabel}>CAPTAIN FULL NAME *</Text>
                                                <TextInput
                                                    style={styles.input}
                                                    value={captainName}
                                                    onChangeText={setCaptainName}
                                                    placeholder="e.g. Rohit Sharma (or Owner Name)"
                                                    placeholderTextColor="#94a3b8"
                                                />

                                                <Text style={styles.inputLabel}>CAPTAIN PROFILE PHOTO (1:1 CROP)</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#ffffff', padding: 10, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 }}>
                                                    <View style={{ width: 54, height: 54, borderRadius: 16, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                        {captainPhoto ? (
                                                            <Image source={{ uri: captainPhoto }} style={{ width: '100%', height: '100%' }} />
                                                        ) : (
                                                            <User size={24} color="#94a3b8" />
                                                        )}
                                                    </View>
                                                    <View style={{ flex: 1, gap: 6 }}>
                                                        <TouchableOpacity
                                                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eff6ff', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#bfdbfe' }}
                                                            onPress={pickCaptainImageWithCrop}
                                                        >
                                                            <Camera size={14} color="#2563eb" />
                                                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#1d4ed8' }}>
                                                                {captainPhoto ? 'Change Captain Photo' : 'Upload Captain Photo (1:1)'}
                                                            </Text>
                                                        </TouchableOpacity>
                                                        {captainPhoto ? (
                                                            <TouchableOpacity onPress={() => setCaptainPhoto('')}>
                                                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#dc2626' }}>✕ Remove Photo</Text>
                                                            </TouchableOpacity>
                                                        ) : (
                                                            <Text style={{ fontSize: 10, color: '#94a3b8' }}>Tap to select & crop from gallery</Text>
                                                        )}
                                                    </View>
                                                </View>

                                                <Text style={styles.inputLabel}>PLAYING ROLE</Text>
                                                <View style={styles.roleChoiceRow}>
                                                    {['Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper'].map(cat => (
                                                        <TouchableOpacity
                                                            key={cat}
                                                            style={[styles.catPill, category === cat && styles.catPillActive]}
                                                            onPress={() => setCategory(cat)}
                                                        >
                                                            <Text style={[styles.catPillText, category === cat && styles.catPillTextActive]}>
                                                                {cat.split(' ')[0]}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>

                                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.inputLabel}>BATTING</Text>
                                                        <TextInput
                                                            style={styles.input}
                                                            value={battingStyle}
                                                            onChangeText={setBattingStyle}
                                                            placeholder="Right Handed"
                                                            placeholderTextColor="#94a3b8"
                                                        />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.inputLabel}>BOWLING</Text>
                                                        <TextInput
                                                            style={styles.input}
                                                            value={bowlingStyle}
                                                            onChangeText={setBowlingStyle}
                                                            placeholder="Right-arm Fast"
                                                            placeholderTextColor="#94a3b8"
                                                        />
                                                    </View>
                                                </View>

                                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.inputLabel}>CAPTAIN PRICE (₹ CR)</Text>
                                                        <TextInput
                                                            style={styles.input}
                                                            value={captainPrice}
                                                            onChangeText={setCaptainPrice}
                                                            placeholder="15"
                                                            keyboardType="numeric"
                                                            placeholderTextColor="#94a3b8"
                                                        />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.inputLabel}>AGE</Text>
                                                        <TextInput
                                                            style={styles.input}
                                                            value={age}
                                                            onChangeText={setAge}
                                                            placeholder="28"
                                                            keyboardType="numeric"
                                                            placeholderTextColor="#94a3b8"
                                                        />
                                                    </View>
                                                </View>



                                                <Text style={styles.inputLabel}>CRICHEROES PROFILE URL</Text>
                                                <TextInput
                                                    style={styles.input}
                                                    value={cricHeroesProfileUrl}
                                                    onChangeText={setCricHeroesProfileUrl}
                                                    placeholder="https://cricheroes.in/player/..."
                                                    placeholderTextColor="#94a3b8"
                                                />
                                            </>
                                        )}

                                        {/* Username */}
                                        <Text style={styles.inputLabel}>LOGIN USERNAME *</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={formUsername}
                                            onChangeText={setFormUsername}
                                            placeholder="e.g. owner_rcb"
                                            placeholderTextColor="#94a3b8"
                                            autoCapitalize="none"
                                        />

                                        {/* Password */}
                                        <Text style={styles.inputLabel}>LOGIN PASSWORD *</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={formPassword}
                                            onChangeText={setFormPassword}
                                            placeholder="Enter secure password"
                                            placeholderTextColor="#94a3b8"
                                            autoCapitalize="none"
                                        />
                                    </ScrollView>

                                    {/* Form Buttons */}
                                    <View style={styles.formBtnRow}>
                                        <TouchableOpacity
                                            style={styles.cancelBtn}
                                            onPress={() => setFormVisible(false)}
                                        >
                                            <Text style={styles.cancelBtnText}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.submitBtn}
                                            onPress={handleSaveForm}
                                            disabled={saving}
                                        >
                                            {saving ? (
                                                <ActivityIndicator size="small" color="#ffffff" />
                                            ) : (
                                                <Text style={styles.submitBtnText}>
                                                    {formMode === 'add' ? 'Create & Add Captain' : 'Save Changes'}
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </Modal>
                    )}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    headerTitleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0f172a',
    },
    headerSub: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500',
    },
    closeBtn: {
        padding: 6,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
    },
    tourneySwitchStrip: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    tPill: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    tPillActive: {
        backgroundColor: '#eff6ff',
        borderColor: '#2563eb',
    },
    tPillText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#64748b',
    },
    tPillTextActive: {
        color: '#2563eb',
        fontWeight: '800',
    },
    actionBar: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#f8fafc',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        gap: 8,
    },
    addBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2563eb',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
    },
    addBtnText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '800',
    },
    copyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
    },
    copyBtnText: {
        color: '#334155',
        fontSize: 12,
        fontWeight: '700',
    },
    body: {
        padding: 16,
    },
    centerBox: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 14,
        color: '#64748b',
    },
    credCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
    },
    credCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    roleTagWrap: {
        flex: 1,
        marginRight: 8,
    },
    roleBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginBottom: 4,
    },
    roleBadgeAuc: {
        backgroundColor: '#fef3c7',
    },
    roleBadgeTeam: {
        backgroundColor: '#eff6ff',
    },
    roleBadgeText: {
        fontSize: 9,
        fontWeight: '800',
    },
    roleBadgeTextAuc: {
        color: '#b45309',
    },
    roleBadgeTextTeam: {
        color: '#1d4ed8',
    },
    teamTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#0f172a',
    },
    capStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#fffbeb',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 3,
        alignSelf: 'flex-start',
    },
    capStripText: {
        fontSize: 10,
        color: '#b45309',
        fontWeight: '700',
    },
    cardActions: {
        flexDirection: 'row',
        gap: 6,
    },
    iconAction: {
        padding: 6,
        borderRadius: 6,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    credDetailsBox: {
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        padding: 8,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    credRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 2,
    },
    divider: {
        height: 1,
        backgroundColor: '#e2e8f0',
        marginVertical: 4,
    },
    credLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#94a3b8',
    },
    credValue: {
        fontSize: 11,
        fontWeight: '700',
        color: '#0f172a',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    pwWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    formOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'center',
        padding: 16,
    },
    formContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 20,
        maxHeight: '90%',
    },
    formHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    formTitle: {
        fontSize: 15,
        fontWeight: '900',
        color: '#0f172a',
    },
    inputLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#475569',
        marginBottom: 4,
        marginTop: 6,
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 12,
        color: '#0f172a',
        fontWeight: '600',
    },
    roleChoiceRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    roleChoice: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        backgroundColor: '#f8fafc',
    },
    roleChoiceActive: {
        borderColor: '#2563eb',
        backgroundColor: '#eff6ff',
    },
    roleChoiceText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748b',
    },
    roleChoiceTextActive: {
        color: '#2563eb',
        fontWeight: '800',
    },
    teamSelectPill: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        marginRight: 6,
    },
    teamSelectPillActive: {
        backgroundColor: '#eff6ff',
        borderColor: '#2563eb',
    },
    teamSelectPillText: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '600',
    },
    teamSelectPillTextActive: {
        color: '#2563eb',
        fontWeight: '800',
    },
    captainBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#fffbeb',
        borderWidth: 1,
        borderColor: '#fde68a',
        borderRadius: 8,
        padding: 8,
        marginVertical: 6,
    },
    captainBannerText: {
        fontSize: 10,
        color: '#92400e',
        fontWeight: '700',
        flex: 1,
    },
    catPill: {
        flex: 1,
        paddingVertical: 6,
        alignItems: 'center',
        borderRadius: 6,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    catPillActive: {
        backgroundColor: '#eff6ff',
        borderColor: '#2563eb',
    },
    catPillText: {
        fontSize: 10,
        color: '#64748b',
        fontWeight: '700',
    },
    catPillTextActive: {
        color: '#2563eb',
        fontWeight: '800',
    },
    formBtnRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 16,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 11,
        backgroundColor: '#f1f5f9',
        borderRadius: 10,
        alignItems: 'center',
    },
    cancelBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
    },
    submitBtn: {
        flex: 2,
        paddingVertical: 11,
        backgroundColor: '#2563eb',
        borderRadius: 10,
        alignItems: 'center',
    },
    submitBtnText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#ffffff',
    },
});

export default ManageCredentialsModal;
