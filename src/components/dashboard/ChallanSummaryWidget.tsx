import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertTriangle, 
  CheckCircle, 
  IndianRupee, 
  FileWarning,
  ChevronRight,
  Car
} from "lucide-react";

interface ChallanSummary {
  vehicleId: string;
  registrationNumber: string;
  pendingCount: number;
  totalFine: number;
}

interface ChallanSummaryWidgetProps {
  vehicleIds: string[];
}

const ChallanSummaryWidget = ({ vehicleIds }: ChallanSummaryWidgetProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [summaries, setSummaries] = useState<ChallanSummary[]>([]);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    if (vehicleIds.length > 0) {
      fetchChallanSummary();
    } else {
      setIsLoading(false);
    }
  }, [vehicleIds]);

  const fetchChallanSummary = async () => {
    try {
      // Fetch all pending challans for user's vehicles
      const { data: challans, error } = await supabase
        .from('vehicle_challans')
        .select('vehicle_id, challan_status, fine_imposed')
        .in('vehicle_id', vehicleIds)
        .eq('challan_status', 'Pending');

      if (error) throw error;

      if (!challans || challans.length === 0) {
        setHasData(false);
        setIsLoading(false);
        return;
      }

      // Get vehicle registration numbers
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id, registration_number')
        .in('id', vehicleIds);

      const vehicleMap = new Map(vehicles?.map(v => [v.id, v.registration_number]) || []);

      // Group by vehicle
      const summaryMap = new Map<string, ChallanSummary>();
      
      for (const challan of challans) {
        const existing = summaryMap.get(challan.vehicle_id);
        const fine = challan.fine_imposed || 0;
        
        if (existing) {
          existing.pendingCount += 1;
          existing.totalFine += fine;
        } else {
          summaryMap.set(challan.vehicle_id, {
            vehicleId: challan.vehicle_id,
            registrationNumber: vehicleMap.get(challan.vehicle_id) || 'Unknown',
            pendingCount: 1,
            totalFine: fine,
          });
        }
      }

      setSummaries(Array.from(summaryMap.values()));
      setHasData(true);
    } catch (error) {
      console.error('Error fetching challan summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render anything if no vehicles or still loading initially
  if (vehicleIds.length === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-4">
          <Skeleton className="h-6 w-48 mb-3" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Don't show widget if no pending challans
  if (!hasData || summaries.length === 0) {
    return null;
  }

  const totalPendingCount = summaries.reduce((sum, s) => sum + s.pendingCount, 0);
  const totalFineAmount = summaries.reduce((sum, s) => sum + s.totalFine, 0);
  const vehiclesWithChallans = summaries.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-red-200 bg-red-50/50 overflow-hidden">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between p-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                <FileWarning className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 text-sm">Pending Challans</h3>
                <p className="text-xs text-gray-500">Traffic violations requiring attention</p>
              </div>
            </div>
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {totalPendingCount} pending
            </Badge>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3 px-4 pb-4">
            <div className="bg-white rounded-lg p-3 border border-red-100">
              <div className="flex items-center gap-1 text-red-600 mb-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Challans</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{totalPendingCount}</p>
            </div>
            
            <div className="bg-white rounded-lg p-3 border border-amber-100">
              <div className="flex items-center gap-1 text-amber-600 mb-1">
                <IndianRupee className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Total Fine</span>
              </div>
              <p className="text-xl font-bold text-gray-900">₹{totalFineAmount.toLocaleString('en-IN')}</p>
            </div>
            
            <div className="bg-white rounded-lg p-3 border border-gray-100">
              <div className="flex items-center gap-1 text-gray-600 mb-1">
                <Car className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Vehicles</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{vehiclesWithChallans}</p>
            </div>
          </div>

          {/* Vehicle Breakdown - only if multiple vehicles */}
          {summaries.length > 0 && (
            <div className="border-t border-red-100 bg-white/50">
              {summaries.map((summary, index) => (
                <Link
                  key={summary.vehicleId}
                  to={`/vehicle/${summary.vehicleId}?tab=challan`}
                  className={`flex items-center justify-between p-3 px-4 hover:bg-red-50 transition-colors group ${
                    index !== summaries.length - 1 ? 'border-b border-red-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-medium text-gray-900">
                      {summary.registrationNumber}
                    </span>
                    <Badge variant="outline" className="text-red-600 border-red-200 text-xs">
                      {summary.pendingCount} challan{summary.pendingCount > 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      ₹{summary.totalFine.toLocaleString('en-IN')}
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ChallanSummaryWidget;
