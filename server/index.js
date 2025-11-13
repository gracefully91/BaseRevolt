import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { randomUUID } from 'crypto';

const app = express();
const PORT = process.env.PORT || 8080;

// HTTP 서버 생성
const server = createServer(app);

// WebSocket 서버 생성
const wss = new WebSocketServer({ server });

// 연결된 클라이언트 관리 (v2.0: 디바이스 분리)
// devices: Map<deviceId, { control: ws, camera: ws, metadata }>
const devices = new Map();
const webUsers = new Set();  // 웹 사용자들

// 세션 관리
const activeSessions = new Map(); // carId → session 정보
const demoQuota = new Map();      // wallet → { usedAt, expiresAt }
const waitingQueues = new Map();  // carId → [{ wallet, tier, ws, joinedAt }]

// 세션 시간 설정 (밀리초)
const SESSION_DURATION = {
  demo: 5 * 60 * 1000,  // 5분
  paid: 10 * 60 * 1000  // 10분
};

// 하트비트 타임아웃 (10초)
const HEARTBEAT_TIMEOUT = 10 * 1000;

// 선점 경고 시간 (5초)
const PREEMPT_WARNING_TIME = 5 * 1000;

// 데모 쿼터 만료 시간 (24시간)
const DEMO_QUOTA_EXPIRY = 24 * 60 * 60 * 1000;

