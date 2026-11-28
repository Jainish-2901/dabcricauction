import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Share
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import {
    X,
    Upload,
    FileText,
    Download,
    ChevronDown,
    ChevronUp,
    User,
    Trash2,
    Camera,
    Crown
} from 'lucide-react-native';
import { apiFetch } from '../lib/api';
import { getBudgetUnits } from '../lib/currency';
import { toast, ToastOverlay } from '../lib/toast';
import SafeImage from './SafeImage';

interface AddPlayerModalProps {
    visible: boolean;
    onClose: () => void;
    tournamentId?: string;
    tournament?: any;
    onAdded: () => void;
    initialData?: any;
    isEdit?: boolean;
}

const parseCsvLine = (line: string, delimiter: string = ','): string[] => {
    const result: string[] = [];
    let insideQuotes = false;
    let entry = '';
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (insideQuotes && line[i + 1] === '"') {
                entry += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === delimiter && !insideQuotes) {
            result.push(entry.trim());
            entry = '';
        } else {
            entry += char;
        }
    }
    result.push(entry.trim());
    return result;
};

const normalizeCategory = (raw: string): string => {
    const v = String(raw || '').toLowerCase().trim();
    if (!v) return 'All-Rounder';
    if (v.includes('wicket') || v === 'wk' || v.includes('keeper')) return 'Wicket Keeper';
    if (v.includes('bowl')) return 'Bowler';
    if (v.includes('all')) return 'All-Rounder';
    if (v.includes('bat')) return 'Batsman';
    return raw.trim();
};

const TEMPLATE_CSV =
    'Name,Category,BattingStyle,BowlingStyle,BasePrice,Age,CricHeroesURL,Matches,Runs,Wickets,Economy\n' +
    'Virat Kohli,Batsman,Right Handed,Right-arm Medium,200,35,https://cricheroes.in/player/1,250,8500,4,6.20\n' +
    'Jasprit Bumrah,Bowler,Right Handed,Right-arm Fast,200,30,https://cricheroes.in/player/2,120,250,165,0.001\n' +
    'Hardik Pandya,All-Rounder,Right Handed,Right-arm Fast Medium,150,30,https://cricheroes.in/player/3,140,2400,65,7.45';

