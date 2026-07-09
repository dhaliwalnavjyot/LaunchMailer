import { 
  useGetDashboard, 
  getGetDashboardQueryKey,
  CampaignSummaryStatus,
  CampaignSummaryMethod 
} from '@workspace/api-client-react';
import { 
  Users, 
  Mail, 
  MessageSquare, 
  Send, 
  ArrowUpRight,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { Link } from 'wouter';
import { format } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  loading 
}: { 
  title: string, 
  value: string | number, 
  icon: any, 
  description?: string,
  loading?: boolean 
}) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="w-4 h-4 text-primary" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24 mb-1" />
        ) : (
          <div className="text-3xl font-bold font-sans tracking-tight">{value}</div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1 font-mono">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status?: CampaignSummaryStatus }) {
  if (!status) return null;
  const styles = {
    [CampaignSummaryStatus.draft]: "bg-muted text-muted-foreground border-transparent",
    [CampaignSummaryStatus.sending]: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    [CampaignSummaryStatus.sent]: "bg-primary/20 text-primary border-primary/30",
    [CampaignSummaryStatus.failed]: "bg-destructive/20 text-destructive border-destructive/30",
  };
  
  return (
    <Badge variant="outline" className={`font-mono text-xs uppercase ${styles[status]}`}>
      {status}
    </Badge>
  );
}

function MethodBadge({ method }: { method?: CampaignSummaryMethod }) {
  if (!method) return null;
  const styles = {
    [CampaignSummaryMethod.email]: "text-blue-400",
    [CampaignSummaryMethod.whatsapp]: "text-green-400",
    [CampaignSummaryMethod.both]: "text-primary",
  };
  const labels = {
    [CampaignSummaryMethod.email]: "Email",
    [CampaignSummaryMethod.whatsapp]: "WhatsApp",
    [CampaignSummaryMethod.both]: "Email + WA",
  };
  
  return (
    <span className={`font-mono text-xs font-medium ${styles[method]}`}>
      {labels[method]}
    </span>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useGetDashboard({
    query: {
      queryKey: getGetDashboardQueryKey()
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">Hamper Queens Campaign Overview</p>
        </div>
        <Link href="/campaigns/new">
          <Button>
            <Send className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard 
          title="Total Customers" 
          value={data?.totalCustomers || 0} 
          icon={Users} 
          loading={isLoading}
        />
        <StatCard 
          title="With Email" 
          value={data?.customersWithEmail || 0} 
          icon={Mail} 
          loading={isLoading}
          description={data?.totalCustomers ? `${Math.round((data.customersWithEmail / data.totalCustomers) * 100)}% coverage` : undefined}
        />
        <StatCard 
          title="With Phone" 
          value={data?.customersWithPhone || 0} 
          icon={MessageSquare} 
          loading={isLoading}
          description={data?.totalCustomers ? `${Math.round((data.customersWithPhone / data.totalCustomers) * 100)}% coverage` : undefined}
        />
        <StatCard 
          title="Total Campaigns" 
          value={data?.totalCampaigns || 0} 
          icon={TrendingUp} 
          loading={isLoading}
        />
        <StatCard 
          title="Emails Sent" 
          value={data?.emailsSent || 0} 
          icon={Mail} 
          loading={isLoading}
        />
        <StatCard 
          title="WhatsApp Sent" 
          value={data?.whatsappSent || 0} 
          icon={MessageSquare} 
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Campaigns */}
        <Card className="xl:col-span-2 bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Campaigns</CardTitle>
              <CardDescription>Latest campaign activity</CardDescription>
            </div>
            <Link href="/campaigns">
              <Button variant="ghost" size="sm" className="font-mono text-xs">
                View All <ArrowUpRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : data?.recentCampaigns && data.recentCampaigns.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left font-mono text-xs text-muted-foreground">
                      <th className="pb-2 font-medium">Name</th>
                      <th className="pb-2 font-medium">Method</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium text-right">Recipients</th>
                      <th className="pb-2 font-medium text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.recentCampaigns.map((camp) => (
                      <tr key={camp.id} className="group hover:bg-secondary/50 transition-colors">
                        <td className="py-3 font-medium">
                          <Link href={`/campaigns/${camp.id}`} className="hover:text-primary transition-colors">
                            {camp.name}
                          </Link>
                        </td>
                        <td className="py-3"><MethodBadge method={camp.method} /></td>
                        <td className="py-3"><StatusBadge status={camp.status} /></td>
                        <td className="py-3 text-right font-mono">{camp.recipientCount || 0}</td>
                        <td className="py-3 text-right text-muted-foreground font-mono">
                          {format(new Date(camp.createdAt!), 'MMM d, yyyy')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Send className="w-8 h-8 mx-auto mb-3 opacity-20" />
                <p>No campaigns yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Uploads */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Imports</CardTitle>
              <CardDescription>Customer data uploads</CardDescription>
            </div>
            <Link href="/customers/import">
              <Button variant="ghost" size="sm" className="font-mono text-xs">
                Import <ArrowUpRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : data?.recentUploads && data.recentUploads.length > 0 ? (
              <div className="space-y-4">
                {data.recentUploads.map((upload) => (
                  <div key={upload.id} className="flex items-start justify-between p-3 rounded-md bg-secondary/30 border border-border">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 bg-secondary rounded text-muted-foreground">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{upload.filename}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {format(new Date(upload.createdAt), 'MMM d, HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold font-mono text-primary">+{upload.successCount}</div>
                      {upload.errorCount > 0 && (
                        <div className="text-xs font-mono text-destructive">{upload.errorCount} err</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileSpreadsheet className="w-8 h-8 mx-auto mb-3 opacity-20" />
                <p>No recent imports</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}