import { useState } from "react";
import i18n from "@/lib/i18n";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const [idioma, setIdioma] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("idioma") ?? "pt" : "pt",
  );
  const set = (lng: "pt" | "en") => {
    i18n.changeLanguage(lng);
    if (typeof window !== "undefined") localStorage.setItem("idioma", lng);
    setIdioma(lng);
  };
  return (
    <div className={`absolute top-3 right-3 flex gap-1 ${className}`}>
      <button
        type="button"
        onClick={() => set("pt")}
        aria-label="Português"
        className={`px-2 py-1 rounded-md text-base ${idioma === "pt" ? "bg-primary/10 ring-1 ring-primary" : "opacity-60 hover:opacity-100"}`}
      >
        🇧🇷
      </button>
      <button
        type="button"
        onClick={() => set("en")}
        aria-label="English"
        className={`px-2 py-1 rounded-md text-base ${idioma === "en" ? "bg-primary/10 ring-1 ring-primary" : "opacity-60 hover:opacity-100"}`}
      >
        🇺🇸
      </button>
    </div>
  );
}
