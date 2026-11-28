import React from 'react';
import { PhoneCall, PhoneOff, Hand, VolumeX, Volume2, ShieldAlert } from 'lucide-react';
import VoiceConnectionStatus from './VoiceConnectionStatus';
import MicrophoneButton from './MicrophoneButton';
import VoiceParticipantsList from './VoiceParticipantsList';

const VoiceChatPanel = ({
    voice,
    isModerator = false
}) => {
    const {
        voiceStatus,
        voiceError,
        participants,
        selfSocketId,
        isJoined,
        isConnecting,
        isMicOn,
        isAdminMuted,
        isHandRaised,
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
    } = voice;

    // Raised hand queue ordered by handRaisedAt
    const raisedHandsQueue = participants
        .filter((p) => p.isHandRaised)
        .sort((a, b) => (a.handRaisedAt || 0) - (b.handRaisedAt || 0));

    return (
        <div className="bg-slate-50 text-slate-900 rounded-2xl p-3.5 border border-slate-200 space-y-3.5">
            {/* Header & Join / Leave */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div>
                    <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                        🎙️ Live Auction Voice Room
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                        Real-time audio-only room for Admin &amp; Team Owners
                    </p>
                </div>

                {!isJoined ? (
                    <button
                        type="button"
                        onClick={joinVoiceRoom}
                        disabled={isConnecting}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black text-xs cursor-pointer shadow-sm shadow-emerald-600/20 transition-all"
                    >
                        <PhoneCall className="w-3.5 h-3.5" />
                        {isConnecting ? 'Connecting...' : 'Join Voice Room'}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={leaveVoiceRoom}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-sm shadow-rose-600/20 transition-all"
                    >
                        <PhoneOff className="w-3.5 h-3.5" />
                        Leave Voice
                    </button>
                )}
            </div>

            {/* Connection Status & Errors */}
            <VoiceConnectionStatus
                status={voiceStatus}
                participantCount={participants.length}
                error={voiceError}
            />

            {/* Admin-enforced mute banner for participant */}
            {isJoined && isAdminMuted && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                    <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{moderatorNotice || 'You have been muted by the Admin. Only the Admin can remove this mute.'}</span>
                </div>
            )}

            {/* Admin / Auctioneer Moderation Toolbar */}
            {isJoined && isModerator && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                        Moderator Controls
                    </span>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={muteAll}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-bold cursor-pointer transition-all"
                        >
                            <VolumeX className="w-3.5 h-3.5" />
                            Mute All
                        </button>
                        <button
                            type="button"
                            onClick={unmuteAll}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[11px] font-bold cursor-pointer transition-all"
                        >
                            <Volume2 className="w-3.5 h-3.5" />
                            Unmute All
                        </button>
                    </div>
                </div>
            )}

            {/* Raised Hands Queue */}
            {isJoined && raisedHandsQueue.length > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-black text-amber-800 flex items-center gap-1">
                        <Hand className="w-3.5 h-3.5 text-amber-600" />
                        Raised Hands ({raisedHandsQueue.length}):
                    </span>
                    {raisedHandsQueue.map((p) => (
                        <span
                            key={p.socketId}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white border border-amber-300 text-amber-900 text-[11px] font-bold shadow-2xs"
                        >
                            {p.name}
                            {isModerator && p.socketId !== selfSocketId && (
                                <button
                                    type="button"
                                    onClick={() => lowerParticipantHand(p.socketId)}
                                    className="text-amber-700 hover:text-amber-950 underline text-[10px] cursor-pointer"
                                >
                                    Lower
                                </button>
                            )}
                        </span>
                    ))}
                </div>
            )}

            {/* Participants Square Cards Grid */}
            <VoiceParticipantsList
                participants={participants}
                selfSocketId={selfSocketId}
                isModerator={isModerator}
                onToggleSelfMic={toggleMic}
                onToggleSelfHand={toggleHand}
                onMuteParticipant={muteParticipant}
                onUnmuteParticipant={unmuteParticipant}
                onLowerParticipantHand={lowerParticipantHand}
            />

            {/* Bottom Call Control Bar */}
            {isJoined && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2.5 border-t border-slate-200">
                    <MicrophoneButton
                        isMicOn={isMicOn}
                        isAdminMuted={isAdminMuted}
                        onClick={toggleMic}
                    />
                    <button
                        type="button"
                        onClick={toggleHand}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            isHandRaised
                                ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500 shadow-xs'
                                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                    >
                        <Hand className="w-4 h-4" />
                        <span>{isHandRaised ? 'Lower Hand' : 'Raise Hand'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={leaveVoiceRoom}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
                    >
                        <PhoneOff className="w-4 h-4" />
                        <span>Leave</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default VoiceChatPanel;
