/**
 * Centralized Socket.IO event constants for Dab Cric Auction Voice Room.
 * Uses the `voice:*` namespace to stay completely isolated from bidding events.
 */
module.exports = {
    // Room lifecycle
    JOIN: 'voice:join',
    LEAVE: 'voice:leave',
    PARTICIPANTS: 'voice:participants',
    PARTICIPANT_JOINED: 'voice:participant-joined',
    PARTICIPANT_LEFT: 'voice:participant-left',

    // WebRTC P2P Mesh Signaling (audio-only)
    OFFER: 'voice:offer',
    ANSWER: 'voice:answer',
    ICE_CANDIDATE: 'voice:ice-candidate',

    // Mic & Speaking state
    MIC_STATUS: 'voice:mic-status',
    SPEAKING: 'voice:speaking',

    // Admin/Auctioneer Moderation
    MUTE_PARTICIPANT: 'voice:mute-participant',
    UNMUTE_PARTICIPANT: 'voice:unmute-participant',
    MUTE_ALL: 'voice:mute-all',
    UNMUTE_ALL: 'voice:unmute-all',
    MODERATION_STATE: 'voice:moderation-state',

    // Raise Hand / Lower Hand
    RAISE_HAND: 'voice:raise-hand',
    LOWER_HAND: 'voice:lower-hand',
    HAND_STATE: 'voice:hand-state',

    // Errors
    ERROR: 'voice:error'
};
