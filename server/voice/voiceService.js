/**
 * In-memory Voice Room State Manager.
 * Isolated per tournamentId so rooms never leak across auctions.
 * No audio data or recordings are ever stored.
 */

const MAX_VOICE_PARTICIPANTS = 15;

// Map<tournamentId, Map<socketId, Participant>>
const rooms = new Map();
// Map<socketId, tournamentId> for fast disconnect cleanup
const socketToRoom = new Map();

function getRoom(tournamentId) {
    if (!rooms.has(tournamentId)) {
        rooms.set(tournamentId, new Map());
    }
    return rooms.get(tournamentId);
}

function getParticipantsList(tournamentId) {
    const room = rooms.get(tournamentId);
    if (!room) return [];
    return Array.from(room.values());
}

function getParticipant(tournamentId, socketId) {
    const room = rooms.get(tournamentId);
    return room ? room.get(socketId) || null : null;
}

function getRoomIdBySocket(socketId) {
    return socketToRoom.get(socketId) || null;
}

/**
 * Adds a participant to a tournament voice room.
 * Automatically removes any stale socket entry for the same userId in the same room.
 */
function joinRoom(tournamentId, socketId, userInfo, initialMicOn = false) {
    // If socket was previously in another room, remove it first
    const prevRoomId = socketToRoom.get(socketId);
    if (prevRoomId && prevRoomId !== tournamentId) {
        leaveRoom(socketId);
    }

    const room = getRoom(tournamentId);

    // Deduplicate stale connections for the same userId in this room
    const removedStaleSockets = [];
    for (const [existingSocketId, existingParticipant] of room.entries()) {
        if (existingParticipant.userId === userInfo.userId && existingSocketId !== socketId) {
            room.delete(existingSocketId);
            socketToRoom.delete(existingSocketId);
            removedStaleSockets.push(existingSocketId);
        }
    }

    if (room.size >= MAX_VOICE_PARTICIPANTS && !room.has(socketId)) {
        return {
            ok: false,
            error: `Voice room is full (max ${MAX_VOICE_PARTICIPANTS} participants).`
        };
    }

    // Preserve any existing admin mute if they just reconnected? Actually, fresh join starts clean unless reconnected,
    // or we can default isAdminMuted to false on fresh join.
    const participant = {
        socketId,
        userId: userInfo.userId,
        name: userInfo.name,
        role: userInfo.role,
        roleLabel: userInfo.roleLabel,
        isModerator: Boolean(userInfo.isModerator),
        teamName: userInfo.teamName || '',
        avatar: userInfo.avatar || '',
        isMicOn: Boolean(initialMicOn),
        isAdminMuted: false,
        isEffectiveMicOn: Boolean(initialMicOn),
        isHandRaised: false,
        handRaisedAt: null,
        isSpeaking: false,
        joinedAt: Date.now()
    };

    room.set(socketId, participant);
    socketToRoom.set(socketId, tournamentId);

    return {
        ok: true,
        participant,
        removedStaleSockets,
        participants: getParticipantsList(tournamentId)
    };
}

function leaveRoom(socketId) {
    const tournamentId = socketToRoom.get(socketId);
    if (!tournamentId) return null;

    socketToRoom.delete(socketId);
    const room = rooms.get(tournamentId);
    if (!room) return null;

    const participant = room.get(socketId) || null;
    room.delete(socketId);

    if (room.size === 0) {
        rooms.delete(tournamentId);
    }

    return { tournamentId, participant };
}

/**
 * Updates participant's personal mic preference.
 * Respects admin-enforced mute: effective mic only turns ON if !isAdminMuted.
 */
function setPersonalMicStatus(socketId, isMicOn) {
    const tournamentId = socketToRoom.get(socketId);
    if (!tournamentId) return null;
    const participant = getParticipant(tournamentId, socketId);
    if (!participant) return null;

    participant.isMicOn = Boolean(isMicOn);
    participant.isEffectiveMicOn = participant.isMicOn && !participant.isAdminMuted;
    if (!participant.isEffectiveMicOn) {
        participant.isSpeaking = false;
    }

    return { tournamentId, participant };
}

function setSpeakingStatus(socketId, isSpeaking) {
    const tournamentId = socketToRoom.get(socketId);
    if (!tournamentId) return null;
    const participant = getParticipant(tournamentId, socketId);
    if (!participant) return null;

    // Only allow speaking indicator if their mic is effectively ON
    participant.isSpeaking = participant.isEffectiveMicOn ? Boolean(isSpeaking) : false;
    return { tournamentId, participant };
}

