import Link from 'next/link';
import ActionForm, { Submit } from './ActionForm';
import { Field, cardClass } from './Fields';
import { saveAccount } from 'app/account/actions';

export default function AccountProfile({ email, name, phone }: { email: string; name: string; phone: string | null }) {
  return <section className={`${cardClass} max-w-2xl`}>
    <h1 className="text-2xl font-bold">My account</h1>
    <p className="mt-2 text-sm text-gray-500">Manage the details visible to your workspace team.</p>
    <ActionForm action={saveAccount} className="mt-6">
      <Field label="Full name" name="full_name" defaultValue={name} maxLength={160} required />
      <Field label="Phone" name="phone" type="tel" defaultValue={phone || ''} maxLength={40} />
      <Field label="Sign-in email" value={email} disabled />
      <div><Submit>Save account</Submit></div>
    </ActionForm>
    <Link href="/auth/password" className="mt-6 inline-block text-sm font-semibold text-brand-500">Change password</Link>
  </section>;
}
