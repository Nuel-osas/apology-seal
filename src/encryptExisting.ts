#!/usr/bin/env node

import { SuiClient } from '@mysten/sui/client';
import { SealClient } from '@mysten/seal';
import { fromHex, toHex } from '@mysten/sui/utils';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const APOLOGY_MESSAGE = `Hey BL and Kotaro,

Just realized that I mistakenly typed an offensive reply as tweet to your post

I was meant to type "is he going for a hiking?" But it turns out I was carried away and posted a wrong reply as auto correction mode kicked in... When I saw it, I deleted immediately.

Please forgive my carelessness.

P.S. The dev (ruru) who helped build this sealed apology system has sponsored a gift drop - $5 each for the first 10 persons to claim it:
https://giftdrop.io/yO2ri8lq`;

// Use the existing apology that was already created
const EXISTING_APOLOGY_ID = '0x522f9b42f4889888f0a04c20bfcc31bdf1f4b4149f39423731b3b708bf639c69';
const EXISTING_CAP_ID = '0x01e3fc3371e1440d71d706f6da9c530d57d60876c92b32cd2f6480b08b5113a0';

async function encryptExistingApology() {
    const packageId = process.env.PACKAGE_ID;
    const network = (process.env.NETWORK || 'testnet') as 'testnet' | 'mainnet';
    const walrusApiUrl = process.env.WALRUS_API_URL || 
        (network === 'mainnet' 
            ? 'https://publisher.walrus.space'
            : 'https://publisher.walrus-testnet.walrus.space');

    if (!packageId) {
        console.error('❌ Missing PACKAGE_ID');
        process.exit(1);
    }

    try {
        console.log('🔒 Encrypting existing apology...\n');
        console.log(`   Apology ID: ${EXISTING_APOLOGY_ID}`);
        console.log(`   Cap ID: ${EXISTING_CAP_ID}\n`);

        // Initialize Sui client
        const rpcUrl = network === 'mainnet' 
            ? 'https://fullnode.mainnet.sui.io'
            : 'https://fullnode.testnet.sui.io';
        
        const suiClient = new SuiClient({ url: rpcUrl });

        // Initialize Seal client
        const serverObjectIds = network === 'mainnet' 
            ? ['0x0e76e8feff7e0643c47bae6ab8fdc8058969d7531bc858fe64cbac7e692fcc95']
            : ['0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75'];

        const sealClient = new SealClient({
            suiClient,
            serverConfigs: serverObjectIds.map(id => ({
                objectId: id,
                weight: 1,
            })),
            verifyKeyServers: false,
        });

        // Generate document ID
        const documentIdBytes = generateDocumentId(EXISTING_APOLOGY_ID);
        const documentId = toHex(documentIdBytes);
        const messageBytes = new TextEncoder().encode(APOLOGY_MESSAGE);
        
        console.log('📝 Encrypting message with Seal...');
        const { encryptedObject, key } = await sealClient.encrypt({
            threshold: 1,
            packageId,
            id: documentId,
            data: messageBytes,
        });

        console.log('✅ Message encrypted');
        console.log(`   Document ID: ${documentId}`);

        // Upload to Walrus
        console.log('\n📤 Uploading to Walrus...');
        const walrusBlobId = await uploadToWalrus(encryptedObject, walrusApiUrl);
        console.log(`✅ Uploaded to Walrus: ${walrusBlobId}`);

        // Save credentials
        const outputDir = path.join(process.cwd(), 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const credentialsFile = path.join(outputDir, 'apology-credentials-14-recipients.json');
        const credentials = {
            network,
            packageId,
            apologyId: EXISTING_APOLOGY_ID,
            capId: EXISTING_CAP_ID,
            documentId,
            walrusBlobId,
            backupKey: toHex(key),
            recipientCount: 14,
            note: 'This apology is accessible by BL, Kotaro, and 12 additional recipients',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        };

        fs.writeFileSync(credentialsFile, JSON.stringify(credentials, null, 2));

        console.log('\n' + '='.repeat(60));
        console.log('✨ SUCCESS! Encrypted and uploaded existing apology');
        console.log('='.repeat(60));
        console.log('\n📦 Apology Details:');
        console.log(`   Object ID: ${EXISTING_APOLOGY_ID}`);
        console.log(`   Document ID: ${documentId}`);
        console.log(`   Walrus Blob: ${walrusBlobId}`);
        console.log(`   Backup Key: ${toHex(key).substring(0, 20)}...`);
        console.log(`   Credentials saved to: ${credentialsFile}`);
        console.log('\n🔐 All 14 recipients can now decrypt the message');

    } catch (error) {
        console.error('\n❌ Error:', error);
        process.exit(1);
    }
}

function generateDocumentId(apologyId: string): Uint8Array {
    const nonce = crypto.getRandomValues(new Uint8Array(16));
    const apologyBytes = fromHex(apologyId.replace('0x', ''));
    return new Uint8Array([...apologyBytes, ...nonce]);
}

async function uploadToWalrus(data: Uint8Array, apiUrl: string): Promise<string> {
    const response = await fetch(`${apiUrl}/v1/blobs?epochs=1`, {
        method: 'PUT',
        body: data as any,
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

// Run if called directly
if (require.main === module) {
    encryptExistingApology().then(() => {
        console.log('\n✨ Process completed successfully!');
        process.exit(0);
    }).catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

export { encryptExistingApology };