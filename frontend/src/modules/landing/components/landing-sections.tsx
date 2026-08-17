import Link from "next/link";
import { Button } from "@/common/components/button";
import { Logo } from "@/common/components/logo";
import { HeroIllustration } from "@/common/components/illustrations/hero-illustration";
import {
  FolderTreeIcon,
  RestoreIcon,
  SearchIcon,
  ShareIcon,
  ShieldIcon,
  UploadIcon,
} from "./feature-icons";

/* ------------------------------------------------------------------ hero */

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Ambient wash. Sits behind content and is pointer-transparent so it
          can never intercept a click. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute -top-24 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-brand-100/60 blur-3xl" />
      </div>

      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:gap-8 lg:py-24">
        <div className="flex flex-col items-start gap-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            Files go straight to storage — never through our servers
          </span>

          <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-foreground sm:text-5xl lg:text-[3.4rem]">
            Your files, organised
            <br />
            and <span className="text-brand-500">actually private</span>.
          </h1>

          <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
            Upload, nest into folders, and share with links that expire on your
            terms. Every file is scoped to you and nobody else.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto">
                Create free account
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                Sign in
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground">
            No card required · 10MB per file · Images and PDFs
          </p>
        </div>

        <HeroIllustration className="mx-auto w-full max-w-[520px]" />
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- features */

const FEATURES = [
  {
    icon: UploadIcon,
    title: "Direct-to-storage uploads",
    body: "Files stream from your browser straight into object storage on a presigned URL. Our API only ever sees metadata.",
  },
  {
    icon: FolderTreeIcon,
    title: "Folders that nest",
    body: "Organise as deeply as you like. Breadcrumbs always show where you are, and the browser back button behaves.",
  },
  {
    icon: ShareIcon,
    title: "Links that expire",
    body: "Share a file with one click. The link works without an account and stops working when you say so.",
  },
  {
    icon: ShieldIcon,
    title: "Scoped to you",
    body: "Every query is filtered by owner at the database level, so one account can never reach another's files.",
  },
  {
    icon: SearchIcon,
    title: "Find it instantly",
    body: "Search filenames across your whole account, with results as you type.",
  },
  {
    icon: RestoreIcon,
    title: "Deletes are reversible",
    body: "Removing a file marks it hidden rather than destroying it, so an accidental delete is recoverable.",
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 border-t border-border bg-surface-muted/40">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
        <SectionHeading
          eyebrow="Features"
          title="Everything you need, nothing you don't"
          body="Built around one idea: the fewest moving parts that still keep your files safe."
        />

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="group rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-brand-300"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- how it works */

const STEPS = [
  {
    title: "Create an account",
    body: "Email and a password. That is the whole sign-up.",
  },
  {
    title: "Drop your files in",
    body: "Drag a whole batch at once and watch each one upload with its own progress bar.",
  },
  {
    title: "Organise and share",
    body: "Nest folders, rename in place, and hand out links that expire.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
        <SectionHeading
          eyebrow="How it works"
          title="Three steps, then you're done"
        />

        <ol className="mt-12 grid gap-8 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                {/* Connector, on wide screens only. Decorative. */}
                {index < STEPS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="hidden h-px flex-1 bg-gradient-to-r from-brand-200 to-transparent md:block"
                  />
                )}
              </div>
              <h3 className="text-base font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- security */

const GUARANTEES = [
  "File bytes never pass through our API — uploads and downloads go browser-to-storage on signed URLs.",
  "Share tokens are stored only as hashes, so a database leak yields no working links.",
  "Passwords are hashed with bcrypt, and sign-in reveals nothing about which emails are registered.",
  "Your session lives in an httpOnly cookie that JavaScript cannot read.",
];

export function Security() {
  return (
    <section
      id="security"
      className="scroll-mt-20 border-y border-border bg-surface-muted/40"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:items-center lg:py-24">
        <div>
          <SectionHeading
            align="left"
            eyebrow="Security"
            title="Privacy that's structural, not a promise"
            body="These aren't settings you have to find and switch on. They're how the system is built."
          />
        </div>

        <ul className="flex flex-col gap-4">
          {GUARANTEES.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="m2.5 6 2.5 2.5L9.5 4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <p className="text-sm leading-relaxed text-ink-700 dark:text-ink-300">
                {item}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- final CTA */

export function CallToAction() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
      <div className="relative overflow-hidden rounded-3xl border border-brand-200 bg-brand-50 px-6 py-14 text-center sm:px-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-200/50 blur-2xl"
        />
        <h2 className="relative text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Start storing in under a minute
        </h2>
        <p className="relative mx-auto mt-3 max-w-md text-sm text-ink-600 dark:text-ink-300">
          Free to create an account. No card, no trial timer, no upsell.
        </p>
        <div className="relative mt-7 flex justify-center">
          <Link href="/register">
            <Button size="lg">Create your account</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- footer */

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex flex-col gap-2">
          <Logo size="sm" />
          <p className="text-xs text-muted-foreground">
            A file manager that keeps its hands off your files.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="#features" className="hover:text-foreground">
                Features
              </Link>
            </li>
            <li>
              <Link href="#security" className="hover:text-foreground">
                Security
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-foreground">
                Sign in
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}

/* --------------------------------------------------------------- shared */

function SectionHeading({
  eyebrow,
  title,
  body,
  align = "center",
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly body?: string;
  readonly align?: "center" | "left";
}) {
  return (
    <div
      className={
        align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-md"
      }
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h2>
      {body && (
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          {body}
        </p>
      )}
    </div>
  );
}
