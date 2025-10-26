import { useEffect, useRef, useState } from 'react';
import { WS_SERVER_URL } from '../config/contracts';
import './VideoStream.css';

function VideoStream({ onConnectionChange, isDemo, onSendCommand, showControls = true }) {
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const [error, setError] = useState(null);
  const [fps, setFps] = useState(0);
  const lastFrameTimeRef = useRef(Date.now());
  const frameCountRef = useRef(0);
  
  // WebSocket 연결 상태 관리 (서버 연결)
  const [wsConnected, setWsConnected] = useState(false);
  
  // RC카 연결 상태 관리 (실제 하드웨어 연결)
  const [rcCarConnected, setRcCarConnected] = useState(false);
  const [isStableConnected, setIsStableConnected] = useState(false);
  
  const connectionStartTimeRef = useRef(null);
  const stableConnectionTimeoutRef = useRef(null);
  const lastCommandTimeRef = useRef(null);
  
  // onConnectionChange를 ref로 저장하여 stale closure 방지
  const onConnectionChangeRef = useRef(onConnectionChange);
  useEffect(() => {
    onConnectionChangeRef.current = onConnectionChange;
  }, [onConnectionChange]);

  // WASD 키보드 이벤트 핸들러
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.warn('❌ Cannot send command: WebSocket not connected');
        return;
      }
      
      let command = null;
      
      switch(event.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          command = 'forward';
          break;
        case 's':
        case 'arrowdown':
          command = 'backward';
          break;
        case 'a':
        case 'arrowleft':
          command = 'left';
          break;
        case 'd':
        case 'arrowright':
          command = 'right';
          break;
        case ' ':
          command = 'stop';
          break;
        default:
          return;
      }

      if (command) {
        console.log('🎮 Keyboard command:', command);
        const message = JSON.stringify({ 
          type: 'control',
          command: command
        });
        wsRef.current.send(message);
        
        // 명령 전송 시 연결 상태 즉시 확인 (하드웨어가 움직이면 연결됨)
        lastCommandTimeRef.current = Date.now();
        if (rcCarConnected && !isStableConnected) {
          console.log('✅ Command sent - considering connection stable');
          setIsStableConnected(true);
          onConnectionChangeRef.current?.(true);
          
          // 기존 타이머 정리
          if (stableConnectionTimeoutRef.current) {
            clearTimeout(stableConnectionTimeoutRef.current);
            stableConnectionTimeoutRef.current = null;
          }
        }
      }
    };

    const handleKeyUp = (event) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        return;
      }
      
      const key = event.key.toLowerCase();
      const isControlKey = ['w', 's', 'a', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key);
      
      if (isControlKey) {
        console.log('🎮 Keyboard release - sending stop');
        const message = JSON.stringify({ 
          type: 'control',
          command: 'stop'
        });
        wsRef.current.send(message);
      }
    };

    // 이벤트 리스너 등록
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // 클린업
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []); // sendCommand 의존성 제거

  useEffect(() => {
    // WebSocket connection (works for both real and demo mode)
    const connectWebSocket = () => {
      try {
        console.log('Connecting to WebSocket:', WS_SERVER_URL);
        const ws = new WebSocket(WS_SERVER_URL);
        wsRef.current = ws;

        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
          console.log('✅ WebSocket connected to server');
          setError(null);
          setWsConnected(true);
          
          // Identify as web user
          ws.send(JSON.stringify({ type: 'client', device: 'web-user' }));
          
          // WebSocket은 연결되었지만, RC카 연결 상태는 서버로부터 메시지를 받아야 함
          console.log('⏳ Waiting for RC car connection status from server...');
        };

        ws.onmessage = (event) => {
          if (event.data instanceof ArrayBuffer) {
            // Binary data = JPEG frame
            displayFrame(event.data);
            updateFPS();
          } else {
            // Text data = status message
            try {
              const data = JSON.parse(event.data);
              
              if (data.type === 'rc-car-status') {
                const connected = data.status === 'connected';
                console.log(`🚗 RC Car status: ${connected ? 'connected' : 'disconnected'}`);
                
                setRcCarConnected(connected);
                
                if (!connected) {
                  // RC카 연결 해제는 즉시 반영
                  setIsStableConnected(false);
                  onConnectionChangeRef.current?.(false);
                  
                  // 타이머 정리
                  if (stableConnectionTimeoutRef.current) {
                    clearTimeout(stableConnectionTimeoutRef.current);
                    stableConnectionTimeoutRef.current = null;
                  }
                  
                  if (!isDemo) {
                    clearCanvas();
                  }
                } else {
                  // RC카 연결됨 - 3초 대기 후 안정적인 연결로 간주 (더 관대하게)
                  console.log('⏳ RC Car connected, waiting 3 seconds for stable connection...');
                  connectionStartTimeRef.current = Date.now();
                  
                  stableConnectionTimeoutRef.current = setTimeout(() => {
                    console.log('✅ RC Car connection is stable');
                    setIsStableConnected(true);
                    onConnectionChangeRef.current?.(true);
                  }, 3000);
                }
              }
            } catch (e) {
              console.error('Failed to parse message:', e);
            }
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          if (!isDemo) {
            setError('WebSocket connection error');
          }
        };

        ws.onclose = () => {
          console.log('❌ WebSocket disconnected from server');
          
          // WebSocket 연결이 끊어지면 모든 상태 초기화
          setWsConnected(false);
          setRcCarConnected(false);
          setIsStableConnected(false);
          onConnectionChangeRef.current?.(false);
          
          // 타이머 정리
          if (stableConnectionTimeoutRef.current) {
            clearTimeout(stableConnectionTimeoutRef.current);
            stableConnectionTimeoutRef.current = null;
          }
          
          if (!isDemo) {
            clearCanvas();
          }
          
          // Retry connection after 5 seconds (increased to reduce spam)
          setTimeout(() => {
            if (wsRef.current === ws) {
              console.log('🔄 Reconnecting to WebSocket server...');
              connectWebSocket();
            }
          }, 5000);
        };
      } catch (err) {
        console.error('WebSocket connection error:', err);
        if (!isDemo) {
          setError('Server connection failed');
        }
      }
    };

    connectWebSocket();

    return () => {
      console.log('🧹 Cleaning up VideoStream WebSocket');
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      // 타이머 정리
      if (stableConnectionTimeoutRef.current) {
        clearTimeout(stableConnectionTimeoutRef.current);
        stableConnectionTimeoutRef.current = null;
      }
    };
  }, [isDemo]); // onConnectionChange를 dependency에서 제거 - ref를 통해 항상 최신 버전 사용

  const displayFrame = (arrayBuffer) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      // Fit canvas size to image ratio
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Flip image vertically (mirror effect for RC car view)
      ctx.save();
      ctx.scale(-1, 1); // Flip horizontally (mirror)
      ctx.drawImage(img, -canvas.width, 0); // Draw flipped
      ctx.restore();
      
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // "Waiting for connection" text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Waiting for RC car...', canvas.width / 2, canvas.height / 2);
  };

  const updateFPS = () => {
    frameCountRef.current++;
    
    const now = Date.now();
    const elapsed = now - lastFrameTimeRef.current;
    
    // Update FPS every second
    if (elapsed >= 1000) {
      const currentFps = Math.round((frameCountRef.current * 1000) / elapsed);
      setFps(currentFps);
      frameCountRef.current = 0;
      lastFrameTimeRef.current = now;
    }
  };

  // 제어 명령 전송 함수
  const sendCommand = (command) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('❌ Cannot send command: WebSocket not connected');
      return false;
    }
    
    console.log(`🎮 Sending command: ${command}`);
    const message = JSON.stringify({
      type: 'control',
      command: command
    });
    
    wsRef.current.send(message);
    
    // 명령 전송 시 연결 상태 즉시 확인 (하드웨어가 움직이면 연결됨)
    lastCommandTimeRef.current = Date.now();
    if (rcCarConnected && !isStableConnected) {
      console.log('✅ Command sent - considering connection stable');
      setIsStableConnected(true);
      onConnectionChangeRef.current?.(true);
      
      // 기존 타이머 정리
      if (stableConnectionTimeoutRef.current) {
        clearTimeout(stableConnectionTimeoutRef.current);
        stableConnectionTimeoutRef.current = null;
      }
    }
    
    return true;
  };

  // 제어 명령 전송 함수를 부모 컴포넌트에 전달
  useEffect(() => {
    if (onSendCommand) {
      onSendCommand(sendCommand);
    }
  }, [onSendCommand]);

  return (
    <div className="video-stream">
      <canvas 
        ref={canvasRef} 
        className="video-canvas"
        width={1280}
        height={720}
      />
      
      {error && (
        <div className="video-error">
          ⚠️ {error}
        </div>
      )}
      
      <div className="video-info">
        <span className="fps-counter">
          {isDemo ? 'DEMO' : (fps > 0 ? `${fps} FPS` : 'No signal')}
        </span>
        {isDemo && (
          <span className="demo-label">Virtual RC Car</span>
        )}
      </div>
      
      {/* Touch Control Buttons - Only show in landscape mode */}
      {showControls && (
        <div className="overlay-controls">
          {/* Left Side - Forward/Backward Controls */}
          <div className="overlay-controls-left">
            <div className="control-group-vertical">
              <button 
                className="control-btn forward-btn"
                onMouseDown={() => sendCommand('forward')}
                onMouseUp={() => sendCommand('stop')}
                onMouseLeave={() => sendCommand('stop')}
                onTouchStart={() => sendCommand('forward')}
                onTouchEnd={() => sendCommand('stop')}
              >
                <span className="arrow-up">▲</span>
              </button>
              <button 
                className="control-btn backward-btn"
                onMouseDown={() => sendCommand('backward')}
                onMouseUp={() => sendCommand('stop')}
                onMouseLeave={() => sendCommand('stop')}
                onTouchStart={() => sendCommand('backward')}
                onTouchEnd={() => sendCommand('stop')}
              >
                <span className="arrow-down">▼</span>
              </button>
            </div>
          </div>
          
          {/* Right Side - Left/Right Controls */}
          <div className="overlay-controls-right">
            <div className="control-group-horizontal">
              <button 
                className="control-btn left-btn"
                onMouseDown={() => sendCommand('left')}
                onMouseUp={() => sendCommand('stop')}
                onMouseLeave={() => sendCommand('stop')}
                onTouchStart={() => sendCommand('left')}
                onTouchEnd={() => sendCommand('stop')}
              >
                <span className="arrow-left">◀</span>
              </button>
              <button 
                className="control-btn right-btn"
                onMouseDown={() => sendCommand('right')}
                onMouseUp={() => sendCommand('stop')}
                onMouseLeave={() => sendCommand('stop')}
                onTouchStart={() => sendCommand('right')}
                onTouchEnd={() => sendCommand('stop')}
              >
                <span className="arrow-right">▶</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoStream;
