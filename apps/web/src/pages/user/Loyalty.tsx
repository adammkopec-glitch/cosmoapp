// filepath: apps/web/src/pages/user/Loyalty.tsx
import { useQuery, useMutation } from '@tanstack/react-query';
import { loyaltyApi } from '@/api/loyalty.api';
import { useAuth } from '@/hooks/useAuth';
import { RewardCard } from '@/components/loyalty/RewardCard';
import { PointsBar } from '@/components/loyalty/PointsBar';
import { LoyaltyBadge } from '@/components/loyalty/LoyaltyBadge';
import { toast } from 'sonner';
import { queryClient } from '@/lib/queryClient';
import { Gift } from 'lucide-react';

const getNextTier = (visits: number) => {
  if (visits < 30) return { name: 'Srebro', threshold: 30 };
  if (visits < 100) return { name: 'Złoto', threshold: 100 };
  return { name: 'Maksymalny Poziom', threshold: visits };
};

const DISCOUNT_LABELS: Record<string, string> = {
  PERCENTAGE: 'Rabat procentowy',
  AMOUNT: 'Rabat kwotowy',
  OTHER: 'Nagroda specjalna',
};

export const UserLoyalty = () => {
  const { user } = useAuth();

  const { data: rewards, isLoading: rewardsLoading } = useQuery({ queryKey: ['loyalty', 'rewards'], queryFn: loyaltyApi.getRewards });
  const { data: coupons, isLoading: couponsLoading } = useQuery({ queryKey: ['loyalty', 'coupons'], queryFn: loyaltyApi.getActiveCoupons });
  const { data: history, isLoading: historyLoading } = useQuery({ queryKey: ['loyalty', 'history'], queryFn: loyaltyApi.getHistory });
  const { data: stats } = useQuery({ queryKey: ['loyalty', 'stats'], queryFn: loyaltyApi.getStats });

  const activateMutation = useMutation({
    mutationFn: loyaltyApi.redeem,
    onSuccess: () => {
      toast.success('Kupon został aktywowany!');
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'coupons'] });
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'history'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Błąd aktywacji kuponu')
  });

  const completedVisits = stats?.completedVisits ?? 0;
  const nextTier = getNextTier(completedVisits);

  const catalogRewards = rewards?.filter((r: any) => r.isActive && (r.discountType === 'PERCENTAGE' || r.discountType === 'AMOUNT'));

  return (
    <div className="space-y-12 animate-enter">
      {/* Header + PointsBar */}
      <div>
        <h1 className="text-3xl font-heading font-bold mb-6 flex items-center gap-3" style={{ color: '#1A1208' }}>
          Mój Portfel Lojalnościowy <LoyaltyBadge tier={user?.loyaltyTier as any} />
        </h1>

        {/* Dark gradient loyalty points card */}
        <div
          className="rounded-2xl p-8 mb-8"
          style={{
            background: 'linear-gradient(135deg, #2a1f15 0%, #1C1510 100%)',
            boxShadow: '0 8px 32px rgba(28,21,16,0.25)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div className="flex flex-col items-start gap-4">
            <span
              className="font-display text-5xl text-ivory"
              style={{ fontWeight: 300 }}
            >
              {user?.loyaltyPoints ?? 0}
            </span>
            <span
              className="eyebrow mt-1"
              style={{ color: 'rgba(250,247,242,0.4)' }}
            >
              punktów
            </span>
            <div
              style={{
                background: 'rgba(250,247,242,0.06)',
                border: '1px solid rgba(196,168,130,0.25)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                display: 'inline-block',
                padding: '6px 14px',
              }}
            >
              <span
                className="eyebrow"
                style={{ color: '#C4A882' }}
              >
                {user?.loyaltyTier ?? 'BRONZE'}
              </span>
            </div>
          </div>
        </div>

        <PointsBar
          completedVisits={completedVisits}
          nextTierVisits={nextTier.threshold}
          currentTierName={user?.loyaltyTier || 'BRONZE'}
          nextTierName={nextTier.name}
        />
        {nextTier.name !== 'Maksymalny Poziom' && completedVisits >= nextTier.threshold * 0.8 && completedVisits < nextTier.threshold && (
          <div
            className="mt-4 rounded-2xl p-4"
            style={{ background: 'rgba(184,145,58,0.08)', border: '1px solid rgba(184,145,58,0.25)' }}
          >
            <p className="text-[13px] font-semibold" style={{ color: '#92400E' }}>
              🎯 Blisko {nextTier.name}! Zostały Ci {nextTier.threshold - completedVisits}{' '}
              {nextTier.threshold - completedVisits === 1 ? 'wizyta' : nextTier.threshold - completedVisits < 5 ? 'wizyty' : 'wizyt'}
            </p>
          </div>
        )}
      </div>

      {/* Active coupons */}
      <div>
        <h2
          className="text-2xl font-heading font-bold mb-6 pb-4"
          style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', color: '#1A1208' }}
        >
          Moje aktywne kupony
        </h2>
        {couponsLoading ? (
          <div className="animate-pulse" style={{ color: 'rgba(26,18,8,0.5)' }}>Wczytywanie...</div>
        ) : coupons?.length === 0 ? (
          <div
            className="p-8 rounded-2xl text-center space-y-3"
            style={{ background: 'rgba(184,145,58,0.04)', border: '1px solid rgba(184,145,58,0.2)' }}
          >
            <div
              className="w-14 h-14 rounded-full mx-auto flex items-center justify-center"
              style={{ background: 'rgba(184,145,58,0.12)' }}
            >
              <Gift size={24} style={{ color: '#B8913A' }} />
            </div>
            <div>
              <p className="font-semibold text-sm mb-1" style={{ color: '#1A1208' }}>
                Odbierz nagrodę za lojalność
              </p>
              <p className="text-xs" style={{ color: 'rgba(26,18,8,0.55)' }}>
                Masz <strong style={{ color: '#B8913A' }}>{user?.loyaltyPoints ?? 0} punktów</strong> — aktywuj nagrodę z katalogu poniżej i używaj przy następnej wizycie.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {coupons?.map((coupon: any) => (
              <div
                key={coupon.id}
                className="p-4 rounded-2xl space-y-2"
                style={{
                  border: '1px solid rgba(184,145,58,0.2)',
                  background: 'rgba(184,145,58,0.05)',
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold" style={{ color: '#1A1208' }}>{coupon.reward.name}</p>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                    style={{ background: 'rgba(184,145,58,0.1)', color: '#B8913A' }}
                  >
                    Aktywny
                  </span>
                </div>
                <p className="text-xs" style={{ color: 'rgba(26,18,8,0.5)' }}>{coupon.reward.description}</p>
                {coupon.code && (
                  <div
                    className="flex items-center gap-2 mt-1 p-2 rounded-lg"
                    style={{ background: 'rgba(184,145,58,0.1)' }}
                  >
                    <span
                      className="font-mono text-sm font-bold tracking-wider flex-1"
                      style={{ color: '#B8913A' }}
                    >
                      {coupon.code}
                    </span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(coupon.code); toast.success('Skopiowano kod!'); }}
                      className="text-xs shrink-0 hover:opacity-70 transition-opacity px-3 py-2 rounded-lg min-h-[44px] flex items-center"
                      style={{ color: 'rgba(26,18,8,0.5)' }}
                      title="Kopiuj kod"
                    >
                      Kopiuj
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs pt-1" style={{ color: 'rgba(26,18,8,0.45)' }}>
                  <span>{DISCOUNT_LABELS[coupon.reward.discountType] ?? coupon.reward.discountType}</span>
                  <span>Aktywowano: {new Date(coupon.activatedAt).toLocaleDateString('pl-PL')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rewards catalog */}
      <div>
        <h2
          className="text-2xl font-heading font-bold mb-2 pb-4"
          style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', color: '#1A1208' }}
        >
          Katalog nagród
        </h2>
        <p className="text-sm mb-6" style={{ color: 'rgba(26,18,8,0.5)' }}>
          Nagrody specjalne (inne) możesz aktywować podczas rezerwacji wizyty.
        </p>
        {rewardsLoading ? (
          <div className="animate-pulse" style={{ color: 'rgba(26,18,8,0.5)' }}>Wczytywanie...</div>
        ) : catalogRewards?.length === 0 ? (
          <div
            className="p-8 rounded-2xl text-center text-sm"
            style={{ border: '2px dashed rgba(184,145,58,0.25)', color: 'rgba(26,18,8,0.5)' }}
          >
            Brak dostępnych nagród do aktywacji.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {catalogRewards?.map((r: any) => (
              <RewardCard
                key={r.id}
                id={r.id}
                name={r.name}
                description={r.description}
                pointsCost={r.pointsCost}
                userPoints={user?.loyaltyPoints || 0}
                onRedeem={(id) => activateMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* History */}
      <div>
        <h2
          className="text-2xl font-heading font-bold mb-6 pb-4"
          style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', color: '#1A1208' }}
        >
          Historia Punktów
        </h2>
        {historyLoading ? (
          <div className="animate-pulse" style={{ color: 'rgba(26,18,8,0.5)' }}>Wczytywanie...</div>
        ) : (
          <div className="space-y-3">
            {history?.map((t: any) => {
              const badgeStyle =
                t.type === 'EARN'
                  ? { background: 'rgba(34,197,94,0.1)', color: '#15803D' }
                  : t.type === 'REDEEM'
                  ? { background: 'rgba(239,68,68,0.1)', color: '#DC2626' }
                  : { background: 'rgba(184,145,58,0.1)', color: '#B8913A' };

              return (
                <div
                  key={t.id}
                  className="flex justify-between items-center p-5 rounded-2xl transition-shadow hover:shadow-md"
                  style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}
                >
                  <div>
                    <p className="font-semibold text-[15px]" style={{ color: '#1A1208' }}>{t.description}</p>
                    <p className="text-xs mt-1" style={{ color: 'rgba(26,18,8,0.45)' }}>
                      {new Date(t.createdAt).toLocaleString('pl-PL')}
                    </p>
                  </div>
                  <span
                    className="font-bold text-lg px-4 py-1.5 rounded-full"
                    style={badgeStyle}
                  >
                    {t.type === 'EARN' ? '+' : t.type === 'REDEEM' ? '-' : ''}{t.points} pkt
                  </span>
                </div>
              );
            })}
            {history?.length === 0 && (
              <div
                className="p-8 rounded-2xl text-center"
                style={{ background: 'rgba(184,145,58,0.04)', border: '1px solid rgba(184,145,58,0.15)' }}
              >
                <p className="text-sm font-medium" style={{ color: 'rgba(26,18,8,0.5)' }}>
                  Brak historii transakcji. Punkty pojawią się po pierwszej wizycie.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
