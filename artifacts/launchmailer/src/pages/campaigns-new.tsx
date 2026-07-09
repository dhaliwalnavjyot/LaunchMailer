import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  ArrowLeft, Wand2, Mail, MessageSquare, Image as ImageIcon, Send, Sparkles, AlertCircle, X
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  useCreateCampaign, 
  useSendEmail, 
  useSendWhatsApp, 
  useGenerateContent,
  useRequestUploadUrl,
  CampaignInputMethod,
  GenerateInputTone
} from '@workspace/api-client-react';
import { getToken } from '@/lib/auth';

const formSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  method: z.enum([CampaignInputMethod.email, CampaignInputMethod.whatsapp, CampaignInputMethod.both]),
  subject: z.string().optional(),
  emailContent: z.string().optional(),
  whatsappMessage: z.string().optional(),
  imageUrl: z.string().optional(),
  recipientFilter: z.object({
    hasEmail: z.boolean().optional(),
    hasPhone: z.boolean().optional(),
    city: z.string().optional(),
    tags: z.string().optional(), // We'll parse this to array
  }).optional()
}).refine(data => {
  if ((data.method === CampaignInputMethod.email || data.method === CampaignInputMethod.both) && (!data.subject || !data.emailContent)) {
    return false;
  }
  return true;
}, {
  message: "Email subject and content are required for email campaigns",
  path: ["emailContent"]
}).refine(data => {
  if ((data.method === CampaignInputMethod.whatsapp || data.method === CampaignInputMethod.both) && !data.whatsappMessage) {
    return false;
  }
  return true;
}, {
  message: "WhatsApp message is required for WhatsApp campaigns",
  path: ["whatsappMessage"]
});

