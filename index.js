const { Ed25519Keypair } = require('@mysten/sui.js/keypairs/ed25519');
const { SuiClient, getFullnodeUrl } = require('@mysten/sui.js/client');
const fs = require('fs');
const axios = require('axios');
const readline = require('readline');

// ============ KONFIGURASI ============

const CONFIG = {
  RPC_URL: getFullnodeUrl('testnet'),
  
  // Jumlah Claim per Token
  XAUM_CLAIM_AMOUNT: 10,
  USDC_CLAIM_AMOUNT: 10,
  
  // SUI Faucet Config
  SUI_FAUCET_URL: 'https://faucet.testnet.sui.io/v2/gas',
  SUI_FAUCET_RETRIES: 50,
  MIN_SUI_BALANCE: 1,
  MIST_PER_SUI: 1000000000,
  
  // Files
  USER_AGENTS_FILE: 'user_agents.txt',
  REFERRAL_CODES_FILE: 'code.txt',
  
  // Contract Package (sama untuk XAUM dan USDC)
  PACKAGE: '0xa03cb0b29e92c6fa9bfb7b9c57ffdba5e23810f20885b4390f724553d32efb8b',
  
  // XAUM Contract Info
  XAUM_SHARED_OBJECT: '0x66984752afbd878aaee450c70142747bb31fca2bb63f0a083d75c361da39adb1',
  XAUM_MINT_AMOUNT: '1000000000',
  
  // USDC Contract Info
  USDC_SHARED_OBJECT: '0x77153159c4e3933658293a46187c30ef68a8f98aa48b0ce76ffb0e6d20c0776b',
  USDC_MINT_AMOUNT: '10000000000',
  
  GAS_BUDGET: '100000000'
};

// Inisialisasi Sui Client
const suiClient = new SuiClient({ url: CONFIG.RPC_URL });

// Variable global
let USER_AGENTS = [];

// ============ UTILITY FUNCTIONS ============

