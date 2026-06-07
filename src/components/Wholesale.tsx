
import React from 'react';
import { SCALES } from '../constants';
import { useSettings } from '../context/SettingsContext';
import { TrendingUp, CheckCircle } from 'lucide-react';

const Wholesale: React.FC = () => {
  const { settings } = useSettings();
  const wholesaleMessage = encodeURIComponent("Hola Äura, me gustaría recibir información para ser mayorista.");

  return (
    <section id="mayoristas" className="py-24 bg-zinc-900 text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1/3 h-full bg-aura-gold/5 -skew-x-12 transform translate-x-20"></div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-luxury mb-8">Ventas Mayoristas</h2>
            <p className="text-zinc-400 text-lg mb-10 font-light leading-relaxed">
              Emprendé con Äura. Ofrecemos las mejores escalas de precio para que puedas revender perfumes de altísima calidad con el margen más alto del mercado.
            </p>

            <div className="space-y-6 mb-12">
              <div className="flex gap-4">
                <CheckCircle className="text-aura-gold shrink-0" />
                <div>
                  <h4 className="font-bold text-white uppercase text-xs tracking-widest mb-1">Baja Inversión</h4>
                  <p className="text-zinc-500 text-sm">Escalas flexibles para comenzar tu negocio hoy mismo.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle className="text-aura-gold shrink-0" />
                <div>
                  <h4 className="font-bold text-white uppercase text-xs tracking-widest mb-1">Calidad Garantizada</h4>
                  <p className="text-zinc-500 text-sm">Tu cliente vuelve siempre por la fijación del 30%.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle className="text-aura-gold shrink-0" />
                <div>
                  <h4 className="font-bold text-white uppercase text-xs tracking-widest mb-1">Asesoramiento</h4>
                  <p className="text-zinc-500 text-sm">Te ayudamos a elegir los perfumes más vendidos de la temporada.</p>
                </div>
              </div>
            </div>

            <a 
              href={`https://wa.me/${settings.whatsappNumber}?text=${wholesaleMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-white text-zinc-900 px-10 py-4 rounded-full text-sm font-bold tracking-widest hover:bg-aura-gold transition-colors"
            >
              SOLICITAR LISTA MAYORISTA
            </a>
          </div>

          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-2xl">
            <h3 className="text-2xl font-luxury mb-8 text-center">Escalas de Inversión</h3>
            <div className="space-y-4">
              {SCALES.map((scale, i) => (
                <div key={i} className="flex justify-between items-center p-5 rounded-xl bg-white/5 border border-white/5 hover:border-aura-gold/50 transition-colors">
                  <span className="text-lg font-light">{scale.units}</span>
                  <span className="text-aura-gold font-bold text-sm tracking-widest uppercase">{scale.discount}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-10 p-6 bg-aura-gold/10 rounded-xl border border-aura-gold/20 text-center">
              <TrendingUp className="mx-auto text-aura-gold mb-3" />
              <p className="text-sm italic text-aura-gold font-medium">Margen de ganancia superior al 100% sugerido.</p>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
};

export default Wholesale;