export default function NewCampaign() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [aiSheetOpen, setAiSheetOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activePreview, setActivePreview] = useState<'email' | 'whatsapp'>('email');

  const createMutation = useCreateCampaign();
  const sendEmailMutation = useSendEmail();
  const sendWhatsAppMutation = useSendWhatsApp();
  const generateMutation = useGenerateContent();
  const requestUrlMutation = useRequestUploadUrl();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      method: CampaignInputMethod.both,
      subject: '',
      emailContent: '',
      whatsappMessage: '',
      imageUrl: '',
      recipientFilter: {
        hasEmail: undefined,
        hasPhone: undefined,
        city: '',
        tags: ''
      }
    }
  });

  const method = form.watch('method');
  const emailContent = form.watch('emailContent');
  const subject = form.watch('subject');
  const whatsappMessage = form.watch('whatsappMessage');
  const imageUrl = form.watch('imageUrl');

  // AI Form
  const [aiForm, setAiForm] = useState({
    brandName: 'Hamper Queens',
    productName: '',
    launchDate: '',
    tone: GenerateInputTone.professional,
    targetAudience: 'Existing loyal customers'
  });

  const handleGenerate = () => {
    if (!aiForm.brandName || !aiForm.productName || !aiForm.launchDate || !aiForm.targetAudience) {
      toast({ title: 'Missing fields', description: 'Please fill all AI prompt fields', variant: 'destructive' });
      return;
    }

    generateMutation.mutate({ data: aiForm }, {
      onSuccess: (data) => {
        toast({ title: 'Content generated successfully' });
      },
      onError: (err: any) => {
        toast({ title: 'Generation failed', description: err.message, variant: 'destructive' });
      }
    });
  };

  const applyGenerated = (type: 'email-pro' | 'email-mkt' | 'whatsapp', subjectText?: string, bodyText?: string) => {
    if (type.startsWith('email')) {
      if (subjectText) form.setValue('subject', subjectText);
      if (bodyText) form.setValue('emailContent', bodyText);
      setActivePreview('email');
    } else {
      if (bodyText) form.setValue('whatsappMessage', bodyText);
      setActivePreview('whatsapp');
    }
    setAiSheetOpen(false);
    toast({ title: 'Content applied' });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload an image', variant: 'destructive' });
      return;
    }

    setUploadingImage(true);
    try {
      const urlRes = await requestUrlMutation.mutateAsync({
        data: {
          filename: file.name,
          contentType: file.type as any
        }
      });

      await fetch(urlRes.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });

      form.setValue('imageUrl', urlRes.publicUrl);
      toast({ title: 'Image uploaded' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingImage(false);
    }
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      const payload = {
        ...data,
        recipientFilter: {
          ...data.recipientFilter,
          tags: data.recipientFilter?.tags ? data.recipientFilter.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
          city: data.recipientFilter?.city || undefined
        }
      };

      const campaign = await createMutation.mutateAsync({ data: payload });
      
      let sentEmail = false;
      let sentWA = false;

      if (data.method === CampaignInputMethod.email || data.method === CampaignInputMethod.both) {
        await sendEmailMutation.mutateAsync({ data: { campaignId: campaign.id } });
        sentEmail = true;
      }

      if (data.method === CampaignInputMethod.whatsapp || data.method === CampaignInputMethod.both) {
        await sendWhatsAppMutation.mutateAsync({ data: { campaignId: campaign.id } });
        sentWA = true;
      }

      toast({ 
        title: 'Campaign Started', 
        description: `Successfully initiated ${sentEmail && sentWA ? 'Email and WhatsApp' : sentEmail ? 'Email' : 'WhatsApp'} sending.` 
      });
      setLocation(`/campaigns/${campaign.id}`);

    } catch (err: any) {
      toast({ title: 'Failed to create campaign', description: err.message, variant: 'destructive' });
    }
  };

  const isSending = createMutation.isPending || sendEmailMutation.isPending || sendWhatsAppMutation.isPending;

  // Substitute variables for preview
  const substituteVars = (text: string = '') => {
    return text
      .replace(/{{firstName}}/g, 'Sarah')
      .replace(/{{lastName}}/g, 'Connor')
      .replace(/{{email}}/g, 'sarah@example.com')
      .replace(/{{city}}/g, 'London');
  };

  return (
    <div className="space-y-6 flex flex-col h-full max-w-7xl mx-auto">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/campaigns">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">New Campaign</h1>
            <p className="text-muted-foreground mt-1 font-mono text-sm">Compose and send messages</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" type="button" onClick={() => setAiSheetOpen(true)}>
            <Sparkles className="w-4 h-4 mr-2 text-primary" />
            AI Generate
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={isSending}>
            {isSending ? 'Starting...' : 'Send Campaign'}
            {!isSending && <Send className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 overflow-hidden">
        {/* LEFT PANEL: FORM */}
        <div className="overflow-y-auto pr-2 pb-12 space-y-8">
          <Form {...form}>
            <form className="space-y-8">
              {/* Basic Info */}
              <Card className="border-border shadow-sm">
                <CardHeader>
                  <CardTitle>Campaign Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Internal Campaign Name</FormLabel>
                      <FormControl><Input placeholder="e.g. Summer Healthcare Launch" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="method" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Communication Method</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: CampaignInputMethod.email, label: 'Email Only', icon: Mail },
                            { value: CampaignInputMethod.whatsapp, label: 'WhatsApp Only', icon: MessageSquare },
                            { value: CampaignInputMethod.both, label: 'Email + WA', icon: Send },
                          ].map(opt => (
                            <div 
                              key={opt.value}
                              className={`flex flex-col items-center justify-center p-3 border rounded-md cursor-pointer transition-colors ${field.value === opt.value ? 'bg-primary/10 border-primary text-primary' : 'bg-card border-border hover:bg-secondary text-muted-foreground'}`}
                              onClick={() => {
                                field.onChange(opt.value);
                                if (opt.value === CampaignInputMethod.whatsapp) setActivePreview('whatsapp');
                                else setActivePreview('email');
                              }}
                            >
                              <opt.icon className="w-5 h-5 mb-1" />
                              <span className="text-xs font-medium font-mono">{opt.label}</span>
                            </div>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              {/* Email Content */}
              {(method === CampaignInputMethod.email || method === CampaignInputMethod.both) && (
                <Card className="border-border shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-5 h-5 text-blue-400" /> Email Content
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField control={form.control} name="subject" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject Line</FormLabel>
                        <FormControl><Input placeholder="Exciting news from Hamper Queens..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="emailContent" render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between">
                          <FormLabel>Message Body</FormLabel>
                          <span className="text-[10px] text-muted-foreground font-mono">Supports HTML</span>
                        </div>
                        <FormControl>
                          <Textarea 
                            className="min-h-[200px] font-mono text-sm" 
                            placeholder="Hello {{firstName}}, we have something new for you..." 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className="text-xs font-mono mt-1">
                          Variables: {'{{firstName}}'}, {'{{lastName}}'}, {'{{email}}'}, {'{{city}}'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>
              )}

              {/* WhatsApp Content */}
              {(method === CampaignInputMethod.whatsapp || method === CampaignInputMethod.both) && (
                <Card className="border-border shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-green-400" /> WhatsApp Content
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <FormLabel>Header Image (Optional)</FormLabel>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="https://..." 
                          value={imageUrl || ''} 
                          onChange={(e) => form.setValue('imageUrl', e.target.value)} 
                          className="font-mono text-sm"
                        />
                        <div className="relative shrink-0">
                          <Button variant="outline" type="button" disabled={uploadingImage}>
                            {uploadingImage ? '...' : <ImageIcon className="w-4 h-4" />}
                          </Button>
                          <input 
                            type="file" 
                            className="absolute inset-0 opacity-0 cursor-pointer w-full" 
                            accept="image/*" 
                            onChange={handleImageUpload}
                            disabled={uploadingImage}
                          />
                        </div>
                      </div>
                      {imageUrl && (
                        <div className="relative w-20 h-20 rounded-md overflow-hidden border border-border mt-2 group">
                          <img src={imageUrl} alt="Upload preview" className="object-cover w-full h-full" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer" onClick={() => form.setValue('imageUrl', '')}>
                            <X className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}
                    </div>

                    <FormField control={form.control} name="whatsappMessage" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message Text</FormLabel>
                        <FormControl>
                          <Textarea 
                            className="min-h-[150px]" 
                            placeholder="Hi {{firstName}}! Check out our new launch..." 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className="text-xs font-mono mt-1">
                          Variables supported. Use *text* for bold, _text_ for italics.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>
              )}

              {/* Targeting */}
              <Card className="border-border shadow-sm">
                <CardHeader>
                  <CardTitle>Audience Targeting</CardTitle>
                  <CardDescription>Leave blank to send to all eligible customers</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="recipientFilter.city" render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl><Input placeholder="e.g. London" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="recipientFilter.tags" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags</FormLabel>
                        <FormControl><Input placeholder="vip, past_buyer" {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>

            </form>
          </Form>
        </div>

        {/* RIGHT PANEL: PREVIEW */}
        <div className="h-[calc(100vh-140px)] sticky top-0 flex flex-col bg-muted/20 border border-border rounded-lg overflow-hidden">
          <div className="flex border-b border-border bg-card shrink-0">
            {(method === CampaignInputMethod.email || method === CampaignInputMethod.both) && (
              <button 
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activePreview === 'email' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:bg-secondary'}`}
                onClick={() => setActivePreview('email')}
              >
                Email Preview
              </button>
            )}
            {(method === CampaignInputMethod.whatsapp || method === CampaignInputMethod.both) && (
              <button 
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activePreview === 'whatsapp' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:bg-secondary'}`}
                onClick={() => setActivePreview('whatsapp')}
              >
                WhatsApp Preview
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center bg-[#0a0a0a]">
            {activePreview === 'email' ? (
              <div className="w-full max-w-md bg-white rounded-md shadow-2xl overflow-hidden flex flex-col self-start text-black">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="text-xs text-gray-500 mb-1">Subject:</div>
                  <div className="font-semibold">{substituteVars(subject) || 'No subject set'}</div>
                </div>
                <div className="p-6 prose prose-sm max-w-none">
                  {emailContent ? (
                    <div dangerouslySetInnerHTML={{ __html: substituteVars(emailContent) }} />
                  ) : (
                    <div className="text-gray-400 italic text-center py-12">Email body empty</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full max-w-[350px] bg-[#efeae2] rounded-3xl shadow-2xl overflow-hidden flex flex-col border-[8px] border-[#222] self-start relative before:absolute before:top-0 before:inset-x-0 before:h-6 before:bg-[#222] before:rounded-b-xl before:mx-auto before:w-32 z-0">
                <div className="bg-[#005c4b] text-white p-4 pt-8 flex items-center gap-3 shrink-0">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">HQ</div>
                  <div>
                    <div className="font-bold text-sm">Hamper Queens</div>
                    <div className="text-[10px] text-white/70">business account</div>
                  </div>
                </div>
                <div className="flex-1 p-4 bg-[url('https://raw.githubusercontent.com/tictocx/Whatsapp-chat-background-pattern/master/whatsapp-pattern.png')] bg-cover opacity-90 overflow-y-auto">
                  <div className="bg-white rounded-lg rounded-tl-none p-2 mb-2 w-fit max-w-[85%] shadow-sm relative text-black">
                    {imageUrl && (
                      <img src={imageUrl} alt="Header" className="rounded-md w-full h-auto mb-2" />
                    )}
                    <div className="text-[13px] leading-relaxed whitespace-pre-wrap font-sans">
                      {whatsappMessage ? substituteVars(whatsappMessage) : <span className="text-gray-400 italic">Message empty</span>}
                    </div>
                    <div className="text-[10px] text-gray-500 text-right mt-1">12:00</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Generator Sheet */}
      <Sheet open={aiSheetOpen} onOpenChange={setAiSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto border-l-border">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> AI Campaign Writer
            </SheetTitle>
            <SheetDescription>
              Generate professional copy for your launch campaign.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Brand Name</label>
              <Input value={aiForm.brandName} onChange={e => setAiForm(p => ({...p, brandName: e.target.value}))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Product/Service Launching</label>
              <Input placeholder="e.g. Mobile IV Therapy" value={aiForm.productName} onChange={e => setAiForm(p => ({...p, productName: e.target.value}))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Launch Date</label>
              <Input placeholder="e.g. Next Monday" value={aiForm.launchDate} onChange={e => setAiForm(p => ({...p, launchDate: e.target.value}))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Target Audience</label>
              <Input value={aiForm.targetAudience} onChange={e => setAiForm(p => ({...p, targetAudience: e.target.value}))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Tone</label>
              <Select value={aiForm.tone} onValueChange={(v: any) => setAiForm(p => ({...p, tone: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly & Warm</SelectItem>
                  <SelectItem value="exciting">Exciting & Energetic</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button className="w-full mt-4" onClick={handleGenerate} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? 'Generating Magic...' : 'Generate Content'}
            </Button>
          </div>

          {generateMutation.data && (
            <div className="mt-8 space-y-6 pt-6 border-t border-border">
              <h3 className="font-semibold">Generated Results</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Badge variant="outline">Professional Email</Badge>
                  <Button variant="ghost" size="sm" onClick={() => applyGenerated('email-pro', generateMutation.data.emailSubject, generateMutation.data.professionalEmail)}>Use This</Button>
                </div>
                <div className="p-3 bg-muted rounded-md text-xs font-mono">
                  <div className="font-bold mb-2">Subj: {generateMutation.data.emailSubject}</div>
                  <div className="whitespace-pre-wrap">{generateMutation.data.professionalEmail}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Badge variant="outline">Marketing Email</Badge>
                  <Button variant="ghost" size="sm" onClick={() => applyGenerated('email-mkt', generateMutation.data.emailSubject, generateMutation.data.marketingEmail)}>Use This</Button>
                </div>
                <div className="p-3 bg-muted rounded-md text-xs font-mono whitespace-pre-wrap">
                  {generateMutation.data.marketingEmail}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Badge variant="outline" className="text-green-500 border-green-500/20">WhatsApp Msg</Badge>
                  <Button variant="ghost" size="sm" onClick={() => applyGenerated('whatsapp', undefined, generateMutation.data.whatsappMessage)}>Use This</Button>
                </div>
                <div className="p-3 bg-green-500/10 text-green-100 rounded-md text-xs font-mono whitespace-pre-wrap">
                  {generateMutation.data.whatsappMessage}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}