import "./globals.css";
export const metadata = { title: "AdSell Outreach", description: "Internal outreach tool — CSV import, manual leads, and campaigns." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body>
      <header className="border-b border-[var(--border)] sticky top-0 backdrop-blur supports-[backdrop-filter]:bg-[#0b0f16cc]">
        <div className="container flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2 font-heading text-lg">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--primary)] text-white font-bold">A</span>
            <span>AdSell Outreach</span>
          </a>
          <nav className="hidden md:flex items-center gap-5 text-sm opacity-90">
            <a href="/leads/upload">Upload CSV</a>
            <a href="/leads/new">Add Lead</a>
            <a href="/leads/dashboard">Dashboard</a>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="mt-16 border-t border-[var(--border)]">
        <div className="container py-8 text-sm opacity-75">© {new Date().getFullYear()} AdSell.ai — Internal tool</div>
      </footer>
    </body></html>
  );}
