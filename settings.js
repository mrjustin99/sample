/*==================================

      MOON XMD SETTINGS 
      
  DEVELOPED BY  K E I T H   T E C H
  
 
- Owner: Keith 
- Github: https://github.com/mrkeithtech/
- Telegram: https://t.me/mrkeithtech


================================*/

const fs = require('fs')
if (fs.existsSync('.env')) require('dotenv').config({ path: __dirname+'/.env' })

const settings = {

//====== DONT CHANGE =============//
  packname: process.env.PACKAGE_NAME || 'Mr Keith Tech',
  
  author: process.env.AUTHOUR || 'KEITH TECH',
  
//======= BOT SETTINGS ============//

  SESSION_ID: process.env.SESSION_ID || '',

  botName: process.env.BOT_NAME || "MOON-X",
  
  commandMode: process.env.MODE || "public",
  
  // Menu type: "v1" = with image, "v2" = text only
  MenuStyle: process.env.MENU_STYLE || "v1",
  
  timezone: process.env.TIME_ZONE || "Africa/Harare",
  
  botOwner: process.env.BOT_OWNER || 'ᴋᴇɪᴛʜ ᴛᴇᴄʜ',
  
  ownerNumber: process.env.OWNER_NUMBER || '',

  //======== AUTOBIO SETTINGS ===========//
  // Auto bio: "on" = updates bot WA bio with time/date, "off" = disabled
  autoBio: process.env.AUTO_BIO || "on",

  //======== ALWAYS ONLINE / OFFLINE ===========//
  alwaysOnline: process.env.ALWAYS_ONLINE || "off",   // "on" or "off"
  alwaysOffline: process.env.ALWAYS_OFFLINE || "off",  // "on" or "off"


  //======== ANTIEDIT SETTINGS ===========//
  antieditMode: process.env.ANTIEDIT_MODE || "public", // "public" or "private"
  antieditEnabled: process.env.ANTIEDIT_ENABLED || true,
  
  
  // Prefix: Examples: '.' or ['.', '!', '#', '$']
  Prefix: process.env.PREFIX ? (process.env.PREFIX.includes(',') ? process.env.PREFIX.split(',') : process.env.PREFIX) : ['.', '*', '#', '$'],
  
  
  
//======== DONT CHANGE ===========//
  giphyApiKey: process.env.GIPHYAPIKEY || 'qnl7ssQChTdPjsKta2Ax2LMaGXz303tq',
  
  maxStoreMessages: process.env.MAX_STORE_MESSAGES || 20, 
  
  storeWriteInterval: process.env.STORE_WRITE_INTERVAL || 10000,
  
  description: process.env.DESCRIPTION || "ADVANCED W.A BOT DEVELOPED BY KEITH TECH",
  
  version: process.env.VERSION || "1.0.0",
};

module.exports = settings;
