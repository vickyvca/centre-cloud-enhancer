const crypto = require('crypto');
const { execSync } = require('child_process');
const os = require('os');

class LicenseManager {
  constructor() {
    // Secret key for license generation (keep this secret in your admin tool)
    this.secretKey = 'NEXAPOS_LICENSE_SECRET_2024';
  }

  // Get Hardware ID (HWID)
  getHWID() {
    try {
      let hwid = '';
      
      if (process.platform === 'win32') {
        // Windows: Get motherboard serial + CPU ID
        try {
          const mbSerial = execSync('wmic baseboard get serialnumber', { encoding: 'utf-8' });
          const cpuId = execSync('wmic cpu get processorid', { encoding: 'utf-8' });
          hwid = mbSerial.replace(/\s/g, '') + cpuId.replace(/\s/g, '');
        } catch (e) {
          // Fallback to MAC address
          const networkInterfaces = os.networkInterfaces();
          for (const iface of Object.values(networkInterfaces)) {
            for (const config of iface) {
              if (!config.internal && config.mac !== '00:00:00:00:00:00') {
                hwid = config.mac;
                break;
              }
            }
            if (hwid) break;
          }
        }
      } else if (process.platform === 'darwin') {
        // macOS: Get hardware UUID
        hwid = execSync('system_profiler SPHardwareDataType | grep "Hardware UUID"', { encoding: 'utf-8' });
      } else {
        // Linux: Get machine-id
        try {
          hwid = execSync('cat /etc/machine-id', { encoding: 'utf-8' });
        } catch (e) {
          hwid = execSync('cat /var/lib/dbus/machine-id', { encoding: 'utf-8' });
        }
      }

      // Hash the HWID to get a consistent format
      const hash = crypto.createHash('sha256').update(hwid.trim()).digest('hex');
      return hash.substring(0, 16).toUpperCase();
    } catch (error) {
      console.error('Error getting HWID:', error);
      // Fallback: use hostname + username
      const fallback = os.hostname() + os.userInfo().username;
      const hash = crypto.createHash('sha256').update(fallback).digest('hex');
      return hash.substring(0, 16).toUpperCase();
    }
  }

  // Generate license key from HWID (use this in your admin tool)
  generateLicenseKey(hwid, licenseType = 'FULL', expireDays = 365) {
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + expireDays);
    const expireStr = expireDate.toISOString().split('T')[0].replace(/-/g, '');
    
    // License format: TYPE-HWID-EXPIRE-CHECKSUM
    const data = `${licenseType}-${hwid}-${expireStr}`;
    const checksum = this.generateChecksum(data);
    
    // Format: XXXX-XXXX-XXXX-XXXX-XXXX
    const licenseKey = `${licenseType.substring(0, 4)}-${hwid.substring(0, 4)}-${hwid.substring(4, 8)}-${expireStr.substring(2, 6)}-${checksum.substring(0, 4)}`;
    
    return {
      licenseKey: licenseKey.toUpperCase(),
      hwid,
      licenseType,
      expireDate: expireDate.toISOString().split('T')[0],
      rawData: data
    };
  }

  // Generate checksum
  generateChecksum(data) {
    const hmac = crypto.createHmac('sha256', this.secretKey);
    hmac.update(data);
    return hmac.digest('hex').substring(0, 8).toUpperCase();
  }

  // Validate license key
  validateLicense(licenseKey, hwid) {
    try {
      if (!licenseKey || licenseKey.length < 20) {
        return { valid: false, error: 'Invalid license key format' };
      }

      const parts = licenseKey.split('-');
      if (parts.length !== 5) {
        return { valid: false, error: 'Invalid license key format' };
      }

      const [typePart, hwid1, hwid2, expirePart, checksumPart] = parts;
      const licenseHwid = (hwid1 + hwid2).toUpperCase();
      const currentHwid = hwid.substring(0, 8).toUpperCase();

      // Validate HWID matches
      if (licenseHwid !== currentHwid) {
        return { valid: false, error: 'License not valid for this device' };
      }

      // Parse expire date
      const year = '20' + expirePart.substring(0, 2);
      const month = expirePart.substring(2, 4);
      const expireDate = new Date(`${year}-${month}-01`);
      
      // Check if expired
      if (expireDate < new Date()) {
        return { valid: false, error: 'License has expired', expired: true };
      }

      // Determine license type
      let licenseType = 'FULL';
      if (typePart.startsWith('TRIA')) {
        licenseType = 'TRIAL';
      } else if (typePart.startsWith('PREM')) {
        licenseType = 'PREMIUM';
      }

      return {
        valid: true,
        licenseType,
        expireDate: expireDate.toISOString().split('T')[0],
        hwid: currentHwid
      };
    } catch (error) {
      return { valid: false, error: 'License validation failed: ' + error.message };
    }
  }

  // Check license in database
  checkStoredLicense(db) {
    const hwid = this.getHWID();
    const license = db.selectOne('app_license', { is_active: 1 });
    
    if (!license) {
      return { valid: false, error: 'No license found', hwid };
    }

    const validation = this.validateLicense(license.license_key, hwid);
    
    if (!validation.valid) {
      // Deactivate invalid license
      db.update('app_license', { is_active: 0 }, { id: license.id });
    }
    
    return { ...validation, hwid };
  }

  // Activate license
  activateLicense(db, licenseKey) {
    const hwid = this.getHWID();
    const validation = this.validateLicense(licenseKey, hwid);
    
    if (!validation.valid) {
      return validation;
    }

    // Deactivate old licenses
    db.run('UPDATE app_license SET is_active = 0');

    // Insert new license
    const crypto = require('crypto');
    db.insert('app_license', {
      id: crypto.randomUUID(),
      license_key: licenseKey,
      hwid: hwid,
      is_active: 1,
      license_type: validation.licenseType,
      expire_date: validation.expireDate
    });

    return { ...validation, activated: true };
  }
}

module.exports = { LicenseManager };
