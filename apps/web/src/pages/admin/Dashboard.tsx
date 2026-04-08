// filepath: apps/web/src/pages/admin/Dashboard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { appointmentsApi } from '@/api/appointments.api';

export const AdminDashboard = () => {
  const { data: appointments, isLoading } = useQuery({ queryKey: ['appointments'], queryFn: () => appointmentsApi.getAll() });

  const pendingCount = appointments?.filter((a: any) => a.status === 'PENDING').length || 0;
  const todayCount = appointments?.filter((a: any) => new Date(a.date).toDateString() === new Date().toDateString()).length || 0;

  return (
    <div className="space-y-6 animate-enter">
      <h1 className="text-3xl font-heading font-bold text-primary">Dashboard Administratora</h1>
      
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-border/50 shadow-sm bg-primary/5">
          <CardHeader>
            <CardTitle>Oczekujące wizyty</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary">{isLoading ? '...' : pendingCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm bg-accent/20">
          <CardHeader>
            <CardTitle>Wizyty dzisiaj</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-foreground">{isLoading ? '...' : todayCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Szybkie akcje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">Wybierz moduł z menu po lewej stronie, aby zarządzać gabinetem i treściami.</p>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mt-8 border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Ostatnie wszystkie wizyty</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {appointments?.slice(0, 5).map((a: any) => (
              <div key={a.id} className="flex flex-col md:flex-row justify-between md:items-center p-4 bg-muted/30 rounded-lg border gap-4 hover:shadow-sm transition-shadow">
                <div>
                  <p className="font-semibold text-primary">{a.service.name}</p>
                  <p className="text-sm font-medium mt-1">Klient: {a.user.name} <span className="text-muted-foreground font-normal">({a.user.email})</span></p>
                  <p className="text-xs text-muted-foreground mt-1 bg-background inline-block px-2 py-1 rounded-sm border">{new Date(a.date).toLocaleString('pl-PL')}</p>
                </div>
                <div className="flex items-center gap-4 self-start md:self-auto">
                  <span className={`text-xs font-bold px-3 py-1 bg-secondary rounded-full shadow-sm`}>{a.status}</span>
                </div>
              </div>
            ))}
            {appointments?.length === 0 && <div className="text-muted-foreground p-8 bg-muted/20 border-2 border-dashed rounded-xl text-center">Brak dodanych wizyt.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
