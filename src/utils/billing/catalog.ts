import 'server-only';
import { createAdminClient } from 'utils/supabase/admin';

// Authorize the workspace administrator before reading the shared plan catalog.
export async function getMonthlyPlan() {
  const result = await createAdminClient()
    .from('plans')
    .select('id,name,price_monthly,currency_code,is_active,razorpay_plan_id')
    .eq('is_active', true)
    .eq('currency_code', 'INR')
    .order('name')
    .limit(1)
    .maybeSingle();
  if (result.error) throw new Error('Unable to load the subscription plan');
  return result.data;
}
