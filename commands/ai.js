// ===============================
// GROW A GARDEN COMMAND (stock + weather + auto updates in PH)
// ===============================

const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

// Track users who enabled auto updates
const autoUpdateUsers = new Map(); // key = senderId, value = intervalId

function formatDatePH(timestamp) {
  return new Date(timestamp).toLocaleString("en-PH", { timeZone: "Asia/Manila" });
}

function formatTimePH(timestamp) {
  return new Date(timestamp).toLocaleTimeString("en-PH", { timeZone: "Asia/Manila" });
}

async function fetchAndSendStock(senderId, pageAccessToken) {
  try {
    const res = await axios.get('https://growagardenstock.com/api/stock');
    if (!res.data) return;
    
    const { updatedAt, gear = [], seeds = [], egg = [] } = res.data;
    const updatedDate = updatedAt ? formatDatePH(updatedAt) : "Unknown";
    
    const gearList = gear.length > 0 ? gear.map(i => `• ${i}`).join('\n') : "None";
    const seedList = seeds.length > 0 ? seeds.map(i => `• ${i}`).join('\n') : "None";
    const eggList = egg.length > 0 ? egg.map(i => `• ${i}`).join('\n') : "None";
    
    const message =
      `🌱 Grow A Garden Stock (Auto Update)

🛠️ Gear:
${gearList}

🌾 Seeds:
${seedList}

🥚 Eggs:
${eggList}

📅 Updated: ${updatedDate} (PH)`;
    
    await sendMessage(senderId, { text: message }, pageAccessToken);
  } catch (err) {
    console.error("Auto stock fetch error:", err.message);
  }
}

module.exports = {
  name: 'gag',
  description: 'Shows Grow A Garden stock, weather, or toggles auto stock updates.',
  usage: 'gag -stock | gag -weather | gag -on | gag -off',
  author: 'Mart',
  category: 'tools',
  
  async execute(senderId, args, pageAccessToken) {
    try {
      if (args.length === 0) {
        return sendMessage(senderId, {
          text: "❌ Please specify an option:\n• gag -stock\n• gag -weather\n• gag -on\n• gag -off"
        }, pageAccessToken);
      }
      
      const option = args[0].toLowerCase();
      
      // ================= STOCK =================
      if (option === "-stock") {
        return fetchAndSendStock(senderId, pageAccessToken);
      }
      
      // ================= WEATHER =================
      if (option === "-weather") {
        const res = await axios.get('https://growagardenstock.com/api/stock/weather');
        if (!res.data) {
          return sendMessage(senderId, { text: "❌ Failed to fetch weather data." }, pageAccessToken);
        }
        
        const w = res.data;
        const weatherDate = w.updatedAt ? formatDatePH(w.updatedAt) : "Unknown";
        const weatherEnd = w.endTime ? formatTimePH(w.endTime) : "Unknown";
        
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
⏰ Ends: ${weatherEnd} (PH)
📅 Updated: ${weatherDate} (PH)`;
        
        return sendMessage(senderId, { text: message }, pageAccessToken);
      }
      
      // ================= AUTO STOCK UPDATES =================
      if (option === "-on") {
        if (autoUpdateUsers.has(senderId)) {
          return sendMessage(senderId, { text: "⚠️ Auto stock updates are already ON." }, pageAccessToken);
        }
        
        // Immediately send first stock
        await fetchAndSendStock(senderId, pageAccessToken);
        
        // Start sending every 5 minutes (300000 ms)
        const intervalId = setInterval(() => {
          fetchAndSendStock(senderId, pageAccessToken);
        }, 300000);
        
        autoUpdateUsers.set(senderId, intervalId);
        
        return sendMessage(senderId, { text: "✅ Auto stock updates enabled. You will get updates every 5 minutes." }, pageAccessToken);
      }
      
      if (option === "-off") {
        if (!autoUpdateUsers.has(senderId)) {
          return sendMessage(senderId, { text: "⚠️ Auto stock updates are already OFF." }, pageAccessToken);
        }
        
        clearInterval(autoUpdateUsers.get(senderId));
        autoUpdateUsers.delete(senderId);
        
        return sendMessage(senderId, { text: "🛑 Auto stock updates disabled." }, pageAccessToken);
      }
      
      // If invalid flag
      return sendMessage(senderId, {
        text: "❌ Invalid option. Use:\n• gag -stock\n• gag -weather\n• gag -on\n• gag -off"
      }, pageAccessToken);
      
    } catch (error) {
      console.error("gag command error:", error.message);
      await sendMessage(senderId, { text: `❌ Error:\n${error.message}` }, pageAccessToken);
    }
  }
};