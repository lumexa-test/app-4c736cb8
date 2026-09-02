import type { FunctionComponent } from '@/common/types';

const CLIPS = [
  { src: '/uploads/label-clip-still-1-c2624e53.png', alt: 'Neon rain over a night market', caption: '“Neon rain, night market”', duration: '8s', divId: 'gallery:div:7', figId: 'gallery:figcaption:9', s1: 'gallery:span:10', s2: 'gallery:span:11' },
  { src: '/uploads/label-clip-still-2-3a11c743.png', alt: 'Paper sculpture unfolding on a seamless backdrop', caption: '“Paper sculpture unfolding”', duration: '5s', divId: 'gallery:div:12', figId: 'gallery:figcaption:14', s1: 'gallery:span:15', s2: 'gallery:span:16' },
  { src: '/uploads/label-clip-still-3-6f792b16.png', alt: 'Runner cresting a coastal ridge at sunrise', caption: '“Runner cresting a ridge”', duration: '12s', divId: 'gallery:div:17', figId: 'gallery:figcaption:19', s1: 'gallery:span:20', s2: 'gallery:span:21' },
];

export const Gallery = (): FunctionComponent => {
  return (
    <section id="gallery" data-sec="gallery" className="bg-background">
      <div data-edit-id="gallery:div:0" className="mx-auto w-full max-w-[1240px] px-6 py-16 sm:px-10 sm:py-24">
        <div data-edit-id="gallery:div:1" className="mb-10 flex flex-wrap items-end justify-between gap-5 sm:mb-16">
          <div data-edit-id="gallery:div:2">
            <p data-edit-id="gallery:p:3" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Made in VidSlack
            </p>
            <h2 data-edit-id="gallery:h2:4" className="mt-2 font-display text-3xl font-light tracking-[-0.02em] text-foreground sm:text-4xl">
              Clips that landed in a channel this week.
            </h2>
          </div>
          <p data-edit-id="gallery:p:5" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            All rendered from a prompt or a single still
          </p>
        </div>
        <div data-edit-id="gallery:div:6" className="grid gap-6 sm:grid-cols-3">
          {CLIPS.map((clip) => (
            <figure key={clip.src} className="min-w-0 rounded-[4px] border border-border bg-card p-2 shadow-lg">
              <div data-edit-id={clip.divId} className="aspect-video w-full overflow-hidden rounded-[4px] border border-border">
                <img src={clip.src} alt={clip.alt} loading="lazy" className="h-full w-full object-cover" />
              </div>
              <figcaption data-edit-id={clip.figId} className="flex flex-wrap justify-between gap-2 px-1 pb-1 pt-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                <span data-edit-id={clip.s1}>{clip.caption}</span>
                <span data-edit-id={clip.s2}>{clip.duration}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};