function question(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

function getRandomDelay(minSec, maxSec) {
  const min = minSec * 1000;
  const max = maxSec * 1000;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function delay(ms, message = 'Waiting') {
  const seconds = Math.floor(ms / 1000);
  console.log(`⏳ ${message} ${seconds} seconds...`);
  return new Promise(resolve => setTimeout(resolve, ms));
}

function readFileLines(filename, shouldFilter = true) {
  try {
    if (!fs.existsSync(filename)) {
      return [];
    }
    
    const lines = fs.readFileSync(filename, 'utf8')
      .split('\n')
      .map(line => line.trim());
    
    if (shouldFilter) {
      return lines.filter(line => line.length > 0 && !line.startsWith('#'));
    }
    return lines.filter(line => line.length > 0);
  } catch (error) {
    console.error(`❌ Error membaca ${filename}:`, error.message);
    return [];
  }
}

function saveToFile(filename, content) {
  try {
    fs.appendFileSync(filename, content + '\n', 'utf8');
  } catch (error) {
    console.error(`❌ Error saving to ${filename}:`, error.message);
  }
}

function getRandomUserAgent() {
  if (USER_AGENTS.length === 0) {
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// ✅ GENERATE WALLET DENGAN FORMAT BENAR (70 CHAR)
function generateRandomWallet() {
  try {
    const keypair = new Ed25519Keypair();
    const secretKey = keypair.export().privateKey;
    const address = keypair.getPublicKey().toSuiAddress();
    
    // ✅ Format yang BENAR: suiprivkey1 + base64(secretKey) = 70 chars total
    const base64Key = Buffer.from(secretKey).toString('base64');
    const privateKeyStr = `suiprivkey1${base64Key}`;
    
    // Validasi panjang
    if (privateKeyStr.length !== 70) {
      console.error(`❌ Private key length error: ${privateKeyStr.length} (should be 70)`);
      return null;
    }
    
    return { privateKey: privateKeyStr, address, keypair };
  } catch (error) {
    console.error('❌ Error generating wallet:', error.message);
    return null;
  }
}

async function registerWallet(walletAddress, inviteCode) {
  try {
    const axiosConfig = {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': getRandomUserAgent()
      }
    };
    
    const response = await axios.post('https://api-test.creek.finance/api/user/connect', {
      walletAddress: walletAddress,
      inviteCode: inviteCode
    }, axiosConfig);
    
    const result = response.data;
    
    if (result.code === 0 && result.success && result.data && result.data.user) {
      return result.data.user;
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

// ============ PROCESS WALLET ============

async function processWallet(refCode, walletIdx, totalWalletsPerCode, globalWalletCount) {
  console.log(`\n  [Wallet ${walletIdx}/${totalWalletsPerCode}] Global: ${globalWalletCount}`);
  
  // Generate wallet dengan format BENAR
  const wallet = generateRandomWallet();
  if (!wallet) {
    console.log(`  ❌ Gagal generate wallet\n`);
    return null;
  }
  
  console.log(`  📍 Address: ${wallet.address}`);
  console.log(`  🔑 Private Key Length: ${wallet.privateKey.length} chars ✓`);
  
  // Registrasi
  console.log(`  📝 Registrasi...`);
  const newUser = await registerWallet(wallet.address, refCode);
  
  if (!newUser) {
    console.log(`  ❌ Registrasi gagal\n`);
    return null;
  }
  
  console.log(`  ✓ Registrasi berhasil!`);
  console.log(`    Invite Code: ${newUser.invite_code}`);
  console.log(`    Points: ${newUser.total_points}`);
  
  // Simpan data dengan format BENAR
  saveToFile('generated.txt', wallet.privateKey);
  saveToFile('codereff.txt', newUser.invite_code);
  
  console.log(`  ✅ Wallet berhasil!\n`);
  return { success: true, inviteCode: newUser.invite_code };
}

// ============ MAIN MENU ============

async function main() {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║     AUTO REGISTRASI REFERRAL - CREEK.FI      ║');
  console.log('║   Generate Private Key Format Benar (70 ch)  ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  // Load user agents
  console.log('📱 Loading User Agents...');
  USER_AGENTS = readFileLines(CONFIG.USER_AGENTS_FILE);
  console.log(`✓ Loaded ${USER_AGENTS.length} user agents\n`);

  // Input target
  const walletsPerCodeInput = await question('💬 Masukkan jumlah wallet per code: ');
  const walletsPerCode = parseInt(walletsPerCodeInput);
  
  if (isNaN(walletsPerCode) || walletsPerCode <= 0) {
    console.log('❌ Jumlah tidak valid!');
    return;
  }

  // Baca referral codes
  const referralCodes = readFileLines(CONFIG.REFERRAL_CODES_FILE);
  
  if (referralCodes.length === 0) {
    console.log('❌ File code.txt kosong!');
    return;
  }

  const totalWallets = walletsPerCode * referralCodes.length;
  
  console.log(`\n📋 Konfigurasi:`);
  console.log(`   Wallet per Code: ${walletsPerCode}`);
  console.log(`   Total Codes: ${referralCodes.length}`);
  console.log(`   Total Wallets: ${totalWallets}`);
  console.log(`   Private Key Format: suiprivkey1 (70 chars) ✓\n`);
  
  console.log(`📝 Referral Codes:`);
  referralCodes.forEach((code, idx) => {
    console.log(`   ${idx + 1}. ${code}`);
  });
  
  console.log(`\n═══════════════════════════════════════════════\n`);

  let globalWalletCounter = 0;
  let globalSuccess = 0;
  let globalFail = 0;

  // Process setiap code
  for (let codeIdx = 0; codeIdx < referralCodes.length; codeIdx++) {
    const currentCode = referralCodes[codeIdx];
    const isLastCode = codeIdx === referralCodes.length - 1;
    
    console.log(`\n╔════════════════════════════════════════════════╗`);
    console.log(`║ CODE ${codeIdx + 1}/${referralCodes.length}: ${currentCode}`);
    console.log(`║ Target: ${walletsPerCode} wallets untuk code ini`);
    console.log(`╚════════════════════════════════════════════════╝`);

    let codeSuccess = 0;
    let codeFail = 0;

    // Process wallets untuk code ini
    for (let walletIdx = 1; walletIdx <= walletsPerCode; walletIdx++) {
      globalWalletCounter++;
      
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      
      const result = await processWallet(currentCode, walletIdx, walletsPerCode, globalWalletCounter);
      
      if (result && result.success) {
        codeSuccess++;
        globalSuccess++;
      } else {
        codeFail++;
        globalFail++;
      }
      
      // Delay antar wallet
      if (walletIdx < walletsPerCode) {
        await delay(getRandomDelay(10, 30), 'Delay antar wallet:');
      }
    }

    console.log(`\n✅ CODE ${codeIdx + 1} SELESAI`);
    console.log(`   ✓ Berhasil: ${codeSuccess}/${walletsPerCode}`);
    console.log(`   ❌ Gagal: ${codeFail}/${walletsPerCode}`);
    console.log(`   📊 Progress Global: ${globalSuccess}/${totalWallets}\n`);
    
    // Delay antar code
    if (!isLastCode) {
      console.log(`⏸ Istirahat sebelum code berikutnya...`);
      await delay(getRandomDelay(60, 120), 'Delay antar code:');
    }
  }

  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║           PROSES SELESAI!                     ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  
  console.log(`📊 Statistik Akhir:`);
  console.log(`   🎯 Target: ${totalWallets} wallets`);
  console.log(`   📝 Per Code: ${walletsPerCode} wallets`);
  console.log(`   ✓ Berhasil Total: ${globalSuccess}`);
  console.log(`   ❌ Gagal Total: ${globalFail}\n`);
  
  console.log(`📂 File Output:`);
  console.log(`   - generated.txt: ${globalSuccess} private keys (FORMAT BENAR 70 CHAR)`);
  console.log(`   - codereff.txt: ${globalSuccess} invite codes\n`);
}

main().catch(error => {
  console.error('❌ Fatal Error:', error.message);
  process.exit(1);
});
