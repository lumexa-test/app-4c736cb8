// LANDING PAGE — a section-by-section conversion of the user-approved static
// design in design-kit/user-approved-landing.html. Navbar + footer come from
// <AppLayout> (converted from the same design) — never add another
// header/nav/footer here. Sections are full-bleed; order matches the
// approved reference exactly.
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { ChannelNotifications } from '@/components/landing/ChannelNotifications';
import { Voices } from '@/components/landing/Voices';
import { Pricing } from '@/components/landing/Pricing';
import { Faq } from '@/components/landing/Faq';
import { Contact } from '@/components/landing/Contact';
import type { FunctionComponent } from '@/common/types';

export const Landing = (): FunctionComponent => {
  return (
    <div className="overflow-x-hidden bg-background text-foreground">
      <Hero />
      <HowItWorks />
      <ChannelNotifications />
      <Voices />
      <Pricing />
      <Faq />
      <Contact />
    </div>
  );
};
