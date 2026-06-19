const ICON_EMOJI: Record<string, string> = {
  clear: "☀️",
  "partly-cloudy": "⛅",
  cloudy: "☁️",
  fog: "🌫️",
  drizzle: "🌦️",
  rain: "🌧️",
  snow: "❄️",
  thunderstorm: "⛈️",
};

interface WeatherIconProps {
  icon: string | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-5xl",
};

export function WeatherIcon({ icon, size = "md", className = "" }: WeatherIconProps) {
  const emoji = ICON_EMOJI[icon ?? ""] ?? "🌡️";
  return (
    <span className={`${sizeClasses[size]} ${className}`} role="img" aria-hidden>
      {emoji}
    </span>
  );
}

export function getWeatherEmoji(icon: string | null | undefined): string {
  return ICON_EMOJI[icon ?? ""] ?? "🌡️";
}
