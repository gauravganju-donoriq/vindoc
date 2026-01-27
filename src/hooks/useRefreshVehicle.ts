import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { differenceInHours, differenceInMinutes } from "date-fns";

const REFRESH_COOLDOWN_HOURS = 48;

interface UseRefreshVehicleOptions {
  vehicleId: string;
  registrationNumber: string;
  dataLastFetchedAt: string | null;
  onSuccess: () => void;
}

export function useRefreshVehicle({
  vehicleId,
  registrationNumber,
  dataLastFetchedAt,
  onSuccess,
}: UseRefreshVehicleOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const getTimeUntilRefresh = () => {
    if (!dataLastFetchedAt) return null;
    
    const lastFetched = new Date(dataLastFetchedAt);
    const now = new Date();
    const hoursSinceLastFetch = differenceInHours(now, lastFetched);
    
    if (hoursSinceLastFetch >= REFRESH_COOLDOWN_HOURS) {
      return null; // Can refresh now
    }
    
    const hoursRemaining = REFRESH_COOLDOWN_HOURS - hoursSinceLastFetch;
    const totalMinutesRemaining = differenceInMinutes(
      new Date(lastFetched.getTime() + REFRESH_COOLDOWN_HOURS * 60 * 60 * 1000),
      now
    );
    const minutesRemaining = totalMinutesRemaining % 60;
    
    return {
      hours: Math.floor(hoursRemaining),
      minutes: minutesRemaining,
    };
  };

  const canRefresh = !dataLastFetchedAt || !getTimeUntilRefresh();

  const refreshVehicleData = async () => {
    if (!canRefresh) {
      toast({
        title: "Refresh not available",
        description: "You can only refresh vehicle data once every 48 hours.",
        variant: "destructive",
      });
      return;
    }

    setIsRefreshing(true);
    try {
      // Fetch fresh data from the edge function
      const { data, error } = await supabase.functions.invoke("fetch-vehicle-details", {
        body: { registrationNumber },
      });

      if (error) throw error;

      if (data && data.success) {
        // Update the vehicle record with fresh data
        const { error: updateError } = await supabase
          .from("vehicles")
          .update({
            owner_name: data.vehicleData.owner_name,
            vehicle_class: data.vehicleData.vehicle_class,
            fuel_type: data.vehicleData.fuel_type,
            maker_model: data.vehicleData.maker_model,
            manufacturer: data.vehicleData.manufacturer,
            registration_date: data.vehicleData.registration_date,
            insurance_company: data.vehicleData.insurance_company,
            insurance_expiry: data.vehicleData.insurance_expiry,
            pucc_valid_upto: data.vehicleData.pucc_valid_upto,
            fitness_valid_upto: data.vehicleData.fitness_valid_upto,
            road_tax_valid_upto: data.vehicleData.road_tax_valid_upto,
            rc_status: data.vehicleData.rc_status,
            engine_number: data.vehicleData.engine_number,
            chassis_number: data.vehicleData.chassis_number,
            color: data.vehicleData.color,
            seating_capacity: data.vehicleData.seating_capacity,
            cubic_capacity: data.vehicleData.cubic_capacity,
            owner_count: data.vehicleData.owner_count,
            emission_norms: data.vehicleData.emission_norms,
            is_financed: data.vehicleData.is_financed,
            financer: data.vehicleData.financer,
            noc_details: data.vehicleData.noc_details,
            raw_api_data: data.rawData,
            data_last_fetched_at: new Date().toISOString(),
          })
          .eq("id", vehicleId);

        if (updateError) throw updateError;

        toast({
          title: "Vehicle data refreshed",
          description: "Latest vehicle details have been fetched successfully.",
        });

        onSuccess();
      } else {
        toast({
          title: "Refresh failed",
          description: data?.message || "Could not fetch vehicle details from the database.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Refresh error:", error);
      toast({
        title: "Error refreshing data",
        description: error.message || "Could not connect to the vehicle database.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return {
    isRefreshing,
    canRefresh,
    getTimeUntilRefresh,
    refreshVehicleData,
  };
}
