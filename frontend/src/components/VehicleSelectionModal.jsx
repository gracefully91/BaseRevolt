import { useState } from 'react';
import './VehicleSelectionModal.css';

export default function VehicleSelectionModal({ 
  open, 
  onClose, 
  onVehicleSelect,
  onShowQueue,
  vehicles = [],
  onRefresh
}) {
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleVehicleSelect = (vehicle) => {
    setSelectedVehicle(vehicle);
    onVehicleSelect(vehicle);
  };

  const handleCancel = () => {
    setSelectedVehicle(null);
    onClose();
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  if (!open) return null;

  return (
    <div className="vehicle-selection-overlay">
      <div className="vehicle-selection-modal">
        <div className="vehicle-selection-header">
          <h2>🚗 Select Vehicle</h2>
          <p>Choose your preferred vehicle for the session</p>
        </div>
        
        <div className="vehicle-list">
          {vehicles.map((vehicle) => (
            <div 
              key={vehicle.id}
              className={`vehicle-card ${selectedVehicle?.id === vehicle.id ? 'selected' : ''}`}
              onClick={() => handleVehicleSelect(vehicle)}
            >
              <img 
                src={vehicle.image || '/static-gamgyul.png'} 
                alt={vehicle.name}
                className="vehicle-image"
                onError={(e) => { e.target.src = '/static-gamgyul.png'; }}
              />
              <div className="vehicle-content">
                <div className="vehicle-header">
                  <h4 className="vehicle-name">{vehicle.name}</h4>
                  <span className={`status-indicator ${vehicle.status}`}>
                    {vehicle.status === 'available' ? (
                      <>
                        <span className="blinking-dot">🟢</span> Available
                      </>
                    ) : vehicle.status === 'busy' ? '🔴 In Use' : 
                     '🟡 Maintenance'}
                  </span>
                </div>
                <p className="vehicle-description">{vehicle.description}</p>
                {vehicle.waitingQueue && vehicle.waitingQueue.length > 0 && (
                  <div className="vehicle-status-info">
                    <div className="status-line">
                      <span className="waiting-info-inline">
                        <span className="waiting-count">
                          👥 {vehicle.waitingQueue.length} waiting
                        </span>
                        <span className="waiting-time">
                          ⏱️ ~{vehicle.estimatedWaitTime}min
                        </span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
              {selectedVehicle?.id === vehicle.id && (
                <div className="selection-indicator">✅</div>
              )}
            </div>
          ))}
          {Array.from({ length: 3 }, (_, index) => (
            <div key={`empty-${index}`} className="vehicle-card empty-slot">
              <div className="vehicle-image empty-image">
                <div className="empty-icon">🚗</div>
              </div>
              <div className="vehicle-content">
                <div className="vehicle-header">
                  <h4 className="vehicle-name empty-name">Coming Soon</h4>
                  <span className="status-indicator offline">🔴 Not Available</span>
                </div>
                <p className="vehicle-description empty-description">
                  Additional vehicles will be added in future updates
                </p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="vehicle-selection-footer">
          <div className="vehicle-selection-note">
            <p>💡 Click on a vehicle to select<br></br>and proceed to payment</p>
          </div>
          <div className="footer-buttons">
            <button 
              className="vehicle-btn vehicle-btn-refresh"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh vehicle status"
            >
              🔄
            </button>
            <button 
              className="vehicle-btn vehicle-btn-cancel"
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}