import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { license, LicenseStatus } from "@/lib/license";
import { Key, Shield, CheckCircle2, XCircle, Copy, Loader2, AlertTriangle } from "lucide-react";

const License = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [hwid, setHwid] = useState<string>("");
  const [licenseKey, setLicenseKey] = useState("");
  const [licenseInfo, setLicenseInfo] = useState<LicenseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    loadLicenseInfo();
  }, []);

  const loadLicenseInfo = async () => {
    setLoading(true);
    try {
      // Get HWID
      const hwidResult = await license.getHWID();
      if (hwidResult) {
        setHwid(hwidResult);
      }

      // Check current license
      const status = await license.check();
      setLicenseInfo(status);
    } catch (error) {
      console.error("Error loading license info:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyHwid = () => {
    navigator.clipboard.writeText(hwid);
    toast({
      title: "Berhasil",
      description: "HWID berhasil disalin ke clipboard",
    });
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      toast({
        title: "Error",
        description: "Masukkan license key",
        variant: "destructive",
      });
      return;
    }

    setActivating(true);
    try {
      const result = await license.activate(licenseKey.trim().toUpperCase());
      
      if (result.valid && result.activated) {
        toast({
          title: "Berhasil",
          description: "License berhasil diaktivasi!",
        });
        setLicenseInfo(result);
        setLicenseKey("");
        
        // Redirect to dashboard after successful activation
        setTimeout(() => {
          navigate("/");
        }, 1500);
      } else {
        toast({
          title: "Gagal",
          description: result.error || "License tidak valid",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat aktivasi",
        variant: "destructive",
      });
    } finally {
      setActivating(false);
    }
  };

  const handleContinue = () => {
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Memuat informasi license...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Key className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">NexaPOS License</h1>
          <p className="text-muted-foreground mt-2">
            Aktivasi license untuk menggunakan aplikasi
          </p>
        </div>

        {/* License Status Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Status License
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {licenseInfo?.valid ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-green-500 font-medium">License Aktif</span>
                </div>
                
                <div className="grid gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Tipe License:</span>
                    <Badge variant="secondary">{licenseInfo.licenseType || "FULL"}</Badge>
                  </div>
                  {licenseInfo.expireDate && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Berlaku Hingga:</span>
                      <span className="font-mono">{licenseInfo.expireDate}</span>
                    </div>
                  )}
                </div>

                <Separator />

                <Button onClick={handleContinue} className="w-full">
                  Lanjutkan ke Aplikasi
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  {licenseInfo?.expired ? (
                    <>
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      <span className="text-yellow-500 font-medium">License Kadaluarsa</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-destructive" />
                      <span className="text-destructive font-medium">
                        {licenseInfo?.error || "License Tidak Aktif"}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* HWID Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Hardware ID (HWID)</CardTitle>
            <CardDescription>
              Berikan HWID ini ke administrator untuk mendapatkan license key
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={hwid}
                readOnly
                className="font-mono text-center text-lg tracking-wider"
              />
              <Button variant="outline" size="icon" onClick={handleCopyHwid}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Activation Card */}
        {!licenseInfo?.valid && (
          <Card>
            <CardHeader>
              <CardTitle>Aktivasi License</CardTitle>
              <CardDescription>
                Masukkan license key yang diberikan oleh administrator
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="licenseKey">License Key</Label>
                <Input
                  id="licenseKey"
                  placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                  className="font-mono text-center tracking-wider"
                />
              </div>
              <Button 
                onClick={handleActivate} 
                className="w-full" 
                disabled={activating || !licenseKey.trim()}
              >
                {activating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Mengaktivasi...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4 mr-2" />
                    Aktivasi License
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          NexaPOS v1.0.0 &copy; 2024. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default License;
