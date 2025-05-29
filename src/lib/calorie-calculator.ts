
export type Sex = "male" | "female";
export type ActivityLevel = 
  | "sedentary" 
  | "lightly_active" 
  | "moderately_active" 
  | "very_active" 
  | "extra_active";
export type Goal = "lose" | "maintain" | "gain";

const activityMultipliers: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

// Mifflin-St Jeor Equation
export function calculateBMR(age: number, heightCm: number, weightKg: number, sex: Sex): number {
  let bmr: number;
  if (sex === "male") {
    bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5;
  } else { // female
    bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;
  }
  return Math.round(bmr);
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  const multiplier = activityMultipliers[activityLevel] || 1.2; // Default to sedentary if somehow invalid
  return Math.round(bmr * multiplier);
}

export function calculateTargetCalories(tdee: number, goal: Goal): number {
  let target: number;
  switch (goal) {
    case "lose":
      target = tdee - 500; // Typical deficit for ~0.5kg/week loss
      break;
    case "gain":
      target = tdee + 300; // Typical surplus for ~0.25-0.5kg/week gain, can be adjusted
      break;
    case "maintain":
    default:
      target = tdee;
      break;
  }
  return Math.round(target);
}
