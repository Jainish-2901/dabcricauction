import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, SafeAreaView, AppState, AppStateStatus, ActivityIndicator, BackHandler, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { safeStorage } from './lib/storage';
import LoginScreen from './components/LoginScreen';
import LiveBiddingRoom from './components/LiveBiddingRoom';
import AdminConsoleScreen from './components/AdminConsoleScreen';
import SuperAdminScreen from './components/SuperAdminScreen';
import SpectatorScreen from './components/SpectatorScreen';
import PlayerRegistrationScreen from './components/PlayerRegistrationScreen';
import { Shield, Award, Users, Eye, UserPlus } from 'lucide-react-native';
import { checkForAppUpdates } from './lib/updateManager';
import { ToastOverlay } from './lib/toast';
import { apiFetch } from './lib/api';

const SESSION_STORAGE_KEY = '@dab_cric_auction_active_session_v1';

export default function App() {
    const [user, setUser] = useState<any>(null);
    const [currentScreen, setCurrentScreen] = useState<'login' | 'admin' | 'console' | 'bidding' | 'spectator' | 'player_registration'>('login');
    const [activeTournamentId, setActiveTournamentId] = useState<string>('');
    const [prevScreen, setPrevScreen] = useState<'login' | 'admin'>('login');
    const [isRestoringSession, setIsRestoringSession] = useState<boolean>(true);

    // 1. Initial Launch: Check OTA Updates and Restore Last Active Session
    useEffect(() => {
        // Automatically check for OTA updates on app launch
        checkForAppUpdates();

        const restoreSession = async () => {
            try {
                const storedSession = await safeStorage.getItem(SESSION_STORAGE_KEY);
                if (storedSession) {
                    const parsed = JSON.parse(storedSession);
                    if (parsed.user) {
                        setUser(parsed.user);

                        if (parsed.activeTournamentId && parsed.activeTournamentId !== 'tourney_ipl_2026') {
                            setActiveTournamentId(parsed.activeTournamentId);
                        } else if (parsed.user?.tournamentId || parsed.user?.tournament_id) {
                            setActiveTournamentId(parsed.user?.tournamentId || parsed.user?.tournament_id);
                        }

                        if (parsed.prevScreen) {
                            setPrevScreen(parsed.prevScreen);
                        }

                        // Restore screen or determine by user role
                        if (parsed.currentScreen && parsed.currentScreen !== 'login') {
                            setCurrentScreen(parsed.currentScreen);
                        } else if (parsed.user.role === 'superadmin') {
                            setCurrentScreen('admin');
                        } else if (parsed.user.role === 'auctioneer') {
                            setCurrentScreen('console');
                        } else if (parsed.user.role === 'team_owner') {
                            setCurrentScreen('bidding');
                        } else {
                            setCurrentScreen('spectator');
                        }
                    }
                }
            } catch (err) {
                console.warn('⚠️ Session restore error:', err);
            } finally {
                setIsRestoringSession(false);
            }
        };

        restoreSession();
    }, []);

    // 2. Persist State whenever User, Screen, or Active Tournament Changes
    useEffect(() => {
        if (!isRestoringSession) {
            const saveState = async () => {
                try {
                    if (user) {
                        await safeStorage.setItem(
                            SESSION_STORAGE_KEY,
                            JSON.stringify({
                                user,
                                currentScreen,
                                activeTournamentId,
                                prevScreen,
                                lastActiveAt: Date.now()
                            })
                        );
                    } else if (currentScreen === 'login') {
                        await safeStorage.removeItem(SESSION_STORAGE_KEY);
                    }
                } catch (e) {
                    console.warn('⚠️ Failed to save session:', e);
                }
            };

            saveState();
        }
    }, [user, currentScreen, activeTournamentId, prevScreen, isRestoringSession]);

    // 3. AppState Listener: Ensure Seamless Resume when Backgrounded / Reopened
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active' && user) {
                // Keep session updated on resume
                safeStorage.setItem(
                    SESSION_STORAGE_KEY,
                    JSON.stringify({
                        user,
                        currentScreen,
                        activeTournamentId,
                        prevScreen,
                        lastActiveAt: Date.now()
                    })
                ).catch(() => { });
            }
        });

        return () => {
            subscription.remove();
        };
    }, [user, currentScreen, activeTournamentId, prevScreen]);

    // Hardware Back Button Protection: Never allow team owner or auctioneer to fall back to admin dashboard
    useEffect(() => {
        const onBackPress = () => {
            if (currentScreen === 'bidding') {
                if (user?.role === 'superadmin') {
                    setCurrentScreen('admin');
                    return true;
                }
                Alert.alert('Logout', 'Are you sure you want to sign out from the Owner Room?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Logout', style: 'destructive', onPress: handleLogout }
                ]);
                return true;
            }
            if (currentScreen === 'console' && user?.role !== 'superadmin') {
                Alert.alert('Logout', 'Are you sure you want to sign out from the Auction Console?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Logout', style: 'destructive', onPress: handleLogout }
                ]);
                return true;
            }
            return false;
        };

        const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => backHandler.remove();
    }, [currentScreen, user]);

    // Auto-resolve active tournament ID if missing or placeholder
    useEffect(() => {
        const resolveActiveTournament = async () => {
            if (!activeTournamentId || activeTournamentId === 'tourney_ipl_2026') {
                try {
                    const res = await apiFetch('/api/tournaments');
                    if (res.ok) {
                        const tours = await res.json();
                        if (Array.isArray(tours) && tours.length > 0) {
                            const latest = tours[0]._id || tours[0].id;
                            if (latest) setActiveTournamentId(latest);
                        }
                    }
                } catch (e) {
                    // ignore
                }
            }
        };
        resolveActiveTournament();
    }, [activeTournamentId]);

    const handleLoginSuccess = async (userData: any) => {
        setUser(userData);
        let tId = userData?.tournamentId || userData?.tournament_id;
        if (!tId || tId === 'tourney_ipl_2026') {
            try {
                const res = await apiFetch('/api/tournaments');
                if (res.ok) {
                    const tours = await res.json();
                    if (Array.isArray(tours) && tours.length > 0) {
                        tId = tours[0]._id || tours[0].id;
                    }
                }
            } catch {}
        }
        if (tId) setActiveTournamentId(tId);

        let nextScreen: 'login' | 'admin' | 'console' | 'bidding' | 'spectator' | 'player_registration' = 'spectator';
        if (userData?.role === 'superadmin') {
            nextScreen = 'admin';
        } else if (userData?.role === 'auctioneer') {
            nextScreen = 'console';
        } else if (userData?.role === 'team_owner') {
            nextScreen = 'bidding';
        }
        setCurrentScreen(nextScreen);
    };

    const handleLogout = async () => {
        setUser(null);
        setCurrentScreen('login');
        try {
            await safeStorage.removeItem(SESSION_STORAGE_KEY);
        } catch (e) {
            console.warn('⚠️ Logout session removal notice:', e);
        }
    };

    const team = user?.teamId && typeof user.teamId === 'object'
        ? user.teamId
        : {
            _id: user?.teamId || user?.team_id || 'team_default',
            name: user?.teamName || user?.team_name || (user?.username ? `${user.username}'s Team` : 'My Team'),
            shortName: user?.teamShortName || 'MT',
            budget: 100,
            spent: 0
        };

    const canSwitchRoles = user?.role === 'superadmin';

    // Splash Loader while checking persistent storage on cold start
    if (isRestoringSession) {
        return (
            <View style={[styles.container, styles.loadingCenter]}>
                <StatusBar style="dark" />
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>Resuming Auction Portal...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Screen Router */}
            {currentScreen === 'login' && (
                <LoginScreen
                    onLoginSuccess={handleLoginSuccess}
                />
            )}

            {currentScreen === 'player_registration' && (
                <PlayerRegistrationScreen
                    tournamentId={activeTournamentId}
                    tournamentName="Dab Cric Auction"
                    onBack={() => setCurrentScreen(prevScreen)}
                    onSuccess={() => setCurrentScreen(prevScreen)}
                />
            )}

            {currentScreen === 'spectator' && (
                <SpectatorScreen
                    tournamentId={activeTournamentId}
                    tournamentName="Dab Cric Auction Live"
                    onGoToLogin={() => setCurrentScreen(user ? (user.role === 'superadmin' ? 'admin' : 'bidding') : 'login')}
                />
            )}

            {currentScreen === 'bidding' && user && (
                <LiveBiddingRoom
                    user={user}
                    team={team}
                    tournamentId={activeTournamentId}
                    onLogout={handleLogout}
                    canSwitchRole={canSwitchRoles}
                    onSwitchRole={() => setCurrentScreen('admin')}
                />
            )}

            {currentScreen === 'console' && user && (
                <AdminConsoleScreen
                    user={user}
                    tournamentId={activeTournamentId}
                    tournamentName="Dab Cric Auction Console"
                    onLogout={handleLogout}
                    canSwitchRole={canSwitchRoles}
                    onSwitchRole={() => setCurrentScreen('admin')}
                    onBackToDashboard={() => setCurrentScreen('admin')}
                />
            )}

            {currentScreen === 'admin' && user && (
                <SuperAdminScreen
                    user={user}
                    onUpdateUser={(updated: any) => setUser((prev: any) => ({ ...prev, ...updated }))}
                    onLogout={handleLogout}
                    onLaunchConsole={(tId) => {
                        setActiveTournamentId(tId);
                        setCurrentScreen('console');
                    }}
                    onLaunchBiddingRoom={(tId) => {
                        setActiveTournamentId(tId);
                        setCurrentScreen('bidding');
                    }}
                    onOpenSpectator={(tId) => {
                        setActiveTournamentId(tId);
                        setCurrentScreen('spectator');
                    }}
                    onOpenPlayerRegistration={(tId) => {
                        setActiveTournamentId(tId);
                        setPrevScreen('admin');
                        setCurrentScreen('player_registration');
                    }}
                />
            )}

            {/* Super Admin Quick Navigation Bar (When logged in as superadmin) */}
            {user && user.role === 'superadmin' && currentScreen !== 'player_registration' && (
                <SafeAreaView style={styles.adminNavContainer}>
                    <View style={styles.adminNavBar}>
                        <TouchableOpacity
                            style={[styles.adminNavItem, currentScreen === 'admin' && styles.adminNavItemActive]}
                            onPress={() => setCurrentScreen('admin')}
                        >
                            <Shield size={14} color={currentScreen === 'admin' ? '#2563eb' : '#64748b'} />
                            <Text style={[styles.adminNavText, currentScreen === 'admin' && styles.adminNavTextActive]}>Admin</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.adminNavItem, currentScreen === 'console' && styles.adminNavItemActive]}
                            onPress={() => setCurrentScreen('console')}
                        >
                            <Award size={14} color={currentScreen === 'console' ? '#2563eb' : '#64748b'} />
                            <Text style={[styles.adminNavText, currentScreen === 'console' && styles.adminNavTextActive]}>Console</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.adminNavItem, currentScreen === 'spectator' && styles.adminNavItemActive]}
                            onPress={() => setCurrentScreen('spectator')}
                        >
                            <Eye size={14} color={currentScreen === 'spectator' ? '#2563eb' : '#64748b'} />
                            <Text style={[styles.adminNavText, currentScreen === 'spectator' && styles.adminNavTextActive]}>Spectator</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            )}

            {/* Global Toast Notifications Overlay */}
            <ToastOverlay />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    loadingCenter: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 13,
        fontWeight: '700',
        color: '#64748b',
    },
    adminNavContainer: {
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    adminNavBar: {
        flexDirection: 'row',
        paddingVertical: 6,
        paddingHorizontal: 8,
        justifyContent: 'space-around',
    },
    adminNavItem: {
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    adminNavItemActive: {
        backgroundColor: '#eff6ff',
    },
    adminNavText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#64748b',
        marginTop: 2,
    },
    adminNavTextActive: {
        color: '#2563eb',
    },
});
