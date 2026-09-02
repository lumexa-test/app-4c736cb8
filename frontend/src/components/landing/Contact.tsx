import { useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { submitLead, leadsConfigured } from '@/lib/leads';
import type { FunctionComponent } from '@/common/types';

export const Contact = (): FunctionComponent => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setSubmitting(true);
    try {
      if (leadsConfigured()) {
        const result = await submitLead({
          name,
          replyTo: email,
          fields: [
            { label: 'Name', value: name },
            { label: 'Work email', value: email },
            { label: 'What are you rendering?', value: message },
          ],
        });
        if (result.delivered) {
          toast.success('Message sent — we usually reply within one business day.');
        } else {
          toast.success('Message received.', { description: 'Notifications are paused right now, but your message was recorded.' });
        }
        setName('');
        setEmail('');
        setMessage('');
      } else {
        // No platform lead pipe configured (e.g. local dev) — fall back to a
        // real mailto so the form still does something useful.
        const body = encodeURIComponent(`${message}\n\nFrom: ${name} <${email}>`);
        window.location.href = `mailto:hello@vidslack.app?subject=${encodeURIComponent('Rolling out VidSlack')}&body=${body}`;
        toast.success('Opening your email client to send the message.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send your message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact" data-sec="contact" className="bg-background">
      <div data-edit-id="contact:div:0" className="mx-auto grid w-full max-w-[1240px] gap-10 px-6 py-16 sm:px-10 sm:py-24 lg:grid-cols-12 lg:gap-8">
        <div data-edit-id="contact:div:1" className="grid content-start gap-4 lg:col-span-5">
          <p data-edit-id="contact:p:2" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Talk to us
          </p>
          <h2 data-edit-id="contact:h2:3" className="font-display text-3xl font-light tracking-[-0.02em] text-foreground sm:text-4xl">
            Rolling this out to a whole workspace?
          </h2>
          <p data-edit-id="contact:p:4" className="text-muted-foreground">
            Tell us how many channels and roughly how many renders a month. We’ll reply with a plan, security details and an
            install link for your admin — usually within one business day.
          </p>
          <p data-edit-id="contact:p:5" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Replies from a person, not a bot
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 rounded-[4px] border border-border bg-card p-6 text-card-foreground shadow-lg lg:col-span-7">
          <Label data-edit-id="contact:label:6" htmlFor="contact-name" className="grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Name
            <Input
              id="contact-name"
              name="name"
              placeholder="Maya Oyelaran"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Label>
          <Label data-edit-id="contact:label:7" htmlFor="contact-email" className="grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Work email
            <Input
              id="contact-email"
              type="email"
              name="email"
              placeholder="you@company.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Label>
          <Label data-edit-id="contact:label:8" htmlFor="contact-message" className="grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            What are you rendering?
            <Textarea
              id="contact-message"
              name="message"
              placeholder="Vertical launch teasers for two brands, posted to three channels, ~80 clips a month."
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </Label>
          <Button data-edit-id="contact:button:9" type="submit" disabled={submitting} className="w-full text-xs font-semibold uppercase tracking-[0.08em]">
            {submitting ? 'Sending…' : 'Send message'}
          </Button>
        </form>
      </div>
    </section>
  );
};
