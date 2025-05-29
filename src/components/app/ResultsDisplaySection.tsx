import type { AnalyzeFoodNutritionalContentOutput } from "@/ai/flows/analyze-food-nutritional-content";
import { NutrientCard } from "@/components/app/NutrientCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Beef, CookingPot, Wheat, Leaf, Utensils } from "lucide-react";

interface ResultsDisplaySectionProps {
  data: AnalyzeFoodNutritionalContentOutput;
}

export function ResultsDisplaySection({ data }: ResultsDisplaySectionProps) {
  return (
    <Card className="w-full shadow-xl rounded-xl overflow-hidden">
      <CardHeader className="bg-muted/30 p-6">
        <CardTitle className="text-2xl font-semibold text-primary">Ozuqaviy tarkib</CardTitle>
        <CardDescription>Tahlil qilingan ovqat uchun taxminiy ozuqaviy qiymatlar.</CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <NutrientCard label="Kaloriyalar" value={data.calories} unit="kkal" icon={Flame} />
          <NutrientCard label="Oqsil" value={data.protein} unit="g" icon={Beef} />
          <NutrientCard label="Yog'" value={data.fat} unit="g" icon={CookingPot} />
          <NutrientCard label="Uglevodlar" value={data.carbohydrates} unit="g" icon={Wheat} />
          <NutrientCard label="Porsiya hajmi" value={data.portionSize} icon={Utensils} />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NutrientCard label="Vitaminlar" value="" icon={Leaf} details={data.vitamins} />
          <NutrientCard label="Minerallar" value="" icon={Leaf} details={data.minerals} />
        </div>
      </CardContent>
    </Card>
  );
}
