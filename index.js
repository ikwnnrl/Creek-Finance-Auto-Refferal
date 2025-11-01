const { Ed25519Keypair } = require('@mysten/sui.js/keypairs/ed25519');
const fs = require('fs');
const axios = require('axios');
const readline = require('readline');

// Konfigurasi
const CONFIG = {
  FILES: {
    USER_AGENTS: 'user_agents.txt',
    REFERRAL_CODES: 'code.txt',
    PROXY: 'proxy.txt'
  }
};

// Variable global
let USER_AGENTS = [];
let PROXIES = [];

// Fungsi input
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

// Random delay
function getRandomDelay(minSec, maxSec) {
  const min = minSec * 1000;
  const max = maxSec * 1000;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Delay
async function delay(ms, message = 'Waiting') {
  const seconds = Math.floor(ms / 1000);
  console.log(`⏳ ${message} ${seconds} seconds...`);
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Baca file
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

// Generate wallet
function generateRandomWallet() {
  try {
    const keypair = new Ed25519Keypair();
    const privateKey = keypair.export().privateKey;
    const address = keypair.getPublicKey().toSuiAddress();
    const privateKeyStr = `suiprivkey${Buffer.from(privateKey).toString('base64')}`;
    return { privateKey: privateKeyStr, address };
  } catch (error) {
    console.error('❌ Error generating wallet:', error.message);
    return null;
  }
}

// Simpan ke file
function saveToFile(filename, content) {
  try {
    fs.appendFileSync(filename, content + '\n', 'utf8');
  } catch (error) {
    console.error(`❌ Error saving to ${filename}:`, error.message);
  }
}

// Get proxy by index
function getProxyByIndex(index) {
  if (PROXIES.length === 0) return null;
  return PROXIES[index % PROXIES.length];
}

// Get random user agent
function getRandomUserAgent() {
  if (USER_AGENTS.length === 0) {
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Register wallet
async function registerWallet(walletAddress, inviteCode, proxyUrl, globalCounter) {
  try {
    const axiosConfig = {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': getRandomUserAgent()
      }
    };
    
    // Proxy support dengan try-catch
    if (proxyUrl) {
      try {
        const HttpProxyAgent = require('http-proxy-agent');
        const HttpsProxyAgent = require('https-proxy-agent');
        const proxyWithProtocol = proxyUrl.startsWith('http') ? proxyUrl : `http://${proxyUrl}`;
        axiosConfig.httpAgent = new HttpProxyAgent(proxyWithProtocol);
        axiosConfig.httpsAgent = new HttpsProxyAgent(proxyWithProtocol);
      } catch (e) {
        // Skip proxy jika error
      }
    }
    
    const response = await axios.post('https://api-test.creek.finance/api/user/connect', {
      walletAddress: walletAddress,
      inviteCode: inviteCode
    }, axiosConfig);
    
    const result = response.data;
    
    if (result.code === 0 && result.success && result.data && result.data.user) {
      const user = result.data.user;
      console.log(`  ✓ Registrasi berhasil!`);
      console.log(`    Wallet: ${user.wallet_address.substring(0, 12)}...`);
      return user.invite_code;
    } else {
      console.log(`  ❌ Registrasi gagal: ${result.msg}`);
      return null;
    }
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return null;
  }
}

// Process single wallet
async function processWallet(refCode, walletIdx, totalWalletsPerCode, globalCounter) {
  console.log(`\n  [Wallet ${walletIdx}/${totalWalletsPerCode}] Global: ${globalCounter}`);
  
  // Get proxy
  const proxy = getProxyByIndex(globalCounter - 1);
  if (proxy) {
    console.log(`  🌐 Proxy: ${proxy}`);
  }
  
  // Generate wallet
  const wallet = generateRandomWallet();
  if (!wallet) {
    console.log(`  ❌ Gagal generate wallet\n`);
    return null;
  }
  
  console.log(`  📍 Address: ${wallet.address}`);
  
  // Registrasi
  console.log(`  📝 Registrasi...`);
  const newInviteCode = await registerWallet(wallet.address, refCode, proxy, globalCounter);
  
  if (!newInviteCode) {
    console.log(`  ❌ Registrasi gagal\n`);
    return null;
  }
  
  // Simpan data
  saveToFile('generated.txt', wallet.privateKey);
  saveToFile('codereff.txt', newInviteCode);
  
  if (proxy) {
    saveToFile('proxy_mapping.txt', `${wallet.address}|${proxy}`);
  }
  
  console.log(`  ✅ Wallet berhasil!\n`);
  return { success: true, inviteCode: newInviteCode };
}

// Main
async function main() {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║     AUTO REGISTRASI REFERRAL - CREEK.FI      ║');
  console.log('║         (Fixed Wallets Per Code)              ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  // Load data
  console.log('📱 Loading User Agents...');
  USER_AGENTS = readFileLines(CONFIG.FILES.USER_AGENTS);
  console.log(`✓ Loaded ${USER_AGENTS.length} user agents\n`);
  
  console.log('🌐 Loading Proxies...');
  PROXIES = readFileLines(CONFIG.FILES.PROXY);
  if (PROXIES.length > 0) {
    console.log(`✓ Loaded ${PROXIES.length} proxies\n`);
  } else {
    console.log(`⚠ Akan berjalan tanpa proxy\n`);
  }

  // Input target
  const walletsPerCodeInput = await question('💬 Masukkan jumlah wallet per code: ');
  const walletsPerCode = parseInt(walletsPerCodeInput);
  
  if (isNaN(walletsPerCode) || walletsPerCode <= 0) {
    console.log('❌ Jumlah tidak valid!');
    return;
  }

  // Baca referral codes
  const referralCodes = readFileLines(CONFIG.FILES.REFERRAL_CODES);
  
  if (referralCodes.length === 0) {
    console.log('❌ File code.txt kosong!');
    return;
  }

  const totalWallets = walletsPerCode * referralCodes.length;
  
  console.log(`\n📋 Konfigurasi:`);
  console.log(`   Jumlah per Code: ${walletsPerCode} wallets`);
  console.log(`   Total Codes: ${referralCodes.length}`);
  console.log(`   Total Wallets: ${totalWallets}`);
  console.log(`   Proxies: ${PROXIES.length}\n`);
  
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

    // Process wallets untuk code ini (FIXED JUMLAH)
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
    
    // Delay antar code (lebih lama)
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
  console.log(`   - generated.txt: ${globalSuccess} private keys`);
  console.log(`   - codereff.txt: ${globalSuccess} invite codes`);
  if (PROXIES.length > 0) {
    console.log(`   - proxy_mapping.txt: wallet-proxy mapping\n`);
  }
}

main().catch(error => {
  console.error('❌ Fatal Error:', error.message);
  process.exit(1);
});
