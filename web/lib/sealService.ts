import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { SealClient, SessionKey } from '@mysten/seal';
import { fromHex, toHex } from '@mysten/sui/utils';

// Configuration from your deployment
const CONFIG = {
  packageId: '0xf40c5c3293fe7213a0805d79a3349cce0654644a314b49262ef07a28e8b9c14a',
  walrusApiUrl: 'https://publisher.walrus-testnet.walrus.space',
  walrusAggregatorUrl: 'https://aggregator.walrus-testnet.walrus.space',
  keyServerId: '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75',
  clockObjectId: '0x6',
};

export class SealedApologyWebService {
  private suiClient: SuiClient;
  private sealClient: SealClient;

  constructor(network: 'testnet' | 'mainnet' = 'testnet') {
    const rpcUrl = network === 'mainnet' 
      ? 'https://fullnode.mainnet.sui.io'
      : 'https://fullnode.testnet.sui.io';
    
    this.suiClient = new SuiClient({ url: rpcUrl });
    
    this.sealClient = new SealClient({
      suiClient: this.suiClient,
      serverConfigs: [{
        objectId: CONFIG.keyServerId,
        weight: 1,
      }],
      verifyKeyServers: false,
    });
  }

  async createSealedApology(
    message: string,
    blAddress: string,
    kotaroAddress: string,
    signer: any // Will be the wallet adapter
  ): Promise<{
    apologyId: string;
    documentId: string;
    walrusBlobId: string;
  }> {
    // Step 1: Create on-chain apology
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${CONFIG.packageId}::sealed_apology::create_apology_entry`,
      arguments: [
        tx.pure.address(blAddress),
        tx.pure.address(kotaroAddress),
        tx.pure.string("An onchain heartfelt apology from SILVERHARD to BL AND KOTARO"),
        tx.pure.u64(30), // 30 days expiry
        tx.object(CONFIG.clockObjectId),
      ],
    });

    const result = await this.suiClient.signAndExecuteTransaction({
      transaction: tx,
      signer,
      options: {
        showObjectChanges: true,
        showEvents: true,
      },
    });

    // Find the created apology
    const apologyObject = result.objectChanges?.find(
      change => change.type === 'created' && 
      change.objectType?.includes('::sealed_apology::SealedApology')
    );

    if (!apologyObject || !('objectId' in apologyObject)) {
      throw new Error('Failed to create apology');
    }

    const apologyId = apologyObject.objectId;

    // Step 2: Generate document ID and encrypt
    const documentId = this.generateDocumentId(apologyId);
    const messageBytes = new TextEncoder().encode(message);
    
    const { encryptedObject, key } = await this.sealClient.encrypt({
      threshold: 1,
      packageId: CONFIG.packageId,
      id: documentId,
      data: messageBytes,
    });

    // Step 3: Upload to Walrus
    const walrusBlobId = await this.uploadToWalrus(encryptedObject);

    return {
      apologyId,
      documentId: toHex(documentId),
      walrusBlobId,
    };
  }

  async decryptApology(
    apologyId: string,
    walrusBlobId: string,
    documentId: string,
    signer: any // Wallet adapter
  ): Promise<string> {
    // Step 1: Download from Walrus
    const encryptedData = await this.downloadFromWalrus(walrusBlobId);
    
    // Step 2: Create session key with wallet
    const address = await signer.getAddress();
    console.log('Creating session key for address:', address);
    
    const sessionKey = await SessionKey.create({
      address,
      packageId: CONFIG.packageId,
      ttlMin: 10,
      suiClient: this.suiClient,
    });

    // Sign the personal message with wallet
    // Pass the message string directly, not as bytes
    const message = sessionKey.getPersonalMessage();
    console.log('Personal message to sign:', message);
    
    const signatureResult = await signer.signPersonalMessage({
      message: message, // Pass the string directly, not encoded bytes
    });
    
    console.log('Full signature result:', signatureResult);
    
    // The wallet returns an object with 'signature' property
    const signature = signatureResult.signature || signatureResult;
    
    console.log('Using signature:', signature);
    
    await sessionKey.setPersonalMessageSignature(signature);
    console.log('Signature set successfully');

    // Step 3: Build seal_approve transaction
    const tx = new Transaction();
    tx.moveCall({
      target: `${CONFIG.packageId}::sealed_apology::seal_approve`,
      arguments: [
        tx.pure.vector('u8', Array.from(fromHex(documentId))),
        tx.object(apologyId),
        tx.object(CONFIG.clockObjectId),
      ],
    });
    
    const txBytes = await tx.build({ 
      client: this.suiClient, 
      onlyTransactionKind: true 
    });

    // Step 4: Decrypt
    const decryptedData = await this.sealClient.decrypt({
      data: encryptedData,
      sessionKey,
      txBytes,
    });

    return new TextDecoder().decode(decryptedData);
  }

  private generateDocumentId(apologyId: string): Uint8Array {
    const nonce = crypto.getRandomValues(new Uint8Array(16));
    const apologyBytes = fromHex(apologyId.replace('0x', ''));
    return new Uint8Array([...apologyBytes, ...nonce]);
  }

  private async uploadToWalrus(data: Uint8Array): Promise<string> {
    const response = await fetch(`${CONFIG.walrusApiUrl}/v1/blobs?epochs=1`, {
      method: 'PUT',
      body: data,
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to upload to Walrus');
    }

    const result: any = await response.json();
    
    if (result.newlyCreated?.blobObject) {
      return result.newlyCreated.blobObject.blobId;
    } else if (result.alreadyCertified?.blobObject) {
      return result.alreadyCertified.blobObject.blobId;
    }
    
    throw new Error('Failed to get blob ID');
  }

  private async downloadFromWalrus(blobId: string): Promise<Uint8Array> {
    const response = await fetch(`${CONFIG.walrusAggregatorUrl}/v1/blobs/${blobId}`);
    
    if (!response.ok) {
      throw new Error('Failed to download from Walrus');
    }

    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  }
}