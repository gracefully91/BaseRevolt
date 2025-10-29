# Farcaster 공유 (임베드 메시지) 구현 가이드


이 문서는 Farcaster Mini App SDK를 사용하여 임베드 메시지를 생성하고 공유하는 완전한 가이드를 제공합니다.

## 📋 목차

1. [필수 패키지 설치](#필수-패키지-설치)
2. [SDK 초기화](#sdk-초기화)
3. [공유 함수 구현](#공유-함수-구현)
4. [공유 상태 확인](#공유-상태-확인)
5. [메타 태그 설정 (임베드 카드)](#메타-태그-설정-임베드-카드)
6. [전체 예시 코드](#전체-예시-코드)

---

## 필수 패키지 설치

```bash
npm install @farcaster/miniapp-sdk
```

---

## SDK 초기화

### `src/App.jsx` 또는 메인 컴포넌트

```jsx
import { useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

function App() {
  useEffect(() => {
    const initializeSDK = async () => {
      try {
        // 앱이 완전히 로드된 후 스플래시 화면 숨기기
        await sdk.actions.ready();
        console.log('✅ Farcaster Mini App SDK ready');
      } catch (error) {
        console.warn('⚠️ Farcaster Mini App SDK not available:', error);
        // SDK가 없어도 앱은 정상 작동 (일반 웹 브라우저에서)
      }
    };

    initializeSDK();
  }, []);

  return (
    <div>
      {/* Your app content */}
    </div>
  );
}
```

---

## 공유 함수 구현

### `src/pages/Home.jsx` 또는 원하는 컴포넌트

```jsx
import { useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

function Home() {
  const [hasShared, setHasShared] = useState(false);

  // Farcaster 공유 함수
  const shareToFarcaster = async () => {
    try {
      // 공유할 텍스트 작성
      const text = "🚗 Check out Base Revolt - Drive RC Car remotely!";
      
      // 임베드할 URL (Mini App Universal Link)
      const embeds = ["https://farcaster.xyz/miniapps/nSqoh1xZsxF3/base-revolt"];

      // SDK가 있으면 composeCast 사용 (권장 방법)
      if (sdk && sdk.actions && sdk.actions.composeCast) {
        const result = await sdk.actions.composeCast({ 
          text,
          embeds
        });
        
        // 실제 포스팅 여부 확인
        if (result?.cast) {
          console.log('✅ SDK composeCast 성공');
          console.log('📝 Cast Hash:', result.cast.hash);
          
          // 공유 완료 상태 저장
          localStorage.setItem('base-revolt-shared', Date.now().toString());
          setHasShared(true);
          
          alert('🎉 Farcaster에 성공적으로 공유되었습니다!');
        } else {
          console.log('❌ 사용자가 포스팅을 취소함');
        }
      } else {
        // SDK composeCast 함수가 없으면 웹 방식으로 폴백
        console.log('⚠️ SDK composeCast 함수 없음 - 웹 방식 사용');
        await shareToFarcasterWeb();
      }
    } catch (error) {
      console.error('Share failed:', error);
      alert('공유에 실패했습니다.');
    }
  };

  // 웹에서 Farcaster 공유 (폴백 방법)
  const shareToFarcasterWeb = async () => {
    try {
      // 미리 작성된 텍스트 (Universal Link 포함)
      const text = "🚙 Check out Base Revolt\n\nControl a real RC car from your mini app!\n\nHere's the link :\nhttps://farcaster.xyz/miniapps/nSqoh1xZsxF3/base-revolt\n\n- Base Revolt 🚗";
      
      // Farcaster compose URL
      const farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`;
      
      // 새 창으로 열기
      window.location.href = farcasterUrl;
      
      // 공유 완료 상태 저장 (사용자가 실제로 포스팅했는지는 확인 불가)
      localStorage.setItem('base-revolt-shared', Date.now().toString());
      setHasShared(true);
    } catch (error) {
      console.error('Farcaster 공유 실패:', error);
    }
  };

  return (
    <div>
      {hasShared ? (
        <button onClick={handleDemoPlay}>
          🎮 Play Demo (Available!)
        </button>
      ) : (
        <button onClick={shareToFarcaster}>
          📤 Share to Farcaster
        </button>
      )}
    </div>
  );
}
```

---

## 공유 상태 확인

### localStorage와 API를 통한 공유 상태 추적

```jsx
import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

function Home() {
  const [hasShared, setHasShared] = useState(false);

  // Farcaster API로 사용자 캐스트 확인
  const checkUserCasts = async () => {
    try {
      // Farcaster 사용자 정보 가져오기
      if (!sdk || !sdk.user) {
        console.log('⚠️ SDK 또는 사용자 정보 없음');
        return false;
      }

      const user = sdk.user;
      console.log('👤 사용자 정보:', user);

      // Warpcast API로 사용자 캐스트 조회
      const response = await fetch(`https://api.warpcast.com/v2/casts?fid=${user.fid}&limit=10`);
      
      if (!response.ok) {
        console.log('❌ API 호출 실패:', response.status);
        return false;
      }

      const data = await response.json();
      console.log('📝 사용자 캐스트:', data);

      if (!data.result || !data.result.casts) {
        console.log('❌ 캐스트 데이터 없음');
        return false;
      }

      // 우리 앱 관련 캐스트 찾기
      const ourAppCasts = data.result.casts.filter(cast => {
        const text = cast.text.toLowerCase();
        const hasOurApp = text.includes('base revolt') || 
                         text.includes('base-revolt') ||
                         text.includes('farcaster.xyz/miniapps/nSqoh1xZsxF3/base-revolt');
        
        return hasOurApp;
      });

      if (ourAppCasts.length === 0) {
        console.log('❌ 우리 앱 관련 캐스트 없음');
        return false;
      }

      // 가장 최근 캐스트의 시간 확인
      const latestCast = ourAppCasts[0];
      const castTime = new Date(latestCast.timestamp);
      const now = new Date();
      const hoursDiff = (now - castTime) / (1000 * 60 * 60);

      // 24시간 이내에 공유했는지 확인
      return hoursDiff <= 24;
    } catch (error) {
      console.error('❌ 사용자 캐스트 확인 실패:', error);
      return false;
    }
  };

  // 공유 상태 체크 함수
  const checkShareStatus = async () => {
    // 먼저 localStorage 확인 (빠른 체크)
    const sharedTime = localStorage.getItem('base-revolt-shared');
    if (sharedTime) {
      const dayInMs = 24 * 60 * 60 * 1000;
      const isWithin24Hours = Date.now() - parseInt(sharedTime) < dayInMs;
      
      if (isWithin24Hours) {
        // localStorage가 유효하면 API로 재확인
        const apiResult = await checkUserCasts();
        if (!apiResult) {
          // API에서 확인되지 않으면 localStorage 삭제
          localStorage.removeItem('base-revolt-shared');
          setHasShared(false);
          return;
        }
        setHasShared(true);
        return;
      } else {
        // 24시간 초과
        localStorage.removeItem('base-revolt-shared');
        setHasShared(false);
        return;
      }
    }
    
    // localStorage가 없으면 API로 확인
    const apiResult = await checkUserCasts();
    setHasShared(apiResult);
  };

  useEffect(() => {
    checkShareStatus();
  }, []);

  return (
    <div>
      {/* Your UI */}
    </div>
  );
}
```

---

## 메타 태그 설정 (임베드 카드)

임베드 메시지가 표시될 때 풍부한 카드를 보여주려면 HTML 메타 태그를 설정해야 합니다.

### `index.html` 또는 동적 메타 태그 생성

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  
  <!-- Farcaster Mini App Embed 메타 태그 -->
  <meta name="fc:miniapp" content='{
    "version": "1",
    "imageUrl": "https://your-domain.com/embed-image.png",
    "button": {
      "title": "🚗 Play Base Revolt",
      "action": {
        "type": "launch_miniapp",
        "url": "https://farcaster.xyz/miniapps/nSqoh1xZsxF3/base-revolt"
      }
    }
  }' />
  
  <!-- 호환성을 위한 fc:frame 태그 (선택사항) -->
  <meta name="fc:frame" content='{
    "version": "1",
    "imageUrl": "https://your-domain.com/embed-image.png",
    "button": {
      "title": "🚗 Play Base Revolt",
      "action": {
        "type": "launch_frame",
        "url": "https://farcaster.xyz/miniapps/nSqoh1xZsxF3/base-revolt"
      }
    }
  }' />
  
  <title>Base Revolt</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>
```

### 이미지 요구사항

- **포맷**: PNG, JPG, GIF, WebP (PNG 권장)
- **비율**: 3:2 (가로:세로)
- **최소 크기**: 600x400px
- **최대 크기**: 3000x2000px
- **파일 크기**: 10MB 미만
- **URL 길이**: 1024자 이하

---

## 전체 예시 코드

### `src/pages/Home.jsx` 완전한 예시

```jsx
import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

function Home() {
  const [hasShared, setHasShared] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 공유 상태 확인
  useEffect(() => {
    const checkShareStatus = async () => {
      const sharedTime = localStorage.getItem('base-revolt-shared');
      if (sharedTime) {
        const dayInMs = 24 * 60 * 60 * 1000;
        const isWithin24Hours = Date.now() - parseInt(sharedTime) < dayInMs;
        
        if (isWithin24Hours) {
          const apiResult = await checkUserCasts();
          if (!apiResult) {
            localStorage.removeItem('base-revolt-shared');
            setHasShared(false);
          } else {
            setHasShared(true);
          }
        } else {
          localStorage.removeItem('base-revolt-shared');
          setHasShared(false);
        }
      } else {
        const apiResult = await checkUserCasts();
        setHasShared(apiResult);
      }
      setIsLoading(false);
    };

    checkShareStatus();
  }, []);

  // Farcaster API로 사용자 캐스트 확인
  const checkUserCasts = async () => {
    try {
      if (!sdk || !sdk.user) {
        return false;
      }

      const user = sdk.user;
      const response = await fetch(`https://api.warpcast.com/v2/casts?fid=${user.fid}&limit=10`);
      
      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      if (!data.result || !data.result.casts) {
        return false;
      }

      const ourAppCasts = data.result.casts.filter(cast => {
        const text = cast.text.toLowerCase();
        return text.includes('base revolt') || 
               text.includes('farcaster.xyz/miniapps/nSqoh1xZsxF3/base-revolt');
      });

      if (ourAppCasts.length === 0) {
        return false;
      }

      const latestCast = ourAppCasts[0];
      const castTime = new Date(latestCast.timestamp);
      const now = new Date();
      const hoursDiff = (now - castTime) / (1000 * 60 * 60);

      return hoursDiff <= 24;
    } catch (error) {
      console.error('❌ 사용자 캐스트 확인 실패:', error);
      return false;
    }
  };

  // Farcaster 공유 함수
  const shareToFarcaster = async () => {
    try {
      const text = "🚗 Check out Base Revolt - Drive RC Car remotely!";
      const embeds = ["https://farcaster.xyz/miniapps/nSqoh1xZsxF3/base-revolt"];

      if (sdk && sdk.actions && sdk.actions.composeCast) {
        const result = await sdk.actions.composeCast({ 
          text,
          embeds
        });
        
        if (result?.cast) {
          localStorage.setItem('base-revolt-shared', Date.now().toString());
          setHasShared(true);
          alert('🎉 Farcaster에 성공적으로 공유되었습니다!');
        } else {
          console.log('❌ 사용자가 포스팅을 취소함');
        }
      } else {
        // 웹 방식 폴백
        const text = "🚙 Check out Base Revolt\n\nControl a real RC car from your mini app!\n\nHere's the link :\nhttps://farcaster.xyz/miniapps/nSqoh1xZsxF3/base-revolt\n\n- Base Revolt 🚗";
        const farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`;
        window.location.href = farcasterUrl;
        localStorage.setItem('base-revolt-shared', Date.now().toString());
        setHasShared(true);
      }
    } catch (error) {
      console.error('Share failed:', error);
      alert('공유에 실패했습니다.');
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {hasShared ? (
        <button onClick={handleDemoPlay}>
          🎮 Play Demo (Available!)
        </button>
      ) : (
        <button onClick={shareToFarcaster}>
          📤 Share to Farcaster
        </button>
      )}
    </div>
  );
}
```

---

## 주요 개념 설명

### 1. `sdk.actions.composeCast()`

Farcaster Mini App SDK의 메서드로, 사용자에게 캐스트 작성 UI를 열어줍니다.

**매개변수:**
- `text`: 캐스트 텍스트
- `embeds`: 임베드할 URL 배열 (Mini App Universal Link 권장)

**반환값:**
- `result.cast`: 포스팅 성공 시 캐스트 정보
- `null`: 사용자가 취소한 경우

### 2. Mini App Universal Link

Farcaster Mini App의 고유 URL 형식:
```
https://farcaster.xyz/miniapps/<app-id>/<app-slug>
```

이 URL을 임베드하면 자동으로 풍부한 카드가 생성됩니다.

### 3. 공유 상태 추적 전략

1. **localStorage**: 빠른 체크용 (24시간 유효)
2. **Warpcast API**: 실제 공유 여부 확인 (FID 기반)
3. **결합**: localStorage가 유효하면 API로 재확인

---

## 문제 해결

### 에러: "sdk.actions.composeCast is not a function"

**원인:** SDK가 아직 초기화되지 않았거나 Farcaster 환경이 아닙니다.

**해결:** 
```jsx
if (sdk && sdk.actions && sdk.actions.composeCast) {
  // SDK 사용
} else {
  // 웹 방식 폴백
}
```

### 임베드 카드가 표시되지 않음

**원인:** 메타 태그가 없거나 이미지 URL이 잘못되었습니다.

**해결:** 
- `index.html`에 `fc:miniapp` 메타 태그 추가
- 이미지 URL이 공개적으로 접근 가능한지 확인
- 이미지 크기가 요구사항을 만족하는지 확인

### 공유 상태가 저장되지 않음

**원인:** localStorage가 비활성화되었거나 브라우저에서 차단되었습니다.

**해결:** 
- 브라우저 설정 확인
- try-catch로 에러 처리
- 대체 저장 방법 고려 (쿠키, 서버 등)

---

## 결론

이제 Farcaster Mini App SDK를 사용하여 임베드 메시지를 생성하고 공유할 수 있습니다. 모든 코드를 복사해서 사용하시면 됩니다!

**참고:** 이 가이드는 Base Revolt 프로젝트의 실제 구현을 기반으로 작성되었습니다. 필요에 따라 수정해서 사용하세요.

