import { redirect } from 'next/navigation';
export default function Home({ params }: { params: { orgSlug: string } }) {
  redirect(`/${params.orgSlug || 'grahsiddhi'}/dashboard`);
}
