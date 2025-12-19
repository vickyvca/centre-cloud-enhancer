import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/formatters";
import {
  Settings,
  User,
  Store,
  Palette,
  Bell,
  Key,
  Loader2,
  Save,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: "",
    username: "",
  });
  const [storeSettings, setStoreSettings] = useState({
    store_name: "NexaPOS Store",
    address: "",
    phone: "",
    tax_rate: 0,
  });
  const [licenseInfo, setLicenseInfo] = useState<any>(null);

  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || "",
        username: profile.username || "",
      });
    }
    fetchLicense();
  }, [profile]);

  const fetchLicense = async () => {
    try {
      const { data } = await supabase
        .from("app_license")
        .select("*")
        .eq("is_active", true)
        .single();
      setLicenseInfo(data);
    } catch (error) {
      console.error("Error fetching license:", error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profileData.full_name,
          username: profileData.username,
        })
        .eq("id", user.id);

      if (error) throw error;

      await refreshProfile();
      toast({ title: "Profil berhasil disimpan" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    toast({
      title: "Fitur dalam pengembangan",
      description: "Silakan hubungi admin untuk reset password",
    });
  };

  return (
    <AppLayout title="Pengaturan">
      <div className="space-y-6 animate-fade-in">
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" />
              Tampilan
            </TabsTrigger>
            <TabsTrigger value="license" className="gap-2">
              <Key className="h-4 w-4" />
              Lisensi
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profil Pengguna
                </CardTitle>
                <CardDescription>
                  Kelola informasi profil Anda
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={profileData.username}
                      onChange={(e) =>
                        setProfileData({ ...profileData, username: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nama Lengkap</Label>
                    <Input
                      id="full_name"
                      value={profileData.full_name}
                      onChange={(e) =>
                        setProfileData({ ...profileData, full_name: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email || ""} disabled />
                  <p className="text-xs text-muted-foreground">
                    Email tidak dapat diubah
                  </p>
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">Ubah Password</h4>
                    <p className="text-sm text-muted-foreground">
                      Perbarui password akun Anda
                    </p>
                  </div>
                  <Button variant="outline" onClick={handlePasswordChange}>
                    Ubah Password
                  </Button>
                </div>

                <Separator />

                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={loading}>
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Simpan Perubahan
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Pengaturan Tampilan
                </CardTitle>
                <CardDescription>
                  Sesuaikan tampilan aplikasi
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Tema</Label>
                    <p className="text-sm text-muted-foreground">
                      Pilih tema terang atau gelap
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    <Switch
                      checked={theme === "dark"}
                      onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                    />
                    <Moon className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="license">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Informasi Lisensi
                </CardTitle>
                <CardDescription>
                  Detail lisensi aplikasi NexaPOS
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {licenseInfo ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="p-4 rounded-lg bg-muted/50">
                        <Label className="text-xs text-muted-foreground">Tipe Lisensi</Label>
                        <p className="font-semibold text-lg">{licenseInfo.license_type}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50">
                        <Label className="text-xs text-muted-foreground">Status</Label>
                        <p className={`font-semibold text-lg ${licenseInfo.is_active ? "text-success" : "text-destructive"}`}>
                          {licenseInfo.is_active ? "Aktif" : "Tidak Aktif"}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50">
                        <Label className="text-xs text-muted-foreground">Kunci Lisensi</Label>
                        <p className="font-mono text-sm">{licenseInfo.license_key}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50">
                        <Label className="text-xs text-muted-foreground">Berlaku Hingga</Label>
                        <p className="font-semibold text-lg">
                          {licenseInfo.expire_date ? formatDate(licenseInfo.expire_date) : "Selamanya"}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Key className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>Belum ada lisensi aktif</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
