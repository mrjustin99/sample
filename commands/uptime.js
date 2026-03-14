/*

CODES BY KEITH

*/

const os = require('os');
const { getUptime } = require('../lib/runtime');
const settings = require('../settings');

async function uptimeCommand(sock, chatId, message) {
    try {
        
        const uptime = getUptime();
        
        const upinfo = `
*${settings.botName} | Uptime: ${uptime}*`.trim();

        await sock.sendMessage(chatId, { 
            text: upinfo
        });

    } catch (error) {
        console.error('❌ Error in uptime command:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to get Uptime.' 
        }, { quoted: message });
    }
}

module.exports = uptimeCommand;