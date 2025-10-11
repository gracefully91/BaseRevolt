// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Base Revolt Ticket Sale
 * @notice Simple ticket purchase contract for Base Revolt RC Car play sessions
 * @dev $0.01 per 10-minute ticket (TEST VERSION)
 */
contract TicketSale {
    // 티켓 가격 (0.01 USD 상당의 ETH, Base 메인넷 기준) - 테스트용
    // 실제 가격은 배포 시 ETH/USD 환율에 맞춰 설정
    uint256 public ticketPrice = 0.00001 ether; // ~$0.025 (테스트용)
    
    // 컨트랙트 소유자 (수익 인출용)
    address public owner;
    
    // 티켓 구매 이벤트
    event TicketPurchased(
        address indexed buyer,
        uint256 amount,
        uint256 timestamp,
        uint256 duration
    );
    
    // 가격 변경 이벤트
    event PriceUpdated(uint256 oldPrice, uint256 newPrice);
    
    // 수익 인출 이벤트
    event Withdrawn(address indexed owner, uint256 amount);
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    /**
     * @notice 티켓 구매
     * @dev 최소 금액 이상을 보내야 함 (0.01 USD 상당의 ETH)
     */
    function buyTicket() external payable {
        require(msg.value >= ticketPrice, "Insufficient payment amount");
        
        // 10분 = 600초
        uint256 duration = 600;
        
        emit TicketPurchased(msg.sender, msg.value, block.timestamp, duration);
    }
    
    /**
     * @notice 티켓 가격 업데이트 (owner만 가능)
     * @param newPrice 새로운 가격 (wei 단위)
     */
    function updatePrice(uint256 newPrice) external onlyOwner {
        uint256 oldPrice = ticketPrice;
        ticketPrice = newPrice;
        emit PriceUpdated(oldPrice, newPrice);
    }
    
    /**
     * @notice 수익 인출 (owner만 가능)
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        (bool success, ) = owner.call{value: balance}("");
        require(success, "Withdrawal failed");
        
        emit Withdrawn(owner, balance);
    }
    
    /**
     * @notice 컨트랙트 잔액 조회
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @notice 현재 티켓 가격 조회 (USD 센트 단위로 변환)
     * @dev 프론트엔드에서 사용자 친화적 표시용
     */
    function getTicketPriceInCents() external view returns (uint256) {
        // 이 함수는 오프체인에서 환율 계산 후 표시하는 것이 더 정확
        // 온체인에서는 단순히 wei 값만 반환
        return ticketPrice;
    }
}

