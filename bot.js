require('dotenv').config();

const { Telegraf } = require('telegraf');
const axios = require('axios');

// Use environment variables for sensitive information
const botToken = process.env.BOT_TOKEN;
const apiKey = process.env.TEXT_ANALYTICS_KEY;
const visionApiKey = process.env.VISION_API_KEY;
const endpoint = process.env.TEXT_ANALYTICS_ENDPOINT;
const visionEndpoint = process.env.VISION_API_ENDPOINT;

const bot = new Telegraf(botToken);

// Function to analyze sentiment
const analyzeSentiment = async (text) => {
  try {
    const response = await axios.post(
      `${endpoint}/text/analytics/v3.1/sentiment`,
      {
        documents: [{ id: '1', language: 'en', text }],
      },
      {
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.documents[0];
  } catch (error) {
    console.error('Error analyzing sentiment:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// Function to analyze an image using Azure Computer Vision
const analyzeImage = async (imageUrl) => {
  try {
    console.log('Analyzing Image:', imageUrl);
    const response = await axios.post(
      `${visionEndpoint}/analyze`,
      { url: imageUrl },
      {
        headers: {
          'Ocp-Apim-Subscription-Key': visionApiKey,
          'Content-Type': 'application/json',
        },
        params: {
          visualFeatures: 'Description,Tags',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error analyzing image:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// Fun response based on sentiment
const getFunResponse = (sentiment) => {
  const jokes = ["Why don't skeletons fight each other? They don't have the guts!", "I'm reading a book about anti-gravity. It's impossible to put down!", "Why do cows wear bells? Because their horns don't work!"];
  const facts = ["Did you know? Honey never spoils.", "A group of flamingos is called a 'flamboyance'.", "Bananas are berries, but strawberries aren't!"];
  const quotes = ["Keep your face always toward the sunshine.", "The best way to predict the future is to create it.", "Believe you can and you're halfway there."];

  if (sentiment === 'positive') {
    return jokes[Math.floor(Math.random() * jokes.length)];
  } else if (sentiment === 'neutral') {
    return facts[Math.floor(Math.random() * facts.length)];
  } else if (sentiment === 'negative') {
    return quotes[Math.floor(Math.random() * quotes.length)];
  }
};

bot.start((ctx) => ctx.reply('Hello! Send me a message, and I will analyze its sentiment or send me an image, and I will describe it.'));

bot.on('text', async (ctx) => {
  const userMessage = ctx.message.text;

  try {
    const analysisResult = await analyzeSentiment(userMessage);
    const sentiment = analysisResult.sentiment;
    const positiveScore = analysisResult.confidenceScores.positive;
    const neutralScore = analysisResult.confidenceScores.neutral;
    const negativeScore = analysisResult.confidenceScores.negative;

    let reply = `Your message sentiment is: ${sentiment}\nPositive: ${positiveScore}\nNeutral: ${neutralScore}\nNegative: ${negativeScore}`;
    const funResponse = getFunResponse(sentiment);
    reply += `\n\nHere's something for you: ${funResponse}`;

    ctx.reply(reply);
  } catch (error) {
    console.error('Error analyzing text:', error);
    ctx.reply('Sorry, there was an error analyzing your message.');
  }
});

bot.on('photo', async (ctx) => {
  const photo = ctx.message.photo.pop();
  const fileId = photo.file_id;
  const fileUrl = await ctx.telegram.getFileLink(fileId);

  try {
    const analysis = await analyzeImage(fileUrl.href);
    const description = analysis.description.captions[0]?.text || "No description available";
    const tags = analysis.description.tags.join(', ');

    ctx.reply(`I analyzed the image and here's what I see: "${description}".\nTags: ${tags}`);
  } catch (error) {
    console.error('Error analyzing image:', error);
    ctx.reply('Sorry, there was an error analyzing your image.');
  }
});

// Start the bot
bot.launch();
console.log('Bot is running...');
