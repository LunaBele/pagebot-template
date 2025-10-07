// ===============================
// PLANTS VS BRAINROTS COMMAND (stock monitor + auto updates in PH)
// ===============================

const axios = require("axios");
const { sendMessage } = require("../handles/sendMessage");

// Track users who enabled auto updates
const autoUpdateUsers = new Map(); // key = senderId, value = { intervalId, lastData }

function formatDatePH(timestamp) {
  return new Date(timestamp).toLocaleString("en-PH", { timeZone: "Asia/Manila" });
}

async function fetchPvBStock() {
  try {
    const res = await axios.get("https://plantsvsbrainrotsstocktracker.com/api/stock");
    if (!res.data) return null;
    return res.data;
  } catch (err) {
    console.error("PvB stock fetch error:", err.message);
    return null;
  }
}

function formatStockMessage(data) {
  const { items = [], updatedAt } = data;
  const updatedDate = updatedAt ? formatDatePH(updatedAt) : "Unknown";
  
  const seeds = items.filter(i => i.category === "seed");
  const gear = items.filter(i => i.category === "gear");
  
  const seedList = seeds.length > 0 ?
    seeds.map(i => `🌱 ${i.name} [${i.currentStock}]`).join("\n") :
    "None";
  
  const gearList = gear.length > 0 ?
    gear.map(i => `⚙️ ${i.name} [${i.currentStock}]`).join("\n") :
    "None";
  
  return `🧠🌿 Plants vs Brainrots Stock

🌱 Seeds:
${seedList}

⚙️ Gear:
${gearList}

📅 Updated: ${updatedDate} (PH)`;
}

function hasStockChanged(oldData, newData) {
  if (!oldData || !newData) return true;
  
  // Compare updatedAt first
  if (oldData.updatedAt !== newData.updatedAt) return true;
  
  // Compare item stocks
  const oldItems = oldData.items || [];
  const newItems = newData.items || [];
  
  if (oldItems.length !== newItems.length) return true;
  
  for (let i = 0; i < newItems.length; i++) {
    const oldItem = oldItems[i];
    const newItem = newItems[i];
    if (
      oldItem.name !== newItem.name ||
      oldItem.currentStock !== newItem.currentStock
    ) {
      return true;
    }
  }
  
  return false;
}

async function fetchAndSendPvBStock(senderId, pageAccessToken) {
  const data = await fetchPvBStock();
  if (!data) {
    return sendMessage(senderId, { text: "⚠️ Unable to fetch stock data right now." }, pageAccessToken);
  }
  
  const message = formatStockMessage(data);
  await sendMessage(senderId, { text: message }, pageAccessToken);
  
  return data;
}

module.exports = {
  name: "pvzb",
  description: "Shows Plants vs Brainrots stock or toggles auto updates when stock changes.",
  usage: "pvzb -stock | pvzb -on | pvzb -off",
  author: "Mart",
  category: "tools",
  
  async execute(senderId, args, pageAccessToken) {
    try {
      if (args.length === 0) {
        return sendMessage(senderId, {
          text: "❌ Please specify an option:\n• pvzb -stock\n• pvzb -on\n• pvzb -off",
        }, pageAccessToken);
      }
      
      const option = args[0].toLowerCase();
      
      // ================= STOCK =================
      if (option === "-stock") {
        return fetchAndSendPvBStock(senderId, pageAccessToken);
      }
      
      // ================= AUTO UPDATES ON =================
      if (option === "-on") {
        if (autoUpdateUsers.has(senderId)) {
          return sendMessage(senderId, { text: "⚠️ Auto stock updates are already ON." }, pageAccessToken);
        }
        
        const initialData = await fetchAndSendPvBStock(senderId, pageAccessToken);
        
        const intervalId = setInterval(async () => {
          const newData = await fetchPvBStock();
          if (!newData) return;
          
          const userData = autoUpdateUsers.get(senderId);
          const oldData = userData ? userData.lastData : null;
          
          if (hasStockChanged(oldData, newData)) {
            const msg = formatStockMessage(newData);
            await sendMessage(senderId, { text: msg }, pageAccessToken);
            userData.lastData = newData;
            autoUpdateUsers.set(senderId, userData);
          }
        }, 300000); // every 5 minutes
        
        autoUpdateUsers.set(senderId, { intervalId, lastData: initialData });
        
        return sendMessage(senderId, { text: "✅ Auto PvB stock updates enabled. You'll receive updates only when stock changes." }, pageAccessToken);
      }
      
      // ================= AUTO UPDATES OFF =================
      if (option === "-off") {
        if (!autoUpdateUsers.has(senderId)) {
          return sendMessage(senderId, { text: "⚠️ Auto stock updates are already OFF." }, pageAccessToken);
        }
        
        const { intervalId } = autoUpdateUsers.get(senderId);
        clearInterval(intervalId);
        autoUpdateUsers.delete(senderId);
        
        return sendMessage(senderId, { text: "🛑 Auto PvB stock updates disabled." }, pageAccessToken);
      }
      
      // ================= INVALID OPTION =================
      return sendMessage(senderId, {
        text: "❌ Invalid option. Use:\n• pvzb -stock\n• pvzb -on\n• pvzb -off",
      }, pageAccessToken);
    } catch (error) {
      console.error("pvzb command error:", error.message);
      await sendMessage(senderId, { text: `❌ Error:\n${error.message}` }, pageAccessToken);
    }
  },
};