import { Salad } from 'lucide-react';
import type { SVGProps } from 'react';

export function NutriSnapLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <div className="flex items-center gap-2">
      <Salad className="h-8 w-8 text-primary" {...props} />
      <span className="text-2xl font-bold text-primary">NutriSnap</span>
    </div>
  );
}
