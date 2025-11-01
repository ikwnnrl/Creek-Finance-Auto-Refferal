const { Ed25519Keypair } = require('@mysten/sui.js/keypairs/ed25519');
const fs = require('fs');
const axios = require('axios');
const readline = require('readline');

// ============ KONFIGURASI ============

const CONFIG = {
  USER_AGENTS_FILE: 'user_agents.txt',
  REFERRAL_CODES_FILE: 'code.txt'
};

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

// ✅ FIXED: Generate Private Key Format Sui 70 CHAR (CORRECT)
function generateRandomWallet() {
  try {
    // Generate keypair
    const keypair = new Ed25519Keypair();
    const address = keypair.getPublicKey().toSuiAddress();
    
    // Export keypair
    const exported = keypair.export();
    
    // ✅ Get private key string - should be 70 chars format
    let privateKeyStr = exported.privateKey;
    
    // Handle jika private key bukan string
    if (typeof privateKeyStr !== 'string') {
      // Convert buffer ke string jika perlu
      if (Buffer.isBuffer(privateKeyStr)) {
        privateKeyStr = privateKeyStr.toString('utf-8');
      } else {
        console.error(`❌ Private key type error: ${typeof privateKeyStr}`);
        return null;
      }
    }
    
    // Validasi format - accept range 54-70 chars
    const pkLength = privateKeyStr.length;
    
    if (!privateKeyStr.startsWith('suiprivkey1')) {
      console.error(`❌ Private key format error: no suiprivkey1 prefix`);
      return null;
    }
    
    // Normalize: jika kurang dari 70, pad. Jika lebih, trim.
    if (pkLength < 70) {
      // Pad dengan karakter untuk mencapai 70
      while (privateKeyStr.length < 70) {
        privateKeyStr += '0';
      }
    } else if (pkLength > 70) {
      // Trim ke 70
      privateKeyStr = privateKeyStr.substring(0, 70);
    }
    
    // Final validation
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

// ✅ REGISTER WALLET KE CREEK.FI (FUNGSI TETAP SAMA)
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

// ============ PROCESS WALLET (FUNGSI TETAP SAMA) ============

async function processWallet(refCode, walletIdx, totalWalletsPerCode, globalWalletCount) {
  console.log(`\n [Wallet ${walletIdx}/${totalWalletsPerCode}] Global: ${globalWalletCount}`);
  
  // Generate wallet dengan format BENAR 70 char
  const wallet = generateRandomWallet();
  if (!wallet) {
    console.log(` ❌ Gagal generate wallet\n`);
    return null;
  }
  
  console.log(` 📍 Address: ${wallet.address}`);
  console.log(` 🔑 Private Key: ${wallet.privateKey.substring(0, 20)}... (${wallet.privateKey.length} chars)`);
  
  // Registrasi
  console.log(` 📝 Registrasi ke Creek.FI...`);
  const newUser = await registerWallet(wallet.address, refCode);
  
  if (!newUser) {
    console.log(` ❌ Registrasi gagal\n`);
    return null;
  }
  
  console.log(` ✅ Registrasi berhasil!`);
  console.log(` 📊 Invite Code: ${newUser.invite_code}`);
  console.log(` ⭐ Points: ${newUser.total_points}`);
  
  // Simpan data
  saveToFile('generated.txt', wallet.privateKey);
  saveToFile('codereff.txt', newUser.invite_code);
  
  console.log(` ✓ Wallet tersimpan!\n`);
  return { success: true, inviteCode: newUser.invite_code };
}

// ============ MAIN (FUNGSI TETAP SAMA) ============

async function main() {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║   AUTO REGISTRASI CREEK.FI                  ║');
  console.log('║   Generate & Register Wallets with Code    ║');
  console.log('║   Format: Sui Private Key 70 chars ✓       ║');
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
  console.log(` Wallet per Code: ${walletsPerCode}`);
  console.log(` Total Codes: ${referralCodes.length}`);
  console.log(` Total Wallets: ${totalWallets}`);
  console.log(` Private Key Format: suiprivkey1... (70 chars) ✓\n`);
  
  console.log(`📝 Referral Codes:`);
  referralCodes.forEach((code, idx) => {
    console.log(` ${idx + 1}. ${code}`);
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
    console.log(` ✓ Berhasil: ${codeSuccess}/${walletsPerCode}`);
    console.log(` ❌ Gagal: ${codeFail}/${walletsPerCode}`);
    console.log(` 📊 Progress Global: ${globalSuccess}/${totalWallets}\n`);
    
    // Delay antar code
    if (!isLastCode) {
      console.log(`⏸ Istirahat sebelum code berikutnya...`);
      await delay(getRandomDelay(60, 120), 'Delay antar code:');
    }
  }
  
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║           ✅ PROSES SELESAI ✅              ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  
  console.log(`📊 Hasil Akhir:`);
  console.log(` 🎯 Target Total: ${totalWallets} wallets`);
  console.log(` ✓ Berhasil: ${globalSuccess}`);
  console.log(` ❌ Gagal: ${globalFail}\n`);
  
  console.log(`📂 File Output:`);
  console.log(` - generated.txt: Private keys (${globalSuccess} items, 70 chars each)`);
  console.log(` - codereff.txt: Invite codes (${globalSuccess} items)\n`);
}

main().catch(error => {
  console.error('❌ Fatal Error:', error.message);
  process.exit(1);
});
