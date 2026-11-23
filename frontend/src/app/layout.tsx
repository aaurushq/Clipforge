import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClipForge — Turn Long Videos into Viral Shorts & Reels",
  description: "AI-powered video clipping tool with automated framing, animated captions, and virality scoring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-brand selection:text-white" suppressHydrationWarning>
        {/* Navigation Bar */}
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <a href="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
              <span className="flex size-7 items-center justify-center rounded-lg bg-brand text-brand-foreground shadow-sm">
                ⚡
              </span>
              <span>Clip<span className="text-brand">Forge</span></span>
            </a>

            <div className="flex items-center gap-4">
              <a href="/#recent-heading" className="text-sm font-medium text-muted-foreground transition hover:text-foreground">
                Library
              </a>
              <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
                Pro
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
          {children}
        </main>
      </body>
    </html>
  );
}
