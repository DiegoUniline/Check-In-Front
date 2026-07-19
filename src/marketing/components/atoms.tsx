import { motion, type MotionProps, useReducedMotion } from "framer-motion";
import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { photoSrcSet, photoUrl, type PhotoKey } from "@/marketing/lib/photos";

/* ─────────────────────────── Reveal ─────────────────────────── */

type RevealProps = {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "article" | "header" | "footer";
} & Omit<MotionProps, "children">;

export function Reveal({
  children,
  delay = 0,
  y = 16,
  className,
  as = "div",
  ...rest
}: RevealProps) {
  const reduced = useReducedMotion();
  const MotionTag = motion[as] as typeof motion.div;
  return (
    <MotionTag
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}

/* ─────────────────────────── Section wrappers ─────────────────────────── */

export function Section({
  children,
  className,
  id,
  as = "section",
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  as?: "section" | "div";
}) {
  const Tag = as;
  return (
    <Tag id={id} className={cn("px-6 md:px-10 lg:px-14", className)}>
      <div className="mx-auto w-full max-w-[1360px]">{children}</div>
    </Tag>
  );
}

/* ─────────────────────────── Typography atoms ─────────────────────────── */

export function SectionEyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground",
        className,
      )}
    >
      <span className="h-px w-6 bg-foreground/30" />
      {children}
    </span>
  );
}

export function DisplayHeading({
  children,
  className,
  as: Tag = "h2",
  size = "lg",
}: {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
  size?: "xl" | "lg" | "md";
}) {
  const sizes = {
    xl: "text-[42px] leading-[1.05] sm:text-[56px] md:text-[68px] lg:text-[76px]",
    lg: "text-[32px] leading-[1.08] sm:text-[42px] md:text-[52px]",
    md: "text-[26px] leading-[1.15] sm:text-[32px] md:text-[38px]",
  };
  return (
    <Tag
      className={cn(
        "font-semibold tracking-[-0.02em] text-foreground [text-wrap:balance]",
        sizes[size],
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function Lede({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "max-w-[560px] text-lg leading-[1.6] text-muted-foreground md:text-xl",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function QuietStat({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
        {value}
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

/* ─────────────────────────── Photo & Screenshot frames ─────────────────────────── */

type PhotoFrameProps = {
  photo: PhotoKey;
  alt: string;
  className?: string;
  aspect?: string;
  priority?: boolean;
  rounded?: "md" | "lg" | "xl";
  sizes?: string;
};

export const PhotoFrame = forwardRef<HTMLDivElement, PhotoFrameProps>(
  function PhotoFrame(
    {
      photo,
      alt,
      className,
      aspect = "aspect-[4/3]",
      priority = false,
      rounded = "xl",
      sizes = "(min-width: 1024px) 50vw, 100vw",
    },
    ref,
  ) {
    const radius = { md: "rounded-2xl", lg: "rounded-[22px]", xl: "rounded-[28px]" }[rounded];
    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden bg-secondary",
          radius,
          aspect,
          className,
        )}
      >
        <img
          src={photoUrl(photo, 1600)}
          srcSet={photoSrcSet(photo)}
          sizes={sizes}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          className="h-full w-full object-cover"
        />
      </div>
    );
  },
);

export function ScreenshotFrame({
  children,
  label,
  className,
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[22px] border border-border/70 bg-card shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)]",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border/60 bg-secondary/60 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
        </div>
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground">
          {label ?? "vulo.mx"}
        </span>
        <span className="h-2.5 w-2.5 opacity-0" />
      </div>
      <div className="bg-background">{children}</div>
    </div>
  );
}

/* ─────────────────────────── Divider ─────────────────────────── */

export function HairDivider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-border/70", className)} />;
}