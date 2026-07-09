import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-9xl font-black text-primary/20 font-sans tracking-tighter">404</h1>
        <h2 className="text-2xl font-bold text-foreground mt-4">Page not found</h2>
        <p className="text-muted-foreground mt-2 mb-8 font-mono text-sm">
          The requested route doesn't exist or you don't have access to it.
        </p>
        <Link href="/">
          <Button>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}