"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/productions", label: "Production" },
  { href: "/contact", label: "Contact" },
  { href: "/admin/login", label: "Sign In" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  function isActive(href: string) {
    return href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  }

  function getLinkClassName(href: string, emphasized = false) {
    if (emphasized) {
      return "inline-flex items-center rounded-full border border-white/20 bg-white/5 px-4 py-2 text-white transition hover:border-white hover:bg-white hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white";
    }

    return `rounded-sm transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${
      isActive(href) ? "text-white" : "text-zinc-300"
    }`;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center px-4 py-4 sm:px-6 lg:px-8">
        <nav aria-label="Main navigation" className="hidden items-center justify-center gap-8 text-sm md:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={getLinkClassName(item.href, item.href === "/admin/login")}
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className="ml-auto inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm text-zinc-300 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white md:hidden"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-main-navigation"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <span>{isMenuOpen ? "Close" : "Menu"}</span>
          <svg
            aria-hidden="true"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            {isMenuOpen ? (
              <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
            ) : (
              <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>

        {isMenuOpen ? (
          <nav
            id="mobile-main-navigation"
            aria-label="Mobile main navigation"
            className="basis-full pt-4 md:hidden"
          >
            <ul className="flex flex-col gap-1 border-t border-white/10 pt-3 text-sm">
              {navItems.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={`${item.href === "/admin/login" ? "my-1" : "block px-2 py-3"} ${getLinkClassName(item.href, item.href === "/admin/login")}`}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
