import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';

/**
 * VoiceVisualizer component creates a canvas-based audio visualization 
 * that responds to audio playback in real-time
 */
const VoiceVisualizer = forwardRef(({ 
  audioElement, 
  isPlaying, 
  color = '#8B5CF6', // Purple-500 as default
  barCount = 60,
  barWidth = 4,
  barGap = 1,
  sensitivity = 2.5,
  smoothingTimeConstant = 0.85
}, ref) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const dataArrayRef = useRef(null);
  const sourceNodeRef = useRef(null);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    // Clear visualization
    clear: () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    },
    
    // Force redraw of visualization
    redraw: () => {
      if (analyserRef.current && dataArrayRef.current && canvasRef.current) {
        drawBars();
      }
    }
  }));

  // Initialize audio analyzer when audio element is available
  useEffect(() => {
    let audioContext;
    let analyser;
    let source;
    
    const setupAudioAnalyzer = () => {
      if (!audioElement) return;
      
      try {
        // Create audio context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;
        
        // Create analyzer node
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = smoothingTimeConstant;
        analyserRef.current = analyser;
        
        // Connect audio element to analyzer
        source = audioContext.createMediaElementSource(audioElement);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        sourceNodeRef.current = source;
        
        // Create data array for visualization
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        dataArrayRef.current = dataArray;
        
        // Initialize canvas dimensions
        if (canvasRef.current) {
          resizeCanvas();
        }
      } catch (err) {
        console.error('Error setting up audio analyzer:', err);
      }
    };
    
    // Setup analyzer when audio element becomes available
    if (audioElement && !analyserRef.current) {
      setupAudioAnalyzer();
    }
    
    // Clean up on unmount
    return () => {
      if (source) {
        source.disconnect();
      }
      
      if (analyser) {
        analyser.disconnect();
      }
      
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [audioElement, smoothingTimeConstant]);

  // Resize canvas when window resizes
  useEffect(() => {
    const resizeObserver = new ResizeObserver(resizeCanvas);
    
    if (canvasRef.current) {
      resizeObserver.observe(canvasRef.current.parentElement);
    }
    
    return () => {
      if (canvasRef.current && canvasRef.current.parentElement) {
        resizeObserver.unobserve(canvasRef.current.parentElement);
      }
    };
  }, []);

  // Handle animation loop for visualization
  useEffect(() => {
    if (isPlaying && analyserRef.current && dataArrayRef.current) {
      // Resume audio context if it's suspended (needed for some browsers)
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      
      const render = () => {
        drawBars();
        animationRef.current = requestAnimationFrame(render);
      };
      
      animationRef.current = requestAnimationFrame(render);
    } else {
      // Stop animation when not playing
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      
      // Draw static bars
      drawStaticBars();
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying]);

  // Resize canvas to match parent container
  const resizeCanvas = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const parent = canvas.parentElement;
    
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      
      // Redraw static bars after resize
      drawStaticBars();
    }
  };

  // Draw animated bars based on audio data
  const drawBars = () => {
    if (!canvasRef.current || !analyserRef.current || !dataArrayRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    
    // Get frequency data
    analyser.getByteFrequencyData(dataArray);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate bar properties
    const totalWidth = barCount * (barWidth + barGap);
    const startX = (canvas.width - totalWidth) / 2;
    
    // Draw each bar
    for (let i = 0; i < barCount; i++) {
      // Get data for this bar (map to the frequency bins we have)
      const index = Math.floor(i * dataArray.length / barCount);
      let value = dataArray[index] * sensitivity;
      
      // Ensure minimum height for aesthetics
      const minHeight = 3;
      const maxHeight = canvas.height - 10;
      
      // Calculate bar height (with min height)
      const barHeight = Math.max(minHeight, Math.min(value, maxHeight));
      
      // Calculate x position
      const x = startX + i * (barWidth + barGap);
      
      // Calculate y position (center vertically)
      const y = (canvas.height - barHeight) / 2;
      
      // Draw bar with gradient
      const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
      gradient.addColorStop(0, `${color}99`); // Semi-transparent color at top
      gradient.addColorStop(1, color); // Solid color at bottom
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);
    }
  };

  // Draw static bars when audio is not playing
  const drawStaticBars = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate bar properties
    const totalWidth = barCount * (barWidth + barGap);
    const startX = (canvas.width - totalWidth) / 2;
    
    // Static heights using a sine wave pattern
    for (let i = 0; i < barCount; i++) {
      // Create a sine wave for aesthetic static bars
      const ratio = i / barCount;
      const rads = ratio * Math.PI * 2;
      const sinValue = (Math.sin(rads * 3) + 1) / 2; // Range 0-1
      
      // Calculate height (20-40% of canvas height)
      const minHeight = canvas.height * 0.1;
      const maxHeight = canvas.height * 0.3;
      const barHeight = minHeight + sinValue * (maxHeight - minHeight);
      
      // Calculate positions
      const x = startX + i * (barWidth + barGap);
      const y = (canvas.height - barHeight) / 2;
      
      // Draw bar with faded color
      ctx.fillStyle = `${color}55`; // Semi-transparent color
      ctx.fillRect(x, y, barWidth, barHeight);
    }
  };

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  );
});

VoiceVisualizer.displayName = 'VoiceVisualizer';

VoiceVisualizer.propTypes = {
  audioElement: PropTypes.instanceOf(Element),
  isPlaying: PropTypes.bool,
  color: PropTypes.string,
  barCount: PropTypes.number,
  barWidth: PropTypes.number,
  barGap: PropTypes.number,
  sensitivity: PropTypes.number,
  smoothingTimeConstant: PropTypes.number
};

export default VoiceVisualizer;
