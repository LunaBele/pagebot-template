// ===============================
// PLANTS VS BRAINROTS COMMAND (stock monitor + auto updates synced to 5-min marks)
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

// Aligns interval to nearest 5-minute mark (00, 05, 10, 15, ...)
function scheduleNextFiveMinuteSync(callback) {
  const now = new Date();
  const ms = now.getTime();
  
  // Compute milliseconds until next 5-min mark
  const next = new Date(ms);
  const minute = now.getMinutes();
  const nextMinuteMark = Math.ceil(minute / 5) * 5;
  next.setMinutes(nextMinuteMark, 0, 0);
  
  // If already exactly on mark (like 12:05:00), go to next one
  if (next <= now) next.setMinutes(next.getMinutes() + 5, 0, 0);
  
  const delay = next - now;
  
  // Run once at the next mark
  setTimeout(() => {
    callback();
    // Then repeat every 5 minutes exactly on the marks
    setInterval(callback, 5 * 60 * 1000);
  }, delay);
}

module.exports = {
  name: "pvzb",
  description: "Shows Plants vs Brainrots stock or toggles auto updates synced to PH 5-min marks.",
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
        
        // Schedule next updates synced to 5-min marks
        const syncTask = () => {
          (async () => {
            const newData = await fetchPvBStock();
            if (!newData) return;
            
            const userData = autoUpdateUsers.get(senderId);
            if (!userData) return; // If turned off during wait, skip.
            
            const oldData = userData.lastData;
            if (hasStockChanged(oldData, newData)) {
              const msg = formatStockMessage(newData);
              await sendMessage(senderId, { text: msg }, pageAccessToken);
              userData.lastData = newData;
              autoUpdateUsers.set(senderId, userData);
            }
          })();
        };
        
        // Schedule for next exact 5-min mark
        scheduleNextFiveMinuteSync(syncTask);
        
        // Mark as active
        autoUpdateUsers.set(senderId, { intervalId: true, lastData: initialData });
        
        return sendMessage(senderId, {
          text: "✅ Auto PvB stock updates enabled. Updates will send every 5 minutes (on the clock) when stock changes.",
        }, pageAccessToken);
      }
      
      // ================= AUTO UPDATES OFF =================
      if (option === "-off") {
        if (!autoUpdateUsers.has(senderId)) {
          return sendMessage(senderId, { text: "⚠️ Auto stock updates are already OFF." }, pageAccessToken);
        }
        
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