/*
CODES BY KEITH TECH
*/
const { handleWelcome } = require('../lib/welcome');
const { isWelcomeOn, getWelcome } = require('../lib/index');
const { channelInfo } = require('../lib/messageConfig');
const fetch = require('node-fetch');

async function welcomeCommand(sock, chatId, message, match) {
    if (!chatId.endsWith('@g.us')) {
        await sock.sendMessage(chatId, { text: 'This command can only be used in groups.' });
        return;
    }
    const text = message.message?.conversation || 
                message.message?.extendedTextMessage?.text || '';
    const matchText = text.split(' ').slice(1).join(' ');
    await handleWelcome(sock, chatId, message, matchText);
}

async function handleJoinEvent(sock, id, participants) {
    try {
        const isWelcomeEnabled = await isWelcomeOn(id);
        if (!isWelcomeEnabled) return;

        const customMessage = await getWelcome(id);

        let groupMetadata;
        try {
            groupMetadata = await sock.groupMetadata(id);
        } catch (_) {
            return;
        }
        const groupName = groupMetadata.subject || 'This Group';
        const groupDesc = groupMetadata.desc || 'No description available';

        for (const participant of participants) {
            try {
                const participantJid = typeof participant === 'string'
                    ? participant
                    : (participant.id || String(participant));

                const user = participantJid.split('@')[0];

                // Try to get profile picture
                let profilePicUrl = null;
                try {
                    profilePicUrl = await sock.profilePictureUrl(participantJid, 'image');
                } catch (_) {}

                // Build final message
                const now = new Date();
                const timeString = now.toLocaleString('en-US', {
                    month: '2-digit',
                    day: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                });

                let finalMessage;
                if (customMessage) {
                    finalMessage = customMessage
                        .replace(/{user}/g, `@${user}`)
                        .replace(/{group}/g, groupName)
                        .replace(/{description}/g, groupDesc)
                        .replace(/{time}/g, timeString)
                        .replace(/{count}/g, groupMetadata.participants.length);
                } else {
                    finalMessage = `╭━━━ *Welcome New Member* ━━━╮
┃ 👤 @${user}
┃ 👥 Group: *${groupName}*
┃ 🔢 Member #${groupMetadata.participants.length}
┃ ⏰ ${timeString}
╰━━━━━━━━━━━━━━━━━━━━━╯

🎉 Welcome to *${groupName}*!

📝 *Group Rules:*
${groupDesc}

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍᴏᴏɴ xᴍᴅ`;
                }

                // Try sending with profile picture
                if (profilePicUrl) {
                    try {
                        const res = await fetch(profilePicUrl);
                        if (res.ok) {
                            const imgBuf = await res.buffer();
                            await sock.sendMessage(id, {
                                image: imgBuf,
                                caption: finalMessage,
                                mentions: [participantJid],
                                ...channelInfo
                            });
                            continue;
                        }
                    } catch (_) {}
                }

                // Fallback: text only
                await sock.sendMessage(id, {
                    text: finalMessage,
                    mentions: [participantJid],
                    ...channelInfo
                });

            } catch (err) {
                console.error('Error sending welcome for participant:', err);
                const pJid = typeof participant === 'string' ? participant : (participant.id || String(participant));
                await sock.sendMessage(id, {
                    text: `🎉 Welcome @${pJid.split('@')[0]} to *${groupName}*!`,
                    mentions: [pJid]
                }).catch(() => {});
            }
        }
    } catch (error) {
        console.error('Error in handleJoinEvent:', error);
    }
}

module.exports = { welcomeCommand, handleJoinEvent };
