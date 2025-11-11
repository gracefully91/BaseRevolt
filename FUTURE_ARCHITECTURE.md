# 🚀 Future Architecture Plan / 미래 아키텍처 계획

## 🇺🇸 English

### 📌 Goal
Our current system routes all video and control traffic through the Render server. As the business scales, server costs will spike. We plan to shift to a **direct P2P architecture** to minimize server load and bandwidth fees.

---

### 🏗️ Current Architecture (v1.0 – WebSocket Relay)
```
[Browser] ⟷ WebSocket ⟷ [Render Server] ⟷ WebSocket ⟷ [ESP32-S3 Camera]
                                 ↕                       ⟷ [ESP-32S Control]
                            Relay Server
                        (All traffic flows through it)
```
#### Pros
- ✅ No NAT/firewall issues
- ✅ Safe browser access (no CORS headaches)
- ✅ No device IP management
- ✅ Security: ESP32 devices stay hidden

#### Cons
- ❌ High server bandwidth (video heavy)
- ❌ Added latency (two hops)
- ❌ Single point of failure (server outage = downtime)

---

### 🎯 Target Architecture (v2.0 – Hybrid P2P)

#### Migration Phases

##### Phase 1: Camera Stream P2P (Top Priority ⭐⭐⭐)
```
[Browser] ⟷ HTTP ⟷ [ESP32-S3 Camera]   (Video – direct)
    ↕
WebSocket ⟷ [Render Server] ⟷ [ESP-32S Control]   (Control – keep relay)
```
👉 Offload only the video path to P2P → ~90% bandwidth savings.

##### Phase 2: Full WebRTC Stack (Long-term)
```
[Browser] ⟷ WebRTC ⟷ [ESP32 (Camera + Control)]
    ↕
[Render – Signaling Only]   (No media/data traffic)
```
👉 Send control commands over a WebRTC data channel.

---

### 📋 Phase 1 Implementation Plan (Camera P2P)

#### 1. Add an HTTP MJPEG Server on ESP32-S3
```cpp
// Add MJPEG HTTP server to ESP32-S3
#include "esp_http_server.h"

httpd_handle_t camera_httpd = NULL;

void startCameraServer() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 8080;
  
  if (httpd_start(&camera_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(camera_httpd, &stream_uri);
    Serial.println("Camera HTTP server started on :8080");
  }
}

// Provide /stream endpoint
esp_err_t stream_handler(httpd_req_t *req) {
  // MJPEG multipart response
  // ... see esp32-camera example
}
```

#### 2. Add a Render Backend API
```javascript
// GET /api/cars/:carId/camera
app.get('/api/cars/:carId/camera', (req, res) => {
  const { carId } = req.params;
  const device = devices.get(carId);
  
  if (!device || !device.camera) {
    return res.status(404).json({ error: 'Camera not found' });
  }
  
  // Return public IP + streamUrl reported by ESP32-S3
  res.json({
    carId: carId,
    streamUrl: device.camera.streamUrl,  // "http://x.x.x.x:8080/stream"
    quality: device.camera.quality || 'high'
  });
});
```

#### 3. Include streamUrl When the Camera Registers
```cpp
// ESP32-S3 registration payload
void sendRegistration() {
  // ESP32 only knows its local IP
  // → Server should capture the source IP
  // → Or use a STUN server to discover public IP
  
  String localIP = WiFi.localIP().toString();
  
  DynamicJsonDocument doc(256);
  doc["type"] = "register";
  doc["deviceId"] = DEVICE_ID;
  doc["role"] = "camera";
  doc["streamUrl"] = "http://" + localIP + ":8080/stream";  // Phase 1: local IP
  // TODO Phase 1.5: configure DDNS / port forwarding
  
  String payload;
  serializeJson(doc, payload);
  webSocket.sendTXT(payload);
}
```

