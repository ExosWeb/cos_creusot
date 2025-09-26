// Debug utilities with global flag control
(function() {
    'use strict';
    
    // Global debug flag - can be set from console or config
    window.DEBUG = false;
    
    // Environment detection
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isDev) {
        window.DEBUG = true; // Auto-enable debug in dev
    }
    
    // Debug wrapper functions
    window.dlog = function(...args) {
        if (window.DEBUG) {
            console.log('[DEBUG]', ...args);
        }
    };
    
    window.dwarn = function(...args) {
        if (window.DEBUG) {
            console.warn('[DEBUG]', ...args);
        }
    };
    
    window.derror = function(...args) {
        // Errors always show, but with DEBUG prefix in debug mode
        if (window.DEBUG) {
            console.error('[DEBUG]', ...args);
        } else {
            console.error(...args);
        }
    };
    
    // Utility to toggle debug from console
    window.toggleDebug = function() {
        window.DEBUG = !window.DEBUG;
        console.log(`🔧 Debug mode: ${window.DEBUG ? 'ON' : 'OFF'}`);
    };
    
    // Info about debug state
    if (window.DEBUG) {
        console.log('🔧 Debug mode enabled. Use toggleDebug() to disable.');
    }
    
})();