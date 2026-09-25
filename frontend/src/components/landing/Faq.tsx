import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { FunctionComponent } from '@/common/types';

const FAQS = [
  {
    q: 'Which Slack permissions do you request?',
    a: 'Three scopes: read channel names, post messages, and upload files. We never read message history, and you can revoke access from your Slack app settings.',
    ids: { summary: 'faq:summary:5', p: 'faq:p:7' },
  },
  {
    q: 'How long does a render take?',
    a: '40–90 seconds for a 5–12 second clip at 1080p. A 4K upscale adds roughly two minutes. Queue position is shown while you wait, and the alert arrives whether the tab is open or not.',
    ids: { summary: 'faq:summary:8', p: 'faq:p:10' },
  },
  {
    q: 'Can it post to a private channel?',
    a: 'Yes, once the VidSlack app is invited to that channel. Private destinations are available on Scale.',
    ids: { summary: 'faq:summary:11', p: 'faq:p:13' },
  },
  {
    q: 'What happens to my prompts and uploads?',
    a: 'Stored for 30 days so you can re-download or re-run, then deleted. Nothing you upload or write is used to train models.',
    ids: { summary: 'faq:summary:14', p: 'faq:p:16' },
  },
  {
    q: 'Do I need a workspace admin to install it?',
    a: 'Only if your workspace requires app approval. In that case the connect flow creates a request your admin can approve in one click.',
    ids: { summary: 'faq:summary:17', p: 'faq:p:19' },
  },
  {
    q: 'Which formats come back?',
    a: 'MP4 (H.264) at 9:16, 1:1 or 16:9, up to 12 seconds, plus a JPG cover frame attached to the same message.',
    ids: { summary: 'faq:summary:20', p: 'faq:p:22' },
  },
];

export const Faq = (): FunctionComponent => {
  return (
    <section id="faq" data-sec="faq" className="bg-muted">
      <div data-edit-id="faq:div:0" className="mx-auto grid w-full max-w-[1240px] gap-10 px-6 py-16 sm:px-10 sm:py-24 lg:grid-cols-12 lg:gap-8">
        <div data-edit-id="faq:div:1" className="lg:col-span-4">
          <p data-edit-id="faq:p:2" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Questions
          </p>
          <h2 data-edit-id="faq:h2:3" className="mt-2 font-display text-3xl font-light tracking-[-0.02em] text-foreground sm:text-4xl">
            Before you connect.
          </h2>
        </div>
        <div data-edit-id="faq:div:4" className="lg:col-span-7 lg:col-start-6">
          <Accordion type="multiple" defaultValue={FAQS.map((f) => f.ids.summary)} className="w-full">
            {FAQS.map((item) => (
              <AccordionItem key={item.ids.summary} value={item.ids.summary} className="border-border">
                <AccordionTrigger data-edit-id={item.ids.summary} className="text-base font-semibold text-foreground hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent>
                  <p data-edit-id={item.ids.p} className="max-w-[62ch] text-muted-foreground">
                    {item.a}
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};
