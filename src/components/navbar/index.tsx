'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { FiAlignJustify, FiSearch } from 'react-icons/fi';
import { RiMoonFill, RiSunFill } from 'react-icons/ri';
import { signOut } from 'app/auth/actions';
const Navbar = ({onOpenSidenav,brandText}:{onOpenSidenav:()=>void;brandText:string;secondary?:boolean|string}) => {
  const scope = usePathname()?.split('/')[1] || 'grahsiddhi';
  const [darkmode,setDarkmode] = useState(false);
  return <nav className="sticky top-4 z-40 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/90 p-3 backdrop-blur-xl dark:bg-navy-800">
    <div className="flex items-center gap-3"><button onClick={onOpenSidenav} aria-label="Open navigation" className="xl:hidden"><FiAlignJustify className="h-6 w-6"/></button><h2 className="text-2xl font-bold text-navy-700 dark:text-white">{brandText}</h2></div>
    <div className="flex flex-wrap items-center gap-4">
      {scope !== 'admin' && <form action={`/${scope}/leads`} className="flex items-center gap-2 rounded-full bg-lightPrimary px-3 py-2 dark:bg-navy-900"><input name="q" aria-label="Search leads" maxLength={100} placeholder="Search leads…" className="max-w-[150px] bg-transparent text-sm outline-none dark:text-white"/><button aria-label="Search"><FiSearch/></button></form>}
      <button aria-label="Toggle dark mode" onClick={()=>{const enabled=document.body.classList.toggle('dark');setDarkmode(enabled);}}>{darkmode?<RiSunFill/>:<RiMoonFill/>}</button>
      <Link className="text-sm text-brand-500" href={`/${scope}/settings`}>Settings</Link>
      <form action={signOut}><input type="hidden" name="scope" value={scope}/><button className="text-sm font-medium text-red-500">Log out</button></form>
    </div>
  </nav>;
};
export default Navbar;
