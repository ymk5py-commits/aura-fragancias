import { useEffect } from 'react';

const SITE = 'https://aurafrangancias.store';

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

interface SeoProps {
  title?: string;
  description?: string;
  /** Ruta canónica relativa, ej. "/hombres". Por defecto, la actual. */
  path?: string;
  image?: string;
  jsonLd?: object | object[];
}

/** Actualiza title/description/canonical/OG y JSON-LD por ruta (client-side). */
const Seo: React.FC<SeoProps> = ({ title, description, path, image, jsonLd }) => {
  const ld = jsonLd ? JSON.stringify(jsonLd) : '';
  useEffect(() => {
    if (title) {
      document.title = title;
      upsertMeta('property', 'og:title', title);
      upsertMeta('name', 'twitter:title', title);
    }
    if (description) {
      upsertMeta('name', 'description', description);
      upsertMeta('property', 'og:description', description);
      upsertMeta('name', 'twitter:description', description);
    }
    const url = SITE + (path || window.location.pathname);
    upsertLink('canonical', url);
    upsertMeta('property', 'og:url', url);
    if (image) {
      upsertMeta('property', 'og:image', image);
      upsertMeta('name', 'twitter:image', image);
    }

    let script: HTMLScriptElement | null = null;
    if (ld) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo', 'route');
      script.textContent = ld;
      document.head.appendChild(script);
    }
    return () => {
      script?.remove();
    };
  }, [title, description, path, image, ld]);

  return null;
};

export default Seo;
