'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit';
import { WalletConnect } from '@/components/WalletConnect';
import { SealedApologyWebService } from '@/lib/sealService';
import { Lock, Unlock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

// Pre-filled credentials from your successful creation
const APOLOGY_CREDENTIALS = {
  apologyId: '0x522f9b42f4889888f0a04c20bfcc31bdf1f4b4149f39423731b3b708bf639c69',
  documentId: '522f9b42f4889888f0a04c20bfcc31bdf1f4b4149f39423731b3b708bf639c69c29a4ed61f2fc69c4b915083bda9b233',
  walrusBlobId: 'rbjYrmGPXBQR8E2k9ySeZtnskVoEoUfF51xMSJkvkMw',
  authorizedAddresses: [
    '0x0760564b88d4d86026aec8c4b0ca695187174ac8138cb9e9a37c7837546039cb', // BL
    '0x10eefc7a3070baa5d72f602a0c89d7b1cb2fcc0b101cf55e6a70e3edb6229f8b', // Kotaro
    '0x2fee8b921747f0ddf937e1257391884173bebc32825480e1430dbb2907a18026',
    '0x6a5fe7731a01499dbf6342c25bb75f44075cb7c2e9f48a9261803282b71aa513',
    '0x4679f739928f66a75ff9e17c33c433787aea276532aabc068b715d4a2edc1106',
    '0xa87ee0779d1ddca72a99f625d1e3ce8ad1279ddd1aa088fe6ea1a1bb935f113b',
    '0x05fd9cd1c5716d140ab8be7e50804d39b1f79f960d4c66673fa4cc763c976802',
    '0x6b57a3674949834249d415c18ed5fabe7ca797845d66aabc1d280e1e2d6b750d',
    '0xedc61d3148fc2222f95b4a73c6312b0702e2b74517bf75938d535d2431e608ce',
    '0x3938fb19c176ac27f4646f14112d38490f57717a7cced463689890e1a1ff9d0f',
    '0x9a91d62162ce669a71e2d8318168a89e9a37d21c710fe76182bc747026dd4027',
    '0x98a945d6523ba0b4685c4d50d0449c811fded93ad7a20cf2d61af6a6fd4d4d0b',
    '0x017513c60805b1a3b8ec2cdf9e4d7bad60dff1dd13da26665ba9ca0e542371d1',
    '0xc6348ec469793ec2178860a7ac327843424062668cef3911b813e504b70f6994',
  ],
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
      const authorized = APOLOGY_CREDENTIALS.authorizedAddresses.includes(account.address);
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
        setError('You are not authorized to decrypt this apology. Only the 14 authorized recipients can access it.');
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
                  <div style={{ 
                    fontSize: '15px',
                    lineHeight: '1.8',
                    color: 'rgba(255, 255, 255, 0.85)',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {decryptedMessage?.split('\n').map((line, index) => {
                      // Check if the line contains a URL
                      const urlRegex = /(https?:\/\/[^\s]+)/g;
                      const parts = line.split(urlRegex);
                      
                      return (
                        <div key={index}>
                          {parts.map((part, partIndex) => {
                            if (part.match(urlRegex)) {
                              return (
                                <a
                                  key={partIndex}
                                  href={part}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    color: '#60a5fa',
                                    textDecoration: 'underline',
                                    cursor: 'pointer',
                                    transition: 'color 0.2s',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.color = '#93c5fd';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.color = '#60a5fa';
                                  }}
                                >
                                  {part}
                                </a>
                              );
                            }
                            return <span key={partIndex}>{part}</span>;
                          })}
                        </div>
                      );
                    })}
                  </div>
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
                <p style={{ marginTop: '12px' }}>Total Authorized Recipients: 14</p>
                <p style={{ marginTop: '4px', fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>
                  BL, Kotaro, and 12 additional recipients can decrypt this message
                </p>
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