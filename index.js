import 'dotenv/config';
import axios from 'axios';
import chalk from 'chalk';
import WebSocket from 'ws';

class VoiceBot {
    constructor(token, channelId, selfMute = true, selfDeaf = true) {
        this.token = token;
        this.channelId = channelId;
        this.selfMute = selfMute;
        this.selfDeaf = selfDeaf;
        this.guildId = null;
        this.username = "Unknown";
        this.ws = null;
        this.heartbeatInterval = null;
        this.heartbeatTimer = null;
        this.seq = null;
        this.baseUrl = "https://discord.com/api/v9";
        this.isReconnecting = false;
    }

    async getChannelGuild() {
        try {
            const response = await axios.get(`${this.baseUrl}/channels/${this.channelId}`, {
                headers: { 
                    'Authorization': this.token,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'
                }
            });
            this.guildId = response.data.guild_id;
            return this.guildId;
        } catch (error) {
            throw new Error(`Failed to get guild ID for channel ${this.channelId}: ${error.response?.data?.message || error.message}`);
        }
    }

    async getUsername() {
        try {
            const response = await axios.get(`${this.baseUrl}/users/@me`, {
                headers: { 
                    'Authorization': this.token,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'
                }
            });
            this.username = `${response.data.username}#${response.data.discriminator || '0000'}`;
            return this.username;
        } catch (error) {
            this.username = `Token-${this.token.slice(-6)}`;
            return this.username;
        }
    }

    async start() {
        try {
            await this.getUsername();
            await this.getChannelGuild();
            console.log(chalk.cyan(`[START] Bot [${this.username}] connecting to Voice Channel ${this.channelId} in Guild ${this.guildId}...`));
            this.connect();
        } catch (error) {
            console.error(chalk.red(`[ERROR] Failed to start bot for token ending in ...${this.token.slice(-6)}: ${error.message}`));
        }
    }

    connect() {
        this.isReconnecting = false;
        this.ws = new WebSocket('wss://gateway.discord.gg/?v=9&encoding=json');

        this.ws.on('open', () => {
            console.log(chalk.blue(`[WS] [${this.username}] Connection opened`));
        });

        this.ws.on('message', (data) => {
            try {
                const payload = JSON.parse(data.toString());
                const { op, t, d, s } = payload;

                if (s !== undefined && s !== null) {
                    this.seq = s;
                }

                switch (op) {
                    case 10: // Hello
                        this.heartbeatInterval = d.heartbeat_interval;
                        // Start heartbeat with a small initial random jitter
                        const initialJitter = Math.floor(Math.random() * (this.heartbeatInterval * 0.5));
                        setTimeout(() => {
                            this.sendHeartbeat();
                            this.startHeartbeat();
                        }, initialJitter);
                        this.identify();
                        break;
                    case 11: // Heartbeat ACK
                        break;
                    case 0: // Event Dispatch
                        if (t === 'READY') {
                            console.log(chalk.green(`[SUCCESS] [${this.username}] Logged in successfully!`));
                            this.joinVoice();
                        }
                        break;
                    case 1: // Heartbeat request
                        this.sendHeartbeat();
                        break;
                    case 9: // Invalid Session
                        console.log(chalk.red(`[WARNING] [${this.username}] Invalid session. Attempting reconnect...`));
                        this.reconnect();
                        break;
                    case 7: // Reconnect request
                        console.log(chalk.yellow(`[INFO] [${this.username}] Gateway requested reconnect...`));
                        this.reconnect();
                        break;
                }
            } catch (err) {
                console.error(chalk.red(`[ERROR] [${this.username}] Message parsing error: ${err.message}`));
            }
        });

        this.ws.on('close', (code, reason) => {
            console.log(chalk.red(`[CLOSED] [${this.username}] Connection closed (Code: ${code}, Reason: ${reason || 'None'}). Reconnecting in 5s...`));
            this.cleanup();
            if (!this.isReconnecting) {
                this.isReconnecting = true;
                setTimeout(() => this.connect(), 5000);
            }
        });

        this.ws.on('error', (error) => {
            console.error(chalk.red(`[ERROR] [${this.username}] WebSocket error: ${error.message}`));
        });
    }

    startHeartbeat() {
        this.cleanupHeartbeat();
        this.heartbeatTimer = setInterval(() => {
            this.sendHeartbeat();
        }, this.heartbeatInterval);
    }

