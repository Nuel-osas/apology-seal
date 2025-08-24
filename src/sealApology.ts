import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromHex, toHex } from '@mysten/sui/utils';
import { SealClient, SessionKey } from '@mysten/seal';
import * as dotenv from 'dotenv';

dotenv.config();

// ======== Configuration ========

export interface ApologyConfig {
    packageId: string;
    senderKeypair: Ed25519Keypair;
    blAddress: string;
    kotaroAddress: string;
    network?: 'testnet' | 'mainnet';
    walrusApiUrl?: string;
    sessionKeyTTL?: number;
    expiryDays?: number;
}

export interface EncryptedApology {
    encryptedData: Uint8Array;
    documentId: string;
    backupKey: string;
    walrusBlobId?: string;
    apologyId?: string;
}

// ======== Main Service Class ========

export class SealedApologyService {
    private suiClient: SuiClient;
    private sealClient: SealClient;
    private packageId: string;
    private senderKeypair: Ed25519Keypair;
    private network: 'testnet' | 'mainnet';
    private walrusApiUrl: string;
    private sessionKeyTTL: number;
    private readonly CLOCK_OBJECT_ID = '0x6';

    constructor(config: ApologyConfig) {
        this.network = config.network || 'testnet';
        const defaultRpc = this.network === 'mainnet' 
            ? 'https://fullnode.mainnet.sui.io'
            : 'https://fullnode.testnet.sui.io';
        
        this.suiClient = new SuiClient({ url: defaultRpc });
        this.packageId = config.packageId;
        this.senderKeypair = config.senderKeypair;
        this.walrusApiUrl = config.walrusApiUrl || 
            (this.network === 'mainnet' 
                ? 'https://publisher.walrus.space'
                : 'https://publisher.walrus-testnet.walrus.space');
        this.sessionKeyTTL = config.sessionKeyTTL || 10;
        
        this.sealClient = this.initializeSealClient();
    }

    // ======== SEAL Client Initialization ========

    private initializeSealClient(): SealClient {
        // Hardcoded key server IDs for testnet and mainnet
        const serverObjectIds = this.network === 'mainnet' 
            ? [
                '0x0e76e8feff7e0643c47bae6ab8fdc8058969d7531bc858fe64cbac7e692fcc95',
              ]
            : [
                '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75',
              ];

        return new SealClient({
            suiClient: this.suiClient,
            serverConfigs: serverObjectIds.map((id: string) => ({
                objectId: id,
                weight: 1,
            })),
            verifyKeyServers: false,
        });
    }

    // ======== Create Sealed Apology ========

    async createSealedApology(
        message: string,
        blAddress: string,
        kotaroAddress: string,
        expiryDays: number = 30
    ): Promise<EncryptedApology> {
        console.log('📝 Creating sealed apology on Sui...');
        
        // Step 1: Create the on-chain apology object
        const tx = new Transaction();
        
        const messagePreview = "An onchain heartfelt apology from SILVERHARD to BL AND KOTARO";
        
        tx.moveCall({
            target: `${this.packageId}::sealed_apology::create_apology_entry`,
            arguments: [
                tx.pure.address(blAddress),
                tx.pure.address(kotaroAddress),
                tx.pure.string(messagePreview),
                tx.pure.u64(expiryDays),
                tx.object(this.CLOCK_OBJECT_ID),
            ],
        });

        let result = await this.suiClient.signAndExecuteTransaction({
            transaction: tx,
            signer: this.senderKeypair,
            options: {
                showEffects: true,
                showObjectChanges: true,
                showEvents: true,
            },
        });

        // Check if we only got a digest
        if (typeof result === 'string' || !result.objectChanges) {
            console.log('Got transaction digest:', result);
            // We need to fetch the full transaction
            const fullResult = await this.suiClient.waitForTransaction({
                digest: typeof result === 'string' ? result : result.digest,
                options: {
                    showEffects: true,
                    showObjectChanges: true,
                    showEvents: true,
                },
            });
            console.log('Full transaction result:', JSON.stringify(fullResult, null, 2));
            result = fullResult;
        }
        
        // Find the SealedApology object (not the Cap)
        const apologyObject = result.objectChanges?.find(
            change => change.type === 'created' && 
            change.objectType?.includes('::sealed_apology::SealedApology')
        );

        if (!apologyObject || !('objectId' in apologyObject)) {
            console.error('Could not find SealedApology in object changes');
            console.error('Available objects:', result.objectChanges);
            throw new Error('Failed to find SealedApology object');
        }

        const apologyId = apologyObject.objectId;
        console.log(`✅ Apology created: ${apologyId}`);

        // Step 2: Generate document ID (apology namespace + nonce)
        const documentId = this.generateDocumentId(apologyId);
        
        // Step 3: Encrypt the message with SEAL
        console.log('🔐 Encrypting message with SEAL...');
        const encrypted = await this.encryptMessage(message, documentId);
        
        // Step 4: Upload to Walrus
        console.log('📤 Uploading to Walrus...');
        const walrusBlobId = await this.uploadToWalrus(encrypted.encryptedData);
        
        // Step 5: Skip attaching blob (optional - would require cap ownership)
        console.log(`✅ Walrus blob created: ${walrusBlobId}`);
        
        return {
            ...encrypted,
            walrusBlobId,
            apologyId,
        };
    }

    // ======== Encryption ========

