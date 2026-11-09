import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Image,
    Linking,
    Modal
} from 'react-native';
import {
    Trophy,
    LogIn,
    UserPlus,
    Shield,
    Key,
    Eye,
    EyeOff,
    Sparkles,
    Building,
    Phone,
    User,
    KeyRound,
    CheckCircle2,
    ArrowLeft,
    Lock,
    Globe,
    Mail,
    MessageCircle,
    Award,
    Maximize2,
    X
} from 'lucide-react-native';
import { apiFetch } from '../lib/api';

interface LoginScreenProps {
    onLoginSuccess: (user: any) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
    const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>('login');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [imageModalVisible, setImageModalVisible] = useState(false);

    // Form Fields
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [organizationName, setOrganizationName] = useState('');
    const [phone, setPhone] = useState('');

    // Forgot Password Flow States
    const [forgotStep, setForgotStep] = useState<1 | 2>(1);
    const [verifiedAccount, setVerifiedAccount] = useState<any>(null);
    const [forgotPhone, setForgotPhone] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5001';

    const handleAuth = async () => {
        if (!username.trim() || !password.trim()) {
            Alert.alert('Required Fields', 'Username and Password are required.');
            return;
        }

        if (authMode === 'signup') {
            if (password.length < 4) {
                Alert.alert('Validation Error', 'Password should be at least 4 characters long.');
                return;
            }
            if (password !== confirmPassword) {
                Alert.alert('Validation Error', 'Passwords do not match. Please verify.');
                return;
            }
        }

        setLoading(true);
        try {
            const endpoint = authMode === 'signup' ? '/api/auth/register' : '/api/auth/login';

            const payload = authMode === 'signup'
                ? {
                    username: username.trim(),
                    password: password.trim(),
                    name: name.trim(),
                    organizationName: organizationName.trim(),
                    phone: phone.trim(),
                    role: 'superadmin'
                }
                : {
                    username: username.trim(),
                    password: password.trim()
                };

            const response = await apiFetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Authentication failed. Please verify credentials.');
            }

            onLoginSuccess(data.user);
        } catch (error: any) {
            Alert.alert(
                authMode === 'signup' ? 'Registration Error' : 'Sign In Notice',
                error?.message || 'Invalid credentials or unable to connect to server.'
            );
        } finally {
            setLoading(false);
        }
    };

    // Forgot Password Step 1: Verify Account
    const handleVerifyForgotAccount = async () => {
        if (!username.trim()) {
            Alert.alert('Required Field', 'Please enter your username to find your account.');
            return;
        }

        setLoading(true);
        try {
            const response = await apiFetch('/api/auth/check-username', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username.trim() })
            });

            const data = await response.json();

            if (!response.ok || !data.exists) {
                throw new Error(data.message || 'No account found with this username.');
            }

            setVerifiedAccount(data);
            setForgotStep(2);
        } catch (error: any) {
            Alert.alert('Account Not Found', error?.message || 'Please check the username.');
        } finally {
            setLoading(false);
        }
    };

    // Forgot Password Step 2: Reset Password
    const handleResetPassword = async () => {
        if (!newPassword.trim()) {
            Alert.alert('Required Field', 'Please enter your new password.');
            return;
        }

        if (newPassword.trim().length < 4) {
            Alert.alert('Validation Error', 'Password must be at least 4 characters long.');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            Alert.alert('Validation Error', 'Passwords do not match. Please verify.');
            return;
        }

        if (verifiedAccount?.hasPhone && !forgotPhone.trim()) {
            Alert.alert('Verification Required', 'Please enter your registered mobile number for identity verification.');
            return;
        }

        setLoading(true);
        try {
            const response = await apiFetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username.trim(),
                    phone: forgotPhone.trim(),
                    newPassword: newPassword.trim()
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to reset password.');
            }

            Alert.alert(
                'Password Reset Successful 🎉',
                'Your password has been updated. Please sign in with your new password.',
                [
                    {
                        text: 'Sign In Now',
                        onPress: () => {
                            setPassword('');
                            setNewPassword('');
                            setConfirmNewPassword('');
                            setAuthMode('login');
                            setForgotStep(1);
                        }
                    }
                ]
            );
        } catch (error: any) {
            Alert.alert('Reset Failed', error?.message || 'Please check your inputs.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.container}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    automaticallyAdjustKeyboardInsets={true}
                    keyboardDismissMode="on-drag"
                >
                    {/* Header Brand */}
                    <View style={styles.header}>
                        <Image
                            source={require('../assets/logo.png')}
                            style={{ width: 84, height: 84, borderRadius: 20, marginBottom: 12, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' }}
                            resizeMode="contain"
                        />
                        <Text style={styles.appTitle}>Dab Cric Auction</Text>
                        <Text style={styles.subtitle}>
                            {authMode === 'signup'
                                ? 'Tournament Host & Organizer Registration'
                                : authMode === 'forgot'
                                    ? 'Account Password Retrieval'
                                    : 'Live Cricket Auction Management Platform'}
                        </Text>
                    </View>

                    {/* Card Container */}
                    <View style={styles.card}>
                        {/* Tab Switcher (Login vs Host Register) */}
                        {authMode !== 'forgot' && (
                            <View style={styles.tabRow}>
                                <TouchableOpacity
                                    style={[styles.tabBtn, authMode === 'login' && styles.tabBtnActive]}
                                    onPress={() => setAuthMode('login')}
                                >
                                    <LogIn size={14} color={authMode === 'login' ? '#2563eb' : '#64748b'} />
                                    <Text style={[styles.tabBtnText, authMode === 'login' && styles.tabBtnTextActive]}>
                                        Sign In
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.tabBtn, authMode === 'signup' && styles.tabBtnActive]}
                                    onPress={() => setAuthMode('signup')}
                                >
                                    <UserPlus size={14} color={authMode === 'signup' ? '#2563eb' : '#64748b'} />
                                    <Text style={[styles.tabBtnText, authMode === 'signup' && styles.tabBtnTextActive]}>
                                        Host Register
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Back to Sign In Header for Forgot Password */}
                        {authMode === 'forgot' && (
                            <TouchableOpacity
                                style={styles.backToLoginRow}
                                onPress={() => { setAuthMode('login'); setForgotStep(1); }}
                            >
                                <ArrowLeft size={16} color="#2563eb" />
                                <Text style={styles.backToLoginText}>Back to Sign In</Text>
                            </TouchableOpacity>
                        )}

                        {/* Organizer Notice (Signup only) */}
                        {authMode === 'signup' && (
                            <View style={styles.organizerCallout}>
                                <Sparkles size={16} color="#2563eb" style={{ marginTop: 2 }} />
                                <Text style={styles.organizerCalloutText}>
                                    Public registration is strictly for <Text style={{ fontWeight: '900' }}>Tournament Organizers</Text>. Team owners and auctioneers get their logins directly from the organizer.
                                </Text>
                            </View>
                        )}

                        {/* SIGNUP EXTRA FIELDS */}
                        {authMode === 'signup' && (
                            <>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>ORGANIZATION / LEAGUE NAME</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. Gujarat Premier Cricket League"
                                        placeholderTextColor="#94a3b8"
                                        value={organizationName}
                                        onChangeText={setOrganizationName}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>ORGANIZER FULL NAME</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. Ramesh Patel"
                                        placeholderTextColor="#94a3b8"
                                        value={name}
                                        onChangeText={setName}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>MOBILE / WHATSAPP</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. 9876543210"
                                        placeholderTextColor="#94a3b8"
                                        keyboardType="phone-pad"
                                        value={phone}
                                        onChangeText={setPhone}
                                    />
                                </View>
                            </>
                        )}

                        {/* ================= FORGOT PASSWORD MODE ================= */}
                        {authMode === 'forgot' ? (
                            <View>
                                {forgotStep === 1 ? (
                                    <>
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.inputLabel}>ENTER YOUR USERNAME</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="e.g. gpl_admin or owner_rcb"
                                                placeholderTextColor="#94a3b8"
                                                autoCapitalize="none"
                                                value={username}
                                                onChangeText={setUsername}
                                            />
                                        </View>

                                        <TouchableOpacity
                                            style={[styles.loginButton, loading && styles.disabledButton]}
                                            onPress={handleVerifyForgotAccount}
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <ActivityIndicator color="#ffffff" size="small" />
                                            ) : (
                                                <>
                                                    <KeyRound size={16} color="#ffffff" />
                                                    <Text style={styles.loginButtonText}>Verify Account →</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <>
                                        {/* Verified Account Badge */}
                                        <View style={styles.verifiedBox}>
                                            <CheckCircle2 size={16} color="#16a34a" />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.verifiedTitle}>Account: @{verifiedAccount?.username}</Text>
                                                <Text style={styles.verifiedSub}>
                                                    Role: {verifiedAccount?.role === 'superadmin' ? 'Tournament Host' : verifiedAccount?.role?.replace('_', ' ')}
                                                    {verifiedAccount?.phoneHint ? ` • Mobile: ••••${verifiedAccount.phoneHint}` : ''}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Phone Verification Input (if registered phone exists) */}
                                        {verifiedAccount?.hasPhone && (
                                            <View style={styles.inputGroup}>
                                                <Text style={styles.inputLabel}>REGISTERED MOBILE (VERIFICATION)</Text>
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="Enter your 10-digit mobile number"
                                                    placeholderTextColor="#94a3b8"
                                                    keyboardType="phone-pad"
                                                    value={forgotPhone}
                                                    onChangeText={setForgotPhone}
                                                />
                                            </View>
                                        )}

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.inputLabel}>NEW PASSWORD *</Text>
                                            <View style={styles.passwordWrapper}>
                                                <TextInput
                                                    style={styles.passwordInput}
                                                    placeholder="••••••••"
                                                    placeholderTextColor="#94a3b8"
                                                    secureTextEntry={!showPassword}
                                                    autoCapitalize="none"
                                                    value={newPassword}
                                                    onChangeText={setNewPassword}
                                                />
                                                <TouchableOpacity
                                                    onPress={() => setShowPassword(!showPassword)}
                                                    style={styles.eyeBtn}
                                                >
                                                    {showPassword ? (
                                                        <EyeOff size={18} color="#64748b" />
                                                    ) : (
                                                        <Eye size={18} color="#64748b" />
                                                    )}
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.inputLabel}>CONFIRM NEW PASSWORD *</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="••••••••"
                                                placeholderTextColor="#94a3b8"
                                                secureTextEntry={!showPassword}
                                                autoCapitalize="none"
                                                value={confirmNewPassword}
                                                onChangeText={setConfirmNewPassword}
                                            />
                                        </View>

                                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                                            <TouchableOpacity
                                                style={styles.backStepBtn}
                                                onPress={() => setForgotStep(1)}
                                            >
                                                <Text style={styles.backStepText}>Back</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.loginButton, { flex: 1, marginTop: 0 }, loading && styles.disabledButton]}
                                                onPress={handleResetPassword}
                                                disabled={loading}
                                            >
                                                {loading ? (
                                                    <ActivityIndicator color="#ffffff" size="small" />
                                                ) : (
                                                    <Text style={styles.loginButtonText}>Save New Password</Text>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                )}
                            </View>
                        ) : (
                            /* ================= NORMAL LOGIN / SIGNUP MODE ================= */
                            <>
                                {/* Username Input */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>
                                        {authMode === 'signup' ? 'CHOOSE ADMIN USERNAME *' : 'USERNAME *'}
                                    </Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder={authMode === 'signup' ? 'e.g. gpl_admin' : 'Enter assigned username'}
                                        placeholderTextColor="#94a3b8"
                                        autoCapitalize="none"
                                        value={username}
                                        onChangeText={setUsername}
                                    />
                                </View>

                                {/* Password Input with Forgot Password link */}
                                <View style={styles.inputGroup}>
                                    <View style={styles.labelRow}>
                                        <Text style={styles.inputLabel}>PASSWORD *</Text>
                                        {authMode === 'login' && (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setAuthMode('forgot');
                                                    setForgotStep(1);
                                                }}
                                            >
                                                <Text style={styles.forgotLink}>Forgot Password?</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    <View style={styles.passwordWrapper}>
                                        <TextInput
                                            style={styles.passwordInput}
                                            placeholder="••••••••"
                                            placeholderTextColor="#94a3b8"
                                            secureTextEntry={!showPassword}
                                            autoCapitalize="none"
                                            value={password}
                                            onChangeText={setPassword}
                                        />
                                        <TouchableOpacity
                                            onPress={() => setShowPassword(!showPassword)}
                                            style={styles.eyeBtn}
                                        >
                                            {showPassword ? (
                                                <EyeOff size={18} color="#64748b" />
                                            ) : (
                                                <Eye size={18} color="#64748b" />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Confirm Password (Signup only) */}
                                {authMode === 'signup' && (
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>CONFIRM PASSWORD *</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="••••••••"
                                            placeholderTextColor="#94a3b8"
                                            secureTextEntry={!showPassword}
                                            autoCapitalize="none"
                                            value={confirmPassword}
                                            onChangeText={setConfirmPassword}
                                        />
                                    </View>
                                )}

                                {/* Submit Button */}
                                <TouchableOpacity
                                    style={[styles.loginButton, loading && styles.disabledButton]}
                                    onPress={handleAuth}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#ffffff" size="small" />
                                    ) : authMode === 'signup' ? (
                                        <>
                                            <Shield size={16} color="#ffffff" />
                                            <Text style={styles.loginButtonText}>Register as Host</Text>
                                        </>
                                    ) : (
                                        <>
                                            <LogIn size={16} color="#ffffff" />
                                            <Text style={styles.loginButtonText}>Sign In to Platform</Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                {/* Role Guidance Card in Login Mode */}
                                {authMode === 'login' && (
                                    <View style={styles.guidanceCard}>
                                        <View style={styles.guidanceRow}>
                                            <Shield size={14} color="#2563eb" style={{ marginTop: 2 }} />
                                            <Text style={styles.guidanceText}>
                                                <Text style={{ fontWeight: '800', color: '#0f172a' }}>Tournament Organizers: </Text>
                                                Log in with your registered account.
                                            </Text>
                                        </View>
                                        <View style={[styles.guidanceRow, { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 8 }]}>
                                            <Key size={14} color="#d97706" style={{ marginTop: 2 }} />
                                            <Text style={styles.guidanceText}>
                                                <Text style={{ fontWeight: '800', color: '#0f172a' }}>Team Owners & Auctioneers: </Text>
                                                Use credentials provided by your organizer.
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </>
                        )}
                    </View>

                    {/* Developer & Contact Information Card */}
                    <View style={styles.devCard}>
                        <View style={styles.devHeader}>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => setImageModalVisible(true)}
                                style={styles.devAvatarContainer}
                            >
                                <Image
                                    source={require('../assets/developer.jpg')}
                                    style={styles.devAvatar}
                                    resizeMode="cover"
                                />
                                <View style={styles.avatarZoomBadge}>
                                    <Maximize2 size={11} color="#FFFFFF" />
                                </View>
                            </TouchableOpacity>

                            <View style={styles.devDetails}>
                                <Text style={styles.devBadge}>✨ Designed & Crafted by</Text>
                                <Text style={styles.devName}>Jainish Dabgar</Text>
                                <Text style={styles.devRole}>Full-Stack Developer & UI/UX Designer</Text>
                            </View>
                        </View>

                        <Text style={styles.contactSectionTitle}>Connect & Contact (સંપર્ક):</Text>

                        {/* Social Buttons Grid */}
                        <View style={styles.socialGrid}>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => Linking.openURL('tel:+919773272749')}
                                style={[styles.socialBtn, { backgroundColor: '#10b981' }]}
                            >
                                <Phone size={14} color="#ffffff" />
                                <Text style={styles.socialBtnText}>Call</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => Linking.openURL('https://wa.me/919773272749')}
                                style={[styles.socialBtn, { backgroundColor: '#25d366' }]}
                            >
                                <MessageCircle size={14} color="#ffffff" />
                                <Text style={styles.socialBtnText}>WhatsApp</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => Linking.openURL('https://jainishdabgar.vercel.app/')}
                                style={[styles.socialBtn, { backgroundColor: '#0284c7' }]}
                            >
                                <Globe size={14} color="#ffffff" />
                                <Text style={styles.socialBtnText}>Portfolio</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => Linking.openURL('https://www.linkedin.com/in/jainish-dabgar-87474a320/')}
                                style={[styles.socialBtn, { backgroundColor: '#0a66c2' }]}
                            >
                                <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 12 }}>in</Text>
                                <Text style={styles.socialBtnText}>LinkedIn</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => Linking.openURL('https://github.com/Jainish-2901')}
                                style={[styles.socialBtn, { backgroundColor: '#24292f' }]}
                            >
                                <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 12 }}>git</Text>
                                <Text style={styles.socialBtnText}>GitHub</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => Linking.openURL('https://www.instagram.com/dabgar_jainish_2901/')}
                                style={[styles.socialBtn, { backgroundColor: '#e1306c' }]}
                            >
                                <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 12 }}>IG</Text>
                                <Text style={styles.socialBtnText}>Instagram</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => Linking.openURL('mailto:jainishdabgar2901@gmail.com')}
                                style={[styles.socialBtn, { backgroundColor: '#ea4335', width: '100%' }]}
                            >
                                <Mail size={14} color="#ffffff" />
                                <Text style={styles.socialBtnText}>jainishdabgar2901@gmail.com</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Note Box */}
                        <View style={styles.noteBox}>
                            <Text style={styles.noteText}>
                                💡 એપ્લિકેશન ડેવલપમેન્ટ, ડિઝાઇન અથવા અન્ય ટેક્નિકલ પ્રોજેક્ટ્સ માટે આપ ઉપર આપેલા કોઈપણ સોશિયલ મીડિયા કે ઈમેલ મારફતે સીધો સંપર્ક કરી શકો છો.
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Developer Photo Fullscreen Modal */}
            <Modal
                visible={imageModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setImageModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalBackdrop}
                    activeOpacity={1}
                    onPress={() => setImageModalVisible(false)}
                >
                    <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                        <TouchableOpacity
                            style={styles.modalCloseBtn}
                            onPress={() => setImageModalVisible(false)}
                        >
                            <X size={18} color="#ffffff" />
                        </TouchableOpacity>
                        <Image
                            source={require('../assets/developer.jpg')}
                            style={styles.modalImage}
                            resizeMode="cover"
                        />
                        <View style={styles.modalCaptionWrap}>
                            <Text style={styles.modalCaptionName}>Jainish Dabgar</Text>
                            <Text style={styles.modalCaptionRole}>Full-Stack Developer & UI/UX Designer</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f8fafc',
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 36,
    },
    container: {
        flex: 1,
    },
    scrollContainer: {
        paddingHorizontal: 20,
        paddingBottom: 220,
        justifyContent: 'center',
        flexGrow: 1,
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    logoBadge: {
        width: 58,
        height: 58,
        borderRadius: 18,
        backgroundColor: '#2563eb',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    appTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#0f172a',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '600',
        marginTop: 4,
        textAlign: 'center',
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 22,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    tabRow: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
    },
    tabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 9,
        gap: 6,
    },
    tabBtnActive: {
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 1,
    },
    tabBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748b',
    },
    tabBtnTextActive: {
        color: '#2563eb',
        fontWeight: '800',
    },
    backToLoginRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 16,
        paddingVertical: 4,
    },
    backToLoginText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#2563eb',
    },
    organizerCallout: {
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#bfdbfe',
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 16,
    },
    organizerCalloutText: {
        flex: 1,
        fontSize: 11,
        color: '#1e40af',
        lineHeight: 16,
        fontWeight: '600',
    },
    inputGroup: {
        marginBottom: 12,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    inputLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#475569',
        letterSpacing: 0.5,
    },
    forgotLink: {
        fontSize: 10,
        fontWeight: '800',
        color: '#2563eb',
    },
    input: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 13,
        color: '#0f172a',
        fontWeight: '600',
    },
    passwordWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 12,
    },
    passwordInput: {
        flex: 1,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 13,
        color: '#0f172a',
        fontWeight: '600',
    },
    eyeBtn: {
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    loginButton: {
        backgroundColor: '#2563eb',
        borderRadius: 12,
        paddingVertical: 13,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    disabledButton: {
        opacity: 0.6,
    },
    loginButtonText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '800',
    },
    guidanceCard: {
        backgroundColor: '#f8fafc',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 12,
        marginTop: 16,
        gap: 8,
    },
    guidanceRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    guidanceText: {
        fontSize: 11,
        color: '#475569',
        flex: 1,
        lineHeight: 16,
    },
    verifiedBox: {
        backgroundColor: '#f0fdf4',
        borderWidth: 1,
        borderColor: '#bbf7d0',
        borderRadius: 12,
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    verifiedTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: '#166534',
    },
    verifiedSub: {
        fontSize: 10,
        color: '#15803d',
        fontWeight: '600',
        marginTop: 1,
    },
    backStepBtn: {
        paddingHorizontal: 16,
        paddingVertical: 13,
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backStepText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
    },
    // Developer Card Styles
    devCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 16,
        marginTop: 20,
        marginBottom: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    devHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    devAvatarContainer: {
        position: 'relative',
    },
    devAvatar: {
        width: 58,
        height: 58,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: '#3b82f6',
    },
    avatarZoomBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#2563eb',
        borderRadius: 10,
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    devDetails: {
        flex: 1,
    },
    devBadge: {
        fontSize: 10,
        fontWeight: '800',
        color: '#d97706',
        marginBottom: 2,
    },
    devName: {
        fontSize: 17,
        fontWeight: '900',
        color: '#0f172a',
    },
    devRole: {
        fontSize: 11,
        fontWeight: '700',
        color: '#2563eb',
        marginTop: 1,
    },
    contactSectionTitle: {
        fontSize: 11,
        fontWeight: '800',
        color: '#475569',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 16,
        marginBottom: 10,
    },
    socialGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    socialBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderRadius: 10,
        minWidth: '47%',
        flexGrow: 1,
    },
    socialBtnText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '800',
    },
    noteBox: {
        backgroundColor: '#f8fafc',
        borderRadius: 10,
        padding: 10,
        marginTop: 14,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    noteText: {
        fontSize: 10,
        color: '#64748b',
        lineHeight: 15,
    },
    // Modal Styles
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: '#0f172a',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#334155',
        position: 'relative',
    },
    modalCloseBtn: {
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 16,
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalImage: {
        width: '100%',
        height: 320,
    },
    modalCaptionWrap: {
        padding: 16,
        alignItems: 'center',
        backgroundColor: '#0f172a',
    },
    modalCaptionName: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '900',
    },
    modalCaptionRole: {
        color: '#60a5fa',
        fontSize: 12,
        fontWeight: '700',
        marginTop: 2,
    },
});

export default LoginScreen;
