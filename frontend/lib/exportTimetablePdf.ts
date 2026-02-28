import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const TIME_SLOTS: { perNo: number | null; label: string; isRecess?: boolean }[] = [
  { perNo: 1, label: "08:00 AM TO 08:30 AM" },
  { perNo: 2, label: "08:30 AM TO 09:10 AM" },
  { perNo: 3, label: "09:10 AM TO 09:50 AM" },
  { perNo: 4, label: "09:50 AM TO 10:30 AM" },
  { perNo: null, label: "10:30 AM TO 10:55 AM", isRecess: true },
  { perNo: 5, label: "10:55 AM TO 11:35 AM" },
  { perNo: 6, label: "11:35 AM TO 12:15 PM" },
  { perNo: 7, label: "12:15 PM TO 12:55 PM" },
  { perNo: null, label: "12:55 PM TO 01:10 PM", isRecess: true },
  { perNo: 8, label: "01:10 PM TO 01:50 PM" },
  { perNo: 9, label: "01:50 PM TO 02:30 PM" }
];

const DAYS_HEADER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

export type TimetableDay = {
  day: string;
  periods: {
    periodNumber: number;
    subject: string;
    teacher?: string | null;
    room?: string | null;
    note?: string | null;
  }[];
};

export type Timetable = {
  className: string;
  division: string;
  days: TimetableDay[];
};

function buildTableBody(tt: Timetable): (string | number | { content: string; colSpan: number })[][] {
  const body: (string | number | { content: string; colSpan: number })[][] = [];
  for (const slot of TIME_SLOTS) {
    if (slot.isRecess) {
      body.push([
        "—",
        slot.label,
        { content: "RECESS", colSpan: 6 }
      ]);
    } else {
      const periodIndex = slot.perNo! - 1;
      const row: (string | number)[] = [
        slot.perNo!,
        slot.label
      ];
      for (let d = 0; d < 6 && d < tt.days.length; d++) {
        const p = tt.days[d].periods[periodIndex];
        row.push(p?.subject?.trim() || "—");
      }
      body.push(row);
    }
  }
  return body;
}

export function exportTimetableToPdf(tt: Timetable, filename?: string): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = 297;
  const margin = 10;

  doc.setFontSize(14);
  doc.text("TIME TABLE", pageWidth / 2, 14, { align: "center" });
  doc.setFontSize(11);
  doc.text(`CLASS : ${tt.className}`, margin, 22);
  doc.text(`DIVISION : ${tt.division}`, pageWidth - margin, 22, { align: "right" });

  const tableStartY = 28;
  const body = buildTableBody(tt);

  autoTable(doc, {
    startY: tableStartY,
    head: [["PER. NO.", "TIME ↓ / DAY →", ...DAYS_HEADER]],
    body,
    theme: "grid",
    headStyles: {
      fillColor: [245, 220, 180],
      textColor: [120, 80, 40],
      fontStyle: "bold"
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 38 }
    },
    margin: { left: margin, right: margin },
    tableLineColor: [200, 200, 200],
    tableLineWidth: 0.1
  });

  const name = filename ?? `Timetable_Class_${tt.className}_${tt.division}.pdf`;
  doc.save(name);
}

export function exportAllTimetablesToPdf(timetables: Timetable[]): void {
  timetables.forEach((tt, i) => {
    setTimeout(() => {
      exportTimetableToPdf(tt, `Timetable_Class_${tt.className}_${tt.division}.pdf`);
    }, i * 400);
  });
}
