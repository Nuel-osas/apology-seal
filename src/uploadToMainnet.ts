import { SealClient } from '@mysten/seal';
import { toHex, fromHex } from '@mysten/bcs';
import { SuiClient } from '@mysten/sui/client';
import * as dotenv from 'dotenv';

dotenv.config();

const APOLOGY_MESSAGE = `Hey BL and Kotaro,

Just realized that I mistakenly typed an offensive reply as tweet to your post

I was meant to type "is he going for a hiking?" But it turns out I was carried away and posted a wrong reply as auto correction mode kicked in... When I saw it, I deleted immediately.

Please forgive my carelessness.

P.S. The dev (ruru) who helped build this sealed apology system has sponsored a gift drop - $5 each for the first 10 persons to claim it:
https://giftdrop.io/yO2ri8lq`;

async function uploadToMainnetWalrus() {
    try {
        // Use the existing apology ID and document ID from testnet
        const documentId = '0e77c7d5adc249aa0fb2d5d62233fff563192a0dbd3ee318d4326c8f350ed8f249feb70b5b51de734a95f7ae59d8c325';
        
        console.log('🔒 Encrypting message with Seal...\n');
        
        // Create SuiClient for testnet (where Seal is deployed)
        const suiClient = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
        
        // Create SealClient and encrypt
        const serverObjectIds = ['0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75'];
        const sealClient = new SealClient({
            suiClient,
            serverConfigs: serverObjectIds.map(id => ({
                url: 'https://seal.mystenlabs.com:2443',
                objectId: id,
                weight: 1,
            }))
        });
        
        const messageBytes = new TextEncoder().encode(APOLOGY_MESSAGE);
        const { encryptedObject } = await sealClient.encrypt({
            threshold: 1,
            packageId: '0xf40c5c3293fe7213a0805d79a3349cce0654644a314b49262ef07a28e8b9c14a',
            id: documentId,
            data: messageBytes,
        });
        console.log('✅ Message encrypted');
        
        // Upload to mainnet Walrus with 5 epochs
        console.log('\n📤 Uploading to Mainnet Walrus...\n');
        const walrusApiUrl = 'https://publisher.walrus.space';
        
        const response = await fetch(`${walrusApiUrl}/v1/blobs?epochs=5`, {
            method: 'PUT',
            body: encryptedObject as any,
            headers: {
                'Content-Type': 'application/octet-stream',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Upload failed:', errorText);
            throw new Error('Failed to upload to Walrus');
        }

        const result: any = await response.json();
        
        let blobId: string;
        if (result.newlyCreated?.blobObject) {
            blobId = result.newlyCreated.blobObject.blobId;
        } else if (result.alreadyCertified?.blobObject) {
            blobId = result.alreadyCertified.blobObject.blobId;
        } else {
            throw new Error('Failed to get blob ID');
        }

        console.log('✅ Successfully uploaded to Mainnet Walrus');
        console.log('   Blob ID:', blobId);
        console.log('\n📋 Update the decrypt page with this blob ID:');
        console.log(`   walrusBlobId: '${blobId}',`);
        console.log('\n🌐 View URL:');
        console.log(`   https://aggregator.walrus.space/v1/${blobId}`);
        
        return blobId;
        
    } catch (error) {
        console.error('\n❌ Error:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    uploadToMainnetWalrus().then(() => {
        console.log('\n✨ Upload completed successfully!');
        process.exit(0);
    }).catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

export { uploadToMainnetWalrus };