import { Button } from '@/components/ui/button';
import type { FunctionComponent } from '@/common/types';

export const ChannelNotifications = (): FunctionComponent => {
  return (
    <section id="notify" data-sec="notify" className="bg-primary text-primary-foreground">
      <div data-edit-id="notify:div:0" className="mx-auto grid w-full max-w-[1240px] items-center gap-10 px-6 py-16 sm:px-10 sm:py-24 lg:grid-cols-[5fr_6fr] lg:gap-14">
        <div data-edit-id="notify:div:1" className="grid gap-5">
          <p data-edit-id="notify:p:2" className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground/70">
            Slack Alerts
          </p>
          <h2 data-edit-id="notify:h2:3" className="font-display text-3xl font-light tracking-[-0.02em] text-primary-foreground sm:text-4xl">
            The render finds you, not the other way round.
          </h2>
          <p data-edit-id="notify:p:4" className="text-primary-foreground/90">
            Pick a channel per project — #social-drops for campaign cuts, a private channel for client work. The moment a
            clip finishes, the file, its prompt and its specs are posted there.
          </p>
          <div data-edit-id="notify:div:5" className="flex flex-wrap gap-3">
            <Button
              data-edit-id="notify:a:6"
              asChild
              variant="outline"
              size="lg"
              className="w-full border-primary-foreground/55 bg-transparent text-xs font-semibold uppercase tracking-[0.08em] text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground sm:w-auto"
            >
              <a href="#contact">Set up a destination channel</a>
            </Button>
          </div>
        </div>

        <div data-edit-id="notify:div:7" className="grid gap-4 rounded-[4px] border border-primary-foreground/30 bg-primary-foreground/10 p-5">
          <div data-edit-id="notify:div:8" className="flex flex-wrap items-center gap-3">
            <span data-edit-id="notify:span:9" className="rounded-full bg-primary-foreground/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-primary-foreground">
              #social-drops
            </span>
            <span data-edit-id="notify:span:10" className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground/70">
              Alert sent 10:15
            </span>
          </div>
          <p data-edit-id="notify:p:11" className="text-primary-foreground">
            Render complete — “Neon rain over a night market”. 8s · 1080p · 9:16.
          </p>
          <div data-edit-id="notify:div:12" className="h-1.5 overflow-hidden rounded-full bg-primary-foreground/25">
            <i className="block h-full w-full bg-primary-foreground" />
          </div>
          <p data-edit-id="notify:p:13" className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground/70">
            Queued 10:13 · rendered in 47s · posted automatically
          </p>
        </div>
      </div>
    </section>
  );
};
