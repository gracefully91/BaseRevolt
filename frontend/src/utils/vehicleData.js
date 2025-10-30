// 차량 데이터 관리 유틸리티

// 기본 차량 데이터 (실제 구현된 차량 1대만)
export const defaultVehicles = [
  {
    id: 'car-001',
    name: 'Base Revolt Car',
    description: 'Real RC car controlled via ESP32 and web interface',
    image: '/static-gamgyul.png',
    status: 'offline',
    features: ['Real-time Video', 'Web Control', 'ESP32 Powered'],
    waitingQueue: [], // 대기열 배열 (실제로는 비어있음)
    currentUser: null, // 현재 사용자
    estimatedWaitTime: 0 // 예상 대기 시간 (분)
  }
];

// 차량 상태 관리
export class VehicleManager {
  constructor() {
    this.vehicles = [...defaultVehicles];
    this.selectedVehicle = null;
    this.initializeRealData();
  }

  // 실제 데이터 초기화 (서버에서 받은 데이터만 사용)
  initializeRealData() {
    this.vehicles.forEach(vehicle => {
      // 더미 데이터 제거 - 서버의 실제 대기열만 사용
      vehicle.waitingQueue = [];
      vehicle.estimatedWaitTime = 0;
      vehicle.currentUser = null;
      vehicle.status = 'offline';
    });
  }

  // 모든 차량 조회
  getVehicles() {
    return this.vehicles;
  }

  // 사용 가능한 차량만 조회
  getAvailableVehicles() {
    return this.vehicles.filter(vehicle => vehicle.status === 'available');
  }

  // ID로 차량 조회
  getVehicleById(id) {
    return this.vehicles.find(vehicle => vehicle.id === id);
  }

  // 차량 선택
  selectVehicle(vehicle) {
    this.selectedVehicle = vehicle;
    return vehicle;
  }

  // 선택된 차량 조회
  getSelectedVehicle() {
    return this.selectedVehicle;
  }

  // 차량 상태 업데이트
  updateVehicleStatus(id, status) {
    const vehicle = this.getVehicleById(id);
    if (vehicle) {
      vehicle.status = status;
      return true;
    }
    return false;
  }

  // 차량 사용 시작 (busy로 변경)
  startUsingVehicle(id) {
    return this.updateVehicleStatus(id, 'busy');
  }

  // 차량 사용 종료 (available로 변경)
  stopUsingVehicle(id) {
    return this.updateVehicleStatus(id, 'available');
  }

  // 차량 추가
  addVehicle(vehicle) {
    const newVehicle = {
      ...vehicle,
      id: `car-${Date.now()}`,
      status: 'available'
    };
    this.vehicles.push(newVehicle);
    return newVehicle;
  }

  // 차량 제거
  removeVehicle(id) {
    const index = this.vehicles.findIndex(vehicle => vehicle.id === id);
    if (index !== -1) {
      this.vehicles.splice(index, 1);
      return true;
    }
    return false;
  }

  // 차량 정보 업데이트
  updateVehicle(id, updates) {
    const vehicle = this.getVehicleById(id);
    if (vehicle) {
      Object.assign(vehicle, updates);
      return vehicle;
    }
    return null;
  }

