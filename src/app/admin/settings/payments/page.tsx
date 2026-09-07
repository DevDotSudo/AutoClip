import { createAdminClient } from "@/lib/supabase/admin";
import { PaymentMethodSettings } from "@/components/admin/payment-method-settings";
export const dynamic="force-dynamic";
export default async function PaymentSettingsPage(){const {data:methods}=await createAdminClient().from("payment_methods").select("id,name,code,description,account_name,account_number,bank_name,instructions,enabled").order("sort_order");return <><div className="page-head"><div><h1>Payment methods</h1><p>Configure manual destinations. Methods remain hidden from customers until enabled.</p></div></div><div className="settings-stack">{(methods||[]).map(method=><PaymentMethodSettings key={method.id} method={method}/>)}</div></>}
