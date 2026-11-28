const EVENTS = require('./voiceEvents');
const voiceService = require('./voiceService');
const { authenticateVoiceUser } = require('./voiceUtils');

function voiceRoomChannel(tournamentId) {
    return `voice_room_${tournamentId}`;
}

/**
 * Registers WebRTC voice signaling, moderation, and hand-raise handlers on a connected Socket.IO socket.
 * Completely modular and isolated from existing auction bidding handlers.
 */
module.exports = function registerVoiceHandlers(io, socket) {
    // 1. Join Voice Room
    socket.on(EVENTS.JOIN, async (payload = {}, callback) => {
        try {
            const { tournamentId, token, userId, isMicOn } = payload;
            const authResult = await authenticateVoiceUser({ token, userId, tournamentId });

            if (!authResult.ok) {
                socket.emit(EVENTS.ERROR, { message: authResult.error });
                if (typeof callback === 'function') callback({ ok: false, error: authResult.error });
                return;
            }

            const joinResult = voiceService.joinRoom(tournamentId, socket.id, authResult.user, Boolean(isMicOn));
            if (!joinResult.ok) {
                socket.emit(EVENTS.ERROR, { message: joinResult.error });
                if (typeof callback === 'function') callback({ ok: false, error: joinResult.error });
                return;
            }

            const channel = voiceRoomChannel(tournamentId);

            // Clean up any stale socket entries for the same user
            for (const staleSocketId of joinResult.removedStaleSockets) {
                io.to(channel).emit(EVENTS.PARTICIPANT_LEFT, {
                    socketId: staleSocketId,
                    tournamentId
                });
                const staleSocket = io.sockets.sockets.get(staleSocketId);
                if (staleSocket) {
                    staleSocket.leave(channel);
                }
            }

            socket.join(channel);

            // Send full participants list to the newly joined user
            socket.emit(EVENTS.PARTICIPANTS, {
                tournamentId,
                selfSocketId: socket.id,
                participants: joinResult.participants
            });

            // Notify existing participants in the room
            socket.to(channel).emit(EVENTS.PARTICIPANT_JOINED, {
                tournamentId,
                participant: joinResult.participant
            });

            if (typeof callback === 'function') {
                callback({
                    ok: true,
                    selfSocketId: socket.id,
                    participant: joinResult.participant,
                    participants: joinResult.participants
                });
            }
        } catch (err) {
            console.error('[Voice] JOIN error:', err);
            const message = 'Failed to join voice room. Please try again.';
            socket.emit(EVENTS.ERROR, { message });
            if (typeof callback === 'function') callback({ ok: false, error: message });
        }
    });

    // 2. Leave Voice Room
    const handleLeave = () => {
        const result = voiceService.leaveRoom(socket.id);
        if (!result) return;
        const { tournamentId, participant } = result;
        const channel = voiceRoomChannel(tournamentId);
        socket.leave(channel);
        io.to(channel).emit(EVENTS.PARTICIPANT_LEFT, {
            socketId: socket.id,
            userId: participant?.userId,
            tournamentId
        });
    };

    socket.on(EVENTS.LEAVE, handleLeave);
    socket.on('disconnect', handleLeave);

    // 3. WebRTC Signaling (Offer, Answer, ICE Candidate) — strictly isolated to same room
    socket.on(EVENTS.OFFER, ({ targetSocketId, sdp }) => {
        if (!targetSocketId || !sdp) return;
        const roomId = voiceService.validateSignalingPair(socket.id, targetSocketId);
        if (!roomId) return;
        io.to(targetSocketId).emit(EVENTS.OFFER, {
            fromSocketId: socket.id,
            sdp
        });
    });

    socket.on(EVENTS.ANSWER, ({ targetSocketId, sdp }) => {
        if (!targetSocketId || !sdp) return;
        const roomId = voiceService.validateSignalingPair(socket.id, targetSocketId);
        if (!roomId) return;
        io.to(targetSocketId).emit(EVENTS.ANSWER, {
            fromSocketId: socket.id,
            sdp
        });
    });

    socket.on(EVENTS.ICE_CANDIDATE, ({ targetSocketId, candidate }) => {
        if (!targetSocketId || !candidate) return;
        const roomId = voiceService.validateSignalingPair(socket.id, targetSocketId);
        if (!roomId) return;
        io.to(targetSocketId).emit(EVENTS.ICE_CANDIDATE, {
            fromSocketId: socket.id,
            candidate
        });
    });

    // 4. Personal Mic Status Synchronization
    socket.on(EVENTS.MIC_STATUS, ({ isMicOn }) => {
        const res = voiceService.setPersonalMicStatus(socket.id, isMicOn);
        if (!res) return;
        const { tournamentId, participant } = res;
        io.to(voiceRoomChannel(tournamentId)).emit(EVENTS.MIC_STATUS, {
            socketId: participant.socketId,
            userId: participant.userId,
            isMicOn: participant.isMicOn,
            isAdminMuted: participant.isAdminMuted,
            isEffectiveMicOn: participant.isEffectiveMicOn,
            isSpeaking: participant.isSpeaking
        });
    });

    // 5. Speaking Activity Indicator
    socket.on(EVENTS.SPEAKING, ({ isSpeaking }) => {
        const res = voiceService.setSpeakingStatus(socket.id, isSpeaking);
        if (!res) return;
        const { tournamentId, participant } = res;
        socket.to(voiceRoomChannel(tournamentId)).emit(EVENTS.SPEAKING, {
            socketId: participant.socketId,
            userId: participant.userId,
            isSpeaking: participant.isSpeaking
        });
    });

    // 6. Moderator: Individual Mute / Unmute Participant
    const handleIndividualModeration = (shouldMute) => ({ targetSocketId }) => {
        const res = voiceService.setAdminMuteParticipant(socket.id, targetSocketId, shouldMute);
        if (!res.ok) {
            socket.emit(EVENTS.ERROR, { message: res.error });
            return;
        }
        const { tournamentId, moderator, target } = res;
        io.to(voiceRoomChannel(tournamentId)).emit(EVENTS.MODERATION_STATE, {
            type: shouldMute ? 'mute-participant' : 'unmute-participant',
            moderatorName: moderator.name,
            targetSocketId: target.socketId,
            targetUserId: target.userId,
            isMicOn: target.isMicOn,
            isAdminMuted: target.isAdminMuted,
            isEffectiveMicOn: target.isEffectiveMicOn,
            isSpeaking: target.isSpeaking
        });
    };

    socket.on(EVENTS.MUTE_PARTICIPANT, handleIndividualModeration(true));
    socket.on(EVENTS.UNMUTE_PARTICIPANT, handleIndividualModeration(false));

    // 7. Moderator: Mute All / Unmute All
    const handleBulkModeration = (shouldMute) => () => {
        const res = voiceService.setAdminMuteAll(socket.id, shouldMute);
        if (!res.ok) {
            socket.emit(EVENTS.ERROR, { message: res.error });
            return;
        }
        const { tournamentId, moderator, participants } = res;
        io.to(voiceRoomChannel(tournamentId)).emit(EVENTS.MODERATION_STATE, {
            type: shouldMute ? 'mute-all' : 'unmute-all',
            moderatorName: moderator.name,
            moderatorSocketId: moderator.socketId,
            shouldMute,
            participants
        });
    };

    socket.on(EVENTS.MUTE_ALL, handleBulkModeration(true));
    socket.on(EVENTS.UNMUTE_ALL, handleBulkModeration(false));

    // 8. Raise Hand / Lower Hand
    socket.on(EVENTS.RAISE_HAND, () => {
        const res = voiceService.setHandState(socket.id, socket.id, true);
        if (!res.ok) {
            socket.emit(EVENTS.ERROR, { message: res.error });
            return;
        }
        const { tournamentId, target } = res;
        io.to(voiceRoomChannel(tournamentId)).emit(EVENTS.HAND_STATE, {
            socketId: target.socketId,
            userId: target.userId,
            isHandRaised: target.isHandRaised,
            handRaisedAt: target.handRaisedAt
        });
    });

    socket.on(EVENTS.LOWER_HAND, (payload = {}) => {
        const targetSocketId = payload?.targetSocketId || socket.id;
        const res = voiceService.setHandState(socket.id, targetSocketId, false);
        if (!res.ok) {
            socket.emit(EVENTS.ERROR, { message: res.error });
            return;
        }
        const { tournamentId, target } = res;
        io.to(voiceRoomChannel(tournamentId)).emit(EVENTS.HAND_STATE, {
            socketId: target.socketId,
            userId: target.userId,
            isHandRaised: target.isHandRaised,
            handRaisedAt: target.handRaisedAt
        });
    });
};
