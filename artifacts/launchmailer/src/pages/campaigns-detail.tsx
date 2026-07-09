import { useParams, Link } from 'wouter';
import { 
  useGetCampaign, 
  useRetryCampaign,
  getGetCampaignQueryKey,
  CampaignStatus,
  CampaignLogStatus
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, RefreshCw, Mail, MessageSquare, CheckCircle2, 
  AlertCircle, Clock, Eye 
} from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

function StatusBadge({ status }: { status?: CampaignStatus }) {
  if (!status) return null;
  const styles = {
    [CampaignStatus.draft]: "bg-muted text-muted-foreground border-transparent",
    [CampaignStatus.sending]: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    [CampaignStatus.sent]: "bg-primary/20 text-primary border-primary/30",
    [CampaignStatus.failed]: "bg-destructive/20 text-destructive border-destructive/30",
  };
  
  return (
    <Badge variant="outline" className={`font-mono text-xs uppercase ${styles[status]}`}>
      {status}
    </Badge>
  );
}

function LogStatusIcon({ status }: { status: CampaignLogStatus }) {
  switch (status) {
    case CampaignLogStatus.delivered:
      return <CheckCircle2 className="w-4 h-4 text-green-500" title="Delivered" />;
    case CampaignLogStatus.sent:
      return <Clock className="w-4 h-4 text-blue-400" title="Sent / En route" />;
    case CampaignLogStatus.failed:
      return <AlertCircle className="w-4 h-4 text-destructive" title="Failed" />;
    case CampaignLogStatus.opened:
      return <Eye className="w-4 h-4 text-primary" title="Opened" />;
    default:
      return null;
  }
}

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: campaign, isLoading } = useGetCampaign(id!, {
    query: {
      enabled: !!id,
      refetchInterval: (data) => 
        (data?.status === CampaignStatus.sending) ? 3000 : false
    }
  });

  const retryMutation = useRetryCampaign();

  const handleRetry = () => {
    if (!id) return;
    retryMutation.mutate({ id }, {
      onSuccess: (res) => {
        toast({ title: 'Retrying failed messages', description: `Queued ${res.queued} messages for retry.` });
        queryClient.invalidateQueries({ queryKey: getGetCampaignQueryKey(id) });
      },
      onError: (err: any) => {
        toast({ title: 'Retry failed', description: err.message, variant: 'destructive' });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold">Campaign not found</h2>
        <Link href="/campaigns"><Button className="mt-4">Back to Campaigns</Button></Link>
      </div>
    );
  }

  const successRate = campaign.recipientCount 
    ? Math.round(((campaign.successCount || 0) / campaign.recipientCount) * 100) 
    : 0;

  const emailLogs = campaign.logs?.filter(l => l.channel === 'email') || [];
  const waLogs = campaign.logs?.filter(l => l.channel === 'whatsapp') || [];

  return (
    <div className="space-y-6 flex flex-col h-full max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 shrink-0">
        <div className="flex gap-4">
          <Link href="/campaigns">
            <Button variant="ghost" size="icon" className="rounded-full shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{campaign.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <StatusBadge status={campaign.status} />
              <span className="text-muted-foreground font-mono text-xs">
                Created: {format(new Date(campaign.createdAt), 'MMM d, yyyy HH:mm')}
              </span>
            </div>
          </div>
        </div>
        
        {campaign.failedCount !== undefined && campaign.failedCount > 0 && (
          <Button variant="outline" onClick={handleRetry} disabled={retryMutation.isPending}>
            <RefreshCw className={`w-4 h-4 mr-2 ${retryMutation.isPending ? 'animate-spin' : ''}`} />
            Retry {campaign.failedCount} Failed
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground mb-1">Total Recipients</div>
            <div className="text-3xl font-bold font-mono">{campaign.recipientCount || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground mb-1">Delivered</div>
            <div className="text-3xl font-bold font-mono text-green-500">{campaign.successCount || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground mb-1">Failed</div>
            <div className="text-3xl font-bold font-mono text-destructive">{campaign.failedCount || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground mb-1">Success Rate</div>
            <div className="text-3xl font-bold font-mono text-primary">{successRate}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 bg-card border border-border rounded-lg shadow-sm flex flex-col min-h-[500px] overflow-hidden">
        <Tabs defaultValue={emailLogs.length > 0 ? "email" : "whatsapp"} className="flex flex-col h-full">
          <div className="border-b border-border px-4 py-2 shrink-0 bg-muted/20">
            <TabsList className="bg-background/50 border border-border">
              <TabsTrigger value="email" disabled={emailLogs.length === 0} className="data-[state=active]:bg-card">
                <Mail className="w-4 h-4 mr-2" /> Email Logs ({emailLogs.length})
              </TabsTrigger>
              <TabsTrigger value="whatsapp" disabled={waLogs.length === 0} className="data-[state=active]:bg-card">
                <MessageSquare className="w-4 h-4 mr-2" /> WhatsApp Logs ({waLogs.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="email" className="flex-1 m-0 overflow-auto">
            <LogTable logs={emailLogs} />
          </TabsContent>
          
          <TabsContent value="whatsapp" className="flex-1 m-0 overflow-auto">
            <LogTable logs={waLogs} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function LogTable({ logs }: { logs: any[] }) {
  if (logs.length === 0) return <div className="p-8 text-center text-muted-foreground">No logs available.</div>;

  return (
    <table className="w-full text-sm">
      <thead className="bg-muted/50 sticky top-0 z-10 backdrop-blur">
        <tr className="border-b border-border text-left font-mono text-xs text-muted-foreground uppercase tracking-wider">
          <th className="px-4 py-3 font-medium">Customer</th>
          <th className="px-4 py-3 font-medium">Contact</th>
          <th className="px-4 py-3 font-medium text-center">Status</th>
          <th className="px-4 py-3 font-medium">Error / Msg ID</th>
          <th className="px-4 py-3 font-medium text-right">Time</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {logs.map((l) => (
          <tr key={l.id} className="hover:bg-secondary/50 transition-colors">
            <td className="px-4 py-3 font-medium">{l.customerName || <span className="text-muted-foreground italic">Unknown</span>}</td>
            <td className="px-4 py-3 font-mono text-xs">{l.channel === 'email' ? l.customerEmail : l.customerPhone}</td>
            <td className="px-4 py-3">
              <div className="flex justify-center">
                <LogStatusIcon status={l.status} />
              </div>
            </td>
            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
              {l.error ? (
                <span className="text-destructive font-semibold" title={l.error}>{l.error.length > 40 ? l.error.substring(0, 40) + '...' : l.error}</span>
              ) : (
                <span className="opacity-50">{l.messageId || '-'}</span>
              )}
            </td>
            <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
              {format(new Date(l.createdAt), 'HH:mm:ss')}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}