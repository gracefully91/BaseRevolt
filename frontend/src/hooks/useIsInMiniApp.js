import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

/**
 * Hook to detect if the app is running inside a Farcaster Mini-App
 * @returns {boolean} true if inside Farcaster Mini-App, false otherwise
 */
export function useIsInMiniApp() {
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkMiniAppEnvironment = async () => {
      try {
        // Check if SDK is available
        if (!sdk) {
          if (mounted) {
            setIsInMiniApp(false);
            setIsLoading(false);
          }
          return;
        }

        // Wait for SDK to be ready
        await sdk.actions.ready();
        
        // Check if we're in a mini app
        const inMiniApp = sdk.context ? true : false;
        
        if (mounted) {
          setIsInMiniApp(inMiniApp);
          setIsLoading(false);
        }

        console.log('🔍 Mini-App Environment Check:', {
          isInMiniApp: inMiniApp,
          hasContext: !!sdk.context,
          sdkAvailable: !!sdk
        });
      } catch (error) {
        console.error('❌ Error checking mini-app environment:', error);
        if (mounted) {
          setIsInMiniApp(false);
          setIsLoading(false);
        }
      }
    };

    checkMiniAppEnvironment();

    return () => {
      mounted = false;
    };
  }, []);

  return { isInMiniApp, isLoading };
}

