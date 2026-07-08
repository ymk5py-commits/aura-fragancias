import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface LegalArticleProps {
  title: string;
  content: string;
  children?: React.ReactNode;
}

/** Página de texto legal/institucional indexable (server component). */
export default function LegalArticle({ title, content, children }: LegalArticleProps) {
  return (
    <main className="flex-grow pt-32 pb-20 min-h-screen bg-white">
      <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
        <nav aria-label="Ruta de navegación" className="flex items-center gap-1.5 mb-8 text-[10px] font-bold tracking-[0.15em] uppercase text-zinc-400">
          <Link href="/" className="hover:text-zinc-900 transition-colors">Inicio</Link>
          <ChevronRight size={12} />
          <span className="text-zinc-700">{title}</span>
        </nav>

        <h1 className="text-4xl sm:text-5xl font-luxury text-zinc-900 leading-tight mb-10">{title}</h1>

        <div className="space-y-4">
          {content.split('\n').map((paragraph, index) =>
            paragraph.trim() ? (
              <p key={index} className="text-zinc-700 text-base leading-relaxed whitespace-pre-line">
                {paragraph.trim()}
              </p>
            ) : null
          )}
        </div>

        {children}

        <div className="mt-14 pt-10 border-t border-zinc-100 flex flex-col sm:flex-row gap-4">
          <Link
            href="/hombres"
            className="bg-aura-ink text-white px-8 py-4 text-[10px] font-bold tracking-[0.25em] uppercase text-center hover:bg-aura-gold transition-colors"
          >
            Ver Catálogo
          </Link>
          <Link
            href="/"
            className="border border-zinc-200 text-zinc-700 px-8 py-4 text-[10px] font-bold tracking-[0.25em] uppercase text-center hover:border-zinc-900 transition-colors"
          >
            Volver al Inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
