export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: 'accountsChanged', listener: (accounts: string[]) => void): void;
  removeListener?(event: 'accountsChanged', listener: (accounts: string[]) => void): void;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export function getWalletProvider(): Eip1193Provider | null {
  return window.ethereum ?? null;
}

export async function connectWallet(): Promise<string> {
  const provider = getWalletProvider();
  if (!provider) throw new Error('MetaMask was not detected. Install the MetaMask browser extension, then try again.');
  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  if (!Array.isArray(accounts) || typeof accounts[0] !== 'string') {
    throw new Error('MetaMask did not return an account. Unlock your wallet and try again.');
  }
  return accounts[0];
}

export function shortenWalletAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
