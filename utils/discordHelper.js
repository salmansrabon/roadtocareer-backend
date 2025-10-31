const axios = require('axios');

/**
 * Create a Discord invite link dynamically
 * @param {string} channelId - Discord channel ID to create invite for
 * @param {number} maxAge - How long the invite is valid (in seconds, 0 = never expires)
 * @param {number} maxUses - Maximum number of uses (0 = unlimited)
 * @returns {Promise<{success: boolean, inviteUrl?: string, error?: string}>}
 */
async function createDiscordInvite(channelId = null, maxAge = 3600, maxUses = 10) {
    try {
        const botToken = process.env.DISCORD_BOT_TOKEN;
        const defaultChannelId = process.env.DISCORD_CHANNEL_ID;
        
        if (!botToken) {
            console.warn('⚠️ Discord bot token not configured');
            return {
                success: false,
                error: 'Discord bot token not configured'
            };
        }

        const targetChannelId = channelId || defaultChannelId;
        if (!targetChannelId) {
            console.warn('⚠️ Discord channel ID not configured');
            return {
                success: false,
                error: 'Discord channel ID not configured'
            };
        }

        const response = await axios.post(
            `https://discord.com/api/v10/channels/${targetChannelId}/invites`,
            {
                max_age: maxAge, // Default: 3600 seconds (1 hour)
                max_uses: maxUses, // Default: 10 uses
                temporary: false, // Don't kick user when they go offline
                unique: true // Create a new invite instead of returning existing one
            },
            {
                headers: {
                    'Authorization': `Bot ${botToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const inviteCode = response.data.code;
        const inviteUrl = `https://discord.gg/${inviteCode}`;

        console.log(`✅ Discord invite created successfully: ${inviteUrl}`);
        
        return {
            success: true,
            inviteUrl,
            inviteCode,
            expiresAt: maxAge > 0 ? new Date(Date.now() + maxAge * 1000) : null
        };

    } catch (error) {
        console.error('❌ Error creating Discord invite:', error.response?.data || error.message);
        
        // Return a fallback invite if available
        const fallbackInvite = process.env.DISCORD_FALLBACK_INVITE || "https://discord.gg/bBr9GJQF";
        
        return {
            success: false,
            error: error.response?.data?.message || error.message,
            fallbackUrl: fallbackInvite
        };
    }
}

/**
 * Get Discord server information
 * @returns {Promise<{success: boolean, serverInfo?: object, error?: string}>}
 */
async function getDiscordServerInfo() {
    try {
        const botToken = process.env.DISCORD_BOT_TOKEN;
        const serverId = process.env.DISCORD_SERVER_ID;
        
        if (!botToken || !serverId) {
            return {
                success: false,
                error: 'Discord bot token or server ID not configured'
            };
        }

        const response = await axios.get(
            `https://discord.com/api/v10/guilds/${serverId}`,
            {
                headers: {
                    'Authorization': `Bot ${botToken}`
                }
            }
        );

        return {
            success: true,
            serverInfo: {
                name: response.data.name,
                memberCount: response.data.approximate_member_count,
                onlineCount: response.data.approximate_presence_count,
                icon: response.data.icon
            }
        };

    } catch (error) {
        console.error('❌ Error fetching Discord server info:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.message || error.message
        };
    }
}

/**
 * Get or create a Discord invite for email
 * This function tries to create a fresh invite, but falls back to a configured fallback URL
 * @returns {Promise<{inviteUrl: string, isGenerated: boolean}>}
 */
async function getDiscordInviteForEmail() {
    // Try to create a fresh invite
    const inviteResult = await createDiscordInvite();
    
    if (inviteResult.success) {
        return {
            inviteUrl: inviteResult.inviteUrl,
            isGenerated: true
        };
    }

    // Fall back to configured fallback invite or hardcoded one
    const fallbackUrl = inviteResult.fallbackUrl || process.env.DISCORD_FALLBACK_INVITE || "https://discord.gg/bBr9GJQF";
    
    console.log(`⚠️ Using fallback Discord invite: ${fallbackUrl}`);
    
    return {
        inviteUrl: fallbackUrl,
        isGenerated: false
    };
}

module.exports = {
    createDiscordInvite,
    getDiscordServerInfo,
    getDiscordInviteForEmail
};
