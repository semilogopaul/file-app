import { SiteHeader } from "@/modules/landing/components/site-header";
import {
  CallToAction,
  Features,
  Hero,
  HowItWorks,
  Security,
  SiteFooter,
} from "@/modules/landing/components/landing-sections";

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      {/* Skip-link target and the start of the main landmark. */}
      <main id="main">
        <Hero />
        <Features />
        <HowItWorks />
        <Security />
        <CallToAction />
      </main>
      <SiteFooter />
    </>
  );
}
