#!/usr/bin/env node

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SealedApologyService } from './sealApology';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function decryptApology() {
    // Load configuration
    const recipientPrivateKey = process.env.RECIPIENT_PRIVATE_KEY;
    const packageId = process.env.PACKAGE_ID;
    const apologyId = process.env.APOLOGY_ID;
    const documentId = process.env.DOCUMENT_ID;
    const walrusBlobId = process.env.WALRUS_BLOB_ID;
    const network = (process.env.NETWORK || 'testnet') as 'testnet' | 'mainnet';
    
    // Alternative: Load from credentials file
    const credentialsPath = process.env.CREDENTIALS_FILE || 
        path.join(process.cwd(), 'output', 'apology-credentials.json');
    
    let credentials: any = {};
    if (fs.existsSync(credentialsPath) && !apologyId) {
        console.log(`📄 Loading credentials from: ${credentialsPath}`);
        credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
    }

    // Use environment variables first, fall back to credentials file
    const finalConfig = {
        packageId: packageId || credentials.packageId,
        apologyId: apologyId || credentials.apologyId,
        documentId: documentId || credentials.documentId,
        walrusBlobId: walrusBlobId || credentials.walrusBlobId,
        network: network || credentials.network || 'testnet',
    };

    if (!recipientPrivateKey || !finalConfig.packageId || !finalConfig.apologyId || 
        !finalConfig.documentId || !finalConfig.walrusBlobId) {
        console.error('❌ Missing required configuration:');
        console.error('\nRequired environment variables:');
        console.error('   RECIPIENT_PRIVATE_KEY: Your Sui wallet private key');
        console.error('\nApology details (set these or use CREDENTIALS_FILE):');
        console.error('   PACKAGE_ID: The deployed package ID');
        console.error('   APOLOGY_ID: The sealed apology object ID');
        console.error('   DOCUMENT_ID: The document ID for decryption');
        console.error('   WALRUS_BLOB_ID: The Walrus blob ID');
        console.error('\nOptional:');
        console.error('   NETWORK: testnet or mainnet');
        console.error('   CREDENTIALS_FILE: Path to credentials JSON file');
        process.exit(1);
    }

    try {
        console.log('🔓 Sealed Apology Decryption');
        console.log('============================\n');

        // Initialize keypair
        const recipientKeypair = Ed25519Keypair.fromSecretKey(
            Buffer.from(recipientPrivateKey, 'hex')
        );
        const recipientAddress = recipientKeypair.toSuiAddress();

        console.log('📋 Configuration:');
        console.log(`   Network: ${finalConfig.network}`);
        console.log(`   Recipient: ${recipientAddress}`);
        console.log(`   Package: ${finalConfig.packageId}`);
        console.log(`   Apology ID: ${finalConfig.apologyId}`);
        console.log(`   Document ID: ${finalConfig.documentId.substring(0, 20)}...`);
        console.log(`   Walrus Blob: ${finalConfig.walrusBlobId}\n`);

        // Check if recipient is authorized
        if (credentials.recipients) {
            const isAuthorized = 
                recipientAddress === credentials.recipients.bl ||
                recipientAddress === credentials.recipients.kotaro;
            
            if (!isAuthorized) {
                console.warn('⚠️  Warning: Your address may not be in the allowlist');
                console.warn(`   Your address: ${recipientAddress}`);
                console.warn(`   BL: ${credentials.recipients.bl}`);
                console.warn(`   Kotaro: ${credentials.recipients.kotaro}\n`);
            }
        }

        // Initialize service
        const apologyService = new SealedApologyService({
            packageId: finalConfig.packageId,
            senderKeypair: recipientKeypair, // Using recipient's keypair
            blAddress: '', // Not needed for decryption
            kotaroAddress: '', // Not needed for decryption
            network: finalConfig.network as 'testnet' | 'mainnet',
        });

        console.log('🔐 Starting decryption process...\n');
        console.log('1️⃣  Downloading encrypted data from Walrus...');
        console.log('2️⃣  Creating session key with your wallet...');
        console.log('3️⃣  Requesting decryption from SEAL key servers...');
        console.log('4️⃣  Verifying authorization via seal_approve...\n');

        // Decrypt the apology
        const decryptedMessage = await apologyService.decryptApology(
            finalConfig.apologyId,
            finalConfig.walrusBlobId,
            finalConfig.documentId,
            recipientKeypair
        );

        console.log('\n✅ Apology decrypted successfully!\n');
        console.log('═'.repeat(60));
        console.log('📜 DECRYPTED MESSAGE:');
        console.log('═'.repeat(60));
        console.log();
        console.log(decryptedMessage);
        console.log();
        console.log('═'.repeat(60));

        // Save decrypted message
        const outputDir = path.join(process.cwd(), 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputFile = path.join(outputDir, 'decrypted-apology.txt');
        fs.writeFileSync(outputFile, decryptedMessage);
        console.log(`\n💾 Message saved to: ${outputFile}`);

        // Show metadata if available
        if (credentials.createdAt) {
            console.log('\n📊 Metadata:');
            console.log(`   Created: ${new Date(credentials.createdAt).toLocaleString()}`);
            console.log(`   Expires: ${new Date(credentials.expiresAt).toLocaleString()}`);
        }

        console.log('\n🎉 Decryption successful!');
        console.log('   ✅ Downloaded from Walrus');
        console.log('   ✅ Authorized via Sui blockchain');
        console.log('   ✅ Decrypted with SEAL key servers');
        console.log('   ✅ Message verified and readable');

    } catch (error) {
        console.error('\n❌ Error decrypting apology:');
        console.error(error);
        
        if (error instanceof Error) {
            if (error.message.includes('NOT_AUTHORIZED')) {
                console.error('\n⚠️  You are not authorized to decrypt this apology.');
                console.error('Only addresses in the allowlist (BL and Kotaro) can decrypt.');
            } else if (error.message.includes('EXPIRED')) {
                console.error('\n⚠️  This apology has expired.');
                console.error('The decryption window has closed.');
            } else if (error.message.includes('session')) {
                console.error('\n⚠️  Session key error.');
                console.error('Try again or check your wallet configuration.');
            } else if (error.message.includes('Walrus')) {
                console.error('\n⚠️  Failed to download from Walrus.');
                console.error('Check the blob ID and network connectivity.');
            } else if (error.message.includes('prefix')) {
                console.error('\n⚠️  Document ID mismatch.');
                console.error('The document ID does not match the apology namespace.');
            }
        }
        
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    decryptApology().then(() => {
        console.log('\n✨ Process completed successfully!');
        process.exit(0);
    }).catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

export { decryptApology };