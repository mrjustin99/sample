// Copilot Ai

const axios = require("axios");

 async function copilotCommand( sock, chatId, message ) {
        try {
 await sock.sendMessage(chatId, {
            react: { text: '👨‍💻', key: message.key }
        }); 
            
 const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
       
           if (!text) {
 await sock.sendMessage(chatId, { 
                text: "Please provide a question\n\nExample: .copilot give me a code for js"
            });
        }
  const res = await axios.get(    `https://eliteprotech-apis.zone.id/copilot?q=${encodeURIComponent(text)}`
            );
 if (!res.data || !res.data.result || !res.data.result.text){
 await sock.sendMessage(chatId, { 
                text: "Error occurrd"},{ quoted: message
            });
        }
  
 await sock.sendMessage(chatId, {
                text: res.data.result.text
            },{ quoted: message });
  
  await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });            
            
        } catch (err) {
            console.error(err);
   await sock.sendMessage(chatId, { 
                text: "❎ Error occured"
            },{ quoted: message });
            
        }
    };

module.exports = copilotCommand;