import { NutriSnapLogo } from '@/components/app/NutriSnapLogo';

export function Header() {
  return (
    <header className="py-4 px-6 border-b border-border shadow-sm sticky top-0 bg-background/80 backdrop-blur-md z-50">
      <div className="container mx-auto flex items-center justify-between">
        <NutriSnapLogo />
      </div>
    </header>
  );
}
