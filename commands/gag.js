// ===============================
// GROW A GARDEN COMMAND (stock + weather in one)
// ===============================

const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'gag',
  description: 'Shows Grow A Garden stock or weather info.',
  usage: 'gag -stock | gag -weather',
  author: 'Mart',
  category: 'tools',
  
  async execute(senderId, args, pageAccessToken) {
    try {
      if (args.length === 0) {
        return sendMessage(senderId, {
          text: "❌ Please specify an option:\n• gag -stock\n• gag -weather"
        }, pageAccessToken);
      }
      
      const option = args[0].toLowerCase();
      
      // ================= STOCK =================
      if (option === "-stock") {
        const res = await axios.get('https://growagardenstock.com/api/stock');
        if (!res.data) {
          return sendMessage(senderId, { text: "❌ Failed to fetch stock data." }, pageAccessToken);
        }
        
        const { updatedAt, gear = [], seeds = [], egg = [] } = res.data;
        const updatedDate = updatedAt ? new Date(updatedAt).toLocaleString() : "Unknown";
        
        const gearList = gear.length > 0 ? gear.map(i => `• ${i}`).join('\n') : "None";
        const seedList = seeds.length > 0 ? seeds.map(i => `• ${i}`).join('\n') : "None";
        const eggList = egg.length > 0 ? egg.map(i => `• ${i}`).join('\n') : "None";
        
        const message =
          `🌱 Grow A Garden Stock

🛠️ Gear:
${gearList}

🌾 Seeds:
${seedList}

🥚 Eggs:
${eggList}

📅 Updated: ${updatedDate}`;
        
        return sendMessage(senderId, { text: message }, pageAccessToken);
      }
      
      // ================= WEATHER =================
      if (option === "-weather") {
        const res = await axios.get('https://growagardenstock.com/api/stock/weather');
        if (!res.data) {
          return sendMessage(senderId, { text: "❌ Failed to fetch weather data." }, pageAccessToken);
        }
        
        const w = res.data;
        const weatherDate = w.updatedAt ? new Date(w.updatedAt).toLocaleString() : "Unknown";
        const weatherEnd = w.endTime ? new Date(w.endTime).toLocaleTimeString() : "Unknown";
        
        const mutations = Array.isArray(w.mutations) && w.mutations.length > 0 ?
          w.mutations.map(m => `• ${m}`).join('\n') :
          "None";
        
        const message =
          `⛅ Grow A Garden Weather

${w.icon || ''} ${w.currentWeather || 'Unknown'}
${w.description || 'No description.'}

🌱 Effect: ${w.effectDescription || 'N/A'}
🎭 Visual Cue: ${w.visualCue || 'N/A'}
🌾 Crop Bonuses: ${w.cropBonuses || 'N/A'}

🧬 Mutations:
${mutations}

✨ Rarity: ${w.rarity || 'N/A'}
⏰ Ends: ${weatherEnd}
📅 Updated: ${weatherDate}`;
        
        return sendMessage(senderId, { text: message }, pageAccessToken);
      }
      
      // If invalid flag
      return sendMessage(senderId, {
        text: "❌ Invalid option. Use:\n• gag -stock\n• gag -weather"
      }, pageAccessToken);
      
    } catch (error) {
      console.error("gag command error:", error.message);
      await sendMessage(senderId, { text: `❌ Error:\n${error.message}` }, pageAccessToken);
    }
  }
};