    sendHeartbeat() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                op: 1,
                d: this.seq
            }));
        }
    }

    identify() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            // Mimic a real desktop Chrome client on Windows 10 to bypass basic selfbot checks
            const payload = {
                op: 2,
                d: {
                    token: this.token,
                    capabilities: 16381,
                    properties: {
                        os: "Windows",
                        browser: "Chrome",
                        device: "",
                        system_locale: "en-US",
                        browser_user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
                        browser_version: "127.0.0.0",
                        os_version: "10",
                        referrer: "",
                        referring_domain: "",
                        referrer_current: "",
                        referring_domain_current: "",
                        release_channel: "stable",
                        client_build_number: 321157,
                        client_event_source: null
                    },
                    presence: {
                        status: "online",
                        since: 0,
                        activities: [],
                        afk: false
                    },
                    compress: false,
                    client_state: {
                        guild_versions: {},
                        highest_last_message_id: "0",
                        read_states_version: 0,
                        user_guild_settings_version: -1,
                        user_settings_version: -1,
                        private_channels_version: "0",
                        api_code_version: 0
                    }
                }
            };
            this.ws.send(JSON.stringify(payload));
        }
    }

    joinVoice() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log(chalk.magenta(`[VOICE] [${this.username}] Joining Voice Channel ${this.channelId} in Guild ${this.guildId} (Muted: ${this.selfMute}, Deafened: ${this.selfDeaf})...`));
            const payload = {
                op: 4,
                d: {
                    guild_id: this.guildId,
                    channel_id: this.channelId,
                    self_mute: this.selfMute,
                    self_deaf: this.selfDeaf
                }
            };
            this.ws.send(JSON.stringify(payload));
        }
    }

    cleanupHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    cleanup() {
        this.cleanupHeartbeat();
        if (this.ws) {
            this.ws.terminate();
            this.ws = null;
        }
    }

    reconnect() {
        if (!this.isReconnecting) {
            this.isReconnecting = true;
            this.cleanup();
            setTimeout(() => this.connect(), 1000);
        }
    }
}

async function main() {
    const tokens = process.env.TOKENS ? process.env.TOKENS.split(',').map(t => t.trim()).filter(Boolean) : [];
    const channelIds = process.env.CHANNEL_IDS ? process.env.CHANNEL_IDS.split(',').map(c => c.trim()).filter(Boolean) : [];
    const tokenDelaySetting = parseInt(process.env.TOKEN_DELAY, 10) || 5;

    if (tokens.length === 0) {
        console.error(chalk.red("[ERROR] No tokens found in TOKENS variable in .env file!"));
        process.exit(1);
    }

    if (channelIds.length === 0) {
        console.error(chalk.red("[ERROR] No channel IDs found in CHANNEL_IDS variable in .env file!"));
        process.exit(1);
    }

    console.log(chalk.green(`[INFO] Loaded ${tokens.length} tokens and ${channelIds.length} voice channels from .env.`));
    console.log(chalk.green(`[INFO] Connecting accounts sequentially with anti-detection delays...`));

    const selfMute = process.env.SELF_MUTE !== 'false';
    const selfDeaf = process.env.SELF_DEAF !== 'false';

    const bots = [];
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const channelId = channelIds[i % channelIds.length];
        
        const bot = new VoiceBot(token, channelId, selfMute, selfDeaf);
        bots.push(bot);
        bot.start();

        if (i < tokens.length - 1) {
            // Add random jitter to login delays (between -1.5s to +1.5s of the token delay setting, min 2s)
            const jitter = (Math.random() * 3000) - 1500;
            const delay = Math.max(2000, (tokenDelaySetting * 1000) + jitter);
            console.log(chalk.gray(`[DELAY] Waiting ${(delay / 1000).toFixed(2)} seconds before starting the next bot connection...`));
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    console.log(chalk.green(`[INFO] All bots initialization started. They will remain connected to the Voice Channels.`));
    
    process.on('SIGINT', () => {
        console.log(chalk.yellow('\n[SHUTDOWN] Terminating all bot connections...'));
        for (const bot of bots) {
            bot.cleanup();
        }
        process.exit(0);
    });
}

main().catch(error => {
    console.error(chalk.red(`[CRITICAL ERROR] ${error.name}: ${error.message}`));
});
