#!/usr/bin/env node

import { SealClient } from '@mysten/seal';
import { SuiClient } from '@mysten/sui/client';
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

// Use the existing credentials
const APOLOGY_ID = '0x522f9b42f4889888f0a04c20bfcc31bdf1f4b4149f39423731b3b708bf639c69';
const DOCUMENT_ID = '522f9b42f4889888f0a04c20bfcc31bdf1f4b4149f39423731b3b708bf639c69c29a4ed61f2fc69c4b915083bda9b233';

async function reuploadToWalrus() {
    const packageId = process.env.PACKAGE_ID || '0xf40c5c3293fe7213a0805d79a3349cce0654644a314b49262ef07a28e8b9c14a';
    const walrusApiUrl = 'https://publisher.walrus-testnet.walrus.space';

    try {
        console.log('🔄 Re-uploading encrypted apology to Walrus...\n');
        
        // Initialize Sui client for testnet
        const suiClient = new SuiClient({ url: 'https://fullnode.testnet.sui.io' });

        // Initialize Seal client
        const sealClient = new SealClient({
            suiClient,
            serverConfigs: [{
                objectId: '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75',
                weight: 1,
            }],
            verifyKeyServers: false,
        });

        // Re-encrypt the message with the same document ID
        console.log('📝 Encrypting message...');
        const messageBytes = new TextEncoder().encode(APOLOGY_MESSAGE);
        
        const { encryptedObject, key } = await sealClient.encrypt({
            threshold: 1,
            packageId,
            id: DOCUMENT_ID,
            data: messageBytes,
        });

        console.log('✅ Message encrypted');

        // Upload to Walrus with MORE epochs this time
        console.log('\n📤 Uploading to Walrus with 5 epochs...');
        const response = await fetch(`${walrusApiUrl}/v1/blobs?epochs=5`, {
            method: 'PUT',
            body: encryptedObject as any,
            headers: {
                'Content-Type': 'application/octet-stream',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to upload to Walrus');
        }

        const result: any = await response.json();
        
        let walrusBlobId: string;
        if (result.newlyCreated?.blobObject) {
            walrusBlobId = result.newlyCreated.blobObject.blobId;
        } else if (result.alreadyCertified?.blobObject) {
            walrusBlobId = result.alreadyCertified.blobObject.blobId;
        } else {
            throw new Error('Failed to get blob ID');
        }

        console.log(`✅ Uploaded to Walrus: ${walrusBlobId}`);
        console.log('   Valid for 5 epochs (5 days on testnet)');

        // Save new credentials
        const outputDir = path.join(process.cwd(), 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const credentialsFile = path.join(outputDir, 'apology-credentials-reuploaded.json');
        const credentials = {
            network: 'testnet',
            packageId,
            apologyId: APOLOGY_ID,
            documentId: DOCUMENT_ID,
            walrusBlobId,
            backupKey: toHex(key),
            recipientCount: 14,
            note: 'Re-uploaded with 5 epochs duration',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        };

        fs.writeFileSync(credentialsFile, JSON.stringify(credentials, null, 2));

        console.log('\n' + '='.repeat(60));
        console.log('✨ SUCCESS! Re-uploaded to Walrus');
        console.log('='.repeat(60));
        console.log('\n📦 New Walrus Blob ID: ' + walrusBlobId);
        console.log('   This needs to be updated in the decrypt page!');
        console.log('\nCredentials saved to: ' + credentialsFile);

        return walrusBlobId;

    } catch (error) {
        console.error('\n❌ Error:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    reuploadToWalrus().then((blobId) => {
        console.log('\n🎯 Next step: Update decrypt page with new blob ID:', blobId);
        process.exit(0);
    }).catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

export { reuploadToWalrus };