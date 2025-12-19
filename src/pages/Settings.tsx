import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <AppLayout title="Pengaturan">
      <div className="animate-fade-in">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Pengaturan Aplikasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <Settings className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">Fitur pengaturan dalam pengembangan</p>
              <p className="text-sm">Coming soon...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
