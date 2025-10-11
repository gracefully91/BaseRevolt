# ⚡ Base Revolt 빠른 시작 가이드

> 최소 설정으로 5분 안에 데모 실행하기

## 🎯 목표

하드웨어 없이 웹 UI만 먼저 확인하고 싶다면 이 가이드를 따라하세요.

---

## 1️⃣ 로컬에서 프론트엔드 실행 (3분)

### 필요사항
- Node.js 18 이상
- npm 또는 yarn

### 단계

```bash
# 1. 리포지토리 클론
git clone https://github.com/YOUR_USERNAME/base-revolt.git
cd base-revolt

# 2. 프론트엔드 디렉토리로 이동
cd frontend

# 3. 의존성 설치
npm install

# 4. 개발 서버 실행
npm run dev
```

브라우저에서 http://localhost:3000 접속

### 데모 모드 체험

1. 홈페이지에서 **"데모 체험하기"** 클릭
2. 조종 UI 확인
3. 키보드 (W/A/S/D) 또는 화면 버튼 클릭해보기

**주의**: 데모 모드는 실제 RC카 없이 UI만 체험하는 모드입니다.

---

## 2️⃣ 로컬에서 서버 실행 (2분)

별도 터미널에서:

```bash
# 1. 서버 디렉토리로 이동
cd server

# 2. 의존성 설치
npm install

# 3. 서버 실행
npm start
```

서버가 http://localhost:8080 에서 실행됩니다.

브라우저에서 http://localhost:8080 접속하여 서버 상태 확인.

---

## 3️⃣ ESP32 시뮬레이션 (선택)

실제 ESP32 없이 테스트하려면:

### 간단한 WebSocket 클라이언트 (Python)

```python
# test_client.py
import asyncio
import websockets

async def test():
    uri = "ws://localhost:8080"
    async with websockets.connect(uri, extra_headers={
        "X-Device-Type": "rc-car"
    }) as ws:
        print("Connected as RC car")
        
        # 연결 메시지
        await ws.send('{"type":"device","device":"rc-car","status":"connected"}')
        
        # 메시지 수신
        while True:
            msg = await ws.recv()
            print(f"Received: {msg}")

asyncio.run(test())
```

실행:
```bash
pip install websockets
python test_client.py
```

이제 웹 UI에서 "RC카 연결됨" 상태로 바뀝니다!

---

## 4️⃣ 전체 시스템 없이 UI만 확인

### 스마트 컨트랙트 없이 테스트

`frontend/src/pages/Home.jsx`에서 임시로 수정:

```javascript
const handleDemoPlay = () => {
  // 데모 모드로 바로 플레이
  navigate('/play?demo=true');
};
```

이렇게 하면 지갑 연결이나 결제 없이 바로 플레이 화면으로 이동 가능.

---

## 🚀 다음 단계

로컬 테스트가 완료되었다면:

1. [DEPLOYMENT.md](DEPLOYMENT.md) - 실제 배포 가이드
2. [README.md](README.md) - 전체 프로젝트 문서
3. [hardware/README.md](hardware/README.md) - 하드웨어 조립

---

## 💡 팁

### Hot Reload
Vite는 코드 변경 시 자동으로 새로고침됩니다.

### 포트 변경
`frontend/vite.config.js`에서 포트 변경 가능:
```javascript
server: {
  port: 3000, // 원하는 포트
}
```

### 디버깅
- 브라우저 개발자 도구 (F12) → Console 탭
- WebSocket 연결 상태 확인
- 네트워크 탭에서 WS 트래픽 확인

---

## ❓ FAQ

**Q: 영상이 안보여요**
A: 로컬 테스트에서는 실제 ESP32가 없으면 영상이 안보입니다. 정상입니다.

**Q: RC카가 연결 안됨**
A: 로컬 서버만 실행했다면 ESP32를 연결하거나 위의 Python 시뮬레이터를 사용하세요.

**Q: 지갑 연결이 안돼요**
A: OnchainKit API Key가 필요합니다. `.env` 파일에 추가하세요.

**Q: 결제가 안돼요**
A: 스마트 컨트랙트를 먼저 배포해야 합니다. 또는 데모 모드를 사용하세요.

---

## 🎉 완료!

로컬에서 Base Revolt UI를 확인했습니다.

이제 실제 배포를 위해 [DEPLOYMENT.md](DEPLOYMENT.md)를 참고하세요!