// 헬스체크 엔드포인트 (Render 무료티어용)
app.get('/', (req, res) => {
  const deviceStats = {};
  devices.forEach((device, deviceId) => {
    deviceStats[deviceId] = {
      control: device.control ? 'connected' : 'disconnected',
      camera: device.camera ? 'connected' : 'disconnected'
    };
  });
  
  res.json({
    status: 'running',
    service: 'Base Revolt WebSocket Server (v2.0 - Split Architecture)',
    devices: deviceStats,
    webUsers: webUsers.size
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// WebSocket 연결 처리
wss.on('connection', (ws, req) => {
  console.log('New connection from:', req.socket.remoteAddress);
  
  let clientType = null;
  let deviceId = null;
  let deviceRole = null;
  
  // 헤더로 장치 타입 확인 (하위 호환)
  const deviceType = req.headers['x-device-type'];
  
  if (deviceType === 'rc-car') {
    // 기존 ESP32 (하위 호환) - register 메시지 대기
    clientType = 'device-pending';
    console.log('⏳ Legacy device connected, waiting for registration...');
  } else {
    // 웹 사용자
    clientType = 'web-user';
    webUsers.add(ws);
    console.log(`✅ Web user connected (total: ${webUsers.size})`);
    
    // 새 사용자에게 모든 디바이스 상태 알림
    const anyCarConnected = Array.from(devices.values()).some(
      device => device.control || device.camera
    );
    
    ws.send(JSON.stringify({
      type: 'rc-car-status',
      status: anyCarConnected ? 'connected' : 'disconnected'
    }));
  }
  
  // 메시지 수신 처리
  ws.on('message', (message) => {
    // 디버깅: 모든 메시지 로그
    if (clientType === 'device-pending') {
      console.log(`📨 Message from device-pending:`, message instanceof Buffer ? `Binary (${message.length} bytes)` : message.toString().substring(0, 100));
    }
    
    // 디바이스 등록 처리 (ESP32에서 첫 메시지)
    if (clientType === 'device-pending' || clientType === 'device-control' || clientType === 'device-camera') {
      if (!(message instanceof Buffer)) {
        try {
          const data = JSON.parse(message.toString());
          console.log(`📝 Parsed JSON from device:`, data);
          
          // 디바이스 등록
          if (data.type === 'register') {
            deviceId = data.deviceId;
            deviceRole = data.role;
            
            // 디바이스 레지스트리에 추가
            if (!devices.has(deviceId)) {
              devices.set(deviceId, {});
            }
            
            const device = devices.get(deviceId);
            device[deviceRole] = ws;
            
            // 웹소켓에 메타데이터 저장
            ws.deviceId = deviceId;
            ws.role = deviceRole;
            clientType = `device-${deviceRole}`;
            
            console.log(`✅ Device registered: ${deviceId} (${deviceRole})`);
            
            // 웹 사용자들에게 디바이스 상태 브로드캐스트
            broadcastToWebUsers({
              type: 'device-status',
              deviceId,
              role: deviceRole,
              status: 'connected'
            });
            
            return;
          }
          
          console.log(`Device ${deviceRole} message:`, data);
        } catch (e) {
          // JSON 파싱 실패 - 바이너리일 수 있음
          console.log(`⚠️ JSON parse error from device-pending:`, e.message);
          console.log(`   Raw message:`, message.toString().substring(0, 200));
        }
      }
      
      // 카메라 디바이스에서 바이너리(영상 프레임) 수신
      if (message instanceof Buffer && deviceRole === 'camera') {
        // JPEG 프레임 → 모든 웹 사용자에게 브로드캐스트
        broadcastToWebUsers(message, true);
      }
      
    } else if (clientType === 'web-user') {
      // 웹 사용자로부터 메시지 처리
      try {
        const data = JSON.parse(message.toString());
        
        // 세션 요청 처리
        if (data.type === 'requestSession') {
          handleSessionRequest(ws, data);
        }
        // 하트비트 처리
        else if (data.type === 'heartbeat') {
          handleHeartbeat(data);
        }
        // 세션 종료 처리
        else if (data.type === 'endSession') {
          handleEndSession(data);
        }
        // 제어 명령 처리 (세션 검증 포함)
        else if (data.type === 'control') {
          handleControlCommand(ws, data);
        }
        // 대기열 가입
        else if (data.type === 'joinQueue') {
          handleJoinQueue(ws, data);
        }
        // 대기열 탈퇴
        else if (data.type === 'leaveQueue') {
          handleLeaveQueue(ws, data);
        }
        // 대기열 상태 조회
        else if (data.type === 'getQueueStatus') {
          handleGetQueueStatus(ws, data);
        }
      } catch (e) {
        console.error('Error parsing web user message:', e);
      }
    }
  });
  
  // 연결 종료 처리
  ws.on('close', () => {
    if (clientType && clientType.startsWith('device-')) {
      console.log(`❌ Device disconnected: ${deviceId} (${deviceRole})`);
      
      // 디바이스 레지스트리에서 제거
      if (deviceId && devices.has(deviceId)) {
        const device = devices.get(deviceId);
        if (device[deviceRole]) {
          delete device[deviceRole];
        }
        
        // 디바이스의 모든 역할이 끊어졌으면 제거
        if (!device.control && !device.camera) {
          devices.delete(deviceId);
        }
      }
      
      // 웹 사용자들에게 디바이스 상태 브로드캐스트
      broadcastToWebUsers({
        type: 'device-status',
        deviceId,
        role: deviceRole,
        status: 'disconnected'
      });
      
      // 하위 호환: rc-car-status도 전송
      const anyCarConnected = Array.from(devices.values()).some(
        device => device.control || device.camera
      );
      broadcastToWebUsers({
        type: 'rc-car-status',
        status: anyCarConnected ? 'connected' : 'disconnected'
      });
      
    } else if (clientType === 'web-user') {
      webUsers.delete(ws);
      console.log(`❌ Web user disconnected (remaining: ${webUsers.size})`);
    }
  });
  
  // 에러 처리
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// 웹 사용자들에게 브로드캐스트
function broadcastToWebUsers(data, isBinary = false) {
  const message = isBinary ? data : JSON.stringify(data);
  
  webUsers.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN = 1
      client.send(message);
    }
  });
}

// 세션 관리 헬퍼 함수들
function createSession(carId, wallet, tier, ws) {
  const sessionId = randomUUID();
  const duration = SESSION_DURATION[tier];
  const expiresAt = Date.now() + duration;
  
  const session = {
    sessionId,
    wallet,
    tier,
    carId,
    expiresAt,
    ws,
    heartbeatTimeout: null
  };
  
  activeSessions.set(carId, session);
  
  // 자동 만료 타이머 설정
  session.autoEndTimeout = setTimeout(() => {
    endSession(carId, 'expired');
  }, duration);
  
  console.log(`✅ Session created: ${sessionId} (${tier}) for car: ${carId}`);
  
  return session;
}

function endSession(carId, reason = 'manual') {
  const session = activeSessions.get(carId);
  
  if (!session) return;
  
  console.log(`🔴 Ending session: ${session.sessionId} (reason: ${reason})`);
  
  // 타이머 정리
  if (session.heartbeatTimeout) {
    clearTimeout(session.heartbeatTimeout);
  }
  if (session.autoEndTimeout) {
    clearTimeout(session.autoEndTimeout);
  }
  
  // 세션 종료 알림
  if (session.ws && session.ws.readyState === session.ws.OPEN) {
    session.ws.send(JSON.stringify({
      type: 'sessionEnd',
      reason,
      message: reason === 'expired' ? 'Your play time has ended' : 'Session ended'
    }));
  }
  
  // RC카 조종 디바이스에 정지 명령
  const device = devices.get(carId);
  if (device && device.control && device.control.readyState === 1) {
    device.control.send(JSON.stringify({
      type: 'control',
      command: 'stop'
    }));
  }
  
  activeSessions.delete(carId);
  
  // 대기열에서 다음 사람 자동 할당
  const nextUser = getNextInQueue(carId);
  if (nextUser) {
    console.log(`🎯 Auto-assigning to next in queue: ${nextUser.wallet.substring(0, 10)}...`);
    
    setTimeout(() => {
      const newSession = createSession(carId, nextUser.wallet, nextUser.tier, nextUser.ws);
      resetHeartbeatTimeout(newSession);
      
      if (nextUser.tier === 'demo') {
        useDemoQuota(nextUser.wallet);
      }
      
      nextUser.ws.send(JSON.stringify({
        type: 'sessionGranted',
        sessionId: newSession.sessionId,
        expiresAt: newSession.expiresAt,
        tier: newSession.tier,
        fromQueue: true
      }));
      
      // 대기열 상태 업데이트
      broadcastQueueStatus(carId);
    }, 1000); // 1초 후 할당 (정리 시간)
  } else {
    // 대기열이 비었으면 상태만 브로드캐스트
    broadcastQueueStatus(carId);
  }
}

function checkDemoQuota(wallet) {
  const quota = demoQuota.get(wallet);
  
  if (!quota) return true; // 사용 기록 없음
  
  const now = Date.now();
  
  // 24시간 지났으면 쿼터 초기화
  if (now > quota.expiresAt) {
    demoQuota.delete(wallet);
    return true;
  }
  
  return false; // 아직 쿼터 사용 불가
}

function useDemoQuota(wallet) {
  const now = Date.now();
  demoQuota.set(wallet, {
    usedAt: now,
    expiresAt: now + DEMO_QUOTA_EXPIRY
  });
  console.log(`📊 Demo quota used for wallet: ${wallet}`);
}

function resetHeartbeatTimeout(session) {
  if (session.heartbeatTimeout) {
    clearTimeout(session.heartbeatTimeout);
  }
  
  session.heartbeatTimeout = setTimeout(() => {
    console.log(`💔 Heartbeat timeout for session: ${session.sessionId}`);
    endSession(session.carId, 'heartbeat_timeout');
  }, HEARTBEAT_TIMEOUT);
}

// 대기열 관리 함수들
function addToQueue(carId, wallet, tier, ws) {
  if (!waitingQueues.has(carId)) {
    waitingQueues.set(carId, []);
  }
  
  const queue = waitingQueues.get(carId);
  
  // 이미 대기열에 있는지 확인
  if (queue.some(item => item.wallet === wallet)) {
    console.log(`⚠️ User ${wallet.substring(0, 10)}... already in queue`);
    return false;
  }
  
  queue.push({
    wallet,
    tier,
    ws,
    joinedAt: Date.now()
  });
  
  console.log(`📝 Added to queue: ${wallet.substring(0, 10)}... (position: ${queue.length})`);
  
  // 대기열 상태 브로드캐스트
  broadcastQueueStatus(carId);
  
  return true;
}

function removeFromQueue(carId, wallet) {
  const queue = waitingQueues.get(carId);
  if (!queue) return false;
  
  const index = queue.findIndex(item => item.wallet === wallet);
  if (index === -1) return false;
  
  queue.splice(index, 1);
  console.log(`🚫 Removed from queue: ${wallet.substring(0, 10)}...`);
  
  // 대기열 상태 브로드캐스트
  broadcastQueueStatus(carId);
  
  return true;
}

function getNextInQueue(carId) {
  const queue = waitingQueues.get(carId);
  if (!queue || queue.length === 0) return null;
  
  // paid 우선, 같은 tier면 먼저 들어온 순서
  queue.sort((a, b) => {
    if (a.tier === 'paid' && b.tier === 'demo') return -1;
    if (a.tier === 'demo' && b.tier === 'paid') return 1;
    return a.joinedAt - b.joinedAt;
  });
  
  return queue.shift(); // 첫 번째 제거 및 반환
}

function getQueueStatus(carId) {
  const queue = waitingQueues.get(carId) || [];
  const session = activeSessions.get(carId);
  
  return {
    carId,
    currentUser: session ? {
      wallet: session.wallet.substring(0, 10) + '...',
      tier: session.tier,
      expiresAt: session.expiresAt
    } : null,
    queueLength: queue.length,
    queue: queue.map((item, index) => ({
      position: index + 1,
      wallet: item.wallet.substring(0, 10) + '...',
      tier: item.tier,
      estimatedWaitTime: calculateWaitTime(session, index)
    }))
  };
}

function calculateWaitTime(session, position) {
  if (!session) return 0;
  
  const remainingTime = Math.max(0, session.expiresAt - Date.now());
  const remainingMinutes = Math.ceil(remainingTime / 60000);
  
  // 현재 세션 남은 시간 + (앞에 대기 중인 사람 수 * 평균 세션 시간)
  const avgSessionTime = 7; // 평균 7분
  return remainingMinutes + (position * avgSessionTime);
}

function broadcastQueueStatus(carId) {
  const status = getQueueStatus(carId);
  
  broadcastToWebUsers({
    type: 'queueUpdate',
    status
  });
}

// 이벤트 핸들러 함수들
function handleSessionRequest(ws, data) {
  const { carId, wallet, tier } = data;
  
  console.log(`📝 Session request: ${tier} from wallet: ${wallet?.substring(0, 10)}...`);
  
  // 데모 모드일 경우 쿼터 확인
  if (tier === 'demo') {
    if (!checkDemoQuota(wallet)) {
      ws.send(JSON.stringify({
        type: 'sessionDenied',
        reason: 'demoQuotaExceeded',
        message: 'You have already used your daily demo session. Please try again tomorrow or purchase a paid session.'
      }));
      return;
    }
  }
  
  const existingSession = activeSessions.get(carId);
  
  // 차량이 비어있으면 즉시 세션 생성
  if (!existingSession) {
    const session = createSession(carId, wallet, tier, ws);
    resetHeartbeatTimeout(session);
    
    if (tier === 'demo') {
      useDemoQuota(wallet);
    }
    
    ws.send(JSON.stringify({
      type: 'sessionGranted',
      sessionId: session.sessionId,
      expiresAt: session.expiresAt,
      tier: session.tier
    }));
    return;
  }
  
  // 차량이 이미 사용 중인 경우
  if (existingSession.tier === 'demo' && tier === 'paid') {
    // paid가 demo를 선점
    console.log(`🔄 Paid user preempting demo session`);
    
    // 데모 사용자에게 경고
    if (existingSession.ws && existingSession.ws.readyState === existingSession.ws.OPEN) {
      existingSession.ws.send(JSON.stringify({
        type: 'preempt',
        message: 'A paid user is taking over the car. Your session will end in 5 seconds.',
        warningTime: PREEMPT_WARNING_TIME
      }));
    }
    
    // 5초 후 데모 세션 종료하고 paid 세션 생성
    setTimeout(() => {
      endSession(carId, 'preempted');
      
      const newSession = createSession(carId, wallet, tier, ws);
      resetHeartbeatTimeout(newSession);
      
      ws.send(JSON.stringify({
        type: 'sessionGranted',
        sessionId: newSession.sessionId,
        expiresAt: newSession.expiresAt,
        tier: newSession.tier
      }));
    }, PREEMPT_WARNING_TIME);
    
  } else if (existingSession.tier === 'paid' && tier === 'demo') {
    // paid 사용 중일 때 demo는 거절 + 대기열 옵션 제공
    const queueStatus = getQueueStatus(carId);
    ws.send(JSON.stringify({
      type: 'sessionDenied',
      reason: 'carBusy',
      message: 'The car is currently being used by a paid user.',
      canJoinQueue: true,
      queueStatus
    }));
    
  } else if (existingSession.tier === 'paid' && tier === 'paid') {
    // 두 paid 사용자 - 같은 지갑이면 연장, 아니면 거절
    if (existingSession.wallet === wallet) {
      // 세션 연장
      const duration = SESSION_DURATION.paid;
      existingSession.expiresAt = Date.now() + duration;
      
      if (existingSession.autoEndTimeout) {
        clearTimeout(existingSession.autoEndTimeout);
      }
      existingSession.autoEndTimeout = setTimeout(() => {
        endSession(carId, 'expired');
      }, duration);
      
      ws.send(JSON.stringify({
        type: 'sessionExtended',
        sessionId: existingSession.sessionId,
        expiresAt: existingSession.expiresAt
      }));
    } else {
      // 다른 paid 사용자 - 거절 + 대기열 옵션
      const queueStatus = getQueueStatus(carId);
      ws.send(JSON.stringify({
        type: 'sessionDenied',
        reason: 'carBusy',
        message: 'The car is currently being used by another paid user.',
        canJoinQueue: true,
        queueStatus
      }));
    }
    
  } else {
    // demo vs demo - 거절 + 대기열 옵션
    const queueStatus = getQueueStatus(carId);
    ws.send(JSON.stringify({
      type: 'sessionDenied',
      reason: 'carBusy',
      message: 'The car is currently being used.',
      canJoinQueue: true,
      queueStatus
    }));
  }
}

function handleHeartbeat(data) {
  const { sessionId } = data;
  
  // 해당 세션 찾기
  for (const [carId, session] of activeSessions.entries()) {
    if (session.sessionId === sessionId) {
      resetHeartbeatTimeout(session);
      return;
    }
  }
}

function handleEndSession(data) {
  const { sessionId } = data;
  
  // 해당 세션 찾아서 종료
  for (const [carId, session] of activeSessions.entries()) {
    if (session.sessionId === sessionId) {
      endSession(carId, 'manual');
      return;
    }
  }
}

function handleControlCommand(ws, data) {
  const { sessionId, command, carId } = data;
  
  if (!sessionId) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'No session ID provided'
    }));
    return;
  }
  
  // 세션 검증
  let validSession = null;
  let sessionCarId = carId;  // 명시적 carId 우선
  
  for (const [cid, session] of activeSessions.entries()) {
    if (session.sessionId === sessionId) {
      validSession = session;
      sessionCarId = cid;
      break;
    }
  }
  
  if (!validSession) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Invalid or expired session'
    }));
    return;
  }
  
  // 세션이 유효하면 control 디바이스로 명령 전달
  console.log(`🎮 Control command: ${command} from session: ${sessionId} to car: ${sessionCarId}`);
  
  const device = devices.get(sessionCarId || 'CAR01');  // 기본값 CAR01
  
  if (device && device.control && device.control.readyState === 1) {
    device.control.send(JSON.stringify({
      type: 'control',
      command: command
    }));
  } else {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Control device not connected'
    }));
  }
}

