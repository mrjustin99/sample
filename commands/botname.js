const fs = require('fs');
const path = require('path');

const channelInfo = {
    contextInfo: {
        forwardingScore: 1, isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363417440480101@newsletter',
            newsletterName: 'KEITH TECH', serverMessageId: -1
        }
    }
};

async function botnameCommand(sock, chatId, message, args, isOwner) {
    try {
        if (!isOwner) {
            await sock.sendMessage(chatId, { text: '❌ Only the bot owner can use this command!', ...channelInfo }, { quoted: message });
            return;
        }

        const settingsPath = path.join(__dirname, '../settings.js');
        delete require.cache[require.resolve('../settings')];
        const currentSettings = require('../settings');

        if (!args || args.trim() === '') {
            await sock.sendMessage(chatId, {
                text: `📝 *Current Bot Name:* ${currentSettings.botName}\n\n*Usage:* \`setbotname <new name>\`\n*Example:* \`${Array.isArray(currentSettings.Prefix) ? currentSettings.Prefix[0] : currentSettings.Prefix}setbotname Moon-X Pro\``,
                ...channelInfo
            }, { quoted: message });
            return;
        }

        const newBotName = args.trim();
        let settingsContent = fs.readFileSync(settingsPath, 'utf8');
        const escaped = newBotName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

        // Try env-based pattern first
        if (/botName:\s*process\.env\.BOT_NAME\s*\|\|\s*["'`].*?["'`]/.test(settingsContent)) {
            settingsContent = settingsContent.replace(
                /botName:\s*process\.env\.BOT_NAME\s*\|\|\s*["'`].*?["'`]/,
                `botName: process.env.BOT_NAME || "${escaped}"`
            );
        } else {
            settingsContent = settingsContent.replace(
                /(botName:\s*)["'`].*?["'`]/,
                `$1"${escaped}"`
            );
        }
        fs.writeFileSync(settingsPath, settingsContent);

        // Update all in-memory references immediately — no restart needed
        delete require.cache[require.resolve('../settings')];
        const updatedSettings = require('../settings');
        updatedSettings.botName = newBotName;
        global.botname = newBotName;

        // Patch the require cache to propagate everywhere
        Object.keys(require.cache).forEach(key => {
            if (require.cache[key] && require.cache[key].exports && require.cache[key].exports.botName !== undefined) {
                require.cache[key].exports.botName = newBotName;
            }
        });

        await sock.sendMessage(chatId, {
            text: `✅ *Bot name updated to:* ${newBotName}\n\n_All responses will now use this name immediately._`,
            ...channelInfo
        }, { quoted: message });

    } catch (error) {
        console.error('Error in botname command:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to update bot name!', ...channelInfo }, { quoted: message });
    }
}

module.exports = botnameCommand;
