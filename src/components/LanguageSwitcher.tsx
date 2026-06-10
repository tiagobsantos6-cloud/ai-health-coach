import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";

type Props = { className?: string };

export function LanguageSwitcher({ className = "" }: Props) {
  const { i18n: i18nInstance } = useTranslation();
  const atual = i18nInstance.language?.startsWith("en") ? "en" : "pt";
  const mudar = (lang: "pt" | "en") => {
    i18n.changeLanguage(lang);
    try { localStorage.setItem("idioma", lang); } catch { /* ignore */ }
  };
  const base = "px-2 py-1 rounded-md text-xs font-semibold transition-colors";
  return (
    <div className={`flex gap-1 ${className}`} role="group" aria-label="Language">
      <button
        type="button"
        onClick={() => mudar("pt")}
        className={`${base} ${atual === "pt" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
        aria-pressed={atual === "pt"}
      >
        🇧🇷 PT
      </button>
      <button
        type="button"
        onClick={() => mudar("en")}
        className={`${base} ${atual === "en" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
        aria-pressed={atual === "en"}
      >
        🇺🇸 EN
      </button>
    </div>
  );
}
