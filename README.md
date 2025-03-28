# MangaVox
MangaVox is an AI-driven web application that **reads manga and webtoons aloud**, assigning different voices to different characters while displaying the corresponding panels. Experience your favorite stories in a whole new way—like an interactive audiobook for visuals!

## ✨ Features:
- 🎙 **AI Voice Narration** – Distinct voices for each character.
- 📜 **Automatic Panel Tracking** – Syncs narration with the displayed comic panel.
- 🔄 **Multi-Language Support** (Planned) – Read manga in different languages.
- 🎭 **Customizable Voices** (Planned) – Adjust voice tone and style.
- 📚 **Support for Various Formats** – Works with manga, webtoons, and traditional comics.

## 🛠️ Tech Stack
- **Frontend**: React.js with Tailwind CSS for responsive design
- **Backend**: Express.js with Redis for caching
- **Voice Synthesis**: ElevenLabs API
- **LLM Processing**: OpenRouter's DeepSeek R1 API
- **Comic Source**: MangaDex API

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- npm or yarn
- Redis server
- API keys for:
  - ElevenLabs
  - OpenRouter
  - MangaDex (if required)

### Installation
1. Clone the repository
```bash
git clone https://github.com/tahmid-chowdhury/MangaVox.git
cd mangavox
```

2. Install dependencies
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

3. Create a `.env` file in the root directory with your API keys:
```
ELEVENLABS_API_KEY=your_eleven_labs_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
MANGADEX_API_KEY=your_mangadex_api_key
REDIS_URL=redis://localhost:6379
```

4. Start the development servers
```bash
# Start backend server
npm run server

# In a separate terminal, start frontend
npm run client
```

## 🔧 Architecture
- **Comic Parsing**: Extracts text and panel information from comics
- **Character Voice Mapping**: AI assigns unique voices to characters
- **Voice Synthesis**: Converts dialogue to speech with appropriate voices
- **Panel Synchronization**: Displays panels in sync with narration

🚀 **Status**: Early development.
