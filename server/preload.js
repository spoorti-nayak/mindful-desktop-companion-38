
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  send: (channel, data) => {
    // List of allowed channels to send data to main process
    const validSendChannels = [
      'show-tray', 
      'hide-tray', 
      'set-tray-tooltip', 
      'set-tray-icon',
      'show-native-notification',
      'toggle-focus-mode',
      'save-timer-settings',
      'get-active-window',
      'notification-dismissed' // Added channel to track dismissed notifications
    ];
    
    if (validSendChannels.includes(channel)) {
      console.log(`Sending IPC message: ${channel}`, data);
      ipcRenderer.send(channel, data);
    } else {
      console.warn(`Attempted to send to unauthorized channel: ${channel}`);
    }
  },
  receive: (channel, func) => {
    // List of allowed channels to receive data from main process
    const validReceiveChannels = [
      'active-window-changed', 
      'blink-detected',
      'eye-care-reminder',
      'focus-mode-changed',
      'timer-settings-saved',
      'notification-dismissed'
    ];
    
    if (validReceiveChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender` 
      const subscription = (event, ...args) => func(...args);
      ipcRenderer.on(channel, subscription);
      
      // Return a function to remove the listener to avoid memory leaks
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    } else {
      console.warn(`Attempted to receive from unauthorized channel: ${channel}`);
    }
  }
});

// Listen for active-window-changed from main and dispatch a custom event for the renderer
ipcRenderer.on('active-window-changed', (event, windowInfo) => {
  // Extract the title from the window info or use the whole object
  const windowTitle = windowInfo?.title || (typeof windowInfo === 'string' ? windowInfo : '');
  
  // Dispatch a custom event that our React components can listen to
  window.dispatchEvent(new CustomEvent('active-window-changed', { 
    detail: windowTitle 
  }));
  
  console.log('Dispatched active-window-changed event with title:', windowTitle);
});

// Listen for notification-dismissed from main and dispatch a custom event for the renderer
ipcRenderer.on('notification-dismissed', (event, notificationId) => {
  // Dispatch a custom event that our React components can listen to
  window.dispatchEvent(new CustomEvent('notification-dismissed', { 
    detail: notificationId 
  }));
  
  console.log('Dispatched notification-dismissed event with ID:', notificationId);
});

console.log('Preload script loaded successfully');
