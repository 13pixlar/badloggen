export const SUCCESS_MESSAGES = [
  { emoji: "🌊", title: "Dopp registrerat!", subtitle: "Grymt jobbat – ännu ett bad i loggen." },
  { emoji: "🥶", title: "Brrr, modigt!", subtitle: "Ett kallt dopp är nu sparat." },
  { emoji: "☀️", title: "Underbart!", subtitle: "Solen och vattnet – perfekt kombination." },
  { emoji: "🏊", title: "Plask plask!", subtitle: "Badet är sparat. Härligt!" },
  { emoji: "💦", title: "Fräscht!", subtitle: "Ett till minnesvärt bad i böckerna." },
  { emoji: "🫧", title: "Så härligt!", subtitle: "Doppet är registrerat. Bra jobbat!" },
  { emoji: "❄️", title: "Isbad?", subtitle: "Mod på riktigt – nu är det loggat." },
  { emoji: "🧊", title: "Kallsim!", subtitle: "Du är en hjälte. Badet är sparat." },
] as const;

export function getRandomSuccessMessage() {
  return SUCCESS_MESSAGES[Math.floor(Math.random() * SUCCESS_MESSAGES.length)];
}
