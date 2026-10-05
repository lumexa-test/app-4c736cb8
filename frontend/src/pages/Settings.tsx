import { MapPin } from 'lucide-react';
import { PageContainer } from '@/components/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { FunctionComponent } from '@/common/types';

export const Settings = (): FunctionComponent => {
  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader title="Settings" description="Admin configuration for this workspace." />

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MapPin className="size-5" /> Location &amp; weather</CardTitle>
            <CardDescription>Live location and weather are shown in the top navigation on every authenticated page.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Location is resolved from your browser and weather refreshes every 10 minutes in the top bar.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};
