import { useEffect, useRef, useState } from 'react';
import { WS_SERVER_URL } from '../config/contracts';
import './Controller.css';

function Controller({ rcCarConnected, isDemo }) {
  const wsRef = useRef(null);
  const [activeCommand, setActiveCommand] = useState(null);
  const pressedKeys = useRef(new Set());

  useEffect(() => {
    // WebSocket 연결
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(WS_SERVER_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('Controller WebSocket connected');
        };

        ws.onerror = (error) => {
          console.error('Controller WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('Controller WebSocket disconnected');
          // 재연결
          setTimeout(() => {
            if (wsRef.current === ws) {
              connectWebSocket();
            }
          }, 3000);
        };
      } catch (err) {
        console.error('Controller WebSocket connection error:', err);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  // Keyboard events
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!rcCarConnected && !isDemo) return;
      
      // Prevent duplicate
      if (pressedKeys.current.has(e.key)) return;
      pressedKeys.current.add(e.key);

      let command = null;
      
      switch(e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          command = 'forward';
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          command = 'backward';
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          command = 'left';
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          command = 'right';
          break;
        default:
          return;
      }

      if (command) {
        e.preventDefault();
        sendCommand(command);
      }
    };

    const handleKeyUp = (e) => {
      pressedKeys.current.delete(e.key);
      
      const controlKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'];
      if (controlKeys.includes(e.key)) {
        e.preventDefault();
        sendCommand('stop');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [rcCarConnected, isDemo]);

  const sendCommand = (command) => {
    console.log('Sending command:', command);
    
    // Demo mode: Send command via custom event
    if (isDemo) {
      window.dispatchEvent(new CustomEvent('demoCommand', { 
        detail: { command } 
      }));
      setActiveCommand(command);
      
      // Visual feedback
      if (command === 'stop') {
        setTimeout(() => setActiveCommand(null), 100);
      } else {
        setTimeout(() => setActiveCommand(null), 300);
      }
      return;
    }

    // Real mode: Send via WebSocket
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected');
      return;
    }
    
    const message = JSON.stringify({
      type: 'control',
      command: command
    });

    wsRef.current.send(message);
    setActiveCommand(command);

    // Visual feedback
    if (command === 'stop') {
      setTimeout(() => setActiveCommand(null), 100);
    } else {
      setTimeout(() => setActiveCommand(null), 300);
    }
  };

  const handleButtonPress = (command) => {
    if (!rcCarConnected && !isDemo) return;
    sendCommand(command);
  };

  const handleButtonRelease = () => {
    if (!rcCarConnected && !isDemo) return;
    sendCommand('stop');
  };

  return (
    <div className="controller">
      <div className="controller-title">
        <h3>🎮 Controller</h3>
        <p className="controller-hint">Keyboard: W/A/S/D or Arrow keys</p>
      </div>

      <div className="d-pad">
        {/* Up */}
        <button
          className={`d-pad-btn d-pad-up ${activeCommand === 'forward' ? 'active' : ''} ${!rcCarConnected ? 'disabled' : ''}`}
          onMouseDown={() => handleButtonPress('forward')}
          onMouseUp={handleButtonRelease}
          onMouseLeave={handleButtonRelease}
          onTouchStart={() => handleButtonPress('forward')}
          onTouchEnd={handleButtonRelease}
          disabled={!rcCarConnected}
        >
          <span className="arrow">▲</span>
          <span className="label">Forward</span>
        </button>

        {/* Middle row */}
        <div className="d-pad-middle">
          {/* Left */}
          <button
            className={`d-pad-btn d-pad-left ${activeCommand === 'left' ? 'active' : ''} ${!rcCarConnected ? 'disabled' : ''}`}
            onMouseDown={() => handleButtonPress('left')}
            onMouseUp={handleButtonRelease}
            onMouseLeave={handleButtonRelease}
            onTouchStart={() => handleButtonPress('left')}
            onTouchEnd={handleButtonRelease}
            disabled={!rcCarConnected}
          >
            <span className="arrow">◄</span>
            <span className="label">Left</span>
          </button>

          {/* Stop */}
          <button
            className={`d-pad-btn d-pad-center ${!rcCarConnected ? 'disabled' : ''}`}
            onClick={() => handleButtonPress('stop')}
            disabled={!rcCarConnected}
          >
            <span className="stop-icon">⬛</span>
          </button>

          {/* Right */}
          <button
            className={`d-pad-btn d-pad-right ${activeCommand === 'right' ? 'active' : ''} ${!rcCarConnected ? 'disabled' : ''}`}
            onMouseDown={() => handleButtonPress('right')}
            onMouseUp={handleButtonRelease}
            onMouseLeave={handleButtonRelease}
            onTouchStart={() => handleButtonPress('right')}
            onTouchEnd={handleButtonRelease}
            disabled={!rcCarConnected}
          >
            <span className="arrow">►</span>
            <span className="label">Right</span>
          </button>
        </div>

        {/* Down */}
        <button
          className={`d-pad-btn d-pad-down ${activeCommand === 'backward' ? 'active' : ''} ${!rcCarConnected ? 'disabled' : ''}`}
          onMouseDown={() => handleButtonPress('backward')}
          onMouseUp={handleButtonRelease}
          onMouseLeave={handleButtonRelease}
          onTouchStart={() => handleButtonPress('backward')}
          onTouchEnd={handleButtonRelease}
          disabled={!rcCarConnected}
        >
          <span className="arrow">▼</span>
          <span className="label">Backward</span>
        </button>
      </div>

      {!rcCarConnected && !isDemo && (
        <div className="controller-notice">
          ⚠️ RC car not connected
        </div>
      )}

      {isDemo && (
        <div className="demo-notice">
          ℹ️ Demo Mode: Control virtual RC car on screen
        </div>
      )}
    </div>
  );
}

export default Controller;

