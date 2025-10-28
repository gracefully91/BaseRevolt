// Base 네트워크는 ENS를 지원하지 않으므로 ENS 기능을 비활성화
// 대신 주소 기반 아바타와 표시명을 사용

// ENS 이름 해결 함수 (Base에서는 비활성화)
export async function resolveENSName(address) {
  // Base 네트워크는 ENS를 지원하지 않음
  console.log('Base 네트워크는 ENS를 지원하지 않습니다.');
  return null;
}

// ENS 아바타 가져오기 함수 (Base에서는 비활성화)
export async function getENSAvatar(ensName) {
  // Base 네트워크는 ENS를 지원하지 않음
  console.log('Base 네트워크는 ENS를 지원하지 않습니다.');
  return null;
}

// Base 네트워크 아바타 가져오기 (더 간단한 방법)
export async function getBaseAvatar(address) {
  try {
    if (!address) return null;
    
    // Base 네트워크에서 아바타를 가져오는 다른 방법들 시도
    const avatarUrls = [
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${address}`,
      `https://api.dicebear.com/7.x/personas/svg?seed=${address}`,
      `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`,
    ];
    
    // 첫 번째 URL을 기본으로 사용
    return avatarUrls[0];
  } catch (error) {
    console.log('Base 아바타 가져오기 실패:', error);
    return null;
  }
}

// 주소에서 사용자 정보 가져오기 (Base 네트워크용)
export async function getUserInfo(address) {
  try {
    if (!address) return { name: null, avatar: null, displayName: null };
    
    // Base 네트워크에서는 ENS를 사용하지 않음
    const ensName = null; // 항상 null
    
    // 주소 기반 아바타 생성
    const avatar = await getBaseAvatar(address);
    
    // 축약된 주소를 표시명으로 사용
    const displayName = `${address.slice(0, 6)}...${address.slice(-4)}`;
    
    return {
      name: ensName,
      avatar: avatar,
      displayName: displayName
    };
  } catch (error) {
    console.log('사용자 정보 가져오기 실패:', error);
    return {
      name: null,
      avatar: null,
      displayName: `${address.slice(0, 6)}...${address.slice(-4)}`
    };
  }
}

// 주소 축약 함수
export function shortenAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// 이모지 아바타 생성 함수 (ENS 아바타가 없을 때)
export function generateEmojiAvatar(address) {
  if (!address) return '👤';
  
  // 주소를 기반으로 이모지 선택
  const emojis = ['🤶', '🎅', '🦌', '🎄', '❄️', '⛄', '🎁', '🔔', '🌟', '🎀'];
  const index = parseInt(address.slice(2, 4), 16) % emojis.length;
  return emojis[index];
}
