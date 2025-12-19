import { forwardRef, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatRupiah } from "@/lib/formatters";
import { Printer, Download, X } from "lucide-react";

interface ReceiptItem {
  name: string;
  qty: number;
  price: number;
  discount_pct: number;
  subtotal: number;
}

interface ReceiptData {
  invoiceNo: string;
  date: Date;
  customerName?: string;
  cashierName?: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: string;
}

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ReceiptData | null;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
}

const ReceiptContent = forwardRef<HTMLDivElement, { data: ReceiptData; storeName: string; storeAddress?: string; storePhone?: string }>(
  ({ data, storeName, storeAddress, storePhone }, ref) => {
    return (
      <div ref={ref} className="font-mono text-xs bg-white text-black p-4" style={{ width: "80mm", minHeight: "auto" }}>
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-lg font-bold">{storeName}</h1>
          {storeAddress && <p className="text-[10px]">{storeAddress}</p>}
          {storePhone && <p className="text-[10px]">Telp: {storePhone}</p>}
        </div>
        
        <div className="border-t border-dashed border-black my-2" />
        
        {/* Invoice Info */}
        <div className="text-[10px] mb-2">
          <div className="flex justify-between">
            <span>No:</span>
            <span>{data.invoiceNo}</span>
          </div>
          <div className="flex justify-between">
            <span>Tanggal:</span>
            <span>{data.date.toLocaleDateString("id-ID")} {data.date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          {data.cashierName && (
            <div className="flex justify-between">
              <span>Kasir:</span>
              <span>{data.cashierName}</span>
            </div>
          )}
          {data.customerName && (
            <div className="flex justify-between">
              <span>Pelanggan:</span>
              <span>{data.customerName}</span>
            </div>
          )}
        </div>
        
        <div className="border-t border-dashed border-black my-2" />
        
        {/* Items */}
        <div className="space-y-1 mb-2">
          {data.items.map((item, index) => (
            <div key={index}>
              <div className="flex justify-between">
                <span className="truncate max-w-[60%]">{item.name}</span>
              </div>
              <div className="flex justify-between text-[10px] pl-2">
                <span>{item.qty} x {formatRupiah(item.price)}</span>
                <span>{formatRupiah(item.subtotal)}</span>
              </div>
              {item.discount_pct > 0 && (
                <div className="text-[9px] pl-2 text-gray-600">
                  Disc: {item.discount_pct}%
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="border-t border-dashed border-black my-2" />
        
        {/* Totals */}
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatRupiah(data.subtotal)}</span>
          </div>
          {data.discount > 0 && (
            <div className="flex justify-between">
              <span>Diskon</span>
              <span>-{formatRupiah(data.discount)}</span>
            </div>
          )}
          {data.tax > 0 && (
            <div className="flex justify-between">
              <span>Pajak</span>
              <span>{formatRupiah(data.tax)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm">
            <span>TOTAL</span>
            <span>{formatRupiah(data.grandTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Bayar ({data.paymentMethod === "cash" ? "Tunai" : "Transfer"})</span>
            <span>{formatRupiah(data.paidAmount)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Kembali</span>
            <span>{formatRupiah(data.changeAmount)}</span>
          </div>
        </div>
        
        <div className="border-t border-dashed border-black my-3" />
        
        {/* Footer */}
        <div className="text-center text-[10px]">
          <p>Terima Kasih</p>
          <p>Atas Kunjungan Anda</p>
          <p className="mt-2 text-[9px] text-gray-500">Barang yang sudah dibeli</p>
          <p className="text-[9px] text-gray-500">tidak dapat dikembalikan</p>
        </div>
      </div>
    );
  }
);

ReceiptContent.displayName = "ReceiptContent";

export function ReceiptDialog({ open, onOpenChange, data, storeName = "NexaPOS Store", storeAddress, storePhone }: ReceiptDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!data) return null;

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank", "width=302,height=600");
    if (!printWindow) {
      alert("Popup diblokir. Izinkan popup untuk mencetak.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Struk - ${data.invoiceNo}</title>
          <style>
            @page { 
              size: 80mm auto; 
              margin: 0; 
            }
            body { 
              margin: 0; 
              padding: 0; 
              font-family: 'Courier New', monospace;
              font-size: 12px;
            }
            .receipt { 
              width: 80mm; 
              padding: 10px;
            }
            .text-center { text-align: center; }
            .flex-between { display: flex; justify-content: space-between; }
            .font-bold { font-weight: bold; }
            .border-dashed { border-top: 1px dashed #000; margin: 8px 0; }
            .text-sm { font-size: 11px; }
            .text-xs { font-size: 10px; }
            .text-xxs { font-size: 9px; }
            .pl-2 { padding-left: 8px; }
            .mb-1 { margin-bottom: 4px; }
            .mb-2 { margin-bottom: 8px; }
            .mt-2 { margin-top: 8px; }
            .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 60%; }
            .text-gray { color: #666; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="text-center mb-2">
              <div class="font-bold text-sm">${storeName}</div>
              ${storeAddress ? `<div class="text-xxs">${storeAddress}</div>` : ""}
              ${storePhone ? `<div class="text-xxs">Telp: ${storePhone}</div>` : ""}
            </div>
            <div class="border-dashed"></div>
            <div class="text-xs mb-1">
              <div class="flex-between"><span>No:</span><span>${data.invoiceNo}</span></div>
              <div class="flex-between"><span>Tanggal:</span><span>${data.date.toLocaleDateString("id-ID")} ${data.date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span></div>
              ${data.cashierName ? `<div class="flex-between"><span>Kasir:</span><span>${data.cashierName}</span></div>` : ""}
              ${data.customerName ? `<div class="flex-between"><span>Pelanggan:</span><span>${data.customerName}</span></div>` : ""}
            </div>
            <div class="border-dashed"></div>
            <div class="mb-1">
              ${data.items.map(item => `
                <div class="mb-1">
                  <div class="truncate">${item.name}</div>
                  <div class="flex-between text-xs pl-2">
                    <span>${item.qty} x ${formatRupiah(item.price)}</span>
                    <span>${formatRupiah(item.subtotal)}</span>
                  </div>
                  ${item.discount_pct > 0 ? `<div class="text-xxs pl-2 text-gray">Disc: ${item.discount_pct}%</div>` : ""}
                </div>
              `).join("")}
            </div>
            <div class="border-dashed"></div>
            <div class="text-xs">
              <div class="flex-between"><span>Subtotal</span><span>${formatRupiah(data.subtotal)}</span></div>
              ${data.discount > 0 ? `<div class="flex-between"><span>Diskon</span><span>-${formatRupiah(data.discount)}</span></div>` : ""}
              ${data.tax > 0 ? `<div class="flex-between"><span>Pajak</span><span>${formatRupiah(data.tax)}</span></div>` : ""}
              <div class="flex-between font-bold text-sm"><span>TOTAL</span><span>${formatRupiah(data.grandTotal)}</span></div>
              <div class="flex-between"><span>Bayar (${data.paymentMethod === "cash" ? "Tunai" : "Transfer"})</span><span>${formatRupiah(data.paidAmount)}</span></div>
              <div class="flex-between font-bold"><span>Kembali</span><span>${formatRupiah(data.changeAmount)}</span></div>
            </div>
            <div class="border-dashed"></div>
            <div class="text-center text-xxs">
              <p>Terima Kasih</p>
              <p>Atas Kunjungan Anda</p>
              <p class="mt-2 text-gray">Barang yang sudah dibeli</p>
              <p class="text-gray">tidak dapat dikembalikan</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleDownloadPDF = async () => {
    const content = printRef.current;
    if (!content) return;

    // Use html2canvas + jspdf approach via browser print
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Popup diblokir. Izinkan popup untuk download PDF.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Struk - ${data.invoiceNo}</title>
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              font-family: 'Courier New', monospace;
              font-size: 12px;
              max-width: 302px;
            }
            .text-center { text-align: center; }
            .flex-between { display: flex; justify-content: space-between; }
            .font-bold { font-weight: bold; }
            .border-dashed { border-top: 1px dashed #000; margin: 8px 0; }
            .text-sm { font-size: 11px; }
            .text-xs { font-size: 10px; }
            .text-xxs { font-size: 9px; }
            .pl-2 { padding-left: 8px; }
            .mb-1 { margin-bottom: 4px; }
            .mb-2 { margin-bottom: 8px; }
            .mt-2 { margin-top: 8px; }
            .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 60%; }
            .text-gray { color: #666; }
          </style>
        </head>
        <body>
          <div class="text-center mb-2">
            <div class="font-bold text-sm">${storeName}</div>
            ${storeAddress ? `<div class="text-xxs">${storeAddress}</div>` : ""}
            ${storePhone ? `<div class="text-xxs">Telp: ${storePhone}</div>` : ""}
          </div>
          <div class="border-dashed"></div>
          <div class="text-xs mb-1">
            <div class="flex-between"><span>No:</span><span>${data.invoiceNo}</span></div>
            <div class="flex-between"><span>Tanggal:</span><span>${data.date.toLocaleDateString("id-ID")} ${data.date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span></div>
            ${data.cashierName ? `<div class="flex-between"><span>Kasir:</span><span>${data.cashierName}</span></div>` : ""}
            ${data.customerName ? `<div class="flex-between"><span>Pelanggan:</span><span>${data.customerName}</span></div>` : ""}
          </div>
          <div class="border-dashed"></div>
          <div class="mb-1">
            ${data.items.map(item => `
              <div class="mb-1">
                <div class="truncate">${item.name}</div>
                <div class="flex-between text-xs pl-2">
                  <span>${item.qty} x ${formatRupiah(item.price)}</span>
                  <span>${formatRupiah(item.subtotal)}</span>
                </div>
                ${item.discount_pct > 0 ? `<div class="text-xxs pl-2 text-gray">Disc: ${item.discount_pct}%</div>` : ""}
              </div>
            `).join("")}
          </div>
          <div class="border-dashed"></div>
          <div class="text-xs">
            <div class="flex-between"><span>Subtotal</span><span>${formatRupiah(data.subtotal)}</span></div>
            ${data.discount > 0 ? `<div class="flex-between"><span>Diskon</span><span>-${formatRupiah(data.discount)}</span></div>` : ""}
            ${data.tax > 0 ? `<div class="flex-between"><span>Pajak</span><span>${formatRupiah(data.tax)}</span></div>` : ""}
            <div class="flex-between font-bold text-sm"><span>TOTAL</span><span>${formatRupiah(data.grandTotal)}</span></div>
            <div class="flex-between"><span>Bayar (${data.paymentMethod === "cash" ? "Tunai" : "Transfer"})</span><span>${formatRupiah(data.paidAmount)}</span></div>
            <div class="flex-between font-bold"><span>Kembali</span><span>${formatRupiah(data.changeAmount)}</span></div>
          </div>
          <div class="border-dashed"></div>
          <div class="text-center text-xxs">
            <p>Terima Kasih</p>
            <p>Atas Kunjungan Anda</p>
            <p class="mt-2 text-gray">Barang yang sudah dibeli</p>
            <p class="text-gray">tidak dapat dikembalikan</p>
          </div>
          <script>
            // Save as PDF using print dialog (choose Save as PDF)
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Struk Pembayaran</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex justify-center bg-muted rounded-lg p-4 overflow-auto">
          <ReceiptContent 
            ref={printRef} 
            data={data} 
            storeName={storeName}
            storeAddress={storeAddress}
            storePhone={storePhone}
          />
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handlePrint} className="flex-1">
            <Printer className="mr-2 h-4 w-4" />
            Cetak Struk
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF} className="flex-1">
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
