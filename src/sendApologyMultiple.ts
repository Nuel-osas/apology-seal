#!/usr/bin/env node

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
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

async function sendSealedApologyToMultiple() {
    // Load configuration from environment
    const senderPrivateKey = process.env.SENDER_PRIVATE_KEY;
    const packageId = process.env.PACKAGE_ID;
    const network = (process.env.NETWORK || 'testnet') as 'testnet' | 'mainnet';
    const walrusApiUrl = process.env.WALRUS_API_URL || 
        (network === 'mainnet' 
            ? 'https://publisher.walrus.space'
            : 'https://publisher.walrus-testnet.walrus.space');

    // Collect all recipients
    const recipients = [
        { name: 'BL', address: process.env.BL_WALLET_ADDRESS },
        { name: 'Kotaro', address: process.env.KOTARO_WALLET_ADDRESS },
        { name: 'Recipient 3', address: process.env.RECIPIENT_3 },
        { name: 'Recipient 4', address: process.env.RECIPIENT_4 },
        { name: 'Recipient 5', address: process.env.RECIPIENT_5 },
        { name: 'Recipient 6', address: process.env.RECIPIENT_6 },
        { name: 'Recipient 7', address: process.env.RECIPIENT_7 },
        { name: 'Recipient 8', address: process.env.RECIPIENT_8 },
        { name: 'Recipient 9', address: process.env.RECIPIENT_9 },
        { name: 'Recipient 10', address: process.env.RECIPIENT_10 },
        { name: 'Recipient 11', address: process.env.RECIPIENT_11 },
        { name: 'Recipient 12', address: process.env.RECIPIENT_12 },
        { name: 'Recipient 13', address: process.env.RECIPIENT_13 },
        { name: 'Recipient 14', address: process.env.RECIPIENT_14 },
    ].filter(r => r.address); // Filter out any undefined addresses

    if (!senderPrivateKey || !packageId || recipients.length < 2) {
        console.error('❌ Missing required environment variables');
        process.exit(1);
    }

    try {
        console.log('🚀 Sealed Apology with Multiple Recipients');
        console.log('==========================================\n');

        // Initialize keypair
        let senderKeypair: Ed25519Keypair;
        
        if (senderPrivateKey.startsWith('suiprivkey')) {
            const { decodeSuiPrivateKey } = await import('@mysten/sui/cryptography');
            const decoded = decodeSuiPrivateKey(senderPrivateKey);
            senderKeypair = Ed25519Keypair.fromSecretKey(decoded.secretKey);
        } else {
            senderKeypair = Ed25519Keypair.fromSecretKey(
                Buffer.from(senderPrivateKey, 'hex')
            );
        }

        // Initialize Sui client
        const rpcUrl = network === 'mainnet' 
            ? 'https://fullnode.mainnet.sui.io'
            : 'https://fullnode.testnet.sui.io';
        
        const suiClient = new SuiClient({ url: rpcUrl });

        console.log('📋 Configuration:');
        console.log(`   Network: ${network}`);
        console.log(`   Sender: ${senderKeypair.toSuiAddress()}`);
        console.log(`   Package: ${packageId}\n`);

        console.log('👥 Recipients (' + recipients.length + ' total):');
        recipients.forEach((r, i) => {
            console.log(`   ${i + 1}. ${r.name}: ${r.address}`);
        });
        console.log();

        // Step 1: Create apology with first two recipients
        console.log('🔐 Creating sealed apology...\n');
        
        const tx = new Transaction();
        const messagePreview = "An onchain heartfelt apology from SILVERHARD to BL AND KOTARO";
        const CLOCK_OBJECT_ID = '0x6';
        
        // Create apology with BL and Kotaro using the entry function
        tx.moveCall({
            target: `${packageId}::sealed_apology::create_apology_entry`,
            arguments: [
                tx.pure.address(recipients[0].address!), // BL
                tx.pure.address(recipients[1].address!), // Kotaro
                tx.pure.string(messagePreview),
                tx.pure.u64(30), // 30 days expiry
                tx.object(CLOCK_OBJECT_ID),
            ],
        });

        // Step 2: Get the apology object from events (we'll need to execute first transaction)
        const result1 = await suiClient.signAndExecuteTransaction({
            transaction: tx,
            signer: senderKeypair,
            options: {
                showObjectChanges: true,
                showEvents: true,
            },
        });

        // Find the created apology object
        const apologyObject = result1.objectChanges?.find(
            change => change.type === 'created' && 
            change.objectType?.includes('::sealed_apology::SealedApology')
        );

        const capObject = result1.objectChanges?.find(
            change => change.type === 'created' && 
            change.objectType?.includes('::sealed_apology::ApologyCap')
        );

        if (!apologyObject || !('objectId' in apologyObject) || !capObject || !('objectId' in capObject)) {
            throw new Error('Failed to create apology');
        }

        const apologyId = apologyObject.objectId;
        const capId = capObject.objectId;

        console.log(`✅ Apology created: ${apologyId}`);
        console.log(`✅ Cap ID: ${capId}\n`);

        // Step 3: Add remaining recipients
        if (recipients.length > 2) {
            console.log('➕ Adding additional recipients...\n');
            
            for (let i = 2; i < recipients.length; i++) {
                const tx2 = new Transaction();
                
                tx2.moveCall({
                    target: `${packageId}::sealed_apology::add_recipient`,
                    arguments: [
                        tx2.object(apologyId),
                        tx2.object(capId),
                        tx2.pure.address(recipients[i].address!),
                    ],
                });

                await suiClient.signAndExecuteTransaction({
                    transaction: tx2,
                    signer: senderKeypair,
                });

                console.log(`   ✅ Added ${recipients[i].name}`);
            }
        }

        // Step 4: Encrypt the message using Seal
        console.log('\n🔒 Encrypting message with Seal...\n');
        
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
        const documentIdBytes = generateDocumentId(apologyId);
        const documentId = toHex(documentIdBytes);
        const messageBytes = new TextEncoder().encode(APOLOGY_MESSAGE);
        
        const { encryptedObject, key } = await sealClient.encrypt({
            threshold: 1,
            packageId,
            id: documentId,
            data: messageBytes,
        });

        console.log('✅ Message encrypted');
        console.log(`   Document ID: ${documentId}`);

        // Step 5: Upload to Walrus
        console.log('\n📤 Uploading to Walrus...\n');
        
        const walrusBlobId = await uploadToWalrus(encryptedObject, walrusApiUrl);
        console.log(`✅ Uploaded to Walrus: ${walrusBlobId}`);

        // Save credentials
        const outputDir = path.join(process.cwd(), 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const credentialsFile = path.join(outputDir, 'apology-credentials-multiple.json');
        const credentials = {
            network,
            packageId,
            apologyId,
            capId,
            documentId: documentId,
            walrusBlobId,
            backupKey: toHex(key),
            recipients: recipients.reduce((acc, r) => {
                acc[r.name] = r.address!;
                return acc;
            }, {} as Record<string, string>),
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        };

        fs.writeFileSync(credentialsFile, JSON.stringify(credentials, null, 2));

        console.log('\n' + '='.repeat(60));
        console.log('✨ SUCCESS! Sealed apology created for ' + recipients.length + ' recipients');
        console.log('='.repeat(60));
        console.log('\n📦 Apology Details:');
        console.log(`   Object ID: ${apologyId}`);
        console.log(`   Document ID: ${documentId}`);
        console.log(`   Walrus Blob: ${walrusBlobId}`);
        console.log(`   Credentials saved to: ${credentialsFile}`);
        console.log('\n🔐 All ' + recipients.length + ' recipients can now decrypt the message');

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
    sendSealedApologyToMultiple().then(() => {
        console.log('\n✨ Process completed successfully!');
        process.exit(0);
    }).catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

export { sendSealedApologyToMultiple };