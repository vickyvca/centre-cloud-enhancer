import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, Smartphone, Monitor, Check, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
            <Download className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Install NexaPOS</CardTitle>
          <CardDescription>
            Instal aplikasi untuk akses cepat tanpa browser
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isInstalled ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-success" />
              </div>
              <p className="text-lg font-medium">Aplikasi sudah terinstall!</p>
              <p className="text-muted-foreground text-sm">
                NexaPOS sudah ada di perangkat Anda
              </p>
              <Button asChild className="w-full">
                <a href="/">Buka Aplikasi</a>
              </Button>
            </div>
          ) : isIOS ? (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground">
                Untuk menginstall di iPhone/iPad:
              </p>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                  <span>Tap ikon <strong>Share</strong> di Safari</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
                  <span>Scroll dan tap <strong>"Add to Home Screen"</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
                  <span>Tap <strong>"Add"</strong> untuk konfirmasi</span>
                </li>
              </ol>
            </div>
          ) : deferredPrompt ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <Smartphone className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium">Mobile</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <Monitor className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium">Desktop</p>
                </div>
              </div>
              <Button onClick={handleInstall} className="w-full" size="lg">
                <Download className="mr-2 h-5 w-5" />
                Install Sekarang
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <X className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                Install tidak tersedia di browser ini. Coba buka di Chrome atau Edge.
              </p>
              <Button asChild variant="outline" className="w-full">
                <a href="/">Kembali ke Aplikasi</a>
              </Button>
            </div>
          )}

          <div className="pt-4 border-t text-center text-xs text-muted-foreground">
            <p>NexaPOS PWA - Works offline</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
