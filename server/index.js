import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const app = express();
const PORT = process.env.PORT || 8080;

// HTTP 서버 생성
const server = createServer(app);

// WebSocket 서버 생성
const wss = new WebSocketServer({ server });

// 연결된 클라이언트 관리
const clients = {
  rcCar: null,      // ESP32-CAM RC카
  webUsers: new Set() // 웹 사용자들
};

// 헬스체크 엔드포인트 (Render 무료티어용)
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    service: 'Base Revolt WebSocket Server',
    clients: {
      rcCar: clients.rcCar ? 'connected' : 'disconnected',
      webUsers: clients.webUsers.size
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// WebSocket 연결 처리
wss.on('connection', (ws, req) => {
  console.log('New connection from:', req.socket.remoteAddress);
  
  let clientType = null;
  
  // 헤더로 장치 타입 확인
  const deviceType = req.headers['x-device-type'];
  
  if (deviceType === 'rc-car') {
    clientType = 'rc-car';
    
    // 기존 RC카 연결이 있다면 끊기
    if (clients.rcCar) {
      clients.rcCar.close();
    }
    
    clients.rcCar = ws;
    console.log('✅ RC Car connected');
    
    // 모든 웹 사용자에게 RC카 연결 알림
    broadcastToWebUsers({
      type: 'rc-car-status',
      status: 'connected'
    });
  } else {
    clientType = 'web-user';
    clients.webUsers.add(ws);
    console.log(`✅ Web user connected (total: ${clients.webUsers.size})`);
    
    // 새 사용자에게 RC카 상태 알림
    if (clients.rcCar) {
      ws.send(JSON.stringify({
        type: 'rc-car-status',
        status: 'connected'
      }));
    } else {
      ws.send(JSON.stringify({
        type: 'rc-car-status',
        status: 'disconnected'
      }));
    }
  }
  
  // 메시지 수신 처리
  ws.on('message', (message) => {
    if (clientType === 'rc-car') {
      // RC카로부터 영상 데이터 → 모든 웹 사용자에게 브로드캐스트
      if (message instanceof Buffer) {
        // 바이너리 데이터 (JPEG 프레임)
        broadcastToWebUsers(message, true);
      } else {
        // 텍스트 데이터 (상태 정보 등)
        try {
          const data = JSON.parse(message.toString());
          console.log('RC Car message:', data);
        } catch (e) {
          // JSON 아닌 경우 무시
        }
      }
    } else if (clientType === 'web-user') {
      // 웹 사용자로부터 제어 명령 → RC카로 전달
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'control') {
          console.log('Control command:', data.command);
          
          if (clients.rcCar && clients.rcCar.readyState === ws.OPEN) {
            clients.rcCar.send(JSON.stringify(data));
          } else {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'RC car not connected'
            }));
          }
        }
      } catch (e) {
        console.error('Error parsing web user message:', e);
      }
    }
  });
  
  // 연결 종료 처리
  ws.on('close', () => {
    if (clientType === 'rc-car') {
      console.log('❌ RC Car disconnected');
      clients.rcCar = null;
      
      // 모든 웹 사용자에게 RC카 연결 해제 알림
      broadcastToWebUsers({
        type: 'rc-car-status',
        status: 'disconnected'
      });
    } else if (clientType === 'web-user') {
      clients.webUsers.delete(ws);
      console.log(`❌ Web user disconnected (remaining: ${clients.webUsers.size})`);
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
  
  clients.webUsers.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  });
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
  
  // 모든 클라이언트 연결 종료
  if (clients.rcCar) {
    clients.rcCar.close();
  }
  clients.webUsers.forEach(client => client.close());
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

