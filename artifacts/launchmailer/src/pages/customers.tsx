import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { 
  useListCustomers, 
  useExportCustomers,
  useDeleteCustomer,
  useUpdateCustomer,
  getListCustomersQueryKey,
  Customer
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/use-debounce';
import { format } from 'date-fns';
import { 
  Search, Download, Plus, MoreHorizontal, Edit, Trash2, Mail, Phone, MapPin, Tag,
  Users
} from 'lucide-react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

export default function Customers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Filters state
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [hasEmail, setHasEmail] = useState<string>('all');
  const [hasPhone, setHasPhone] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Data fetching
  const { data, isLoading } = useListCustomers({
    search: debouncedSearch || undefined,
    hasEmail: hasEmail !== 'all' ? hasEmail as any : undefined,
    hasPhone: hasPhone !== 'all' ? hasPhone as any : undefined,
    page,
    limit,
  });

  // Mutations
  const deleteMutation = useDeleteCustomer();
  const updateMutation = useUpdateCustomer();

  // Modal states
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Edit form
  const editForm = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      city: '',
      tags: '',
      notes: ''
    }
  });

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    editForm.reset({
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      email: customer.email || '',
      phone: customer.phone || '',
      city: customer.city || '',
      tags: customer.tags?.join(', ') || '',
      notes: customer.notes || ''
    });
  };

  const handleUpdate = (values: any) => {
    if (!editingCustomer) return;
    
    updateMutation.mutate({
      id: editingCustomer.id,
      data: {
        ...values,
        tags: values.tags ? values.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []
      }
    }, {
      onSuccess: () => {
        toast({ title: 'Customer updated successfully' });
        setEditingCustomer(null);
        queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
      }
    });
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteMutation.mutate({ id: deletingId }, {
      onSuccess: () => {
        toast({ title: 'Customer deleted' });
        setDeletingId(null);
        queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
      }
    });
  };

  const exportUrl = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api/customers/export';
  const handleExport = () => {
    // In a real app we'd fetch with auth header, but standard export usually uses a generated temp link or we can fetch and download Blob.
    // The spec provides `useExportCustomers` which returns a CSV string. Let's use that.
    fetch(exportUrl, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('launchmailer_token')}` }
    })
    .then(res => res.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    })
    .catch(err => toast({ title: 'Export failed', description: err.message, variant: 'destructive' }));
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">
            Manage your recipient database
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Link href="/customers/import">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Import
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 shrink-0 p-4 bg-card border border-border rounded-lg shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search names, emails, phones..." 
            className="pl-9 font-mono bg-background"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1); // Reset page on search
            }}
          />
        </div>
        <div className="flex gap-3 sm:w-auto">
          <Select value={hasEmail} onValueChange={(v) => { setHasEmail(v); setPage(1); }}>
            <SelectTrigger className="w-[140px] font-mono">
              <SelectValue placeholder="Email Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Email</SelectItem>
              <SelectItem value="true">Has Email</SelectItem>
              <SelectItem value="false">No Email</SelectItem>
            </SelectContent>
          </Select>

          <Select value={hasPhone} onValueChange={(v) => { setHasPhone(v); setPage(1); }}>
            <SelectTrigger className="w-[140px] font-mono">
              <SelectValue placeholder="Phone Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Phone</SelectItem>
              <SelectItem value="true">Has Phone</SelectItem>
              <SelectItem value="false">No Phone</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 bg-card border border-border rounded-lg shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0 z-10 backdrop-blur">
              <tr className="border-b border-border text-left font-mono text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">City</th>
                <th className="px-4 py-3 font-medium">Tags</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : data?.customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p>No customers found matching your criteria</p>
                  </td>
                </tr>
              ) : (
                data?.customers.map((c) => (
                  <tr key={c.id} className="hover:bg-secondary/50 transition-colors group">
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-foreground">
                        {c.firstName} {c.lastName}
                        {!c.firstName && !c.lastName && <span className="text-muted-foreground italic">Unnamed</span>}
                      </div>
                      {c.notes && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-1 max-w-[200px]" title={c.notes}>
                          {c.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="space-y-1 font-mono text-xs">
                        {c.email && (
                          <div className="flex items-center gap-1.5 text-blue-400">
                            <Mail className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[180px]" title={c.email}>{c.email}</span>
                          </div>
                        )}
                        {c.phone && (
                          <div className="flex items-center gap-1.5 text-green-400">
                            <Phone className="w-3 h-3 shrink-0" />
                            <span>{c.phone}</span>
                          </div>
                        )}
                        {!c.email && !c.phone && (
                          <span className="text-muted-foreground italic">No contact info</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-muted-foreground">
                      {c.city ? (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3" />
                          <span>{c.city}</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-1">
                        {c.tags && c.tags.length > 0 ? (
                          c.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="font-mono text-[10px] px-1.5 py-0 shadow-none border-border bg-background">
                              {tag}
                            </Badge>
                          ))
                        ) : '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(c)}>
                            <Edit className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => setDeletingId(c.id)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {data && data.total > 0 && (
          <div className="p-3 border-t border-border flex items-center justify-between bg-muted/20 shrink-0">
            <p className="text-xs text-muted-foreground font-mono">
              Showing {(page - 1) * limit + 1} - {Math.min(page * limit, data.total)} of {data.total}
            </p>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page * limit >= data.total}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingCustomer} onOpenChange={(open) => !open && setEditingCustomer(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update details for this customer.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={editForm.control} name="firstName" render={({ field }) => (
                  <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={editForm.control} name="lastName" render={({ field }) => (
                  <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={editForm.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={editForm.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl></FormItem>
                )} />
              </div>
              <FormField control={editForm.control} name="city" render={({ field }) => (
                <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={editForm.control} name="tags" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (comma separated)</FormLabel>
                  <FormControl><Input placeholder="vip, past_buyer" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={editForm.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingCustomer(null)}>Cancel</Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving...' : 'Save changes'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the customer. This action cannot be undone.
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