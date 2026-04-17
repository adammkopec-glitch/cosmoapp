import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { usersApi } from '@/api/users.api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser, user } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Nowe hasła nie są identyczne');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Nowe hasło musi mieć co najmniej 8 znaków');
      return;
    }
    try {
      setLoading(true);
      const updatedUser = await usersApi.changePassword({ currentPassword, newPassword });
      setUser({ ...user!, ...updatedUser });
      toast.success('Hasło zostało zmienione');
      navigate('/user/wizyty', { replace: true });
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Błąd zmiany hasła');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center font-heading text-primary font-bold">
            Zmień hasło
          </CardTitle>
          <p className="text-sm text-muted-foreground text-center mt-1">
            Ze względów bezpieczeństwa musisz ustawić nowe hasło przed korzystaniem z aplikacji.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Obecne hasło"
              className="bg-muted/50 py-6"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Nowe hasło (min. 8 znaków)"
              className="bg-muted/50 py-6"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Powtórz nowe hasło"
              className="bg-muted/50 py-6"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
            <Button type="submit" className="w-full py-6 text-base font-semibold" disabled={loading}>
              {loading ? 'Zapisywanie...' : 'Zmień hasło'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
