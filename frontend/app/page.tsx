'use client';

import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "../components/ui/table";

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

export default function HomePage() {
  const [className, setClassName] = useState("8");
  const [division, setDivision] = useState("A");
  const [daysPerWeek, setDaysPerWeek] = useState(6); // Include Saturday by default
  const [periodsPerDay, setPeriodsPerDay] = useState(7);
  const [teacherContext, setTeacherContext] = useState(
    "Example:\n- Mr. Sharma: Maths, available Mon–Sat periods 1–5\n- Ms. Rao: Science, available Mon–Sat periods 2–6\n- Mr. Khan: English, available Mon–Sat periods 1–4\n\nYou can replace this text with your real teacher list, subjects, and availability rules."
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawModelText, setRawModelText] = useState<string | null>(null);
  const [timetable, setTimetable] = useState<Timetable | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setTimetable(null);
    setRawModelText(null);

    try {
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
      : periodsPerDay;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.35fr)]">
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
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="space-y-1.5">
              <label
                className="text-xs font-medium text-muted-foreground"
                htmlFor="teacherContext"
              >
                Teacher data & availability
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
              {loading ? "Generating timetable..." : "Generate timetable"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Generated timetable</CardTitle>
              <CardDescription>
                Visualized schedule for your class, with teachers and rooms.
              </CardDescription>
            </div>
            {timetable && (
              <Badge variant="outline">
                Class {timetable.className} – {timetable.division}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {!timetable && !rawModelText && (
            <div className="flex h-full min-h-[260px] items-center justify-center text-sm text-muted-foreground">
              Fill in the details on the left and click{" "}
              <span className="mx-1 font-semibold text-foreground">
                Generate timetable
              </span>
              to see a beautiful schedule here.
            </div>
          )}

          {timetable && (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-xl border bg-card/40">
                <Table>
                  <THead>
                    <TR>
                      <TH>Day</TH>
                      {Array.from({ length: maxPeriods }).map((_, i) => (
                        <TH key={i} className="text-center text-[11px] uppercase">
                          P{i + 1}
                        </TH>
                      ))}
                    </TR>
                  </THead>
                  <TBody>
                    {timetable.days.map((day) => (
                      <TR key={day.day}>
                        <TD className="text-[11px] font-semibold uppercase text-muted-foreground">
                          {day.day}
                        </TD>
                        {Array.from({ length: maxPeriods }).map((_, i) => {
                          const slot = day.periods[i];
                          return (
                            <TD key={i}>
                              {slot ? (
                                <div className="space-y-0.5">
                                  <div className="text-xs font-semibold">
                                    {slot.subject || "Free"}
                                  </div>
                                  {slot.teacher && (
                                    <div className="text-[11px] text-muted-foreground">
                                      {slot.teacher}
                                    </div>
                                  )}
                                  {slot.room && (
                                    <div className="text-[11px] text-muted-foreground">
                                      Room: {slot.room}
                                    </div>
                                  )}
                                  {slot.note && (
                                    <div className="text-[11px] text-amber-600">
                                      {slot.note}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">
                                  —
                                </span>
                              )}
                            </TD>
                          );
                        })}
                      </TR>
                    ))}
                  </TBody>
                </Table>
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

