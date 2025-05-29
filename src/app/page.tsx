import NutriSnapPage from "@/components/app/NutriSnapPage";
import { Header } from "@/components/app/Header";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-2 sm:px-4 py-6 sm:py-10 flex flex-col items-center">
        <NutriSnapPage />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} NutriSnap. AI tomonidan quvvatlanadi.</p>
      </footer>
    </div>
  );
}
