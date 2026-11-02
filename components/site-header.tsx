import Link from "next/link";

const navItems = [
  { href: "/about", label: "About" },
  { href: "/productions", label: "Productions" },
  { href: "/contact", label: "Contact" },
  { href: "/admin", label: "Admin" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 text-sm uppercase tracking-[0.35em] text-white/90">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-[10px] font-medium">
            PP
          </span>
          Proximity Production
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-zinc-300 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/contact"
          className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white hover:text-black"
        >
          Inquire
        </Link>
      </div>
    </header>
  );
}