  // 대기열에 사용자 추가 (실제 지갑 주소 사용)
  addToWaitingQueue(vehicleId, userId, walletAddress) {
    const vehicle = this.getVehicleById(vehicleId);
    if (!vehicle) return false;
    
    // 이미 대기열에 있는지 확인
    const existingIndex = vehicle.waitingQueue.findIndex(user => user.id === userId);
    if (existingIndex !== -1) return false;
    
    const queuePosition = vehicle.waitingQueue.length + 1;
    const estimatedWait = queuePosition * 10; // 10분씩 대기 시간 증가
    
    vehicle.waitingQueue.push({
      id: userId,
      walletAddress: walletAddress,
      name: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`, // 0x1234...5678 형태
      joinedAt: new Date(),
      queuePosition,
      estimatedWaitTime: estimatedWait
    });
    
    vehicle.estimatedWaitTime = estimatedWait;
    return true;
  }

  // 대기열에서 사용자 제거
  removeFromWaitingQueue(vehicleId, userId) {
    const vehicle = this.getVehicleById(vehicleId);
    if (!vehicle) return false;
    
    const index = vehicle.waitingQueue.findIndex(user => user.id === userId);
    if (index === -1) return false;
    
    vehicle.waitingQueue.splice(index, 1);
    
    // 대기열 위치 재정렬
    vehicle.waitingQueue.forEach((user, idx) => {
      user.queuePosition = idx + 1;
      user.estimatedWaitTime = (idx + 1) * 10;
    });
    
    vehicle.estimatedWaitTime = vehicle.waitingQueue.length * 10;
    return true;
  }

  // 차량 사용 시작 (대기열 첫 번째 사용자)
  startUsingVehicle(id, userId) {
    const vehicle = this.getVehicleById(id);
    if (!vehicle) return false;
    
    // 대기열이 있고 첫 번째 사용자가 요청한 사용자인지 확인
    if (vehicle.waitingQueue.length > 0 && vehicle.waitingQueue[0].id === userId) {
      vehicle.currentUser = vehicle.waitingQueue.shift();
      vehicle.status = 'busy';
      
      // 대기열 위치 재정렬
      vehicle.waitingQueue.forEach((user, idx) => {
        user.queuePosition = idx + 1;
        user.estimatedWaitTime = (idx + 1) * 10;
      });
      
      vehicle.estimatedWaitTime = vehicle.waitingQueue.length * 10;
      return true;
    }
    
    // 대기열이 없으면 바로 사용 시작
    if (vehicle.status === 'available') {
      vehicle.currentUser = { id: userId, name: 'Current User' };
      vehicle.status = 'busy';
      return true;
    }
    
    return false;
  }

  // 대기열에서 다음 사용자에게 차례 알림
  notifyNextUser(vehicleId) {
    const vehicle = this.getVehicleById(vehicleId);
    if (!vehicle || vehicle.waitingQueue.length === 0) return null;
    
    const nextUser = vehicle.waitingQueue[0];
    
    // 실제로는 여기서 푸시 알림, 이메일, SMS 등을 보냄
    console.log(`🔔 알림: ${nextUser.name} (${nextUser.walletAddress}), 차량 사용 차례입니다!`);
    
    return {
      userId: nextUser.id,
      walletAddress: nextUser.walletAddress,
      userName: nextUser.name,
      message: '차량 사용 차례가 되었습니다! 3분 내에 접속해주세요.',
      vehicleName: vehicle.name,
      timeLimit: 3 // 3분 제한
    };
  }

  // 대기열 자동 진행 (실제 서비스에서는 타이머나 이벤트 기반)
  processQueue(vehicleId) {
    const vehicle = this.getVehicleById(vehicleId);
    if (!vehicle || vehicle.status !== 'available' || vehicle.waitingQueue.length === 0) {
      return null;
    }
    
    // 첫 번째 사용자에게 알림
    const notification = this.notifyNextUser(vehicleId);
    
    // 3분 후 자동으로 다음 사용자로 넘어감 (시뮬레이션)
    setTimeout(() => {
      if (vehicle.waitingQueue.length > 0 && vehicle.waitingQueue[0].id === notification.userId) {
        // 사용자가 응답하지 않으면 대기열에서 제거하고 다음 사용자에게 알림
        vehicle.waitingQueue.shift();
        this.processQueue(vehicleId);
      }
    }, 3 * 60 * 1000); // 3분
    
    return notification;
  }

  // 차량 사용 종료
  stopUsingVehicle(id) {
    const vehicle = this.getVehicleById(id);
    if (!vehicle) return false;
    
    vehicle.currentUser = null;
    vehicle.status = 'available';
    return true;
  }

  // 대기열 정보 조회
  getWaitingQueue(vehicleId) {
    const vehicle = this.getVehicleById(vehicleId);
    return vehicle ? vehicle.waitingQueue : [];
  }

  // 사용자의 대기열 위치 조회
  getUserQueuePosition(vehicleId, userId) {
    const vehicle = this.getVehicleById(vehicleId);
    if (!vehicle) return -1;
    
    const user = vehicle.waitingQueue.find(user => user.id === userId);
    return user ? user.queuePosition : -1;
  }

  // 대기열 데이터 새로고침 (서버에서 받은 데이터로 업데이트)
  refreshWaitingData() {
    // 실제로는 서버에서 최신 대기열 정보를 가져와야 함
    // Home.jsx의 WebSocket에서 queueStatus를 받아서 업데이트
    console.log('🔄 대기열 데이터 새로고침 (서버에서 실시간 업데이트)');
  }

  // 대기열 통계 조회
  getWaitingStats() {
    const totalWaiting = this.vehicles.reduce((sum, vehicle) => sum + vehicle.waitingQueue.length, 0);
    const averageWaitTime = this.vehicles.reduce((sum, vehicle) => sum + vehicle.estimatedWaitTime, 0) / this.vehicles.length;
    
    return {
      totalWaiting,
      averageWaitTime: Math.round(averageWaitTime),
      vehiclesWithQueue: this.vehicles.filter(v => v.waitingQueue.length > 0).length
    };
  }
}

// 전역 차량 매니저 인스턴스
export const vehicleManager = new VehicleManager();

// 차량 상태 상수
export const VEHICLE_STATUS = {
  AVAILABLE: 'available',
  BUSY: 'busy', 
  MAINTENANCE: 'maintenance',
  OFFLINE: 'offline'
};

// 차량 필터링 함수들
export const vehicleFilters = {
  // 상태별 필터링
  byStatus: (vehicles, status) => vehicles.filter(vehicle => vehicle.status === status),
  
  // 사용 가능한 차량만
  available: (vehicles) => vehicles.filter(vehicle => vehicle.status === VEHICLE_STATUS.AVAILABLE),
  
  // 이름으로 검색
  byName: (vehicles, searchTerm) => 
    vehicles.filter(vehicle => 
      vehicle.name.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  
  // 배터리 레벨별 필터링
  byBatteryLevel: (vehicles, minLevel) => 
    vehicles.filter(vehicle => {
      const battery = vehicle.specs?.battery;
      if (!battery || battery === 'N/A') return false;
      const level = parseInt(battery.replace('%', ''));
      return level >= minLevel;
    })
};

// 차량 정렬 함수들
export const vehicleSorters = {
  // 이름순 정렬
  byName: (vehicles) => [...vehicles].sort((a, b) => a.name.localeCompare(b.name)),
  
  // 상태순 정렬 (available -> busy -> maintenance)
  byStatus: (vehicles) => [...vehicles].sort((a, b) => {
    const statusOrder = { available: 0, busy: 1, maintenance: 2, offline: 3 };
    return statusOrder[a.status] - statusOrder[b.status];
  }),
  
  // 배터리 레벨순 정렬
  byBattery: (vehicles) => [...vehicles].sort((a, b) => {
    const getBatteryLevel = (vehicle) => {
      const battery = vehicle.specs?.battery;
      if (!battery || battery === 'N/A') return 0;
      return parseInt(battery.replace('%', ''));
    };
    return getBatteryLevel(b) - getBatteryLevel(a);
  })
};
