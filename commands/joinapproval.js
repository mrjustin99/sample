const fs = require('fs');
const path = require('path');

const APPROVAL_FILE = path.join(__dirname, '../data/joinapproval.json');

const channelInfo = {
    contextInfo: {
        forwardingScore: 1, isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363417440480101@newsletter',
            newsletterName: 'KEITH TECH', serverMessageId: -1
        }
    }
};

function readState() {
    try {
        if (fs.existsSync(APPROVAL_FILE)) return JSON.parse(fs.readFileSync(APPROVAL_FILE, 'utf8'));
    } catch (_) {}
    return { enabled: false, groups: [] };
}

function writeState(state) {
    fs.writeFileSync(APPROVAL_FILE, JSON.stringify(state, null, 2));
}

async function joinapprovalCommand(sock, chatId, message, args, isOwner) {
    try {
        if (!isOwner) {
            await sock.sendMessage(chatId, { text: '❌ Only the owner can use this!', ...channelInfo }, { quoted: message });
            return;
        }
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, { text: '❌ This command is for groups only!', ...channelInfo }, { quoted: message });
            return;
        }

        const state = readState();
        const arg = (args || '').trim().toLowerCase();

        if (arg === 'on') {
            if (!state.groups.includes(chatId)) state.groups.push(chatId);
            state.enabled = true;
            writeState(state);
            await sock.sendMessage(chatId, {
                text: '✅ *Join approval enabled for this group!*\n\n_New join requests will be auto-approved._', ...channelInfo
            }, { quoted: message });
        } else if (arg === 'off') {
            state.groups = state.groups.filter(g => g !== chatId);
            if (state.groups.length === 0) state.enabled = false;
            writeState(state);
            await sock.sendMessage(chatId, {
                text: '❌ *Join approval disabled for this group.*', ...channelInfo
            }, { quoted: message });
        } else {
            const isOn = state.groups.includes(chatId);
            await sock.sendMessage(chatId, {
                text: `🔑 *Join Approval:* ${isOn ? '✅ ON' : '❌ OFF'}\n\n• \`joinapproval on\` — Enable auto-approve\n• \`joinapproval off\` — Disable`, ...channelInfo
            }, { quoted: message });
        }
    } catch (e) {
        await sock.sendMessage(chatId, { text: '❌ Error: ' + e.message, ...channelInfo }, { quoted: message });
    }
}

async function handleJoinApproval(sock, update) {
    try {
        const state = readState();
        if (!state.enabled) return;
        const { id, participants, action } = update;
        if (!state.groups.includes(id)) return;
        if (action === 'request') {
            // Auto-approve join requests
            for (const p of participants) {
                try {
                    await sock.groupRequestParticipantsUpdate(id, [p], 'approve');
                } catch (_) {}
            }
        }
    } catch (_) {}
}

module.exports = joinapprovalCommand;
module.exports.handleJoinApproval = handleJoinApproval;
module.exports.readState = readState;
