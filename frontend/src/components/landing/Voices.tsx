import type { FunctionComponent } from '@/common/types';

const VOICES = [
  {
    quote:
      '“I brief the clip in the same place I brief the team. The file shows up in #social-drops before the standup ends.”',
    avatar: '/uploads/label-customer-portrait-1-00bd428e.png',
    name: 'Maya Oyelaran',
    role: 'Social lead, Fernhill Kombucha',
    ids: { blockquote: 'voices:blockquote:4', div: 'voices:div:5', avatar: 'voices:div:6', p: 'voices:p:7' },
  },
  {
    quote:
      '“Animating a still kept our packaging type sharp, which no other tool we tried managed. Client channel gets the cut directly.”',
    avatar: '/uploads/label-customer-portrait-2-a52ab1b4.png',
    name: 'Deniz Karaca',
    role: 'Founder, Twelve-Point Studio',
    ids: { blockquote: 'voices:blockquote:8', div: 'voices:div:9', avatar: 'voices:div:10', p: 'voices:p:11' },
  },
  {
    quote: '“Sixty renders a month, one channel, zero chasing. The prompt stays attached, so we can re-run a winner.”',
    avatar: '/uploads/label-customer-portrait-3-182ecda1.png',
    name: 'Rob Sandvik',
    role: 'Product marketing, Kestrel Analytics',
    ids: { blockquote: 'voices:blockquote:12', div: 'voices:div:13', avatar: 'voices:div:14', p: 'voices:p:15' },
  },
];

export const Voices = (): FunctionComponent => {
  return (
    <section id="voices" data-sec="voices" className="bg-muted">
      <div data-edit-id="voices:div:0" className="mx-auto w-full max-w-[1240px] px-6 py-16 sm:px-10 sm:py-24">
        <p data-edit-id="voices:p:1" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Teams using it
        </p>
        <h2 data-edit-id="voices:h2:2" className="mt-2 font-display text-3xl font-light tracking-[-0.02em] text-foreground sm:text-4xl">
          Fewer tabs, faster cuts.
        </h2>
        <div data-edit-id="voices:div:3" className="mt-10 grid gap-10 sm:mt-16 sm:grid-cols-3">
          {VOICES.map((v) => (
            <figure key={v.name} className="min-w-0 grid gap-4 border-t border-border pt-5">
              <blockquote data-edit-id={v.ids.blockquote} className="text-lg leading-snug tracking-[-0.01em] text-foreground">
                {v.quote}
              </blockquote>
              <div data-edit-id={v.ids.div} className="flex items-center gap-3">
                <div data-edit-id={v.ids.avatar} className="h-[52px] w-[52px] shrink-0 overflow-hidden rounded-full border border-border">
                  <img src={v.avatar} alt={v.name} loading="lazy" className="h-full w-full object-cover" />
                </div>
                <p data-edit-id={v.ids.p} className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  <b className="block tracking-[0.04em] text-foreground">{v.name}</b>
                  {v.role}
                </p>
              </div>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};
