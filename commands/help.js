const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

const COMMANDS_PATH = path.join(__dirname, '../commands');

const CATEGORY_MAP = {
  ai: '🤖 𝗔𝗜 𝗖𝗼𝗺𝗺𝗮𝗻𝗱𝘀',
  music: '🎵 𝗠𝘂𝘀𝗶𝗰 𝗖𝗼𝗺𝗺𝗮𝗻𝗱𝘀',
  images: '🖼️ 𝗜𝗺𝗮𝗴𝗲 𝗖𝗼𝗺𝗺𝗮𝗻𝗱𝘀',
  tools: '⚙️ 𝗧𝗼𝗼𝗹𝘀',
  uploader: '📤 �_U𝗽𝗹𝗼𝗮𝗱𝗲𝗿',
  others: '📚 𝗢𝘁𝗵𝗲𝗿𝘀'
};

const ALLOWED_CATEGORIES = ['ai', 'music', 'images', 'tools', 'uploader'];

module.exports = {
  name: 'help',
  description: 'Display available commands by category or details for a specific command.',
  usage: 'help [command name]',
  author: 'Pagebot System',
  category: 'tools',
  
  async execute(senderId, args, pageAccessToken) {
    try {
      const files = fs.readdirSync(COMMANDS_PATH).filter(file => file.endsWith('.js'));
      
      const commands = files.map(file => {
        try {
          const cmd = require(path.join(COMMANDS_PATH, file));
          const category = ALLOWED_CATEGORIES.includes(cmd.category) ? cmd.category : 'others';
          
          return {
            name: cmd.name || 'Unnamed',
            description: cmd.description || 'No description available.',
            usage: cmd.usage || 'Not specified.',
            author: cmd.author || 'Unknown',
            category
          };
        } catch {
          return null;
        }
      }).filter(Boolean);
      
      // If specific command is requested  
      if (args.length > 0) {
        const input = args[0].toLowerCase();
        const cmd = commands.find(c => c.name.toLowerCase() === input);
        
        if (!cmd) {
          return sendMessage(senderId, {
            text: `❌ 𝗖𝗼𝗺𝗺𝗮𝗻𝗱 "${input}" 𝗻𝗼𝘁 𝗳𝗼𝘂𝗻𝗱!`
          }, pageAccessToken);
        }
        
        const response = `  
━━━━━━━━━━━━━━━━━━━━━━━  
📜 **𝗖𝗢𝗠𝗠𝗔𝗡𝗗 𝗜𝗡𝗙𝗢**  
━━━━━━━━━━━━━━━━━━━━━━━  
📌 **𝗡𝗮𝗺𝗲**: ${cmd.name}  
📝 **𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻**: ${cmd.description}  
🛠️ **𝗨𝘀𝗮𝗴𝗲**: \`${cmd.usage}\`  
🏷️ **𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝘆**: ${CATEGORY_MAP[cmd.category] || '📚 Others'}  
👤 **𝗔𝘂𝘁𝗵𝗼𝗿**: ${cmd.author}  
━━━━━━━━━━━━━━━━━━━━━━━`;
        
        return sendMessage(senderId, { text: response }, pageAccessToken);
      }
      
      // Group all commands by category  
      const grouped = {};
      for (const cat of Object.keys(CATEGORY_MAP)) grouped[cat] = [];
      
      for (const cmd of commands) {
        grouped[cmd.category || 'others'].push(`➤ ${cmd.name}`);
      }
      
      const totalCount = commands.length;
      let message = `  
━━━━━━━━━━━━━━━━━━━━━━━  
🌟 **𝗖𝗢𝗠𝗠𝗔𝗡𝗗 𝗠𝗘𝗡𝗨** [${totalCount}]  
━━━━━━━━━━━━━━━━━━━━━━━  
✨ Explore all available commands below, organized by category!  

`;
      
      for (const cat of Object.keys(CATEGORY_MAP)) {
        if (grouped[cat].length > 0) {
          message += `  
**${CATEGORY_MAP[cat]}**  
${grouped[cat].join('\n')}  
`;
        }
      }
      
      message += `  
━━━━━━━━━━━━━━━━━━━━━━━  
📌 **Want more details?** Use \`help <command>\` to dive into a specific command!  
━━━━━━━━━━━━━━━━━━━━━━━`;
      
      // Fetch random fact  
      let factText = null;
      try {
        const factRes = await axios.get("https://api.popcat.xyz/v2/fact");
        if (factRes.data && factRes.data.message && factRes.data.message.fact) {
          factText = factRes.data.message.fact;
        }
      } catch (err) {
        factText = null;
      }
      
      if (factText) {
        message += `  
💡 **𝗙𝗨𝗡 𝗙𝗔𝗖𝗧**  
${factText}  
━━━━━━━━━━━━━━━━━━━━━━━`;
      }
      
      await sendMessage(senderId, { text: message }, pageAccessToken);
      
    } catch (error) {
      console.error('Help command error:', error.message);
      await sendMessage(senderId, {
        text: `❌ **𝗘𝗿𝗿𝗼𝗿**: Something went wrong while displaying the help menu!\n${error.message}`
      }, pageAccessToken);
    }
  }
};