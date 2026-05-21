import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export function LoadingPlano({ mensagem = "Carregando seu plano..." }: { mensagem?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
      <div className="text-center space-y-6">
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 1.8 }}
          className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30"
        >
          <Sparkles className="w-10 h-10 text-primary-foreground" />
        </motion.div>
        <div>
          <h1 className="text-xl font-bold mb-1">VitaIA</h1>
          <p className="text-sm text-muted-foreground">{mensagem}</p>
        </div>
        <div className="flex justify-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
