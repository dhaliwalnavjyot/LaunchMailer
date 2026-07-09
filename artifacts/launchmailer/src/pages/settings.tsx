import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  useGetSettings, 
  useUpdateSettings,
  getGetSettingsQueryKey 
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Settings as SettingsIcon, 
  Mail, 
  MessageSquare, 
  Sparkles, 
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

// Using a generic schema since fields are updated per section
const schema = z.object({
  resendApiKey: z.string().optional(),
  senderEmail: z.string().email().optional().or(z.literal('')),
  senderName: z.string().optional(),
  
  twilioSid: z.string().optional(),
  twilioAuthToken: z.string().optional(),
  twilioWhatsappNumber: z.string().optional(),
  
  claudeApiKey: z.string().optional(),
  
  companyName: z.string().optional(),
  companyLogoUrl: z.string().url().optional().or(z.literal(''))
});

type FormValues = z.infer<typeof schema>;

function StatusBadge({ configured }: { configured?: boolean }) {
  if (configured) {
    return (
      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-mono text-xs">
        <CheckCircle2 className="w-3 h-3 mr-1" /> Configured
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 font-mono text-xs">
      <AlertCircle className="w-3 h-3 mr-1" /> Missing
    </Badge>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: settings, isLoading } = useGetSettings({
    query: { queryKey: getGetSettingsQueryKey() }
  });
  const updateMutation = useUpdateSettings();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      senderEmail: settings?.senderEmail || '',
      senderName: settings?.senderName || '',
      twilioWhatsappNumber: settings?.twilioWhatsappNumber || '',
      companyName: settings?.companyName || '',
      companyLogoUrl: settings?.companyLogoUrl || '',
    }
  });

  const handleSave = (sectionData: Partial<FormValues>, sectionName: string) => {
    // Only send the fields that have values (don't overwrite secrets with empty strings unless explicitly clearing)
    const payload = Object.fromEntries(
      Object.entries(sectionData).filter(([_, v]) => v !== undefined && v !== '')
    );
    
    // If it's a structural field we want to clear, handle it (like logo url)
    if (sectionData.companyLogoUrl === '') payload.companyLogoUrl = '';
    if (sectionData.senderEmail === '') payload.senderEmail = '';

    updateMutation.mutate({ data: payload }, {
      onSuccess: () => {
        toast({ title: `${sectionName} Saved` });
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        // Clear secret inputs after save so they don't linger in DOM
        form.setValue('resendApiKey', '');
        form.setValue('twilioSid', '');
        form.setValue('twilioAuthToken', '');
        form.setValue('claudeApiKey', '');
      },
      onError: (err: any) => {
        toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">Configure integrations and branding</p>
      </div>

      <Form {...form}>
        <div className="space-y-8">
          
          {/* Email Settings */}
          <Card className="border-border shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/10 border-b border-border pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-400" /> Resend Integration
                </CardTitle>
                <CardDescription className="mt-1">For delivering email campaigns</CardDescription>
              </div>
              <StatusBadge configured={settings?.resendConfigured} />
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="senderName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sender Name</FormLabel>
                    <FormControl><Input placeholder="Hamper Queens" {...field} value={field.value || ''} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="senderEmail" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sender Email</FormLabel>
                    <FormControl><Input placeholder="hello@hamperqueens.com" {...field} value={field.value || ''} /></FormControl>
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="resendApiKey" render={({ field }) => (
                <FormItem>
                  <FormLabel>Resend API Key</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder={settings?.resendConfigured ? "•••••••••••••••••••• (Configured)" : "re_..."} {...field} value={field.value || ''} />
                  </FormControl>
                  <FormDescription>Leave blank to keep existing key</FormDescription>
                </FormItem>
              )} />
            </CardContent>
            <CardFooter className="bg-muted/5 border-t border-border pt-4">
              <Button 
                onClick={() => handleSave({ 
                  resendApiKey: form.getValues('resendApiKey'),
                  senderName: form.getValues('senderName'),
                  senderEmail: form.getValues('senderEmail')
                }, 'Email Settings')}
                disabled={updateMutation.isPending}
              >
                Save Email Settings
              </Button>
            </CardFooter>
          </Card>

          {/* WhatsApp Settings */}
          <Card className="border-border shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/10 border-b border-border pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-green-400" /> Twilio WhatsApp
                </CardTitle>
                <CardDescription className="mt-1">For delivering WhatsApp messages</CardDescription>
              </div>
              <StatusBadge configured={settings?.twilioConfigured} />
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <FormField control={form.control} name="twilioWhatsappNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp Sender Number</FormLabel>
                  <FormControl><Input placeholder="whatsapp:+1234567890" className="font-mono" {...field} value={field.value || ''} /></FormControl>
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="twilioSid" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account SID</FormLabel>
                    <FormControl><Input type="password" placeholder={settings?.twilioConfigured ? "•••••••• (Configured)" : ""} {...field} value={field.value || ''} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="twilioAuthToken" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Auth Token</FormLabel>
                    <FormControl><Input type="password" placeholder={settings?.twilioConfigured ? "•••••••• (Configured)" : ""} {...field} value={field.value || ''} /></FormControl>
                  </FormItem>
                )} />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/5 border-t border-border pt-4">
              <Button 
                onClick={() => handleSave({ 
                  twilioSid: form.getValues('twilioSid'),
                  twilioAuthToken: form.getValues('twilioAuthToken'),
                  twilioWhatsappNumber: form.getValues('twilioWhatsappNumber')
                }, 'WhatsApp Settings')}
                disabled={updateMutation.isPending}
              >
                Save WhatsApp Settings
              </Button>
            </CardFooter>
          </Card>

          {/* AI Settings */}
          <Card className="border-border shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/10 border-b border-border pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" /> Anthropic Claude
                </CardTitle>
                <CardDescription className="mt-1">For generating campaign copy</CardDescription>
              </div>
              <StatusBadge configured={settings?.claudeConfigured} />
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <FormField control={form.control} name="claudeApiKey" render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl><Input type="password" placeholder={settings?.claudeConfigured ? "•••••••••••••••••••• (Configured)" : "sk-ant-..."} {...field} value={field.value || ''} /></FormControl>
                  <FormDescription>Leave blank to keep existing key</FormDescription>
                </FormItem>
              )} />
            </CardContent>
            <CardFooter className="bg-muted/5 border-t border-border pt-4">
              <Button 
                onClick={() => handleSave({ claudeApiKey: form.getValues('claudeApiKey') }, 'AI Settings')}
                disabled={updateMutation.isPending}
              >
                Save AI Settings
              </Button>
            </CardFooter>
          </Card>

          {/* Branding Settings */}
          <Card className="border-border shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/10 border-b border-border pb-4">
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-muted-foreground" /> Branding
              </CardTitle>
              <CardDescription className="mt-1">Company details for emails</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <FormField control={form.control} name="companyName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl><Input placeholder="Hamper Queens Ltd" {...field} value={field.value || ''} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="companyLogoUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo URL (Public link)</FormLabel>
                  <FormControl><Input placeholder="https://..." className="font-mono text-sm" {...field} value={field.value || ''} /></FormControl>
                  {field.value && (
                    <div className="mt-4 p-4 bg-muted/20 border border-border rounded-md inline-block">
                      <img src={field.value} alt="Logo preview" className="max-h-12 object-contain" onError={(e) => (e.target as any).style.display = 'none'} />
                    </div>
                  )}
                </FormItem>
              )} />
            </CardContent>
            <CardFooter className="bg-muted/5 border-t border-border pt-4">
              <Button 
                onClick={() => handleSave({ 
                  companyName: form.getValues('companyName'),
                  companyLogoUrl: form.getValues('companyLogoUrl')
                }, 'Branding')}
                disabled={updateMutation.isPending}
              >
                Save Branding
              </Button>
            </CardFooter>
          </Card>

        </div>
      </Form>
    </div>
  );
}