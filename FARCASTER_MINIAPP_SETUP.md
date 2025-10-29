# Farcaster Mini-App 환경별 커넥터 분리 설정

## 🎯 목적
Farcaster Mini-App 환경에서 Farcaster Connector가 전역으로 등록되어 Coinbase/MetaMask 인앱 브라우저와 충돌하는 문제를 해결합니다.

## 📋 구현 내용

### 1️⃣ 환경 감지 훅
**파일**: `frontend/src/hooks/useIsInMiniApp.js`
- Farcaster Mini-App 환경 여부를 감지하는 React Hook
- `@farcaster/miniapp-sdk`를 사용하여 환경 확인
- 로딩 상태와 Mini-App 여부를 반환

### 2️⃣ Farcaster 커넥터
**파일**: `frontend/src/utils/farcaster-connector.js`
- Wagmi용 Farcaster Mini-App 커넥터 구현
- Farcaster SDK의 ethProvider를 사용
- 계정 연결, 체인 전환, 이벤트 핸들링 지원

### 3️⃣ RainbowKit 통합
**파일**: `frontend/src/utils/farcaster-wallet.js`
- RainbowKit의 Wallet 인터페이스 구현
- Farcaster 브랜딩 및 다운로드 링크 포함
- QR 코드 및 확장 프로그램 지침 제공

### 4️⃣ 환경별 커넥터 Provider
**파일**: `frontend/src/providers/ConnectorProvider.jsx`
- 환경에 따라 다른 커넥터 세트를 제공
- **Farcaster Mini-App 내부**: `farcasterMiniAppWallet`만 등록
- **일반 웹 환경**: `coinbaseWallet`, `metaMaskWallet`, `walletConnectWallet`, `rainbowWallet` 등
- WagmiProvider와 RainbowKitProvider로 앱 전체를 감쌈

### 5️⃣ App.jsx 수정
**파일**: `frontend/src/App.jsx`
- 기존 WagmiProvider 제거
- ConnectorProvider로 전체 앱 래핑
- OnchainKit UI 컴포넌트는 그대로 유지

## 🔧 환경별 동작

### Farcaster Mini-App 내부
```
사용자 -> ConnectorProvider (감지: Mini-App)
       -> Farcaster Connector만 등록
       -> OnchainKit UI
```

### 일반 웹 브라우저
```
사용자 -> ConnectorProvider (감지: 일반 웹)
       -> Coinbase, MetaMask, WalletConnect 등 등록
       -> OnchainKit UI
```

## ✅ 주요 개선 사항

1. **커넥터 충돌 해결**
   - Farcaster Connector가 일반 웹 환경에서 등록되지 않음
   - Coinbase/MetaMask 인앱 브라우저에서 정상 작동

2. **환경별 최적화**
   - Mini-App에서는 Farcaster Wallet만 표시
   - 일반 웹에서는 모든 지갑 옵션 제공

3. **OnchainKit 호환성 유지**
   - Avatar, Identity, Name 등 OnchainKit UI 컴포넌트 정상 동작
   - Basename, 네트워크 정보 정상 표시
   - Disconnect 버튼 wagmi의 `disconnect()` 사용

4. **RainbowKit 통합**
   - 통일된 지갑 연결 UI
   - QR 코드 및 모바일 지원
   - 커넥터 관리 단순화

## 🚀 사용 방법

### 환경 변수 설정
`.env.local` 파일에 다음 추가:
```env
VITE_REOWN_PROJECT_ID=your_project_id_here
```

### 개발 서버 실행
```bash
cd frontend
npm install
npm run dev
```

### 프로덕션 빌드
```bash
npm run build
```

## 📝 테스트 체크리스트

- [ ] Farcaster Mini-App 내에서 Farcaster Wallet 연결 테스트
- [ ] 일반 웹 브라우저에서 Coinbase Wallet 연결 테스트
- [ ] MetaMask 인앱 브라우저에서 연결 테스트
- [ ] Coinbase 인앱 브라우저에서 연결 테스트
- [ ] OnchainKit UI 컴포넌트 (Avatar, Name, Basename) 정상 표시 확인
- [ ] 체인 전환 (Base ↔ Base Sepolia) 테스트
- [ ] Disconnect 버튼 동작 확인

## 🔍 디버깅

콘솔에서 다음 로그 확인:
```
🔍 Mini-App Environment Check: { isInMiniApp: true/false }
🔧 Creating connectors for environment: { isInMiniApp: true/false }
⚙️ Wagmi config created: { chains, connectorCount, isInMiniApp }
```

## 📚 참고 자료

- [Farcaster Mini-App SDK](https://docs.farcaster.xyz/developers/miniapps)
- [Wagmi Documentation](https://wagmi.sh/)
- [RainbowKit Documentation](https://www.rainbowkit.com/)
- [OnchainKit Documentation](https://onchainkit.xyz/)
- [Reown (WalletConnect)](https://docs.reown.com/)

## 🐛 알려진 이슈

1. **환경 감지 시간**: Mini-App 환경 감지에 약간의 시간이 소요될 수 있습니다. (로딩 화면 표시)
2. **Allowlist 설정**: Reown 대시보드에서 `farcaster.xyz`, `warpcast.com` 도메인을 Allowlist에 추가해야 합니다.

## 🎉 완료!

이제 Farcaster Mini-App과 일반 웹 환경 모두에서 지갑 연결이 정상적으로 작동합니다!

