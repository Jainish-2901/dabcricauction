import React from 'react';
import { Mic, MicOff, Hand, ShieldAlert, Crown } from 'lucide-react';
import SafeImage from '../SafeImage';

const VoiceParticipantsList = ({
    participants = [],
    selfSocketId,
    isModerator = false,
    onToggleSelfMic,
    onToggleSelfHand,
    onMuteParticipant,
    onUnmuteParticipant,
    onLowerParticipantHand
}) => {
    if (participants.length === 0) {
        return (
            <div className="text-center py-8 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                <p className="text-sm font-bold text-slate-700">No one is in the voice room yet</p>
                <p className="text-xs text-slate-500 mt-1">Click &quot;Join Voice Room&quot; to start talking live with teams and admins.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-2.5">
            {participants.map((p) => {
                const isSelf = p.socketId === selfSocketId;
                const isEffectiveOn = Boolean(p.isEffectiveMicOn);
                const isSpeaking = Boolean(p.isSpeaking) && isEffectiveOn;

                return (
                    <div
                        key={p.socketId}
                        className={`relative rounded-2xl p-3 flex flex-col justify-between min-h-[148px] min-w-0 transition-all border shadow-2xs ${
                            isSpeaking
                                ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-400/30 shadow-sm'
                                : isSelf
                                    ? 'bg-amber-50/40 border-amber-300'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                    >
                        {/* Top row: Name + Role + You / Hand Badges */}
                        <div className="flex items-start justify-between gap-1.5 min-w-0">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1 flex-wrap">
                                    <p className={`text-xs font-extrabold truncate ${
                                        p.isModerator ? 'text-amber-700' : isSelf ? 'text-emerald-700' : 'text-blue-700'
                                    }`}>
                                        {p.name}
                                    </p>
                                    {isSelf && (
                                        <span className="px-1.5 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-amber-800 text-[9px] font-black uppercase tracking-wider shrink-0">
                                            You
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 mt-0.5 min-w-0">
                                    {p.isModerator && <Crown className="w-2.5 h-2.5 text-amber-500 shrink-0" />}
                                    <span className="text-[10px] font-bold text-slate-500 truncate">
                                        {p.roleLabel}{p.teamName ? ` • ${p.teamName}` : ''}
                                    </span>
                                </div>
                            </div>

                            {p.isHandRaised && (
                                <span
                                    title="Hand Raised"
                                    className="px-1.5 py-1 rounded-lg bg-amber-100 border border-amber-300 text-amber-700 text-[10px] font-black flex items-center shrink-0 animate-bounce"
                                >
                                    <Hand className="w-3 h-3" />
                                </span>
                            )}
                        </div>

                        {/* Middle row: Avatar + Live Waveform / Mic status */}
                        <div className="flex items-center justify-between gap-2 my-2.5">
                            <div className="relative shrink-0">
                                {p.avatar ? (
                                    <SafeImage
                                        src={p.avatar}
                                        alt={p.name}
                                        className={`w-10 h-10 rounded-full object-cover border-2 ${
                                            isSpeaking ? 'border-emerald-500' : 'border-slate-200'
                                        }`}
                                    />
                                ) : (
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black border-2 ${
                                            isSpeaking
                                                ? 'bg-emerald-100 text-emerald-700 border-emerald-500'
                                                : 'bg-slate-100 text-slate-700 border-slate-200'
                                        }`}
                                    >
                                        {(p.name || 'P').charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>

                            {/* Waveform / Status Pill */}
                            <div className="flex-1 flex flex-col items-end justify-center min-w-0">
                                {isSpeaking ? (
                                    <div className="flex items-center gap-0.5 h-5" title="Speaking">
                                        <span className="w-1 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                        <span className="w-1 h-4 bg-emerald-500 rounded-full animate-bounce" />
                                        <span className="w-1 h-5 bg-emerald-600 rounded-full animate-pulse" />
                                        <span className="w-1 h-3 bg-emerald-500 rounded-full animate-bounce" />
                                        <span className="w-1 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                    </div>
                                ) : p.isAdminMuted ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[9px] font-bold">
                                        <ShieldAlert className="w-2.5 h-2.5 shrink-0" />
                                        Admin Muted
                                    </span>
                                ) : !isEffectiveOn ? (
                                    <span className="inline-flex items-center gap-1 text-rose-600 text-[10px] font-bold">
                                        <MicOff className="w-3.5 h-3.5 shrink-0" />
                                        Muted
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-emerald-600 text-[10px] font-bold">
                                        <Mic className="w-3.5 h-3.5 shrink-0" />
                                        Mic Live
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Bottom row: Self Controls OR Admin Moderation Controls */}
                        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                            {isSelf ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={onToggleSelfMic}
                                        disabled={p.isAdminMuted}
                                        className={`flex-1 min-w-0 py-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                                            p.isAdminMuted
                                                ? 'bg-rose-50 text-rose-600 border border-rose-200 cursor-not-allowed'
                                                : isEffectiveOn
                                                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer'
                                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer'
                                        }`}
                                    >
                                        {isEffectiveOn ? <Mic className="w-3 h-3 shrink-0" /> : <MicOff className="w-3 h-3 shrink-0" />}
                                        <span className="truncate">{p.isAdminMuted ? 'Locked' : isEffectiveOn ? 'Mute' : 'Unmute'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onToggleSelfHand}
                                        className={`py-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer border shrink-0 ${
                                            p.isHandRaised
                                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                                        }`}
                                        title={p.isHandRaised ? 'Lower Hand' : 'Raise Hand'}
                                    >
                                        <Hand className="w-3 h-3 shrink-0" />
                                    </button>
                                </>
                            ) : isModerator ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            p.isAdminMuted
                                                ? onUnmuteParticipant(p.socketId)
                                                : onMuteParticipant(p.socketId)
                                        }
                                        className={`flex-1 min-w-0 py-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer border ${
                                            p.isAdminMuted
                                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                        }`}
                                    >
                                        {p.isAdminMuted ? (
                                            <>
                                                <Mic className="w-3 h-3 shrink-0" />
                                                <span className="truncate">Unmute</span>
                                            </>
                                        ) : (
                                            <>
                                                <MicOff className="w-3 h-3 shrink-0" />
                                                <span className="truncate">Mute</span>
                                            </>
                                        )}
                                    </button>
                                    {p.isHandRaised && (
                                        <button
                                            type="button"
                                            onClick={() => onLowerParticipantHand(p.socketId)}
                                            className="py-1.5 px-2 rounded-lg text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 cursor-pointer shrink-0 flex items-center gap-0.5"
                                            title="Lower participant's hand"
                                        >
                                            <Hand className="w-3 h-3" />
                                            <span>↓</span>
                                        </button>
                                    )}
                                </>
                            ) : (
                                <span className="text-[10px] font-semibold text-slate-500 w-full text-center truncate">
                                    {p.isAdminMuted
                                        ? 'Muted by Admin'
                                        : isEffectiveOn
                                            ? isSpeaking
                                                ? 'Speaking...'
                                                : 'Listening / Live'
                                            : 'Mic Muted'}
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default VoiceParticipantsList;
