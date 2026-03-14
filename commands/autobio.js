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

// Runtime state (survive without restarting)
let _autoBioInterval = null;
let _sock = null;

function updateBioNow() {
    if (!_sock) return;
    try {
        delete require.cache[require.resolve('../settings')];
        const s = require('../settings');
        if ((s.autoBio || 'off').toLowerCase() !== 'on') return;
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        const bioText = (s.autoBioText || `🤖 {botName} | ⏰ {time} | 📅 {date}`)
            .replace(/\{botName\}/g, s.botName || 'MOON-X')
            .replace(/\{time\}/g, timeStr)
            .replace(/\{date\}/g, dateStr);
        _sock.updateProfileStatus(bioText).catch(() => {});
    } catch (e) { console.error('AutoBio error:', e.message); }
}

function startAutoBio(sock) {
    _sock = sock;
    if (_autoBioInterval) clearInterval(_autoBioInterval);
    updateBioNow();
    _autoBioInterval = setInterval(updateBioNow, 5 * 60 * 1000);
}

function stopAutoBio() {
    if (_autoBioInterval) { clearInterval(_autoBioInterval); _autoBioInterval = null; }
}

// Patch settings.js file value (autoBio or autoBioText)
function patchSettings(key, value) {
    const settingsPath = path.join(__dirname, '../settings.js');
    let content = fs.readFileSync(settingsPath, 'utf8');
    const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const envKeyMap = { autoBio: 'AUTO_BIO', autoBioText: 'AUTO_BIO_TEXT' };
    const envKey = envKeyMap[key] || key.toUpperCase();
    // Match: key: process.env.ENV_KEY || "..."  (any quote type)
    const regex = new RegExp(key + ':\\s*process\\.env\\.' + envKey + '\\s*\\|\\|\\s*["\'].*?["\']');
    if (regex.test(content)) {
        content = content.replace(regex, key + ': process.env.' + envKey + ' || "' + escaped + '"');
    } else {
        const fallback = new RegExp('(' + key + ':\\s*)["\'].*?["\']');
        content = content.replace(fallback, '$1"' + escaped + '"');
    }
    fs.writeFileSync(settingsPath, content);
    delete require.cache[require.resolve('../settings')];
}

async function autobioCommand(sock, chatId, message, args, isOwner) {
    try {
        if (!isOwner) {
            await sock.sendMessage(chatId, { text: '❌ Only the bot owner can use this command!', ...channelInfo }, { quoted: message });
            return;
        }

        delete require.cache[require.resolve('../settings')];
        const settings = require('../settings');
        const arg = (args || '').trim().toLowerCase();

        if (!arg) {
            const status = (settings.autoBio || 'off').toLowerCase() === 'on' ? '✅ ON' : '❌ OFF';
            const bioText = settings.autoBioText || '🤖 {botName} | ⏰ {time} | 📅 {date}';
            await sock.sendMessage(chatId, {
                text: `🤖 *Auto Bio*\n\n*Status:* ${status}\n*Bio Text:* ${bioText}\n\n*Usage:*\n• \`autobio on\` — Enable\n• \`autobio off\` — Disable\n• \`autobio set <text>\` — Set custom bio text\n• \`autobio setbio <text>\` — same as set\n\n*Variables:* \`{botName}\` \`{time}\` \`{date}\`\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍᴏᴏɴ xᴍᴅ`,
                ...channelInfo
            }, { quoted: message });
            return;
        }

        if (arg === 'on') {
            patchSettings('autoBio', 'on');
            startAutoBio(sock);
            global.startAutoBio && global.startAutoBio(sock);
            await sock.sendMessage(chatId, {
                text: '✅ *Auto Bio Enabled!*\n\n_Bio will update every 5 minutes._', ...channelInfo
            }, { quoted: message });
            return;
        }

        if (arg === 'off') {
            patchSettings('autoBio', 'off');
            stopAutoBio();
            await sock.sendMessage(chatId, {
                text: '❌ *Auto Bio Disabled!*', ...channelInfo
            }, { quoted: message });
            return;
        }

        if (arg.startsWith('set ') || arg.startsWith('setbio ')) {
            const newText = args.trim().replace(/^(setbio|set)\s+/i, '').trim();
            if (!newText) {
                await sock.sendMessage(chatId, { text: '❌ Please provide bio text.\nExample: `autobio set 🤖 {botName} | {time}`', ...channelInfo }, { quoted: message });
                return;
            }
            patchSettings('autoBioText', newText);
            updateBioNow();
            await sock.sendMessage(chatId, {
                text: `✅ *Auto Bio Text Updated!*\n\n*New:* ${newText}`, ...channelInfo
            }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, {
            text: `❌ Invalid option. Use \`on\`, \`off\`, or \`set <text>\``, ...channelInfo
        }, { quoted: message });
    } catch (error) {
        console.error('Error in autobio command:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to update autobio settings!', ...channelInfo }, { quoted: message });
    }
}

module.exports = autobioCommand;
module.exports.startAutoBio = startAutoBio;
