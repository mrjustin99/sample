// Codes By Keith Tech, give credit!
const settings = require('../settings');
const fs = require('fs');
const { Vcard } = require('../lib/Keith');
const { getUptime } = require('../lib/runtime');
const path = require('path');
const readMore = String.fromCharCode(8206).repeat(4001);

function getMenuStyle() {
    try {
        const dataPath = path.join(__dirname, '../data/menutype.json');
        if (fs.existsSync(dataPath)) {
            const d = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            return (d.type || settings.MenuType || 'v1').toLowerCase();
        }
    } catch (_) {}
    return (settings.MenuType || 'v1').toLowerCase();
}

async function menuCommand(sock, chatId, message) {
    try {
        const {
            COMMAND_CATEGORIES,
            getPrefixes,
            getRAMUsage,
            getPlatform,
            getTotalCommands,
            getPushname,
        } = global.menuHelpers;

        const pushname = getPushname(message);
        const uptime = getUptime();
        const ramUsage = getRAMUsage();
        const platform = getPlatform();
        const totalCommands = getTotalCommands();
        const prefixes = getPrefixes ? getPrefixes() : (Array.isArray(settings.Prefix) ? settings.Prefix : [settings.Prefix]);
        const primaryPrefix = prefixes[0];
        const menuStyle = getMenuStyle();

        // Reload settings to get latest botName/owner
        delete require.cache[require.resolve('../settings')];
        const s = require('../settings');

        // Check ownerNumber
        const ownerDisplay = s.ownerName ? s.ownerName : 'Not Set!';
        
        

        // Send loading indicator
        await sock.sendMessage(chatId, { text: '_⚡ loading menu..._' }, { quoted: Vcard });

        // ── V2 TEXT STYLE (like screenshot: gray box style) ─────────────────
        // We use Unicode gray-ish box drawing chars similar to image
        const fmt = (cmds) => cmds.map(c => `┃ › ${primaryPrefix}${c}`).join('\n');

        const header =
`┎▣ ◈ *${s.botName}* ◈
┃ *User:* ${pushname}
┃ *Owner:* ${s.botOwner || ownerDisplay}
┃ *Prefix:* [ ${primaryPrefix} ]
┃ *Host:* ${platform}
┃ *Mode:* ${s.commandMode}
┃ *Version:* ${s.version}
┃ *Uptime:* ${uptime}
┃ *Ram:* ${ramUsage.bar} ${ramUsage.percentage}%
┃ *Total Cmds:* ${totalCommands}
┖▣`;

        const body =
`${readMore}
┎▣ ◈ *OWNER MENU* ◈
${fmt(COMMAND_CATEGORIES.OWNER)}
┖▣

┎▣ ◈ *MAIN MENU* ◈
${fmt(COMMAND_CATEGORIES.GENERAL)}
┖▣

┎▣ ◈ *ANIME MENU* ◈
${fmt(COMMAND_CATEGORIES.ANIME)}
┖▣

┎▣ ◈ *GROUP MENU* ◈
${fmt(COMMAND_CATEGORIES.ADMIN)}
┖▣

┎▣ ◈ *IMAGE MENU* ◈
${fmt(COMMAND_CATEGORIES.IMAGE_STICKER)}
┖▣

┎▣ ◈ *PIES MENU* ◈
${fmt(COMMAND_CATEGORIES.PIES)}
┖▣

┎▣ ◈ *GAME MENU* ◈
${fmt(COMMAND_CATEGORIES.GAME)}
┖▣

┎▣ ◈ *AI MENU* ◈
${fmt(COMMAND_CATEGORIES.AI)}
┖▣

┎▣ ◈ *FUN MENU* ◈
${fmt(COMMAND_CATEGORIES.FUN)}
┖▣

┎▣ ◈ *TEXTMAKER MENU* ◈
${fmt(COMMAND_CATEGORIES.TEXTMAKER)}
┖▣

┎▣ ◈ *DOWNLOAD MENU* ◈
${fmt(COMMAND_CATEGORIES.DOWNLOADER)}
┖▣

┎▣ ◈ *MISC MENH* ◈
${fmt(COMMAND_CATEGORIES.MISC)}
┖▣

┎▣ ◈ *OTHER MENU* ◈
${fmt(COMMAND_CATEGORIES.GITHUB)}
┖▣

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴋᴇɪᴛʜ ᴛᴇᴄʜ`;

        const fullText = header + '\n' + body;

        if (menuStyle === 'v1') {
            const imagePath = path.join(__dirname, '../assets/Menu.jpg');
            if (fs.existsSync(imagePath)) {
                await sock.sendMessage(chatId, {
                    image: fs.readFileSync(imagePath),
                    caption: fullText
                }, { quoted: Vcard });
            } else {
                await sock.sendMessage(chatId, { text: fullText }, { quoted: Vcard });
            }
        } else {
            // V2 — text only, styled like screenshot
            await sock.sendMessage(chatId, { text: fullText }, { quoted: Vcard });
        }

    } catch (error) {
        console.error('Error in menu command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ An error occurred while displaying the menu. Please try again.'
        });
    }
}

module.exports = menuCommand;
