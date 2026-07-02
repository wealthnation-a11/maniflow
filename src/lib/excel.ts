import * as XLSX from "xlsx";

export type SalesRow = {
  id: string;
  date: string; // ISO
  customer: string;
  phone: string;
  product: string;
  amount: number;
  platform: string;
  status: string;
  payment: string;
};

/**
 * Build a fully-automated multi-sheet workbook:
 *  - "Sales": one row per order with formulas for VAT (7.5%) & running total
 *  - "Summary": SUMIF / COUNTIF formulas over the Sales sheet, so it recalculates
 *    automatically when a business edits rows in Excel.
 *  - "By Platform": per-platform breakdown using SUMIF.
 */
export function exportSalesWorkbook(filename: string, rows: SalesRow[], businessName = "Manyflow") {
  const wb = XLSX.utils.book_new();

  // --- Sales sheet ---
  const header = [
    "Order ID", "Date", "Customer", "Phone", "Product",
    "Amount (₦)", "VAT 7.5% (₦)", "Total (₦)", "Running Total (₦)",
    "Platform", "Status", "Payment",
  ];
  const salesAoA: (string | number)[][] = [header];

  rows.forEach((r, i) => {
    const excelRow = i + 2; // 1-based, +1 for header
    salesAoA.push([
      r.id,
      r.date ? new Date(r.date).toISOString().slice(0, 10) : "",
      r.customer,
      r.phone,
      r.product,
      Number(r.amount) || 0,
      { f: `ROUND(F${excelRow}*0.075,2)` } as any,
      { f: `F${excelRow}+G${excelRow}` } as any,
      i === 0
        ? ({ f: `H${excelRow}` } as any)
        : ({ f: `I${excelRow - 1}+H${excelRow}` } as any),
      r.platform,
      r.status,
      r.payment,
    ]);
  });

  // Totals row
  const lastRow = rows.length + 1;
  const totalsRow = rows.length + 2;
  salesAoA.push([
    "TOTAL", "", "", "", "",
    { f: `SUM(F2:F${lastRow})` } as any,
    { f: `SUM(G2:G${lastRow})` } as any,
    { f: `SUM(H2:H${lastRow})` } as any,
    "", "", "", "",
  ]);

  const salesWs = XLSX.utils.aoa_to_sheet(salesAoA);
  salesWs["!cols"] = [
    { wch: 14 }, { wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 24 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
    { wch: 12 }, { wch: 12 }, { wch: 12 },
  ];
  // Currency-ish number format on amount columns
  ["F", "G", "H", "I"].forEach((col) => {
    for (let r = 2; r <= totalsRow; r++) {
      const cell = salesWs[`${col}${r}`];
      if (cell && typeof cell === "object") (cell as any).z = "#,##0.00";
    }
  });
  XLSX.utils.book_append_sheet(wb, salesWs, "Sales");

  // --- Summary sheet with live formulas referencing Sales ---
  const salesRange = `Sales!F2:F${lastRow}`;
  const payRange = `Sales!L2:L${lastRow}`;
  const statusRange = `Sales!K2:K${lastRow}`;
  const summary: (string | number | { f: string })[][] = [
    [businessName + " — Sales Summary", ""],
    ["Generated", new Date().toISOString().slice(0, 10)],
    ["", ""],
    ["Metric", "Value"],
    ["Total orders", { f: `COUNTA(Sales!A2:A${lastRow})` }],
    ["Gross revenue (₦)", { f: `SUM(${salesRange})` }],
    ["VAT collected (₦)", { f: `SUM(Sales!G2:G${lastRow})` }],
    ["Grand total incl. VAT (₦)", { f: `SUM(Sales!H2:H${lastRow})` }],
    ["Average order value (₦)", { f: `IFERROR(AVERAGE(${salesRange}),0)` }],
    ["", ""],
    ["Paid orders", { f: `COUNTIF(${payRange},"paid")` }],
    ["Pending payments", { f: `COUNTIF(${payRange},"pending")` }],
    ["Failed payments", { f: `COUNTIF(${payRange},"failed")` }],
    ["Paid revenue (₦)", { f: `SUMIF(${payRange},"paid",${salesRange})` }],
    ["", ""],
    ["Delivered", { f: `COUNTIF(${statusRange},"delivered")` }],
    ["Shipped", { f: `COUNTIF(${statusRange},"shipped")` }],
    ["Processing", { f: `COUNTIF(${statusRange},"processing")` }],
    ["Pending", { f: `COUNTIF(${statusRange},"pending")` }],
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summary);
  summaryWs["!cols"] = [{ wch: 32 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  // --- By Platform ---
  const platforms = ["whatsapp", "instagram", "facebook"];
  const platformRange = `Sales!J2:J${lastRow}`;
  const byPlatform: (string | number | { f: string })[][] = [
    ["Platform", "Orders", "Revenue (₦)", "Paid Revenue (₦)"],
    ...platforms.map((p) => [
      p,
      { f: `COUNTIF(${platformRange},"${p}")` } as any,
      { f: `SUMIF(${platformRange},"${p}",${salesRange})` } as any,
      { f: `SUMIFS(${salesRange},${platformRange},"${p}",${payRange},"paid")` } as any,
    ]),
  ];
  const platWs = XLSX.utils.aoa_to_sheet(byPlatform);
  platWs["!cols"] = [{ wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, platWs, "By Platform");

  XLSX.writeFile(wb, `${filename}.xlsx`);
}
