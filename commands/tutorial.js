
async function tutorialCommand(sock, chatId, message) {
    try {
        const tutorialText = `

Hello 👋 User! , here are the tutorial links

> Dont forget to star and for our repo!
https://github.com/mrkeithtech/Moon-X


*1️⃣ HEROKU DEPLOYMENT:*
coming soon...

*2️⃣ RAILWAY DEPLOYMENT:*
coming soon...

*3️⃣ RENDER DEPLOYMENT:*
coming soon...

*4️⃣ KOYEB DEPLOYMENT:*
coming soon...

*5️⃣ PANEL DEPLOYMENT:*
coming soon...

*6️⃣ TERMUX DEPLOYMENT:*
coming soon...

━━━━━━━━━━━━━━━

*🔧 GETTING SESSION ID:*
coming soon...

*📖 DOCUMENTATION:*
🔗 https://github.com/mrkeithtech/Moon-Xmd
_Complete documentation and guides_

*💬 SUPPORT GROUP:*
🔗 https://chat.whatsapp.com/Ir5dLLFsZVaEXklBsYeHSe
_Join for help and support_

*📢 CHANNEL:*
🔗 https://whatsapp.com/channel/0029VbANWX1DuMRi1VNPlB0y
_Stay updated with latest features_

━━━━━━━━━━━━━━━

*🎯 QUICK TIPS:*

• Always use the latest version
• Keep your session ID private
• Join support group and channel for help
• Check documentation first

━━━━━━━━━━━━━━━━

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ Moon-X`;

        await sock.sendMessage(chatId, {
            text: tutorialText
        }, { quoted: message });

    } catch (error) {
        console.error('Error in tutorial command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ *Failed to load tutorial!*\n\nPlease try again later.',
            ...channelInfo
        }, { quoted: message });
    }
}

module.exports = tutorialCommand;