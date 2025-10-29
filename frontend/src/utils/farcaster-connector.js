import MiniAppSDK from '@farcaster/miniapp-sdk';
import {
  ChainNotConfiguredError,
  createConnector,
} from 'wagmi';
import { fromHex, getAddress, numberToHex, SwitchChainError } from 'viem';

let accountsChanged;
let chainChanged;
let disconnect;

export function farcasterMiniApp() {
  return createConnector((config) => ({
    id: 'farcaster',
    name: 'Farcaster',
    type: 'farcasterMiniApp',
    icon: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/055c25d6-7fe7-4a49-abf9-49772021cf00/original',

    async connect({ chainId } = {}) {
      const provider = await this.getProvider();
      const accounts = await provider.request({
        method: 'eth_requestAccounts',
      });

      let targetChainId = chainId;
      if (!targetChainId) {
        const state = (await config.storage?.getItem('state')) ?? {};
        const isChainSupported = config.chains.some(
          (x) => x.id === state.chainId
        );
        if (isChainSupported) targetChainId = state.chainId;
      }

      if (!accountsChanged) {
        accountsChanged = this.onAccountsChanged.bind(this);
        provider.on('accountsChanged', accountsChanged);
      }
      if (!chainChanged) {
        chainChanged = this.onChainChanged.bind(this);
        provider.on('chainChanged', chainChanged);
      }
      if (!disconnect) {
        disconnect = this.onDisconnect.bind(this);
        provider.on('disconnect', disconnect);
      }

      const currentChainId = await this.getChainId();

      return {
        accounts: accounts.map((x) => getAddress(x)),
        chainId: currentChainId,
      };
    },

    async disconnect() {
      const provider = await this.getProvider();

      if (accountsChanged) {
        provider.removeListener('accountsChanged', accountsChanged);
        accountsChanged = undefined;
      }

      if (chainChanged) {
        provider.removeListener('chainChanged', chainChanged);
        chainChanged = undefined;
      }

      if (disconnect) {
        provider.removeListener('disconnect', disconnect);
        disconnect = undefined;
      }
    },

    async getAccounts() {
      const provider = await this.getProvider();
      const accounts = await provider.request({
        method: 'eth_accounts',
      });
      return accounts.map((x) => getAddress(x));
    },

    async getChainId() {
      const provider = await this.getProvider();
      const hexChainId = await provider.request({ method: 'eth_chainId' });
      return fromHex(hexChainId, 'number');
    },

    async isAuthorized() {
      try {
        const accounts = await this.getAccounts();
        return !!accounts.length;
      } catch {
        return false;
      }
    },

    async switchChain({ chainId }) {
      const provider = await this.getProvider();
      const chain = config.chains.find((x) => x.id === chainId);
      if (!chain) {
        throw new SwitchChainError(new ChainNotConfiguredError());
      }

      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: numberToHex(chainId) }],
      });

      // Explicitly emit this event as a workaround for ethereum provider not
      // emitting events, can remove once events are flowing
      config.emitter.emit('change', { chainId });

      return chain;
    },

    onAccountsChanged(accounts) {
      if (accounts.length === 0) {
        this.onDisconnect();
      } else {
        config.emitter.emit('change', {
          accounts: accounts.map((x) => getAddress(x)),
        });
      }
    },

    onChainChanged(chain) {
      const chainId = Number(chain);
      config.emitter.emit('change', { chainId });
    },

    async onDisconnect() {
      config.emitter.emit('disconnect');
    },

    async getProvider() {
      return MiniAppSDK.wallet.ethProvider;
    },
  }));
}

