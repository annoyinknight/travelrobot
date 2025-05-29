```markdown
# 🤖 Telegram Travel Bot

AI-powered travel assistant bot for Telegram using Deepseek AI integration.

## ✨ Features

- 🤖 **AI-Powered Responses**: Uses Deepseek AI for intelligent travel assistance
- 🌍 **Travel Focus**: Specialized in travel planning, tours, visas, and travel advice
- 🔐 **Secure**: User access control and rate limiting
- 🇷🇺 **Russian Language**: Responds in Russian for Russian-speaking users
- ⚡ **Real-time**: Webhook-based for instant responses

## 🎯 Bot Commands

- `/start` - Get welcome message and bot introduction
- `/help` - Show available commands and features
- `/tours` - Get help finding tours and travel packages
- `/checklist` - Create personalized travel checklists
- `/visa` - Get visa information for different countries
- `/weather` - Get weather information for destinations

## 🚀 Quick Deploy

### Deploy to Railway (Recommended)

1. **Fork this repository**
2. **Sign up at [Railway.app](https://railway.app)**
3. **Connect your GitHub repo**
4. **Set environment variables** (see below)
5. **Deploy automatically**

### Deploy to Heroku

```bash
# Clone the repository
git clone https://github.com/yourusername/telegram-travel-bot.git
cd telegram-travel-bot

# Install Heroku CLI and login
heroku login

# Create new Heroku app
heroku create your-bot-name

# Set environment variables
heroku config:set TELEGRAM_BOT_TOKEN=your_token_here
heroku config:set DEEPSEEK_API_KEY=your_key_here
heroku config:set ALLOWED_USER_IDS=your_user_id_here

# Deploy
git push heroku main
```

## ⚙️ Environment Variables

Create a `.env` file with these variables:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here
ALLOWED_USER_IDS=7454939
PORT=3000
```

### Getting Your Bot Token

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow instructions
3. Copy the token provided

### Getting Deepseek API Key

1. Visit [deepseek.com](https://deepseek.com)
2. Sign up for an account
3. Generate an API key from the dashboard
4. Add credits to your account

### Finding Your User ID

1. Send a message to your bot
2. Check the server logs for your user ID
3. Add it to `ALLOWED_USER_IDS`

## 🔧 Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/telegram-travel-bot.git
cd telegram-travel-bot

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your values
nano .env

# Start development server
npm run dev
```

## 🌐 Setting Up Webhook

After deployment, set up the webhook:

```bash
curl -X POST https://your-app-url.com/set-webhook \
  -H "Content-Type: application/json" \
  -d '{"webhook_url": "https://your-app-url.com/webhook"}'
```

## 📊 API Endpoints

- `POST /webhook` - Telegram webhook endpoint
- `GET /health` - Health check endpoint
- `POST /set-webhook` - Set Telegram webhook
- `POST /remove-webhook` - Remove Telegram webhook

## 🔒 Security Features

- **User Access Control**: Only specified users can use the bot
- **Rate Limiting**: Prevents spam (10 requests per minute per user)
- **Input Validation**: Validates all incoming messages
- **Error Handling**: Graceful error handling for API failures

## 🛠️ Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Axios** - HTTP client for API requests
- **Telegram Bot API** - Bot interface
- **Deepseek AI** - AI language model

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

If you encounter any issues:

1. Check the logs in your deployment platform
2. Verify environment variables are set correctly
3. Ensure your Deepseek account has sufficient credits
4. Check that your user ID is in ALLOWED_USER_IDS

## 🎉 Bot Username

Find the bot at: [@travelrobot_bot](https://t.me/travelrobot_bot)
```

---

## 📋 **Upload Instructions:**

1. **Create GitHub Repository:**
   - Go to GitHub.com → New Repository
   - Name: `telegram-travel-bot`
   - Make it public
   - Initialize with README (optional)

2. **Add Files:**
   - Copy each file content above
   - Create new files in GitHub with exact names
   - Paste the corresponding content
   - Commit each file

3. **Ready for Deployment:**
   - Connect to Railway/Heroku
   - Set environment variables
   - Deploy automatically

Your bot will be ready for automatic AI responses once deployed! 🚀
