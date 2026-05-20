import type { Metadata } from "next";
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
    <section className="pt-10 pb-20 lg:pt-16 lg:pb-28">
      <Container size="default">
        <div className="mb-10 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/nichomachines-black.png"
            alt="NichoMachines"
            className="h-16 w-auto"
          />
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
