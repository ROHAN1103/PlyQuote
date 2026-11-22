import { ImageUp, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { useDeleteLogo, useUploadLogo } from "../hooks/useCompany";
import { logoUrl } from "../services/settingsApi";
import type { Company } from "../types";

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

export function LogoCard({ company }: { company: Company }) {
  const input = useRef<HTMLInputElement>(null);
  const upload = useUploadLogo();
  const remove = useDeleteLogo();
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const onPick = (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) return setError("Choose a PNG, JPEG or WebP image.");
    if (file.size > MAX_BYTES) return setError("That image is over 2 MB. Choose a smaller one.");
    upload.mutate(file, {
      onSuccess: () => toast.success("Logo updated."),
      onError: (e) => setError(e instanceof ApiError ? e.message : "Couldn't upload the logo."),
    });
    if (input.current) input.current.value = "";
  };

  return (
    <section aria-labelledby="logo-heading" className="rounded-lg border border-line bg-surface p-5">
      <h2 id="logo-heading" className="text-lg font-semibold">Logo</h2>
      <p className="mt-1 text-sm text-muted">Printed at the top of your quotations. PNG, JPEG or WebP, up to 2 MB.</p>

      <div className="mt-4 flex flex-wrap items-center gap-5">
        <div className="grid h-24 w-40 place-items-center rounded-md border border-dashed border-line bg-paper">
          {company.has_logo ? (
            <img src={logoUrl(company.logo_version)} alt={`${company.name} logo`} className="max-h-20 max-w-36 object-contain" />
          ) : (
            <span className="text-xs text-muted">No logo yet</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={input} id="logo-file" type="file" accept={ACCEPTED.join(",")} className="sr-only" aria-label="Logo file"
                 onChange={(e) => onPick(e.target.files?.[0])} />
          <Button type="button" variant="outline" onClick={() => input.current?.click()} disabled={upload.isPending}>
            <ImageUp /> {upload.isPending ? "Uploading…" : company.has_logo ? "Replace logo" : "Upload logo"}
          </Button>
          {company.has_logo && (
            <Button type="button" variant="ghost" onClick={() => setConfirmRemove(true)} disabled={remove.isPending}>
              <Trash2 /> Remove
            </Button>
          )}
        </div>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}

      <ConfirmDialog
        open={confirmRemove} title="Remove the logo?" description="Quotations will be generated without a logo until you upload a new one."
        confirmLabel="Remove" destructive pending={remove.isPending}
        onCancel={() => setConfirmRemove(false)}
        onConfirm={() => remove.mutate(undefined, {
          onSuccess: () => { setConfirmRemove(false); toast.success("Logo removed."); },
          onError: () => toast.error("Couldn't remove the logo."),
        })}
      />
    </section>
  );
}
