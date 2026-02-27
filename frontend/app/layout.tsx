import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Automatic School Timetable Generator",
  description:
    "Generate conflict-free class timetables using a backend service with teacher availability."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-indigo-50/60 text-foreground antialiased">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8">
          <header className="mb-6 flex items-center justify-between gap-4 animate-in fade-in-50 slide-in-from-top-2">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Automatic Timetable Generator
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Plan beautiful, conflict-free schedules for your classes, powered by Gemini & MongoDB.
              </p>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="mt-10 border-t border-border pt-4 text-xs text-muted-foreground">
            Frontend built with Next.js, Tailwind CSS, and shadcn UI.
          </footer>
        </div>
      </body>
    </html>
  );
}

