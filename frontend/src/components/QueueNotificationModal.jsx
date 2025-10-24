import { useState, useEffect } from 'react';
import './QueueNotificationModal.css';

export default function QueueNotificationModal({ 
  open, 
  onClose, 
  notification,
  onAccept,
  onDecline 
}) {
  const [timeLeft, setTimeLeft] = useState(notification?.timeLimit || 5);
  const [isAccepted, setIsAccepted] = useState(false);

  useEffect(() => {
    if (!open || !notification) return;

    setTimeLeft(notification.timeLimit);
    setIsAccepted(false);

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!isAccepted) {
            onDecline?.();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, notification, isAccepted, onDecline]);

  const handleAccept = () => {
    setIsAccepted(true);
    onAccept?.();
  };

  const handleDecline = () => {
    onDecline?.();
  };

  if (!open || !notification) return null;

  return (
    <div className="queue-notification-overlay">
      <div className="queue-notification-modal">
        <div className="notification-header">
          <div className="notification-icon">🔔</div>
          <h2>차량 사용 차례입니다!</h2>
        </div>
        
        <div className="notification-content">
          <div className="user-info">
            <h3>{notification.userName}님</h3>
            <p>대기하신 차량이 사용 가능해졌습니다.</p>
          </div>
          
          <div className="vehicle-info">
            <div className="vehicle-name">
              🚗 {notification.vehicleName}
            </div>
            <div className="vehicle-status available">
              🟢 사용 가능
            </div>
          </div>
          
          <div className="time-limit">
            <div className="timer">
              <span className="timer-icon">⏰</span>
              <span className={`timer-text ${timeLeft <= 30 ? 'urgent' : ''}`}>
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <p className="time-message">
              {timeLeft <= 30 ? '곧 차례가 넘어갑니다!' : '3분 내에 접속해주세요.'}
            </p>
          </div>
        </div>
        
        <div className="notification-actions">
          <button 
            className="action-btn decline-btn"
            onClick={handleDecline}
          >
            나중에 하기
          </button>
          <button 
            className="action-btn accept-btn"
            onClick={handleAccept}
          >
            지금 사용하기
          </button>
        </div>
      </div>
    </div>
  );
}