#### 4. Frontend Updates
```javascript
// VideoStream.jsx
const [cameraStreamUrl, setCameraStreamUrl] = useState(null);

useEffect(() => {
  // Fetch camera URL after session is granted
  fetch(`${API_URL}/api/cars/${carId}/camera`)
    .then(res => res.json())
    .then(data => {
      setCameraStreamUrl(data.streamUrl);
    });
}, [carId]);

// Use <img> instead of WebSocket binary frames
return (
  <div>
    {cameraStreamUrl ? (
      <img 
        src={cameraStreamUrl} 
        alt="RC Car Camera" 
        style={{ width: '100%' }}
      />
    ) : (
      <div>Loading camera...</div>
    )}
  </div>
);
```

---

### 🔧 Phase 1 Deployment Requirements

#### Network Setup
1. **Port Forwarding (Required)**
   - Map `8080 → ESP32-S3 IP:8080` on the router
   - Or place the ESP32-S3 in DMZ
2. **DDNS (Recommended)**
   - Use No-IP, DuckDNS, etc.
   - ESP32-S3 updates its DDNS record on boot
   - streamUrl example: `http://mycar.ddns.net:8080/stream`
3. **Security**
   - Add HTTP Basic Auth (simple password)
  - Or token-based auth
   - HTTPS is optional (ESP32 performance constraints)

#### Expected Impact
| Item | Before (v1.0) | After (v2.0 Phase 1) |
|------|---------------|-----------------------|
| Server traffic | 100% | **10%** |
| Video latency | 300-500 ms | **100-200 ms** |
| Concurrent users | ~50 | **~500** (10× capacity)
| Monthly server cost | $50-100 | **$5-10** |

---

### 🚀 Phase 2: Full WebRTC (Long-term)
#### Pros
- ✅ True P2P (server handles signaling only)
- ✅ Low latency via UDP (< 100 ms)
- ✅ Automatic NAT traversal (STUN/TURN)
- ✅ Built-in encryption (DTLS)

#### Cons
- ❌ Complex to implement on ESP32 (limited libs)
- ❌ Requires a TURN server (certain NATs)
- ❌ Adds ~2 months of development

#### Alternative: Pion WebRTC (Go)
- Consider upgrading hardware to **Raspberry Pi + Go** for richer WebRTC support.

---

### 📊 Cost Simulation
**Scenario:** 1,000 monthly users, 10 minutes per session
| Item | v1.0 Relay | v2.0 P2P | Savings |
|------|------------|----------|---------|
| Render bandwidth | 500 GB | 50 GB | -90% |
| Server cost | $80/mo | $7/mo | **$73/mo** |
| Perceived latency | 400 ms | 150 ms | – |
| Single point of failure | 1 (server) | 0 (P2P) | – |

---

### ✅ Execution Checklist

#### Phase 1 (Camera P2P)
- [ ] Add HTTP server code to ESP32-S3
- [ ] Configure router port forwarding
- [ ] Create & configure DDNS account
- [ ] Add Render API endpoint
- [ ] Switch frontend to `<img>` mode
- [ ] Measure latency in KR / US / EU
- [ ] Review security (HTTP Auth)

#### Phase 2 (WebRTC)
- [ ] Research ESP32 WebRTC libraries
- [ ] Evaluate Raspberry Pi migration
- [ ] Set up STUN/TURN (Coturn)
- [ ] Implement WebRTC peer in frontend
- [ ] Add relay fallback on P2P failure

---

