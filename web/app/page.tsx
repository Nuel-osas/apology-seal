'use client';

import Link from 'next/link';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { WalletConnect } from '@/components/WalletConnect';
import { Lock, Shield, Database, ArrowRight } from 'lucide-react';

export default function Home() {
  const account = useCurrentAccount();

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
          marginBottom: '64px',
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

        {/* Hero Section */}
        <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '64px 48px',
            marginBottom: '48px',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)'
          }}>
            <h2 style={{ 
              fontSize: '48px', 
              fontWeight: '800',
              marginBottom: '24px',
              background: 'linear-gradient(180deg, #ffffff 0%, rgba(255, 255, 255, 0.7) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.03em',
              lineHeight: '1.1'
            }}>
              An Onchain Heartfelt Apology
            </h2>
            
            <p style={{ 
              fontSize: '20px', 
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '16px',
              fontWeight: '500'
            }}>
              From SILVERHARD to BL AND KOTARO
            </p>
            
            <p style={{ 
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.5)',
              marginBottom: '40px',
              maxWidth: '600px',
              margin: '0 auto 40px',
              lineHeight: '1.6'
            }}>
              This sealed apology has been encrypted using Sui Seal technology 
              and stored on Walrus decentralized storage. Only BL and Kotaro 
              can decrypt and read this message using their wallets.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <Link href="/decrypt" style={{ textDecoration: 'none' }}>
                <button style={{
                  padding: '16px 40px',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(96, 165, 250, 0.9) 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.3)';
                }}>
                  Decrypt Apology
                  <ArrowRight style={{ width: '18px', height: '18px' }} />
                </button>
              </Link>
            </div>

            {/* Wallet Status */}
            {account && (
              <div style={{
                marginTop: '32px',
                padding: '12px 20px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                display: 'inline-block'
              }}>
                <p style={{ 
                  fontSize: '13px', 
                  color: 'rgba(255, 255, 255, 0.5)'
                }}>
                  Connected as: <span style={{ 
                    fontFamily: 'monospace',
                    color: 'rgba(255, 255, 255, 0.7)'
                  }}>{account.address.slice(0, 6)}...{account.address.slice(-4)}</span>
                </p>
              </div>
            )}
          </div>

          {/* Features */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '24px',
            marginBottom: '48px'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '32px 24px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                margin: '0 auto 16px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Lock style={{ width: '24px', height: '24px', color: '#10b981' }} />
              </div>
              <h3 style={{ 
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '8px',
                color: 'rgba(255, 255, 255, 0.9)'
              }}>
                Sui Seal Encryption
              </h3>
              <p style={{ 
                fontSize: '14px', 
                color: 'rgba(255, 255, 255, 0.5)',
                lineHeight: '1.5'
              }}>
                Identity-based encryption with distributed key servers
              </p>
            </div>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '32px 24px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                margin: '0 auto 16px',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Database style={{ width: '24px', height: '24px', color: '#3b82f6' }} />
              </div>
              <h3 style={{ 
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '8px',
                color: 'rgba(255, 255, 255, 0.9)'
              }}>
                Walrus Storage
              </h3>
              <p style={{ 
                fontSize: '14px', 
                color: 'rgba(255, 255, 255, 0.5)',
                lineHeight: '1.5'
              }}>
                Decentralized storage ensuring permanent availability
              </p>
            </div>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '32px 24px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                margin: '0 auto 16px',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Shield style={{ width: '24px', height: '24px', color: '#8b5cf6' }} />
              </div>
              <h3 style={{ 
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '8px',
                color: 'rgba(255, 255, 255, 0.9)'
              }}>
                Access Control
              </h3>
              <p style={{ 
                fontSize: '14px', 
                color: 'rgba(255, 255, 255, 0.5)',
                lineHeight: '1.5'
              }}>
                Only authorized recipients can decrypt the message
              </p>
            </div>
          </div>

          {/* Footer */}
          <div style={{ 
            paddingTop: '32px',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <p style={{ 
              fontSize: '13px', 
              color: 'rgba(255, 255, 255, 0.3)'
            }}>
              Built on Sui Testnet • Powered by Seal & Walrus
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}