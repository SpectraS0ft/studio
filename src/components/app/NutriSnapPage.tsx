
"use client";

import { useState, useEffect, type ChangeEvent, useRef } from "react";
import Image from "next/image";
import { analyzeFoodNutritionalContent, type AnalyzeFoodNutritionalContentOutput } from "@/ai/flows/analyze-food-nutritional-content";
import { identifyFoodFromImage } from "@/ai/flows/identify-food-from-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ResultsDisplaySection } from "@/components/app/ResultsDisplaySection";
import { useToast } from "@/hooks/use-toast";
import { Camera, Type, Zap, Loader2, AlertTriangle, XCircle, CheckCircle, User, Scale, Ruler, Activity, Target, TrendingDown, TrendingUp, Settings2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculateBMR, calculateTDEE, calculateTargetCalories, type Sex, type ActivityLevel, type Goal } from "@/lib/calorie-calculator";
import { Separator } from "@/components/ui/separator";

type LoadingState = "idle" | "identifying" | "analyzing";

interface CalculatedNeeds {
  bmr: number;
  tdee: number;
  targetCalories: number;
  goal: Goal;
}

const goalTranslations: Record<Goal, string> = {
  lose: "Vazn yo'qotish",
  maintain: "Vaznni saqlash",
  gain: "Vazn olish",
};

