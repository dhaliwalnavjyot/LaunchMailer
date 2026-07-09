import { useState, useRef } from 'react';
import { useLocation, Link } from 'wouter';
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import Papa from 'papaparse';
import * as xlsx from 'xlsx';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useImportCustomers } from '@workspace/api-client-react';

type ParsedRow = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  city?: string;
  tags?: string;
  notes?: string;
};

type RowWithValidation = ParsedRow & {
  _index: number;
  _errors: string[];
  _warnings: string[];
};

export default function ImportCustomers() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<RowWithValidation[]>([]);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  
  const importMutation = useImportCustomers();
  const [importResult, setImportResult] = useState<any>(null);

  const normalizeHeaders = (headers: string[]) => {
    const headerMap: Record<string, keyof ParsedRow> = {
      'first name': 'firstName', 'firstname': 'firstName', 'first': 'firstName',
      'last name': 'lastName', 'lastname': 'lastName', 'last': 'lastName',
      'email': 'email', 'e-mail': 'email',
      'phone': 'phone', 'phone number': 'phone', 'telephone': 'phone', 'mobile': 'phone',
      'city': 'city', 'location': 'city',
      'tags': 'tags', 'labels': 'tags',
      'notes': 'notes', 'note': 'notes', 'comments': 'notes'
    };
    
    return headers.map(h => {
      const clean = h.toLowerCase().trim();
      return headerMap[clean] || h; // Keep original if no match, though it won't map to our type
    });
  };

  const validateRows = (rows: any[]): RowWithValidation[] => {
    const seenEmails = new Set<string>();
    const seenPhones = new Set<string>();
    
    return rows.map((row, i) => {
      const result: RowWithValidation = {
        _index: i + 1,
        _errors: [],
        _warnings: [],
        firstName: row.firstName?.toString().trim(),
        lastName: row.lastName?.toString().trim(),
        email: row.email?.toString().toLowerCase().trim(),
        phone: row.phone?.toString().trim(),
        city: row.city?.toString().trim(),
        tags: row.tags?.toString().trim(),
        notes: row.notes?.toString().trim(),
      };

      if (!result.email && !result.phone) {
        result._errors.push('Missing email or phone');
      }

      if (result.email) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) {
          result._errors.push('Invalid email format');
        } else if (seenEmails.has(result.email)) {
          result._errors.push('Duplicate email in file');
        }
        seenEmails.add(result.email);
      }

      if (result.phone) {
        if (seenPhones.has(result.phone)) {
          result._errors.push('Duplicate phone in file');
        }
        seenPhones.add(result.phone);
      }

      return result;
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setIsParsing(true);

    const processData = (data: any[]) => {
      const validRows = validateRows(data);
      setParsedData(validRows);
      setStep(2);
      setIsParsing(false);
    };

    if (selectedFile.name.endsWith('.csv')) {
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => normalizeHeaders([header])[0],
        complete: (results) => {
          processData(results.data);
        },
        error: (error) => {
          toast({ title: 'Error parsing CSV', description: error.message, variant: 'destructive' });
          setIsParsing(false);
        }
      });
    } else if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = xlsx.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const rawJson = xlsx.utils.sheet_to_json(sheet, { header: 1 });
          
          if (rawJson.length > 0) {
            // Need to map headers manually for Excel
            const headers = Object.keys(rawJson[0] as any);
            const normalizedHeaders = normalizeHeaders(headers);
            
            const normalizedData = rawJson.map((row: any) => {
              const newRow: any = {};
              headers.forEach((h, i) => {
                if (normalizedHeaders[i] && typeof normalizedHeaders[i] === 'string') {
                  newRow[normalizedHeaders[i] as string] = row[h];
                }
              });
              return newRow;
            });
            processData(normalizedData);
          } else {
            processData([]);
          }
        } catch (err: any) {
          toast({ title: 'Error parsing Excel', description: err.message, variant: 'destructive' });
          setIsParsing(false);
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    } else {
      toast({ title: 'Invalid file type', description: 'Please upload a CSV or Excel file', variant: 'destructive' });
      setIsParsing(false);
    }
  };

  const handleImport = () => {
    // Filter out rows with errors before sending
    const validRows = parsedData.filter(r => r._errors.length === 0).map(r => ({
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      phone: r.phone,
      city: r.city,
      tags: r.tags,
      notes: r.notes
    }));

    if (validRows.length === 0) {
      toast({ title: 'No valid rows to import', variant: 'destructive' });
      return;
    }

    importMutation.mutate(
      { data: { customers: validRows, updateExisting } },
      {
        onSuccess: (res) => {
          setImportResult(res);
          setStep(3);
        },
        onError: (err: any) => {
          toast({ title: 'Import failed', description: err.message, variant: 'destructive' });
        }
      }
    );
  };

  const reset = () => {
    setStep(1);
    setFile(null);
    setParsedData([]);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const errorCount = parsedData.filter(r => r._errors.length > 0).length;
  const validCount = parsedData.length - errorCount;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/customers">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Import Customers</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">Upload CSV or Excel files</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className={`h-2 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
        <div className={`h-2 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
        <div className={`h-2 rounded-full transition-colors ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
      </div>

      {step === 1 && (
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>
              We accept .csv, .xls, and .xlsx files. Make sure your file has a header row.
              Recognized columns: First Name, Last Name, Email, Phone, City, Tags, Notes.
            </CardDescription>
          </CardHeader>
          <CardContent className="py-12">
            <div 
              className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:bg-secondary/50 hover:border-primary/50 transition-all cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Click to select file</h3>
              <p className="text-sm text-muted-foreground font-mono">or drag and drop</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".csv,.xlsx,.xls" 
                onChange={handleFileUpload}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="border-border shadow-sm flex flex-col h-[600px]">
          <CardHeader className="shrink-0 border-b border-border pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Preview & Validate</CardTitle>
                <CardDescription className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1.5 font-mono text-xs">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    {file?.name}
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-xs text-green-500">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {validCount} Valid
                  </span>
                  {errorCount > 0 && (
                    <span className="flex items-center gap-1.5 font-mono text-xs text-destructive">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errorCount} Errors (Will be skipped)
                    </span>
                  )}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={reset}>
                <RefreshCw className="w-4 h-4 mr-2" /> Start Over
              </Button>
            </div>
            
            <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-border">
              <Checkbox 
                id="update" 
                checked={updateExisting} 
                onCheckedChange={(c) => setUpdateExisting(!!c)} 
              />
              <label htmlFor="update" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Update existing customers
              </label>
              <p className="text-xs text-muted-foreground font-mono ml-4">
                If checked, records matching an existing email or phone will be updated instead of skipped.
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0 z-10 backdrop-blur">
                <tr className="border-b border-border text-left font-mono text-[11px] text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3 w-12 text-center">Row</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">First Name</th>
                  <th className="px-4 py-3">Last Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">City</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parsedData.slice(0, 100).map((row, i) => (
                  <tr key={i} className={row._errors.length > 0 ? "bg-destructive/5" : ""}>
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground text-center border-r border-border">{row._index}</td>
                    <td className="px-4 py-2">
                      {row._errors.length > 0 ? (
                        <span className="text-xs font-mono text-destructive bg-destructive/10 px-1.5 py-0.5 rounded" title={row._errors.join(', ')}>
                          Error
                        </span>
                      ) : (
                        <span className="text-xs font-mono text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">
                          Valid
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">{row.firstName || '-'}</td>
                    <td className="px-4 py-2">{row.lastName || '-'}</td>
                    <td className={`px-4 py-2 ${row._errors.some(e => e.toLowerCase().includes('email')) ? 'text-destructive font-bold' : ''}`}>{row.email || '-'}</td>
                    <td className={`px-4 py-2 ${row._errors.some(e => e.toLowerCase().includes('phone')) ? 'text-destructive font-bold' : ''}`}>{row.phone || '-'}</td>
                    <td className="px-4 py-2">{row.city || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedData.length > 100 && (
              <div className="p-4 text-center text-xs text-muted-foreground font-mono bg-muted/20 border-t border-border">
                Showing first 100 of {parsedData.length} rows
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t border-border p-4 bg-muted/10 shrink-0 flex justify-end">
            <Button 
              size="lg" 
              onClick={handleImport} 
              disabled={validCount === 0 || importMutation.isPending}
            >
              {importMutation.isPending ? 'Importing...' : `Import ${validCount} valid rows`}
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 3 && importResult && (
        <Card className="border-border shadow-sm text-center">
          <CardHeader className="pb-2">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Import Complete</CardTitle>
          </CardHeader>
          <CardContent className="py-8">
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
              <div className="p-4 rounded-lg bg-card border border-border shadow-sm">
                <div className="text-3xl font-bold font-mono text-foreground mb-1">{importResult.created}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Created</div>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border shadow-sm">
                <div className="text-3xl font-bold font-mono text-blue-400 mb-1">{importResult.updated}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Updated</div>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border shadow-sm">
                <div className="text-3xl font-bold font-mono text-muted-foreground mb-1">{importResult.skipped}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Skipped</div>
              </div>
            </div>
            
            {importResult.errors?.length > 0 && (
              <div className="mt-8 max-w-lg mx-auto text-left">
                <h4 className="text-sm font-medium text-destructive mb-2">Import Errors ({importResult.errors.length})</h4>
                <div className="bg-destructive/5 rounded-md p-3 max-h-40 overflow-y-auto border border-destructive/20 font-mono text-xs">
                  {importResult.errors.map((e: any, i: number) => (
                    <div key={i} className="mb-1 text-destructive">
                      Row {e.row}: {e.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-center border-t border-border pt-6 pb-6 gap-4">
            <Button variant="outline" onClick={reset}>Import Another</Button>
            <Link href="/customers">
              <Button>View Customers</Button>
            </Link>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}