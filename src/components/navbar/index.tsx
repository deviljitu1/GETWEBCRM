'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  FiAlignJustify,
  FiSearch,
  FiSettings,
  FiLock,
  FiLogOut,
  FiArrowRight,
} from 'react-icons/fi';
import { RiMoonFill, RiSunFill } from 'react-icons/ri';
import { signOut } from 'app/auth/actions';

const Navbar = ({
  onOpenSidenav,
  brandText,
  navigationOpen = false,
  showSettings,
}: {
  onOpenSidenav: () => void;
  brandText: string;
  secondary?: boolean | string;
  navigationOpen?: boolean;
  showSettings?: boolean;
}) => {
  const scope = usePathname()?.split('/')[1] || 'login';
  const [darkmode, setDarkmode] = useState(false);
  return (
    <nav className="sticky top-4 z-40 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/90 p-3 shadow-[0_10px_30px_rgba(30,41,59,0.08)] backdrop-blur-xl dark:border-navy-700 dark:bg-navy-800/95 dark:shadow-none">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onOpenSidenav}
          aria-label="Open navigation"
          aria-expanded={navigationOpen}
          aria-controls="workspace-navigation"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-gray-100 dark:hover:bg-navy-700 xl:hidden"
        >
          <FiAlignJustify className="h-5 w-5 text-navy-700 dark:text-white" />
        </button>
        <div className="min-w-0">
          <p className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-brand-500 sm:block">
            {scope === 'admin' ? 'Platform control' : 'Workspace'}
          </p>
          <h2 className="truncate text-xl font-bold text-navy-700 dark:text-white sm:text-2xl">
            {brandText}
          </h2>
        </div>
      </div>
      <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
        {scope !== 'admin' && (
          <form
            action={`/${scope}/leads`}
            className="group relative flex min-h-11 flex-1 items-center rounded-xl border border-gray-200 bg-gray-50 px-3 text-navy-700 transition-all focus-within:border-brand-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-500/10 dark:border-navy-600 dark:bg-navy-900 dark:text-white sm:w-[290px] sm:flex-none"
          >
            <FiSearch className="mr-2 h-4 w-4 shrink-0 text-brand-500" />
            <input
              name="q"
              aria-label="Search leads"
              maxLength={100}
              placeholder="Search leads, phone, or property…"
              className="!bg-transparent min-w-0 flex-1 text-sm outline-none placeholder:text-gray-400"
            />
            <button
              aria-label="Search leads"
              className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white opacity-90 transition-opacity hover:opacity-100"
            >
              <FiArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}
        <button
          className="flex h-11 w-11 items-center justify-center rounded-full text-navy-700 transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-navy-700"
          aria-label="Toggle dark mode"
          title="Toggle dark mode"
          onClick={() => {
            const enabled = document.body.classList.toggle('dark');
            setDarkmode(enabled);
          }}
        >
          {darkmode ? (
            <RiSunFill className="h-5 w-5" />
          ) : (
            <RiMoonFill className="h-5 w-5" />
          )}
        </button>
        {showSettings !== false && (
          <Link
            className="flex h-11 w-11 items-center justify-center rounded-full text-navy-700 transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-navy-700"
            href={`/${scope}/settings`}
            title="Settings"
          >
            <FiSettings className="h-5 w-5" />
          </Link>
        )}
        <Link
          className="flex h-11 w-11 items-center justify-center rounded-full text-navy-700 transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-navy-700"
          href="/auth/password"
          title="Change Password"
        >
          <FiLock className="h-5 w-5" />
        </Link>
        <form action={signOut} className="!w-auto">
          <input type="hidden" name="scope" value={scope} />
          <button
            type="submit"
            title="Log out"
            aria-label="Log out"
            className="flex h-11 w-11 items-center justify-center rounded-full text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <FiLogOut className="h-5 w-5" />
          </button>
        </form>
      </div>
    </nav>
  );
};
export default Navbar;
