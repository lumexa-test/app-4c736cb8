// INTEGRATION KIT — Slack: the OAuth landing page.
//
// Registered at /slack/connected by codemod (see mount.ts::applyPage) and
// reachable by URL only — NO nav link. It is the fallback landing for the OAuth
// round trip: when the connect flow carried a returnTo, the browser goes back to
// that page instead and SlackConnectButton reads the result inline.
//
// PUBLIC on purpose (protectedRoute: false). If this were protected and the
// user's stored token had lapsed during the trip to slack.com, ProtectedRoute
// would bounce them to /login and swallow the outcome of a connection that
// actually succeeded.
//
// Do not import this from anywhere, move it, or restyle it.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { FunctionComponent } from '@/common/types';

function messageForError(code: string | null): string {
  switch (code) {
    case 'state':
    case 'expired':
      return 'That connection link expired. Start the connection again from the app.';
    case 'code':
      return 'Slack sent an incomplete response. Start the connection again.';
    case 'exchange':
      return 'We could not complete the handshake with Slack. Try connecting again.';
    case 'not_configured':
      return 'Slack is not configured for this app yet.';
    default:
      return 'Something went wrong connecting your Slack account. Try again.';
  }
}

export const SlackConnected = (): FunctionComponent => {
  const navigate = useNavigate();
  const [outcome, setOutcome] = useState<'ok' | 'denied' | 'error' | null>(null);
  const [team, setTeam] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('slack_connect');
    if (result === 'ok') {
      setOutcome('ok');
      setTeam(params.get('slack_team'));
    } else if (result === 'denied') {
      setOutcome('denied');
      setMessage('You cancelled the authorization on Slack. Nothing was connected.');
    } else if (result === 'error') {
      setOutcome('error');
      setMessage(messageForError(params.get('slack_error')));
    }
  }, []);

  return (
    <PageContainer>
      <PageHeader
        title="Slack connection"
        description="Linking your Slack workspace so this app can post on your behalf."
      />
      <Card>
        <CardContent className="space-y-4 py-6">
          {outcome === 'ok' && (
            <p className="text-sm">
              Your Slack workspace{team ? ` ${team}` : ''} is connected. Pick the channel
              you want alerts in from your settings, and the app will post there.
            </p>
          )}
          {(outcome === 'error' || outcome === 'denied') && (
            <p className="text-sm text-destructive">{message}</p>
          )}
          {outcome === null && (
            <p className="text-sm text-muted-foreground">
              Open this page from the Connect Slack button — there is nothing to show
              otherwise.
            </p>
          )}
          <Button onClick={() => navigate('/')}>Continue</Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default SlackConnected;
