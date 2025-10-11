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

  useEffect(() => {
    // WebSocket 연결
    const connectWebSocket = () => {
      try {
        console.log('Connecting to WebSocket:', WS_SERVER_URL);
        const ws = new WebSocket(WS_SERVER_URL);
        wsRef.current = ws;

        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
          console.log('✅ WebSocket connected');
          setError(null);
          // 웹 사용자로 식별
          ws.send(JSON.stringify({ type: 'client', device: 'web-user' }));
        };

        ws.onmessage = (event) => {
          if (event.data instanceof ArrayBuffer) {
            // 바이너리 데이터 = JPEG 프레임
            displayFrame(event.data);
            updateFPS();
          } else {
            // 텍스트 데이터 = 상태 메시지
            try {
              const data = JSON.parse(event.data);
              
              if (data.type === 'rc-car-status') {
                const connected = data.status === 'connected';
                onConnectionChange(connected);
                
                if (!connected) {
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
          setError('WebSocket 연결 오류');
        };

        ws.onclose = () => {
          console.log('❌ WebSocket disconnected');
          onConnectionChange(false);
          clearCanvas();
          
          // 3초 후 재연결 시도
          setTimeout(() => {
            if (wsRef.current === ws) {
              connectWebSocket();
            }
          }, 3000);
        };
      } catch (err) {
        console.error('WebSocket connection error:', err);
        setError('서버 연결 실패');
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [onConnectionChange]);

  const displayFrame = (arrayBuffer) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      // 캔버스 크기를 이미지 비율에 맞춤
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
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
    
    // "연결 대기중" 텍스트
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RC카 연결 대기중...', canvas.width / 2, canvas.height / 2);
  };

  const updateFPS = () => {
    frameCountRef.current++;
    
    const now = Date.now();
    const elapsed = now - lastFrameTimeRef.current;
    
    // 1초마다 FPS 업데이트
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
          {fps > 0 ? `${fps} FPS` : 'No signal'}
        </span>
        {isDemo && (
          <span className="demo-label">DEMO</span>
        )}
      </div>
    </div>
  );
}

export default VideoStream;

