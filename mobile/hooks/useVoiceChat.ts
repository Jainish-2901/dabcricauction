import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Platform, PermissionsAndroid, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeStorage } from '../lib/storage';
import socket from '../lib/socket';

// Safely load native WebRTC module so Expo Go doesn't crash on import
let webrtc: any = null;
try {
    webrtc = require('react-native-webrtc');
} catch {
    webrtc = null;
}

const AudioRouter = NativeModules?.AudioRouter || null;

export const isNativeWebRTCAvailable = Boolean(
    webrtc && webrtc.RTCPeerConnection && webrtc.mediaDevices
);

export interface VoiceParticipant {
    socketId: string;
    userId: string;
    name: string;
    role: string;
    roleLabel: string;
    isModerator: boolean;
    teamName?: string;
    avatar?: string;
    isMicOn: boolean;
    isAdminMuted: boolean;
    isEffectiveMicOn: boolean;
    isHandRaised: boolean;
    handRaisedAt?: number | null;
    isSpeaking: boolean;
    joinedAt?: number;
}

const getIceServers = () => {
    const iceServers: any[] = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ];

    const turnUrl = process.env.EXPO_PUBLIC_TURN_URL;
    if (turnUrl) {
        iceServers.push({
            urls: turnUrl,
            username: process.env.EXPO_PUBLIC_TURN_USERNAME || undefined,
            credential: process.env.EXPO_PUBLIC_TURN_PASSWORD || undefined
        });
    }

    return iceServers;
};

