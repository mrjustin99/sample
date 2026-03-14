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

const MENUTYPE_FILE = path.join(__dirname, '../data/menutype.json');

function getMenuStyle() {
    try {
        if (fs.existsSync(MENUTYPE_FILE)) {
            const _raw = fs.readFileSync(MENUTYPE_FILE, 'utf8').trim();
            return (_raw ? JSON.parse(_raw) : {}).type || 'v1';
        }
    } catch (_) {}
    const s = require('../settings');
    return s.MenuStyle || 'v1';
}

function setMenuStyle(type) {
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(MENUTYPE_FILE, JSON.stringify({ type }, null, 2));
}

async function setmenutypeCommand(sock, chatId, message, args, isOwner) {
    try {
        if (!isOwner) {
            await sock.sendMessage(chatId, { text: '❌ Only the bot owner can use this command!', ...channelInfo }, { quoted: message });
            return;
        }

        const current = getMenuStyle();
        const arg = (args || '').trim().toLowerCase();

        if (!arg) {
            await sock.sendMessage(chatId, {
                text: `🎨 *Menu Style:* ${current.toUpperCase()}\n\n*Styles:*\n• *V1* — With image\n• *V2* — Text only\n\n*Usage:* \`menustyle v1\` or \`menustyle v2\`\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ Mᴏᴏɴ X`,
                ...channelInfo
            }, { quoted: message });
            return;
        }

        if (arg !== 'v1' && arg !== 'v2') {
            await sock.sendMessage(chatId, {
                text: '❌ Invalid! Use `menustyle v1` or `menustyle v2`', ...channelInfo
            }, { quoted: message });
            return;
        }

        setMenuStyle(arg);
        const desc = arg === 'v1'
            ? ''
            : '';

        await sock.sendMessage(chatId, {
            text: `✅ *Successfully updated menu style to v2!* ${arg.toUpperCase()}!*\n\n${desc}`, ...channelInfo
        }, { quoted: message });

    } catch (error) {
        console.error('Error in menustyle command:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to update menu style!', ...channelInfo }, { quoted: message });
    }
}

module.exports = setmenutypeCommand;
