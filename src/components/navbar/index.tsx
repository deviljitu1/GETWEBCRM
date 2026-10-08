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
  return <nav className="sticky top-4 z-40 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/90 p-3 backdrop-blur-xl dark:bg-navy-800">
    <div className="flex min-w-0 items-center gap-2"><button onClick={onOpenSidenav} aria-label="Open navigation" aria-expanded={navigationOpen} aria-controls="workspace-navigation" className="flex h-11 w-11 shrink-0 items-center justify-center xl:hidden"><FiAlignJustify className="h-6 w-6"/></button><h2 className="break-words text-xl font-bold text-navy-700 dark:text-white sm:text-2xl">{brandText}</h2></div>
    <div className="flex flex-wrap items-center gap-4">
      {scope !== 'admin' && <form action={`/${scope}/leads`} className="flex items-center gap-2 rounded-full bg-lightPrimary px-3 py-2 dark:bg-navy-900"><input name="q" aria-label="Search leads" maxLength={100} placeholder="Search leads…" className="max-w-[150px] bg-transparent text-sm outline-none dark:text-white"/><button aria-label="Search"><FiSearch/></button></form>}
      <button className="flex h-11 w-11 items-center justify-center" aria-label="Toggle dark mode" onClick={()=>{const enabled=document.body.classList.toggle('dark');setDarkmode(enabled);}}>{darkmode?<RiSunFill/>:<RiMoonFill/>}</button>
      <Link className="text-sm text-brand-500" href={`/${scope}/settings`}>Settings</Link>
      <Link className="text-sm text-brand-500" href="/auth/password">Password</Link>
      <form action={signOut}><input type="hidden" name="scope" value={scope}/><button className="text-sm font-medium text-red-500">Log out</button></form>
    </div>
  </nav>;
};
export default Navbar;
