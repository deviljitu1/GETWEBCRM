'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { FiAlignJustify, FiSearch } from 'react-icons/fi';
import { RiMoonFill, RiSunFill } from 'react-icons/ri';
import { signOut } from 'app/auth/actions';
const Navbar = ({onOpenSidenav,brandText,navigationOpen=false}:{onOpenSidenav:()=>void;brandText:string;secondary?:boolean|string;navigationOpen?:boolean}) => {
  const scope = usePathname()?.split('/')[1] || 'login';
  const [darkmode,setDarkmode] = useState(false);
  return <nav className="sticky top-4 z-40 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/90 p-3 shadow-sm backdrop-blur-xl dark:bg-navy-800 dark:shadow-none">
    <div className="flex min-w-0 items-center gap-2"><button onClick={onOpenSidenav} aria-label="Open navigation" aria-expanded={navigationOpen} aria-controls="workspace-navigation" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 xl:hidden dark:hover:bg-navy-700 transition-colors"><FiAlignJustify className="h-5 w-5 text-navy-700 dark:text-white"/></button><h2 className="break-words text-xl font-bold text-navy-700 dark:text-white sm:text-2xl">{brandText}</h2></div>
    <div className="flex min-w-0 w-full flex-wrap items-center gap-2 sm:w-auto">
      {scope !== 'admin' && <form action={`/${scope}/leads`} className="relative flex items-center rounded-full bg-lightPrimary px-4 py-2.5 text-navy-700 transition-all duration-200 focus-within:ring-2 focus-within:ring-brand-500 dark:bg-navy-900 dark:text-white"><FiSearch className="mr-2 h-4 w-4 text-gray-500 dark:text-gray-400"/><input name="q" aria-label="Search leads" maxLength={100} placeholder="Search leads…" className="w-full max-w-[150px] bg-transparent text-sm outline-none placeholder:text-gray-400 sm:w-[200px]"/><button aria-label="Search" className="hidden">Submit</button></form>}
      <button className="flex h-11 w-11 items-center justify-center rounded-full text-navy-700 hover:bg-gray-100 dark:text-white dark:hover:bg-navy-700 transition-colors" aria-label="Toggle dark mode" onClick={()=>{const enabled=document.body.classList.toggle('dark');setDarkmode(enabled);}}>{darkmode?<RiSunFill className="h-5 w-5"/>:<RiMoonFill className="h-5 w-5"/>}</button>
      <Link className="flex min-h-10 items-center rounded-full px-4 text-sm font-medium text-navy-700 transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-navy-700" href={`/${scope}/settings`}>Settings</Link>
      <Link className="flex min-h-10 items-center rounded-full px-4 text-sm font-medium text-navy-700 transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-navy-700" href="/auth/password">Password</Link>
      <form action={signOut} className="!w-auto"><input type="hidden" name="scope" value={scope}/><button className="flex min-h-10 items-center rounded-full px-4 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20">Log out</button></form>
    </div>
  </nav>;
};
export default Navbar;
