// License management utilities for the frontend

interface LicenseStatus {
  valid: boolean;
  error?: string;
  hwid?: string;
  licenseType?: string;
  expireDate?: string;
  expired?: boolean;
}

interface ElectronLicenseAPI {
  getHWID: () => Promise<string>;
  checkLicense: () => Promise<LicenseStatus>;
  activateLicense: (key: string) => Promise<LicenseStatus & { activated?: boolean }>;
}

// Force Electron mode - always true for client distribution
const isElectron = true;

const getLicenseAPI = (): ElectronLicenseAPI | null => {
  if (isElectron) {
    return {
      getHWID: (window as any).electronAPI.getHWID,
      checkLicense: (window as any).electronAPI.checkLicense,
      activateLicense: (window as any).electronAPI.activateLicense,
    };
  }
  return null;
};

export const license = {
  // Check if license features are available (only in Electron)
  isAvailable(): boolean {
    return isElectron;
  },

  // Get hardware ID
  async getHWID(): Promise<string | null> {
    const api = getLicenseAPI();
    if (!api) return null;
    
    try {
      return await api.getHWID();
    } catch (error) {
      console.error('Error getting HWID:', error);
      return null;
    }
  },

  // Check current license status
  async check(): Promise<LicenseStatus> {
    const api = getLicenseAPI();
    if (!api) {
      return { valid: true }; // Web mode - no license required
    }
    
    try {
      return await api.checkLicense();
    } catch (error) {
      return { valid: false, error: 'Failed to check license' };
    }
  },

  // Activate a license key
  async activate(licenseKey: string): Promise<LicenseStatus & { activated?: boolean }> {
    const api = getLicenseAPI();
    if (!api) {
      return { valid: false, error: 'License activation only available in desktop mode' };
    }
    
    try {
      return await api.activateLicense(licenseKey);
    } catch (error) {
      return { valid: false, error: 'Failed to activate license' };
    }
  }
};

export type { LicenseStatus };
