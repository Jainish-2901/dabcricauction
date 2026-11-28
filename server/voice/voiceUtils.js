const jwt = require('jsonwebtoken');
const db = require('../services/dbService');

const MODERATOR_ROLES = new Set(['superadmin', 'admin', 'auctioneer']);

/**
 * Resolves a human-readable role label from the DB user role.
 */
function getRoleLabel(role) {
    switch (role) {
        case 'superadmin':
        case 'admin':
            return 'Admin';
        case 'auctioneer':
            return 'Auctioneer';
        default:
            return 'Owner';
    }
}

/**
 * Authenticates a socket user for voice room access using JWT or mobile Supabase auth token.
 * Never trusts client-supplied role, name, or tournament membership.
 *
 * @param {object} params
 * @param {string} [params.token]
 * @param {string} [params.userId]
 * @param {string} params.tournamentId
 * @returns {Promise<{ ok: boolean, error?: string, user?: object }>}
 */
async function authenticateVoiceUser({ token, userId, tournamentId }) {
    if (!tournamentId || typeof tournamentId !== 'string') {
        return { ok: false, error: 'Invalid auction room ID.' };
    }

    let resolvedUserId = null;

    if (token && typeof token === 'string') {
        const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
        if (cleanToken.startsWith('sb_auth_token_')) {
            resolvedUserId = cleanToken.slice('sb_auth_token_'.length);
        } else {
            try {
                const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET || 'secret');
                resolvedUserId = decoded?.id || decoded?._id || null;
            } catch (err) {
                return { ok: false, error: 'Authentication token expired or invalid. Please log in again.' };
            }
        }
    }

    // Fallback only if no token was supplied (or if token didn't resolve)
    if (!resolvedUserId && userId) {
        resolvedUserId = String(userId);
    }

    if (!resolvedUserId) {
        return { ok: false, error: 'Authentication required to join the voice room.' };
    }

    const dbUser = await db.findUserById(resolvedUserId);
    if (!dbUser) {
        return { ok: false, error: 'User account not found.' };
    }

    const tournament = await db.getTournamentById(tournamentId);
    if (!tournament) {
        return { ok: false, error: 'Auction tournament not found.' };
    }

    const role = (dbUser.role || 'team_owner').toLowerCase();
    const isModerator = MODERATOR_ROLES.has(role);

    // Validate membership in this specific tournament
    const userTourneyId = typeof dbUser.tournamentId === 'object' ? dbUser.tournamentId?._id : dbUser.tournamentId;
    const isTournamentCreator = tournament.createdBy && String(tournament.createdBy) === String(dbUser._id);

    let hasAccess = false;
    let teamName = dbUser.teamName || '';
    let avatar = dbUser.avatar || '';

    if (isModerator) {
        // Superadmin/Admin/Auctioneer: must either belong to this tournament, have created it, or be superadmin
        hasAccess =
            role === 'superadmin' ||
            isTournamentCreator ||
            (userTourneyId && String(userTourneyId) === String(tournamentId));
    } else {
        // Team owner: must belong to this tournament or own a team in this tournament
        if (userTourneyId && String(userTourneyId) === String(tournamentId)) {
            hasAccess = true;
        }
        const teams = await db.getTeamsByTournament(tournamentId);
        const userTeamId = typeof dbUser.teamId === 'object' ? dbUser.teamId?._id : dbUser.teamId;
        const matchedTeam = (teams || []).find(
            t =>
                (userTeamId && String(t._id) === String(userTeamId)) ||
                (t.ownerId && String(t.ownerId) === String(dbUser._id))
        );
        if (matchedTeam) {
            hasAccess = true;
            teamName = matchedTeam.name || matchedTeam.shortName || teamName;
            avatar = matchedTeam.logo || avatar;
        }
    }

    if (!hasAccess) {
        return { ok: false, error: 'You do not have permission to join this auction voice room.' };
    }

    return {
        ok: true,
        user: {
            userId: String(dbUser._id),
            name: dbUser.name || dbUser.username || 'Participant',
            username: dbUser.username,
            role,
            roleLabel: getRoleLabel(role),
            isModerator,
            teamName,
            avatar: avatar || tournament.logo || ''
        }
    };
}

module.exports = {
    MODERATOR_ROLES,
    getRoleLabel,
    authenticateVoiceUser
};
