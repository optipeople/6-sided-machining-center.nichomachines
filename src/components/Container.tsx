import { cn } from "@/lib/cn";

type ContainerProps = {
  size?: "narrow" | "default" | "wide";
  className?: string;
  children: React.ReactNode;
};

const sizes = {
  narrow: "max-w-[var(--container-narrow)]",
  default: "max-w-[var(--container-default)]",
  wide: "max-w-[var(--container-wide)]",
} as const;

export function Container({ size = "default", className, children }: ContainerProps) {
  return (
    <div className={cn("mx-auto w-full px-6 sm:px-8 lg:px-12", sizes[size], className)}>
      {children}
    </div>
  );
}
