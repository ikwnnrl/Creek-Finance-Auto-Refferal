const fs = require('fs');
const readline = require('readline');

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

function readFileLines(filename) {
  try {
    if (!fs.existsSync(filename)) {
      return [];
    }
    return fs.readFileSync(filename, 'utf8')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
  } catch (e) {
    return [];
  }
}

function saveToFile(filename, content) {
  try {
    fs.appendFileSync(filename, content + '\n', 'utf8');
  } catch (e) {
    console.error(`Error saving to ${filename}`);
  }
}

// ✅ SIMPLE CONVERTER - Hanya 1x decode
function convertDoubleEncodedPrivateKey(doubleEncodedKey) {
  try {
    console.log('\n🔍 Analyzing format...');
    console.log(`Input: ${doubleEncodedKey.substring(0, 40)}...`);
    console.log(`Input length: ${doubleEncodedKey.length} chars\n`);
    
    if (!doubleEncodedKey.startsWith('suiprivkey')) {
      return {
        success: false,
        error: 'Key tidak dimulai dengan suiprivkey'
      };
    }
    
    // Remove prefix "suiprivkey" (10 chars)
    const base64Part = doubleEncodedKey.substring(10);
    console.log(`✓ Prefix: suiprivkey`);
    console.log(`✓ Base64 part length: ${base64Part.length}\n`);
    
    // Step 1: Decode base64 1x saja
    console.log('🔄 Step 1: Decode base64...');
    let decodedKey;
    try {
      decodedKey = Buffer.from(base64Part, 'base64').toString('utf-8');
    } catch (e) {
      return {
        success: false,
        error: `Base64 decode error: ${e.message}`
      };
    }
    
    console.log(`✓ After decode: ${decodedKey.substring(0, 40)}...`);
    console.log(`✓ Length: ${decodedKey.length} chars\n`);
    
    // Verify format
    if (!decodedKey.startsWith('suiprivkey1')) {
      return {
        success: false,
        error: `Format tidak cocok. Expected suiprivkey1, got: ${decodedKey.substring(0, 20)}`
      };
    }
    
    if (decodedKey.length !== 70) {
      return {
        success: false,
        error: `Wrong length. Expected 70 chars, got ${decodedKey.length}`
      };
    }
    
    console.log('✓ Format valid: suiprivkey1 (70 chars)\n');
    
    return {
      success: true,
      doubleEncodedFormat: doubleEncodedKey,
      correctFormat: decodedKey,
      oldLength: doubleEncodedKey.length,
      newLength: decodedKey.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ============ MENU 1: SINGLE KEY ============

async function menuSingleKey() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║   MENU 1: Convert Single Double-Encoded Key   ║');
  console.log('╚════════════════════════════════════════════════╝');

  const doubleEncodedKey = await question('\n📝 Paste double-encoded private key:\n> ');

  const result = convertDoubleEncodedPrivateKey(doubleEncodedKey);

  if (!result.success) {
    console.log(`\n❌ ERROR: ${result.error}\n`);
    return;
  }

  console.log('╔════════════════════════════════════════════════╗');
  console.log('║         CONVERSION SUCCESSFUL ✅              ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  console.log(`❌ Format Lama (Double-Encoded):`);
  console.log(`   ${result.doubleEncodedFormat}`);
  console.log(`   Length: ${result.oldLength} chars\n`);

  console.log(`✅ Format Benar (Sui Standard):`);
  console.log(`   ${result.correctFormat}`);
  console.log(`   Length: ${result.newLength} chars\n`);

  const save = await question('💾 Simpan ke file? (y/n): ');
  if (save.toLowerCase() === 'y') {
    saveToFile('converted_keys.txt', result.correctFormat);
    console.log(`✓ Saved to converted_keys.txt\n`);
  }
}

// ============ MENU 2: BATCH CONVERT ============

async function menuBatchConvert() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║  MENU 2: Batch Convert (dari generated.txt)   ║');
  console.log('╚════════════════════════════════════════════════╝');

  const inputFile = 'generated.txt';
  const keys = readFileLines(inputFile);

  if (keys.length === 0) {
    console.log(`\n❌ File ${inputFile} tidak ditemukan atau kosong!\n`);
    return;
  }

  console.log(`\n✓ Loaded ${keys.length} keys\n`);
  console.log('═══════════════════════════════════════════════\n');

  try {
    fs.writeFileSync('converted_keys.txt', '');
  } catch (e) {}

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];

    console.log(`[${i + 1}/${keys.length}] Converting...`);

    const result = convertDoubleEncodedPrivateKey(key);

    if (result.success) {
      console.log(`   ✓ Success! ${result.oldLength} → ${result.newLength} chars`);
      saveToFile('converted_keys.txt', result.correctFormat);
      successCount++;
    } else {
      console.log(`   ❌ ${result.error}`);
      failCount++;
    }
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('\n✅ Batch Conversion Complete!\n');
  console.log(`📊 Results:`);
  console.log(`   ✓ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📁 Output: converted_keys.txt\n`);
}

// ============ MENU 3: ANALYZE FORMAT ============

async function menuAnalyzeFormat() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║   MENU 3: Analyze Key Format                 ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  const key = await question('📝 Paste private key:\n> ');

  console.log('\n🔍 Analyzing...\n');

  if (key.startsWith('suiprivkey1') && key.length === 70) {
    console.log(`✅ Format: CORRECT (Sui Standard)`);
    console.log(`✓ Prefix: suiprivkey1`);
    console.log(`✓ Length: 70 chars`);
    console.log(`✓ Ready to use!\n`);
  } else if (key.startsWith('suiprivkey') && !key.startsWith('suiprivkey1')) {
    console.log(`❌ Format: DOUBLE-ENCODED`);
    console.log(`✗ Prefix: suiprivkey (should be suiprivkey1)`);
    console.log(`✓ Length: ${key.length} chars`);
    console.log(`→ Needs conversion\n`);
  } else if (key.startsWith('suiprivkey1')) {
    console.log(`⚠ Format: WRONG LENGTH`);
    console.log(`✓ Prefix: suiprivkey1`);
    console.log(`✗ Length: ${key.length} chars (should be 70)`);
    console.log(`→ Invalid format\n`);
  } else {
    console.log(`❌ Format: INVALID`);
    console.log(`✗ Not a Sui private key\n`);
  }
}

// ============ MAIN MENU ============

async function mainMenu() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║  DOUBLE-ENCODED PRIVATE KEY CONVERTER v3.0   ║');
  console.log('║       Simple 1x Decode to 70 Chars           ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  console.log('📋 MENU:');
  console.log('   1. Convert Single Key');
  console.log('   2. Batch Convert (generated.txt)');
  console.log('   3. Analyze Key Format');
  console.log('   0. Exit\n');

  const choice = await question('Pilih menu (0-3): ');

  switch (choice) {
    case '1':
      await menuSingleKey();
      break;
    case '2':
      await menuBatchConvert();
      break;
    case '3':
      await menuAnalyzeFormat();
      break;
    case '0':
      console.log('\n👋 Bye!\n');
      process.exit(0);
    default:
      console.log('\n❌ Invalid choice!\n');
  }

  await new Promise(resolve => setTimeout(resolve, 2000));
  await mainMenu();
}

mainMenu().catch(error => {
  console.error('\n❌ Fatal Error:', error.message);
  process.exit(1);
});
