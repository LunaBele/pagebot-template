const axios = require("axios");
const { sendMessage } = require("../handles/sendMessage");
const fs = require("fs");

const token = fs.readFileSync("token.txt", "utf8");

const fontMapping = {
  'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚',
  'H': '𝗛', 'I': '𝗜', 'J': '𝗝', 'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡',
  'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧', 'U': '𝗨',
  'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭',
  'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴',
  'h': '𝗵', 'i': '𝗶', 'j': '𝗷', 'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻',
  'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁', 'u': '𝘂',
  'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇'
};

function convertToBold(text) {
  return text.replace(/(?:\*\*(.*?)\*\*|## (.*?)|### (.*?))/g, (match, boldText, h2Text, h3Text) => {
    const targetText = boldText || h2Text || h3Text;
    return [...targetText].map(char => fontMapping[char] || char).join('');
  });
}

module.exports = {
  name: "ai",
  description: "Ask Gabi (AI) for a response or explanation.",
  usage: 'Send message prompt',
  category: 'ai',
  author: "Tianji",

  async execute(senderId, args, pageAccessToken) {
    const prompt = args.join(" ");
    if (!prompt) {
      return sendMessage(senderId, {
        text: "❌ 𝗘𝗿𝗿𝗼𝗿: 𝗘𝗻𝘁𝗲𝗿 𝗮 𝗽𝗿𝗼𝗺𝗽𝘁 𝘁𝗼 𝗮𝘀𝗸 𝗚𝗮𝗯𝗶."
      }, pageAccessToken);
    }

    await handleGabiResponse(senderId, prompt, pageAccessToken);
  }
};

// === Core Gabi Response Handler ===
const handleGabiResponse = async (senderId, input, pageAccessToken) => {
  const lowerInput = input.toLowerCase();

  // If user asks "who is" or "what is" → Wikipedia search
  if (lowerInput.startsWith("gabi who is") || lowerInput.startsWith("gabi what is")) {
    let topic = input.replace(/gabi (who|what) is/i, "").trim();
    if (!topic) topic = "Grow a Garden"; // default topic

    const summary = await fetchWikipediaSummary(topic);
    if (summary) {
      const gabiReply = `🌱 𝗚𝗔𝗕𝗜\n─────────────\nHere’s what I found about **${summary.title}**:\n${summary.extract}\n─────────────`;
      const formatted = convertToBold(gabiReply);
      await sendConcatenatedMessage(senderId, formatted, pageAccessToken);
      return;
    }
  }

  // Default → use Pixtral AI
  await handlePixtralResponse(senderId, input, pageAccessToken);
};

// === Wikipedia Fetch ===
const fetchWikipediaSummary = async (topic) => {
  try {
    const url = `https://en.wikipedia.org/w/api.php` +
      `?action=query&prop=extracts&exintro=1&explaintext=1` +
      `&redirects=1&titles=${encodeURIComponent(topic)}` +
      `&format=json&origin=*`;

    const { data } = await axios.get(url);
    const pages = data.query?.pages;
    if (!pages) return null;

    const page = Object.values(pages)[0];
    if (!page || !page.extract) return null;

    return { title: page.title, extract: page.extract };
  } catch (error) {
    console.error("Wikipedia API error:", error.message);
    return null;
  }
};

// === Pixtral AI (fallback) ===
const handlePixtralResponse = async (senderId, input, pageAccessToken) => {
  const apiKey = "8ea74b4d-ff0e-4e22-b1a8-ee7f52e97863";
  const url = `https://kaiz-apis.gleeze.com/api/pixtral-12b?q=${encodeURIComponent(input)}&uid=${senderId}&apikey=${apiKey}`;

  try {
    const { data } = await axios.get(url);
    const responseText = data.content || "❌ No response from Pixtral AI.";

    const decoratedResponse = `🌱 𝗚𝗔𝗕𝗜\n─────────────\n${responseText}\n─────────────`;
    const formatted = convertToBold(decoratedResponse);

    await sendConcatenatedMessage(senderId, formatted, pageAccessToken);
  } catch (error) {
    console.error("Pixtral API error:", error.message);
    return sendMessage(senderId, {
      text: "❌ 𝗘𝗿𝗿𝗼𝗿: 𝗨𝗻𝗮𝗯𝗹𝗲 𝘁𝗼 𝗴𝗲𝘁 𝗮 𝗿𝗲𝘀𝗽𝗼𝗻𝘀𝗲."
    }, pageAccessToken);
  }
};

// === Message Chunking ===
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