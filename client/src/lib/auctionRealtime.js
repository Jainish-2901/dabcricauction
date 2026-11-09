import socket from '../socket';
import { supabase } from './supabase';

const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE === 'true';

/**
 * Universal Realtime Room Client
 * Bridges Socket.io and Supabase Realtime Channels seamlessly.
 */
export const createAuctionRoom = (tournamentId, handlers = {}) => {
    if (USE_SUPABASE) {
        const channel = supabase.channel(`auction:${tournamentId}`, {
            config: { broadcast: { self: true } }
        });

        if (handlers.onNewPlayer) {
            channel.on('broadcast', { event: 'new_player' }, ({ payload }) => handlers.onNewPlayer(payload));
        }
        if (handlers.onBidUpdate) {
            channel.on('broadcast', { event: 'bid_update' }, ({ payload }) => handlers.onBidUpdate(payload));
        }
        if (handlers.onPlayerSold) {
            channel.on('broadcast', { event: 'player_sold' }, ({ payload }) => handlers.onPlayerSold(payload));
        }
        if (handlers.onPlayerUnsold) {
            channel.on('broadcast', { event: 'player_unsold' }, ({ payload }) => handlers.onPlayerUnsold(payload));
        }
        if (handlers.onBiddingStateChanged) {
            channel.on('broadcast', { event: 'bidding_state_changed' }, ({ payload }) => handlers.onBiddingStateChanged(payload));
        }
        if (handlers.onBidUndone) {
            channel.on('broadcast', { event: 'bid_undone' }, ({ payload }) => handlers.onBidUndone(payload));
        }
        if (handlers.onSaleRolledBack) {
            channel.on('broadcast', { event: 'sale_rolled_back' }, ({ payload }) => handlers.onSaleRolledBack(payload));
        }

        channel.subscribe();

        return {
            emit: (event, payload) => {
                channel.send({ type: 'broadcast', event, payload });
            },
            disconnect: () => {
                supabase.removeChannel(channel);
            }
        };
    } else {
        socket.connect();
        socket.emit('join_auction', tournamentId);

        if (handlers.onNewPlayer) socket.on('new_player', handlers.onNewPlayer);
        if (handlers.onBidUpdate) socket.on('bid_update', handlers.onBidUpdate);
        if (handlers.onPlayerSold) socket.on('player_sold', handlers.onPlayerSold);
        if (handlers.onPlayerUnsold) socket.on('player_unsold', handlers.onPlayerUnsold);
        if (handlers.onBiddingStateChanged) socket.on('bidding_state_changed', handlers.onBiddingStateChanged);
        if (handlers.onBidUndone) socket.on('bid_undone', handlers.onBidUndone);
        if (handlers.onSaleRolledBack) socket.on('sale_rolled_back', handlers.onSaleRolledBack);

        return {
            emit: (event, payload) => {
                socket.emit(event, payload);
            },
            disconnect: () => {
                if (handlers.onNewPlayer) socket.off('new_player', handlers.onNewPlayer);
                if (handlers.onBidUpdate) socket.off('bid_update', handlers.onBidUpdate);
                if (handlers.onPlayerSold) socket.off('player_sold', handlers.onPlayerSold);
                if (handlers.onPlayerUnsold) socket.off('player_unsold', handlers.onPlayerUnsold);
                if (handlers.onBiddingStateChanged) socket.off('bidding_state_changed', handlers.onBiddingStateChanged);
                if (handlers.onBidUndone) socket.off('bid_undone', handlers.onBidUndone);
                if (handlers.onSaleRolledBack) socket.off('sale_rolled_back', handlers.onSaleRolledBack);
            }
        };
    }
};

export default createAuctionRoom;

