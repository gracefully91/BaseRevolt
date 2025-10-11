import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import VideoStream from '../components/VideoStream';
import Controller from '../components/Controller';
import './Play.css';

function Play() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isConnected } = useAccount();
  
  const isDemo = searchParams.get('demo') === 'true';
  
  // 타이머 (10분 = 600초)
  const [timeRemaining, setTimeRemaining] = useState(600);
  const [isActive, setIsActive] = useState(false);
  
  // RC카 연결 상태
  const [rcCarConnected, setRcCarConnected] = useState(false);
  
  useEffect(() => {
    // If not demo and wallet not connected, redirect to home
    if (!isDemo && !isConnected) {
      navigate('/');
      return;
    }
    
    // Start timer
    setIsActive(true);
  }, [isDemo, isConnected, navigate]);
  
  // Timer logic
  useEffect(() => {
    let interval = null;
    
    if (isActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setIsActive(false);
            alert('⏰ Play time has ended!');
            navigate('/');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeRemaining, navigate]);
  
  // 시간 포맷팅 (MM:SS)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleBackHome = () => {
    if (confirm('End play session and return to home?')) {
      navigate('/');
    }
  };
  
  return (
    <div className="play-container">
      {/* Header */}
      <div className="play-header">
        <button className="back-button" onClick={handleBackHome}>
          ← Back to Home
        </button>
        
        <div className="status-bar">
          <div className={`rc-status ${rcCarConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            {rcCarConnected ? 'RC Car Connected' : 'Waiting for RC Car'}
          </div>
          
          <div className="timer">
            <span className="timer-icon">⏱️</span>
            <span className="timer-text">{formatTime(timeRemaining)}</span>
          </div>
          
          {isDemo && (
            <div className="demo-badge">
              🎮 Demo Mode
            </div>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="play-content">
        {/* Video Stream */}
        <div className="video-section">
          <VideoStream 
            onConnectionChange={setRcCarConnected}
            isDemo={isDemo}
          />
        </div>
        
        {/* Controller */}
        <div className="controller-section">
          <Controller 
            rcCarConnected={rcCarConnected}
            isDemo={isDemo}
          />
        </div>
      </div>
      
      {/* Connection Notice */}
      {!rcCarConnected && (
        <div className="connection-notice">
          <p>🔌 Please wait for RC car to connect...</p>
          <p className="notice-sub">Make sure the hardware is powered on and connected to WiFi</p>
        </div>
      )}
    </div>
  );
}

export default Play;

