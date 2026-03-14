const fs = require('fs');
const path = require('path');
const settings = require('../settings');

const channelInfo = {
    contextInfo: {
        forwardingScore: 1, isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363417440480101@newsletter',
            newsletterName: 'KEITH TECH', serverMessageId: -1
        }
    }
};

function patchSettings(key, value) {
    const settingsPath = path.join(__dirname, '../settings.js');
    let content = fs.readFileSync(settingsPath, 'utf8');
    const escaped = String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const envKeyMap = {
        botOwner: 'BOT_OWNER',
        ownerNumber: 'OWNER_NUMBER'
    };
    const envKey = envKeyMap[key];
    const regex = envKey
        ? new RegExp(`${key}:\\s*process\\.env\\.${envKey}\\s*\\|\\|\\s*['"\`].*?['"\`]`)
        : new RegExp(`(${key}:\\s*)['"\`].*?['"\`]`);

    if (envKey && regex.test(content)) {
        content = content.replace(regex, `${key}: process.env.${envKey} || "${escaped}"`);
    } else {
        content = content.replace(new RegExp(`(${key}:\\s*)['"\`].*?['"\`]`), `$1"${escaped}"`);
    }
    fs.writeFileSync(settingsPath, content);
    delete require.cache[require.resolve('../settings')];
}

async function setownerCommand(sock, chatId, message, args, isOwner) {
    try {
        if (!isOwner) {
            await sock.sendMessage(chatId, { text: '❌ Only the owner can use this command!', ...channelInfo }, { quoted: message });
            return;
        }
        if (!args || !args.trim()) {
            delete require.cache[require.resolve('../settings')];
            const s = require('../settings');
            await sock.sendMessage(chatId, {
                text: `*Owner Settings*\n\n• \`setowner <number>\` — Set owner number\n• \`setownername <name>\` — Set owner name\n\n*Current:*\n• Number: ${s.ownerNumber || 'Not set'}\n• Name: ${s.botOwner || 'Not set'}`,
                ...channelInfo
            }, { quoted: message });
            return;
        }
        // Check if it looks like a number
        const cleaned = args.trim().replace(/[^0-9]/g, '');
        if (cleaned.length >= 7) {
            patchSettings('ownerNumber', cleaned);
            await sock.sendMessage(chatId, {
                text: `✅ *Owner number updated to:* ${cleaned}\n\n_Takes effect immediately._`, ...channelInfo
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { text: '❌ Invalid number format!', ...channelInfo }, { quoted: message });
        }
    } catch (e) {
        await sock.sendMessage(chatId, { text: '❌ Error: ' + e.message, ...channelInfo }, { quoted: message });
    }
}

async function setownernameCommand(sock, chatId, message, args, isOwner) {
    try {
        if (!isOwner) {
            await sock.sendMessage(chatId, { text: '❌ Only the owner can use this command!', ...channelInfo }, { quoted: message });
            return;
        }
        if (!args || !args.trim()) {
            await sock.sendMessage(chatId, { text: '❌ Please provide a name.\nExample: `setownername Dave`', ...channelInfo }, { quoted: message });
            return;
        }
        patchSettings('botOwner', args.trim());
        await sock.sendMessage(chatId, {
            text: `✅ *Owner name updated to:* ${args.trim()}\n\n_Takes effect immediately._`, ...channelInfo
        }, { quoted: message });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '❌ Error: ' + e.message, ...channelInfo }, { quoted: message });
    }
}

async function setownernumberCommand(sock, chatId, message, args, isOwner) {
    return setownerCommand(sock, chatId, message, args, isOwner);
}

module.exports = setownerCommand;
module.exports.setownernameCommand = setownernameCommand;
module.exports.setownernumberCommand = setownernumberCommand;