export default function AddPlayerModal({
    visible,
    onClose,
    tournamentId,
    tournament = null,
    onAdded,
    initialData = null,
    isEdit = false
}: AddPlayerModalProps) {
    const { smallName, isKtoL } = getBudgetUnits(tournament);
    const defaultBase = isKtoL ? '10' : '20';

    const [mode, setMode] = useState<'manual' | 'csv'>('manual');
    const [showCricketDetails, setShowCricketDetails] = useState(false);

    const [name, setName] = useState('');
    const [category, setCategory] = useState('All-Rounder');
    const [battingStyle, setBattingStyle] = useState('Right Handed');
    const [bowlingStyle, setBowlingStyle] = useState('Right-arm Fast');
    const [basePrice, setBasePrice] = useState(defaultBase);
    const [age, setAge] = useState('');
    const [cricHeroesUrl, setCricHeroesUrl] = useState('');
    const [image, setImage] = useState('');
    const [matches, setMatches] = useState('0');
    const [runs, setRuns] = useState('0');
    const [wickets, setWickets] = useState('0');
    const [economy, setEconomy] = useState('');

    const [csvText, setCsvText] = useState('');
    const [csvFileName, setCsvFileName] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            if (isEdit && initialData) {
                setName(initialData.name || '');
                setCategory(initialData.category || 'All-Rounder');
                setBattingStyle(initialData.battingStyle || 'Right Handed');
                setBowlingStyle(initialData.bowlingStyle || 'Right-arm Fast');
                setBasePrice(String(initialData.basePrice ?? defaultBase));
                setAge(initialData.age ? String(initialData.age) : '');
                setCricHeroesUrl(initialData.cricHeroesProfileUrl || '');
                setImage(initialData.image || '');
                setMatches(String(initialData.stats?.matches ?? 0));
                setRuns(String(initialData.stats?.runs ?? 0));
                setWickets(String(initialData.stats?.wickets ?? 0));
                setEconomy(String(initialData.stats?.economy ?? ''));
                setShowCricketDetails(true);
                setMode('manual');
            } else {
                setName('');
                setCategory('All-Rounder');
                setBattingStyle('Right Handed');
                setBowlingStyle('Right-arm Fast');
                setBasePrice(defaultBase);
                setAge('');
                setCricHeroesUrl('');
                setImage('');
                setMatches('0');
                setRuns('0');
                setWickets('0');
                setEconomy('');
                setCsvText('');
                setCsvFileName('');
                setShowCricketDetails(false);
                setMode('manual');
            }
        }
    }, [visible, initialData, isEdit, defaultBase]);

    const handlePickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                toast.warning('Permission Denied', 'Gallery permission is needed to pick player photo.');
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
                const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
                setImage(uri);
            }
        } catch (err: any) {
            toast.error('Image Error', err?.message || 'Failed to pick photo');
        }
    };

    const handleManualSubmit = async () => {
        if (!name.trim()) {
            toast.warning('Required Field', 'Full Name is required.');
            return;
        }
        if (!tournamentId) return;

        setLoading(true);
        try {
            const payload: any = {
                name: name.trim(),
                category,
                battingStyle,
                bowlingStyle: bowlingStyle.trim(),
                basePrice: Number(basePrice) || 0,
                age: age ? Number(age) : undefined,
                cricHeroesProfileUrl: cricHeroesUrl.trim(),
                stats: {
                    matches: Number(matches) || 0,
                    runs: Number(runs) || 0,
                    wickets: Number(wickets) || 0,
                    economy: economy.trim()
                },
                image: image ?? '',
                tournamentId
            };

            if (isEdit && initialData?.isCaptain) {
                payload.isCaptain = true;
                payload.soldPrice = payload.basePrice;
            }

            const res = isEdit && initialData?._id
                ? await apiFetch(`/api/players/${initialData._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                : await apiFetch('/api/players', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.message || 'Error saving player');
            }

            toast.success(isEdit ? 'Player Updated' : 'Player Added', `"${payload.name}" saved successfully!`);
            onAdded();
            onClose();
        } catch (err: any) {
            toast.error('Save Failed', err?.message || 'Error saving player');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyTemplate = async () => {
        try {
            await Clipboard.setStringAsync(TEMPLATE_CSV);
            toast.success('Template Copied', 'Sample CSV feed template copied! You can paste & edit it.');
        } catch {
            Share.share({ title: 'Players Feed CSV Template', message: TEMPLATE_CSV }).catch(() => {});
        }
    };

    const handlePasteFromClipboard = async () => {
        try {
            const text = await Clipboard.getStringAsync();
            if (text && text.trim()) {
                setCsvText(text);
                toast.info('CSV Pasted', 'Review lines and tap Import Players.');
            } else {
                toast.warning('Clipboard Empty', 'Copy CSV rows first, then tap Paste.');
            }
        } catch {
            toast.error('Clipboard Error', 'Could not read from clipboard.');
        }
    };

    const handlePickCsvFile = async () => {
        try {
            const DocumentPicker = require('expo-document-picker');
            if (!DocumentPicker?.getDocumentAsync) {
                toast.info('File Picker Unavailable', 'Paste your CSV text below or use Paste CSV.');
                return;
            }

            const result = await DocumentPicker.getDocumentAsync({
                type: ['text/csv', 'text/comma-separated-values', 'application/csv', 'text/plain', '*/*'],
                copyToCacheDirectory: true
            });

            if (result.canceled || !result.assets || result.assets.length === 0) {
                return;
            }

            const asset = result.assets[0];
            let content = '';

            try {
                const FileSystemLegacy = require('expo-file-system/legacy');
                if (FileSystemLegacy?.readAsStringAsync) {
                    content = await FileSystemLegacy.readAsStringAsync(asset.uri);
                }
            } catch {}

            if (!content) {
                try {
                    const FileSystem = require('expo-file-system');
                    if (FileSystem?.File) {
                        const file = new FileSystem.File(asset.uri);
                        content = await file.text();
                    } else if (FileSystem?.readAsStringAsync) {
                        content = await FileSystem.readAsStringAsync(asset.uri);
                    }
                } catch {}
            }

            if (!content && asset.uri) {
                const resp = await fetch(asset.uri);
                content = await resp.text();
            }

            const cleanContent = String(content || '').replace(/^\uFEFF/, '');
            if (!cleanContent.trim()) {
                toast.warning('Empty File', 'Selected CSV file appears empty.');
                return;
            }

            setCsvText(cleanContent);
            setCsvFileName(asset.name || 'selected_players.csv');
            const rowCount = Math.max(0, cleanContent.split(/\r?\n/).filter(l => l.trim().length > 0).length - 1);
            toast.success('CSV Loaded', `"${asset.name || 'file.csv'}" loaded (${rowCount} players detected)`);
        } catch (err: any) {
            toast.error('CSV Pick Failed', err?.message || 'Could not read CSV file. Try Paste CSV.');
        }
    };

    const handleCsvSubmit = async () => {
        const cleanRaw = String(csvText || '').replace(/^\uFEFF/, '');
        const lines = cleanRaw.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length <= 1) {
            toast.warning('Invalid CSV', 'CSV must have a header row and at least one player row.');
            return;
        }
        if (!tournamentId) return;

        setLoading(true);
        try {
            const firstLine = lines[0];
            const delimiter = firstLine.includes('\t') ? '\t' : (firstLine.split(';').length > firstLine.split(',').length ? ';' : ',');
            const headerRow = parseCsvLine(firstLine, delimiter).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
            const colIndex = {
                name: headerRow.findIndex(h => h.includes('name')),
                category: headerRow.findIndex(h => h.includes('cat') || h.includes('role')),
                battingStyle: headerRow.findIndex(h => h.includes('bat')),
                bowlingStyle: headerRow.findIndex(h => h.includes('bowl')),
                basePrice: headerRow.findIndex(h => h.includes('base') || h.includes('price')),
                mobile: headerRow.findIndex(h => h.includes('mobile') || h.includes('phone')),
                age: headerRow.findIndex(h => h.includes('age')),
                cricHeroesURL: headerRow.findIndex(h => h.includes('crich') || h.includes('url')),
                matches: headerRow.findIndex(h => h.includes('match')),
                runs: headerRow.findIndex(h => h.includes('run')),
                wickets: headerRow.findIndex(h => h.includes('wick') || h.includes('wkt')),
                economy: headerRow.findIndex(h => h.includes('econ'))
            };

            const newPlayers: any[] = [];
            for (let i = 1; i < lines.length; i++) {
                const cols = parseCsvLine(lines[i], delimiter);
                if (cols.length === 0 || !cols.some(Boolean)) continue;
                const pName = ((colIndex.name !== -1 ? cols[colIndex.name] : cols[0]) || '').trim();
                if (!pName) continue;

                const rawPrice = colIndex.basePrice !== -1 ? cols[colIndex.basePrice] : cols[2];
                const parsedBase = Number(String(rawPrice ?? '').replace(/[^0-9.]/g, ''));
                const basePriceVal = (rawPrice !== '' && rawPrice !== undefined && Number.isFinite(parsedBase) && parsedBase >= 0) ? parsedBase : 0;

                newPlayers.push({
                    name: pName,
                    category: normalizeCategory((colIndex.category !== -1 ? cols[colIndex.category] : cols[1]) || ''),
                    basePrice: basePriceVal,
                    battingStyle: (colIndex.battingStyle !== -1 ? cols[colIndex.battingStyle] : '') || 'Right Handed',
                    bowlingStyle: (colIndex.bowlingStyle !== -1 ? cols[colIndex.bowlingStyle] : '') || 'Right-arm Fast',
                    mobile: colIndex.mobile !== -1 ? (cols[colIndex.mobile] || '') : '',
                    age: colIndex.age !== -1 && cols[colIndex.age] ? Number(cols[colIndex.age]) : undefined,
                    cricHeroesProfileUrl: colIndex.cricHeroesURL !== -1 ? (cols[colIndex.cricHeroesURL] || '') : '',
                    stats: {
                        matches: colIndex.matches !== -1 && cols[colIndex.matches] ? Number(cols[colIndex.matches]) || 0 : 0,
                        runs: colIndex.runs !== -1 && cols[colIndex.runs] ? Number(cols[colIndex.runs]) || 0 : 0,
                        wickets: colIndex.wickets !== -1 && cols[colIndex.wickets] ? Number(cols[colIndex.wickets]) || 0 : 0,
                        economy: colIndex.economy !== -1 ? (cols[colIndex.economy] || '') : ''
                    },
                    tournamentId
                });
            }

            if (newPlayers.length === 0) {
                toast.warning('No Players Parsed', 'Check CSV column values and try again.');
                setLoading(false);
                return;
            }

            for (const player of newPlayers) {
                await apiFetch('/api/players', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(player)
                });
            }

            toast.success('CSV Imported', `Imported ${newPlayers.length} players successfully!`);
            onAdded();
            onClose();
        } catch (err: any) {
            toast.error('Import Failed', err?.message || 'Failed to import some players');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <ToastOverlay isModal />
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={styles.title}>{isEdit ? 'Edit Player' : 'Add New Player'}</Text>
                                {isEdit && initialData?.isCaptain && (
                                    <View style={styles.capPill}>
                                        <Crown size={10} color="#b45309" />
                                        <Text style={styles.capPillText}>CAPTAIN</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.sub}>Tournament Cricket Player Management</Text>

                            {!isEdit && (
                                <View style={styles.modeTabs}>
                                    <TouchableOpacity
                                        style={[styles.modeTab, mode === 'manual' && styles.modeTabActive]}
                                        onPress={() => setMode('manual')}
                                    >
                                        <Text style={[styles.modeTabText, mode === 'manual' && styles.modeTabTextActive]}>
                                            Manual Entry
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modeTab, mode === 'csv' && styles.modeTabActive]}
                                        onPress={() => setMode('csv')}
                                    >
                                        <Text style={[styles.modeTabText, mode === 'csv' && styles.modeTabTextActive]}>
                                            Import from CSV (Full Feed)
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={20} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.body}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {mode === 'manual' ? (
                            <>
                                {/* Player Profile Photo 1:1 Frame */}
                                <Text style={styles.label}>PLAYER PROFILE PHOTO (1:1 FRAME)</Text>
                                <View style={styles.uploadBox}>
                                    <View style={styles.previewBox}>
                                        <SafeImage
                                            uri={image}
                                            style={styles.previewImg}
                                            fallback={
                                                <View style={styles.noImgBox}>
                                                    <User size={20} color="#94a3b8" />
                                                    <Text style={styles.noImgText}>NO PHOTO</Text>
                                                </View>
                                            }
                                        />
                                    </View>
                                    <View style={{ flex: 1, gap: 6 }}>
                                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                                            <TouchableOpacity style={styles.uploadBtn} onPress={handlePickImage}>
                                                <Camera size={13} color="#2563eb" />
                                                <Text style={styles.uploadBtnText}>{image ? 'Change Photo (1:1)' : 'Upload Photo (1:1)'}</Text>
                                            </TouchableOpacity>
                                            {image ? (
                                                <TouchableOpacity style={styles.removeBtn} onPress={() => setImage('')}>
                                                    <Trash2 size={13} color="#dc2626" />
                                                    <Text style={styles.removeBtnText}>Remove</Text>
                                                </TouchableOpacity>
                                            ) : null}
                                        </View>
                                        <Text style={styles.hintText}>Select photo to crop in 1:1 square frame.</Text>
                                    </View>
                                </View>

                                {/* Full Name */}
                                <Text style={styles.label}>FULL NAME *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Rohit Sharma"
                                    placeholderTextColor="#94a3b8"
                                    value={name}
                                    onChangeText={setName}
                                />

                                {/* Category */}
                                <Text style={styles.label}>CATEGORY *</Text>
                                <View style={styles.pillRow}>
                                    {['Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper'].map(cat => (
                                        <TouchableOpacity
                                            key={cat}
                                            style={[styles.pill, category === cat && styles.pillActive]}
                                            onPress={() => setCategory(cat)}
                                        >
                                            <Text style={[styles.pillText, category === cat && styles.pillTextActive]}>
                                                {cat.split(' ')[0]}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Base Price */}
                                <Text style={styles.label}>
                                    {isEdit && initialData?.isCaptain
                                        ? `RETAINED CAPTAIN PRICE (${smallName}) *`
                                        : `BASE PRICE (${smallName}) *`}
                                </Text>
                                <TextInput
                                    style={[styles.input, { fontWeight: '800' }]}
                                    placeholder={`e.g. ${defaultBase}`}
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="numeric"
                                    value={basePrice}
                                    onChangeText={setBasePrice}
                                />

                                {/* Accordion Toggle */}
                                <TouchableOpacity
                                    style={styles.accordionBtn}
                                    onPress={() => setShowCricketDetails(!showCricketDetails)}
                                >
                                    <Text style={styles.accordionText}>Cricket Styles & Feed Details (Optional)</Text>
                                    {showCricketDetails ? (
                                        <ChevronUp size={16} color="#334155" />
                                    ) : (
                                        <ChevronDown size={16} color="#334155" />
                                    )}
                                </TouchableOpacity>

                                {showCricketDetails && (
                                    <View style={styles.accordionBody}>
                                        <Text style={styles.label}>BATTING STYLE</Text>
                                        <View style={styles.pillRow}>
                                            {['Right Handed', 'Left Handed'].map(b => (
                                                <TouchableOpacity
                                                    key={b}
                                                    style={[styles.pill, battingStyle === b && styles.pillActive]}
                                                    onPress={() => setBattingStyle(b)}
                                                >
                                                    <Text style={[styles.pillText, battingStyle === b && styles.pillTextActive]}>
                                                        {b}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>

                                        <View style={styles.row2}>
                                            <View style={{ flex: 2 }}>
                                                <Text style={styles.label}>BOWLING STYLE</Text>
                                                <TextInput
                                                    style={[styles.input, { backgroundColor: '#ffffff' }]}
                                                    placeholder="e.g. Right-arm Fast"
                                                    placeholderTextColor="#94a3b8"
                                                    value={bowlingStyle}
                                                    onChangeText={setBowlingStyle}
                                                />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.label}>AGE</Text>
                                                <TextInput
                                                    style={[styles.input, { backgroundColor: '#ffffff' }]}
                                                    placeholder="e.g. 24"
                                                    placeholderTextColor="#94a3b8"
                                                    keyboardType="numeric"
                                                    value={age}
                                                    onChangeText={setAge}
                                                />
                                            </View>
                                        </View>

                                        <Text style={styles.label}>CRICHEROES PROFILE URL</Text>
                                        <TextInput
                                            style={[styles.input, { backgroundColor: '#ffffff' }]}
                                            placeholder="https://cricheroes.in/player/..."
                                            placeholderTextColor="#94a3b8"
                                            autoCapitalize="none"
                                            value={cricHeroesUrl}
                                            onChangeText={setCricHeroesUrl}
                                        />

                                        {/* Stats Grid */}
                                        <View style={styles.statsGrid}>
                                            <View style={styles.statCell}>
                                                <Text style={styles.statLabel}>MATCHES</Text>
                                                <TextInput
                                                    style={styles.statInput}
                                                    keyboardType="numeric"
                                                    value={matches}
                                                    onChangeText={setMatches}
                                                />
                                            </View>
                                            <View style={styles.statCell}>
                                                <Text style={styles.statLabel}>RUNS</Text>
                                                <TextInput
                                                    style={styles.statInput}
                                                    keyboardType="numeric"
                                                    value={runs}
                                                    onChangeText={setRuns}
                                                />
                                            </View>
                                            <View style={styles.statCell}>
                                                <Text style={styles.statLabel}>WICKETS</Text>
                                                <TextInput
                                                    style={styles.statInput}
                                                    keyboardType="numeric"
                                                    value={wickets}
                                                    onChangeText={setWickets}
                                                />
                                            </View>
                                            <View style={styles.statCell}>
                                                <Text style={styles.statLabel}>ECONOMY</Text>
                                                <TextInput
                                                    style={styles.statInput}
                                                    placeholder="e.g. 0.001"
                                                    placeholderTextColor="#94a3b8"
                                                    value={economy}
                                                    onChangeText={setEconomy}
                                                />
                                            </View>
                                        </View>
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={[styles.submitBtn, loading && { opacity: 0.6 }]}
                                    onPress={handleManualSubmit}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator size="small" color="#ffffff" />
                                    ) : (
                                        <Text style={styles.submitBtnText}>{isEdit ? 'Update Player' : 'Add Player'}</Text>
                                    )}
                                </TouchableOpacity>
                            </>
                        ) : (
                            /* CSV IMPORT MODE (Full Parity with Web) */
                            <View>
                                <View style={styles.csvInfoBox}>
                                    <FileText size={18} color="#2563eb" />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.csvInfoText}>
                                            Import CSV with full feed columns (Name, Category, BattingStyle, BowlingStyle, BasePrice, Age, CricHeroesURL, Stats).
                                        </Text>
                                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                                            <TouchableOpacity onPress={handleCopyTemplate} style={styles.csvActionLink}>
                                                <Download size={12} color="#2563eb" />
                                                <Text style={styles.csvActionLinkText}>Copy Feed Template CSV</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => setCsvText(TEMPLATE_CSV)} style={styles.csvActionLink}>
                                                <Upload size={12} color="#059669" />
                                                <Text style={[styles.csvActionLinkText, { color: '#059669' }]}>Load Sample Rows</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={handlePasteFromClipboard} style={styles.csvActionLink}>
                                                <FileText size={12} color="#7c3aed" />
                                                <Text style={[styles.csvActionLinkText, { color: '#7c3aed' }]}>Paste CSV</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>

                                {/* CSV File Picker Dropzone (Matches Web) */}
                                <TouchableOpacity
                                    style={styles.csvDropzone}
                                    onPress={handlePickCsvFile}
                                    activeOpacity={0.75}
                                >
                                    <Upload size={26} color="#2563eb" />
                                    <Text style={styles.csvDropzoneTitle}>
                                        {csvFileName ? `Selected: ${csvFileName}` : 'Tap to Select .CSV File from Device'}
                                    </Text>
                                    <Text style={styles.csvDropzoneSub}>
                                        Supports Excel / Google Sheets / CricHeroes CSV exports
                                    </Text>
                                </TouchableOpacity>

                                <Text style={styles.label}>CSV CONTENT PREVIEW (OR PASTE DIRECTLY)</Text>
                                <TextInput
                                    style={styles.csvTextArea}
                                    multiline
                                    numberOfLines={8}
                                    textAlignVertical="top"
                                    placeholder={'Name,Category,BasePrice\nVirat Kohli,Batsman,200'}
                                    placeholderTextColor="#94a3b8"
                                    value={csvText}
                                    onChangeText={setCsvText}
                                    autoCapitalize="none"
                                />

                                <TouchableOpacity
                                    style={[styles.submitBtn, { backgroundColor: '#059669' }, (loading || !csvText.trim()) && { opacity: 0.55 }]}
                                    onPress={handleCsvSubmit}
                                    disabled={loading || !csvText.trim()}
                                >
                                    {loading ? (
                                        <ActivityIndicator size="small" color="#ffffff" />
                                    ) : (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Upload size={15} color="#ffffff" />
                                            <Text style={styles.submitBtnText}>Import Players</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '92%',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: 18,
        paddingBottom: 12,
        backgroundColor: '#f8fafc',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    title: {
        fontSize: 17,
        fontWeight: '900',
        color: '#0f172a',
    },
    sub: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '600',
        marginTop: 2,
    },
    capPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#fef3c7',
        borderWidth: 1,
        borderColor: '#fde68a',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
    },
    capPillText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#92400e',
    },
    closeBtn: {
        padding: 6,
    },
    modeTabs: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    modeTab: {
        paddingBottom: 8,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    modeTabActive: {
        borderBottomColor: '#2563eb',
    },
    modeTabText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748b',
    },
    modeTabTextActive: {
        color: '#2563eb',
        fontWeight: '900',
    },
    body: {
        padding: 18,
    },
    label: {
        fontSize: 10,
        fontWeight: '800',
        color: '#475569',
        marginBottom: 6,
        marginTop: 10,
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 13,
        color: '#0f172a',
        fontWeight: '600',
    },
    uploadBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 16,
    },
    previewBox: {
        width: 60,
        height: 60,
        borderRadius: 14,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewImg: {
        width: '100%',
        height: '100%',
    },
    noImgBox: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    noImgText: {
        fontSize: 8,
        fontWeight: '800',
        color: '#94a3b8',
        marginTop: 2,
    },
    uploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 10,
    },
    uploadBtnText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#334155',
    },
    removeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
        paddingHorizontal: 9,
        paddingVertical: 7,
        borderRadius: 10,
    },
    removeBtnText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#dc2626',
    },
    hintText: {
        fontSize: 10,
        color: '#94a3b8',
        fontWeight: '500',
    },
    pillRow: {
        flexDirection: 'row',
        gap: 6,
    },
    pill: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 10,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#cbd5e1',
    },
    pillActive: {
        backgroundColor: '#eff6ff',
        borderColor: '#2563eb',
    },
    pillText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748b',
    },
    pillTextActive: {
        color: '#2563eb',
        fontWeight: '900',
    },
    accordionBtn: {
        marginTop: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderRadius: 12,
    },
    accordionText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#334155',
    },
    accordionBody: {
        marginTop: 10,
        padding: 14,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 16,
    },
    row2: {
        flexDirection: 'row',
        gap: 10,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    statCell: {
        flex: 1,
    },
    statLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 4,
    },
    statInput: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 4,
        fontSize: 12,
        fontWeight: '700',
        color: '#0f172a',
        textAlign: 'center',
    },
    csvInfoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#bfdbfe',
        borderRadius: 14,
        padding: 12,
        marginBottom: 10,
    },
    csvInfoText: {
        fontSize: 11,
        color: '#1e3a8a',
        fontWeight: '600',
        lineHeight: 16,
    },
    csvActionLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    csvActionLinkText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#2563eb',
        textDecorationLine: 'underline',
    },
    csvDropzone: {
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#93c5fd',
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        paddingVertical: 18,
        paddingHorizontal: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    csvDropzoneTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#0f172a',
        marginTop: 6,
        textAlign: 'center',
    },
    csvDropzoneSub: {
        fontSize: 10,
        fontWeight: '600',
        color: '#64748b',
        marginTop: 2,
        textAlign: 'center',
    },
    csvTextArea: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 12,
        padding: 12,
        fontSize: 11,
        color: '#0f172a',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        minHeight: 160,
    },
    submitBtn: {
        marginTop: 18,
        backgroundColor: '#2563eb',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitBtnText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#ffffff',
    },
});

