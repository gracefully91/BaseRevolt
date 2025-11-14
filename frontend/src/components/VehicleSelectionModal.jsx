import { useState } from 'react';
import './VehicleSelectionModal.css';

export default function VehicleSelectionModal({ 
  open, 
  onClose, 
  onVehicleSelect,
  onShowQueue,
  vehicles = [],
  loading = false,
  onRefresh
}) {
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isSelectable = (vehicle) => {
    return vehicle.status === 'online';
  };

  const handleVehicleSelect = (vehicle) => {
    if (!isSelectable(vehicle)) {
      return; // maintenance, in_use, offline 차량은 선택 불가
    }
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

  if (!open) {
    console.log('VehicleSelectionModal closed');
    return null;
  }

  console.log('VehicleSelectionModal rendering', { vehiclesCount: vehicles?.length });

  return (
    <div className="vehicle-selection-overlay">
      <div className="vehicle-selection-modal">
        <div className="vehicle-selection-header">
          <h2>🚗 Select Vehicle</h2>
          <p>Choose your preferred vehicle for the session</p>
        </div>
        
        <div className="vehicle-list">
          {loading ? (
            <div className="loading-vehicles">
              <div className="loading-spinner">⏳</div>
              <p>Loading vehicles...</p>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="no-vehicles">
              <p>⚠️ No vehicles online</p>
              <p className="subtext">Please wait for vehicles to connect</p>
            </div>
          ) : (
            vehicles.map((vehicle) => (
            <div 
              key={vehicle.id}
              className={`vehicle-card ${selectedVehicle?.id === vehicle.id ? 'selected' : ''} ${!isSelectable(vehicle) ? 'disabled' : ''}`}
              onClick={() => handleVehicleSelect(vehicle)}
              style={{ cursor: isSelectable(vehicle) ? 'pointer' : 'not-allowed' }}
            >
              <img 
                src={`/vehicles/${vehicle.id}.png`}
                alt={vehicle.name || vehicle.id}
                className="vehicle-image"
                onError={(e) => { e.target.src = '/vehicles/default.png'; }}
              />
              <div className="vehicle-content">
                <div className="vehicle-header">
                  <h4 className="vehicle-name">{vehicle.name || vehicle.id}</h4>
                  <span className={`status-indicator ${vehicle.status}`}>
                    {vehicle.status === 'online' ? (
                      <>
                        <span className="blinking-dot">🟢</span> Available
                      </>
                    ) : vehicle.status === 'in_use' ? '🔴 In Use' : 
                      vehicle.status === 'offline' ? '⚪ Offline' :
                     '🟡 Maintenance'}
                  </span>
                </div>
                <p className="vehicle-description">{vehicle.description || vehicle.hardwareSpec || 'RC Vehicle'}</p>
                <p className="vehicle-id">ID: {vehicle.id}</p>
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
              {selectedVehicle?.id === vehicle.id && isSelectable(vehicle) && (
                <div className="selection-indicator">
                  ✅
                </div>
              )}
            </div>
          ))
          )}
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