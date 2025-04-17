import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import VoiceVisualizer from './VoiceVisualizer';

/**
 * AudioControls component provides playback controls for the TTS audio
 * with visualizer, progress tracking, and speed control
 */
const AudioControls = ({
  audioUrl,
  characterName,
  text,
  voiceId,
  isPlaying,
  isLoading,
  onPlay,
  onPause,
  onStop,
  onAudioEnded,
  onVolumeChange,
  volume = 1,
  speed = 1
}) => {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isUserSeeking, setIsUserSeeking] = useState(false);
  const [userSeekPos, setUserSeekPos] = useState(0);
  
  const audioRef = useRef(null);
  const animationRef = useRef(null);
  const visualizerRef = useRef(null);

  // Play/pause audio based on isPlaying state
  useEffect(() => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.play().catch(err => {
        console.error('Failed to play audio:', err);
      });
      
      // Start the animation loop for progress tracking
      animationRef.current = requestAnimationFrame(updateProgress);
    } else {
      audioRef.current.pause();
      
      // Cancel the animation loop
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  // Update audio URL when it changes
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      console.log('AudioControls: Loading new audio URL');
      audioRef.current.src = audioUrl;
      audioRef.current.load();
      
      // Auto-play if it was playing before
      if (isPlaying) {
        console.log('AudioControls: Auto-playing new audio');
        audioRef.current.play().catch(err => {
          console.error('Failed to play new audio:', err);
        });
      }
      
      // For testing, add a fallback audio file if the audio URL fails to load
      audioRef.current.onerror = () => {
        console.warn('Audio URL failed to load, using fallback audio');
        // Set a fallback audio URL (example empty audio to prevent errors)
        audioRef.current.src = 'data:audio/mpeg;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
      };
      
      // Reset states
      setProgress(0);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [audioUrl, isPlaying]);

  // Update audio playback rate when speed changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

  // Update audio volume when volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Animation loop for updating progress
  const updateProgress = () => {
    if (!audioRef.current) return;
    
    if (!isUserSeeking) {
      const currentTime = audioRef.current.currentTime;
      const duration = audioRef.current.duration || 0;
      const progressValue = duration > 0 ? (currentTime / duration) * 100 : 0;
      
      setCurrentTime(currentTime);
      setDuration(duration);
      setProgress(progressValue);
    }
    
    // Continue the animation loop
    animationRef.current = requestAnimationFrame(updateProgress);
  };

  // Format time in MM:SS format
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Handle user seeking with the progress bar
  const handleSeek = (e) => {
    if (!audioRef.current) return;
    
    const seekPos = parseFloat(e.target.value);
    setIsUserSeeking(true);
    setUserSeekPos(seekPos);
  };

  // Apply the seek when user releases the slider
  const handleSeekEnd = () => {
    if (!audioRef.current) return;
    
    const seekTime = (userSeekPos / 100) * audioRef.current.duration;
    audioRef.current.currentTime = seekTime;
    setProgress(userSeekPos);
    setCurrentTime(seekTime);
    setIsUserSeeking(false);
  };

  // Handle audio ended event
  const handleAudioEnded = () => {
    if (onAudioEnded) {
      onAudioEnded();
    }
    
    setProgress(0);
    setCurrentTime(0);
  };

  // For handling volume change
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    if (onVolumeChange) {
      onVolumeChange(newVolume);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* Character and text info */}
      <div className="p-4 bg-purple-100 dark:bg-purple-900 border-b border-purple-200 dark:border-purple-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-purple-900 dark:text-purple-100">
              {characterName || 'Character'}
            </h3>
            <p className="text-sm text-purple-800 dark:text-purple-200 italic">
              "{text || 'No dialogue'}"
            </p>
          </div>
          
          {isLoading && (
            <div className="flex items-center">
              <div className="animate-spin h-5 w-5 border-2 border-purple-500 border-t-transparent rounded-full mr-2"></div>
              <span className="text-xs text-purple-700 dark:text-purple-300">Loading...</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Visualizer */}
      <div className="h-20 bg-gray-50 dark:bg-gray-900">
        <VoiceVisualizer 
          audioElement={audioRef.current}
          isPlaying={isPlaying} 
          color="#8B5CF6" // Purple-500
          ref={visualizerRef}
        />
      </div>
      
      {/* Playback progress */}
      <div className="px-4 pt-3">
        <input
          type="range"
          min="0"
          max="100"
          value={isUserSeeking ? userSeekPos : progress}
          onChange={handleSeek}
          onMouseUp={handleSeekEnd}
          onTouchEnd={handleSeekEnd}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
          disabled={isLoading || !audioUrl}
        />
        
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      
      {/* Controls */}
      <div className="px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          {/* Playback controls */}
          <button
            onClick={isPlaying ? onPause : onPlay}
            disabled={isLoading || !audioUrl}
            className={`flex items-center justify-center h-10 w-10 rounded-full ${
              isLoading || !audioUrl
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            } transition-colors`}
          >
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          
          <button
            onClick={onStop}
            disabled={isLoading || !audioUrl || !isPlaying}
            className={`flex items-center justify-center h-8 w-8 rounded-full ${
              isLoading || !audioUrl || !isPlaying
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-purple-600 dark:text-purple-400'
            } transition-colors`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        {/* Volume control */}
        <div className="flex items-center w-24">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
          </svg>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
            className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
        </div>
      </div>
      
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={handleAudioEnded}
        onError={() => console.error('Audio playback error')}
        className="hidden"
      />
    </div>
  );
};

AudioControls.propTypes = {
  audioUrl: PropTypes.string,
  characterName: PropTypes.string,
  text: PropTypes.string,
  voiceId: PropTypes.string,
  isPlaying: PropTypes.bool,
  isLoading: PropTypes.bool,
  onPlay: PropTypes.func.isRequired,
  onPause: PropTypes.func.isRequired,
  onStop: PropTypes.func.isRequired,
  onAudioEnded: PropTypes.func,
  onVolumeChange: PropTypes.func,
  volume: PropTypes.number,
  speed: PropTypes.number
};

export default AudioControls;
