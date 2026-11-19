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
    Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
    X,
    Shield,
    Award,
    Calculator,
    Upload,
    Trash2,
    User,
    CheckSquare,
    Square,
    Camera,
    Image as ImageIcon
} from 'lucide-react-native';
import { apiFetch } from '../lib/api';
import { getBudgetUnits } from '../lib/currency';
import { toast, ToastOverlay } from '../lib/toast';
import SafeImage from './SafeImage';

interface AddTeamModalProps {
    visible: boolean;
    onClose: () => void;
    tournamentId?: string;
    tournament?: any;
    onAdded: () => void;
    initialData?: any;
    isEdit?: boolean;
}

export default function AddTeamModal({
    visible,
    onClose,
    tournamentId,
    tournament = null,
    onAdded,
    initialData = null,
    isEdit = false
}: AddTeamModalProps) {
    const { largeUnit, smallUnit, isKtoL, smallName } = getBudgetUnits(tournament);
    const defaultBudget = largeUnit === 'L' ? '10' : '100';

    const [name, setName] = useState('');
    const [shortName, setShortName] = useState('');
    const [budget, setBudget] = useState(defaultBudget);
    const [logo, setLogo] = useState('');
    const [isOwnerCaptain, setIsOwnerCaptain] = useState(false);
    const [captainName, setCaptainName] = useState('');
    const [captainPrice, setCaptainPrice] = useState('0');
    const [captainPhoto, setCaptainPhoto] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            if (isEdit && initialData) {
                setName(initialData.name || '');
                setShortName(initialData.shortName || '');
                setBudget(String(initialData.budget ?? defaultBudget));
                setLogo(initialData.logo || initialData.image || '');
                setIsOwnerCaptain(!!initialData.isOwnerCaptain);
                setCaptainName(initialData.captainName || '');
                setCaptainPrice(String(initialData.captainPrice ?? 0));
                setCaptainPhoto(initialData.captainPhoto || initialData.captainImage || '');
            } else {
                setName('');
                setShortName('');
                setBudget(defaultBudget);
                setLogo('');
                setIsOwnerCaptain(false);
                setCaptainName('');
                setCaptainPrice('0');
                setCaptainPhoto('');
            }
        }
    }, [visible, isEdit, initialData, defaultBudget]);

    const budgetNum = Number(budget) || 0;
    const captainNum = isOwnerCaptain ? (Number(captainPrice) || 0) : 0;
    const captainSpentInLarge = Number((captainNum / 100).toFixed(2));
    const effectivePurse = Math.max(0, Number((budgetNum - captainSpentInLarge).toFixed(2)));

    const pickCroppedImage = async (): Promise<string | null> => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                toast.warning('Permission Denied', 'Gallery permission is needed to pick an image.');
                return null;
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
                return asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
            }
        } catch (err: any) {
            toast.error('Image Error', err?.message || 'Failed to pick image');
        }
        return null;
    };

    const handlePickLogo = async () => {
        const picked = await pickCroppedImage();
        if (picked) setLogo(picked);
    };

    const handlePickCaptainPhoto = async () => {
        const picked = await pickCroppedImage();
        if (picked) setCaptainPhoto(picked);
    };

    const handleSubmit = async () => {
        if (!name.trim() || !shortName.trim()) {
            toast.warning('Required Fields', 'Team Name and Short Code are required.');
            return;
        }
        if (isOwnerCaptain && !captainName.trim()) {
            toast.warning('Required Field', 'Captain / Owner Full Name is required.');
            return;
        }
        if (!tournamentId) return;

        setLoading(true);
        try {
            const payload = {
                name: name.trim(),
                shortName: shortName.trim().toUpperCase(),
                budget: budgetNum,
                logo: logo.trim(),
                isOwnerCaptain,
                captainName: isOwnerCaptain ? captainName.trim() : '',
                captainPrice: captainNum,
                captainPhoto: isOwnerCaptain ? captainPhoto.trim() : '',
                tournamentId
            };

            const res = isEdit && initialData?._id
                ? await apiFetch(`/api/teams/${initialData._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                : await apiFetch('/api/teams', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.message || 'Failed to save team');
            }

            toast.success(isEdit ? 'Team Updated' : 'Team Added', `"${payload.name}" saved successfully!`);
            onAdded();
            onClose();
        } catch (err: any) {
            toast.error('Save Failed', err?.message || 'Failed to save team');
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
                        <View style={styles.headerLeft}>
                            <View style={styles.headerIcon}>
                                <Shield size={20} color="#2563eb" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.title}>
                                    {isEdit ? 'Edit Team Configuration' : 'Register New Team'}
                                </Text>
                                <Text style={styles.sub}>
                                    Configure team logo, purse & owner-captain allocation
                                </Text>
                            </View>
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
                        {/* Team Logo Upload (1:1 Frame) */}
                        <Text style={styles.label}>TEAM LOGO / IMAGE (1:1 CROP)</Text>
                        <View style={styles.uploadBox}>
                            <View style={styles.previewBox}>
                                <SafeImage
                                    uri={logo}
                                    style={styles.previewImg}
                                    fallback={
                                        <View style={styles.noImgBox}>
                                            <ImageIcon size={20} color="#94a3b8" />
                                            <Text style={styles.noImgText}>NO LOGO</Text>
                                        </View>
                                    }
                                />
                            </View>
                            <View style={{ flex: 1, gap: 6 }}>
                                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                                    <TouchableOpacity style={styles.uploadBtn} onPress={handlePickLogo}>
                                        <Upload size={13} color="#2563eb" />
                                        <Text style={styles.uploadBtnText}>{logo ? 'Change Image' : 'Upload Logo'}</Text>
                                    </TouchableOpacity>
                                    {logo ? (
                                        <TouchableOpacity style={styles.removeBtn} onPress={() => setLogo('')}>
                                            <Trash2 size={13} color="#dc2626" />
                                            <Text style={styles.removeBtnText}>Remove</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                                <Text style={styles.hintText}>Square PNG or JPG recommended (1:1 crop)</Text>
                            </View>
                        </View>

                        {/* Team Name */}
                        <Text style={styles.label}>TEAM NAME *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Royal Challengers Bengaluru"
                            placeholderTextColor="#94a3b8"
                            value={name}
                            onChangeText={setName}
                        />

                        {/* Short Code & Budget */}
                        <View style={styles.row2}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>SHORT CODE *</Text>
                                <TextInput
                                    style={[styles.input, { fontWeight: '800' }]}
                                    placeholder="e.g. RCB"
                                    placeholderTextColor="#94a3b8"
                                    autoCapitalize="characters"
                                    value={shortName}
                                    onChangeText={(v) => setShortName(v.toUpperCase())}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>PURSE BUDGET (₹ {largeUnit}) *</Text>
                                <TextInput
                                    style={[styles.input, { fontWeight: '800' }]}
                                    placeholder={`e.g. ${defaultBudget}`}
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="numeric"
                                    value={budget}
                                    onChangeText={setBudget}
                                />
                            </View>
                        </View>

                        {/* Owner Playing as Captain Checkbox */}
                        <View style={styles.captainCard}>
                            <TouchableOpacity
                                style={styles.checkboxRow}
                                onPress={() => setIsOwnerCaptain(!isOwnerCaptain)}
                                activeOpacity={0.75}
                            >
                                {isOwnerCaptain ? (
                                    <CheckSquare size={18} color="#2563eb" />
                                ) : (
                                    <Square size={18} color="#94a3b8" />
                                )}
                                <Award size={16} color="#d97706" />
                                <Text style={styles.checkboxLabel}>Team Owner is Playing as Captain</Text>
                            </TouchableOpacity>

                            {isOwnerCaptain && (
                                <View style={styles.captainBody}>
                                    <Text style={styles.label}>CAPTAIN / OWNER FULL NAME *</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: '#ffffff' }]}
                                        placeholder="e.g. Jainish Dabgar"
                                        placeholderTextColor="#94a3b8"
                                        value={captainName}
                                        onChangeText={setCaptainName}
                                    />

                                    <Text style={styles.label}>CAPTAIN PROFILE PHOTO</Text>
                                    <View style={[styles.uploadBox, { backgroundColor: '#ffffff' }]}>
                                        <View style={styles.previewBoxSmall}>
                                            <SafeImage
                                                uri={captainPhoto}
                                                style={styles.previewImg}
                                                fallback={
                                                    <View style={styles.noImgBox}>
                                                        <User size={18} color="#94a3b8" />
                                                        <Text style={styles.noImgText}>NO PIC</Text>
                                                    </View>
                                                }
                                            />
                                        </View>
                                        <View style={{ flex: 1, gap: 6 }}>
                                            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                                                <TouchableOpacity style={styles.uploadBtn} onPress={handlePickCaptainPhoto}>
                                                    <Camera size={13} color="#2563eb" />
                                                    <Text style={styles.uploadBtnText}>{captainPhoto ? 'Change Photo' : 'Upload Pic'}</Text>
                                                </TouchableOpacity>
                                                {captainPhoto ? (
                                                    <TouchableOpacity style={styles.removeBtn} onPress={() => setCaptainPhoto('')}>
                                                        <Trash2 size={13} color="#dc2626" />
                                                        <Text style={styles.removeBtnText}>Remove</Text>
                                                    </TouchableOpacity>
                                                ) : null}
                                            </View>
                                            <Text style={styles.hintText}>Auto-uploaded to Cloudinary on save</Text>
                                        </View>
                                    </View>

                                    <Text style={styles.label}>CAPTAIN / OWNER BASE PRICE (IN ₹{smallUnit}) *</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: '#ffffff', fontWeight: '800' }]}
                                        placeholder={`e.g. ${isKtoL ? '15 or 20 (in Thousands)' : '15 or 20 (in Lakhs)'}`}
                                        placeholderTextColor="#94a3b8"
                                        keyboardType="numeric"
                                        value={captainPrice}
                                        onChangeText={setCaptainPrice}
                                    />
                                    <Text style={[styles.hintText, { marginTop: -6, marginBottom: 8 }]}>
                                        Auto-deducted from team purse (₹{captainNum} {smallUnit} = ₹{captainSpentInLarge} {largeUnit})
                                    </Text>

                                    {/* Live Purse Strip */}
                                    <View style={styles.purseStrip}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Calculator size={14} color="#2563eb" />
                                            <Text style={styles.purseStripLabel}>Remaining Live Auction Purse:</Text>
                                        </View>
                                        <Text style={styles.purseStripVal}>₹{effectivePurse.toFixed(2)} {largeUnit}</Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        <TouchableOpacity
                            style={[styles.submitBtn, loading && { opacity: 0.6 }]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                                <Text style={styles.submitBtnText}>{isEdit ? 'Update Team' : 'Create Team'}</Text>
                            )}
                        </TouchableOpacity>
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
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 18,
        backgroundColor: '#f8fafc',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    headerIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#bfdbfe',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: '900',
        color: '#0f172a',
    },
    sub: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '600',
    },
    closeBtn: {
        padding: 6,
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
    row2: {
        flexDirection: 'row',
        gap: 12,
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
    previewBoxSmall: {
        width: 52,
        height: 52,
        borderRadius: 14,
        backgroundColor: '#f8fafc',
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
    captainCard: {
        marginTop: 14,
        padding: 14,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 16,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    checkboxLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: '#0f172a',
        flex: 1,
    },
    captainBody: {
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    purseStrip: {
        marginTop: 10,
        padding: 10,
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#bfdbfe',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    purseStripLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#334155',
    },
    purseStripVal: {
        fontSize: 13,
        fontWeight: '900',
        color: '#047857',
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

