import { supabase } from "./supabaseClient";

async function functionErrorMessage(error) {
  const response = error?.context;
  if (response && typeof response.clone === "function") {
    try {
      const payload = await response.clone().json();
      if (payload?.error) return payload.error;
    } catch {
      // Fall back to the SDK message below.
    }
  }
  return error?.message || "Không thể gọi dịch vụ nhắc nợ.";
}

export async function invokeArReminder(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke("ar-reminders", {
    body: { action, ...payload },
  });
  if (error) throw new Error(await functionErrorMessage(error));
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function loadArReminderWorkspace() {
  const [customerResult, templateResult, deliveryResult] = await Promise.all([
    supabase.rpc("list_ar_reminder_customers"),
    supabase.from("ar_reminder_template").select("*").eq("template_key", "default").single(),
    supabase.from("ar_reminder_deliveries").select("id,customer_id,delivery_type,status,to_addresses,cc_addresses,subject,error_message,requested_at,completed_at,ar_customers(legal_name)").order("requested_at", { ascending: false }).limit(20),
  ]);
  if (customerResult.error) throw customerResult.error;
  if (templateResult.error) throw templateResult.error;
  if (deliveryResult.error) throw deliveryResult.error;
  return {
    customers: customerResult.data || [],
    template: templateResult.data,
    deliveries: deliveryResult.data || [],
  };
}

export async function saveArReminderTemplate(template) {
  const { data, error } = await supabase.rpc("save_ar_reminder_template", {
    p_subject_template: template.subject_template,
    p_body_vi_template: template.body_vi_template,
    p_body_en_template: template.body_en_template,
  });
  if (error) throw error;
  return data;
}

