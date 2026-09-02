import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { FunctionComponent } from '@/common/types';

export const Pricing = (): FunctionComponent => {
  return (
    <section id="pricing" data-sec="pricing" className="bg-background">
      <div data-edit-id="pricing:div:0" className="mx-auto w-full max-w-[1240px] px-6 py-16 sm:px-10 sm:py-24">
        <div data-edit-id="pricing:div:1" className="mb-10 grid max-w-[36ch] gap-3 sm:mb-16">
          <p data-edit-id="pricing:p:2" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Pricing
          </p>
          <h2 data-edit-id="pricing:h2:3" className="font-display text-3xl font-light tracking-[-0.02em] text-foreground sm:text-4xl">
            Pay for renders, not seats.
          </h2>
          <p data-edit-id="pricing:p:4" className="text-muted-foreground">
            Every plan includes the Slack connection, channel notifications and unlimited teammates in the workspace.
          </p>
        </div>

        <div data-edit-id="pricing:div:5" className="grid gap-6 sm:grid-cols-3">
          {/* Trial */}
          <div data-edit-id="pricing:div:6" className="grid content-start gap-4 rounded-[4px] border border-border bg-card p-6 text-card-foreground shadow-sm">
            <span data-edit-id="pricing:span:7" className="w-fit rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-secondary-foreground">
              Trial
            </span>
            <p data-edit-id="pricing:p:8" className="font-display text-2xl tracking-[-0.03em] text-foreground">
              $0<small className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"> / forever</small>
            </p>
            <ul className="grid gap-2 text-muted-foreground">
              <li data-edit-id="pricing:li:9">5 renders per month</li>
              <li data-edit-id="pricing:li:10">720p, up to 5 seconds</li>
              <li data-edit-id="pricing:li:11">One notification channel</li>
              <li data-edit-id="pricing:li:12">Text to video</li>
            </ul>
            <Button data-edit-id="pricing:a:13" asChild variant="outline" className="w-full text-xs font-semibold uppercase tracking-[0.08em]">
              <Link to="/signup">Start free</Link>
            </Button>
          </div>

          {/* Studio — highlighted */}
          <div
            data-edit-id="pricing:div:14"
            className={cn('grid content-start gap-4 rounded-[4px] border-2 border-primary bg-card p-6 text-card-foreground shadow-lg')}
          >
            <span data-edit-id="pricing:span:15" className="w-fit rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-secondary-foreground">
              Studio
            </span>
            <p data-edit-id="pricing:p:16" className="font-display text-2xl tracking-[-0.03em] text-foreground">
              $39<small className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"> / month</small>
            </p>
            <ul className="grid gap-2 text-muted-foreground">
              <li data-edit-id="pricing:li:17">60 renders per month</li>
              <li data-edit-id="pricing:li:18">1080p, up to 12 seconds</li>
              <li data-edit-id="pricing:li:19">Three notification channels</li>
              <li data-edit-id="pricing:li:20">Text and image to video</li>
            </ul>
            <Button data-edit-id="pricing:a:21" asChild className="w-full text-xs font-semibold uppercase tracking-[0.08em]">
              <Link to="/signup">Connect workspace</Link>
            </Button>
          </div>

          {/* Scale */}
          <div data-edit-id="pricing:div:22" className="grid content-start gap-4 rounded-[4px] border border-border bg-card p-6 text-card-foreground shadow-sm">
            <span data-edit-id="pricing:span:23" className="w-fit rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-secondary-foreground">
              Scale
            </span>
            <p data-edit-id="pricing:p:24" className="font-display text-2xl tracking-[-0.03em] text-foreground">
              $149<small className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"> / month</small>
            </p>
            <ul className="grid gap-2 text-muted-foreground">
              <li data-edit-id="pricing:li:25">300 renders per month</li>
              <li data-edit-id="pricing:li:26">4K upscale, priority queue</li>
              <li data-edit-id="pricing:li:27">Unlimited channels, private included</li>
              <li data-edit-id="pricing:li:28">90-day render archive</li>
            </ul>
            <Button data-edit-id="pricing:a:29" asChild variant="outline" className="w-full text-xs font-semibold uppercase tracking-[0.08em]">
              <a href="#contact">Talk to us</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
