import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Car } from "lucide-react";

interface VehicleProfileImageProps {
  filePath: string;
  className?: string;
}

const VehicleProfileImage = ({ filePath, className }: VehicleProfileImageProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      try {
        const { data } = await supabase.storage
          .from("vehicle-documents")
          .createSignedUrl(filePath, 3600); // 1 hour expiry

        if (data?.signedUrl) {
          setImageUrl(data.signedUrl);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Error loading vehicle image:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [filePath]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-muted animate-pulse ${className || "w-full h-full"}`}>
        <Car className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className={`flex items-center justify-center bg-primary/10 ${className || "w-full h-full"}`}>
        <Car className="h-6 w-6 text-primary" />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt="Vehicle"
      className={`object-cover ${className || "w-full h-full"}`}
      onError={() => setError(true)}
    />
  );
};

export default VehicleProfileImage;
