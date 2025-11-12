import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="mb-8 text-4xl font-bold text-fg sm:text-5xl md:text-6xl font-heading">
        AdSell Outreach
      </h1>
      <p className="mb-12 text-base text-fg/80 sm:text-lg">
        Manage and upload your leads quickly.
      </p>
      <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <Link
          href="/leads/upload"
          className="w-full rounded-lg bg-primary px-8 py-4 text-center text-white shadow transition hover:brightness-110 sm:w-auto"
        >
          Upload CSV
        </Link>
        <Link
          href="/leads/new"
          className="w-full rounded-lg bg-secondary px-8 py-4 text-center text-white shadow transition hover:brightness-110 sm:w-auto"
        >
          Add Lead Manually
        </Link>
      </div>
    </main>
  );
}
