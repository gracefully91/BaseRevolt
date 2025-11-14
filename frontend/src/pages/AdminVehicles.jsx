import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { API_SERVER_URL } from '../config/contracts';
import './AdminVehicles.css';

const ADMIN_ADDRESS = "0xd10d3381c1e824143d22350e9149413310f14f22";

export default function AdminVehicles() {
  const { address, isConnected } = useAccount();
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

  // 차량 목록 가져오기
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

  // 차량 선택 시 폼 데이터 설정
  const handleSelectVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData({
      name: vehicle.name || '',
      description: vehicle.description || '',
      ownerWallet: vehicle.ownerWallet || ''
    });
  };

  // 폼 입력 핸들러
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 설정 저장
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
        alert('✅ 설정이 차량에 전송되었습니다!');
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
        alert('❌ 전송 실패: ' + (error.message || '차량이 오프라인일 수 있습니다.'));
      }
    } catch (error) {
      alert('❌ 오류 발생: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // 접근 권한 체크
  if (!isConnected) {
    return (
      <div className="admin-container">
        <div className="admin-access-denied">
          <h2>🔒 관리자 페이지</h2>
          <p>지갑을 연결해주세요</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-container">
        <div className="admin-access-denied">
          <h2>⛔ 접근 거부</h2>
          <p>관리자 전용 페이지입니다</p>
          <p className="admin-address-hint">
            현재 지갑: {address?.substring(0, 10)}...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>🔧 차량 관리</h1>
        <p>온라인 차량의 프로필을 수정할 수 있습니다</p>
      </header>

      <div className="admin-content">
        {/* 좌측: 차량 리스트 */}
        <div className="admin-vehicle-list">
          <h2>온라인 차량 ({vehicles.length})</h2>
          
          {loading ? (
            <div className="admin-loading">
              <div className="spinner">⏳</div>
              <p>로딩 중...</p>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="admin-no-vehicles">
              <p>⚠️ 온라인 차량이 없습니다</p>
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
                      {vehicle.status === 'online' ? '🟢 온라인' :
                       vehicle.status === 'in_use' ? '🔴 사용 중' :
                       '🟡 정비 중'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 우측: 편집 폼 */}
        <div className="admin-edit-panel">
          {selectedVehicle ? (
            <>
              <h2>차량 설정 편집</h2>
              
              <div className="form-group readonly">
                <label>차량 ID (수정 불가)</label>
                <input
                  type="text"
                  value={selectedVehicle.id}
                  disabled
                  className="readonly-input"
                />
              </div>

              <div className="form-group readonly">
                <label>하드웨어 스펙 (수정 불가)</label>
                <input
                  type="text"
                  value={selectedVehicle.hardwareSpec || 'N/A'}
                  disabled
                  className="readonly-input"
                />
              </div>

              <div className="form-group">
                <label>차량 이름</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="예: Base Racer 01"
                />
              </div>

              <div className="form-group">
                <label>설명</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="차량에 대한 설명을 입력하세요"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>소유자 지갑 주소</label>
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
                {saving ? '전송 중...' : '💾 저장 및 전송'}
              </button>

              <p className="hint">
                ℹ️ 저장 시 차량으로 설정이 즉시 전송됩니다
              </p>
            </>
          ) : (
            <div className="no-selection">
              <p>👈 차량을 선택해주세요</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

