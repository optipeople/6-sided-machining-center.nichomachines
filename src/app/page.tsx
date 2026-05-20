import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/Container";
import { DrillingCellRoiCalculator } from "@/features/drilling-cell-roi/Calculator";

export const metadata: Metadata = {
  title: "6-Side Machining Cell ROI Calculator",
  description:
    "Calculate the potential time savings and payback period of a 6-Side Machining Cell — drilling, milling and grooving in one machine.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "6-Side Machining Cell ROI Calculator — NichoMachines",
    description:
      "Estimate your annual savings and payback period for a 6-Side Machining Cell in under two minutes.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function HomePage() {
  return (
    <section className="pt-6 pb-20 lg:pt-8 lg:pb-28">
      <Container size="default">
        <div className="mb-8 flex justify-start">
          <a
            href="https://nichomachines.com/"
            className="group inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-[var(--color-ink-500)] transition-colors hover:text-[var(--color-tan-500)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-tan-500)]"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
            nichomachines.com
          </a>
        </div>
        <div className="mb-10 flex items-center justify-center">
          <a
            href="https://nichomachines.com/"
            aria-label="Back to NichoMachines.com"
            className="inline-block rounded-sm transition-opacity hover:opacity-80 focus-visible:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-tan-500)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/nichomachines-black.png"
              alt="NichoMachines"
              className="h-16 w-auto"
            />
          </a>
        </div>
        <DrillingCellRoiCalculator />
        <p
          className="mt-16 text-center text-xs tracking-wide"
          style={{ color: "#555" }}
        >
          NichoMachines · 6-Side Machining Cell ROI Estimator · For indicative purposes only
        </p>
      </Container>
    </section>
  );
}
