import type { FunctionComponent } from '@/common/types';

const PAIR_1 = '/uploads/label-image-to-video-pair-1-747176cc.png';
const PAIR_2 = '/uploads/label-image-to-video-pair-2-b3b97eff.png';

export const ImageToVideo = (): FunctionComponent => {
  return (
    <section id="image2video" data-sec="image2video" className="bg-background">
      <div
        data-edit-id="image2video:div:0"
        className="mx-auto grid w-full max-w-[1240px] items-center gap-10 px-6 py-16 sm:px-10 sm:py-24 lg:grid-cols-[7fr_5fr] lg:gap-14"
      >
        <div data-edit-id="image2video:div:1" className="grid gap-5 lg:order-2">
          <p data-edit-id="image2video:p:2" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Image-to-Video
          </p>
          <h2 data-edit-id="image2video:h2:3" className="font-display text-3xl font-light tracking-[-0.02em] text-foreground sm:text-4xl">
            Give it one still. It gives back motion.
          </h2>
          <p data-edit-id="image2video:p:4" className="text-muted-foreground">
            Drop a product shot, a frame from a shoot, a sketch. VidSlack keeps the composition and adds the movement you
            describe — drift, parallax, condensation, wind.
          </p>
          <ul className="grid gap-2">
            <li data-edit-id="image2video:li:5" className="flex gap-3 text-muted-foreground">
              <span data-edit-id="image2video:span:6" aria-hidden="true" className="mt-2.5 h-[7px] w-[7px] shrink-0 rounded-full bg-accent" />
              <span data-edit-id="image2video:span:7">
                <b className="font-semibold text-foreground">PNG, JPG or WebP</b> up to 20 MB, any aspect.
              </span>
            </li>
            <li data-edit-id="image2video:li:8" className="flex gap-3 text-muted-foreground">
              <span data-edit-id="image2video:span:9" aria-hidden="true" className="mt-2.5 h-[7px] w-[7px] shrink-0 rounded-full bg-accent" />
              <span data-edit-id="image2video:span:10">
                <b className="font-semibold text-foreground">Composition locked</b> so packaging and type stay readable.
              </span>
            </li>
            <li data-edit-id="image2video:li:11" className="flex gap-3 text-muted-foreground">
              <span data-edit-id="image2video:span:12" aria-hidden="true" className="mt-2.5 h-[7px] w-[7px] shrink-0 rounded-full bg-accent" />
              <span data-edit-id="image2video:span:13">
                <b className="font-semibold text-foreground">Uploads deleted after 30 days</b> and never used for training.
              </span>
            </li>
          </ul>
        </div>

        <div data-edit-id="image2video:div:14" className="grid grid-cols-2 gap-4 lg:order-1">
          <figure className="min-w-0 rounded-[4px] border border-border bg-card p-2 shadow-lg">
            <div data-edit-id="image2video:div:15" className="aspect-square w-full overflow-hidden rounded-[4px] border border-border">
              <img src={PAIR_1} alt="Kombucha can source photo" loading="lazy" className="h-full w-full object-cover" />
            </div>
            <figcaption data-edit-id="image2video:figcaption:17" className="flex flex-wrap justify-between gap-2 px-1 pb-1 pt-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              <span data-edit-id="image2video:span:18">Upload</span>
              <span data-edit-id="image2video:span:19">1:1</span>
            </figcaption>
          </figure>
          <figure className="min-w-0 rounded-[4px] border border-border bg-card p-2 shadow-lg">
            <div data-edit-id="image2video:div:20" className="aspect-square w-full overflow-hidden rounded-[4px] border border-border">
              <img src={PAIR_2} alt="Motion pass first frame" loading="lazy" className="h-full w-full object-cover" />
            </div>
            <figcaption data-edit-id="image2video:figcaption:22" className="flex flex-wrap justify-between gap-2 px-1 pb-1 pt-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              <span data-edit-id="image2video:span:23">Result</span>
              <span data-edit-id="image2video:span:24">8s</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
};
