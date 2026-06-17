import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { User } from '@/types';

interface LoginResponse {
  access_token: string;
  user: User;
}

export function useAuth() {
  const { user, token, isAuthenticated, login: storeLogin, logout: storeLogout } = useAuthStore();
  const router = useRouter();

  const login = async (email: string, password: string, role: string) => {
    const response = await api.post<LoginResponse>('/auth/login', { email, password, role });
    const { access_token, user: userData } = response.data;
    storeLogin(userData, access_token);
    if (userData.role === 'student') {
      router.push('/dashboard');
    } else {
      router.push('/professor');
    }
  };

  const logout = () => {
    storeLogout();
    router.push('/');
  };

  return { user, token, isAuthenticated, login, logout };
}
