import { Link } from 'wouter';
import { 
  useListCampaigns, 
  useDeleteCampaign, 
  getListCampaignsQueryKey,
  CampaignStatus,
  CampaignMethod
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  Send, Plus, Trash2, MoreHorizontal, MessageSquare, Mail, AlertCircle, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { useState } from 'react';

function StatusBadge({ status }: { status?: CampaignStatus }) {
  if (!status) return null;
  const styles = {
    [CampaignStatus.draft]: "bg-muted text-muted-foreground border-transparent",
    [CampaignStatus.sending]: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    [CampaignStatus.sent]: "bg-primary/20 text-primary border-primary/30",
    [CampaignStatus.failed]: "bg-destructive/20 text-destructive border-destructive/30",
  };
  
  return (
    <Badge variant="outline" className={`font-mono text-[10px] px-1.5 py-0 uppercase ${styles[status]}`}>
      {status}
    </Badge>
  );
}

export default function Campaigns() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: campaigns, isLoading } = useListCampaigns();
  const deleteMutation = useDeleteCampaign();
  
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = () => {
    if (!deletingId) return;
    deleteMutation.mutate({ id: deletingId }, {
      onSuccess: () => {
        toast({ title: 'Campaign deleted' });
        setDeletingId(null);
        queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
      }
    });
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">
            Launch and track your marketing messages
          </p>
        </div>
        <Link href="/campaigns/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </Link>
      </div>

      <div className="flex-1 bg-card border border-border rounded-lg shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0 z-10 backdrop-blur">
              <tr className="border-b border-border text-left font-mono text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Campaign</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Recipients</th>
                <th className="px-4 py-3 font-medium text-right">Success</th>
                <th className="px-4 py-3 font-medium text-right">Date</th>
                <th className="px-4 py-3 font-medium text-right w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-48" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-4 py-4 text-right"><Skeleton className="h-4 w-8 ml-auto" /></td>
                    <td className="px-4 py-4 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    <td className="px-4 py-4 text-right"><Skeleton className="h-4 w-24 ml-auto" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : campaigns?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                    <Send className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <h3 className="text-lg font-medium text-foreground mb-1">No campaigns yet</h3>
                    <p className="mb-4">Create your first campaign to reach your customers.</p>
                    <Link href="/campaigns/new">
                      <Button variant="outline">Create Campaign</Button>
                    </Link>
                  </td>
                </tr>
              ) : (
                campaigns?.map((c) => {
                  const successRate = c.recipientCount ? Math.round(((c.successCount || 0) / c.recipientCount) * 100) : 0;
                  
                  return (
                    <tr key={c.id} className="hover:bg-secondary/50 transition-colors group">
                      <td className="px-4 py-3">
                        <Link href={`/campaigns/${c.id}`} className="font-medium text-foreground hover:text-primary transition-colors inline-block">
                          {c.name}
                        </Link>
                        {c.subject && <div className="text-xs text-muted-foreground mt-0.5 font-mono truncate max-w-[300px]" title={c.subject}>Subj: {c.subject}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {c.method === CampaignMethod.email || c.method === CampaignMethod.both ? (
                            <Mail className="w-4 h-4 text-blue-400" />
                          ) : null}
                          {c.method === CampaignMethod.whatsapp || c.method === CampaignMethod.both ? (
                            <MessageSquare className="w-4 h-4 text-green-400" />
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {c.recipientCount || 0}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {c.status === CampaignStatus.sent || c.status === CampaignStatus.sending ? (
                          <div className="flex flex-col items-end">
                            <span className="font-mono">{successRate}%</span>
                            <div className="w-16 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${successRate}%` }} />
                            </div>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(c.createdAt), 'MMM d, yyyy')}
                        <br/>
                        {format(new Date(c.createdAt), 'HH:mm')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => setDeletingId(c.id)}>
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the campaign and all its logs. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}