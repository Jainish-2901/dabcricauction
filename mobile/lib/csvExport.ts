import { Alert, Linking, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { getApiUrl } from './api';
import { toast } from './toast';

const csvCell = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

export const buildPlayersCSV = (teams: any[], players: any[]): string => {
    const headers = [
        'Name',
        'Category',
        'BattingStyle',
        'BowlingStyle',
        'BasePrice',
        'SoldToTeam',
        'SoldPrice',
        'Status',
        'IsCaptain',
        'Age',
        'CricHeroesURL',
        'Matches',
        'Runs',
        'HighestScore',
        'Wickets',
        'BestBowling'
    ];

    const rows = (players || []).map(p => {
        const team = (teams || []).find(t => t._id === p.soldToTeamId || t.id === p.soldToTeamId);
        return [
            csvCell(p.name),
            csvCell(p.category),
            csvCell(p.battingStyle),
            csvCell(p.bowlingStyle),
            p.basePrice || 0,
            csvCell(team ? team.name : (p.soldToTeamName || '')),
            p.soldPrice || (p.status === 'sold' ? p.currentBid : 0) || 0,
            p.status || 'pending',
            p.isCaptain ? 'Yes' : 'No',
            p.age || '',
            csvCell(p.cricHeroesProfileUrl || ''),
            p.stats?.matches || 0,
            p.stats?.runs || 0,
            csvCell(p.stats?.highestScore || ''),
            p.stats?.wickets || 0,
            csvCell(p.stats?.bestBowling || '')
        ];
    });

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
};

export const buildSummaryCSV = (tournament: any, teams: any[], players: any[]): string => {
    const isKtoL = tournament?.budgetScale === 'K_TO_L';
    const largeUnit = isKtoL ? 'L' : 'Cr';
    const smallUnit = isKtoL ? 'K' : 'L';

    let csv = `Tournament Auction Summary - ${tournament?.name || 'Tournament'} [Scale: ${isKtoL ? 'K to L (Club)' : 'L to Cr (Standard)'}]\n`;
    csv += `Export Date: ${new Date().toLocaleDateString()}\n\n`;

    csv += `TEAM ROSTER & PURSE OVERVIEW\n`;
    csv += `Team Name,Short Code,Captain Name,Budget (${largeUnit}),Spent (${largeUnit}),Remaining Purse (${largeUnit}),Owner Captain Status,Squad Size\n`;
    (teams || []).forEach(t => {
        const remaining = Math.max(0, (Number(t.budget) || 0) - (Number(t.spent) || 0)).toFixed(2);
        const capName = t.captainName || (t.isOwnerCaptain ? 'Captain' : '-');
        const tPlayers = (players || []).filter(
            p => (p.soldToTeamId === t._id || p.soldToTeamId === t.id) && !p.isCaptain && !String(p._id || '').startsWith('pl_cap_')
        );
        const totalSquad = tPlayers.length + (t.isOwnerCaptain ? 1 : 0);
        csv += `${csvCell(t.name)},${csvCell(t.shortName)},${csvCell(capName)},${t.budget || 100},${t.spent || 0},${remaining},${csvCell(t.isOwnerCaptain ? `Yes - Retained (Rs.${t.captainPrice || 0}${smallUnit})` : 'No')},${totalSquad}\n`;
    });
    csv += `\n`;

    csv += `SOLD PLAYERS BREAKDOWN\n`;
    csv += `Player Name,Role,Team Purchased By,Sold Price (${smallUnit}),Base Price (${smallUnit})\n`;
    (players || []).filter(p => p.status === 'sold').forEach(p => {
        const team = (teams || []).find(t => t._id === p.soldToTeamId || t.id === p.soldToTeamId);
        csv += `${csvCell(p.name)},${csvCell(p.category)},${csvCell(team?.name || p.soldToTeamName || 'Sold')},${p.soldPrice || p.currentBid || 0},${p.basePrice || 0}\n`;
    });
    csv += `\n`;

    csv += `UNSOLD PLAYERS POOL\n`;
    csv += `Player Name,Role,Base Price (${smallUnit})\n`;
    (players || []).filter(p => p.status === 'unsold').forEach(p => {
        csv += `${csvCell(p.name)},${csvCell(p.category)},${p.basePrice || 0}\n`;
    });

    return csv;
};

export const handleExportCSVAction = async ({
    type,
    tournament,
    teams,
    players
}: {
    type: 'players' | 'summary';
    tournament: any;
    teams: any[];
    players: any[];
}) => {
    if (!tournament?._id) {
        toast.warning('Select Tournament', 'Please select a tournament first.');
        return;
    }

    const endpoint = type === 'players'
        ? `/api/tournaments/${tournament._id}/export-players-csv`
        : `/api/tournaments/${tournament._id}/export-teams-summary-csv`;

    const apiBase = getApiUrl();
    const downloadUrl = apiBase ? `${apiBase}${endpoint}` : '';
    const title = type === 'players'
        ? `${tournament.name || 'Tournament'} - Players Feed CSV`
        : `${tournament.name || 'Tournament'} - Auction Summary CSV`;

    const csvText = type === 'players'
        ? buildPlayersCSV(teams, players)
        : buildSummaryCSV(tournament, teams, players);

    const actions: any[] = [];

    if (downloadUrl) {
        actions.push({
            text: 'Download (.csv)',
            onPress: async () => {
                try {
                    await Linking.openURL(downloadUrl);
                    toast.success('CSV Download Started', 'Check your browser downloads for the .csv file.');
                } catch {
                    Share.share({ title, message: csvText }).catch(() => {});
                }
            }
        });
    }

    actions.push({
        text: 'Share CSV',
        onPress: () => {
            Share.share({ title, message: csvText }).catch(() => {
                toast.error('Share Error', 'Could not open share dialog.');
            });
        }
    });

    actions.push({
        text: 'Copy CSV',
        onPress: async () => {
            try {
                await Clipboard.setStringAsync(csvText);
                toast.success('CSV Copied', `${title} copied to clipboard!`);
            } catch {
                toast.error('Copy Failed', 'Could not copy CSV to clipboard.');
            }
        }
    });

    actions.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert(
        title,
        'Choose how you want to export this CSV report:',
        actions
    );
};

