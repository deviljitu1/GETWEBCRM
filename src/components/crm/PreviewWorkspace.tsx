'use client';
import { useState } from 'react';
import { signOut } from 'app/auth/actions';
import { createWorkspace } from 'app/workspaces/actions';
import ActionForm, { Submit } from './ActionForm';
import AccountProfile from './AccountProfile';
import {
  MdAdd,
  MdApartment,
  MdArrowForward,
  MdClose,
  MdDashboard,
  MdLockOutline,
  MdPeople,
  MdSearch,
  MdBusiness,
  MdMenu,
  MdLogout,
  MdAccountCircle,
  MdConstruction,
} from 'react-icons/md';

type Plan = { name: string; price_monthly: number; currency_code: string } | null;

const sampleLeads = [
  { name: 'Aarav Sharma', interest: '3 BHK · Naya Raipur', stage: 'Qualified' },
  { name: 'Priya Verma', interest: '2 BHK · Avanti Vihar', stage: 'Follow-up' },
  { name: 'Rohan Patel', interest: 'Villa · Mowa', stage: 'Site visit' },
];

export default function PreviewWorkspace({ email, plan, profile }: { email?: string | null; plan: Plan; profile: { full_name: string; phone: string | null } }) {
  const [tab, setTab] = useState<'dashboard' | 'leads' | 'inventory' | 'sites' | 'account'>(
    'dashboard',
  );
  const [subscribe, setSubscribe] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const request = () => setSubscribe(true);
  const tabs = [
    { key: 'dashboard' as const, name: 'Dashboard', icon: MdDashboard },
    { key: 'leads' as const, name: 'Leads', icon: MdPeople },
    { key: 'inventory' as const, name: 'Inventory', icon: MdApartment },
    { key: 'sites' as const, name: 'Site Operations', icon: MdConstruction },
    { key: 'account' as const, name: 'My Account', icon: MdAccountCircle },
  ];
  return (
    <main className="min-h-screen bg-background-100 text-navy-700 dark:bg-background-900 dark:text-white">
      <aside className={`fixed left-0 top-0 z-40 flex h-dvh flex-col overflow-hidden bg-white pb-5 shadow-2xl transition-all duration-300 dark:bg-navy-800 ${collapsed ? 'w-20' : 'w-[288px] max-md:w-20'}`}>
        <button onClick={() => setCollapsed(!collapsed)} className="absolute -right-3 top-6 flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-white shadow-md" aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}><MdMenu /></button>
        <div className="mt-12 flex items-center justify-center text-[26px] font-bold uppercase">
          {collapsed ? 'GW' : <>GETWEB<span className="font-medium text-[#C9A24A]">CRM</span></>}
        </div>
        <div className="mx-7 mt-12 h-px bg-gray-200 dark:bg-white/20" />
        <nav className="mt-5 space-y-1 px-3">
            {tabs.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  title={collapsed ? item.name : undefined}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-semibold transition-colors ${
                    tab === item.key
                      ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-navy-700'
                  }`}
                >
                  <Icon className="text-lg" />
                  {!collapsed && item.name}
                </button>
              );
            })}
          <button onClick={request} title={collapsed ? 'Subscribe to unlock' : undefined} className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-bold text-white hover:bg-brand-600"><MdLockOutline /> {!collapsed && 'Subscribe'}</button>
        </nav>
        <div className="mt-auto px-3">
          {!collapsed && <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Account</p>}
          <button onClick={request} title={collapsed ? 'Business details' : undefined} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-navy-700"><MdBusiness className="text-lg" /> {!collapsed && 'Business details'}</button>
          <form action={signOut}><input type="hidden" name="scope" value="login" /><button title={collapsed ? 'Sign out' : undefined} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-navy-700"><MdLogout className="text-lg" /> {!collapsed && 'Sign out'}</button></form>
        </div>
      </aside>
      <div className={`min-h-screen transition-all duration-300 ${collapsed ? 'pl-20' : 'pl-[288px] max-md:pl-20'}`}>
        <div className="min-w-0 p-4 sm:p-7">
          <header className="flex flex-col gap-4 rounded-2xl border border-white bg-white/90 p-4 shadow-sm backdrop-blur dark:border-navy-700 dark:bg-navy-800 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-500">
                Workspace preview
              </p>
              <h1 className="mt-1 text-2xl font-bold">Explore your CRM</h1>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-navy-600 dark:bg-navy-900">
              <MdSearch className="text-brand-500" />
              <span className="text-sm text-gray-500">
                Search leads, phone, or property…
              </span>
            </div>
          </header>
          <div className="text-amber-950 mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">
                  You are exploring in read-only mode
                </p>
                <p className="mt-1 text-sm">
                  Browse the CRM freely. Subscribe when you are ready to add
                  leads, manage inventory, or invite your team.
                </p>
              </div>
              <button
                onClick={request}
                className="dark:text-amber-950 rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-amber-200"
              >
                View subscription
              </button>
            </div>
          </div>
          {tab === 'dashboard' && (
            <section className="mt-5">
              <div className="rounded-[24px] bg-gradient-to-br from-brand-600 to-navy-800 p-6 text-white shadow-xl">
                <p className="text-sm text-white/75">Your sales workspace</p>
                <h2 className="mt-2 text-3xl font-bold">
                  Everything starts with a lead.
                </h2>
                <p className="mt-3 max-w-xl text-sm text-white/80">
                  Keep prospects, inventory and site visits in one clear view.
                </p>
                <button
                  onClick={request}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-brand-600"
                >
                  Add your first lead <MdArrowForward />
                </button>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ['New leads', '24'],
                  ['Follow-ups today', '6'],
                  ['Site visits', '4'],
                  ['Available units', '18'],
                ].map(([label, value]) => (
                  <article
                    key={label}
                    className="rounded-2xl bg-white p-5 shadow-sm dark:bg-navy-800"
                  >
                    <p className="text-sm text-gray-500">{label}</p>
                    <p className="mt-2 text-3xl font-bold">{value}</p>
                  </article>
                ))}
              </div>
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <PreviewList
                  title="Pipeline snapshot"
                  rows={[
                    'New leads · 8',
                    'Qualified · 7',
                    'Site visits · 4',
                    'Negotiation · 5',
                  ]}
                />
                <PreviewList
                  title="Next follow-ups"
                  rows={[
                    'Aarav Sharma · Today, 4:00 PM',
                    'Priya Verma · Tomorrow, 11:30 AM',
                    'Rohan Patel · Friday, 2:00 PM',
                  ]}
                />
              </div>
            </section>
          )}
          {tab === 'leads' && (
            <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm dark:bg-navy-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-500">
                    Lead management
                  </p>
                  <h2 className="mt-1 text-2xl font-bold">Leads</h2>
                </div>
                <button
                  onClick={request}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white"
                >
                  <MdAdd /> Add lead
                </button>
              </div>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="text-gray-500">
                    <tr>
                      {['Lead', 'Interest', 'Stage', 'Action'].map((header) => (
                        <th className="border-b p-3" key={header}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sampleLeads.map((lead) => (
                      <tr
                        className="border-b border-gray-100 dark:border-navy-700"
                        key={lead.name}
                      >
                        <td className="p-3 font-semibold">{lead.name}</td>
                        <td className="p-3">{lead.interest}</td>
                        <td className="p-3">
                          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600 dark:bg-brand-500/10">
                            {lead.stage}
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={request}
                            className="font-semibold text-brand-500"
                          >
                            Update
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {tab === 'inventory' && (
            <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm dark:bg-navy-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-500">
                    Property inventory
                  </p>
                  <h2 className="mt-1 text-2xl font-bold">
                    Available inventory
                  </h2>
                </div>
                <button
                  onClick={request}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white"
                >
                  <MdAdd /> Add property
                </button>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  'Skyline Heights · A-1204',
                  'The Courtyard · B-308',
                  'Palm Residency · C-510',
                ].map((unit, index) => (
                  <article
                    className="rounded-2xl border border-gray-100 p-4 dark:border-navy-700"
                    key={unit}
                  >
                    <p className="text-emerald-600 text-xs font-semibold">
                      AVAILABLE
                    </p>
                    <h3 className="mt-2 font-bold">{unit}</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {index === 1 ? '2 BHK' : '3 BHK'} · Sample inventory
                    </p>
                    <button
                      onClick={request}
                      className="mt-4 text-sm font-semibold text-brand-500"
                    >
                      Manage unit
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}
          {tab === 'account' && <div className="mt-5"><AccountProfile email={email || ''} name={profile.full_name} phone={profile.phone} /></div>}
          {tab === 'sites' && <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm dark:bg-navy-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Construction management</p>
            <h2 className="mt-1 text-2xl font-bold">Site operations</h2>
            <p className="mt-2 text-sm text-gray-500">Track projects, daily photo reports, materials, labour, expenses, tasks and sales collections for each site.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{['Project master','Daily site reports','Material stock','Labour & contractors','Site expenses','Tasks & collections'].map(name=><div key={name} className="rounded-xl border border-gray-200 p-4 text-sm font-semibold dark:border-navy-600">{name}</div>)}</div>
            <button onClick={request} className="mt-5 rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white">Create your workspace</button>
          </section>}
        </div>
      </div>
      {subscribe && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="subscribe-title"
        >
          <section className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl dark:bg-navy-800">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
                  <MdLockOutline className="text-2xl" />
                </span>
                <h2 id="subscribe-title" className="mt-4 text-2xl font-bold">
                  Subscribe to unlock your CRM
                </h2>
              </div>
              <button
                onClick={() => setSubscribe(false)}
                className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-navy-700"
                aria-label="Close"
              >
                <MdClose />
              </button>
            </div>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">Create your business workspace first. You will then see the exact monthly plan and continue securely to Razorpay.</p>
            {plan ? <div className="mt-5 rounded-xl bg-brand-50 p-4 dark:bg-brand-500/10"><p className="font-semibold">{plan.name}</p><p className="mt-1 text-sm text-gray-600 dark:text-gray-300">₹{Number(plan.price_monthly).toLocaleString('en-IN')} / month · billed through Razorpay</p></div> : <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">The monthly plan is being prepared. You can create your workspace and subscribe once it is available.</p>}
            <ActionForm action={createWorkspace} className="mt-5">
              <input className="w-full rounded-xl border border-gray-200 p-3 dark:border-navy-600 dark:bg-navy-900" name="name" placeholder="Business / workspace name" maxLength={160} required />
              <input className="w-full rounded-xl border border-gray-200 p-3 dark:border-navy-600 dark:bg-navy-900" name="slug" placeholder="Workspace URL, e.g. acme-realty" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} required />
              <input className="w-full rounded-xl border border-gray-200 p-3 dark:border-navy-600 dark:bg-navy-900" name="email" type="email" defaultValue={email || ''} placeholder="Business email" maxLength={254} required />
              <input className="w-full rounded-xl border border-gray-200 p-3 dark:border-navy-600 dark:bg-navy-900" name="phone" type="tel" placeholder="Business phone (optional)" maxLength={40} />
              <input className="w-full rounded-xl border border-gray-200 p-3 dark:border-navy-600 dark:bg-navy-900" name="legal_name" placeholder="Legal business name (optional)" maxLength={160} />
              <Submit>Create workspace and view plan</Submit>
            </ActionForm>
          </section>
        </div>
      )}
    </main>
  );
}

function PreviewList({ title, rows }: { title: string; rows: string[] }) {
  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm dark:bg-navy-800">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div
            key={row}
            className="rounded-xl bg-gray-50 p-3 text-sm dark:bg-navy-900"
          >
            {row}
          </div>
        ))}
      </div>
    </article>
  );
}