export default function NutriSnapPage() {
  const [activeTab, setActiveTab] = useState<"image" | "text">("image");
  
  const [capturedImageDataUri, setCapturedImageDataUri] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [constraints, setConstraints] = useState<string>("");
  const [typedFoodName, setTypedFoodName] = useState<string>("");
  const [identifiedFoodItems, setIdentifiedFoodItems] = useState<string[] | null>(null);
  const [nutritionalInfo, setNutritionalInfo] = useState<AnalyzeFoodNutritionalContentOutput | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // User profile state
  const [age, setAge] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [sex, setSex] = useState<Sex | "">("");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | "">("");
  const [goal, setGoal] = useState<Goal | "">("");
  const [calculatedNeeds, setCalculatedNeeds] = useState<CalculatedNeeds | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);


  useEffect(() => {
    let streamInstance: MediaStream | null = null;

    const getCameraPermission = async () => {
      setHasCameraPermission(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        streamInstance = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(playError => {
                console.error("Error attempting to play video:", playError);
                toast({ variant: "destructive", title: "Ijro etishda xatolik", description: "Kamera tasvirini avtomatik ijro etib bo‘lmadi."});
            });
          };
        }
        setHasCameraPermission(true);
      } catch (err) {
        console.error('Error accessing camera:', err);
        setHasCameraPermission(false);
        setIsCameraOpen(false);
        toast({
          variant: 'destructive',
          title: 'Kameraga kirish rad etildi',
          description: 'Iltimos, brauzer sozlamalarida ushbu sayt uchun kamera ruxsatlarini yoqing. Ruxsatlarni o\'zgartirgandan so\'ng sahifani yangilashingiz kerak bo\'lishi mumkin.',
        });
      }
    };

    if (isCameraOpen) {
      getCameraPermission();
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const currentStream = videoRef.current.srcObject as MediaStream;
        currentStream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    }

    return () => {
      if (streamInstance) {
        streamInstance.getTracks().forEach(track => track.stop());
      } else if (videoRef.current && videoRef.current.srcObject) {
          const currentStream = videoRef.current.srcObject as MediaStream;
          currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraOpen, toast]);


  const clearCapturedPhoto = () => {
    setCapturedImageDataUri(null);
    setIdentifiedFoodItems(null);
    setNutritionalInfo(null);
    setError(null);
  };

  const handleOpenCamera = () => {
    setCapturedImageDataUri(null);
    setIdentifiedFoodItems(null);
    setNutritionalInfo(null);
    setError(null);
    setIsCameraOpen(true);
  };

  const handleCloseCamera = () => {
    setIsCameraOpen(false);
  };

  const handleSnapPhoto = () => {
    if (videoRef.current && canvasRef.current && videoRef.current.readyState >= videoRef.current.HAVE_METADATA) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImageDataUri(dataUri);
        setIdentifiedFoodItems(null);
        setNutritionalInfo(null);
        setError(null);
      } else {
         setError("Rasmni suratga olib bo'lmadi. Canvas konteksti mavjud emas.");
         toast({ variant: "destructive", title: "Suratga olishda xatolik", description: "Canvas kontekstini olib bo'lmadi."});
      }
    } else {
       setError("Rasmni suratga olib bo'lmadi. Kamera tayyor emas yoki topilmadi.");
       toast({ variant: "destructive", title: "Suratga olishda xatolik", description: "Kamera komponenti tayyor emas."});
    }
  };

  const handleIdentifyFood = async () => {
    if (!capturedImageDataUri) {
      setError("Iltimos, avval suratga oling.");
      toast({ variant: "destructive", title: "Rasm yo'q", description: "Aniqlash uchun rasm oling." });
      return;
    }
    setLoadingState("identifying");
    setError(null);
    setIdentifiedFoodItems(null);
    setNutritionalInfo(null);

    try {
      const result = await identifyFoodFromImage({ photoDataUri: capturedImageDataUri, constraints });
      if (result.foodItems && result.foodItems.length > 0) {
        setIdentifiedFoodItems(result.foodItems);
        toast({
          title: "Ovqat muvaffaqiyatli aniqlandi",
          description: `${result.foodItems.length} ta mahsulot aniqlandi. Tahlil qilish uchun birini tanlang.`,
          variant: "default",
          action: <CheckCircle className="text-green-500" />
        });
      } else {
        setError("Hech qanday oziq-ovqat mahsuloti aniqlanmadi. Boshqa rasmga oling yoki cheklovlar qo'shing.");
         toast({
          title: "Aniqlash amalga oshmadi",
          description: "Hech qanday oziq-ovqat mahsuloti aniqlanmadi. Boshqa rasmga oling yoki cheklovlar qo'shing.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error identifying food:", err);
      const errorMessage = err instanceof Error ? err.message : "Ovqatni aniqlashda noma'lum xatolik yuz berdi.";
      setError(errorMessage);
      toast({
        title: "Aniqlashda xatolik",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoadingState("idle");
    }
  };

  const analyzeFood = async (foodDescription: string, foodDataUri?: string) => {
    setLoadingState("analyzing");
    setError(null);
    setNutritionalInfo(null);
    try {
      const analysisInput: { foodDescription?: string, foodDataUri?: string } = {};
      if (foodDescription) analysisInput.foodDescription = foodDescription;
      if (foodDataUri) analysisInput.foodDataUri = foodDataUri;
      
      const result = await analyzeFoodNutritionalContent(analysisInput);
      setNutritionalInfo(result);
      toast({
        title: "Ozuqaviy tahlil yakunlandi",
        description: `${foodDescription} uchun ma'lumotlar ko'rsatilmoqda.`,
        variant: "default",
        action: <CheckCircle className="text-green-500" />
      });
    } catch (err) {
      console.error("Error analyzing nutrition:", err);
      const errorMessage = err instanceof Error ? err.message : "Ozuqaviy tahlil paytida noma'lum xatolik yuz berdi.";
      setError(errorMessage);
      toast({
        title: "Tahlilda xatolik",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoadingState("idle");
    }
  }

  const handleAnalyzeIdentifiedFood = async (foodName: string) => {
    if (capturedImageDataUri) {
      analyzeFood(foodName, capturedImageDataUri);
    } else {
      analyzeFood(foodName); 
    }
  };
  
  const handleAnalyzeTypedFood = () => {
    if (!typedFoodName.trim()) {
      setError("Iltimos, ovqat nomini kiriting.");
      return;
    }
    analyzeFood(typedFoodName.trim());
  };

  const handleCalculateNeeds = () => {
    setProfileError(null);
    const ageNum = parseInt(age);
    const heightNum = parseFloat(height);
    const weightNum = parseFloat(weight);

    if (isNaN(ageNum) || ageNum <= 0) {
      setProfileError("Iltimos, yaroqli yoshni kiriting.");
      return;
    }
    if (isNaN(heightNum) || heightNum <= 0) {
      setProfileError("Iltimos, sm da yaroqli bo'yni kiriting.");
      return;
    }
    if (isNaN(weightNum) || weightNum <= 0) {
      setProfileError("Iltimos, kg da yaroqli vaznni kiriting.");
      return;
    }
    if (!sex) {
      setProfileError("Iltimos, jinsingizni tanlang.");
      return;
    }
    if (!activityLevel) {
      setProfileError("Iltimos, faollik darajangizni tanlang.");
      return;
    }
    if (!goal) {
      setProfileError("Iltimos, vazn maqsadingizni tanlang.");
      return;
    }

    const bmr = calculateBMR(ageNum, heightNum, weightNum, sex);
    const tdee = calculateTDEE(bmr, activityLevel);
    const targetCalories = calculateTargetCalories(tdee, goal);

    setCalculatedNeeds({ bmr, tdee, targetCalories, goal });
    toast({ title: "Kaloriya ehtiyojlari hisoblandi", description: "Sizning kunlik maqsadlaringiz endi ko'rsatiladi." });
  };

  const CurrentLoader = ({text}: {text: string}) => (
    <div className="flex flex-col justify-center items-center py-8 space-y-2">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-lg text-muted-foreground font-medium">{text}</p>
      <p className="text-sm text-muted-foreground">Bu biroz vaqt olishi mumkin.</p>
    </div>
  );

  const getGoalIcon = (currentGoal: Goal) => {
    if (currentGoal === "lose") return <TrendingDown className="h-5 w-5 text-blue-500" />;
    if (currentGoal === "gain") return <TrendingUp className="h-5 w-5 text-green-500" />;
    return <Settings2 className="h-5 w-5 text-gray-500" />; // Maintain
  };
  
  const translatedGoalText = calculatedNeeds?.goal ? goalTranslations[calculatedNeeds.goal] : "";


  return (
    <div className="w-full max-w-3xl space-y-8 p-2 sm:p-4">
      
      <Card className="shadow-lg border-border hover:border-primary/30 transition-colors">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2"><User className="text-primary"/>Sizning profilingiz va kaloriya rejalashtiruvchisi</CardTitle>
          <CardDescription>Kunlik kaloriya ehtiyojlaringizni hisoblash va reja tuzish uchun ma'lumotlaringizni kiriting.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="age">Yosh (Yillar)</Label>
              <Input id="age" type="number" placeholder="Masalan, 30" value={age} onChange={(e) => setAge(e.target.value)} disabled={loadingState !== "idle"} />
            </div>
            <div>
              <Label htmlFor="height">Bo'y (sm)</Label>
              <Input id="height" type="number" placeholder="Masalan, 175" value={height} onChange={(e) => setHeight(e.target.value)} disabled={loadingState !== "idle"} />
            </div>
            <div>
              <Label htmlFor="weight">Vazn (kg)</Label>
              <Input id="weight" type="number" placeholder="Masalan, 70" value={weight} onChange={(e) => setWeight(e.target.value)} disabled={loadingState !== "idle"} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="sex">Jins</Label>
              <Select value={sex} onValueChange={(value) => setSex(value as Sex)} disabled={loadingState !== "idle"}>
                <SelectTrigger id="sex"><SelectValue placeholder="Jinsni tanlang" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Erkak</SelectItem>
                  <SelectItem value="female">Ayol</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="activityLevel">Faollik darajasi</Label>
              <Select value={activityLevel} onValueChange={(value) => setActivityLevel(value as ActivityLevel)} disabled={loadingState !== "idle"}>
                <SelectTrigger id="activityLevel"><SelectValue placeholder="Faollik darajasini tanlang" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">Kamharakat (jismoniy mashqlar deyarli yo'q)</SelectItem>
                  <SelectItem value="lightly_active">Yengil faol (haftasiga 1-3 kun)</SelectItem>
                  <SelectItem value="moderately_active">O'rtacha faol (haftasiga 3-5 kun)</SelectItem>
                  <SelectItem value="very_active">Juda faol (haftasiga 6-7 kun)</SelectItem>
                  <SelectItem value="extra_active">Juda faol (juda og'ir mashqlar va jismoniy ish)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="goal">Vazn maqsadi</Label>
              <Select value={goal} onValueChange={(value) => setGoal(value as Goal)} disabled={loadingState !== "idle"}>
                <SelectTrigger id="goal"><SelectValue placeholder="Maqsadni tanlang" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lose">Vazn yo'qotish</SelectItem>
                  <SelectItem value="maintain">Vaznni saqlash</SelectItem>
                  <SelectItem value="gain">Vazn olish</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {profileError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Tasdiqlash xatosi</AlertTitle>
              <AlertDescription>{profileError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleCalculateNeeds} disabled={loadingState !== "idle"} className="w-full">
            <Zap className="mr-2 h-5 w-5"/>Ehtiyojlarimni va rejamni hisoblash
          </Button>
        </CardFooter>
      </Card>

      {calculatedNeeds && (
        <Card className="shadow-lg animate-in fade-in duration-500 border-primary/30">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              {getGoalIcon(calculatedNeeds.goal)}
              Sizning "{translatedGoalText}" uchun kunlik kaloriya rejangiz
            </CardTitle>
            <CardDescription>Sizning profilingizga asoslanib, taxminiy kunlik ehtiyojlaringiz.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
              <span className="font-medium text-foreground">Asosiy metabolizm tezligi (BMR):</span>
              <span className="text-primary font-semibold">{calculatedNeeds.bmr} kkal/kun</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
              <span className="font-medium text-foreground">Umumiy kunlik energiya sarfi (TDEE):</span>
              <span className="text-primary font-semibold">{calculatedNeeds.tdee} kkal/kun</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-accent/20 rounded-md border border-accent">
              <span className="font-bold text-accent-foreground">"{translatedGoalText}" uchun maqsadli kunlik kaloriyalar:</span>
              <span className="text-accent font-bold text-lg">{calculatedNeeds.targetCalories} kkal/kun</span>
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              BMR - bu tanangiz tinch holatda yoqadigan kaloriyalar. TDEE sizning faolligingizni o'z ichiga oladi. Maqsadli kaloriyalar vazn maqsadingizga qarab sozlanadi. Bular taxminiy hisob-kitoblar; shaxsiy maslahat uchun mutaxassis bilan maslahatlashing.
            </p>
          </CardContent>
        </Card>
      )}
      
      <Separator className="my-8" />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "image" | "text")} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sticky top-[calc(theme(spacing.16)_-_1px)] sm:top-[calc(theme(spacing.4)_-_1px)]  z-10 bg-card/90 backdrop-blur-sm mb-6">
          <TabsTrigger value="image" className="py-3 text-base data-[state=active]:shadow-md">
            <Camera className="mr-2 h-5 w-5" />Ovqatni suratga olish
          </TabsTrigger>
          <TabsTrigger value="text" className="py-3 text-base data-[state=active]:shadow-md">
            <Type className="mr-2 h-5 w-5" />Ovqatni yozish
          </TabsTrigger>
        </TabsList>

        <TabsContent value="image" className="space-y-6">
          <Card className="border-2 border-border hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-xl">Ovqat rasmini suratga olish</CardTitle>
              <CardDescription>Ovqatingizni suratga olish uchun kamerangizdan foydalaning.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <div className="relative group w-full aspect-video rounded-lg overflow-hidden border shadow-sm bg-muted/30 flex items-center justify-center">
                {!capturedImageDataUri ? (
                  <>
                    <video 
                      ref={videoRef} 
                      className={`w-full h-full object-cover ${isCameraOpen && hasCameraPermission === true ? '' : 'hidden'}`} 
                      autoPlay 
                      muted 
                      playsInline
                    />
                    {(!isCameraOpen || hasCameraPermission !== true) && (
                      <div className="text-center text-muted-foreground p-4">
                        <Camera size={48} className="mx-auto mb-2 opacity-30" />
                        {hasCameraPermission === false ? "Kameraga kirish rad etildi." : "Kamera o'chirilgan."}
                        <br/>
                        {!isCameraOpen && hasCameraPermission !== false && (
                          <span className="text-sm">Boshlash uchun 'Kamerani ochish' tugmasini bosing.</span>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <Image src={capturedImageDataUri} alt="Suratga olingan ovqat" layout="fill" objectFit="cover" data-ai-hint="food meal" />
                )}
                {capturedImageDataUri && (
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    onClick={clearCapturedPhoto}
                    aria-label="Rasmni o'chirish"
                    disabled={loadingState !== "idle"}
                  >
                    <XCircle className="h-5 w-5"/>
                  </Button>
                )}
              </div>

              {hasCameraPermission === false && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-5 w-5" />
                  <AlertTitle>Kameraga kirish rad etildi</AlertTitle>
                  <AlertDescription>
                    Iltimos, brauzer sozlamalarida ushbu sayt uchun kamera ruxsatlarini yoqing. Ruxsatlarni o'zgartirgandan so'ng sahifani yangilashingiz kerak bo'lishi mumkin.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                {!isCameraOpen && !capturedImageDataUri && (
                  <Button onClick={handleOpenCamera} disabled={loadingState !== "idle"} className="w-full">
                    <Camera className="mr-2 h-5 w-5" /> Kamerani ochish
                  </Button>
                )}
                {isCameraOpen && hasCameraPermission === true && !capturedImageDataUri && (
                  <div className="flex gap-2">
                    <Button onClick={handleSnapPhoto} disabled={loadingState !== "idle" || !videoRef.current?.srcObject} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">
                      <Camera className="mr-2 h-5 w-5" /> Suratga olish
                    </Button>
                    <Button onClick={handleCloseCamera} variant="outline" className="flex-1">
                       Kamerani yopish
                    </Button>
                  </div>
                )}
                {capturedImageDataUri && (
                    <Button onClick={handleOpenCamera} variant="outline" disabled={loadingState !== "idle"} className="w-full">
                      <Camera className="mr-2 h-5 w-5" /> Qayta suratga olish
                    </Button>
                )}
              </div>

              <Textarea
                placeholder="Majburiy emas: Cheklovlar qo'shing (masalan, 'vegetarian', 'kam uglevodli')"
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                className="resize-none"
                rows={2}
                disabled={loadingState !== "idle"}
              />
            </CardContent>
            <CardFooter>
              <Button onClick={handleIdentifyFood} disabled={!capturedImageDataUri || loadingState !== "idle"} className="w-full text-lg py-6">
                <Zap className="mr-2 h-5 w-5" />Suratga olingan ovqatni aniqlash
              </Button>
            </CardFooter>
          </Card>

          {loadingState === "identifying" && <CurrentLoader text="Ovqat aniqlanmoqda..." />}

          {identifiedFoodItems && (
            <Card className="animate-in fade-in duration-500">
              <CardHeader>
                <CardTitle className="text-xl">Aniqlangan ovqatlar ({identifiedFoodItems.length} ta)</CardTitle>
                <CardDescription>Ozuqaviy tarkibini tahlil qilish uchun mahsulotni tanlang yoki yuqoridagi kaloriya rejangizni ko'ring.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                {identifiedFoodItems.map((item, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={() => handleAnalyzeIdentifiedFood(item)}
                    disabled={loadingState !== "idle"}
                    className="transition-all hover:bg-primary/10 hover:text-primary hover:border-primary"
                  >
                    {item}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="text" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Ovqat nomini kiriting</CardTitle>
              <CardDescription>Ozuqaviy tarkibini tahlil qilish uchun ovqat yoki taom nomini yozing.</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                type="text"
                placeholder="Masalan, 'Grilda pishirilgan tovuqli salat' yoki 'Olma'"
                value={typedFoodName}
                onChange={(e) => setTypedFoodName(e.target.value)}
                className="text-base"
                disabled={loadingState !== "idle"}
              />
            </CardContent>
            <CardFooter>
              <Button onClick={handleAnalyzeTypedFood} disabled={!typedFoodName.trim() || loadingState !== "idle"} className="w-full text-lg py-6">
                <Zap className="mr-2 h-5 w-5" />Ozuqaviy tahlil qilish
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      {loadingState === "analyzing" && <CurrentLoader text="Ozuqaviy tahlil qilinmoqda..." />}

      {error && (
        <Alert variant="destructive" className="animate-in fade-in duration-300">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="font-semibold">Voy! Nimadir xato ketdi.</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {nutritionalInfo && (
        <div className="mt-8 animate-in fade-in duration-500">
          <ResultsDisplaySection data={nutritionalInfo} />
        </div>
      )}
    </div>
  );
}
