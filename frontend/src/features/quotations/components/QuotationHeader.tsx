import { useFormContext } from "react-hook-form";
import { FormField } from "@/components/forms/FormField";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { QuotationFormValues } from "../schemas/quotationSchema";
import type { EffectiveStatus } from "../types";
import { StatusBadge } from "./StatusBadge";

type Props = { number: string | null; status: EffectiveStatus };

type Field = keyof QuotationFormValues;

const Card = ({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) => (
  <section className="rounded-lg border border-line bg-surface p-5">
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {aside}
    </div>
    <div className="mt-4 space-y-4">{children}</div>
  </section>
);

/** Sections A and B: quotation information, and client / project details. */
export function QuotationHeader({ number, status }: Props) {
  const { register, formState: { errors } } = useFormContext<QuotationFormValues>();
  const err = (f: Field) => (errors[f] as { message?: string } | undefined)?.message;
  const a = (f: Field) => ({ "aria-invalid": !!errors[f], "aria-describedby": errors[f] ? `${f}-error` : undefined });

  return (
    <>
      <Card title="Quotation" aside={<StatusBadge status={status} />}>
        <p className="text-sm">
          <span className="text-muted">Number: </span>
          {number ? <span className="font-medium tabular-nums">{number}</span> : <span className="text-muted">assigned when you first save</span>}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="quotation_date" label="Quotation date" error={err("quotation_date")}>
            <Input id="quotation_date" type="date" {...a("quotation_date")} {...register("quotation_date")} />
          </FormField>
          <FormField id="valid_until" label="Valid until" error={err("valid_until")}>
            <Input id="valid_until" type="date" {...a("valid_until")} {...register("valid_until")} />
          </FormField>
        </div>
      </Card>

      <Card title="Client and project">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="client_name" label="Client name" error={err("client_name")}>
            <Input id="client_name" autoComplete="off" {...a("client_name")} {...register("client_name")} />
          </FormField>
          <FormField id="client_phone" label="Phone" optional error={err("client_phone")}>
            <Input id="client_phone" inputMode="tel" autoComplete="off" {...a("client_phone")} {...register("client_phone")} />
          </FormField>
        </div>
        <FormField id="client_email" label="Email" optional error={err("client_email")}>
          <Input id="client_email" type="email" autoComplete="off" {...a("client_email")} {...register("client_email")} />
        </FormField>
        <FormField id="client_address" label="Client address" optional error={err("client_address")}>
          <Textarea id="client_address" {...a("client_address")} {...register("client_address")} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="project_name" label="Project name" optional error={err("project_name")}>
            <Input id="project_name" placeholder="e.g. Sharma Residence" {...a("project_name")} {...register("project_name")} />
          </FormField>
          <FormField id="project_location" label="Project location" optional error={err("project_location")}>
            <Input id="project_location" {...a("project_location")} {...register("project_location")} />
          </FormField>
        </div>
      </Card>
    </>
  );
}

/** Notes, payment terms and T&C: printed on the quotation. */
export function QuotationTerms() {
  const { register, formState: { errors } } = useFormContext<QuotationFormValues>();
  const err = (f: Field) => (errors[f] as { message?: string } | undefined)?.message;
  return (
    <Card title="Notes and terms">
      <FormField id="notes" label="Notes" optional error={err("notes")} hint="Shown to the client on the quotation.">
        <Textarea id="notes" {...register("notes")} />
      </FormField>
      <FormField id="payment_terms" label="Payment terms" optional error={err("payment_terms")}>
        <Textarea id="payment_terms" {...register("payment_terms")} />
      </FormField>
      <FormField id="terms_and_conditions" label="Terms and conditions" optional error={err("terms_and_conditions")}>
        <Textarea id="terms_and_conditions" className="min-h-28" {...register("terms_and_conditions")} />
      </FormField>
    </Card>
  );
}
