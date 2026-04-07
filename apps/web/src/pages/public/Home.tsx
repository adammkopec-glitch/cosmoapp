import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { PageSEO } from '@/components/shared/SEO';
import { ConsultationModal } from '@/components/public/ConsultationModal';
import { HeroSlider } from '@/components/public/HeroSlider';
import { employeesApi } from '@/api/employees.api';
import { useAuth } from '@/hooks/useAuth';

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Gdzie jest dobry podolog w Limanowej?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Gabinet Cosmo w Limanowej oferuje profesjonalne usługi podologiczne: leczenie wrastających paznokci, usuwanie odcisków, pielęgnację stóp oraz terapię grzybicy. Nasz doświadczony podolog przyjmuje po wcześniejszej rezerwacji.',
      },
    },
    {
      '@type': 'Question',
      name: 'Ile kosztuje laminowanie brwi w Limanowej?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Koszt laminowania brwi w salonie Cosmo w Limanowej sprawdzisz w zakładce Usługi. Oferujemy konkurencyjne ceny oraz pakiety łączone z henna lub regulacją brwi. Zapraszamy do kontaktu po aktualny cennik.',
      },
    },
    {
      '@type': 'Question',
      name: 'Czy wykonujecie zabiegi w Laskowej i Mordarce?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Nasz salon działa stacjonarnie w Limanowej, jednak obsługujemy klientów z Laskowej, Mordarki, Dobrej, Tymbarku i wielu innych okolicznych miejscowości. Dojazd do nas z tych miejscowości zajmuje zazwyczaj kilkanaście minut.',
      },
    },
    {
      '@type': 'Question',
      name: 'Jak leczyć wrastający paznokieć w Limanowej?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Wrastający paznokieć to problem, który wymaga interwencji podologicznej. W gabinecie Cosmo w Limanowej wykonujemy bezbolesny zabieg korekty wrastającego paznokcia z użyciem klamry podologicznej lub techniki tamponowania. Zadzwoń, aby umówić konsultację.',
      },
    },
    {
      '@type': 'Question',
      name: 'Czy wykonujecie lifting i przedłużanie rzęs w Limanowej?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Tak! W salonie Cosmo w Limanowej oferujemy lifting rzęs, laminowanie rzęs oraz przedłużanie rzęs metodą 1:1 i objętościową. Zabiegi wykonujemy przy użyciu sprawdzonych preparatów i z pełnym profesjonalizmem.',
      },
    },
  ],
};

const tickerItems = [
  'Laminowanie rzęs',
  'Manicure',
  'Pedicure',
  'Podologia',
  'Lifting brwi',
  'Henna brwi',
  'Zabiegi na twarz',
  'Peeling chemiczny',
];

const testimonials = [
  {
    quote: 'Po raz pierwszy poczułam, że ktoś naprawdę rozumie moją skórę i wie, czego potrzebuję.',
    author: 'Kasia M.',
    label: 'Klientka od 2 lat',
  },
  {
    quote: 'Wychodząc z gabinetu czuję się jak nowa osoba. Profesjonalizm na najwyższym poziomie.',
    author: 'Anna W.',
    label: 'Klientka od roku',
  },
  {
    quote: 'Najlepszy salon w okolicy — dbałość o detal i autentyczna troska o klienta.',
    author: 'Marta K.',
    label: 'Stała klientka',
  },
];

const formatNextSlot = (date: string, time: string) => {
  const d = new Date(`${date}T${time}`);
  const day = d.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' });
  return { day, time };
};

