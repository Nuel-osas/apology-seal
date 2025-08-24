'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit';
import { WalletConnect } from '@/components/WalletConnect';
import { SealedApologyWebService } from '@/lib/sealService';
import { Lock, Unlock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

// Pre-filled credentials from your successful creation
const APOLOGY_CREDENTIALS = {
  apologyId: '0x358a0cf28ceab98687a8bbb073a933c3f83640567ac3d6c5bee242f02772fad6',
  documentId: '358a0cf28ceab98687a8bbb073a933c3f83640567ac3d6c5bee242f02772fad6e8a75a664a5b66732fe7a82952f16635',
  walrusBlobId: 'kCSV7k3ZuduNWnhvtgdZUKenD7fbeFmetwm0_CsgB_c',
  recipients: {
    bl: '0x0760564b88d4d86026aec8c4b0ca695187174ac8138cb9e9a37c7837546039cb',
    kotaro: '0x10eefc7a3070baa5d72f602a0c89d7b1cb2fcc0b101cf55e6a70e3edb6229f8b',
  },
};

export default function DecryptPage() {
  const account = useCurrentAccount();
  const { mutate: signPersonalMessage } = useSignPersonalMessage();
  const [decryptedMessage, setDecryptedMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (account) {
      const authorized = 
        account.address === APOLOGY_CREDENTIALS.recipients.bl ||
        account.address === APOLOGY_CREDENTIALS.recipients.kotaro;
      setIsAuthorized(authorized);
    } else {
      // Reset states when wallet disconnects
      setIsAuthorized(null);
      setDecryptedMessage(null);
      setError(null);
    }
  }, [account]);

  const handleDecrypt = async () => {
    if (!account) {
      setError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const service = new SealedApologyWebService();
      
      // Create a signer object that uses the wallet hooks
      const walletSigner = {
        getAddress: () => account.address,
        signPersonalMessage: (args: { message: Uint8Array }) => {
          return new Promise((resolve, reject) => {
            signPersonalMessage(
              {
                message: args.message,
              },
              {
                onSuccess: (result) => {
                  console.log('Signature result from wallet:', result);
                  resolve(result);
                },
                onError: (error) => {
                  console.error('Wallet signature error:', error);
                  reject(error);
                },
              }
            );
          });
        },
      };

      const message = await service.decryptApology(
        APOLOGY_CREDENTIALS.apologyId,
        APOLOGY_CREDENTIALS.walrusBlobId,
        APOLOGY_CREDENTIALS.documentId,
        walletSigner
      );

      setDecryptedMessage(message);
    } catch (err: any) {
      console.error('Decryption error:', err);
      if (err.message?.includes('NOT_AUTHORIZED') || err.message?.includes('not in allowlist')) {
        setError('You are not authorized to decrypt this apology. Only BL and Kotaro can access it.');
      } else if (err.message?.includes('EXPIRED')) {
        setError('This apology has expired.');
      } else {
        setError(err.message || 'Failed to decrypt the apology');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#000000',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '48px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: '24px'
        }}>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: '700',
            letterSpacing: '-0.02em'
          }}>
            Sealed Apology
          </h1>
          <WalletConnect />
        </div>

        {/* Main Content */}
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '40px',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 24px',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Lock style={{ width: '32px', height: '32px', color: 'rgba(255, 255, 255, 0.8)' }} />
              </div>
              
              <h2 style={{ 
                fontSize: '28px', 
                fontWeight: '700',
                marginBottom: '12px',
                letterSpacing: '-0.02em'
              }}>
                An Onchain Heartfelt Apology
              </h2>
              
              <p style={{ 
                fontSize: '16px', 
                color: 'rgba(255, 255, 255, 0.6)',
                marginBottom: '8px'
              }}>
                From SILVERHARD to BL AND KOTARO
              </p>
              
              <p style={{ 
                fontSize: '14px', 
                color: 'rgba(255, 255, 255, 0.4)',
                lineHeight: '1.6'
              }}>
                This message has been encrypted using Sui Seal technology
                and stored on Walrus decentralized storage
              </p>
            </div>

            {/* Authorization Status */}
            {account && (
              <div style={{
                padding: '16px',
                background: isAuthorized 
                  ? 'rgba(16, 185, 129, 0.1)' 
                  : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${isAuthorized ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                borderRadius: '12px',
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {isAuthorized ? (
                    <CheckCircle style={{ width: '20px', height: '20px', color: '#10b981' }} />
                  ) : (
                    <AlertCircle style={{ width: '20px', height: '20px', color: '#ef4444' }} />
                  )}
                  <div>
                    <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                      Connected as: <span style={{ fontFamily: 'monospace' }}>{account.address.slice(0, 6)}...{account.address.slice(-4)}</span>
                    </p>
                    <p style={{ 
                      fontSize: '14px', 
                      color: isAuthorized ? '#10b981' : '#ef4444',
                      fontWeight: '500'
                    }}>
                      {isAuthorized 
                        ? 'You are authorized to decrypt this apology' 
                        : 'Your address is not in the recipient list'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Decrypt Button */}
            {!decryptedMessage && (
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <button
                  onClick={handleDecrypt}
                  disabled={!account || isLoading}
                  style={{
                    padding: '14px 32px',
                    background: !account || isLoading
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(96, 165, 250, 0.9) 100%)',
                    color: !account || isLoading ? 'rgba(255, 255, 255, 0.3)' : '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: !account || isLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    if (account && !isLoading) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
                      Decrypting...
                    </>
                  ) : (
                    <>
                      <Unlock style={{ width: '20px', height: '20px' }} />
                      Decrypt Apology
                    </>
                  )}
                </button>
                {!account && (
                  <p style={{ 
                    fontSize: '13px', 
                    color: 'rgba(255, 255, 255, 0.4)', 
                    marginTop: '12px' 
                  }}>
                    Please connect your wallet to decrypt the apology
                  </p>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div style={{
                padding: '16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px',
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <AlertCircle style={{ width: '20px', height: '20px', color: '#ef4444', flexShrink: 0 }} />
                  <p style={{ fontSize: '14px', color: '#ef4444' }}>{error}</p>
                </div>
              </div>
            )}

            {/* Decrypted Message */}
            {decryptedMessage && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '24px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(90deg, #10b981 0%, #3b82f6 100%)'
                }} />
                
                <h3 style={{ 
                  fontSize: '16px', 
                  fontWeight: '600',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'rgba(255, 255, 255, 0.9)'
                }}>
                  <CheckCircle style={{ width: '20px', height: '20px', color: '#10b981' }} />
                  Decrypted Message
                </h3>
                
                <div style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '8px',
                  padding: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <p style={{ 
                    fontSize: '15px',
                    lineHeight: '1.8',
                    color: 'rgba(255, 255, 255, 0.85)',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {decryptedMessage}
                  </p>
                </div>
                
                <div style={{ 
                  marginTop: '20px', 
                  paddingTop: '20px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }} />
                      <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
                        Decrypted with Sui Seal
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '8px', height: '8px', background: '#3b82f6', borderRadius: '50%' }} />
                      <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
                        Verified on-chain
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '8px', height: '8px', background: '#8b5cf6', borderRadius: '50%' }} />
                      <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
                        Retrieved from Walrus
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Technical Details */}
            <details style={{ marginTop: '32px' }}>
              <summary style={{ 
                cursor: 'pointer', 
                fontSize: '13px', 
                color: 'rgba(255, 255, 255, 0.4)',
                padding: '8px 0',
                listStyle: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ 
                  display: 'inline-block',
                  transition: 'transform 0.2s'
                }}>
                  ▶
                </span>
                Technical Details
              </summary>
              <div style={{
                marginTop: '16px',
                padding: '16px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: 'rgba(255, 255, 255, 0.6)',
                lineHeight: '1.6'
              }}>
                <p>Apology ID: {APOLOGY_CREDENTIALS.apologyId}</p>
                <p style={{ marginTop: '4px' }}>Walrus Blob: {APOLOGY_CREDENTIALS.walrusBlobId}</p>
                <p style={{ marginTop: '4px' }}>Document ID: {APOLOGY_CREDENTIALS.documentId.substring(0, 20)}...</p>
                <p style={{ marginTop: '12px' }}>Recipients:</p>
                <p style={{ marginLeft: '16px' }}>BL: {APOLOGY_CREDENTIALS.recipients.bl}</p>
                <p style={{ marginLeft: '16px' }}>Kotaro: {APOLOGY_CREDENTIALS.recipients.kotaro}</p>
              </div>
            </details>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        details summary::-webkit-details-marker {
          display: none;
        }
        
        details[open] summary span {
          transform: rotate(90deg);
        }
      `}</style>
    </div>
  );
}