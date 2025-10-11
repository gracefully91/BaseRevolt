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
  
  // Demo mode: Virtual RC car state
  const [carPosition, setCarPosition] = useState({ x: 160, y: 120 }); // Center
  const [carRotation, setCarRotation] = useState(0); // Degrees
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (isDemo) {
      // Demo mode: Auto-connect and draw virtual car
      onConnectionChange(true);
      drawDemoView();
      return;
    }

    // Real mode: WebSocket connection
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
          setError('WebSocket connection error');
        };

        ws.onclose = () => {
          console.log('❌ WebSocket disconnected');
          onConnectionChange(false);
          clearCanvas();
          
          // Retry connection after 3 seconds
          setTimeout(() => {
            if (wsRef.current === ws) {
              connectWebSocket();
            }
          }, 3000);
        };
      } catch (err) {
        console.error('WebSocket connection error:', err);
        setError('Server connection failed');
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [onConnectionChange, isDemo]);

  // Demo mode: Draw virtual RC car view
  const drawDemoView = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Background (grid pattern like a track)
    ctx.fillStyle = '#2a2a3e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(100, 100, 150, 0.3)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    
    // Draw virtual RC car
    ctx.save();
    ctx.translate(carPosition.x, carPosition.y);
    ctx.rotate((carRotation * Math.PI) / 180);
    
    // Car body (rectangle)
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(-20, -15, 40, 30);
    
    // Car front indicator (triangle)
    ctx.fillStyle = '#4dabf7';
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(30, -8);
    ctx.lineTo(30, 8);
    ctx.closePath();
    ctx.fill();
    
    // Wheels
    ctx.fillStyle = '#333';
    ctx.fillRect(-18, -18, 10, 6); // Front left
    ctx.fillRect(-18, 12, 10, 6);  // Front right
    ctx.fillRect(8, -18, 10, 6);   // Back left
    ctx.fillRect(8, 12, 10, 6);    // Back right
    
    ctx.restore();
    
    // Demo info text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '14px sans-serif';
    ctx.fillText('🎮 Demo Mode - Virtual RC Car', 10, 20);
    ctx.font = '12px sans-serif';
    ctx.fillText(`Position: (${Math.round(carPosition.x)}, ${Math.round(carPosition.y)})`, 10, 40);
    ctx.fillText(`Rotation: ${Math.round(carRotation)}°`, 10, 55);
  };

  // Demo mode: Handle movement commands
  useEffect(() => {
    if (!isDemo) return;

    const handleDemoCommand = (event) => {
      const data = event.detail;
      if (!data || !data.command) return;

      const speed = 3;
      const turnSpeed = 5;

      setCarPosition((prev) => {
        let newX = prev.x;
        let newY = prev.y;
        let newRotation = carRotation;

        switch (data.command) {
          case 'forward':
            newX += speed * Math.cos((carRotation * Math.PI) / 180);
            newY += speed * Math.sin((carRotation * Math.PI) / 180);
            break;
          case 'backward':
            newX -= speed * Math.cos((carRotation * Math.PI) / 180);
            newY -= speed * Math.sin((carRotation * Math.PI) / 180);
            break;
          case 'left':
            newRotation -= turnSpeed;
            break;
          case 'right':
            newRotation += turnSpeed;
            break;
          case 'stop':
            // No movement
            break;
        }

        // Keep car within bounds
        newX = Math.max(30, Math.min(canvasRef.current.width - 30, newX));
        newY = Math.max(30, Math.min(canvasRef.current.height - 30, newY));

        if (data.command === 'left' || data.command === 'right') {
          setCarRotation(newRotation % 360);
        }

        return { x: newX, y: newY };
      });
    };

    window.addEventListener('demoCommand', handleDemoCommand);

    return () => {
      window.removeEventListener('demoCommand', handleDemoCommand);
    };
  }, [isDemo, carRotation]);

  // Demo mode: Continuous redraw
  useEffect(() => {
    if (!isDemo) return;

    const animate = () => {
      drawDemoView();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isDemo, carPosition, carRotation]);

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
