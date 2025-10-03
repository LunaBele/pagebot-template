const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'rbstalk',
  description: 'Fetch Roblox profile information by username.',
  usage: 'rbstalk <username>',
  category: 'others',
  author: 'OBL1TERATOR',

  async execute(senderId, args, pageAccessToken) {
    if (args.length === 0) {
      await sendMessage(senderId, {
        text: "⚠️ Please provide a Roblox username.\n\nExample: robloxstalk jandel"
      }, pageAccessToken);
      return;
    }

    const username = args.join(" ");

    await sendMessage(senderId, {
      text: `🔍 Fetching Roblox profile for: ${username}...`
    }, pageAccessToken);

    try {
      const response = await axios.get(`https://api.ccprojectsapis-jonell.gleeze.com/api/robloxstalk?user=${encodeURIComponent(username)}`);
      const data = response.data;

      if (!data || !data.username) {
        await sendMessage(senderId, {
          text: `🥺 Sorry, I couldn't find the Roblox user "${username}".`
        }, pageAccessToken);
        return;
      }

      const { userId, username: uname, displayName, description, isBanned, hasVerifiedBadge, accountCreated, social, presence, groups } = data;

      let groupsText = groups
        .slice(0, 3) // show top 3 groups only
        .map(g => `🏷️ ${g.groupName} (${g.memberCount} members) • Role: ${g.userRole}`)
        .join("\n");

      const message =
        `🎮 𝗥𝗼𝗯𝗹𝗼𝘅 𝗣𝗿𝗼𝗳𝗶𝗹𝗲\n` +
        `────────────────\n` +
        `👤 Username: ${uname} (${displayName})\n` +
        `🆔 User ID: ${userId}\n` +
        `📅 Created: ${new Date(accountCreated).toLocaleDateString()}\n` +
        `✅ Verified: ${hasVerifiedBadge ? "Yes" : "No"}\n` +
        `🚫 Banned: ${isBanned ? "Yes" : "No"}\n\n` +
        `📝 Bio: ${description || "No description."}\n\n` +
        `👥 Friends: ${social.friendsCount}\n` +
        `👤 Followers: ${social.followersCount}\n` +
        `➡️ Following: ${social.followingCount}\n\n` +
        `📍 Presence: ${presence.lastLocation}\n\n` +
        `🏛️ Groups:\n${groupsText || "No groups found."}`;

      await sendMessage(senderId, { text: message }, pageAccessToken);

    } catch (error) {
      console.error('Roblox stalk error:', error.message);
      await sendMessage(senderId, {
        text: `❌ An error occurred: ${error.message}`
      }, pageAccessToken);
    }
  }
};