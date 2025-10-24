import { useEffect, useRef, useState } from 'react';
import { WS_SERVER_URL } from '../config/contracts';
import './VideoStream.css';

function VideoStream({ onConnectionChange, isDemo }) {
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const [error, setError] = useState(null);
  const [fps, setFps] = useState(0);
  const lastFrameTimeRef = useRef(Date.now());
  const frameCountRef = useRef(0);
  
  // 안정적인 연결 상태 관리
  const [isStableConnected, setIsStableConnected] = useState(false);
  const connectionStartTimeRef = useRef(null);
  const stableConnectionTimeoutRef = useRef(null);
  
  // Demo mode state (no longer needed for virtual car)

  useEffect(() => {
    // WebSocket connection (works for both real and demo mode)
    const connectWebSocket = () => {
      try {
        console.log('Connecting to WebSocket:', WS_SERVER_URL);
        const ws = new WebSocket(WS_SERVER_URL);
        wsRef.current = ws;

        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
          console.log('✅ WebSocket connected');
          setError(null);
          // Identify as web user
          ws.send(JSON.stringify({ type: 'client', device: 'web-user' }));
          
          // 연결 시작 시간 기록
          connectionStartTimeRef.current = Date.now();
          
          // 10초 후에 안정적인 연결로 간주
          stableConnectionTimeoutRef.current = setTimeout(() => {
            setIsStableConnected(true);
            onConnectionChange(true);
          }, 10000);
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
                onConnectionChange(connected);
                
                if (!connected && !isDemo) {
                  clearCanvas();
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
          console.log('❌ WebSocket disconnected');
          
          // 연결이 끊어지면 즉시 연결 해제 상태로 변경
          setIsStableConnected(false);
          onConnectionChange(false);
          
          // 타이머 정리
          if (stableConnectionTimeoutRef.current) {
            clearTimeout(stableConnectionTimeoutRef.current);
            stableConnectionTimeoutRef.current = null;
          }
          
          if (!isDemo) {
            clearCanvas();
          }
          
          // Retry connection after 3 seconds
          setTimeout(() => {
            if (wsRef.current === ws) {
              connectWebSocket();
            }
          }, 3000);
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
  }, [onConnectionChange, isDemo]);

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

  return (
    <div className="video-stream">
      <canvas 
        ref={canvasRef} 
        className="video-canvas"
        width={320}
        height={240}
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
    </div>
  );
}

export default VideoStream;
