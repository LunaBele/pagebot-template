const axios = require("axios");
const { sendMessage } = require("../handles/sendMessage");
const fs = require("fs");

const token = fs.readFileSync("token.txt", "utf8");

const fontMapping = {
  'A': '𝗔','B': '𝗕','C': '𝗖','D': '𝗗','E': '𝗘','F': '𝗙','G': '𝗚',
  'H': '𝗛','I': '𝗜','J': '𝗝','K': '𝗞','L': '𝗟','M': '𝗠','N': '𝗡',
  'O': '𝗢','P': '𝗣','Q': '𝗤','R': '𝗥','S': '𝗦','T': '𝗧','U': '𝗨',
  'V': '𝗩','W': '𝗪','X': '𝗫','Y': '𝗬','Z': '𝗭',
  'a': '𝗮','b': '𝗯','c': '𝗰','d': '𝗱','e': '𝗲','f': '𝗳','g': '𝗴',
  'h': '𝗵','i': '𝗶','j': '𝗷','k': '𝗸','l': '𝗹','m': '𝗺','n': '𝗻',
  'o': '𝗼','p': '𝗽','q': '𝗾','r': '𝗿','s': '𝘀','t': '𝘁','u': '𝘂',
  'v': '𝘃','w': '𝘄','x': '𝘅','y': '𝘆','z': '𝘇'
};

function convertToBold(text) {
  return text.replace(/(?:\*\*(.*?)\*\*|## (.*?)|### (.*?))/g, (match, boldText, h2Text, h3Text) => {
    const targetText = boldText || h2Text || h3Text;
    return [...targetText].map(char => fontMapping[char] || char).join('');
  });
}

module.exports = {
  name: "gabi",
  description: "Chat with Gabi, the Grow a Garden AI expert.",
  usage: "Ask Gabi about seeds, pets, gears, eggs, or game strategies",
  category: "ai",
  author: "Tianji",

  async execute(senderId, args, pageAccessToken) {
    const prompt = args.join(" ");
    if (!prompt) {
      return sendMessage(senderId, {
        text: "❌ 𝗘𝗿𝗿𝗼𝗿: 𝗣𝗹𝗲𝗮𝘀𝗲 𝗮𝘀𝗸 𝗚𝗮𝗯𝗶 𝗮 𝗾𝘂𝗲𝘀𝘁𝗶𝗼𝗻."
      }, pageAccessToken);
    }

    // If user explicitly asks to "search" something → Wikipedia API
    if (/search|what is|who is|when is/i.test(prompt)) {
      return handleWikipediaSearch(senderId, prompt, pageAccessToken);
    }

    // Otherwise → Gabi's normal AI knowledge
    await handleGabiAIResponse(senderId, prompt, pageAccessToken);
  }
};

const handleGabiAIResponse = async (senderId, input, pageAccessToken) => {
  const apiKey = "8ea74b4d-ff0e-4e22-b1a8-ee7f52e97863";
  const personaPrompt = `You are Gabi, an expert AI bot for the Roblox game "Grow a Garden" by Jandel. 
You specialize in giving professional, friendly, and clear answers about the game’s seeds, gears, eggs, pets, events, and strategies.
Always explain things in a way that makes the player feel like you're their guide inside the game world.

User question: ${input}`;

  const url = `https://kaiz-apis.gleeze.com/api/pixtral-12b?q=${encodeURIComponent(personaPrompt)}&uid=${senderId}&apikey=${apiKey}`;

  try {
    const { data } = await axios.get(url);
    const responseText = data.content || "❌ No response from Gabi.";

    const decoratedResponse = `🌱 𝗚𝗔𝗕𝗜\n─────────────\n${responseText}\n─────────────`;
    const formatted = convertToBold(decoratedResponse);

    await sendConcatenatedMessage(senderId, formatted, pageAccessToken);
  } catch (error) {
    console.error("Gabi AI error:", error.message);
    return sendMessage(senderId, {
      text: "❌ 𝗘𝗿𝗿𝗼𝗿: 𝗚𝗮𝗯𝗶 𝗰𝗼𝘂𝗹𝗱 𝗻𝗼𝘁 𝗿𝗲𝘀𝗽𝗼𝗻𝗱."
    }, pageAccessToken);
  }
};

const handleWikipediaSearch = async (senderId, query, pageAccessToken) => {
  const apiKey = "8ea74b4d-ff0e-4e22-b1a8-ee7f52e97863";
  const url = `https://kaiz-apis.gleeze.com/api/wikipedia?search=${encodeURIComponent(query)}&apikey=${apiKey}`;

  try {
    const { data } = await axios.get(url);
    const shortInfo = data.shortMeaning || "❌ Sorry, I couldn’t find anything.";

    // Blend Wikipedia fact into Gabi’s voice
    const gabiReply = `🌱 𝗚𝗔𝗕𝗜\n─────────────\nHere’s what I found for you: ${shortInfo}\n─────────────`;

    const formatted = convertToBold(gabiReply);
    await sendConcatenatedMessage(senderId, formatted, pageAccessToken);
  } catch (error) {
    console.error("Wikipedia search error:", error.message);
    return sendMessage(senderId, {
      text: "❌ 𝗘𝗿𝗿𝗼𝗿: 𝗚𝗮𝗯𝗶 𝗰𝗼𝘂𝗹𝗱𝗻’𝘁 𝗴𝗲𝘁 𝘀𝗲𝗮𝗿𝗰𝗵 𝗿𝗲𝘀𝘂𝗹𝘁𝘀."
    }, pageAccessToken);
  }
};

const sendConcatenatedMessage = async (senderId, text, pageAccessToken) => {
  const maxLength = 2000;
  const chunks = splitMessageIntoChunks(text, maxLength);
  for (const msg of chunks) {
    await sendMessage(senderId, { text: msg }, pageAccessToken);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
};

const splitMessageIntoChunks = (message, chunkSize) => {
  const chunks = [];
  for (let i = 0; i < message.length; i += chunkSize) {
    chunks.push(message.slice(i, i + chunkSize));
  }
  return chunks;
};