    private generateDocumentId(apologyId: string): string {
        const nonce = crypto.getRandomValues(new Uint8Array(16));
        const apologyBytes = fromHex(apologyId.replace('0x', ''));
        const documentIdBytes = new Uint8Array([...apologyBytes, ...nonce]);
        return toHex(documentIdBytes);
    }

    private async encryptMessage(
        message: string,
        documentId: string
    ): Promise<Omit<EncryptedApology, 'walrusBlobId' | 'apologyId'>> {
        const messageBytes = new TextEncoder().encode(message);
        
        const { encryptedObject, key: backupKey } = await this.sealClient.encrypt({
            threshold: 1, // Using 1 for testnet (only 1 key server available)
            packageId: this.packageId,
            id: documentId,
            data: messageBytes,
        });

        return {
            encryptedData: encryptedObject,
            documentId,
            backupKey: toHex(backupKey),
        };
    }

    // ======== Walrus Storage ========

    private async uploadToWalrus(encryptedData: Uint8Array): Promise<string> {
        const uploadUrl = `${this.walrusApiUrl}/v1/blobs?epochs=1`;
        
        const response = await fetch(uploadUrl, {
            method: 'PUT',
            body: encryptedData,
            headers: {
                'Content-Type': 'application/octet-stream',
            },
        });

        if (!response.ok) {
            throw new Error(`Walrus upload failed: ${response.statusText}`);
        }

        const result: any = await response.json();
        
        if (result.newlyCreated && result.newlyCreated.blobObject) {
            return result.newlyCreated.blobObject.blobId;
        } else if (result.alreadyCertified && result.alreadyCertified.blobObject) {
            return result.alreadyCertified.blobObject.blobId;
        }
        
        throw new Error('Failed to get blob ID from Walrus response');
    }

    private async downloadFromWalrus(blobId: string): Promise<Uint8Array> {
        const response = await fetch(`${this.walrusApiUrl}/v1/${blobId}`, {
            method: 'GET',
        });

        if (!response.ok) {
            throw new Error(`Walrus download failed: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        return new Uint8Array(buffer);
    }

    private async attachWalrusBlob(apologyId: string, blobId: string): Promise<void> {
        const tx = new Transaction();
        
        // Need to get the cap object first
        const capObject = await this.getApologyCap();
        
        tx.moveCall({
            target: `${this.packageId}::sealed_apology::attach_walrus_blob`,
            arguments: [
                tx.object(apologyId),
                tx.object(capObject),
                tx.pure.string(blobId),
            ],
        });

        await this.suiClient.signAndExecuteTransaction({
            transaction: tx,
            signer: this.senderKeypair,
        });
        
        console.log(`✅ Walrus blob attached: ${blobId}`);
    }

    private async getApologyCap(): Promise<string> {
        const owner = this.senderKeypair.toSuiAddress();
        const objects = await this.suiClient.getOwnedObjects({
            owner,
            filter: {
                StructType: `${this.packageId}::sealed_apology::ApologyCap`,
            },
        });

        if (objects.data.length === 0) {
            throw new Error('No ApologyCap found for sender');
        }

        return objects.data[0].data?.objectId || '';
    }

    // ======== Decryption ========

    async decryptApology(
        apologyId: string,
        walrusBlobId: string,
        documentId: string,
        recipientKeypair: Ed25519Keypair
    ): Promise<string> {
        console.log('📥 Downloading from Walrus...');
        const encryptedData = await this.downloadFromWalrus(walrusBlobId);
        
        console.log('🔑 Creating session key...');
        const sessionKey = await this.createSessionKey(recipientKeypair);
        
        console.log('🔓 Decrypting with SEAL...');
        const tx = new Transaction();
        tx.moveCall({
            target: `${this.packageId}::sealed_apology::seal_approve`,
            arguments: [
                tx.pure.vector('u8', Array.from(fromHex(documentId))),
                tx.object(apologyId),
                tx.object(this.CLOCK_OBJECT_ID),
            ],
        });
        
        const txBytes = await tx.build({ 
            client: this.suiClient, 
            onlyTransactionKind: true 
        });

        const decryptedData = await this.sealClient.decrypt({
            data: encryptedData,
            sessionKey,
            txBytes,
        });

        return new TextDecoder().decode(decryptedData);
    }

    private async createSessionKey(recipientKeypair: Ed25519Keypair): Promise<SessionKey> {
        const recipientAddress = recipientKeypair.toSuiAddress();
        
        const sessionKey = await SessionKey.create({
            address: recipientAddress,
            packageId: this.packageId,
            ttlMin: this.sessionKeyTTL,
            suiClient: this.suiClient,
        });

        // Sign the personal message
        const message = sessionKey.getPersonalMessage();
        const { signature } = await recipientKeypair.signPersonalMessage(
            Buffer.from(message)
        );
        sessionKey.setPersonalMessageSignature(signature);

        return sessionKey;
    }

    // ======== Transfer Functions ========

    async transferApologyToRecipient(
        apologyId: string,
        recipientAddress: string
    ): Promise<void> {
        const tx = new Transaction();

        tx.moveCall({
            target: `${this.packageId}::sealed_apology::transfer_apology`,
            arguments: [
                tx.object(apologyId),
                tx.pure.address(recipientAddress),
            ],
        });

        await this.suiClient.signAndExecuteTransaction({
            transaction: tx,
            signer: this.senderKeypair,
        });
        
        console.log(`✅ Apology transferred to ${recipientAddress}`);
    }
}