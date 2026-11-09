import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
    SafeAreaView,
    StatusBar,
    Image,
    ActivityIndicator,
    Platform,
    KeyboardAvoidingView
} from 'react-native';
import {
    UserCheck,
    Phone,
    Trophy,
    Award,
    CheckCircle2,
    ArrowLeft,
    Sparkles,
    Shield,
    Camera,
    Lock
} from 'lucide-react-native';
import { apiFetch } from '../lib/api';

interface PlayerRegistrationScreenProps {
    tournamentId: string;
    tournamentName?: string;
    onBack?: () => void;
    onSuccess?: () => void;
}

const AVATAR_PRESETS = [
    { label: 'Batsman 1', url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=200&h=200&fit=crop' },
    { label: 'Bowler 1', url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&h=200&fit=crop' },
    { label: 'All-Rounder', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop' },
    { label: 'Keeper', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop' }
];

export const PlayerRegistrationScreen: React.FC<PlayerRegistrationScreenProps> = ({
    tournamentId,
    tournamentName = 'Tournament Auction',
    onBack,
    onSuccess
}) => {
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [category, setCategory] = useState<'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicket Keeper'>('Batsman');
    const [battingStyle, setBattingStyle] = useState('Right-Hand Bat');
    const [bowlingStyle, setBowlingStyle] = useState('Right-Arm Medium');
    const [cricHeroesProfileUrl, setCricHeroesProfileUrl] = useState('');
    const [image, setImage] = useState(AVATAR_PRESETS[0].url);

    // Stats
    const [matches, setMatches] = useState('');
    const [runs, setRuns] = useState('');
    const [highestScore, setHighestScore] = useState('');
    const [wickets, setWickets] = useState('');
    const [bestBowling, setBestBowling] = useState('');

    const [loading, setLoading] = useState(false);
    const [submittedPlayer, setSubmittedPlayer] = useState<any>(null);
    const [isClosed, setIsClosed] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const checkTournament = async () => {
            try {
                const res = await apiFetch(`/api/tournaments/${tournamentId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted && data.tournament) {
                        if (data.tournament.registrationOpen === false) {
                            setIsClosed(true);
                        }
                    }
                }
            } catch {
                // Keep open by default
            }
        };
        checkTournament();
        return () => { isMounted = false; };
    }, [tournamentId]);

    const handleSubmit = async () => {
        if (!name.trim()) {
            Alert.alert('Required', 'Please enter player full name.');
            return;
        }

        setLoading(true);
        const payload = {
            name: name.trim(),
            age: Number(age) || 24,
            category,
            battingStyle,
            bowlingStyle,
            cricHeroesProfileUrl: cricHeroesProfileUrl.trim(),
            image,
            stats: {
                matches: Number(matches) || 0,
                runs: Number(runs) || 0,
                highestScore: highestScore.trim() || '0',
                wickets: Number(wickets) || 0,
                bestBowling: bestBowling.trim() || '0/0'
            }
        };

        try {
            const res = await apiFetch(`/api/tournaments/${tournamentId}/register-player`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                setSubmittedPlayer(data.player || payload);
            } else {
                const errData = await res.json().catch(() => ({}));
                if (res.status === 403 || errData.error?.includes('CLOSED')) {
                    setIsClosed(true);
                    Alert.alert('Registration Closed', errData.error || 'Player self-registration is closed by the tournament organizer.');
                } else {
                    Alert.alert('Error', errData.error || 'Failed to submit registration. Please try again.');
                }
            }
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    if (isClosed) {
        return (
            <SafeAreaView style={[styles.container, styles.safeTop]}>
                <StatusBar barStyle="dark-content" />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                    <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
                        <Lock size={40} color="#dc2626" />
                    </View>
                    <Text style={{ fontSize: 22, fontWeight: '900', color: '#0f172a', textAlign: 'center', marginBottom: 8, letterSpacing: -0.5 }}>
                        REGISTRATIONS CLOSED
                    </Text>
                    <Text style={{ fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20, marginBottom: 28, maxWidth: 320 }}>
                        Player self-registration for <Text style={{ fontWeight: '700', color: '#1e293b' }}>{tournamentName}</Text> has been closed by the tournament organizer.
                    </Text>
                    {onBack && (
                        <TouchableOpacity
                            style={{ backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
                            onPress={onBack}
                        >
                            <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 14 }}>Go Back</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </SafeAreaView>
        );
    }

    if (submittedPlayer) {
        return (
            <SafeAreaView style={[styles.container, styles.safeTop]}>
                <StatusBar barStyle="dark-content" />
                <View style={styles.successCard}>
                    <CheckCircle2 size={56} color="#16a34a" />
                    <Text style={styles.successTitle}>Registration Completed!</Text>
                    <Text style={styles.successSub}>
                        {submittedPlayer.name} has been nominated for {tournamentName}.
                    </Text>

                    <View style={styles.summaryBox}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Role:</Text>
                            <Text style={styles.summaryVal}>{submittedPlayer.category}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Pricing:</Text>
                            <Text style={styles.summaryVal}>Admin / Slot Review</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Batting:</Text>
                            <Text style={styles.summaryVal}>{submittedPlayer.battingStyle}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Bowling:</Text>
                            <Text style={styles.summaryVal}>{submittedPlayer.bowlingStyle}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Status:</Text>
                            <Text style={[styles.summaryVal, { color: '#d97706', fontWeight: '800' }]}>PENDING AUCTION</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.primaryBtn}
                        onPress={() => {
                            setSubmittedPlayer(null);
                            if (onSuccess) onSuccess();
                            else if (onBack) onBack();
                        }}
                    >
                        <Text style={styles.primaryBtnText}>Done / Register Another</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, styles.safeTop]}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                {onBack && (
                    <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                        <ArrowLeft size={18} color="#0f172a" />
                    </TouchableOpacity>
                )}
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Image
                        source={require('../assets/logo.png')}
                        style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' }}
                        resizeMode="contain"
                    />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>Player Registration</Text>
                        <Text style={styles.headerSub} numberOfLines={1}>{tournamentName} • Dab Cric Auction</Text>
                    </View>
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    automaticallyAdjustKeyboardInsets={true}
                    keyboardDismissMode="on-drag"
                >
                {/* Photo Selection */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Player Photo</Text>
                    <View style={styles.photoRow}>
                        <Image source={{ uri: image }} style={styles.avatarLarge} />
                        <View style={{ flex: 1, marginLeft: 14 }}>
                            <Text style={styles.photoLabel}>Select Avatar Preset:</Text>
                            <View style={styles.presetWrap}>
                                {AVATAR_PRESETS.map((p, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[styles.presetChip, image === p.url && styles.presetChipActive]}
                                        onPress={() => setImage(p.url)}
                                    >
                                        <Text style={[styles.presetChipText, image === p.url && styles.presetChipTextActive]}>
                                            {p.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>
                </View>

                {/* Personal Information */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Personal Information</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Full Name *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Virat Kohli"
                            placeholderTextColor="#94a3b8"
                            value={name}
                            onChangeText={setName}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Age</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 25"
                            placeholderTextColor="#94a3b8"
                            keyboardType="numeric"
                            value={age}
                            onChangeText={setAge}
                        />
                    </View>
                </View>

                {/* Cricket Profile */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Cricket Specialization</Text>

                    <Text style={styles.inputLabel}>Playing Role *</Text>
                    <View style={styles.roleGrid}>
                        {(['Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper'] as const).map(role => (
                            <TouchableOpacity
                                key={role}
                                style={[styles.roleChip, category === role && styles.roleChipActive]}
                                onPress={() => setCategory(role)}
                            >
                                <Text style={[styles.roleChipText, category === role && styles.roleChipTextActive]}>
                                    {role}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                            <Text style={styles.inputLabel}>Batting Style</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Right-Hand Bat"
                                placeholderTextColor="#94a3b8"
                                value={battingStyle}
                                onChangeText={setBattingStyle}
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                            <Text style={styles.inputLabel}>Bowling Style</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Right-Arm Medium"
                                placeholderTextColor="#94a3b8"
                                value={bowlingStyle}
                                onChangeText={setBowlingStyle}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>CricHeroes Profile URL (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Profile URL / ID"
                            placeholderTextColor="#94a3b8"
                            value={cricHeroesProfileUrl}
                            onChangeText={setCricHeroesProfileUrl}
                        />
                    </View>
                </View>

                {/* Career Statistics */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Career Statistics</Text>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 6 }]}>
                            <Text style={styles.inputLabel}>Matches</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0"
                                placeholderTextColor="#94a3b8"
                                keyboardType="numeric"
                                value={matches}
                                onChangeText={setMatches}
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1, marginHorizontal: 6 }]}>
                            <Text style={styles.inputLabel}>Runs</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0"
                                placeholderTextColor="#94a3b8"
                                keyboardType="numeric"
                                value={runs}
                                onChangeText={setRuns}
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
                            <Text style={styles.inputLabel}>Highest</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0"
                                placeholderTextColor="#94a3b8"
                                value={highestScore}
                                onChangeText={setHighestScore}
                            />
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                            <Text style={styles.inputLabel}>Wickets</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0"
                                placeholderTextColor="#94a3b8"
                                keyboardType="numeric"
                                value={wickets}
                                onChangeText={setWickets}
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                            <Text style={styles.inputLabel}>Best Bowling</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. 4/18"
                                placeholderTextColor="#94a3b8"
                                value={bestBowling}
                                onChangeText={setBestBowling}
                            />
                        </View>
                    </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                        <>
                            <UserCheck size={18} color="#ffffff" />
                            <Text style={styles.primaryBtnText}>Submit Player Nomination</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    safeTop: {
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        backgroundColor: '#ffffff',
    },
    backBtn: {
        marginRight: 12,
        padding: 6,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#0f172a',
    },
    headerSub: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 280,
    },
    card: {
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#0f172a',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    photoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarLarge: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#e2e8f0',
        borderWidth: 2,
        borderColor: '#2563eb',
    },
    photoLabel: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '600',
        marginBottom: 6,
    },
    presetWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    presetChip: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    presetChipActive: {
        backgroundColor: '#eff6ff',
        borderColor: '#2563eb',
    },
    presetChipText: {
        fontSize: 10,
        color: '#475569',
        fontWeight: '600',
    },
    presetChipTextActive: {
        color: '#2563eb',
        fontWeight: '800',
    },
    inputGroup: {
        marginBottom: 10,
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#475569',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    input: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 14,
        color: '#0f172a',
    },
    row: {
        flexDirection: 'row',
    },
    roleGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    roleChip: {
        flex: 1,
        minWidth: '45%',
        paddingVertical: 8,
        paddingHorizontal: 10,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 8,
        alignItems: 'center',
    },
    roleChipActive: {
        backgroundColor: '#eff6ff',
        borderColor: '#2563eb',
    },
    roleChipText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
    },
    roleChipTextActive: {
        color: '#2563eb',
        fontWeight: '800',
    },
    primaryBtn: {
        backgroundColor: '#2563eb',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 10,
        gap: 8,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
    },
    primaryBtnText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '800',
    },
    successCard: {
        margin: 20,
        padding: 24,
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    successTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0f172a',
        marginTop: 14,
        marginBottom: 6,
    },
    successSub: {
        fontSize: 13,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 20,
    },
    summaryBox: {
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: 10,
        padding: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 20,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    summaryLabel: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '600',
    },
    summaryVal: {
        fontSize: 12,
        color: '#0f172a',
        fontWeight: '700',
    },
});

export default PlayerRegistrationScreen;

