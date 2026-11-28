import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import socket from '../socket';

const getIceServers = () => {
    const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ];

    // Ready for optional self-hosted TURN server via environment variables
    const turnUrl = import.meta.env.VITE_TURN_URL;
    if (turnUrl) {
        iceServers.push({
            urls: turnUrl,
            username: import.meta.env.VITE_TURN_USERNAME || undefined,
            credential: import.meta.env.VITE_TURN_PASSWORD || undefined
        });
    }

    return iceServers;
};

export function useVoiceChat({ tournamentId, user }) {
    const [voiceStatus, setVoiceStatus] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected' | 'error'
    const [voiceError, setVoiceError] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [selfSocketId, setSelfSocketId] = useState(null);
    const [isMicOn, setIsMicOn] = useState(false);
    const [isAdminMuted, setIsAdminMuted] = useState(false);
    const [isHandRaised, setIsHandRaised] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [micPermissionDenied, setMicPermissionDenied] = useState(false);
    const [moderatorNotice, setModeratorNotice] = useState(null);

    const localStreamRef = useRef(null);
    const peerConnectionsRef = useRef(new Map()); // Map<remoteSocketId, RTCPeerConnection>
    const pendingCandidatesRef = useRef(new Map()); // Map<remoteSocketId, RTCIceCandidateInit[]>
    const remoteAudioRefs = useRef(new Map()); // Map<remoteSocketId, HTMLAudioElement>
    const audioContextRef = useRef(null);
    const analyserIntervalRef = useRef(null);
    const isJoinedRef = useRef(false);
    const isMicOnRef = useRef(false);
    const isAdminMutedRef = useRef(false);
    const isSpeakingRef = useRef(false);

    const isEffectiveMicOn = isMicOn && !isAdminMuted;

    const syncLocalTrackEnabled = useCallback((micOn, adminMuted) => {
        const effective = Boolean(micOn) && !Boolean(adminMuted);
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach((track) => {
                track.enabled = effective;
            });
        }
        if (!effective && isSpeakingRef.current) {
            isSpeakingRef.current = false;
            setIsSpeaking(false);
            if (isJoinedRef.current) {
                socket.emit('voice:speaking', { isSpeaking: false });
            }
        }
    }, []);

    const closePeerConnection = useCallback((remoteSocketId) => {
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

        const audioEl = remoteAudioRefs.current.get(remoteSocketId);
        if (audioEl) {
            try {
                audioEl.pause();
                audioEl.srcObject = null;
                audioEl.remove();
            } catch {
                // ignore
            }
            remoteAudioRefs.current.delete(remoteSocketId);
        }
    }, []);

    const stopLocalAudioAnalysis = useCallback(() => {
        if (analyserIntervalRef.current) {
            clearInterval(analyserIntervalRef.current);
            analyserIntervalRef.current = null;
        }
        if (audioContextRef.current) {
            try {
                audioContextRef.current.close();
            } catch {
                // ignore
            }
            audioContextRef.current = null;
        }
    }, []);

    const cleanupAllMediaAndPeers = useCallback(() => {
        stopLocalAudioAnalysis();

        Array.from(peerConnectionsRef.current.keys()).forEach((sid) => {
            closePeerConnection(sid);
        });
        peerConnectionsRef.current.clear();
        pendingCandidatesRef.current.clear();

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                try {
                    track.stop();
                } catch {
                    // ignore
                }
            });
            localStreamRef.current = null;
        }

        isJoinedRef.current = false;
        isSpeakingRef.current = false;
        setIsSpeaking(false);
    }, [closePeerConnection, stopLocalAudioAnalysis]);

    const startLocalAudioAnalysis = useCallback((stream) => {
        stopLocalAudioAnalysis();
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 512;
            source.connect(analyser);
            audioContextRef.current = ctx;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyserIntervalRef.current = setInterval(() => {
                if (!isJoinedRef.current || !isMicOnRef.current || isAdminMutedRef.current) {
                    if (isSpeakingRef.current) {
                        isSpeakingRef.current = false;
                        setIsSpeaking(false);
                        socket.emit('voice:speaking', { isSpeaking: false });
                    }
                    return;
                }
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const avg = sum / dataArray.length;
                const speakingNow = avg > 14;
                if (speakingNow !== isSpeakingRef.current) {
                    isSpeakingRef.current = speakingNow;
                    setIsSpeaking(speakingNow);
                    socket.emit('voice:speaking', { isSpeaking: speakingNow });
                }
            }, 160);
        } catch {
            // AudioContext not available or blocked
        }
    }, [stopLocalAudioAnalysis]);

    const createPeerConnection = useCallback((remoteSocketId) => {
        if (peerConnectionsRef.current.has(remoteSocketId)) {
            return peerConnectionsRef.current.get(remoteSocketId);
        }

        const pc = new RTCPeerConnection({
            iceServers: getIceServers(),
            iceCandidatePoolSize: 4
        });

        // Attach local audio track if available
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach((track) => {
                pc.addTrack(track, localStreamRef.current);
            });
        } else {
            // Listen-only transceiver so we can still receive audio without mic
            try {
                pc.addTransceiver('audio', { direction: 'recvonly' });
            } catch {
                // ignore
            }
        }

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('voice:ice-candidate', {
                    targetSocketId: remoteSocketId,
                    candidate: event.candidate
                });
            }
        };

        pc.ontrack = (event) => {
            const [remoteStream] = event.streams;
            if (!remoteStream) return;
            let audioEl = remoteAudioRefs.current.get(remoteSocketId);
            if (!audioEl) {
                audioEl = document.createElement('audio');
                audioEl.autoplay = true;
                audioEl.playsInline = true;
                audioEl.style.display = 'none';
                document.body.appendChild(audioEl);
                remoteAudioRefs.current.set(remoteSocketId, audioEl);
            }
            audioEl.srcObject = remoteStream;
            audioEl.play().catch(() => {
                // Browser autoplay policy; user already clicked Join so usually allowed
            });
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                closePeerConnection(remoteSocketId);
            }
        };

        peerConnectionsRef.current.set(remoteSocketId, pc);
        return pc;
    }, [closePeerConnection]);

    const flushPendingCandidates = useCallback(async (remoteSocketId, pc) => {
        const pending = pendingCandidatesRef.current.get(remoteSocketId);
        if (!pending || pending.length === 0) return;
        pendingCandidatesRef.current.delete(remoteSocketId);
        for (const candidate of pending) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch {
                // ignore invalid/stale candidate
            }
        }
    }, []);

    const joinVoiceRoom = useCallback(async () => {
        if (!tournamentId || !user) {
            setVoiceError('You must be logged in to join the voice room.');
            return;
        }

        setVoiceStatus('connecting');
        setVoiceError(null);
        setModeratorNotice(null);

        // 1. Request microphone access (audio-only, never video)
        let micGranted = false;
        try {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    },
                    video: false
                });
                localStreamRef.current = stream;
                micGranted = true;
                setMicPermissionDenied(false);
                // Start unmuted by default if mic granted, or respect initial state
                isMicOnRef.current = true;
                setIsMicOn(true);
                syncLocalTrackEnabled(true, false);
                startLocalAudioAnalysis(stream);
            }
        } catch (err) {
            console.warn('[Voice] Microphone permission denied or unavailable:', err);
            setMicPermissionDenied(true);
            isMicOnRef.current = false;
            setIsMicOn(false);
            setVoiceError('Microphone access was denied. Joined in listen-only mode.');
        }

        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const userId = user?._id || user?.id;

        if (!socket.connected) {
            socket.connect();
        }

        socket.emit(
            'voice:join',
            {
                tournamentId,
                token,
                userId,
                isMicOn: micGranted
            },
            async (ack) => {
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

                // Deterministic Offerer: newly joined user initiates offers to existing participants
                const existingOthers = (ack.participants || []).filter((p) => p.socketId !== ack.selfSocketId);
                for (const peer of existingOthers) {
                    try {
                        const pc = createPeerConnection(peer.socketId);
                        const offer = await pc.createOffer({ offerToReceiveAudio: true });
                        await pc.setLocalDescription(offer);
                        socket.emit('voice:offer', {
                            targetSocketId: peer.socketId,
                            sdp: pc.localDescription
                        });
                    } catch (err) {
                        console.error('[Voice] Error creating offer for peer:', peer.socketId, err);
                    }
                }
            }
        );
    }, [tournamentId, user, syncLocalTrackEnabled, startLocalAudioAnalysis, cleanupAllMediaAndPeers, createPeerConnection]);

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
        setVoiceStatus('disconnected');
        setVoiceError(null);
    }, [cleanupAllMediaAndPeers]);

    const toggleMic = useCallback(async () => {
        if (!isJoinedRef.current) return;

        if (isAdminMutedRef.current) {
            setModeratorNotice('You are muted by the Admin. Only the Admin or Auctioneer can unmute you.');
            return;
        }

        // If user originally joined in listen-only mode (denied mic earlier), try requesting mic now
        if (!localStreamRef.current) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    },
                    video: false
                });
                localStreamRef.current = stream;
                setMicPermissionDenied(false);
                setVoiceError(null);

                // Add audio track to all existing peer connections and renegotiate
                const audioTrack = stream.getAudioTracks()[0];
                if (audioTrack) {
                    for (const [remoteSid, pc] of peerConnectionsRef.current.entries()) {
                        pc.addTrack(audioTrack, stream);
                        const offer = await pc.createOffer();
                        await pc.setLocalDescription(offer);
                        socket.emit('voice:offer', {
                            targetSocketId: remoteSid,
                            sdp: pc.localDescription
                        });
                    }
                }
                startLocalAudioAnalysis(stream);
            } catch {
                setMicPermissionDenied(true);
                setVoiceError('Microphone permission is required to speak. Please allow mic access in your browser.');
                return;
            }
        }

        const nextMicOn = !isMicOnRef.current;
        isMicOnRef.current = nextMicOn;
        setIsMicOn(nextMicOn);
        syncLocalTrackEnabled(nextMicOn, isAdminMutedRef.current);
        socket.emit('voice:mic-status', { isMicOn: nextMicOn });
    }, [syncLocalTrackEnabled, startLocalAudioAnalysis]);

    const toggleHand = useCallback(() => {
        if (!isJoinedRef.current) return;
        if (isHandRaised) {
            socket.emit('voice:lower-hand', {});
        } else {
            socket.emit('voice:raise-hand');
        }
    }, [isHandRaised]);

    const muteParticipant = useCallback((targetSocketId) => {
        socket.emit('voice:mute-participant', { targetSocketId });
    }, []);

    const unmuteParticipant = useCallback((targetSocketId) => {
        socket.emit('voice:unmute-participant', { targetSocketId });
    }, []);

    const muteAll = useCallback(() => {
        socket.emit('voice:mute-all');
    }, []);

    const unmuteAll = useCallback(() => {
        socket.emit('voice:unmute-all');
    }, []);

    const lowerParticipantHand = useCallback((targetSocketId) => {
        socket.emit('voice:lower-hand', { targetSocketId });
    }, []);

    // Socket listeners for signaling, moderation, and hand state
    useEffect(() => {
        const onParticipants = ({ selfSocketId: mySid, participants: list }) => {
            if (mySid) setSelfSocketId(mySid);
            if (Array.isArray(list)) setParticipants(list);
        };

        const onParticipantJoined = ({ participant }) => {
            if (!participant) return;
            setParticipants((prev) => {
                const filtered = prev.filter((p) => p.socketId !== participant.socketId);
                return [...filtered, participant];
            });
        };

        const onParticipantLeft = ({ socketId: leftSid }) => {
            closePeerConnection(leftSid);
            setParticipants((prev) => prev.filter((p) => p.socketId !== leftSid));
        };

        const onOffer = async ({ fromSocketId, sdp }) => {
            if (!isJoinedRef.current || !fromSocketId || !sdp) return;
            try {
                const pc = createPeerConnection(fromSocketId);
                await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                await flushPendingCandidates(fromSocketId, pc);
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit('voice:answer', {
                    targetSocketId: fromSocketId,
                    sdp: pc.localDescription
                });
            } catch (err) {
                console.error('[Voice] Error handling offer:', err);
            }
        };

        const onAnswer = async ({ fromSocketId, sdp }) => {
            if (!isJoinedRef.current || !fromSocketId || !sdp) return;
            const pc = peerConnectionsRef.current.get(fromSocketId);
            if (!pc) return;
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                await flushPendingCandidates(fromSocketId, pc);
            } catch (err) {
                console.error('[Voice] Error handling answer:', err);
            }
        };

        const onIceCandidate = async ({ fromSocketId, candidate }) => {
            if (!isJoinedRef.current || !fromSocketId || !candidate) return;
            const pc = peerConnectionsRef.current.get(fromSocketId);
            if (!pc || !pc.remoteDescription) {
                const queue = pendingCandidatesRef.current.get(fromSocketId) || [];
                queue.push(candidate);
                pendingCandidatesRef.current.set(fromSocketId, queue);
                return;
            }
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch {
                // ignore
            }
        };

        const onMicStatus = ({ socketId: sid, isMicOn: mic, isAdminMuted: admMuted, isEffectiveMicOn: eff, isSpeaking: spk }) => {
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

        const onSpeaking = ({ socketId: sid, isSpeaking: spk }) => {
            setParticipants((prev) =>
                prev.map((p) => (p.socketId === sid ? { ...p, isSpeaking: Boolean(spk) } : p))
            );
        };

        const onModerationState = (data) => {
            if (!data) return;
            if (data.type === 'mute-all' || data.type === 'unmute-all') {
                if (Array.isArray(data.participants)) {
                    setParticipants(data.participants);
                }
                const me = (data.participants || []).find((p) => p.socketId === socket.id);
                if (me) {
                    isAdminMutedRef.current = Boolean(me.isAdminMuted);
                    setIsAdminMuted(Boolean(me.isAdminMuted));
                    syncLocalTrackEnabled(isMicOnRef.current, me.isAdminMuted);
                    if (me.isAdminMuted) {
                        setModeratorNotice(`Muted by ${data.moderatorName || 'Admin'}`);
                    } else {
                        setModeratorNotice(null);
                    }
                }
            } else {
                const { targetSocketId, isMicOn: mic, isAdminMuted: admMuted, isEffectiveMicOn: eff, isSpeaking: spk, moderatorName } = data;
                if (targetSocketId === socket.id) {
                    isAdminMutedRef.current = Boolean(admMuted);
                    setIsAdminMuted(Boolean(admMuted));
                    syncLocalTrackEnabled(isMicOnRef.current, admMuted);
                    if (admMuted) {
                        setModeratorNotice(`Muted by ${moderatorName || 'Admin'}`);
                    } else {
                        setModeratorNotice(null);
                    }
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

        const onHandState = ({ socketId: sid, isHandRaised: raised, handRaisedAt }) => {
            if (sid === socket.id) {
                setIsHandRaised(Boolean(raised));
            }
            setParticipants((prev) =>
                prev.map((p) =>
                    p.socketId === sid ? { ...p, isHandRaised: Boolean(raised), handRaisedAt } : p
                )
            );
        };

        const onVoiceError = ({ message }) => {
            if (message) setVoiceError(message);
        };

        const onSocketReconnect = () => {
            if (isJoinedRef.current) {
                // Re-join cleanly after socket reconnect
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

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (isJoinedRef.current) {
                socket.emit('voice:leave');
            }
            cleanupAllMediaAndPeers();
        };
    }, [cleanupAllMediaAndPeers]);

    // Sort participants so the current user's card is ALWAYS first, never duplicated
    const sortedParticipants = useMemo(() => {
        const myId = selfSocketId || socket.id;
        const myUserId = user?._id || user?.id;
        const seen = new Set();
        const unique = [];
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
        micPermissionDenied,
        moderatorNotice,
        joinVoiceRoom,
        leaveVoiceRoom,
        toggleMic,
        toggleHand,
        muteParticipant,
        unmuteParticipant,
        muteAll,
        unmuteAll,
        lowerParticipantHand
    };
}