### 📚 References
- [ESP32 Camera HTTP Server Example](https://github.com/espressif/esp32-camera/tree/master/examples/camera_web_server)
- [WebRTC for IoT](https://github.com/pion/webrtc)
- [No-IP DDNS Getting Started](https://www.noip.com/support/knowledgebase/getting-started-with-no-ip-com/)
- [Coturn TURN Server](https://github.com/coturn/coturn)

---

**Published:** 2025-11-10  
**Status:** Planning (stabilize v1.0 first, then start Phase 1)

---

## 🇰🇷 한국어

### 📌 목적
현재 시스템은 모든 영상/제어 트래픽이 Render 서버를 경유합니다.
사업이 성장하면 서버 비용이 급증할 수 있으므로, **P2P 직접 연결 방식**으로 전환하여 서버 부하를 최소화합니다.

---

### 🏗️ 현재 아키텍처 (v1.0 - WebSocket 릴레이)
```
[브라우저] ⟷ WebSocket ⟷ [Render 서버] ⟷ WebSocket ⟷ [ESP32-S3 카메라]
                              ↕                         ⟷ [ESP-32S 조종]
                         릴레이 서버
                      (모든 트래픽 경유)
```
#### 장점
- ✅ NAT/방화벽 문제 없음
- ✅ 브라우저에서 안전한 접근 (CORS 없음)
- ✅ 디바이스 IP 관리 불필요
- ✅ 보안 (ESP32 직접 노출 안 함)

#### 단점
- ❌ 서버 대역폭 비용 (영상 트래픽 폭탄)
- ❌ 지연 시간 증가 (2 hop)
- ❌ 서버 다운 시 전체 서비스 중단

---

### 🎯 미래 아키텍처 (v2.0 - 하이브리드 P2P)

#### 단계별 마이그레이션

##### Phase 1: 카메라 스트림 P2P 전환 (우선순위 ⭐⭐⭐)
```
[브라우저] ⟷ HTTP ⟷ [ESP32-S3 카메라]  (영상 - 직접 연결)
     ↕
WebSocket ⟷ [Render 서버] ⟷ [ESP-32S 조종]  (제어 - 릴레이 유지)
```
**영상만 P2P로 분리** → 서버 대역폭 90% 절감

##### Phase 2: WebRTC 풀스택 (장기 목표)
```
[브라우저] ⟷ WebRTC ⟷ [ESP32 (Camera + Control)]
     ↕
[Render - Signaling Only]  (시그널링만 담당, 트래픽 제로)
```
**WebRTC 데이터 채널**로 제어 명령 전송

---

### 📋 Phase 1 구현 계획 (카메라 P2P)

#### 1. ESP32-S3 카메라 HTTP 서버 추가
```cpp
// ESP32-S3에 MJPEG HTTP 서버 추가
#include "esp_http_server.h"

httpd_handle_t camera_httpd = NULL;

void startCameraServer() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 8080;
  
  if (httpd_start(&camera_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(camera_httpd, &stream_uri);
    Serial.println("Camera HTTP server started on :8080");
  }
}

// /stream 엔드포인트 제공
esp_err_t stream_handler(httpd_req_t *req) {
  // MJPEG multipart response
  // ... (esp32-camera 예제 참고)
}
```

#### 2. Render 백엔드 API 추가
```javascript
// GET /api/cars/:carId/camera
app.get('/api/cars/:carId/camera', (req, res) => {
  const { carId } = req.params;
  const device = devices.get(carId);
  
  if (!device || !device.camera) {
    return res.status(404).json({ error: 'Camera not found' });
  }
  
  // ESP32-S3의 공인 IP + streamUrl 반환
  res.json({
    carId: carId,
    streamUrl: device.camera.streamUrl,  // "http://x.x.x.x:8080/stream"
    quality: device.camera.quality || 'high'
  });
});
```

#### 3. 카메라 등록 시 streamUrl 포함
```cpp
// ESP32-S3 등록 메시지
void sendRegistration() {
  // 공인 IP 획득 (ESP32에서는 로컬 IP만 알 수 있음)
  // → 서버가 연결 소스 IP를 감지하거나
  // → STUN 서버로 공인 IP 조회 필요
  
  String localIP = WiFi.localIP().toString();
  
  DynamicJsonDocument doc(256);
  doc["type"] = "register";
  doc["deviceId"] = DEVICE_ID;
  doc["role"] = "camera";
  doc["streamUrl"] = "http://" + localIP + ":8080/stream";  // Phase 1: 로컬 IP
  // TODO Phase 1.5: DDNS or 포트포워딩 설정 필요
  
  String payload;
  serializeJson(doc, payload);
  webSocket.sendTXT(payload);
}
```

#### 4. 프론트엔드 수정
```javascript
// VideoStream.jsx
const [cameraStreamUrl, setCameraStreamUrl] = useState(null);

useEffect(() => {
  // 세션 승인 후 카메라 URL 조회
  fetch(`${API_URL}/api/cars/${carId}/camera`)
    .then(res => res.json())
    .then(data => {
      setCameraStreamUrl(data.streamUrl);
    });
}, [carId]);

// WebSocket 프레임 수신 대신 <img> 태그 사용
return (
  <div>
    {cameraStreamUrl ? (
      <img 
        src={cameraStreamUrl} 
        alt="RC Car Camera" 
        style={{ width: '100%' }}
      />
    ) : (
      <div>Loading camera...</div>
    )}
  </div>
);
```

---

### 🔧 Phase 1 배포 요구사항

#### 네트워크 설정
1. **포트 포워딩 (필수)**
   - 공유기에서 `8080 → ESP32-S3 IP:8080` 포워딩 설정
   - 또는 DMZ 호스트로 ESP32-S3 설정
2. **DDNS (동적 DNS) 설정 (권장)**
   - No-IP, DuckDNS 등 무료 DDNS 서비스 이용
   - ESP32-S3가 부팅 시 DDNS IP 업데이트
   - streamUrl: `http://mycar.ddns.net:8080/stream`
3. **보안**
   - HTTP Basic Auth 추가 (간단한 비밀번호 보호)
   - 또는 토큰 기반 인증
   - HTTPS는 ESP32 성능 이슈로 보류

#### 예상 효과
| 항목 | Before (v1.0) | After (v2.0 Phase 1) |
|------|---------------|----------------------|
| 서버 트래픽 | 100% | **10%** |
| 영상 지연 | 300-500ms | **100-200ms** |
| 동시 접속자 | ~50명 | **~500명** (서버 부하 10배 감소) |
| 월 서버 비용 | $50-100 | **$5-10** |

---

### 🚀 Phase 2: WebRTC 풀스택 (장기)
#### 장점
- ✅ 완전한 P2P (서버는 시그널링만)
- ✅ UDP 기반 저지연 (< 100ms)
- ✅ 자동 NAT 트래버설 (STUN/TURN)
- ✅ 암호화 기본 제공 (DTLS)

#### 단점
- ❌ ESP32에 WebRTC 구현 복잡 (라이브러리 제한)
- ❌ TURN 서버 필요 (일부 NAT 환경)
- ❌ 개발 기간 +2개월

#### 대안: Pion WebRTC (Go)
ESP32 대신 **라즈베리파이 + Go** 로 업그레이드 고려

---

### 📊 비용 비교 시뮬레이션
#### 시나리오: 월 1000명 이용 (평균 10분/세션)
| 항목 | v1.0 릴레이 | v2.0 P2P | 절감액 |
|------|------------|----------|--------|
| Render 대역폭 | 500 GB | 50 GB | -90% |
| 서버 비용 | $80/월 | $7/월 | **$73/월** |
| 사용자 체감 지연 | 400ms | 150ms | - |
| 장애 포인트 | 1개 (서버) | 0개 (P2P) | - |

---

### ✅ 실행 체크리스트

#### Phase 1 준비 (카메라 P2P)
- [ ] ESP32-S3에 HTTP 서버 코드 추가
- [ ] 공유기 포트 포워딩 설정
- [ ] DDNS 계정 생성 및 설정
- [ ] Render 백엔드 API 엔드포인트 추가
- [ ] 프론트엔드 <img> 태그 방식으로 전환
- [ ] 3개 지역에서 지연 시간 측정 (한국/미국/유럽)
- [ ] 보안 점검 (HTTP Auth 추가)

#### Phase 2 준비 (WebRTC)
- [ ] ESP32 WebRTC 라이브러리 조사
- [ ] 라즈베리파이 마이그레이션 검토
- [ ] STUN/TURN 서버 설정 (Coturn)
- [ ] 프론트엔드 WebRTC Peer 구현
- [ ] 폴백 메커니즘 (P2P 실패 시 릴레이)

---

### 📚 참고 자료
- [ESP32 Camera HTTP Server Example](https://github.com/espressif/esp32-camera/tree/master/examples/camera_web_server)
- [WebRTC for IoT](https://github.com/pion/webrtc)
- [No-IP DDNS 설정 가이드](https://www.noip.com/support/knowledgebase/getting-started-with-no-ip-com/)
- [Coturn TURN 서버](https://github.com/coturn/coturn)

---

**작성일**: 2025-11-10  
**상태**: 계획 단계 (v1.0 먼저 안정화 후 Phase 1 착수)

