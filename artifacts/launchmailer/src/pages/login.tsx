import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, MessageSquare, ArrowRight, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useLogin, useSetupAdmin, useHealthCheck } from '@workspace/api-client-react';
import { setToken } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

const authSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type AuthValues = z.infer<typeof authSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSetupMode, setIsSetupMode] = useState(false);

  // Check health to see if admin exists (this is a simplified check, if health doesn't tell us, we assume login first)
  // The prompt says: "If no admin exists, /login shows a 'First-time Setup' form using useSetupAdmin"
  // Let's rely on login failing with a specific error or we can provide a toggle for setup mode if login fails.
  // We'll add a manual toggle for setup, or if login fails with 404/no admin, switch to setup.

  const form = useForm<AuthValues>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: '', password: '' },
  });

  const loginMutation = useLogin();
  const setupMutation = useSetupAdmin();

  const onSubmit = (data: AuthValues) => {
    if (isSetupMode) {
      setupMutation.mutate(
        { data },
        {
          onSuccess: (res) => {
            setToken(res.token);
            toast({ title: 'Welcome to LaunchMailer', description: 'Admin account created successfully.' });
            setLocation('/dashboard');
          },
          onError: (err: any) => {
            toast({ 
              title: 'Setup failed', 
              description: err?.data?.error || err.message || 'Unknown error occurred', 
              variant: 'destructive' 
            });
          }
        }
      );
    } else {
      loginMutation.mutate(
        { data },
        {
          onSuccess: (res) => {
            setToken(res.token);
            setLocation('/dashboard');
          },
          onError: (err: any) => {
            const errorMsg = err?.data?.error || err.message;
            if (errorMsg.toLowerCase().includes('no admin')) {
              setIsSetupMode(true);
              toast({ title: 'No admin found', description: 'Please set up the initial admin account.' });
            } else {
              toast({ 
                title: 'Login failed', 
                description: errorMsg || 'Invalid credentials', 
                variant: 'destructive' 
              });
            }
          }
        }
      );
    }
  };

  const isPending = loginMutation.isPending || setupMutation.isPending;

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-primary/30">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-2 text-primary mb-6">
          <Mail className="w-10 h-10" />
          <MessageSquare className="w-8 h-8 -ml-5 mt-5 bg-background rounded-full" />
        </div>
        <h2 className="mt-2 text-center text-3xl font-extrabold font-sans text-foreground">
          {isSetupMode ? 'Setup Admin Account' : 'Sign in to LaunchMailer'}
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground font-mono">
          The command center for Hamper Queens
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 shadow-xl shadow-black/50 border border-border sm:rounded-lg sm:px-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="admin@hamperqueens.com" 
                        className="bg-input border-border font-mono text-sm" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        className="bg-input border-border font-mono text-sm" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full font-bold tracking-wide" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                {isSetupMode ? 'Create Account' : 'Sign In'}
              </Button>
            </form>
          </Form>
          
          <div className="mt-6 text-center">
            <button 
              type="button" 
              onClick={() => setIsSetupMode(!isSetupMode)}
              className="text-xs text-muted-foreground hover:text-primary transition-colors font-mono"
            >
              {isSetupMode ? 'Already have an account? Sign in' : 'Need to set up the admin?'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}