function handleJoinQueue(ws, data) {
  const { carId, wallet, tier } = data;
  
  console.log(`📝 Join queue request: ${tier} from ${wallet?.substring(0, 10)}...`);
  
  const success = addToQueue(carId, wallet, tier, ws);
  
  if (success) {
    const queueStatus = getQueueStatus(carId);
    const myPosition = queueStatus.queue.find(item => item.wallet === wallet.substring(0, 10) + '...');
    
    ws.send(JSON.stringify({
      type: 'queueJoined',
      carId,
      position: myPosition?.position || queueStatus.queueLength,
      estimatedWaitTime: myPosition?.estimatedWaitTime || 0,
      queueStatus
    }));
  } else {
    ws.send(JSON.stringify({
      type: 'queueJoinFailed',
      reason: 'alreadyInQueue',
      message: 'You are already in the queue'
    }));
  }
}

function handleLeaveQueue(ws, data) {
  const { carId, wallet } = data;
  
  console.log(`🚫 Leave queue request from ${wallet?.substring(0, 10)}...`);
  
  const success = removeFromQueue(carId, wallet);
  
  if (success) {
    ws.send(JSON.stringify({
      type: 'queueLeft',
      carId,
      message: 'Successfully left the queue'
    }));
  } else {
    ws.send(JSON.stringify({
      type: 'queueLeaveFailed',
      reason: 'notInQueue',
      message: 'You are not in the queue'
    }));
  }
}

function handleGetQueueStatus(ws, data) {
  const { carId } = data;
  const queueStatus = getQueueStatus(carId);
  
  ws.send(JSON.stringify({
    type: 'queueStatus',
    status: queueStatus
  }));
}

// 서버 시작
server.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🚗 Base Revolt WebSocket Server');
  console.log('='.repeat(50));
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
  console.log('='.repeat(50));
});

// 우아한 종료 처리
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing server');
  
  // 모든 디바이스 연결 종료
  devices.forEach((device) => {
    if (device.control) device.control.close();
    if (device.camera) device.camera.close();
  });
  
  // 모든 웹 사용자 연결 종료
  webUsers.forEach(client => client.close());
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});


