import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Upload, HardDrive } from "lucide-react";

export default function Backup() {
  return (
    <AppLayout title="Backup & Restore">
      <div className="animate-fade-in">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Backup & Restore Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-2 border-dashed">
                <CardContent className="pt-6 text-center space-y-4">
                  <Download className="h-12 w-12 mx-auto text-primary" />
                  <div>
                    <h3 className="font-semibold text-lg">Export Data</h3>
                    <p className="text-sm text-muted-foreground">
                      Download backup data dalam format JSON
                    </p>
                  </div>
                  <Button className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Download Backup
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2 border-dashed">
                <CardContent className="pt-6 text-center space-y-4">
                  <Upload className="h-12 w-12 mx-auto text-accent" />
                  <div>
                    <h3 className="font-semibold text-lg">Import Data</h3>
                    <p className="text-sm text-muted-foreground">
                      Restore data dari file backup
                    </p>
                  </div>
                  <Button variant="outline" className="w-full">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Backup
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>Fitur backup & restore dalam pengembangan</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
