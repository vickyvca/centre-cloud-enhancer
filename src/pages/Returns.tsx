import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RotateCcw } from "lucide-react";

export default function Returns() {
  return (
    <AppLayout title="Retur">
      <div className="animate-fade-in">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Manajemen Retur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <RotateCcw className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">Fitur retur dalam pengembangan</p>
              <p className="text-sm">Coming soon...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
