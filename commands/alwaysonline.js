// Moon X Codes!
const fs = require('fs');
const path = require('path');

const channelInfo = {
    contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363417440480101@newsletter',
            newsletterName: 'KEITH TECH',
            serverMessageId: -1
        }
    }
};

function updateSettingValue(key, value) {
    const settingsPath = path.join(__dirname, '../settings.js');
    let content = fs.readFileSync(settingsPath, 'utf8');
    const envMap = { alwaysOnline: 'ALWAYS_ONLINE', alwaysOffline: 'ALWAYS_OFFLINE' };
    const envKey = envMap[key] || key.toUpperCase();
    const regex = new RegExp(`${key}:\\s*process\\.env\\.${envKey}\\s*\\|\\|\\s*["'\`]\\w*["'\`]`);
    content = content.replace(regex, `${key}: process.env.${envKey} || "${value}"`);
    fs.writeFileSync(settingsPath, content);
    delete require.cache[require.resolve('../settings')];
}

async function alwaysonlineCommand(sock, chatId, message, args, isOwner) {
    try {
        if (!isOwner) {
            await sock.sendMessage(chatId, { text: '❌ *Only the bot owner can use this command!*', ...channelInfo }, { quoted: message });
            return;
        }

        delete require.cache[require.resolve('../settings')];
        const settings = require('../settings');
        const arg = (args || '').trim().toLowerCase();

        if (!arg) {
            const onStatus = (settings.alwaysOnline || 'off').toLowerCase() === 'on' ? '✅ ON' : '❌ OFF';
            await sock.sendMessage(chatId, {
                text: `🟢 *Always Online Status:* ${onStatus}\n\n*Usage:*\n• \`.alwaysonline on\` - Always appear online\n• \`.alwaysonline off\` - Disable\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍᴏᴏɴ x`
            }, { quoted: message });
            return;
        }

        if (arg !== 'on' && arg !== 'off') {
            await sock.sendMessage(chatId, { text: '❌ Use `.alwaysonline on` or `.alwaysonline off`', ...channelInfo }, { quoted: message });
            return;
        }

        // If turning on, turn off alwaysoffline
        if (arg === 'on') {
            updateSettingValue('alwaysOffline', 'off');
        }
        updateSettingValue('alwaysOnline', arg);

        if (arg === 'on') {
            await sock.sendPresenceUpdate('available').catch(() => {});
        } else {
            await sock.sendPresenceUpdate('unavailable').catch(() => {});
        }

        if (global.startPresenceManager) global.startPresenceManager(sock);

        await sock.sendMessage(chatId, {
            text: `${arg === 'on' ? '🟢 ✅' : '⚫ ❌'} *Always Online ${arg === 'on' ? 'Enabled' : 'Disabled'}!*\n\n_Bot will ${arg === 'on' ? 'always appear online.' : 'appear with normal presence.'}_`,
            ...channelInfo
        }, { quoted: message });

    } catch (error) {
        console.error('Error in alwaysonline command:', error);
        await sock.sendMessage(chatId, { text: '❌ *Failed to update always online setting!*', ...channelInfo }, { quoted: message });
    }
}

async function alwaysofflineCommand(sock, chatId, message, args, isOwner) {
    try {
        if (!isOwner) {
            await sock.sendMessage(chatId, { text: '❌ *Only the bot owner can use this command!*', ...channelInfo }, { quoted: message });
            return;
        }

        delete require.cache[require.resolve('../settings')];
        const settings = require('../settings');
        const arg = (args || '').trim().toLowerCase();

        if (!arg) {
            const offStatus = (settings.alwaysOffline || 'off').toLowerCase() === 'on' ? '✅ ON' : '❌ OFF';
            await sock.sendMessage(chatId, {
                text: `⚫ *Always Offline Status:* ${offStatus}\n\n*Usage:*\n• \`.alwaysoffline on\` - Always appear offline\n• \`.alwaysoffline off\` - Disable\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍᴏᴏɴ x`
            }, { quoted: message });
            return;
        }

        if (arg !== 'on' && arg !== 'off') {
            await sock.sendMessage(chatId, { text: '❌ Use `.alwaysoffline on` or `.alwaysoffline off`', ...channelInfo }, { quoted: message });
            return;
        }

        // If turning on, turn off alwaysonline
        if (arg === 'on') {
            updateSettingValue('alwaysOnline', 'off');
        }
        updateSettingValue('alwaysOffline', arg);

        if (arg === 'on') {
            await sock.sendPresenceUpdate('unavailable').catch(() => {});
        }

        if (global.startPresenceManager) global.startPresenceManager(sock);

        await sock.sendMessage(chatId, {
            text: `${arg === 'on' ? '⚫ ✅' : '🟢 ❌'} *Always Offline ${arg === 'on' ? 'Enabled' : 'Disabled'}!*\n\n_Bot will ${arg === 'on' ? 'always appear offline.' : 'appear with normal presence.'}_`
        }, { quoted: message });

    } catch (error) {
        console.error('Error in alwaysoffline command:', error);
        await sock.sendMessage(chatId, { text: '❌ *Failed to update always offline setting!*', ...channelInfo }, { quoted: message });
    }
}

module.exports = { alwaysonlineCommand, alwaysofflineCommand };
