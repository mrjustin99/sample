const { readAntieditSettings, writeAntieditSettings } = require('../lib/antiedit');
const settings = require('../settings');

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

async function antieditCommand(sock, chatId, message, args) {
    try {
        // Check if user is owner or sudo
        const senderId = message.key.participant || message.key.remoteJid;
        const isOwner = message.key.fromMe;
        
        // You can add sudo check here if needed
        // const isSudo = await isSudo(senderId);
        
        if (!isOwner) {
            await sock.sendMessage(chatId, {
                text: '❌ *Only the bot owner can use this command!*',
                ...channelInfo
            }, { quoted: message });
            return;
        }

        const currentSettings = readAntieditSettings();

        // If no arguments, show current status
        if (!args || args.trim() === '') {
            const statusEmoji = currentSettings.enabled ? '✅' : '❌';
            const modeEmoji = currentSettings.mode === 'public' ? '👥' : '🔒';
            
            const statusText = `
╭────────────╮
│  *ANTIEDIT STATUS*  │
╰────────────╯

${statusEmoji} *Status:* ${currentSettings.enabled ? 'Enabled' : 'Disabled'}
${modeEmoji} *Mode:* ${currentSettings.mode.toUpperCase()}

*Available Commands:*
• \`${settings.Prefix[0]}antiedit on\` - Enable antiedit
• \`${settings.Prefix[0]}antiedit off\` - Disable antiedit
• \`${settings.Prefix[0]}antiedit public\` - Report in chat
• \`${settings.Prefix[0]}antiedit private\` - Send to owner DM

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍᴏᴏɴ xᴍᴅ`;

            await sock.sendMessage(chatId, {
                text: statusText,
                ...channelInfo
            }, { quoted: message });
            return;
        }

        const action = args.toLowerCase();

        switch (action) {
            case 'on':
            case 'enable':
                if (currentSettings.enabled) {
                    await sock.sendMessage(chatId, {
                        text: '⚠️ *Antiedit is already enabled!*',
                        ...channelInfo
                    }, { quoted: message });
                    return;
                }
                
                currentSettings.enabled = true;
                writeAntieditSettings(currentSettings);
                
                await sock.sendMessage(chatId, {
                    text: `✅ *Antiedit has been enabled!*\n\n📍 Current mode: *${currentSettings.mode.toUpperCase()}*\n\nEdited messages will be ${currentSettings.mode === 'public' ? 'reported in the chat' : 'sent to your DM'}.`,
                    ...channelInfo
                }, { quoted: message });
                break;

            case 'off':
            case 'disable':
                if (!currentSettings.enabled) {
                    await sock.sendMessage(chatId, {
                        text: '⚠️ *Antiedit is already disabled!*',
                        ...channelInfo
                    }, { quoted: message });
                    return;
                }
                
                currentSettings.enabled = false;
                writeAntieditSettings(currentSettings);
                
                await sock.sendMessage(chatId, {
                    text: '❌ *Antiedit has been disabled!*\n\nEdited messages will no longer be tracked.',
                    ...channelInfo
                }, { quoted: message });
                break;

            case 'public':
                if (currentSettings.mode === 'public') {
                    await sock.sendMessage(chatId, {
                        text: '⚠️ *Antiedit is already in public mode!*',
                        ...channelInfo
                    }, { quoted: message });
                    return;
                }
                
                currentSettings.mode = 'public';
                writeAntieditSettings(currentSettings);
                
                await sock.sendMessage(chatId, {
                    text: `👥 *Antiedit mode changed to PUBLIC!*\n\n${currentSettings.enabled ? '✅' : '❌'} Status: ${currentSettings.enabled ? 'Enabled' : 'Disabled'}\n\nEdited messages will be reported in the chat where they were edited.`,
                    ...channelInfo
                }, { quoted: message });
                break;

            case 'private':
                if (currentSettings.mode === 'private') {
                    await sock.sendMessage(chatId, {
                        text: '⚠️ *Antiedit is already in private mode!*',
                        ...channelInfo
                    }, { quoted: message });
                    return;
                }
                
                currentSettings.mode = 'private';
                writeAntieditSettings(currentSettings);
                
                await sock.sendMessage(chatId, {
                    text: `🔒 *Antiedit mode changed to PRIVATE!*\n\n${currentSettings.enabled ? '✅' : '❌'} Status: ${currentSettings.enabled ? 'Enabled' : 'Disabled'}\n\nEdited messages will be sent to your DM.`,
                    ...channelInfo
                }, { quoted: message });
                break;

            default:
                await sock.sendMessage(chatId, {
                    text: `❌ *Invalid option!*\n\n*Available Commands:*\n• \`${settings.Prefix[0]}antiedit on\` - Enable antiedit\n• \`${settings.Prefix[0]}antiedit off\` - Disable antiedit\n• \`${settings.Prefix[0]}antiedit public\` - Report in chat\n• \`${settings.Prefix[0]}antiedit private\` - Send to owner DM`,
                    ...channelInfo
                }, { quoted: message });
        }

    } catch (error) {
        console.error('Error in antiedit command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ *An error occurred while processing the antiedit command!*',
            ...channelInfo
        }, { quoted: message });
    }
}

module.exports = antieditCommand;