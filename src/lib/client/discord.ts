const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID || '1071500325338488843';
const API_URL = (import.meta.env.VITE_API_URL || 'https://api.gdvn.net').replace(/\/+$/, '');

export const DISCORD_SERVER_INVITE_URL = 'https://discord.gg/fybxJ9Y344';

export const DISCORD_BOT_INVITE_URL = `https://discord.com/oauth2/authorize?${
    new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        permissions: '85056',
        integration_type: '0',
        scope: 'bot applications.commands'
    })
        .toString()
}`;

export const DISCORD_OAUTH_URL = `https://discord.com/oauth2/authorize?${
    new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        response_type: 'code',
        redirect_uri: `${API_URL}/auth/callback/discord`,
        scope: 'identify'
    })
        .toString()
}`;

export type DiscordCommandGroup = 'players' | 'records' | 'lists' | 'utility';

export type DiscordCommand = {
    name: string;
    group: DiscordCommandGroup;
    descriptionKey: string;
    params: Array<{
        name: string;
        descriptionKey: string;
        required: boolean;
    }>;
};

export const DISCORD_COMMANDS: DiscordCommand[] = [
    {
        name: '/profile',
        group: 'players',
        descriptionKey: 'discord_bot.commands.profile.description',
        params: [
            { name: 'user', descriptionKey: 'discord_bot.params.discord_user', required: false },
            { name: 'query', descriptionKey: 'discord_bot.params.player_query', required: false }
        ]
    },
    {
        name: '/level',
        group: 'players',
        descriptionKey: 'discord_bot.commands.level.description',
        params: [{
            name: 'query',
            descriptionKey: 'discord_bot.params.level_query',
            required: true
        }]
    },
    {
        name: '/record',
        group: 'records',
        descriptionKey: 'discord_bot.commands.record.description',
        params: [
            { name: 'level', descriptionKey: 'discord_bot.params.level_query', required: true },
            { name: 'user', descriptionKey: 'discord_bot.params.discord_user', required: false },
            { name: 'query', descriptionKey: 'discord_bot.params.player_query', required: false },
            {
                name: 'variant',
                descriptionKey: 'discord_bot.params.record_variant',
                required: false
            }
        ]
    },
    {
        name: '/recent',
        group: 'records',
        descriptionKey: 'discord_bot.commands.recent.description',
        params: [
            { name: 'user', descriptionKey: 'discord_bot.params.discord_user', required: false },
            { name: 'query', descriptionKey: 'discord_bot.params.player_query', required: false },
            { name: 'list', descriptionKey: 'discord_bot.params.list', required: false }
        ]
    },
    {
        name: '/best',
        group: 'records',
        descriptionKey: 'discord_bot.commands.best.description',
        params: [
            { name: 'list', descriptionKey: 'discord_bot.params.list', required: true },
            { name: 'user', descriptionKey: 'discord_bot.params.discord_user', required: false },
            { name: 'query', descriptionKey: 'discord_bot.params.player_query', required: false }
        ]
    },
    {
        name: '/submission',
        group: 'records',
        descriptionKey: 'discord_bot.commands.submission.description',
        params: [
            { name: 'user', descriptionKey: 'discord_bot.params.discord_user', required: false },
            { name: 'query', descriptionKey: 'discord_bot.params.player_query', required: false }
        ]
    },
    {
        name: '/list',
        group: 'lists',
        descriptionKey: 'discord_bot.commands.list.description',
        params: [
            { name: 'list', descriptionKey: 'discord_bot.params.list', required: true },
            { name: 'page', descriptionKey: 'discord_bot.params.page', required: false }
        ]
    },
    {
        name: '/leaderboard',
        group: 'lists',
        descriptionKey: 'discord_bot.commands.leaderboard.description',
        params: [
            { name: 'list', descriptionKey: 'discord_bot.params.list', required: true },
            { name: 'page', descriptionKey: 'discord_bot.params.page', required: false }
        ]
    },
    {
        name: '/random',
        group: 'lists',
        descriptionKey: 'discord_bot.commands.random.description',
        params: [{ name: 'list', descriptionKey: 'discord_bot.params.list', required: false }]
    },
    {
        name: '/stats',
        group: 'utility',
        descriptionKey: 'discord_bot.commands.stats.description',
        params: [{ name: 'list', descriptionKey: 'discord_bot.params.list', required: false }]
    },
    {
        name: '/links',
        group: 'utility',
        descriptionKey: 'discord_bot.commands.links.description',
        params: []
    },
    {
        name: '/supporter',
        group: 'utility',
        descriptionKey: 'discord_bot.commands.supporter.description',
        params: [
            { name: 'user', descriptionKey: 'discord_bot.params.discord_user', required: false },
            { name: 'query', descriptionKey: 'discord_bot.params.player_query', required: false }
        ]
    },
    {
        name: '/help',
        group: 'utility',
        descriptionKey: 'discord_bot.commands.help.description',
        params: []
    }
];
