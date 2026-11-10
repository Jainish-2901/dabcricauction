import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, SafeAreaView, AppState, AppStateStatus, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './components/LoginScreen';
import LiveBiddingRoom from './components/LiveBiddingRoom';
import AdminConsoleScreen from './components/AdminConsoleScreen';
import SuperAdminScreen from './components/SuperAdminScreen';
import SpectatorScreen from './components/SpectatorScreen';
import PlayerRegistrationScreen from './components/PlayerRegistrationScreen';
import { Shield, Award, Users, Eye, UserPlus } from 'lucide-react-native';
import { checkForAppUpdates } from './lib/updateManager';
import { ToastOverlay } from './lib/toast';

const SESSION_STORAGE_KEY = '@dab_cric_auction_active_session_v1';

export default function App() {
    const [user, setUser] = useState<any>(null);
    const [currentScreen, setCurrentScreen] = useState<'login' | 'admin' | 'console' | 'bidding' | 'spectator' | 'player_registration'>('login');
    const [activeTournamentId, setActiveTournamentId] = useState<string>('tourney_ipl_2026');
    const [prevScreen, setPrevScreen] = useState<'login' | 'admin'>('login');
    const [isRestoringSession, setIsRestoringSession] = useState<boolean>(true);

    // 1. Initial Launch: Check OTA Updates and Restore Last Active Session
    useEffect(() => {
        // Automatically check for OTA updates on app launch
        checkForAppUpdates();

        const restoreSession = async () => {
            try {
                const storedSession = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
                if (storedSession) {
                    const parsed = JSON.parse(storedSession);
                    if (parsed.user) {
                        setUser(parsed.user);

                        if (parsed.activeTournamentId) {
                            setActiveTournamentId(parsed.activeTournamentId);
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
                        await AsyncStorage.setItem(
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
                        await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
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
                AsyncStorage.setItem(
                    SESSION_STORAGE_KEY,
                    JSON.stringify({
                        user,
                        currentScreen,
                        activeTournamentId,
                        prevScreen,
                        lastActiveAt: Date.now()
                    })
                ).catch(() => {});
            }
        });

        return () => {
            subscription.remove();
        };
    }, [user, currentScreen, activeTournamentId, prevScreen]);

    const handleLoginSuccess = (userData: any) => {
        setUser(userData);
        const tId = userData?.tournamentId || 'tourney_ipl_2026';
        setActiveTournamentId(tId);

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
            await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
        } catch (e) {
            console.warn('⚠️ Logout session removal notice:', e);
        }
    };

    const team = user?.teamId && typeof user.teamId === 'object'
        ? user.teamId
        : {
            _id: user?.teamId || 'team_default',
            name: user?.username ? `${user.username}'s Team` : 'My Team',
            shortName: 'MT',
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
                    team={team}
                    tournamentId={activeTournamentId}
                    onLogout={handleLogout}
                    canSwitchRole={canSwitchRoles}
                    onSwitchRole={() => setCurrentScreen('admin')}
                    onBackToDashboard={() => setCurrentScreen('admin')}
                />
            )}

            {currentScreen === 'console' && user && (
                <AdminConsoleScreen
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
