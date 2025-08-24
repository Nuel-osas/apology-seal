# Sealed Apology - Production Implementation with Walrus

A production-ready implementation combining Sui's Seal Identity-Based Encryption with Walrus decentralized storage for your encrypted apology to BL and Kotaro.

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Sender    │────▶│  Seal + Sui  │────▶│   Walrus    │
│  (You)      │     │  Blockchain  │     │  Storage    │
└─────────────┘     └──────────────┘     └─────────────┘
                            │
                    ┌───────▼────────┐
                    │  SEAL Key      │
                    │  Servers (5)   │
                    └────────────────┘
                            │
                    ┌───────▼────────┐
                    │   Recipients   │
                    │  (BL & Kotaro) │
                    └────────────────┘
```

## How It Works

1. **Encryption**: Your apology is encrypted using SEAL's 2-of-5 threshold encryption
2. **Storage**: Encrypted data is stored on Walrus decentralized network
3. **Access Control**: On-chain `seal_approve` function ensures only BL and Kotaro can decrypt
4. **Decryption**: Recipients use session keys to decrypt via SEAL key servers

## Quick Start

### 1. Install Dependencies

```bash
npm install
npm run build
```

### 2. Deploy the Smart Contract

```bash
# Deploy the final version with Walrus support
sui client publish --gas-budget 100000000
```

### 3. Configure Environment

Create `.env` file:

```env
# Sender configuration
SENDER_PRIVATE_KEY=your_private_key_hex
PACKAGE_ID=0x... # From deployment

# Recipients
BL_WALLET_ADDRESS=0x...
KOTARO_WALLET_ADDRESS=0x...

# Network
NETWORK=testnet # or mainnet
WALRUS_API_URL=https://publisher-devnet.walrus.space # optional

# Optional
AUTO_TRANSFER=true # Transfer to BL after creation
```

### 4. Send Your Sealed Apology

```bash
npm run send
```

This will:
- ✅ Create on-chain apology object with expiry
- ✅ Encrypt your message with SEAL (threshold 2-of-5)
- ✅ Upload encrypted data to Walrus
- ✅ Attach Walrus blob reference to apology
- ✅ Save credentials for recipients
- ✅ Optionally transfer to BL

Output:
```
📦 Apology Details:
   Object ID: 0x123...
   Document ID: 0xabc...
   Walrus Blob: bAFy...
   Backup Key: 0xdef...

💾 Credentials saved to: output/apology-credentials.json
```

### 5. Recipients Decrypt

Recipients (BL or Kotaro) run:

```bash
# Using credentials file
RECIPIENT_PRIVATE_KEY=their_private_key \
CREDENTIALS_FILE=./output/apology-credentials.json \
npm run decrypt

# Or with direct values
RECIPIENT_PRIVATE_KEY=their_private_key \
PACKAGE_ID=0x... \
APOLOGY_ID=0x... \
DOCUMENT_ID=0x... \
WALRUS_BLOB_ID=bAFy... \
npm run decrypt
```

## Key Components

### Move Contract (`sealed_apology.move`)

```move
// Core access control function
entry fun seal_approve(
    document_id: vector<u8>, 
    apology: &SealedApology,
    clock: &Clock,
    ctx: &TxContext
)

// Walrus integration
public fun attach_walrus_blob(
    apology: &mut SealedApology,
    cap: &ApologyCap,
    blob_id: String,
    ctx: &TxContext
)
```

### TypeScript Service (`sealApology.ts`)

```typescript
class SealedApologyService {
    // Create encrypted apology with Walrus storage
    async createSealedApology(
        message: string,
        blAddress: string,
        kotaroAddress: string,
        expiryDays: number
    ): Promise<EncryptedApology>
    
    // Decrypt from Walrus using SEAL
    async decryptApology(
        apologyId: string,
        walrusBlobId: string,
        documentId: string,
        recipientKeypair: Ed25519Keypair
    ): Promise<string>
}
```

## Security Features

- **Threshold Encryption**: 2-of-5 SEAL key servers must agree
- **On-chain Access Control**: `seal_approve` validates recipients
- **Time-Limited Access**: 30-day expiry (configurable)
- **Decentralized Storage**: Walrus ensures availability
- **Session Keys**: 10-minute TTL for decryption operations
- **Namespace Isolation**: Document IDs prefixed with apology ID

## Production Considerations

### Network Selection

**Testnet** (Development):
- SEAL Key Servers: 5 testnet servers
- Walrus: `https://publisher-devnet.walrus.space`
- Free testnet SUI from faucet

**Mainnet** (Production):
- SEAL Key Servers: 5 mainnet servers  
- Walrus: `https://publisher.walrus.space`
- Requires real SUI tokens

### Storage Costs

- **Walrus Storage**: ~0.1 SUI per MB
- **Transaction Fees**: ~0.01 SUI per operation
- **Total for Apology**: ~0.2 SUI

### Data Flow

1. **Encryption Phase**:
   ```
   Message → SEAL Encrypt → Walrus Upload → Blockchain Reference
   ```

2. **Decryption Phase**:
   ```
   Walrus Download → seal_approve → SEAL Decrypt → Original Message
   ```

## Troubleshooting

### Common Issues

**"No key servers available"**
- Check network setting (testnet/mainnet)
- Verify SEAL service status

**"Walrus upload failed"**
- Check API endpoint URL
- Verify network connectivity
- Ensure data size < 10MB

**"NOT_AUTHORIZED error"**
- Verify recipient address is in allowlist
- Check wallet is BL or Kotaro

**"EXPIRED error"**
- Apology has passed 30-day expiry
- Deploy new apology with longer expiry

**"Session key failed"**
- Retry with fresh session
- Check TTL hasn't expired (10 min)

## Advanced Usage

### Custom Expiry
```typescript
const result = await apologyService.createSealedApology(
    message,
    blAddress,
    kotaroAddress,
    90 // 90 days instead of 30
);
```

### Add More Recipients
```move
public fun add_recipient(
    apology: &mut SealedApology,
    cap: &ApologyCap,
    new_recipient: address,
    ctx: &TxContext
)
```

### Check Authorization
```typescript
const isAuthorized = await apologyService.isAuthorized(
    apologyId,
    recipientAddress
);
```

## Comparison with Previous Versions

| Feature | V1 (Incorrect) | V2 (Basic) | Final (Production) |
|---------|---------------|------------|-------------------|
| Encryption | Direct | IBE | IBE with Threshold |
| Storage | On-chain | External URL | Walrus Decentralized |
| Access Control | Custom | seal_approve | seal_approve + Expiry |
| Key Servers | None | Basic | Full 2-of-5 Threshold |
| Document ID | Random | Basic | Namespaced + Nonce |
| Production Ready | ❌ | ⚠️ | ✅ |

## Resources

- [SEAL Documentation](https://github.com/MystenLabs/seal)
- [Walrus Documentation](https://docs.walrus.site)
- [Sui Move Docs](https://docs.sui.io/guides/developer/sui-move)
- [Example Implementation](./seal_script/) - Reference implementation

## License

MIT

---

**Note**: This is the production-ready implementation based on the patterns from the seal_script reference. Use this version for actual deployment.