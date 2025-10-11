# Base Revolt WebSocket Server

ESP32-CAM RC카와 웹 클라이언트를 중계하는 WebSocket 서버입니다.

## 기능

- ESP32-CAM으로부터 영상 스트림 수신
- 웹 클라이언트에게 영상 브로드캐스트
- 웹 클라이언트로부터 제어 명령 수신
- ESP32-CAM에게 제어 명령 전달

## 로컬 개발

```bash
npm install
npm start
```

서버가 `http://localhost:8080`에서 실행됩니다.

WebSocket 엔드포인트: `ws://localhost:8080`

## Render 배포

### 1. Render 계정 생성
https://render.com 에서 가입

### 2. 새 Web Service 생성

1. Dashboard → "New +" → "Web Service"
2. GitHub 리포지토리 연결
3. 다음 설정:
   - **Name**: base-revolt-server (원하는 이름)
   - **Region**: Singapore (또는 가장 가까운 지역)
   - **Branch**: main
   - **Root Directory**: `server`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

4. "Create Web Service" 클릭

### 3. 배포 완료 대기

초기 배포는 2-3분 소요됩니다.

배포 완료 후 URL 확인:
- 예: `https://base-revolt-server.onrender.com`

### 4. URL 복사

이 URL을 다음에 사용:
- ESP32 펌웨어: `ws_host` 설정
- 프론트엔드: `WS_SERVER_URL` 설정

**⚠️ 주의**: 
- HTTP URL: `https://your-app.onrender.com`
- WebSocket URL: `wss://your-app.onrender.com` (wss:// 사용)

### 5. 헬스체크 확인

브라우저에서 `https://your-app.onrender.com` 접속 시:

```json
{
  "status": "running",
  "service": "Base Revolt WebSocket Server",
  "clients": {
    "rcCar": "disconnected",
    "webUsers": 0
  }
}
```

## Render 무료 티어 제한사항

### Sleep 모드
- 15분 동안 요청이 없으면 서버가 sleep
- 다음 요청 시 자동으로 재시작 (30초~1분 소요)
- 해결책: 주기적으로 헬스체크 호출 (선택사항)

### 월 750시간 제한
- 무료 플랜은 월 750시간까지 사용 가능
- 1개 서버 상시 가동 시 충분함 (~720시간/월)

### 대역폭
- 무료 플랜: 100GB/월
- 영상 스트리밍에는 충분함

## 아키텍처

```
[ESP32-CAM RC Car]
       |
       | WebSocket (device)
       v
[Render WebSocket Server]
       |
       | WebSocket (broadcast)
       v
[Web Users] (multiple)
```

### 메시지 흐름

**RC카 → 서버 → 웹:**
```javascript
// 바이너리 (영상)
Buffer<JPEG data> → broadcast to all web users

// 텍스트 (상태)
{ "type": "device", "status": "connected" }
```

**웹 → 서버 → RC카:**
```javascript
// 제어 명령
{ "type": "control", "command": "forward" }
{ "type": "control", "command": "left" }
{ "type": "control", "command": "stop" }
```

## API 엔드포인트

### GET /
헬스체크 및 상태 확인

**Response:**
```json
{
  "status": "running",
  "service": "Base Revolt WebSocket Server",
  "clients": {
    "rcCar": "connected" | "disconnected",
    "webUsers": 2
  }
}
```

### GET /health
간단한 헬스체크 (Render용)

**Response:**
```json
{
  "status": "ok"
}
```

### WebSocket /
양방향 WebSocket 연결

**헤더로 클라이언트 타입 구분:**
- `X-Device-Type: rc-car` → RC카로 인식
- 헤더 없음 → 웹 사용자로 인식

## 로그 확인

Render Dashboard → 서비스 선택 → "Logs" 탭

실시간으로 다음 확인 가능:
- RC카 연결/해제
- 웹 사용자 연결/해제
- 제어 명령
- 에러

## 트러블슈팅

### RC카가 연결 안됨

1. **ESP32 펌웨어 확인:**
   - WiFi SSID/비밀번호 정확한지
   - `ws_host`가 올바른지 (도메인만, `wss://` 제외)
   - 예: `base-revolt-server.onrender.com`

2. **Render 서버 상태:**
   - Dashboard에서 서버가 Running인지 확인
   - Logs에서 에러 확인

3. **방화벽:**
   - ESP32가 외부 네트워크 접근 가능한지

### 웹 사용자가 연결 안됨

1. **URL 확인:**
   - `wss://`로 시작해야 함 (https가 아님)
   - 예: `wss://base-revolt-server.onrender.com`

2. **CORS:**
   - WebSocket은 CORS 영향 안받음
   - 브라우저 콘솔 확인

3. **서버 Sleep:**
   - 첫 연결 시 30초~1분 대기
   - Render 무료티어 특성상 정상

### 영상이 끊김

1. **네트워크:**
   - ESP32의 WiFi 신호 강도 확인
   - 공유기와 거리 가깝게

2. **해상도:**
   - ESP32 펌웨어에서 QVGA (320x240) 사용 중
   - 더 낮은 해상도로 변경 가능

3. **프레임레이트:**
   - 현재 ~15 FPS
   - 펌웨어에서 `frameInterval` 조정

## 환경 변수

현재는 환경 변수 없이 작동합니다.

필요 시 Render Dashboard → Environment 탭에서 추가 가능.

## 모니터링

### Render 대시보드
- CPU/메모리 사용량
- 요청 수
- 에러 로그

### 커스텀 모니터링 (선택)
원한다면 Sentry, LogRocket 등 추가 가능

## 업그레이드 고려사항

무료 티어로 충분하지만, 다음이 필요하면 유료 전환:

- **Sleep 제거**: $7/월 (Starter)
- **더 많은 대역폭**: $7/월
- **더 빠른 성능**: $25/월 (Standard)

## 대안 플랫폼

- **Railway**: 무료 $5 크레딧/월
- **Fly.io**: 무료 3개 VM
- **Heroku**: 무료 티어 폐지됨

Render 추천 이유: 설정 간단, 안정적, WebSocket 지원

