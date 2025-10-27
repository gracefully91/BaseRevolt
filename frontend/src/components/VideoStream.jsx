import { useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { WS_SERVER_URL } from '../config/contracts';
import './VideoStream.css';

function VideoStream({ onConnectionChange, isDemo, onSendCommand, showControls = true, sessionId, setSessionId, sessionTier, walletId }) {
  const { address } = useAccount();
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const [error, setError] = useState(null);
  const [fps, setFps] = useState(0);
  const lastFrameTimeRef = useRef(Date.now());
  const frameCountRef = useRef(0);
  const heartbeatIntervalRef = useRef(null);
  
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
          command: command,
          sessionId: sessionId
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
          command: 'stop',
          sessionId: sessionId
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
  }, [sessionId]); // sessionId 의존성 추가
  
  // 하트비트 함수들
  const startHeartbeat = (sid) => {
    console.log(`💓 Starting heartbeat for session: ${sid}`);
    
    // 기존 하트비트 정리
    stopHeartbeat();
    
    // 3초마다 하트비트 전송
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'heartbeat',
          sessionId: sid
        }));
        console.log('💓 Heartbeat sent');
      }
    }, 3000);
  };
  
  const stopHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
      console.log('💔 Heartbeat stopped');
    }
  };

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
          
          // 세션 요청 - 상위 컴포넌트에서 전달받은 고정 wallet ID 사용
          const wallet = walletId || (isDemo 
            ? 'demo-user-' + Math.random().toString(36).substr(2, 9) 
            : (address || 'anonymous-' + Math.random().toString(36).substr(2, 9)));
          
          console.log(`📝 Requesting session: ${sessionTier}, wallet: ${wallet.substring(0, 20)}...`);
          
          ws.send(JSON.stringify({
            type: 'requestSession',
            carId: 'car01',
            wallet: wallet,
            tier: sessionTier
          }));
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
              
              // 세션 승인
              if (data.type === 'sessionGranted') {
                console.log(`✅ Session granted: ${data.sessionId}`);
                setSessionId(data.sessionId);
                
                // 대기열에서 자동 할당된 경우 알림
                if (data.fromQueue) {
                  alert(`🎉 It's your turn! Your session has started.`);
                }
                
                // 하트비트 시작
                startHeartbeat(data.sessionId);
              }
              // 세션 거부
              else if (data.type === 'sessionDenied') {
                console.log(`❌ Session denied: ${data.reason}`);
                
                // 대기열 옵션이 있는 경우
                if (data.canJoinQueue) {
                  const join = confirm(
                    `${data.message}\n\n` +
                    `Current queue: ${data.queueStatus?.queueLength || 0} people\n` +
                    `Would you like to join the waiting queue?`
                  );
                  
                  if (join) {
                    // 대기열 가입
                    const wallet = isDemo 
                      ? 'demo-user-' + Math.random().toString(36).substr(2, 9) 
                      : (address || 'anonymous-' + Math.random().toString(36).substr(2, 9));
                    
                    wsRef.current.send(JSON.stringify({
                      type: 'joinQueue',
                      carId: 'car01',
                      wallet: wallet,
                      tier: sessionTier
                    }));
                  } else {
                    window.location.href = '/';
                  }
                } else {
                  alert(data.message);
                  window.location.href = '/';
                }
              }
              // 대기열 가입 성공
              else if (data.type === 'queueJoined') {
                console.log(`✅ Joined queue at position ${data.position}`);
                alert(
                  `You've joined the queue!\n\n` +
                  `Position: #${data.position}\n` +
                  `Estimated wait: ~${data.estimatedWaitTime} minutes\n\n` +
                  `You'll be notified when it's your turn!`
                );
                // 대기열 페이지로 이동 (나중에 구현)
                window.location.href = '/';
              }
              // 대기열 업데이트
              else if (data.type === 'queueUpdate') {
                console.log(`📊 Queue updated:`, data.status);
                // 대기열 상태 업데이트 (UI에 표시)
              }
              // 선점 경고
              else if (data.type === 'preempt') {
                console.log(`⚠️ Preempt warning: ${data.message}`);
                alert(data.message);
              }
              // 세션 종료
              else if (data.type === 'sessionEnd') {
                console.log(`🔴 Session ended: ${data.reason}`);
                stopHeartbeat();
                alert(data.message);
                window.location.href = '/';
              }
              // RC카 상태
              else if (data.type === 'rc-car-status') {
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
          
          // 하트비트 정리
          stopHeartbeat();
          
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
      
      // 하트비트 정리
      stopHeartbeat();
      
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
