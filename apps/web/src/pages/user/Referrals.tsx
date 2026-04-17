import { useQuery } from '@tanstack/react-query';
import { Users, Copy, Share2, CheckCircle2, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { usersApi } from '@/api/users.api';

export const UserReferrals = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['referrals'],
    queryFn: usersApi.getReferrals,
  });

  const shareText = data?.ambassadorCode
    ? `Dołącz do COSMO z moim kodem polecenia: ${data.ambassadorCode}`
    : '';

  const handleCopy = async () => {
    if (!data?.ambassadorCode) return;
    await navigator.clipboard.writeText(data.ambassadorCode);
    toast.success('Skopiowano!');
  };

  const handleShare = async () => {
    if (!shareText) return;
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
      } catch {
        // user cancelled or share failed, fall back
        await navigator.clipboard.writeText(shareText);
        toast.success('Skopiowano!');
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success('Skopiowano!');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-[20px] p-6 bg-white animate-pulse"
            style={{ border: '1px solid rgba(0,0,0,0.07)', height: 120 }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(184,145,58,0.12)' }}
        >
          <Users size={20} style={{ color: '#B8913A' }} />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold" style={{ color: '#1A1208' }}>
            Program Poleceń
          </h1>
          <p className="text-sm" style={{ color: '#6B6560' }}>
            Zarabiaj nagrody, polecając COSMO znajomym
          </p>
        </div>
      </div>

      {/* Ambassador Code Card */}
      <div
        className="rounded-[20px] p-6 bg-white"
        style={{ border: '1px solid rgba(0,0,0,0.07)' }}
      >
        <p className="text-sm font-medium mb-3" style={{ color: '#6B6560' }}>
          Twój kod polecenia
        </p>
        {data?.ambassadorCode ? (
          <>
            <div
              className="font-mono text-2xl font-bold tracking-widest mb-4 px-4 py-3 rounded-xl border"
              style={{ color: '#B8913A', background: '#FAF7F2', borderColor: 'rgba(184,145,58,0.3)', letterSpacing: '0.2em' }}
            >
              {data.ambassadorCode}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px]"
                style={{
                  background: 'rgba(184,145,58,0.1)',
                  color: '#B8913A',
                  border: '1px solid rgba(184,145,58,0.2)',
                }}
              >
                <Copy size={15} />
                Kopiuj kod
              </button>
              {'share' in navigator && (
                <button
                  onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px]"
                  style={{
                    background: '#B8913A',
                    color: '#fff',
                  }}
                >
                  <Share2 size={15} />
                  Udostępnij
                </button>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm" style={{ color: '#6B6560' }}>
            Brak kodu — skontaktuj się z nami.
          </p>
        )}
      </div>

      {/* Progress Card */}
      <div
        className="rounded-[20px] p-6 bg-white"
        style={{ border: '1px solid rgba(0,0,0,0.07)' }}
      >
        <p className="text-sm font-medium mb-1" style={{ color: '#6B6560' }}>
          Twoje postępy
        </p>
        <p className="font-heading text-xl font-bold mb-1" style={{ color: '#1A1208' }}>
          {data?.count ?? 0} poleconych znajomych
        </p>
        {data?.nextMilestone && (
          <p className="text-sm mb-3" style={{ color: '#B8913A' }}>
            Do nagrody: {data.nextMilestone.reward}
          </p>
        )}

        {/* Progress bar */}
        <div
          className="w-full rounded-full overflow-hidden mb-5"
          style={{ height: 8, background: 'rgba(184,145,58,0.12)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${data?.progressToNext ?? 0}%`,
              background: '#B8913A',
            }}
          />
        </div>

        {/* Milestones list */}
        <div className="space-y-3">
          {data?.milestones.map((m) => {
            const reached = (data?.count ?? 0) >= m.at;
            return (
              <div key={m.at} className="flex items-center gap-3">
                {reached ? (
                  <CheckCircle2 size={18} style={{ color: '#B8913A', flexShrink: 0 }} />
                ) : (
                  <Circle size={18} style={{ color: 'rgba(107,101,96,0.4)', flexShrink: 0 }} />
                )}
                <div className="flex-1 flex items-center justify-between">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: reached ? '#1A1208' : '#6B6560' }}
                  >
                    {m.reward}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: reached ? 'rgba(184,145,58,0.12)' : 'rgba(0,0,0,0.05)',
                      color: reached ? '#B8913A' : '#9B9690',
                    }}
                  >
                    {m.at} osób
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Referrals list */}
      <div
        className="rounded-[20px] p-6 bg-white"
        style={{ border: '1px solid rgba(0,0,0,0.07)' }}
      >
        <p className="text-sm font-medium mb-4" style={{ color: '#6B6560' }}>
          Zaproszeni znajomi
        </p>
        {!data?.referrals.length ? (
          <p className="text-sm text-center py-4" style={{ color: '#9B9690' }}>
            Nie poleciłeś jeszcze nikogo. Udostępnij swój kod!
          </p>
        ) : (
          <ul className="space-y-3">
            {data.referrals.map((r, idx) => (
              <li
                key={r.id}
                className="flex items-center justify-between"
                style={{
                  paddingBottom: idx < data.referrals.length - 1 ? 12 : 0,
                  borderBottom:
                    idx < data.referrals.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'rgba(184,145,58,0.1)', color: '#B8913A' }}
                  >
                    {idx + 1}
                  </div>
                  <span className="text-sm" style={{ color: '#1A1208' }}>
                    Zarejestrował/a się {formatDate(r.registeredAt)}
                  </span>
                </div>
                <CheckCircle2 size={16} style={{ color: '#B8913A', flexShrink: 0 }} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
