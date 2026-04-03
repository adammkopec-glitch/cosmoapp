import { useRef, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth.store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/users.api';
import { api } from '@/lib/axios';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTour } from '@/hooks/useTour';

export const UserProfile = () => {
  const { user } = useAuth();
  const setUser = useAuthStore((s) => s.setUser);
  const { startTour } = useTour();

  const handleRestartTour = async () => {
    await usersApi.updateOnboarding(false);
    startTour();
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: terms } = useQuery({
    queryKey: ['terms'],
    queryFn: async () => {
      const res = await api.get('/terms');
      return res.data.data.terms;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ['profile-consents'],
    queryFn: async () => {
      const res = await api.get('/users/me');
      return res.data.data.user;
    },
  });

  const [marketingConsent, setMarketingConsent] = useState(false);
  const [photoConsent, setPhotoConsent] = useState(false);
  const [cardAllergies, setCardAllergies] = useState('');
  const [cardConditions, setCardConditions] = useState('');
  const [cardPreferences, setCardPreferences] = useState('');

  useEffect(() => {
    if (profile) {
      setMarketingConsent(profile.marketingConsent ?? false);
      setPhotoConsent(profile.photoConsent ?? false);
      setCardAllergies(profile.cardAllergies ?? '');
      setCardConditions(profile.cardConditions ?? '');
      setCardPreferences(profile.cardPreferences ?? '');
    }
  }, [profile]);

  const { mutate: saveCard, isPending: savingCard } = useMutation({
    mutationFn: () => usersApi.updateMyCard({ cardAllergies, cardConditions, cardPreferences }),
    onSuccess: () => {
      toast.success('Kartoteka została zapisana.');
      queryClient.invalidateQueries({ queryKey: ['profile-consents'] });
    },
    onError: () => toast.error('Nie udało się zapisać kartoteki.'),
  });

  const { mutate: saveConsents, isPending: savingConsents } = useMutation({
    mutationFn: (data: { marketingConsent: boolean; photoConsent: boolean }) =>
      api.patch('/users/me/consents', data),
    onSuccess: () => {
      toast.success('Zgody zostały zaktualizowane.');
      queryClient.invalidateQueries({ queryKey: ['profile-consents'] });
    },
    onError: () => toast.error('Nie udało się zapisać zgód.'),
  });

  const { mutate: uploadAvatar, isPending } = useMutation({
    mutationFn: (file: File) => usersApi.uploadAvatar(file),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      setUploadError(null);
    },
    onError: () => setUploadError('Nie udało się przesłać zdjęcia. Spróbuj ponownie.'),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadAvatar(file);
  };

  const cardSection = (
    title: string,
    subtitle?: string,
    children?: React.ReactNode
  ) => (
    <div
      className="max-w-xl rounded-[20px] overflow-hidden"
      style={{ border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', background: '#fff' }}
    >
      <div
        className="px-6 py-5"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
      >
        <h2 className="font-heading font-bold text-lg" style={{ color: '#1A1208' }}>{title}</h2>
        {subtitle && (
          <p className="text-xs mt-1" style={{ color: 'rgba(26,18,8,0.5)' }}>{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );

  return (
    <div className="space-y-8 animate-enter">
      <h1 className="text-3xl font-heading font-bold" style={{ color: '#1A1208' }}>Twój Profil</h1>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <div
          className="relative w-24 h-24 rounded-full cursor-pointer group"
          onClick={() => !isPending && fileInputRef.current?.click()}
        >
          {user?.avatarPath ? (
            <img
              src={user.avatarPath}
              alt={user.name}
              className="w-24 h-24 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold"
              style={{ background: 'rgba(184,145,58,0.1)', color: '#B8913A' }}
            >
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          )}

          {!isPending && (
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-medium">Zmień</span>
            </div>
          )}

          {isPending && (
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>

        <p className="text-xs" style={{ color: 'rgba(26,18,8,0.5)' }}>Kliknij, aby zmienić zdjęcie profilowe</p>
        {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif,image/bmp,image/tiff"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Account data */}
      {cardSection('Dane konta', undefined,
        <div>
          {[
            { label: 'Imię i nazwisko', value: user?.name },
            { label: 'Adres Email', value: user?.email },
            { label: 'Numer telefonu', value: user?.phone || 'Brak wpisanego telefonu' },
          ].map(({ label, value }, idx, arr) => (
            <div
              key={label}
              className="grid grid-cols-3 py-5 px-6 transition-colors"
              style={{
                borderBottom: idx < arr.length - 1 ? '1px solid rgba(0,0,0,0.06)' : undefined,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.02)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ''; }}
            >
              <span className="font-medium flex items-center" style={{ color: 'rgba(26,18,8,0.5)' }}>{label}</span>
              <span className="col-span-2 font-semibold text-lg" style={{ color: '#1A1208' }}>{value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="max-w-xl">
        <p className="text-xs italic text-center" style={{ color: 'rgba(26,18,8,0.45)' }}>
          Aby zmienić swoje dane skontaktuj się z obsługą gabinetu.
        </p>
      </div>

      {/* Patient card */}
      {cardSection(
        'Kartoteka',
        'Uzupełnij informacje, które pomogą nam lepiej dopasować zabiegi do Twoich potrzeb.',
        <div className="p-6 space-y-4">
          {[
            { label: 'Alergie / uczulenia', value: cardAllergies, setter: setCardAllergies, placeholder: 'Np. alergia na lateks, nikiel...' },
            { label: 'Dolegliwości', value: cardConditions, setter: setCardConditions, placeholder: 'Np. cukrzyca, choroby skóry...' },
            { label: 'Upodobania', value: cardPreferences, setter: setCardPreferences, placeholder: 'Np. preferuję zabiegi bez perfum...' },
          ].map(({ label, value, setter, placeholder }) => (
            <div key={label} className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: '#1A1208' }}>{label}</label>
              <textarea
                className="w-full rounded-xl px-3 py-2 text-sm resize-none outline-none transition-colors"
                style={{ border: '1px solid rgba(0,0,0,0.1)', background: '#FDFAF6' }}
                rows={2}
                placeholder={placeholder}
                value={value}
                onChange={e => setter(e.target.value)}
                onFocus={e => { e.currentTarget.style.borderColor = '#B8913A'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; }}
              />
            </div>
          ))}
          {profile?.cardStaffNotes && (
            <div className="space-y-1.5 pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <p className="text-sm font-medium" style={{ color: 'rgba(26,18,8,0.5)' }}>Notatki gabinetu</p>
              <p
                className="text-sm rounded-xl px-3 py-2 whitespace-pre-wrap"
                style={{ background: 'rgba(245,240,235,0.6)', color: '#1A1208' }}
              >
                {profile.cardStaffNotes}
              </p>
            </div>
          )}
          <div className="pt-1">
            <button
              onClick={() => saveCard()}
              disabled={savingCard}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-60"
              style={{ background: '#1A1208', color: '#fff' }}
            >
              {savingCard && <Loader2 className="w-4 h-4 animate-spin" />}
              Zapisz kartotekę
            </button>
          </div>
        </div>
      )}

      {/* Consents */}
      {cardSection(
        'Zgody',
        'Możesz w dowolnym momencie zmienić swoje zgody opcjonalne.',
        <div className="p-6 space-y-5">
          {[
            {
              checked: marketingConsent,
              setter: setMarketingConsent,
              title: 'Zgoda marketingowa',
              desc: 'Powiadomienia o promocjach i nowościach, newsletter, komunikaty SMS/e-mail.',
            },
            {
              checked: photoConsent,
              setter: setPhotoConsent,
              title: 'Zgoda na wykorzystanie zdjęć',
              desc: 'Zdjęcia efektów zabiegów mogą być wykorzystane w celach dokumentacyjnych i marketingowych.',
            },
          ].map(({ checked, setter, title, desc }) => (
            <label key={title} className="flex items-start gap-4 cursor-pointer">
              <input
                type="checkbox"
                checked={checked}
                onChange={e => setter(e.target.checked)}
                className="mt-1 w-4 h-4"
                style={{ accentColor: '#B8913A' }}
              />
              <div>
                <p className="text-sm font-medium" style={{ color: '#1A1208' }}>{title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(26,18,8,0.5)' }}>{desc}</p>
              </div>
            </label>
          ))}
          <div className="pt-1">
            <button
              onClick={() => saveConsents({ marketingConsent, photoConsent })}
              disabled={savingConsents}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-60"
              style={{ background: '#1A1208', color: '#fff' }}
            >
              {savingConsents && <Loader2 className="w-4 h-4 animate-spin" />}
              Zapisz zgody
            </button>
          </div>
        </div>
      )}

      {/* Terms */}
      {terms && cardSection(
        'Regulamin',
        `Wersja: ${terms.version} · Ostatnia aktualizacja: ${new Date(terms.updatedAt).toLocaleDateString('pl-PL')}`,
        <div className="p-6">
          <div className="max-h-96 overflow-y-auto pr-1">
            <pre
              className="whitespace-pre-wrap text-xs leading-relaxed font-sans"
              style={{ color: 'rgba(26,18,8,0.55)' }}
            >
              {terms.content}
            </pre>
          </div>
        </div>
      )}

      {/* Restart tour */}
      <div className="max-w-xl pt-4 border-t border-border/50">
        <button
          onClick={handleRestartTour}
          type="button"
          className="text-sm font-medium px-4 py-2 rounded-full border border-border text-foreground transition-colors hover:bg-accent flex items-center gap-2"
        >
          <span>↺</span>
          Powtórz przewodnik po aplikacji
        </button>
      </div>
    </div>
  );
};
