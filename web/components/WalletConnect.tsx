'use client';

import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import '@mysten/dapp-kit/dist/index.css';

export function WalletConnect() {
  const account = useCurrentAccount();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <ConnectButton />
      {account && (
        <div style={{ 
          fontSize: '13px', 
          color: 'rgba(255, 255, 255, 0.5)',
          fontFamily: 'monospace'
        }}>
          {account.address.slice(0, 6)}...{account.address.slice(-4)}
        </div>
      )}
    </div>
  );
}