// 스마트 컨트랙트 설정
// Base 메인넷에 배포 후 주소 업데이트 필요

export const TICKET_CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000"; // TODO: 배포 후 업데이트

export const TICKET_CONTRACT_ABI = [
  {
    "inputs": [],
    "name": "buyTicket",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "ticketPrice",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "buyer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "duration",
        "type": "uint256"
      }
    ],
    "name": "TicketPurchased",
    "type": "event"
  }
];

// WebSocket 서버 설정
export const WS_SERVER_URL = import.meta.env.VITE_WS_SERVER_URL || "wss://your-render-app.onrender.com";

