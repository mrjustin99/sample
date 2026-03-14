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

function readJsonSafe(filePath, fallback) {
    try {
        const txt = fs.readFileSync(filePath, 'utf8').trim();
        return txt ? JSON.parse(txt) : fallback;
    } catch (_) {
        return fallback;
    }
}

function getMenuType() {
    const dataPath = path.join(__dirname, '../data/menutype.json');
    try {
        if (fs.existsSync(dataPath)) {
            const _raw = fs.readFileSync(dataPath, 'utf8').trim();
            return (_raw ? JSON.parse(_raw) : {}).type || 'v1';
        }
    } catch (_) {}
    const s = require('../settings');
    return s.MenuType || 'v1';
}

async function settingsCommand(sock, chatId, message) {
    try {
        if (!message.key.fromMe) {
            await sock.sendMessage(chatId, {
                text: '❌ *Only bot owner can use this command!*',
                ...channelInfo
            }, { quoted: message });
            return;
        }

        // Reload settings fresh
        delete require.cache[require.resolve('../settings')];
        const settings = require('../settings');

        const isGroup = chatId.endsWith('@g.us');
        const dataDir = path.join(__dirname, '../data');

        const modeData = readJsonSafe(`${dataDir}/messageCount.json`, { isPublic: true });
        const autoStatus = readJsonSafe(`${dataDir}/autoStatus.json`, { enabled: false });
        const autoread = readJsonSafe(`${dataDir}/autoread.json`, { enabled: false });
        const autotyping = readJsonSafe(`${dataDir}/autotyping.json`, { enabled: false });
        const pmblocker = readJsonSafe(`${dataDir}/pmblocker.json`, { enabled: false });
        const anticall = readJsonSafe(`${dataDir}/anticall.json`, { enabled: false });
        const antiedit = readJsonSafe(`${dataDir}/antiedit.json`, { enabled: true, mode: 'public' });
        const userGroupData = readJsonSafe(`${dataDir}/userGroupData.json`, {
            antilink: {}, antibadword: {}, welcome: {}, goodbye: {}, chatbot: {}, antitag: {}
        });

        const menuType = getMenuType();

        const on = '✅';
        const off = '❌';
        const s = (v) => v ? on : off;

        let text = `╭━━━━━━━━━━━━━━━━━╮
┃  ⚙️  *BOT SETTINGS*  ⚙️
╰━━━━━━━━━━━━━━━━━╯

🤖 *Bot Name:* ${settings.botName}
👑 *Owner:* ${settings.botOwner} (${settings.ownerNumber})
🔧 *Mode:* ${modeData.isPublic ? '🌍 Public' : '🔒 Private'}
🎨 *Menu Type:* ${menuType.toUpperCase()} ${menuType === 'v1' ? '(with image)' : '(text only)'}
🌐 *Prefix:* [${Array.isArray(settings.Prefix) ? settings.Prefix.join(', ') : settings.Prefix}]
📦 *Version:* ${settings.version}

━━━━━━━━ *FEATURES* ━━━━━━━━
${s(autoStatus.enabled)} *Auto Status*
${s(autoread.enabled)} *Auto Read*
${s(autotyping.enabled)} *Auto Typing*
${s(pmblocker.enabled)} *PM Blocker*
${s(anticall.enabled)} *Anti Call*
${s(antiedit.enabled)} *Anti Edit* (${antiedit.mode || 'public'})
${s((settings.autoBio || 'off') === 'on')} *Auto Bio*
${s((settings.alwaysOnline || 'off') === 'on')} *Always Online*
${s((settings.alwaysOffline || 'off') === 'on')} *Always Offline*`;

        if (isGroup) {
            const groupId = chatId;
            const antilinkOn = Boolean(userGroupData.antilink?.[groupId]);
            const antibadwordOn = Boolean(userGroupData.antibadword?.[groupId]);
            const welcomeOn = Boolean(userGroupData.welcome?.[groupId]);
            const goodbyeOn = Boolean(userGroupData.goodbye?.[groupId]);
            const chatbotOn = Boolean(userGroupData.chatbot?.[groupId]);
            const antitagCfg = userGroupData.antitag?.[groupId];

            text += `\n\n━━━━━ *GROUP SETTINGS* ━━━━━
${s(antilinkOn)} *Antilink* ${antilinkOn ? `(${userGroupData.antilink[groupId].action || 'delete'})` : ''}
${s(antibadwordOn)} *Antibadword* ${antibadwordOn ? `(${userGroupData.antibadword[groupId].action || 'delete'})` : ''}
${s(welcomeOn)} *Welcome*
${s(goodbyeOn)} *Goodbye*
${s(chatbotOn)} *Chatbot*
${s(antitagCfg?.enabled)} *Antitag* ${antitagCfg?.enabled ? `(${antitagCfg.action || 'delete'})` : ''}`;
        } else {
            text += `\n\n_💡 Use inside a group to see group settings._`;
        }

        text += `\n\n━━━━━━ *HOW TO CHANGE* ━━━━━━
• \`.mode public/private\` — Bot access mode
• \`.setmenutype v1/v2\` — Menu with/without image
• \`.autobio on/off\` — Auto bio update
• \`.alwaysonline on/off\` — Always online
• \`.alwaysoffline on/off\` — Always offline
• \`.setbotname <name>\` — Change bot name
• \`.setbotimg\` — Change menu image
• \`.setowner <number>\` — Change owner number

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴋᴇɪᴛʜ ᴛᴇᴄʜ`;

        await sock.sendMessage(chatId, {
            text,
            ...channelInfo
        }, { quoted: message });

    } catch (error) {
        console.error('Error in settings command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ *Failed to read settings.*',
            ...channelInfo
        }, { quoted: message });
    }
}

module.exports = settingsCommand;
