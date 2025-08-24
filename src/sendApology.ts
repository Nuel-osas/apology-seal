#!/usr/bin/env node

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SealedApologyService } from './sealApology';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const APOLOGY_MESSAGE = `Hey BL and Kotaro,

Just realized that I mistakenly typed an offensive reply as tweet to your post

I was meant to type "is he going for a hiking?" But it turns out I was carried away and posted a wrong reply as auto correction mode kicked in... When I saw it, I deleted immediately.

Please forgive my carelessness.`;

async function sendSealedApology() {
    // Load configuration from environment
    const senderPrivateKey = process.env.SENDER_PRIVATE_KEY;
    const packageId = process.env.PACKAGE_ID;
    const blWalletAddress = process.env.BL_WALLET_ADDRESS;
    const kotaroWalletAddress = process.env.KOTARO_WALLET_ADDRESS;
    const network = (process.env.NETWORK || 'testnet') as 'testnet' | 'mainnet';
    const walrusApiUrl = process.env.WALRUS_API_URL;

    if (!senderPrivateKey || !packageId || !blWalletAddress || !kotaroWalletAddress) {
        console.error('❌ Missing required environment variables:');
        console.error('   SENDER_PRIVATE_KEY: Your Sui wallet private key');
        console.error('   PACKAGE_ID: The deployed package ID');
        console.error('   BL_WALLET_ADDRESS: BL\'s Sui wallet address');
        console.error('   KOTARO_WALLET_ADDRESS: Kotaro\'s Sui wallet address');
        console.error('\nOptional:');
        console.error('   NETWORK: testnet or mainnet (defaults to testnet)');
        console.error('   WALRUS_API_URL: Custom Walrus API endpoint');
        process.exit(1);
    }

    try {
        console.log('🚀 Sealed Apology with Walrus Storage');
        console.log('=====================================\n');

        // Initialize keypair
        let senderKeypair: Ed25519Keypair;
        
        // Handle both formats: raw hex or suiprivkey format
        if (senderPrivateKey.startsWith('suiprivkey')) {
            // For suiprivkey format, use the decodeSuiPrivateKey method
            const { decodeSuiPrivateKey } = await import('@mysten/sui/cryptography');
            const decoded = decodeSuiPrivateKey(senderPrivateKey);
            senderKeypair = Ed25519Keypair.fromSecretKey(decoded.secretKey);
        } else {
            // For raw hex format
            senderKeypair = Ed25519Keypair.fromSecretKey(
                Buffer.from(senderPrivateKey, 'hex')
            );
        }

        // Initialize service
        const apologyService = new SealedApologyService({
            packageId,
            senderKeypair,
            blAddress: blWalletAddress,
            kotaroAddress: kotaroWalletAddress,
            network,
            walrusApiUrl,
            expiryDays: 30,
        });

        console.log('📋 Configuration:');
        console.log(`   Network: ${network}`);
        console.log(`   Sender: ${senderKeypair.toSuiAddress()}`);
        console.log(`   Package: ${packageId}`);
        console.log(`   Walrus: ${walrusApiUrl || 'Default'}\n`);

        console.log('👥 Recipients:');
        console.log(`   BL: ${blWalletAddress}`);
        console.log(`   Kotaro: ${kotaroWalletAddress}\n`);

        console.log('📝 Apology Message:');
        console.log('─'.repeat(50));
        console.log(APOLOGY_MESSAGE);
        console.log('─'.repeat(50) + '\n');

        // Create and send the sealed apology
        console.log('🔐 Creating sealed apology...\n');
        
        const result = await apologyService.createSealedApology(
            APOLOGY_MESSAGE,
            blWalletAddress,
            kotaroWalletAddress,
            30 // 30 days expiry
        );

        console.log('\n✨ SUCCESS! Sealed apology created:\n');
        console.log('📦 Apology Details:');
        console.log(`   Object ID: ${result.apologyId}`);
        console.log(`   Document ID: ${result.documentId}`);
        console.log(`   Walrus Blob: ${result.walrusBlobId}`);
        console.log(`   Backup Key: ${result.backupKey.substring(0, 20)}...`);

        // Save credentials for recipients
        const outputDir = path.join(process.cwd(), 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const credentialsFile = path.join(outputDir, 'apology-credentials.json');
        const credentials = {
            network,
            packageId,
            apologyId: result.apologyId,
            documentId: result.documentId,
            walrusBlobId: result.walrusBlobId,
            backupKey: result.backupKey,
            recipients: {
                bl: blWalletAddress,
                kotaro: kotaroWalletAddress,
            },
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        };

        fs.writeFileSync(credentialsFile, JSON.stringify(credentials, null, 2));
        console.log(`\n💾 Credentials saved to: ${credentialsFile}`);

        // Transfer to BL (optional)
        const shouldTransfer = process.env.AUTO_TRANSFER === 'true';
        if (shouldTransfer) {
            console.log('\n🔄 Transferring apology to BL...');
            await apologyService.transferApologyToRecipient(
                result.apologyId!,
                blWalletAddress
            );
            console.log('✅ Apology transferred to BL');
        }

        console.log('\n' + '='.repeat(60));
        console.log('📋 INSTRUCTIONS FOR RECIPIENTS:');
        console.log('='.repeat(60));
        console.log('\n1. Share the credentials file with BL and Kotaro');
        console.log('2. Recipients need to set up their environment:');
        console.log('   - RECIPIENT_PRIVATE_KEY: Their Sui wallet private key');
        console.log('   - Copy values from credentials.json');
        console.log('\n3. Run the decrypt script:');
        console.log('   npm run decrypt-apology-final');
        console.log('\n' + '='.repeat(60));

        console.log('\n🎉 Your sealed apology has been successfully created!');
        console.log('   ✅ Encrypted with SEAL (2-of-5 threshold)');
        console.log('   ✅ Stored on Walrus decentralized network');
        console.log('   ✅ Access controlled via Sui blockchain');
        console.log('   ✅ Only BL and Kotaro can decrypt');

    } catch (error) {
        console.error('\n❌ Error sending sealed apology:');
        console.error(error);
        
        if (error instanceof Error) {
            if (error.message.includes('key server')) {
                console.error('\n💡 Tip: Check that SEAL key servers are available on', network);
            } else if (error.message.includes('Walrus')) {
                console.error('\n💡 Tip: Check Walrus API endpoint and network connectivity');
            } else if (error.message.includes('insufficient')) {
                console.error('\n💡 Tip: Get testnet SUI tokens: sui client faucet');
            }
        }
        
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    sendSealedApology().then(() => {
        console.log('\n✨ Process completed successfully!');
        process.exit(0);
    }).catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

export { sendSealedApology };