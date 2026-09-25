import type { FunctionComponent } from '@/common/types';

const WORKFLOW_BG = '/uploads/label-workflow-screenshot-1-edb856a8.png';

const STEPS = [
  {
    num: '01',
    title: 'Connect Slack',
    body: 'An admin links the Slack workspace via OAuth so messages and completion alerts can post to your chosen channel.',
  },
  {
    num: '02',
    title: 'Add your video key',
    body: 'The admin saves the video-generation key in Settings. Your key covers your own generation costs.',
  },
  {
    num: '03',
    title: 'Generate',
    body: 'Type a prompt or drop an image in the Video Studio and submit. Watch rendering progress live on the video page.',
  },
  {
    num: '04',
    title: 'Get alerted',
    body: 'The moment a clip finishes, VidSlack posts an alert to your selected Slack channel — no progress bar to babysit.',
  },
];

export const HowItWorks = (): FunctionComponent => {
  return (
    <section id="how" data-sec="how" className="relative overflow-hidden bg-background">
      {/* Faint workflow-screenshot backdrop — a supporting visual for this
          section, kept subtle so the hairline-rule step list stays the focus. */}
      <img
        src={WORKFLOW_BG}
        alt="Workflow screenshot"
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover opacity-[0.06]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, var(--background), color-mix(in srgb, var(--background) 92%, transparent))' }}
      />

      <div data-edit-id="how:div:0" className="relative z-10 mx-auto w-full max-w-[1240px] px-6 py-16 sm:px-10 sm:py-24">
        <div data-edit-id="how:div:1" className="mb-12 grid max-w-[34ch] gap-3 sm:mb-16">
          <p data-edit-id="how:p:2" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            How it works
          </p>
          <h2 data-edit-id="how:h2:3" className="font-display text-3xl font-light tracking-[-0.02em] text-foreground sm:text-4xl">
            Three steps, then it runs itself.
          </h2>
        </div>
        <ul className="grid gap-10 sm:grid-cols-2 sm:gap-10 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li
              key={step.num}
              data-edit-id={`how:li:${4 + i * 4}`}
              className="grid gap-3 border-t border-border pt-5"
            >
              <span data-edit-id={`how:span:${5 + i * 4}`} className="font-display text-2xl tracking-[-0.02em] text-primary">
                {step.num}
              </span>
              <h3 data-edit-id={`how:h3:${6 + i * 4}`} className="text-lg font-semibold tracking-[-0.01em] text-foreground">
                {step.title}
              </h3>
              <p data-edit-id={`how:p:${7 + i * 4}`} className="text-muted-foreground">
                {step.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
