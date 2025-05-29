import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface NutrientCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  details?: string; // For vitamins/minerals lists
}

export function NutrientCard({ label, value, unit, icon: Icon, details }: NutrientCardProps) {
  return (
    <Card className="shadow-lg_ transition-all hover:shadow-xl rounded-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium text-foreground">{label}</CardTitle>
        <Icon className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {details ? (
          <p className="text-xs text-muted-foreground whitespace-pre-line h-24 overflow-y-auto">{details}</p>
        ) : (
          <>
            <div className="text-2xl font-bold text-primary">
              {value}
              {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
