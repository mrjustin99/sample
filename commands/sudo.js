const settings = require('../settings');
const { addSudo, removeSudo, getSudoList } = require('../lib/index');

const channelInfo = {
    contextInfo: {
        forwardingScore: 1, isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363417440480101@newsletter',
            newsletterName: 'KEITH TECH', serverMessageId: -1
        }
    }
};

function extractTarget(message) {
    const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mentioned.length > 0) return mentioned[0];
    const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const parts = text.trim().split(/\s+/);
    // Try parts[2] (e.g. .addsudo 2637xxxxxxx)
    const numArg = parts[2] || parts[1];
    if (numArg) {
        const cleaned = numArg.replace(/[^0-9]/g, '');
        if (cleaned.length >= 7) return cleaned + '@s.whatsapp.net';
    }
    return null;
}

async function sudoCommand(sock, chatId, message) {
    const senderJid = message.key.participant || message.key.remoteJid;
    const ownerJid = (settings.ownerNumber || '').toString().replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    const isOwner = message.key.fromMe || senderJid === ownerJid;

    const rawText = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const parts = rawText.trim().split(/\s+/);
    const cmd = parts[0].replace(/[^a-z]/gi, '').toLowerCase(); // "addsudo", "delsudo", "listsudo", "sudo"
    const sub = cmd === 'sudo' ? (parts[1] || '').toLowerCase() : (
        cmd === 'addsudo' ? 'add' :
        cmd === 'delsudo' ? 'del' :
        cmd === 'listsudo' ? 'list' : (parts[1] || '').toLowerCase()
    );

    if (!sub || !['add', 'del', 'remove', 'list'].includes(sub)) {
        await sock.sendMessage(chatId, {
            text: `*Sudo Management*\n\n• \`addsudo @user\` — Add sudo\n• \`delsudo @user\` — Remove sudo\n• \`listsudo\` — List all sudos\n\n_Only owner can add/remove sudos_`,
            ...channelInfo
        }, { quoted: message });
        return;
    }

    if (sub === 'list') {
        const list = await getSudoList();
        if (list.length === 0) {
            await sock.sendMessage(chatId, { text: '📋 *No sudo users set.*', ...channelInfo }, { quoted: message });
            return;
        }
        const text = list.map((j, i) => `${i + 1}. @${j.split('@')[0]}`).join('\n');
        const mentions = list.filter(j => j.includes('@'));
        await sock.sendMessage(chatId, {
            text: `📋 *Sudo Users (${list.length}):*\n\n${text}`,
            mentions, ...channelInfo
        }, { quoted: message });
        return;
    }

    if (!isOwner) {
        await sock.sendMessage(chatId, {
            text: '❌ Only the owner can add/remove sudo users.',
            ...channelInfo
        }, { quoted: message });
        return;
    }

    const targetJid = extractTarget(message);
    if (!targetJid) {
        await sock.sendMessage(chatId, {
            text: '❌ Please mention a user or provide their number.\n\nExample: `addsudo @user` or `addsudo 2637xxxxxxx`',
            ...channelInfo
        }, { quoted: message });
        return;
    }

    if (sub === 'add') {
        if (targetJid === ownerJid) {
            await sock.sendMessage(chatId, { text: '⚠️ Owner is already the highest authority!', ...channelInfo }, { quoted: message });
            return;
        }
        const ok = await addSudo(targetJid);
        await sock.sendMessage(chatId, {
            text: ok
                ? `✅ *Sudo added!*\n\n@${targetJid.split('@')[0]} can now use owner commands.\n_No restart needed._`
                : `⚠️ @${targetJid.split('@')[0]} is already a sudo user.`,
            mentions: [targetJid], ...channelInfo
        }, { quoted: message });
        return;
    }

    if (sub === 'del' || sub === 'remove') {
        if (targetJid === ownerJid) {
            await sock.sendMessage(chatId, { text: '❌ Cannot remove the owner!', ...channelInfo }, { quoted: message });
            return;
        }
        const ok = await removeSudo(targetJid);
        await sock.sendMessage(chatId, {
            text: ok
                ? `✅ *Sudo removed!*\n\n@${targetJid.split('@')[0]} no longer has sudo privileges.`
                : `❌ @${targetJid.split('@')[0]} is not a sudo user.`,
            mentions: [targetJid], ...channelInfo
        }, { quoted: message });
        return;
    }
}

module.exports = sudoCommand;
