import Login from 'components/auth/Login';
export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return <Login scope="admin" error={(await searchParams).error} />;
}