export function useVoiceChat({ tournamentId, user }: { tournamentId: string; user: any }) {
    const [voiceStatus, setVoiceStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
    const [voiceError, setVoiceError] = useState<string | null>(null);
    const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
    const [selfSocketId, setSelfSocketId] = useState<string | null>(null);
    const [isMicOn, setIsMicOn] = useState(false);
    const [isAdminMuted, setIsAdminMuted] = useState(false);
    const [isHandRaised, setIsHandRaised] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);
    const [micPermissionDenied, setMicPermissionDenied] = useState(false);
    const [moderatorNotice, setModeratorNotice] = useState<string | null>(null);
    const [p2pState, setP2pState] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle');

    const localStreamRef = useRef<any>(null);
    const peerConnectionsRef = useRef<Map<string, any>>(new Map());
    const pendingCandidatesRef = useRef<Map<string, any[]>>(new Map());
    const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isJoinedRef = useRef(false);
    const isMicOnRef = useRef(false);
    const isAdminMutedRef = useRef(false);
    const isSpeakingRef = useRef(false);

    const isEffectiveMicOn = isMicOn && !isAdminMuted;

    const syncLocalTrackEnabled = useCallback((micOn: boolean, adminMuted: boolean) => {
        const effective = Boolean(micOn) && !Boolean(adminMuted);
        if (localStreamRef.current) {
            try {
                localStreamRef.current.getAudioTracks().forEach((track: any) => {
                    track.enabled = effective;
                });
            } catch {
                // ignore
            }
        }
        if (!effective && isSpeakingRef.current) {
            isSpeakingRef.current = false;
            setIsSpeaking(false);
            if (isJoinedRef.current) {
                socket.emit('voice:speaking', { isSpeaking: false });
            }
        }
    }, []);

    const closePeerConnection = useCallback((remoteSocketId: string) => {
        const pc = peerConnectionsRef.current.get(remoteSocketId);
        if (pc) {
            try {
                pc.onicecandidate = null;
                pc.ontrack = null;
                pc.onconnectionstatechange = null;
                pc.close();
            } catch {
                // ignore
            }
            peerConnectionsRef.current.delete(remoteSocketId);
        }
        pendingCandidatesRef.current.delete(remoteSocketId);
    }, []);

    const stopStatsPolling = useCallback(() => {
        if (statsIntervalRef.current) {
            clearInterval(statsIntervalRef.current);
            statsIntervalRef.current = null;
        }
    }, []);

    const cleanupAllMediaAndPeers = useCallback(() => {
        stopStatsPolling();

        Array.from(peerConnectionsRef.current.keys()).forEach((sid) => {
            closePeerConnection(sid);
        });
        peerConnectionsRef.current.clear();
        pendingCandidatesRef.current.clear();

        if (localStreamRef.current) {
            try {
                localStreamRef.current.getTracks().forEach((track: any) => {
                    try {
                        track.stop();
                    } catch {
                        // ignore
                    }
                });
            } catch {
                // ignore
            }
            localStreamRef.current = null;
        }

        if (AudioRouter?.reset) {
            try {
                AudioRouter.reset();
            } catch {
                // ignore
            }
        }

        isJoinedRef.current = false;
        isSpeakingRef.current = false;
        setIsSpeaking(false);
    }, [closePeerConnection, stopStatsPolling]);

    const startStatsPolling = useCallback(() => {
        stopStatsPolling();
        statsIntervalRef.current = setInterval(async () => {
            if (!isJoinedRef.current || !isMicOnRef.current || isAdminMutedRef.current) {
                if (isSpeakingRef.current) {
                    isSpeakingRef.current = false;
                    setIsSpeaking(false);
                    socket.emit('voice:speaking', { isSpeaking: false });
                }
                return;
            }
            const firstPc = peerConnectionsRef.current.values().next().value;
            if (!firstPc || typeof firstPc.getStats !== 'function') return;
            try {
                const stats = await firstPc.getStats();
                let level = 0;
                stats.forEach((report: any) => {
                    if (report.type === 'media-source' && report.kind === 'audio' && typeof report.audioLevel === 'number') {
                        level = Math.max(level, report.audioLevel);
                    }
                });
                const speakingNow = level > 0.025;
                if (speakingNow !== isSpeakingRef.current) {
                    isSpeakingRef.current = speakingNow;
                    setIsSpeaking(speakingNow);
                    socket.emit('voice:speaking', { isSpeaking: speakingNow });
                }
            } catch {
                // ignore stats errors
            }
        }, 320);
    }, [stopStatsPolling]);

    const requestAndroidMicPermission = useCallback(async (): Promise<boolean> => {
        if (Platform.OS !== 'android') return true;
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                {
                    title: 'Microphone Permission',
                    message: 'Dab Cric Auction needs microphone access for live auction voice chat.',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'Allow'
                }
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch {
            return false;
        }
    }, []);

    const createPeerConnection = useCallback((remoteSocketId: string) => {
        if (peerConnectionsRef.current.has(remoteSocketId)) {
            return peerConnectionsRef.current.get(remoteSocketId);
        }
        if (!webrtc?.RTCPeerConnection) return null;

        const pc = new webrtc.RTCPeerConnection({
            iceServers: getIceServers(),
            iceCandidatePoolSize: 4
        });

        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach((track: any) => {
                pc.addTrack(track, localStreamRef.current);
            });
        } else {
            try {
                pc.addTransceiver('audio', { direction: 'recvonly' });
            } catch {
                // ignore
            }
        }

        pc.onicecandidate = (event: any) => {
            if (event.candidate && event.candidate.candidate) {
                socket.emit('voice:ice-candidate', {
                    targetSocketId: remoteSocketId,
                    candidate: {
                        candidate: event.candidate.candidate,
                        sdpMid: event.candidate.sdpMid ?? null,
                        sdpMLineIndex: event.candidate.sdpMLineIndex ?? null
                    }
                });
            }
        };

        pc.ontrack = (event: any) => {
            try {
                if (event?.track) {
                    event.track.enabled = true;
                }
                event?.streams?.forEach((stream: any) => {
                    stream?.getAudioTracks?.().forEach((t: any) => {
                        t.enabled = true;
                    });
                });
            } catch {
                // ignore
            }
        };

        pc.oniceconnectionstatechange = () => {
            const state = pc.iceConnectionState;
            if (state === 'connected' || state === 'completed') {
                setP2pState('connected');
            } else if (state === 'failed') {
                setP2pState('failed');
            } else if (state === 'checking' || state === 'new') {
                setP2pState('connecting');
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'connected') {
                setP2pState('connected');
            } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                if (pc.connectionState === 'failed') setP2pState('failed');
                closePeerConnection(remoteSocketId);
            }
        };

        peerConnectionsRef.current.set(remoteSocketId, pc);
        return pc;
    }, [closePeerConnection]);

    const flushPendingCandidates = useCallback(async (remoteSocketId: string, pc: any) => {
        const pending = pendingCandidatesRef.current.get(remoteSocketId);
        if (!pending || pending.length === 0) return;
        pendingCandidatesRef.current.delete(remoteSocketId);
        for (const candidate of pending) {
            try {
                await pc.addIceCandidate(new webrtc.RTCIceCandidate(candidate));
            } catch {
                // ignore
            }
        }
    }, []);

    const joinVoiceRoom = useCallback(async () => {
        if (!isNativeWebRTCAvailable) {
            setVoiceStatus('error');
            setVoiceError('Live WebRTC audio requires an EAS Development/Preview APK build (not supported in Expo Go).');
            return;
        }
        let resolvedUser = user;
        if (!resolvedUser) {
            try {
                const sessionStr = await safeStorage.getItem('@dab_cric_auction_active_session_v1');
                if (sessionStr) {
                    const parsed = JSON.parse(sessionStr);
                    if (parsed?.user) resolvedUser = parsed.user;
                }
            } catch {
                // ignore
            }
        }
        if (!resolvedUser) {
            try {
                const storedUserStr = await AsyncStorage.getItem('user');
                if (storedUserStr) resolvedUser = JSON.parse(storedUserStr);
            } catch {
                // ignore
            }
        }

        const resolvedTournamentId = tournamentId || resolvedUser?.tournamentId || resolvedUser?.tournament_id;
        if (!resolvedTournamentId || !resolvedUser) {
            setVoiceError('Missing tournament or user details.');
            return;
        }

        setVoiceStatus('connecting');
        setVoiceError(null);
        setModeratorNotice(null);

        let micGranted = false;
        const permGranted = await requestAndroidMicPermission();
        if (permGranted) {
            try {
                const stream = await webrtc.mediaDevices.getUserMedia({
                    audio: true,
                    video: false
                });
                localStreamRef.current = stream;
                micGranted = true;
                setMicPermissionDenied(false);
                isMicOnRef.current = true;
                setIsMicOn(true);
                syncLocalTrackEnabled(true, false);
            } catch (err) {
                console.warn('[Voice] getUserMedia error:', err);
                setMicPermissionDenied(true);
                isMicOnRef.current = false;
                setIsMicOn(false);
                setVoiceError('Microphone permission denied. Joined in listen-only mode.');
            }
        } else {
            setMicPermissionDenied(true);
            isMicOnRef.current = false;
            setIsMicOn(false);
            setVoiceError('Microphone permission denied. Joined in listen-only mode.');
        }

        if (AudioRouter?.setSpeakerphoneOn) {
            try {
                AudioRouter.setSpeakerphoneOn(isSpeakerOn);
            } catch {
                // ignore
            }
        }

        const storedToken = await AsyncStorage.getItem('token');
        const userId = resolvedUser?._id || resolvedUser?.id;
        const authToken = storedToken || (userId ? `sb_auth_token_${userId}` : null);

        if (!socket.connected) {
            socket.connect();
        }

        socket.emit(
            'voice:join',
            {
                tournamentId: resolvedTournamentId,
                token: authToken,
                userId,
                isMicOn: micGranted
            },
            async (ack: any) => {
                if (!ack || !ack.ok) {
                    setVoiceStatus('error');
                    setVoiceError(ack?.error || 'Could not join the voice room.');
                    cleanupAllMediaAndPeers();
                    return;
                }

                isJoinedRef.current = true;
                isAdminMutedRef.current = Boolean(ack.participant?.isAdminMuted);
                setIsAdminMuted(Boolean(ack.participant?.isAdminMuted));
                setIsHandRaised(Boolean(ack.participant?.isHandRaised));
                setSelfSocketId(ack.selfSocketId);
                setParticipants(ack.participants || []);
                setVoiceStatus('connected');
                startStatsPolling();

                const existingOthers = (ack.participants || []).filter((p: any) => p.socketId !== ack.selfSocketId);
                for (const peer of existingOthers) {
                    try {
                        const pc = createPeerConnection(peer.socketId);
                        if (!pc) continue;
                        const offer = await pc.createOffer({ offerToReceiveAudio: true });
                        await pc.setLocalDescription(offer);
                        const localSdp = pc.localDescription || offer;
                        socket.emit('voice:offer', {
                            targetSocketId: peer.socketId,
                            sdp: {
                                type: localSdp.type,
                                sdp: localSdp.sdp
                            }
                        });
                    } catch (err) {
                        console.error('[Voice] Error creating offer:', err);
                    }
                }
            }
        );
    }, [tournamentId, user, isSpeakerOn, requestAndroidMicPermission, syncLocalTrackEnabled, cleanupAllMediaAndPeers, startStatsPolling, createPeerConnection]);

    const leaveVoiceRoom = useCallback(() => {
        if (isJoinedRef.current) {
            socket.emit('voice:leave');
        }
        cleanupAllMediaAndPeers();
        setParticipants([]);
        setSelfSocketId(null);
        setIsMicOn(false);
        isMicOnRef.current = false;
        setIsAdminMuted(false);
        isAdminMutedRef.current = false;
        setIsHandRaised(false);
        setModeratorNotice(null);
        setP2pState('idle');
        setVoiceStatus('disconnected');
        setVoiceError(null);
    }, [cleanupAllMediaAndPeers]);

    const toggleMic = useCallback(async () => {
        if (!isJoinedRef.current) return;

        if (isAdminMutedRef.current) {
            setModeratorNotice('Muted by Admin. Only Admin or Auctioneer can unmute you.');
            return;
        }

        if (!localStreamRef.current && isNativeWebRTCAvailable) {
            const permGranted = await requestAndroidMicPermission();
            if (!permGranted) {
                setMicPermissionDenied(true);
                setVoiceError('Microphone permission is required to speak.');
                return;
            }
            try {
                const stream = await webrtc.mediaDevices.getUserMedia({ audio: true, video: false });
                localStreamRef.current = stream;
                setMicPermissionDenied(false);
                setVoiceError(null);
                const audioTrack = stream.getAudioTracks()[0];
                if (audioTrack) {
                    for (const [remoteSid, pc] of peerConnectionsRef.current.entries()) {
                        pc.addTrack(audioTrack, stream);
                        const offer = await pc.createOffer();
                        await pc.setLocalDescription(offer);
                        socket.emit('voice:offer', { targetSocketId: remoteSid, sdp: pc.localDescription });
                    }
                }
            } catch {
                setMicPermissionDenied(true);
                setVoiceError('Could not access microphone.');
                return;
            }
        }

        const nextMicOn = !isMicOnRef.current;
        isMicOnRef.current = nextMicOn;
        setIsMicOn(nextMicOn);
        syncLocalTrackEnabled(nextMicOn, isAdminMutedRef.current);
        socket.emit('voice:mic-status', { isMicOn: nextMicOn });
    }, [requestAndroidMicPermission, syncLocalTrackEnabled]);

    const toggleSpeaker = useCallback(() => {
        const next = !isSpeakerOn;
        setIsSpeakerOn(next);
        if (AudioRouter?.setSpeakerphoneOn) {
            try {
                AudioRouter.setSpeakerphoneOn(next);
            } catch {
                // ignore
            }
        }
    }, [isSpeakerOn]);

    const toggleHand = useCallback(() => {
        if (!isJoinedRef.current) return;
        if (isHandRaised) {
            socket.emit('voice:lower-hand', {});
        } else {
            socket.emit('voice:raise-hand');
        }
    }, [isHandRaised]);

    const muteParticipant = useCallback((targetSocketId: string) => {
        socket.emit('voice:mute-participant', { targetSocketId });
    }, []);

    const unmuteParticipant = useCallback((targetSocketId: string) => {
        socket.emit('voice:unmute-participant', { targetSocketId });
    }, []);

    const muteAll = useCallback(() => {
        socket.emit('voice:mute-all');
    }, []);

    const unmuteAll = useCallback(() => {
        socket.emit('voice:unmute-all');
    }, []);

    const lowerParticipantHand = useCallback((targetSocketId: string) => {
        socket.emit('voice:lower-hand', { targetSocketId });
    }, []);

    useEffect(() => {
        const onParticipants = ({ selfSocketId: mySid, participants: list }: any) => {
            if (mySid) setSelfSocketId(mySid);
            if (Array.isArray(list)) setParticipants(list);
        };

        const onParticipantJoined = ({ participant }: any) => {
            if (!participant) return;
            setParticipants((prev) => {
                const filtered = prev.filter((p) => p.socketId !== participant.socketId);
                return [...filtered, participant];
            });
        };

        const onParticipantLeft = ({ socketId: leftSid }: any) => {
            closePeerConnection(leftSid);
            setParticipants((prev) => prev.filter((p) => p.socketId !== leftSid));
        };

        const onOffer = async ({ fromSocketId, sdp }: any) => {
            if (!isJoinedRef.current || !fromSocketId || !sdp || !webrtc) return;
            try {
                const pc = createPeerConnection(fromSocketId);
                if (!pc) return;
                await pc.setRemoteDescription(new webrtc.RTCSessionDescription(sdp));
                await flushPendingCandidates(fromSocketId, pc);
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                const localSdp = pc.localDescription || answer;
                socket.emit('voice:answer', {
                    targetSocketId: fromSocketId,
                    sdp: {
                        type: localSdp.type,
                        sdp: localSdp.sdp
                    }
                });
            } catch (err) {
                console.error('[Voice] onOffer error:', err);
            }
        };

        const onAnswer = async ({ fromSocketId, sdp }: any) => {
            if (!isJoinedRef.current || !fromSocketId || !sdp || !webrtc) return;
            const pc = peerConnectionsRef.current.get(fromSocketId);
            if (!pc) return;
            try {
                await pc.setRemoteDescription(new webrtc.RTCSessionDescription(sdp));
                await flushPendingCandidates(fromSocketId, pc);
            } catch (err) {
                console.error('[Voice] onAnswer error:', err);
            }
        };

        const onIceCandidate = async ({ fromSocketId, candidate }: any) => {
            if (!isJoinedRef.current || !fromSocketId || !candidate || !webrtc) return;
            const pc = peerConnectionsRef.current.get(fromSocketId);
            if (!pc || !pc.remoteDescription) {
                const queue = pendingCandidatesRef.current.get(fromSocketId) || [];
                queue.push(candidate);
                pendingCandidatesRef.current.set(fromSocketId, queue);
                return;
            }
            try {
                await pc.addIceCandidate(new webrtc.RTCIceCandidate(candidate));
            } catch {
                // ignore
            }
        };

        const onMicStatus = ({ socketId: sid, isMicOn: mic, isAdminMuted: admMuted, isEffectiveMicOn: eff, isSpeaking: spk }: any) => {
            if (sid === socket.id) {
                isMicOnRef.current = Boolean(mic);
                isAdminMutedRef.current = Boolean(admMuted);
                setIsMicOn(Boolean(mic));
                setIsAdminMuted(Boolean(admMuted));
                syncLocalTrackEnabled(mic, admMuted);
            }
            setParticipants((prev) =>
                prev.map((p) =>
                    p.socketId === sid
                        ? { ...p, isMicOn: mic, isAdminMuted: admMuted, isEffectiveMicOn: eff, isSpeaking: spk }
                        : p
                )
            );
        };

        const onSpeaking = ({ socketId: sid, isSpeaking: spk }: any) => {
            setParticipants((prev) =>
                prev.map((p) => (p.socketId === sid ? { ...p, isSpeaking: Boolean(spk) } : p))
            );
        };

        const onModerationState = (data: any) => {
            if (!data) return;
            if (data.type === 'mute-all' || data.type === 'unmute-all') {
                if (Array.isArray(data.participants)) {
                    setParticipants(data.participants);
                }
                const me = (data.participants || []).find((p: any) => p.socketId === socket.id);
                if (me) {
                    isAdminMutedRef.current = Boolean(me.isAdminMuted);
                    setIsAdminMuted(Boolean(me.isAdminMuted));
                    syncLocalTrackEnabled(isMicOnRef.current, me.isAdminMuted);
                    setModeratorNotice(me.isAdminMuted ? `Muted by ${data.moderatorName || 'Admin'}` : null);
                }
            } else {
                const { targetSocketId, isMicOn: mic, isAdminMuted: admMuted, isEffectiveMicOn: eff, isSpeaking: spk, moderatorName } = data;
                if (targetSocketId === socket.id) {
                    isAdminMutedRef.current = Boolean(admMuted);
                    setIsAdminMuted(Boolean(admMuted));
                    syncLocalTrackEnabled(isMicOnRef.current, admMuted);
                    setModeratorNotice(admMuted ? `Muted by ${moderatorName || 'Admin'}` : null);
                }
                setParticipants((prev) =>
                    prev.map((p) =>
                        p.socketId === targetSocketId
                            ? { ...p, isMicOn: mic, isAdminMuted: admMuted, isEffectiveMicOn: eff, isSpeaking: spk }
                            : p
                    )
                );
            }
        };

        const onHandState = ({ socketId: sid, isHandRaised: raised, handRaisedAt }: any) => {
            if (sid === socket.id) {
                setIsHandRaised(Boolean(raised));
            }
            setParticipants((prev) =>
                prev.map((p) => (p.socketId === sid ? { ...p, isHandRaised: Boolean(raised), handRaisedAt } : p))
            );
        };

        const onVoiceError = ({ message }: any) => {
            if (message) setVoiceError(message);
        };

        const onSocketReconnect = () => {
            if (isJoinedRef.current) {
                joinVoiceRoom();
            }
        };

        socket.on('voice:participants', onParticipants);
        socket.on('voice:participant-joined', onParticipantJoined);
        socket.on('voice:participant-left', onParticipantLeft);
        socket.on('voice:offer', onOffer);
        socket.on('voice:answer', onAnswer);
        socket.on('voice:ice-candidate', onIceCandidate);
        socket.on('voice:mic-status', onMicStatus);
        socket.on('voice:speaking', onSpeaking);
        socket.on('voice:moderation-state', onModerationState);
        socket.on('voice:hand-state', onHandState);
        socket.on('voice:error', onVoiceError);
        socket.on('connect', onSocketReconnect);

        return () => {
            socket.off('voice:participants', onParticipants);
            socket.off('voice:participant-joined', onParticipantJoined);
            socket.off('voice:participant-left', onParticipantLeft);
            socket.off('voice:offer', onOffer);
            socket.off('voice:answer', onAnswer);
            socket.off('voice:ice-candidate', onIceCandidate);
            socket.off('voice:mic-status', onMicStatus);
            socket.off('voice:speaking', onSpeaking);
            socket.off('voice:moderation-state', onModerationState);
            socket.off('voice:hand-state', onHandState);
            socket.off('voice:error', onVoiceError);
            socket.off('connect', onSocketReconnect);
        };
    }, [closePeerConnection, createPeerConnection, flushPendingCandidates, joinVoiceRoom, syncLocalTrackEnabled]);

    useEffect(() => {
        if (voiceStatus === 'connected' && AudioRouter?.setSpeakerphoneOn) {
            try {
                AudioRouter.setSpeakerphoneOn(isSpeakerOn);
            } catch {
                // ignore
            }
        }
    }, [voiceStatus, p2pState, isSpeakerOn]);

    useEffect(() => {
        return () => {
            if (isJoinedRef.current) {
                socket.emit('voice:leave');
            }
            cleanupAllMediaAndPeers();
        };
    }, [cleanupAllMediaAndPeers]);

    const sortedParticipants = useMemo(() => {
        const myId = selfSocketId || socket.id;
        const myUserId = user?._id || user?.id;
        const seen = new Set<string>();
        const unique: VoiceParticipant[] = [];
        for (const p of participants) {
            if (!p || seen.has(p.socketId)) continue;
            seen.add(p.socketId);
            unique.push(p);
        }
        return unique.sort((a, b) => {
            const aIsMe = a.socketId === myId || (myUserId && a.userId === String(myUserId));
            const bIsMe = b.socketId === myId || (myUserId && b.userId === String(myUserId));
            if (aIsMe && !bIsMe) return -1;
            if (!aIsMe && bIsMe) return 1;
            return (a.joinedAt || 0) - (b.joinedAt || 0);
        });
    }, [participants, selfSocketId, user]);

    return {
        voiceStatus,
        voiceError,
        participants: sortedParticipants,
        selfSocketId: selfSocketId || socket.id,
        isJoined: voiceStatus === 'connected',
        isConnecting: voiceStatus === 'connecting',
        isMicOn,
        isAdminMuted,
        isEffectiveMicOn,
        isHandRaised,
        isSpeaking,
        isSpeakerOn,
        micPermissionDenied,
        moderatorNotice,
        p2pState,
        isNativeWebRTCAvailable,
        joinVoiceRoom,
        leaveVoiceRoom,
        toggleMic,
        toggleSpeaker,
        toggleHand,
        muteParticipant,
        unmuteParticipant,
        muteAll,
        unmuteAll,
        lowerParticipantHand
    };
}
