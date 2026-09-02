import type { FunctionComponent } from '@/common/types';

const CLIP_STILL = '/uploads/label-generated-clip-still-9dfe3f81.png';

export const TextToVideo = (): FunctionComponent => {
  return (
    <section id="text2video" data-sec="text2video" className="bg-muted">
      <div data-edit-id="text2video:div:0" className="mx-auto grid w-full max-w-[1240px] items-center gap-10 px-6 py-16 sm:px-10 sm:py-24 lg:grid-cols-[5fr_7fr] lg:gap-14">
        <div data-edit-id="text2video:div:1" className="grid gap-5">
          <p data-edit-id="text2video:p:2" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Text to video
          </p>
          <h2 data-edit-id="text2video:h2:3" className="font-display text-3xl font-light tracking-[-0.02em] text-foreground sm:text-4xl">
            One line in. A finished clip out.
          </h2>
          <p data-edit-id="text2video:p:4" className="text-muted-foreground">
            Write the scene the way you’d brief a camera operator — subject, movement, light. VidSlack returns a graded MP4
            with audio-safe silence, ready to cut or post as it is.
          </p>
          <ul className="grid gap-2">
            <li data-edit-id="text2video:li:5" className="flex gap-3 text-muted-foreground">
              <span data-edit-id="text2video:span:6" aria-hidden="true" className="mt-2.5 h-[7px] w-[7px] shrink-0 rounded-full bg-accent" />
              <span data-edit-id="text2video:span:7">
                <b className="font-semibold text-foreground">5, 8 or 12 seconds</b> at 9:16, 1:1 or 16:9.
              </span>
            </li>
            <li data-edit-id="text2video:li:8" className="flex gap-3 text-muted-foreground">
              <span data-edit-id="text2video:span:9" aria-hidden="true" className="mt-2.5 h-[7px] w-[7px] shrink-0 rounded-full bg-accent" />
              <span data-edit-id="text2video:span:10">
                <b className="font-semibold text-foreground">Prompt history</b> stays attached to every file, so a good shot
                is repeatable.
              </span>
            </li>
            <li data-edit-id="text2video:li:11" className="flex gap-3 text-muted-foreground">
              <span data-edit-id="text2video:span:12" aria-hidden="true" className="mt-2.5 h-[7px] w-[7px] shrink-0 rounded-full bg-accent" />
              <span data-edit-id="text2video:span:13">
                <b className="font-semibold text-foreground">Queue position visible</b> while it renders — typically 40–90
                seconds at 1080p.
              </span>
            </li>
          </ul>
        </div>

        <figure className="rounded-[4px] border border-border bg-card p-2 shadow-lg">
          <div data-edit-id="text2video:div:14" className="aspect-video w-full overflow-hidden rounded-[4px] border border-border">
            <img
              src={CLIP_STILL}
              alt="Generated clip still"
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
          <figcaption data-edit-id="text2video:figcaption:16" className="flex flex-wrap justify-between gap-3 px-2 pb-1 pt-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            <span data-edit-id="text2video:span:17">“Slow drift over a berry orchard at dusk”</span>
            <span data-edit-id="text2video:span:18">12s · 1080p</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
};
