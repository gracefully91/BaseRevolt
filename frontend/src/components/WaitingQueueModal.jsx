import { useState, useEffect } from 'react';
import './WaitingQueueModal.css';

export default function WaitingQueueModal({ 
  open, 
  onClose, 
  vehicle, 
  userId = 'user-001',
  userName = 'User',
  onJoinQueue,
  onLeaveQueue 
}) {
  const [isInQueue, setIsInQueue] = useState(false);
  const [queuePosition, setQueuePosition] = useState(0);
  const [estimatedWaitTime, setEstimatedWaitTime] = useState(0);

  useEffect(() => {
    if (vehicle && vehicle.waitingQueue) {
      const userInQueue = vehicle.waitingQueue.find(user => user.id === userId);
      if (userInQueue) {
        setIsInQueue(true);
        setQueuePosition(userInQueue.queuePosition);
        setEstimatedWaitTime(userInQueue.estimatedWaitTime);
      } else {
        setIsInQueue(false);
        setQueuePosition(0);
        setEstimatedWaitTime(vehicle.estimatedWaitTime || 0);
      }
    }
  }, [vehicle, userId]);

  const handleJoinQueue = () => {
    if (onJoinQueue) {
      onJoinQueue(vehicle.id, userId, userName);
      setIsInQueue(true);
    }
  };

  const handleLeaveQueue = () => {
    if (onLeaveQueue) {
      onLeaveQueue(vehicle.id, userId);
      setIsInQueue(false);
    }
  };

  if (!open || !vehicle) return null;

  return (
    <div className="waiting-queue-overlay">
      <div className="waiting-queue-modal">
        <div className="waiting-queue-header">
          <h2>🚗 {vehicle.name}</h2>
          <p>Vehicle Queue Status</p>
        </div>
        
        <div className="waiting-queue-content">
          {/* 사용자 액션 - 맨 위로 이동 */}
          <div className="user-action-section">
            {isInQueue ? (
              <div className="in-queue-status">
                <div className="queue-status-card">
                  <h3>✅ You're in the queue!</h3>
                  <p>Position: #{queuePosition}</p>
                  <p>Estimated wait: ~{estimatedWaitTime} minutes</p>
                </div>
                <button 
                  className="action-btn leave-btn"
                  onClick={handleLeaveQueue}
                >
                  Leave Queue
                </button>
              </div>
            ) : (
              <div className="join-queue-section">
                <div className="join-info">
                  <h3>Join the queue?</h3>
                  <p>You'll be notified when it's your turn to use the vehicle.</p>
                </div>
                <button 
                  className="action-btn join-btn"
                  onClick={handleJoinQueue}
                >
                  Join Queue
                </button>
              </div>
            )}
          </div>

          {/* 대기열 정보 */}
          <div className="queue-info-section">
            <h3>📋 Queue Information</h3>
            
            {vehicle.waitingQueue && vehicle.waitingQueue.length > 0 ? (
              <div className="queue-details">
                <div className="queue-stats">
                  <div className="stat-item">
                    <span className="stat-label">Total Waiting:</span>
                    <span className="stat-value">{vehicle.waitingQueue.length} people</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Estimated Wait:</span>
                    <span className="stat-value">~{vehicle.estimatedWaitTime} minutes</span>
                  </div>
                </div>

                {/* 대기열 목록 */}
                <div className="queue-list">
                  <h4>Queue Order:</h4>
                  {vehicle.waitingQueue.map((user, index) => (
                    <div 
                      key={user.id} 
                      className={`queue-item ${user.id === userId ? 'current-user' : ''}`}
                    >
                      <span className="queue-position">#{index + 1}</span>
                      <span className="user-name">{user.name}</span>
                      <span className="wait-time">~{user.estimatedWaitTime}min</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="no-queue">
                <p>🎉 No one is waiting! You can join immediately.</p>
              </div>
            )}
          </div>

          {/* 차량 상태 - 작게 만들어 맨 아래로 */}
          <div className="vehicle-status-section">
            <div className="status-card-small">
              <div className="status-icon-small">
                {vehicle.status === 'available' ? '🟢' : 
                 vehicle.status === 'busy' ? '🔴' : '🟡'}
              </div>
              <div className="status-info-small">
                <span className="status-text">
                  {vehicle.status === 'available' ? 'Available' : 
                   vehicle.status === 'busy' ? 'In Use' : 'Maintenance'}
                </span>
                {vehicle.currentUser && (
                  <span className="current-user">• {vehicle.currentUser.name}</span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="waiting-queue-actions">
          <button 
            className="queue-btn queue-btn-cancel"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
