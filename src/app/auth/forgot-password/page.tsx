import Default from 'components/auth/variants/DefaultAuthLayout';
import ActionForm, { Submit } from 'components/crm/ActionForm';
import { Field } from 'components/crm/Fields';
import { requestPasswordReset } from '../actions';
import Link from 'next/link';
export default async function ForgotPassword({searchParams}:{searchParams:Promise<{error?:string}>}) {
  const error = (await searchParams).error;
  return <Default maincard={<div className="my-16 w-full max-w-[420px] px-2"><h1 className="mb-4 text-3xl font-bold">Reset your CRM password</h1><p className="mb-6 text-sm">Enter your account email. Open the recovery link in this browser to choose a new CRM password.</p>{error && <p role="alert" className="mb-4 text-red-600">The recovery link expired or is invalid. Request a new link.</p>}<ActionForm action={requestPasswordReset}><Field label="Email" name="email" type="email" autoComplete="email" required maxLength={254}/><Submit>Send recovery link</Submit></ActionForm><Link href="/login" className="mt-5 block text-brand-500">Back to sign in</Link></div>}/>;
}