/**
 * Admin/Moderator: Mute or unmute a specific target participant.
 * Preserves target's personal `isMicOn` preference when unmuting.
 */
function setAdminMuteParticipant(moderatorSocketId, targetSocketId, shouldMute) {
    const tournamentId = socketToRoom.get(moderatorSocketId);
    if (!tournamentId) return { ok: false, error: 'You are not in a voice room.' };

    const moderator = getParticipant(tournamentId, moderatorSocketId);
    if (!moderator || !moderator.isModerator) {
        return { ok: false, error: 'Only Admin or Auctioneer can moderate participants.' };
    }

    if (moderatorSocketId === targetSocketId) {
        return { ok: false, error: 'Use your own mic button to mute/unmute yourself.' };
    }

    const target = getParticipant(tournamentId, targetSocketId);
    if (!target) {
        return { ok: false, error: 'Target participant is no longer in the voice room.' };
    }

    target.isAdminMuted = Boolean(shouldMute);
    target.isEffectiveMicOn = target.isMicOn && !target.isAdminMuted;
    if (!target.isEffectiveMicOn) {
        target.isSpeaking = false;
    }

    return {
        ok: true,
        tournamentId,
        moderator,
        target
    };
}

/**
 * Admin/Moderator: Mute All or Unmute All other participants in the room.
 * Does NOT mute the moderator themselves.
 * Unmute All removes admin restriction without turning on anyone's mic if they personally muted.
 */
function setAdminMuteAll(moderatorSocketId, shouldMute) {
    const tournamentId = socketToRoom.get(moderatorSocketId);
    if (!tournamentId) return { ok: false, error: 'You are not in a voice room.' };

    const moderator = getParticipant(tournamentId, moderatorSocketId);
    if (!moderator || !moderator.isModerator) {
        return { ok: false, error: 'Only Admin or Auctioneer can moderate the room.' };
    }

    const room = rooms.get(tournamentId);
    if (!room) return { ok: false, error: 'Voice room not found.' };

    const updatedParticipants = [];
    for (const [sid, p] of room.entries()) {
        if (sid === moderatorSocketId) continue; // Never mute the moderator via Mute All
        p.isAdminMuted = Boolean(shouldMute);
        p.isEffectiveMicOn = p.isMicOn && !p.isAdminMuted;
        if (!p.isEffectiveMicOn) {
            p.isSpeaking = false;
        }
        updatedParticipants.push(p);
    }

    return {
        ok: true,
        tournamentId,
        moderator,
        shouldMute: Boolean(shouldMute),
        participants: getParticipantsList(tournamentId),
        updatedParticipants
    };
}

/**
 * Raise or Lower hand.
 * Participants can raise/lower their own hand.
 * Moderators can also lower another participant's hand.
 */
function setHandState(actorSocketId, targetSocketId, isRaised) {
    const tournamentId = socketToRoom.get(actorSocketId);
    if (!tournamentId) return { ok: false, error: 'You are not in a voice room.' };

    const actor = getParticipant(tournamentId, actorSocketId);
    if (!actor) return { ok: false, error: 'Participant not found.' };

    const effectiveTargetId = targetSocketId || actorSocketId;
    if (effectiveTargetId !== actorSocketId) {
        if (!actor.isModerator || isRaised) {
            return { ok: false, error: 'Only Admin or Auctioneer can lower another participant\'s hand.' };
        }
    }

    const target = getParticipant(tournamentId, effectiveTargetId);
    if (!target) return { ok: false, error: 'Target participant is not in the voice room.' };

    target.isHandRaised = Boolean(isRaised);
    target.handRaisedAt = target.isHandRaised ? Date.now() : null;

    return {
        ok: true,
        tournamentId,
        target
    };
}

/**
 * Validates that both sender and target socket belong to the same voice room.
 */
function validateSignalingPair(senderSocketId, targetSocketId) {
    const senderRoomId = socketToRoom.get(senderSocketId);
    const targetRoomId = socketToRoom.get(targetSocketId);
    if (!senderRoomId || !targetRoomId || senderRoomId !== targetRoomId) {
        return null;
    }
    return senderRoomId;
}

module.exports = {
    MAX_VOICE_PARTICIPANTS,
    getParticipantsList,
    getParticipant,
    getRoomIdBySocket,
    joinRoom,
    leaveRoom,
    setPersonalMicStatus,
    setSpeakingStatus,
    setAdminMuteParticipant,
    setAdminMuteAll,
    setHandState,
    validateSignalingPair
};
