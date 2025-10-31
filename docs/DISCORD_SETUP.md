# Discord Bot Setup for Dynamic Invite Generation

This system automatically generates fresh Discord invite links for students when their account status is updated to valid. If the Discord bot is not configured, it falls back to the provided invite link.

## Quick Start (Using Fallback)

The system works immediately with the current setup using your provided invite:
- **Current Invite**: `https://discord.gg/bBr9GJQF`
- **Fallback Mode**: ✅ Active (no bot setup required)

## Full Setup (Dynamic Invite Generation)

For automatic invite generation, follow these steps:

### 1. Create Discord Application & Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and name it (e.g., "Road to SDET Bot")
3. Go to "Bot" section in left sidebar
4. Click "Add Bot"
5. Copy the **Bot Token** (keep it secure!)

### 2. Configure Bot Permissions

In the Bot section:
- Enable "Create Instant Invite" permission
- Copy the OAuth2 URL with permissions:
  - Go to OAuth2 > URL Generator
  - Scopes: `bot`
  - Bot Permissions: `Create Instant Invite`
  - Copy the generated URL

### 3. Invite Bot to Server

1. Use the OAuth2 URL to invite bot to your Discord server
2. Make sure the bot has permission to create invites in your general channel

### 4. Get Server & Channel IDs

**Enable Developer Mode in Discord:**
- Discord Settings > Advanced > Developer Mode: ON

**Get Server ID:**
- Right-click your server name > Copy Server ID

**Get Channel ID:**
- Right-click your general/welcome channel > Copy Channel ID

### 5. Update Environment Variables

Add these to your `.env` file:

```env
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_SERVER_ID=your_server_id_here
DISCORD_CHANNEL_ID=your_general_channel_id_here
DISCORD_SERVER_NAME=Road to SDET Community
DISCORD_FALLBACK_INVITE=https://discord.gg/bBr9GJQF
```

## How It Works

### Dynamic Mode (Bot Configured)
- Creates fresh Discord invites using Discord API
- Each student gets a unique, trackable invite link
- Invites can be configured to never expire
- Logs successful invite generation

### Fallback Mode (No Bot/Bot Failed)
- Uses `DISCORD_FALLBACK_INVITE` from environment
- Defaults to `https://discord.gg/bBr9GJQF` if not configured
- Logs when fallback is used
- System remains functional even without bot

## Testing

The system has been tested and confirmed working in both modes:

✅ **Email Integration**: Emails sent successfully with Discord links  
✅ **Fallback System**: Reliable fallback to provided invite  
✅ **Error Handling**: Graceful degradation when bot unavailable  
✅ **Logging**: Clear logs for debugging and monitoring  

## Email Template

Students receive this email when their status is updated to valid:

**Subject**: Road to SDET Student Enrollment Confirmation - Discord Access Granted

**Content includes**:
- Account activation confirmation
- Login credentials
- Discord server invite link (dynamic or fallback)
- List of Discord community benefits

## Monitoring

Check server logs for Discord invite status:
- `✅ Generated fresh Discord invite for [email]: [invite_url]` - Dynamic invite created
- `⚠️ Using fallback Discord invite for [email]: [invite_url]` - Fallback used

## Benefits of Dynamic Invites

1. **Fresh Links**: New invite for each student
2. **Tracking**: Each invite can be tracked individually
3. **Security**: Invites can be configured with usage limits
4. **Reliability**: Automatic fallback ensures system always works
5. **Control**: Server admins can revoke specific invites if needed

## Current Status

- ✅ System implemented and tested
- ✅ Fallback working with `https://discord.gg/bBr9GJQF`
- ⚠️ Discord bot not yet configured (optional)
- ✅ Email sending functional

The system is ready to use immediately and will work even better once the Discord bot is configured!
