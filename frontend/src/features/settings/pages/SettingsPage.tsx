import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/forms/FormField";
import { Spinner } from "@/components/feedback/Spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { LogoCard } from "../components/LogoCard";
import { useCompany, useUpdateCompany } from "../hooks/useCompany";
import { settingsFormSchema, toFormValues, toPayload, type SettingsFormValues } from "../schemas/settingsSchema";

const Section = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <section className="rounded-lg border border-line bg-surface p-5">
    <h2 className="text-lg font-semibold">{title}</h2>
    {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    <div className="mt-4 space-y-4">{children}</div>
  </section>
);

const Check = ({ children, ...props }: React.ComponentProps<"input"> & { children: React.ReactNode }) => (
  <label className="flex items-start gap-2 text-sm">
    <input type="checkbox" className="mt-0.5 size-4 accent-pine" {...props} />
    <span>{children}</span>
  </label>
);

export default function SettingsPage() {
  const { data: company, isPending, isError, refetch } = useCompany();
  const save = useUpdateCompany();
  const [formError, setFormError] = useState<string | null>(null);

  const { register, handleSubmit, reset, setError, watch, formState: { errors, isDirty } } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
  });

  useEffect(() => { if (company) reset(toFormValues(company)); }, [company, reset]);

  if (isPending) return <div className="py-16"><Spinner label="Loading settings" /></div>;
  if (isError || !company) {
    return (
      <div role="alert" className="mx-auto max-w-xl rounded-lg border border-danger/30 bg-danger-soft p-5 text-sm text-danger">
        <p>Couldn't load your settings.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>Try again</Button>
      </div>
    );
  }

  const gstEnabled = watch("gst_enabled");
  const err = (k: keyof SettingsFormValues) => errors[k]?.message;
  const a = (k: keyof SettingsFormValues) => ({ "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${k}-error` : undefined });

  const onSubmit = (values: SettingsFormValues) => {
    setFormError(null);
    save.mutate(toPayload(values), {
      onSuccess: () => toast.success("Settings saved."),
      onError: (e) => {
        if (!(e instanceof ApiError)) return setFormError("Something went wrong. Please try again.");
        const direct = e.fields.find((f) => f.field in toFormValues(company));
        if (direct) setError(direct.field as keyof SettingsFormValues, { message: direct.message });
        else setFormError(e.fields[0]?.message ?? e.message);
      },
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted">These details fill in new quotations automatically. You can still change them on each quotation.</p>
      </div>

      <LogoCard company={company} />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {formError && <div role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</div>}

        <Section title="Company details">
          <FormField id="name" label="Company name" error={err("name")}><Input id="name" {...a("name")} {...register("name")} /></FormField>
          <FormField id="address" label="Address" optional error={err("address")}><Textarea id="address" {...a("address")} {...register("address")} /></FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="phone" label="Phone" optional error={err("phone")}><Input id="phone" inputMode="tel" {...a("phone")} {...register("phone")} /></FormField>
            <FormField id="email" label="Email" optional error={err("email")}><Input id="email" type="email" {...a("email")} {...register("email")} /></FormField>
          </div>
          <FormField id="gstin" label="GSTIN" optional error={err("gstin")} hint="Printed on quotations when provided.">
            <Input id="gstin" autoCapitalize="characters" maxLength={15} {...a("gstin")} {...register("gstin")} />
          </FormField>
        </Section>

        <Section title="Tax (GST)" hint="Off by default. Turn it on and set the rate you charge; nothing is assumed for you.">
          <Check {...register("gst_enabled")}>Charge GST on quotations</Check>
          {gstEnabled && (
            <>
              <div className="max-w-[12rem]">
                <FormField id="gst_rate_percent" label="GST rate (%)" error={err("gst_rate_percent")}>
                  <Input id="gst_rate_percent" inputMode="decimal" placeholder="e.g. 18" {...a("gst_rate_percent")} {...register("gst_rate_percent")} />
                </FormField>
              </div>
              <Check {...register("prices_include_tax")}>Prices I enter already include GST</Check>
            </>
          )}
        </Section>

        <Section title="Quotation defaults">
          <div className="max-w-[12rem]">
            <FormField id="quotation_validity_days" label="Valid for (days)" error={err("quotation_validity_days")}>
              <Input id="quotation_validity_days" inputMode="numeric" {...a("quotation_validity_days")} {...register("quotation_validity_days")} />
            </FormField>
          </div>
          <FormField id="payment_terms" label="Payment terms" optional error={err("payment_terms")}>
            <Textarea id="payment_terms" placeholder="e.g. 50% advance, 40% on delivery, 10% after installation" {...a("payment_terms")} {...register("payment_terms")} />
          </FormField>
          <FormField id="terms_and_conditions" label="Terms and conditions" optional error={err("terms_and_conditions")}>
            <Textarea id="terms_and_conditions" className="min-h-32" {...a("terms_and_conditions")} {...register("terms_and_conditions")} />
          </FormField>
          <FormField id="document_footer" label="Document footer" optional error={err("document_footer")}>
            <Input id="document_footer" {...a("document_footer")} {...register("document_footer")} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="signature_name" label="Signatory name" optional error={err("signature_name")}><Input id="signature_name" {...a("signature_name")} {...register("signature_name")} /></FormField>
            <FormField id="signature_designation" label="Designation" optional error={err("signature_designation")}><Input id="signature_designation" {...a("signature_designation")} {...register("signature_designation")} /></FormField>
          </div>
          <Check {...register("show_material_breakdown_to_customer")}>Show the material-by-material breakdown on customer quotations</Check>
        </Section>

        <div className="flex items-center justify-end gap-3">
          {isDirty && <span className="text-sm text-muted">You have unsaved changes</span>}
          <Button type="submit" disabled={save.isPending || !isDirty}>{save.isPending ? "Saving…" : "Save changes"}</Button>
        </div>
      </form>
    </div>
  );
}
