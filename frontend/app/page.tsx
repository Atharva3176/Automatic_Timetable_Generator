'use client';

import { FormEvent, useState } from "react";
import { Loader2, FileDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { exportTimetableToPdf, exportAllTimetablesToPdf } from "../lib/exportTimetablePdf";

type TimetableDay = {
  day: string;
  periods: {
    periodNumber: number;
    subject: string;
    teacher?: string | null;
    room?: string | null;
    note?: string | null;
  }[];
};

type Timetable = {
  className: string;
  division: string;
  days: TimetableDay[];
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

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

const DEFAULT_TEACHER_CONTEXT = `Six days (Mon–Sat), 9 periods per day. P1 = 30 min, P2–P9 = 40 min. Long recess 10:30 (25 min), short recess 12:55 (15 min).

Per week: English 5, Science 6, Social Science 7, Marathi 5, Mathematics 6 (double P1–P2 on 3 days), Hindi 5, Music 1, Dance 1, Computer 1, Art 1, Value Education 2 (P1 on 2 same days), Foundation Eng/Maths/Sci 1 each, Skill 1, Tech Club 1, Sports 3, Weekly Test Wed P1–P3, Assembly Tue/Fri/Sat P1. Activity club: 2 periods per week—Monday P9 and Tuesday P9 only, for all divisions of Class 6 and 7.

List each teacher with subjects and availability for common use across Class 6 and 7 divisions. Example:
- Mr. X: English, available all days P1–P9
- Ms. Y: Mathematics, available Mon–Sat P1–P4 (for double period)
...`;

export default function HomePage() {
  const [mode, setMode] = useState<"single" | "class6-7">("class6-7");
  const [className, setClassName] = useState("6");
  const [division, setDivision] = useState("A");
  const [daysPerWeek, setDaysPerWeek] = useState(6);
  const [periodsPerDay, setPeriodsPerDay] = useState(9);
  const [teacherContext, setTeacherContext] = useState(DEFAULT_TEACHER_CONTEXT);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawModelText, setRawModelText] = useState<string | null>(null);
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [timetables67, setTimetables67] = useState<Timetable[]>([]);
  const [selected67, setSelected67] = useState(0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setTimetable(null);
    setTimetables67([]);
    setRawModelText(null);

    try {
      if (mode === "class6-7") {
        const res = await fetch(`${API_BASE}/api/generate-timetable-class6-7`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teacherContext })
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to generate timetables.");
          if (data.raw) setRawModelText(data.raw);
          return;
        }
        if (data.error) setError(data.error);
        if (Array.isArray(data.timetables) && data.timetables.length > 0) {
          setTimetables67(data.timetables);
          setSelected67(0);
        } else if (data.raw) setRawModelText(data.raw);
      } else {
        const res = await fetch(`${API_BASE}/api/generate-timetable`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            className,
            division,
            daysPerWeek,
            periodsPerDay,
            teacherContext
          })
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to generate timetable.");
          if (data.raw) setRawModelText(data.raw);
          return;
        }

        if (data.error) {
          setError(data.error);
        }

        if (data.timetable) {
          setTimetable(data.timetable as Timetable);
        } else if (data.raw) {
          setRawModelText(data.raw as string);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Unexpected error while calling the backend.");
    } finally {
      setLoading(false);
    }
  }

  const maxPeriods =
    timetable && timetable.days.length > 0
      ? Math.max(...timetable.days.map((d) => d.periods.length))
      : timetables67.length > 0 && timetables67[selected67]
        ? Math.max(...(timetables67[selected67].days || []).map((d) => (d.periods || []).length), 9)
        : periodsPerDay;
  const displayTimetable = timetables67.length > 0 ? timetables67[selected67] : timetable;

  return (
    <div className="grid w-full gap-6 lg:grid-cols-[minmax(320px,0.38fr)_minmax(0,1fr)]">
      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 -top-10 h-32 bg-gradient-to-b from-sky-100/80 via-transparent to-transparent" />
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Class & teacher details</CardTitle>
              <CardDescription>
                Tell the planner about your class, days (including Saturday), and staff availability.
              </CardDescription>
            </div>
            <Badge>Frontend</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 rounded-lg border p-1">
            <button
              type="button"
              onClick={() => setMode("class6-7")}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === "class6-7" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              Class 6 & 7 (all divisions)
            </button>
            <button
              type="button"
              onClick={() => setMode("single")}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === "single" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              Single class
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "single" && (
            <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="className"
                >
                  Class
                </label>
                <Input
                  id="className"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="e.g. 8"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="division"
                >
                  Division
                </label>
                <Input
                  id="division"
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                  placeholder="e.g. A"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="daysPerWeek"
                >
                  Days per week (Mon–Sat = 6)
                </label>
                <Input
                  id="daysPerWeek"
                  type="number"
                  min={1}
                  max={6}
                  value={daysPerWeek}
                  onChange={(e) => setDaysPerWeek(Number(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="periodsPerDay"
                >
                  Periods per day
                </label>
                <Input
                  id="periodsPerDay"
                  type="number"
                  min={1}
                  max={10}
                  value={periodsPerDay}
                  onChange={(e) => setPeriodsPerDay(Number(e.target.value))}
                  required
                />
              </div>
            </div>
            </>
            )}
            <div className="space-y-1.5">
              <label
                className="text-xs font-medium text-muted-foreground"
                htmlFor="teacherContext"
              >
                {mode === "class6-7"
                  ? "Teacher list (common for Class 6 & 7, all divisions)"
                  : "Teacher data & availability"}
              </label>
              <Textarea
                id="teacherContext"
                value={teacherContext}
                onChange={(e) => setTeacherContext(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Describe each teacher: subjects, which days/periods they are available
                (including Saturday if applicable), and any constraints.
              </p>
            </div>

            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}

            <Button className="w-full gap-2" disabled={loading} type="submit">
              {loading && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              {loading
                ? "Generating..."
                : mode === "class6-7"
                  ? "Generate Class 6 & 7 (all divisions)"
                  : "Generate timetable"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Generated timetable</CardTitle>
              <CardDescription>
                {mode === "class6-7"
                  ? "All 8 timetables (6A–6D, 7A–7D) with no teacher clashes."
                  : "Visualized schedule for your class, with teachers and rooms."}
              </CardDescription>
            </div>
            {displayTimetable && (
              <Badge variant="outline">
                Class {displayTimetable.className} – {displayTimetable.division}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {!displayTimetable && !rawModelText && (
            <div className="flex h-full min-h-[260px] items-center justify-center text-sm text-muted-foreground">
              Fill in the details on the left and click{" "}
              <span className="mx-1 font-semibold text-foreground">
                {mode === "class6-7" ? "Generate Class 6 & 7 (all divisions)" : "Generate timetable"}
              </span>
              to see a beautiful schedule here.
            </div>
          )}

          {timetables67.length > 1 && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="select-division">
                Division
              </label>
              <select
                id="select-division"
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                value={selected67}
                onChange={(e) => setSelected67(Number(e.target.value))}
              >
                {timetables67.map((tt, i) => (
                  <option key={i} value={i}>
                    Class {tt.className} – {tt.division}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => displayTimetable && exportTimetableToPdf(displayTimetable)}
              >
                <FileDown className="h-4 w-4" />
                Export PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => exportAllTimetablesToPdf(timetables67)}
              >
                <FileDown className="h-4 w-4" />
                Export all 8 as PDF
              </Button>
            </div>
          )}

          {displayTimetable && timetables67.length <= 1 && (
            <div className="mb-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => exportTimetableToPdf(displayTimetable)}
              >
                <FileDown className="h-4 w-4" />
                Export PDF
              </Button>
            </div>
          )}

          {displayTimetable && (
            <div className="space-y-3">
              <div className="w-full overflow-x-auto overflow-y-visible rounded-xl border border-border bg-white shadow-sm">
                <div className="min-w-[900px] w-full max-w-full p-4">
                  <div className="mb-3 text-center">
                    <p className="text-xs font-medium uppercase text-muted-foreground">Time table</p>
                    <div className="mt-1 flex justify-between text-sm font-semibold">
                      <span>CLASS : {displayTimetable.className}</span>
                      <span>DIVISION : {displayTimetable.division}</span>
                    </div>
                  </div>
                  <table className="w-full min-w-[840px] border-collapse text-sm">
                    <colgroup>
                      <col style={{ width: "3rem" }} />
                      <col style={{ width: "10rem" }} />
                      <col style={{ minWidth: "120px" }} />
                      <col style={{ minWidth: "120px" }} />
                      <col style={{ minWidth: "120px" }} />
                      <col style={{ minWidth: "120px" }} />
                      <col style={{ minWidth: "120px" }} />
                      <col style={{ minWidth: "120px" }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-amber-100 text-left">
                        <th className="border border-amber-200 px-2 py-2 font-semibold text-amber-900">PER. NO.</th>
                        <th className="border border-amber-200 px-2 py-2 font-semibold text-amber-900">TIME ↓ / DAY →</th>
                        {DAYS_HEADER.map((d) => (
                          <th key={d} className="min-w-[120px] border border-amber-200 px-2 py-2 text-center font-semibold text-amber-900">
                            {d}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {TIME_SLOTS.map((slot, rowIdx) => {
                        const periodIndex = slot.perNo === null ? -1 : slot.perNo - 1;
                        if (slot.isRecess) {
                          return (
                            <tr key={rowIdx} className="bg-amber-50">
                              <td className="border border-amber-200 px-2 py-1.5 text-center text-amber-900">—</td>
                              <td className="border border-amber-200 px-2 py-1.5 text-xs text-amber-900">{slot.label}</td>
                              <td colSpan={6} className="border border-amber-200 px-2 py-1.5 text-center font-medium text-amber-900">
                                RECESS
                              </td>
                            </tr>
                          );
                        }
                        return (
                          <tr key={rowIdx} className="hover:bg-muted/30">
                            <td className="border border-border px-2 py-2 text-center font-medium">{slot.perNo}</td>
                            <td className="border border-border px-2 py-2 text-xs text-muted-foreground">{slot.label}</td>
                            {displayTimetable.days.slice(0, 6).map((day, dayIdx) => {
                              const p = day.periods[periodIndex];
                              const subject = p?.subject?.trim() || "—";
                              return (
                                <td key={day.day} className="min-w-[120px] border border-border px-2 py-2 text-center font-medium">
                                  {subject}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Scroll horizontally if needed to view all days.
                  </p>
                </div>
              </div>
            </div>
          )}

          {rawModelText && (
            <div className="mt-4 rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
              <p className="mb-1 font-semibold">
                Backend/model response (not valid JSON)
              </p>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap scrollbar-thin">
                {rawModelText}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

