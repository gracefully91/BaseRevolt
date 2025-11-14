import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { API_SERVER_URL } from '../config/contracts';
import './AdminVehicles.css';

const ADMIN_ADDRESS = "0xd10d3381c1e824143d22350e9149413310f14f22";

export default function AdminVehicles() {
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ownerWallet: ''
  });
  const [saving, setSaving] = useState(false);

  // 접근 제어
  const isAdmin = isConnected && address?.toLowerCase() === ADMIN_ADDRESS.toLowerCase();

  // Fetch online vehicles
  useEffect(() => {
    if (!isAdmin) return;

    const fetchVehicles = async () => {
      try {
        const response = await fetch(`${API_SERVER_URL}/vehicles/online`);
        if (!response.ok) throw new Error('Failed to fetch vehicles');
        const data = await response.json();
        setVehicles(data);
      } catch (error) {
        console.error('Failed to fetch vehicles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
    const interval = setInterval(fetchVehicles, 5000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  // Populate form when selecting a vehicle
  const handleSelectVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData({
      name: vehicle.name || '',
      description: vehicle.description || '',
      ownerWallet: vehicle.ownerWallet || ''
    });
  };

  // Form input handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Save config to vehicle
  const handleSave = async () => {
    if (!selectedVehicle) return;

    setSaving(true);
    try {
      const response = await fetch(
        `${API_SERVER_URL}/vehicles/${selectedVehicle.id}/config`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        }
      );

      if (response.ok) {
        alert('✅ Config sent to vehicle successfully!');
        // 목록 갱신
        const refreshResponse = await fetch(`${API_SERVER_URL}/vehicles/online`);
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setVehicles(data);
          
          // 선택된 차량도 업데이트
          const updatedVehicle = data.find(v => v.id === selectedVehicle.id);
          if (updatedVehicle) {
            setSelectedVehicle(updatedVehicle);
          }
        }
      } else {
        const error = await response.json();
        alert('❌ Failed to deliver config: ' + (error.message || 'Vehicle might be offline.'));
      }
    } catch (error) {
      alert('❌ Unexpected error: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Guard: wallet not connected
  if (!isConnected) {
    return (
      <div className="admin-container">
        <div className="admin-access-denied">
          <h2>🔒 Admin Console</h2>
          <p>Please connect your wallet to continue.</p>
        </div>
      </div>
    );
  }

  // Guard: not authorized
  if (!isAdmin) {
    return (
      <div className="admin-container">
        <div className="admin-access-denied">
          <h2>⛔ Access Denied</h2>
          <p>This page is restricted to admin wallets.</p>
          <p className="admin-address-hint">
            Connected wallet: {address?.substring(0, 10)}...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <button
        className="admin-home-button"
        onClick={() => navigate('/')}
        title="Go Home"
      >
        ◀️
      </button>
      <header className="admin-header">
        <h1>🔧 Vehicle</h1>
        <p>Update online vehicle profiles in real time.</p>
      </header>

      <div className="admin-content">
        {/* Left column: vehicle list */}
        <div className="admin-vehicle-list">
          <h2>Online Vehicles ({vehicles.length})</h2>
          
          {loading ? (
            <div className="admin-loading">
              <div className="spinner">⏳</div>
              <p>Loading...</p>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="admin-no-vehicles">
              <p>⚠️ No vehicles currently online</p>
            </div>
          ) : (
            <div className="vehicle-cards">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className={`admin-vehicle-card ${selectedVehicle?.id === vehicle.id ? 'selected' : ''}`}
                  onClick={() => handleSelectVehicle(vehicle)}
                >
                  <img 
                    src={`/vehicles/${vehicle.id}.png`}
                    alt={vehicle.name || vehicle.id}
                    onError={(e) => { e.target.src = '/vehicles/default.png'; }}
                  />
                  <div className="vehicle-info">
                    <h3>{vehicle.name || vehicle.id}</h3>
                    <p className="vehicle-id">ID: {vehicle.id}</p>
                    <span className={`status-badge ${vehicle.status}`}>
                      {vehicle.status === 'online' ? '🟢 Online' :
                       vehicle.status === 'in_use' ? '🔴 In Use' :
                       '🟡 Maintenance'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column: edit form */}
        <div className="admin-edit-panel">
          {selectedVehicle ? (
            <>
              <h2>Edit Vehicle Profile</h2>
              
              <div className="form-group readonly">
                <label>Vehicle ID (read-only)</label>
                <input
                  type="text"
                  value={selectedVehicle.id}
                  disabled
                  className="readonly-input"
                />
              </div>

              <div className="form-group readonly">
                <label>Hardware Spec (read-only)</label>
                <input
                  type="text"
                  value={selectedVehicle.hardwareSpec || 'N/A'}
                  disabled
                  className="readonly-input"
                />
              </div>

              <div className="form-group">
                <label>Vehicle Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Base Racer 01"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe this vehicle (max 200 chars)"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Owner Wallet Address</label>
                <input
                  type="text"
                  name="ownerWallet"
                  value={formData.ownerWallet}
                  onChange={handleInputChange}
                  placeholder="0x..."
                />
              </div>

              <button
                className="save-button"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Sending...' : '💾 Save & Push OTA'}
              </button>

              <p className="hint">
                ℹ️ Changes are pushed to the vehicle immediately over OTA.
              </p>
            </>
          ) : (
            <div className="no-selection">
              <p>👈 Select a vehicle to edit its profile</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

