# Base Revolt 스마트 컨트랙트

## TicketSale.sol

10분 플레이 티켓($0.5)을 판매하는 간단한 컨트랙트입니다.

## 배포 방법 (Remix IDE)

### 1. Remix IDE에서 배포
1. https://remix.ethereum.org 접속
2. `TicketSale.sol` 파일 생성 및 코드 복사
3. Solidity 컴파일러 버전: 0.8.20 이상
4. 컴파일

### 2. Base 메인넷 연결
1. MetaMask에 Base 네트워크 추가
   - Network Name: Base Mainnet
   - RPC URL: https://mainnet.base.org
   - Chain ID: 8453
   - Currency Symbol: ETH
   - Block Explorer: https://basescan.org

2. Base ETH 준비 (가스비용)
   - Coinbase에서 Base로 브릿지
   - 또는 https://bridge.base.org 사용

### 3. 배포
1. Remix에서 "Deploy & Run Transactions" 탭
2. Environment: "Injected Provider - MetaMask"
3. MetaMask에서 Base 네트워크 선택
4. Contract: TicketSale 선택
5. Deploy 클릭
6. MetaMask에서 트랜잭션 승인
7. 배포된 컨트랙트 주소 복사

### 4. 가격 설정 (선택사항)
배포 후 실제 ETH/USD 환율에 맞춰 가격 조정:

```solidity
// 예: $0.5 = 0.0002 ETH (ETH가 $2500일 때)
updatePrice(200000000000000) // 0.0002 ETH in wei
```

가격 계산기: https://eth-converter.com/

### 5. 컨트랙트 주소 저장
배포된 컨트랙트 주소를 `frontend/src/config/contracts.js`에 저장:

```javascript
export const TICKET_CONTRACT_ADDRESS = "0x..."; // 여기에 배포된 주소
```

## 컨트랙트 함수

### buyTicket()
- 티켓 구매 (0.5 USD 상당 ETH 전송)
- 10분 플레이 시간 부여
- `TicketPurchased` 이벤트 발생

### updatePrice(newPrice)
- Owner만 호출 가능
- 티켓 가격 업데이트 (wei 단위)

### withdraw()
- Owner만 호출 가능
- 컨트랙트에 쌓인 수익 인출

### getBalance()
- 컨트랙트 잔액 조회

## 이벤트

```solidity
event TicketPurchased(
    address indexed buyer,
    uint256 amount,
    uint256 timestamp,
    uint256 duration
);
```

프론트엔드에서 이 이벤트를 감지하여 티켓 구매 확인 가능.

## 보안 고려사항

**주의:** 이 컨트랙트는 MVP용 단순 버전입니다.
프로덕션 배포 시 다음 사항 고려:

1. **티켓 검증**: 현재는 이벤트만 발생. 실제로는 티켓 NFT 발행 또는 오프체인 검증 필요
2. **재진입 공격**: `withdraw()`는 checks-effects-interactions 패턴 사용
3. **가격 오라클**: Chainlink 등으로 실시간 USD 가격 반영
4. **업그레이드 가능성**: Proxy 패턴 고려

## 테스트넷 사용 (선택)

Base Goerli 테스트넷에서 먼저 테스트:
- Network: Base Goerli
- Chain ID: 84531
- Faucet: https://faucet.quicknode.com/base/goerli

