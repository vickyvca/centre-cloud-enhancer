#!/usr/bin/env node
/**
 * NexaPOS License Key Generator
 * 
 * Usage: node keygen.js <HWID> [LICENSE_TYPE] [EXPIRE_DAYS]
 * 
 * Example:
 *   node keygen.js ABC123DEF456GH89
 *   node keygen.js ABC123DEF456GH89 PREMIUM 365
 *   node keygen.js ABC123DEF456GH89 TRIAL 30
 */

const crypto = require('crypto');

const SECRET_KEY = 'NEXAPOS_LICENSE_SECRET_2024';

function generateLicenseKey(hwid, licenseType = 'FULL', expireDays = 365) {
  const expireDate = new Date();
  expireDate.setDate(expireDate.getDate() + expireDays);
  const expireStr = expireDate.toISOString().split('T')[0].replace(/-/g, '');
  
  // Create data for checksum
  const data = `${licenseType}-${hwid}-${expireStr}`;
  
  // Generate checksum
  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  hmac.update(data);
  const checksum = hmac.digest('hex').substring(0, 8).toUpperCase();
  
  // Format license key: TYPE-HWID1-HWID2-EXPIRE-CHECK
  const licenseKey = [
    licenseType.substring(0, 4).padEnd(4, 'X'),
    hwid.substring(0, 4),
    hwid.substring(4, 8),
    expireStr.substring(2, 6),
    checksum.substring(0, 4)
  ].join('-').toUpperCase();
  
  return {
    licenseKey,
    hwid: hwid.toUpperCase(),
    licenseType,
    expireDate: expireDate.toISOString().split('T')[0],
    expireDays
  };
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('\n=== NexaPOS License Key Generator ===\n');
    console.log('Usage: node keygen.js <HWID> [LICENSE_TYPE] [EXPIRE_DAYS]\n');
    console.log('LICENSE_TYPE options:');
    console.log('  TRIAL   - Trial license');
    console.log('  FULL    - Full license (default)');
    console.log('  PREMIUM - Premium license\n');
    console.log('Examples:');
    console.log('  node keygen.js ABC123DEF456GH89');
    console.log('  node keygen.js ABC123DEF456GH89 PREMIUM 365');
    console.log('  node keygen.js ABC123DEF456GH89 TRIAL 30\n');
    console.log('The HWID will be shown to users when they first run the app.');
    process.exit(0);
  }
  
  const hwid = args[0].toUpperCase();
  const licenseType = (args[1] || 'FULL').toUpperCase();
  const expireDays = parseInt(args[2] || '365', 10);
  
  if (hwid.length < 8) {
    console.error('Error: HWID must be at least 8 characters');
    process.exit(1);
  }
  
  const result = generateLicenseKey(hwid, licenseType, expireDays);
  
  console.log('\n=== Generated License ===\n');
  console.log('HWID:         ', result.hwid);
  console.log('License Type: ', result.licenseType);
  console.log('Expire Date:  ', result.expireDate);
  console.log('Valid Days:   ', result.expireDays);
  console.log('\n========================');
  console.log('LICENSE KEY:  ', result.licenseKey);
  console.log('========================\n');
}

module.exports = { generateLicenseKey };
