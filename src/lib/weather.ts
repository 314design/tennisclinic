/** WMO hava kodları → Türkçe açıklama */
export function weatherDescription(code: number): string {
  if (code === 0) return "Açık";
  if (code <= 2) return "Parçalı bulutlu";
  if (code === 3) return "Kapalı";
  if (code === 45 || code === 48) return "Sisli";
  if (code >= 51 && code <= 57) return "Çisenti";
  if (code >= 61 && code <= 67) return "Yağmurlu";
  if (code >= 71 && code <= 77) return "Karlı";
  if (code >= 80 && code <= 82) return "Sağanak";
  if (code >= 85 && code <= 86) return "Kar sağanağı";
  if (code >= 95) return "Gök gürültülü";
  return "—";
}

export type WeatherKind = "clear" | "partly" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "storm";

export function weatherKind(code: number): WeatherKind {
  if (code === 0) return "clear";
  if (code <= 2) return "partly";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  return "storm";
}
