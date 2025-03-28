import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Header from './components/Header';
import MangaSearch from './components/MangaSearch';
import MangaDetail from './components/MangaDetail';
import MangaReader from './components/MangaReader';
import FavoritesPage from './components/FavoritesPage';

function Home() {
  return (
    <div className="container mx-auto p-4">
      <div className="text-center py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-purple-600 mb-4">Welcome to MangaVox</h1>
        <p className="text-xl text-gray-600 mb-8">Experience manga like never before - with voice!</p>
        
        <div className="flex flex-col md:flex-row justify-center gap-4">
          <a 
            href="/search" 
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-opacity-50"
          >
            Browse Manga
          </a>
          <a 
            href="/about" 
            className="bg-white hover:bg-gray-100 text-purple-600 font-bold py-3 px-6 rounded-lg border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-opacity-50"
          >
            Learn More
          </a>
        </div>
      </div>
      
      <div className="mt-12 bg-purple-50 p-8 rounded-xl">
        <h2 className="text-2xl font-bold text-purple-600 mb-4">How it Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-purple-600 mb-4 text-4xl">1</div>
            <h3 className="text-xl font-semibold mb-2">Choose Your Manga</h3>
            <p className="text-gray-600">Browse our extensive collection and find your favorite manga or discover new ones.</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-purple-600 mb-4 text-4xl">2</div>
            <h3 className="text-xl font-semibold mb-2">AI Voice Assignment</h3>
            <p className="text-gray-600">Our AI automatically assigns unique voices to each character based on their personality.</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-purple-600 mb-4 text-4xl">3</div>
            <h3 className="text-xl font-semibold mb-2">Enjoy the Experience</h3>
            <p className="text-gray-600">Sit back and enjoy as the manga comes to life with natural-sounding character voices.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function About() {
  return (
    <div className="container mx-auto p-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-purple-600 mb-6">About MangaVox</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">Our Mission</h2>
          <p className="text-gray-700 mb-4">
            MangaVox is an AI-driven web application that reads manga and webtoons aloud, assigning different voices to different characters while displaying the corresponding panels. We aim to make manga more accessible and create an immersive experience similar to an interactive audiobook for visuals.
          </p>
          <p className="text-gray-700">
            Our platform uses advanced AI models to analyze manga panels, extract dialogue, and assign appropriate voices to each character based on their personality, creating a truly unique and engaging experience.
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">Technology</h2>
          <p className="text-gray-700 mb-4">
            MangaVox is built with cutting-edge technologies:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li><span className="font-semibold">Frontend:</span> React.js with Tailwind CSS for responsive design</li>
            <li><span className="font-semibold">Backend:</span> Express.js with Redis for caching</li>
            <li><span className="font-semibold">Voice Synthesis:</span> ElevenLabs API for realistic character voices</li>
            <li><span className="font-semibold">AI Processing:</span> OpenRouter's DeepSeek R1 API for manga analysis</li>
            <li><span className="font-semibold">Content Source:</span> MangaDex API for high-quality manga content</li>
          </ul>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Future Plans</h2>
          <p className="text-gray-700 mb-4">
            We're continuously working to improve MangaVox with new features:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Enhanced dialogue detection and character recognition</li>
            <li>Custom voice creation for specific characters</li>
            <li>Multi-language support for international manga</li>
            <li>User voice preferences and settings</li>
            <li>Mobile applications for on-the-go reading</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<MangaSearch />} />
            <Route path="/manga/:id" element={<MangaDetail />} />
            <Route path="/reader/:mangaId/:chapterId" element={<MangaReader />} />
            <Route path="/about" element={<About />} />
            <Route path="/favorites" element={<FavoritesPage />} />
          </Routes>
        </main>
        <footer className="bg-purple-800 text-white py-6">
          <div className="container mx-auto px-4 text-center">
            <p>&copy; {new Date().getFullYear()} MangaVox. All rights reserved.</p>
            <p className="text-sm mt-2">Manga content provided by MangaDex API.</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