export const Home = () => {
  const [consultationOpen, setConsultationOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  const { data: nextSlot, isLoading: nextSlotLoading } = useQuery({
    queryKey: ['next-available-slot'],
    queryFn: employeesApi.getNextAvailable,
    staleTime: 10 * 60_000,
  });

  const formattedSlot = nextSlot ? formatNextSlot(nextSlot.date, nextSlot.time) : null;

  return (
    <div className="flex flex-col min-h-screen">
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          animation: ticker 20s linear infinite;
        }
      `}</style>

      <PageSEO
        title="Salon Kosmetyczny & Gabinet Podologiczny Limanowa"
        description="Profesjonalny salon kosmetologiczny i gabinet podologiczny w Limanowej. Zabiegi na twarz, brwi, rzęsy, manicure, pedicure, podologia. Obsługujemy Laskową, Mordarkę, Dobrą i okolice."
        canonical="/"
        schema={faqSchema}
      />

      <main className="flex-1">
        <HeroSlider />

        {/* ── 1. HERO ── */}
        <section className="py-16 md:py-24" style={{ backgroundColor: '#F5F0EB' }}>
          <div className="container max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">

              {/* Left column */}
              <div>
                <div
                  className="inline-block text-xs font-semibold tracking-widest uppercase mb-6 px-4 py-2 rounded-full"
                  style={{ border: '1px solid #B8913A', color: '#B8913A' }}
                >
                  Profesjonalny salon kosmetologiczny
                </div>

                <h1 className="font-heading text-5xl md:text-6xl font-bold leading-tight mb-6" style={{ color: '#1A1208' }}>
                  Twoja pielęgnacja,{' '}
                  <em className="font-heading italic" style={{ color: '#B8913A' }}>nasza pasja</em>
                </h1>

                <p className="text-lg leading-relaxed mb-8" style={{ color: 'rgba(26,18,8,0.65)' }}>
                  Gabinet Cosmo w Limanowej — profesjonalne zabiegi kosmetologiczne
                  i podologiczne w przyjaznej atmosferze. Dbamy o Twój komfort i efekty.
                </p>

                <div className="flex flex-wrap gap-4 mb-6">
                  <Link to="/rezerwacja">
                    <Button
                      size="lg"
                      className="rounded-full px-8 py-6 text-base font-semibold shadow-lg hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: '#1A1208', color: '#fff' }}
                    >
                      Zarezerwuj wizytę →
                    </Button>
                  </Link>
                  <Link to="/uslugi">
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-full px-8 py-6 text-base font-semibold hover:bg-transparent"
                      style={{ borderColor: '#1A1208', color: '#1A1208' }}
                    >
                      Zobacz usługi
                    </Button>
                  </Link>
                </div>

                <p className="text-sm" style={{ color: 'rgba(26,18,8,0.5)' }}>
                  ★ Bezpłatna konsultacja dla nowych klientów
                </p>
              </div>

              {/* Right column — specialist card */}
              <div className="flex flex-col gap-4">
                {/* Main specialist card */}
                <div
                  className="bg-white p-6 flex items-center gap-5 shadow-lg"
                  style={{ borderRadius: '20px' }}
                >
                  {/* Avatar */}
                  <div
                    className="w-16 h-16 flex-shrink-0 flex items-center justify-center text-white font-heading font-bold text-xl"
                    style={{ borderRadius: '50%', backgroundColor: '#B8913A' }}
                  >
                    WĆ
                  </div>
                  <div className="flex-1">
                    <p className="font-heading font-bold text-lg" style={{ color: '#1A1208' }}>
                      Wiktoria Ćwik
                    </p>
                    <p className="text-sm mb-3" style={{ color: 'rgba(26,18,8,0.55)' }}>
                      Kosmetolożka &amp; Podolożka
                    </p>
                    <div className="flex gap-6">
                      <div>
                        <p className="font-bold text-lg" style={{ color: '#B8913A' }}>5+</p>
                        <p className="text-xs" style={{ color: 'rgba(26,18,8,0.5)' }}>lat doświadczenia</p>
                      </div>
                      <div>
                        <p className="font-bold text-lg" style={{ color: '#B8913A' }}>200+</p>
                        <p className="text-xs" style={{ color: 'rgba(26,18,8,0.5)' }}>zadowolonych klientek</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Two small cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className="bg-white p-4 shadow-sm flex flex-col gap-2"
                    style={{ borderRadius: '16px' }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(26,18,8,0.4)' }}>
                      Najbliższy termin
                    </p>
                    {nextSlotLoading ? (
                      <p className="font-heading font-bold text-sm" style={{ color: '#1A1208' }}>Sprawdzam…</p>
                    ) : nextSlot ? (
                      <>
                        <p className="font-heading font-bold leading-tight" style={{ color: '#1A1208' }}>
                          {formattedSlot?.day}
                        </p>
                        <p className="text-sm font-semibold" style={{ color: '#B8913A' }}>
                          {formattedSlot?.time}
                        </p>
                        <Link to={isAuthenticated ? '/rezerwacja' : '/auth/register'}>
                          <Button
                            size="sm"
                            className="w-full mt-1 rounded-full text-xs font-semibold"
                            style={{ backgroundColor: '#1A1208', color: '#fff' }}
                          >
                            {isAuthenticated ? 'Umów wizytę' : 'Zarejestruj się'}
                          </Button>
                        </Link>
                      </>
                    ) : (
                      <p className="text-sm" style={{ color: 'rgba(26,18,8,0.5)' }}>Brak wolnych terminów</p>
                    )}
                  </div>
                  <div
                    className="bg-white p-4 shadow-sm text-center"
                    style={{ borderRadius: '16px' }}
                  >
                    <p className="font-heading font-bold text-3xl" style={{ color: '#B8913A' }}>4.9</p>
                    <p className="text-sm" style={{ color: '#B8913A' }}>★★★★★</p>
                    <p className="text-xs mt-1" style={{ color: 'rgba(26,18,8,0.5)' }}>Ocena Google</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── 2. TICKER ── */}
        <section
          className="overflow-hidden py-4"
          style={{ backgroundColor: '#1C1510', transform: 'translateZ(0)' }}
        >
          <div className="flex whitespace-nowrap ticker-track">
            {[...tickerItems, ...tickerItems].map((item, i) => (
              <span
                key={i}
                className="text-sm font-semibold uppercase mx-8"
                style={{ color: 'rgba(250,247,242,0.5)', letterSpacing: '0.25em' }}
              >
                {item} <span style={{ color: '#C4A882', margin: '0 8px' }}>✦</span>
              </span>
            ))}
          </div>
        </section>

        {/* ── 3. BENTO GRID ── */}
        <section className="py-20" style={{ backgroundColor: '#F5F0EB' }}>
          <div className="container max-w-6xl mx-auto px-6">
            <div className="mb-12 text-center">
              <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: '#B8913A' }}>
                Nasze zabiegi
              </p>
              <h2 className="font-heading text-4xl font-bold" style={{ color: '#1A1208' }}>
                Co robimy najlepiej
              </h2>
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
              {/* Wide card — col-span-2 */}
              <div
                className="bg-white p-8 md:col-span-2 flex flex-col justify-between shadow-sm"
                style={{ borderRadius: '20px', border: '1px solid rgba(0,0,0,0.07)', minHeight: '200px' }}
              >
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
                      style={{ backgroundColor: '#B8913A', color: '#fff' }}
                    >
                      Bestseller
                    </span>
                  </div>
                  <h3 className="font-heading text-2xl font-bold mb-2" style={{ color: '#1A1208' }}>
                    Laminowanie rzęs
                  </h3>
                  <p className="text-base leading-relaxed" style={{ color: 'rgba(26,18,8,0.6)' }}>
                    Spektakularny efekt uniesionych, zagęszczonych rzęs bez konieczności nakładania tuszu — trwa do 6 tygodni.
                  </p>
                </div>
                <p className="font-heading font-bold text-2xl mt-6" style={{ color: '#B8913A' }}>od 149 zł</p>
              </div>

              {/* Stats card */}
              <div
                className="bg-white p-8 flex flex-col justify-center items-center text-center shadow-sm"
                style={{ borderRadius: '20px', border: '1px solid rgba(0,0,0,0.07)' }}
              >
                <p className="font-heading font-bold text-6xl mb-2" style={{ color: '#B8913A' }}>98%</p>
                <p className="font-semibold text-lg" style={{ color: '#1A1208' }}>zadowolonych klientek</p>
                <p className="text-sm mt-2" style={{ color: 'rgba(26,18,8,0.5)' }}>na podstawie opinii Google</p>
              </div>

              {/* Podologia */}
              <div
                className="bg-white p-6 shadow-sm"
                style={{ borderRadius: '20px', border: '1px solid rgba(0,0,0,0.07)' }}
              >
                <svg className="mb-4" width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <path d="M18 4C18 4 8 10 8 20C8 25.5 12.5 30 18 30C23.5 30 28 25.5 28 20C28 10 18 4 18 4Z" stroke="#B8913A" strokeWidth="2" fill="none"/>
                  <circle cx="18" cy="20" r="3" fill="#B8913A"/>
                </svg>
                <h3 className="font-heading font-bold text-lg mb-2" style={{ color: '#1A1208' }}>Podologia</h3>
                <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgba(26,18,8,0.6)' }}>
                  Leczenie wrastających paznokci, odcisków i grzybicy metodami podologicznymi.
                </p>
                <p className="font-bold" style={{ color: '#B8913A' }}>od 120 zł</p>
              </div>

              {/* Manicure */}
              <div
                className="bg-white p-6 shadow-sm"
                style={{ borderRadius: '20px', border: '1px solid rgba(0,0,0,0.07)' }}
              >
                <svg className="mb-4" width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <rect x="10" y="6" width="6" height="16" rx="3" stroke="#B8913A" strokeWidth="2" fill="none"/>
                  <rect x="20" y="8" width="6" height="14" rx="3" stroke="#B8913A" strokeWidth="2" fill="none"/>
                  <line x1="8" y1="26" x2="28" y2="26" stroke="#B8913A" strokeWidth="2"/>
                </svg>
                <h3 className="font-heading font-bold text-lg mb-2" style={{ color: '#1A1208' }}>Manicure hybrydowy</h3>
                <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgba(26,18,8,0.6)' }}>
                  Trwały lakier hybrydowy do 3 tygodni. Szeroka paleta kolorów, perfekcyjne wykończenie.
                </p>
                <p className="font-bold" style={{ color: '#B8913A' }}>od 89 zł</p>
              </div>

              {/* Zabiegi na twarz */}
              <div
                className="bg-white p-6 shadow-sm"
                style={{ borderRadius: '20px', border: '1px solid rgba(0,0,0,0.07)' }}
              >
                <svg className="mb-4" width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <circle cx="18" cy="18" r="12" stroke="#B8913A" strokeWidth="2" fill="none"/>
                  <path d="M13 22C14.5 24 21.5 24 23 22" stroke="#B8913A" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="14" cy="16" r="1.5" fill="#B8913A"/>
                  <circle cx="22" cy="16" r="1.5" fill="#B8913A"/>
                </svg>
                <h3 className="font-heading font-bold text-lg mb-2" style={{ color: '#1A1208' }}>Zabiegi na twarz</h3>
                <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgba(26,18,8,0.6)' }}>
                  Peeling chemiczny, oczyszczanie, nawilżenie — dobieramy zabieg do potrzeb skóry.
                </p>
                <p className="font-bold" style={{ color: '#B8913A' }}>od 199 zł</p>
              </div>

            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS (editorial) ── */}
        <section style={{ background: '#F0EBE3', padding: '80px 0' }}>
          <div className="container text-center">
            <p className="eyebrow mb-8">Co mówią klientki</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-4xl mx-auto">
              {testimonials.map((t, i) => (
                <div key={i} className="flex flex-col items-center">
                  <p
                    className="font-display text-[20px] text-espresso mb-6 leading-relaxed"
                    style={{ fontStyle: 'italic', fontWeight: 300 }}
                  >
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="w-8 h-px bg-caramel mb-4" />
                  <p className="eyebrow" style={{ color: '#6B5A4E' }}>
                    {t.author} · {t.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. PROCESS ── */}
        <section className="py-20" style={{ backgroundColor: '#FDFAF6' }}>
          <div className="container max-w-6xl mx-auto px-6">
            <div className="mb-12 text-center">
              <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: '#B8913A' }}>
                Jak działamy
              </p>
              <h2 className="font-heading text-4xl font-bold" style={{ color: '#1A1208' }}>
                Twoja wizyta krok po kroku
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { num: '01', title: 'Analiza', desc: 'Rozmawiamy o Twoich potrzebach i oceniamy stan skóry lub paznokci.' },
                { num: '02', title: 'Plan', desc: 'Dobieramy najlepsze zabiegi i preparaty dopasowane do Ciebie.' },
                { num: '03', title: 'Zabieg', desc: 'Wykonujemy zabieg w komfortowej atmosferze, dbając o każdy detal.' },
                { num: '04', title: 'Opieka po', desc: 'Otrzymujesz wskazówki do pielęgnacji domowej i propozycję kolejnej wizyty.' },
              ].map(({ num, title, desc }) => (
                <div key={num} className="text-center">
                  <p className="font-heading font-bold text-6xl mb-4" style={{ color: '#B8913A' }}>{num}</p>
                  <h3 className="font-heading font-bold text-xl mb-3" style={{ color: '#1A1208' }}>{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(26,18,8,0.6)' }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 6. CTA ── */}
        <section className="py-20" style={{ backgroundColor: '#FDFAF6' }}>
          <div className="container max-w-6xl mx-auto px-6">
            <div
              className="px-10 py-14"
              style={{ backgroundColor: '#1A1208', borderRadius: '28px' }}
            >
              <div className="grid md:grid-cols-2 gap-12 items-center">

                {/* Left */}
                <div>
                  <h2 className="font-heading text-4xl font-bold text-white mb-4">
                    Nie wiesz od czego zacząć?
                  </h2>
                  <p className="text-white/70 text-lg mb-8 leading-relaxed">
                    Umów się na bezpłatną konsultację — doradzimy jakie zabiegi będą najlepsze właśnie dla Ciebie.
                  </p>
                  <ul className="space-y-3">
                    {[
                      'Bezpłatna konsultacja',
                      'Indywidualny dobór zabiegów',
                      'Odpowiedź w ciągu 24 godzin',
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-3 text-white/80 text-sm">
                        <span style={{ color: '#B8913A' }}>✓</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Right — decorative inputs + button */}
                <div className="flex flex-col gap-4">
                  <input
                    type="text"
                    placeholder="Twoje imię"
                    className="w-full px-5 py-4 rounded-xl text-sm outline-none"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                    }}
                    readOnly
                    onClick={() => setConsultationOpen(true)}
                  />
                  <input
                    type="text"
                    placeholder="Numer telefonu"
                    className="w-full px-5 py-4 rounded-xl text-sm outline-none"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                    }}
                    readOnly
                    onClick={() => setConsultationOpen(true)}
                  />
                  <input
                    type="text"
                    placeholder="Czego szukasz?"
                    className="w-full px-5 py-4 rounded-xl text-sm outline-none"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                    }}
                    readOnly
                    onClick={() => setConsultationOpen(true)}
                  />
                  <button
                    onClick={() => setConsultationOpen(true)}
                    className="w-full py-4 rounded-xl font-semibold text-base transition-opacity hover:opacity-90"
                    style={{ backgroundColor: '#B8913A', color: '#fff' }}
                  >
                    Umów konsultację
                  </button>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* ── 7. FAQ ── */}
        <section className="py-24" style={{ backgroundColor: '#F5F0EB' }} aria-labelledby="faq-heading">
          <div className="container max-w-3xl mx-auto px-6">
            <h2
              id="faq-heading"
              className="font-heading text-4xl font-bold mb-12 text-center"
              style={{ color: '#1A1208' }}
            >
              Najczęściej zadawane pytania
            </h2>
            <dl className="space-y-3">
              {faqSchema.mainEntity.map((item, i) => (
                <details
                  key={i}
                  className="group overflow-hidden bg-white shadow-sm"
                  style={{ borderRadius: '20px', border: '1px solid rgba(0,0,0,0.07)' }}
                >
                  <summary
                    className="flex items-center justify-between px-6 py-5 font-semibold text-base cursor-pointer list-none select-none transition-colors hover:bg-black/[0.02]"
                    style={{ color: '#1A1208' }}
                  >
                    {item.name}
                    <ChevronDown
                      size={18}
                      className="shrink-0 transition-transform duration-200 group-open:rotate-180"
                      style={{ color: '#B8913A' }}
                    />
                  </summary>
                  <dd
                    className="px-6 pb-5 pt-1 text-sm leading-relaxed border-t"
                    style={{ color: 'rgba(26,18,8,0.65)', borderColor: 'rgba(0,0,0,0.06)' }}
                  >
                    {item.acceptedAnswer.text}
                  </dd>
                </details>
              ))}
            </dl>
          </div>
        </section>

        {/* ── 8. OBSŁUGIWANE MIEJSCOWOŚCI ── */}
        <section className="py-16" style={{ backgroundColor: '#FDFAF6' }} aria-labelledby="area-heading">
          <div className="container max-w-3xl mx-auto px-6 text-center">
            <h2
              id="area-heading"
              className="font-heading text-2xl font-bold mb-6"
              style={{ color: '#1A1208' }}
            >
              Obsługiwane miejscowości
            </h2>
            <p className="leading-relaxed text-sm" style={{ color: 'rgba(26,18,8,0.65)' }}>
              Nasz salon kosmetologiczny w <strong>Limanowej</strong> przyjmuje klientów z całego powiatu
              limanowskiego i okolic. Regularnie odwiedzają nas osoby z{' '}
              <strong>Mordarki</strong>, <strong>Laskowej</strong>, <strong>Słopnic</strong>,{' '}
              <strong>Mszany Dolnej</strong>, <strong>Nowego Sącza</strong>, <strong>Ujanowic</strong>,{' '}
              <strong>Dobrej</strong>, <strong>Kasiny Wielkiej</strong>, <strong>Sowlin</strong>,{' '}
              <strong>Tymbarku</strong>, <strong>Jodłownika</strong> oraz Łososiny Dolnej,
              Pisarzowej, Żmiącej, Pasierbca i wielu innych miejscowości w promieniu 25 km.
              Umów wizytę online i odwiedź nas w Limanowej!
            </p>
          </div>
        </section>

      </main>

      <ConsultationModal open={consultationOpen} onClose={() => setConsultationOpen(false)} />
    </div>
  );
};
