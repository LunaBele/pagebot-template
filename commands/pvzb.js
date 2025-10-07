// ===============================
// PLANTS VS BRAINROTS COMMAND (stock + auto updates in PH)
// ===============================

const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

// Track users who enabled auto updates
const autoUpdateUsers = new Map(); // key = senderId, value = intervalId

function formatDatePH(timestamp) {
  return new Date(timestamp).toLocaleString("en-PH", { timeZone: "Asia/Manila" });
}

async function fetchAndSendPvBStock(senderId, pageAccessToken) {
  try {
    const res = await axios.get('https://plantsvsbrainrotsstocktracker.com/api/stock');
    if (!res.data) return;

    const { items = [], updatedAt } = res.data;
    const updatedDate = updatedAt ? formatDatePH(updatedAt) : "Unknown";

    const seeds = items.filter(i => i.category === "seed");
    const gear = items.filter(i => i.category === "gear");

    const seedList = seeds.length > 0
      ? seeds.map(i => `🌱 ${i.name} [${i.currentStock}]`).join('\n')
      : "None";

    const gearList = gear.length > 0
      ? gear.map(i => `⚙️ ${i.name} [${i.currentStock}]`).join('\n')
      : "None";

    const message =
      `🧠🌿 Plants vs Brainrots Stock

🌱 Seeds:
${seedList}

⚙️ Gear:
${gearList}

📅 Updated: ${updatedDate} (PH)`;

    await sendMessage(senderId, { text: message }, pageAccessToken);
  } catch (err) {
    console.error("Auto PvB stock fetch error:", err.message);
  }
}

module.exports = {
  name: 'pvzb',
  description: 'Shows Plants vs Brainrots stock or toggles auto stock updates.',
  usage: 'pvzb -stock | pvzb -on | pvzb -off',
  author: 'Mart',
  category: 'tools',

  async execute(senderId, args, pageAccessToken) {
    try {
      if (args.length === 0) {
        return sendMessage(senderId, {
          text: "❌ Please specify an option:\n• pvzb -stock\n• pvzb -on\n• pvzb -off"
        }, pageAccessToken);
      }

      const option = args[0].toLowerCase();

      // ================= STOCK =================
      if (option === "-stock") {
        return fetchAndSendPvBStock(senderId, pageAccessToken);
      }

      // ================= AUTO STOCK UPDATES =================
      if (option === "-on") {
        if (autoUpdateUsers.has(senderId)) {
          return sendMessage(senderId, { text: "⚠️ Auto stock updates are already ON." }, pageAccessToken);
        }

        // Immediately send first stock
        await fetchAndSendPvBStock(senderId, pageAccessToken);

        // Start sending every 5 minutes (300000 ms)
        const intervalId = setInterval(() => {
          fetchAndSendPvBStock(senderId, pageAccessToken);
        }, 300000);

        autoUpdateUsers.set(senderId, intervalId);

        return sendMessage(senderId, { text: "✅ Auto PvB stock updates enabled. You will get updates every 5 minutes." }, pageAccessToken);
      }

      if (option === "-off") {
        if (!autoUpdateUsers.has(senderId)) {
          return sendMessage(senderId, { text: "⚠️ Auto stock updates are already OFF." }, pageAccessToken);
        }

        clearInterval(autoUpdateUsers.get(senderId));
        autoUpdateUsers.delete(senderId);

        return sendMessage(senderId, { text: "🛑 Auto PvB stock updates disabled." }, pageAccessToken);
      }

      // Invalid flag
      return sendMessage(senderId, {
        text: "❌ Invalid option. Use:\n• pvzb -stock\n• pvzb -on\n• pvzb -off"
      }, pageAccessToken);

    } catch (error) {
      console.error("pvzb command error:", error.message);
      await sendMessage(senderId, { text: `❌ Error:\n${error.message}` }, pageAccessToken);
    }
  }
};