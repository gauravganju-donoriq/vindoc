import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Loader2, 
  MapPin, 
  Calendar,
  IndianRupee,
  FileWarning,
  ChevronDown,
  ChevronUp,
  Clock,
  Shield,
  Car
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ChallanData {
  challanNo: string;
  dateTime: string;
  place: string;
  status: 'Pending' | 'Disposed';
  remark: string;
  fineImposed: number;
  driverName: string | null;
  ownerName: string;
  department: string;
  stateCode: string;
  offences: Array<{ act: string | null; name: string }>;
  sentToCourt: boolean;
  courtDetails: {
    address: string | null;
    name: string | null;
    dateOfProceeding: string | null;
  } | null;
}

interface ChallanTabProps {
  vehicle: {
    id: string;
    registration_number: string;
  };
}

// Using any for stored challan since the DB types are complex with Json

const ChallanCard = ({ challan, isStored = false }: { challan: ChallanData; isStored?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isPending = challan.status === 'Pending';

  // Parse date from various formats (API: "DD-MM-YYYY HH:mm:ss" or DB: ISO string)
  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    
    try {
      // First try parsing as ISO format (from database)
      const isoDate = new Date(dateStr);
      if (!isNaN(isoDate.getTime())) {
        return isoDate;
      }
      
      // Then try parsing "DD-MM-YYYY HH:mm:ss" format (from API)
      if (dateStr.includes('-') && dateStr.length >= 10) {
        const [datePart, timePart] = dateStr.split(' ');
        const parts = datePart.split('-');
        // Check if it's DD-MM-YYYY format (day first)
        if (parts.length === 3 && parts[0].length <= 2) {
          const [day, month, year] = parts;
          const parsed = new Date(`${year}-${month}-${day}T${timePart || '00:00:00'}`);
          if (!isNaN(parsed.getTime())) {
            return parsed;
          }
        }
      }
      
      return null;
    } catch {
      return null;
    }
  };

  const parsedDate = parseDate(challan.dateTime);

  return (
    <Card className={`border ${isPending ? 'border-red-200 bg-red-50/50' : 'border-green-200 bg-green-50/50'}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <p className="font-mono text-xs text-gray-500 truncate">
              #{challan.challanNo}
            </p>
            <p className="text-sm font-medium text-gray-900 mt-1 line-clamp-2">
              {challan.remark || "Traffic violation"}
            </p>
          </div>
          <Badge 
            variant={isPending ? "destructive" : "default"}
            className={isPending ? "" : "bg-green-600 hover:bg-green-700"}
          >
            {isPending ? "Pending" : "Disposed"}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-600 mb-3">
          {parsedDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(parsedDate, "dd MMM yyyy, hh:mm a")}
            </div>
          )}
          {challan.place && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {challan.place}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-lg font-semibold text-gray-900">
            <IndianRupee className="h-4 w-4" />
            {challan.fineImposed.toLocaleString('en-IN')}
          </div>
          
          {challan.offences && challan.offences.length > 0 && (
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs text-gray-500">
                  {isOpen ? (
                    <>Hide Details <ChevronUp className="h-3 w-3 ml-1" /></>
                  ) : (
                    <>View Details <ChevronDown className="h-3 w-3 ml-1" /></>
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="absolute left-0 right-0 mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <p className="text-xs font-medium text-gray-700 mb-2">Offences:</p>
                <ul className="space-y-1">
                  {challan.offences.map((offence, idx) => (
                    <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                      <span className="text-gray-400">•</span>
                      {offence.name}
                    </li>
                  ))}
                </ul>
                {challan.sentToCourt && challan.courtDetails && (
                  <div className="mt-3 pt-2 border-t border-gray-100">
                    <p className="text-xs font-medium text-amber-700 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Sent to Court
                    </p>
                    {challan.courtDetails.name && (
                      <p className="text-xs text-gray-600 mt-1">{challan.courtDetails.name}</p>
                    )}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const ChallanTab = ({ vehicle }: ChallanTabProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [pendingChallans, setPendingChallans] = useState<ChallanData[]>([]);
  const [disposedChallans, setDisposedChallans] = useState<ChallanData[]>([]);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [hasStoredData, setHasStoredData] = useState(false);
  const { toast } = useToast();

  // Load stored challans on mount
  useEffect(() => {
    loadStoredChallans();
  }, [vehicle.id]);

  const loadStoredChallans = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicle_challans')
        .select('*')
        .eq('vehicle_id', vehicle.id)
        .order('challan_date_time', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const pending: ChallanData[] = [];
        const disposed: ChallanData[] = [];
        let latestFetch: Date | null = null;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.forEach((challan: any) => {
          const offences = Array.isArray(challan.offence_details) 
            ? challan.offence_details as Array<{ act: string | null; name: string }>
            : [];
          
          const mapped: ChallanData = {
            challanNo: challan.challan_no,
            dateTime: challan.challan_date_time || '',
            place: challan.challan_place || '',
            status: challan.challan_status === 'Pending' ? 'Pending' : 'Disposed',
            remark: challan.remark || '',
            fineImposed: challan.fine_imposed || 0,
            driverName: challan.driver_name,
            ownerName: challan.owner_name || '',
            department: challan.department || '',
            stateCode: challan.state_code || '',
            offences,
            sentToCourt: challan.sent_to_court || false,
            courtDetails: challan.court_details as ChallanData['courtDetails'],
          };

          if (challan.challan_status === 'Pending') {
            pending.push(mapped);
          } else {
            disposed.push(mapped);
          }

          const fetchDate = new Date(challan.fetched_at);
          if (!latestFetch || fetchDate > latestFetch) {
            latestFetch = fetchDate;
          }
        });

        setPendingChallans(pending);
        setDisposedChallans(disposed);
        setLastFetched(latestFetch);
        setHasStoredData(true);
      }
    } catch (error: any) {
      console.error('Error loading stored challans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChallans = async () => {
    setIsFetching(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast({
          title: "Not authenticated",
          description: "Please log in to check challans",
          variant: "destructive",
        });
        return;
      }

      const response = await supabase.functions.invoke('fetch-challan-details', {
        body: {
          registration_number: vehicle.registration_number,
          vehicle_id: vehicle.id,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;

      if (!data.success) {
        toast({
          title: "Error",
          description: data.error || "Could not fetch challan details",
          variant: "destructive",
        });
        return;
      }

      // Update state with fetched data
      setPendingChallans(data.pending_challans || []);
      setDisposedChallans(data.disposed_challans || []);
      setLastFetched(new Date());

      // Save to database
      await saveChallans([...data.pending_challans, ...data.disposed_challans]);

      if (data.pending_challans?.length === 0 && data.disposed_challans?.length === 0) {
        toast({
          title: "No challans found",
          description: "Great driving record! No traffic violations on record.",
        });
      } else {
        const pendingCount = data.pending_challans?.length || 0;
        toast({
          title: "Challans fetched",
          description: pendingCount > 0 
            ? `Found ${pendingCount} pending challan(s) totaling ₹${data.total_pending_fine.toLocaleString('en-IN')}`
            : "All challans have been disposed",
        });
      }

      setHasStoredData(true);
    } catch (error: any) {
      console.error('Error fetching challans:', error);
      toast({
        title: "Error",
        description: error.message || "Could not fetch challan details",
        variant: "destructive",
      });
    } finally {
      setIsFetching(false);
    }
  };

  const saveChallans = async (challans: ChallanData[]) => {
    if (challans.length === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Save challans one by one with individual inserts/updates
      for (const challan of challans) {
        // Parse date
        let parsedDate: string | null = null;
        if (challan.dateTime) {
          try {
            const [datePart, timePart] = challan.dateTime.split(' ');
            const [day, month, year] = datePart.split('-');
            parsedDate = new Date(`${year}-${month}-${day}T${timePart || '00:00:00'}`).toISOString();
          } catch {
            parsedDate = null;
          }
        }

        // Check if exists
        const { data: existing } = await supabase
          .from('vehicle_challans')
          .select('id')
          .eq('vehicle_id', vehicle.id)
          .eq('challan_no', challan.challanNo)
          .maybeSingle();

        // Use JSON.parse/stringify to convert to proper Json type
        const offenceDetailsJson = JSON.parse(JSON.stringify(challan.offences || []));
        const courtDetailsJson = challan.courtDetails ? JSON.parse(JSON.stringify(challan.courtDetails)) : null;
        const rawApiJson = JSON.parse(JSON.stringify(challan));

        if (existing) {
          // Update
          await supabase
            .from('vehicle_challans')
            .update({
              challan_date_time: parsedDate,
              challan_place: challan.place,
              challan_status: challan.status,
              remark: challan.remark,
              fine_imposed: challan.fineImposed,
              driver_name: challan.driverName,
              owner_name: challan.ownerName,
              department: challan.department,
              state_code: challan.stateCode,
              offence_details: offenceDetailsJson,
              sent_to_court: challan.sentToCourt,
              court_details: courtDetailsJson,
              raw_api_data: rawApiJson,
              fetched_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          // Insert - cast the whole object to bypass strict typing
          const insertData = {
            vehicle_id: vehicle.id,
            user_id: user.id,
            challan_no: challan.challanNo,
            challan_date_time: parsedDate,
            challan_place: challan.place,
            challan_status: challan.status,
            remark: challan.remark,
            fine_imposed: challan.fineImposed,
            driver_name: challan.driverName,
            owner_name: challan.ownerName,
            department: challan.department,
            state_code: challan.stateCode,
            offence_details: offenceDetailsJson,
            sent_to_court: challan.sentToCourt,
            court_details: courtDetailsJson,
            raw_api_data: rawApiJson,
            fetched_at: new Date().toISOString(),
          };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('vehicle_challans') as any).insert(insertData);
        }

      }
    } catch (error) {
      console.error('Error saving challans:', error);
    }
  };

  const totalPendingFine = pendingChallans.reduce((sum, c) => sum + c.fineImposed, 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Check Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-gray-100 rounded-xl p-4">
        <div>
          <h3 className="text-base font-medium text-gray-900 flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-gray-400" />
            Traffic Challans
          </h3>
          {lastFetched && (
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last checked {formatDistanceToNow(lastFetched, { addSuffix: true })}
            </p>
          )}
        </div>
        <Button 
          onClick={fetchChallans} 
          disabled={isFetching}
          className="gap-2"
        >
          {isFetching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Check for Challans
            </>
          )}
        </Button>
      </div>

      {/* Summary Cards */}
      {hasStoredData && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className={`${pendingChallans.length > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                {pendingChallans.length > 0 ? (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
                <span className="text-sm font-medium text-gray-700">Pending</span>
              </div>
              <p className={`text-2xl font-bold ${pendingChallans.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {pendingChallans.length}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {pendingChallans.length === 1 ? 'challan' : 'challans'}
              </p>
            </CardContent>
          </Card>

          <Card className={`${totalPendingFine > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <IndianRupee className={`h-5 w-5 ${totalPendingFine > 0 ? 'text-amber-600' : 'text-green-600'}`} />
                <span className="text-sm font-medium text-gray-700">Total Fine</span>
              </div>
              <p className={`text-2xl font-bold ${totalPendingFine > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                ₹{totalPendingFine.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-gray-500 mt-1">pending amount</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 border-gray-200 col-span-2 lg:col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Disposed</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {disposedChallans.length}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {disposedChallans.length === 1 ? 'challan cleared' : 'challans cleared'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* No Data State */}
      {!hasStoredData && !isFetching && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Car className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Check Traffic Violations
            </h4>
            <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
              Click the button above to check for any pending traffic challans or violations 
              registered against this vehicle.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pending Challans */}
      {pendingChallans.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Pending Challans ({pendingChallans.length})
          </h4>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pendingChallans.map((challan) => (
              <div key={challan.challanNo} className="relative">
                <ChallanCard challan={challan} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disposed Challans */}
      {disposedChallans.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Disposed Challans ({disposedChallans.length})
          </h4>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {disposedChallans.map((challan) => (
              <div key={challan.challanNo} className="relative">
                <ChallanCard challan={challan} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clean Record Message */}
      {hasStoredData && pendingChallans.length === 0 && disposedChallans.length === 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-green-900 mb-1">
              Clean Driving Record!
            </h4>
            <p className="text-sm text-green-700">
              No traffic violations found for this vehicle. Keep up the safe driving!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ChallanTab;
