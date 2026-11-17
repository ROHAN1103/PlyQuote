import { Hammer } from "lucide-react";

type Props = { title: string; phase: string; description: string };

/** Honest placeholder for modules scheduled for a later build phase. */
export function ComingSoon({ title, phase, description }: Props) {
  return (
    <section className="mx-auto max-w-xl rounded-lg border border-dashed border-line bg-surface p-10 text-center">
      <Hammer className="mx-auto size-6 text-birch-deep" aria-hidden />
      <h1 className="mt-4 text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-muted">{description}</p>
      <p className="mt-4 text-sm font-medium text-pine">Planned for {phase}</p>
    </section>
  );
}
