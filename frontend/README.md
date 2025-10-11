# Base Revolt Frontend

React + Vite + OnchainKit 기반 웹 애플리케이션

## 설치

```bash
npm install
```

## 환경 변수 설정

프로젝트 루트에 `.env` 파일 생성:

```env
# OnchainKit API Key (https://portal.cdp.coinbase.com/)
VITE_ONCHAINKIT_API_KEY=your_api_key_here

# WebSocket 서버 URL (Render 배포 후)
VITE_WS_SERVER_URL=wss://your-render-app.onrender.com
```

### OnchainKit API Key 받기

1. https://portal.cdp.coinbase.com/ 접속
2. 로그인 또는 회원가입
3. "Create API Key" 클릭
4. API Key 복사하여 `.env`에 붙여넣기

## 개발 모드 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 열기

## 빌드

```bash
npm run build
```

빌드된 파일은 `dist/` 폴더에 생성됩니다.

## Vercel 배포

### 1. GitHub에 푸시

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Vercel에서 배포

1. https://vercel.com 접속
2. "Import Project" 클릭
3. GitHub 리포지토리 선택
4. 프로젝트 설정:
   - Framework Preset: **Vite**
   - Root Directory: **frontend**
   - Build Command: `npm run build`
   - Output Directory: `dist`

5. 환경 변수 추가:
   - `VITE_ONCHAINKIT_API_KEY`: OnchainKit API Key
   - `VITE_WS_SERVER_URL`: WebSocket 서버 URL

6. Deploy 클릭

### 3. 배포 후 확인

배포 완료 후 Vercel이 제공하는 URL로 접속하여 확인

## 프로젝트 구조

```
frontend/
├── src/
│   ├── components/
│   │   ├── VideoStream.jsx    # 영상 스트림 표시
│   │   ├── VideoStream.css
│   │   ├── Controller.jsx     # RC카 컨트롤러
│   │   └── Controller.css
│   ├── pages/
│   │   ├── Home.jsx           # 홈페이지 (지갑 연결 + 결제)
│   │   ├── Home.css
│   │   ├── Play.jsx           # 플레이 페이지
│   │   └── Play.css
│   ├── config/
│   │   ├── wagmi.js           # Wagmi 설정
│   │   └── contracts.js       # 컨트랙트 주소 및 ABI
│   ├── App.jsx                # 라우팅
│   └── main.jsx               # 엔트리 포인트
├── index.html
├── vite.config.js
└── package.json
```

## 주요 기능

### 1. 지갑 연결 (OnchainKit)
- Coinbase Wallet Smart Wallet 지원
- Base 메인넷 연결

### 2. 티켓 구매
- $0.5 = 10분 플레이 시간
- Base 메인넷 스마트 컨트랙트 결제

### 3. 실시간 영상 스트림
- WebSocket으로 ESP32-CAM 영상 수신
- Canvas로 JPEG 프레임 렌더링
- FPS 카운터

### 4. RC카 조종
- 키보드: W/A/S/D 또는 방향키
- 터치: 화면 버튼
- 실시간 WebSocket 통신

### 5. 타이머
- 10분 카운트다운
- 시간 종료 시 자동 종료

## 트러블슈팅

### OnchainKit 관련 에러
- API Key가 올바른지 확인
- Base 네트워크 설정 확인

### WebSocket 연결 실패
- 서버 URL이 올바른지 확인 (`wss://`)
- Render 서버가 실행 중인지 확인
- CORS 설정 확인

### 컨트랙트 호출 실패
- 컨트랙트 주소가 올바른지 확인 (`src/config/contracts.js`)
- 지갑에 Base ETH가 충분한지 확인
- 네트워크가 Base 메인넷인지 확인

## 배포 체크리스트

- [ ] OnchainKit API Key 발급
- [ ] 스마트 컨트랙트 Base 메인넷 배포
- [ ] 컨트랙트 주소 `src/config/contracts.js`에 업데이트
- [ ] Render 서버 배포
- [ ] WebSocket URL `.env`에 업데이트
- [ ] Vercel 배포
- [ ] 환경 변수 Vercel에 추가
- [ ] 배포된 사이트 테스트

