import 'dotenv/config';
import fs from 'fs';
import axios from 'axios';
import chalk from 'chalk';

class DiscordBot {
    constructor(token) {
        this.baseUrl = "https://discord.com/api/v9";
        this.headers = { 'Authorization': token };
        this.username = this.getUsername();
    }

    async getUsername() {
        const response = await axios.get(`${this.baseUrl}/users/@me`, { headers: this.headers });
        return `${response.data.username}#${response.data.discriminator || '0000'}`;
    }

    async sendMessage(channelId, message) {
        const payload = { content: message };
        const response = await axios.post(`${this.baseUrl}/channels/${channelId}/messages`, payload, { headers: this.headers });
        return response.data;
    }
}

function loadMessages(filePath = 'chat.txt') {
    const msgFile = fs.readFileSync(filePath, 'utf8');
    return msgFile.split('\n').map(line => line.trim()).filter(line => line.length > 0);
}

async function main() {
    const tokens = process.env.TOKENS ? process.env.TOKENS.split(',').map(t => t.trim()).filter(Boolean) : [];
    const channelIds = process.env.CHANNEL_IDS ? process.env.CHANNEL_IDS.split(',').map(c => c.trim()).filter(Boolean) : [];
    const messages = loadMessages();

    if (tokens.length === 0) {
        console.error(chalk.red("[ERROR] No tokens found in TOKENS variable in .env file!"));
        process.exit(1);
    }

    if (channelIds.length === 0) {
        console.error(chalk.red("[ERROR] No channel IDs found in CHANNEL_IDS variable in .env file!"));
        process.exit(1);
    }

    if (!messages.length) {
        console.error(chalk.red("[ERROR] No messages found in chat.txt!"));
        process.exit(1);
    }

    const tokenDelay = parseInt(process.env.TOKEN_DELAY, 10) || 5;
    const messageDelay = parseInt(process.env.MESSAGE_DELAY, 10) || 2;
    const restartDelay = parseInt(process.env.RESTART_DELAY, 10) || 10;

    console.log(chalk.green(`[INFO] Loaded ${tokens.length} tokens and ${channelIds.length} text channels from .env.`));

    while (true) {
        for (const token of tokens) {
            try {
                const bot = new DiscordBot(token);
                const username = await bot.username;

                for (const channel of channelIds) {
                    const customMessage = messages[Math.floor(Math.random() * messages.length)];
                    const response = await bot.sendMessage(channel, customMessage);

                    if (response.content) {
                        console.log(chalk.green(`[INFO] [${username}] => Sent to Channel ${channel}: ${customMessage}`));
                    }

                    await new Promise(resolve => setTimeout(resolve, messageDelay * 1000));
                }

                console.log(chalk.yellow(`[INFO] Waiting for ${tokenDelay} seconds before processing the next token...`));
                await new Promise(resolve => setTimeout(resolve, tokenDelay * 1000));

            } catch (error) {
                console.error(chalk.red(`[CRITICAL ERROR] Skipping token due to error: ${error.name}: ${error.message}`));
            }
        }

        console.log(chalk.yellow(`[INFO] Waiting for ${restartDelay} seconds before restarting...`));
        await new Promise(resolve => setTimeout(resolve, restartDelay * 1000));
    }
}

main().catch(error => {
    console.error(chalk.red(`[CRITICAL ERROR] ${error.name}: ${error.message}`));
});
