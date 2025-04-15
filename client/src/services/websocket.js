/**
 * WebSocket service for MangaVox
 */

// WebSocket connection state management
let socket = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 3000; // 3 seconds between reconnect attempts
let reconnectTimeout = null;

// Event callbacks
const eventListeners = {
  message: [],
  connect: [],
  disconnect: [],
  error: []
};

/**
 * Initialize WebSocket connection
 */
export const initWebSocket = () => {
  if (socket !== null) {
    // Close existing connection before creating a new one
    socket.close();
  }
  
  // Clear any pending reconnect attempts
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }

  try {
    // Create WebSocket connection - using explicit path that matches server configuration
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NODE_ENV === 'development' ? 'localhost:5000' : window.location.host;
    const wsUrl = `${protocol}//${host}/websocket`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('WebSocket connection established');
      reconnectAttempts = 0;
      triggerEvent('connect');
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        triggerEvent('message', data);
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };
    
    socket.onclose = (event) => {
      console.log('WebSocket connection closed', event.code, event.reason);
      triggerEvent('disconnect', { code: event.code, reason: event.reason });
      
      // Only attempt to reconnect if this wasn't a normal closure
      if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
        handleReconnect();
      }
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      triggerEvent('error', error);
    };
    
    return socket;
  } catch (error) {
    console.error('Failed to establish WebSocket connection:', error);
    return null;
  }
};

/**
 * Handle reconnection attempts with exponential backoff
 */
const handleReconnect = () => {
  reconnectAttempts++;
  const delay = reconnectDelay * Math.pow(1.5, reconnectAttempts - 1);
  
  console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts}) in ${delay}ms`);
  
  reconnectTimeout = setTimeout(() => {
    initWebSocket();
  }, delay);
};

/**
 * Send data through WebSocket connection
 * @param {Object} data - Data to send
 * @returns {boolean} - Whether the send was successful
 */
export const sendMessage = (data) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data));
    return true;
  } else {
    console.error('Cannot send message, WebSocket is not connected');
    return false;
  }
};

/**
 * Register event listener
 * @param {string} event - Event name ('message', 'connect', 'disconnect', 'error')
 * @param {Function} callback - Callback function
 */
export const on = (event, callback) => {
  if (eventListeners[event]) {
    eventListeners[event].push(callback);
  }
};

/**
 * Remove event listener
 * @param {string} event - Event name
 * @param {Function} callback - Callback function to remove
 */
export const off = (event, callback) => {
  if (eventListeners[event]) {
    eventListeners[event] = eventListeners[event].filter(cb => cb !== callback);
  }
};

/**
 * Trigger event callbacks
 * @param {string} event - Event name
 * @param {*} data - Data to pass to callbacks
 */
const triggerEvent = (event, data) => {
  if (eventListeners[event]) {
    eventListeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (err) {
        console.error(`Error in ${event} event handler:`, err);
      }
    });
  }
};

/**
 * Check if WebSocket is connected
 * @returns {boolean} - Whether WebSocket is connected
 */
export const isConnected = () => {
  return socket && socket.readyState === WebSocket.OPEN;
};

/**
 * Close WebSocket connection
 */
export const closeConnection = () => {
  if (socket) {
    socket.close(1000, 'User closed connection');
    socket = null;
  }
  
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }
};

export default {
  init: initWebSocket,
  send: sendMessage,
  on,
  off,
  isConnected,
  close: closeConnection
};