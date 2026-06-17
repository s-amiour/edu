import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { ContentRecommendation } from '@/types';

interface DashboardData {
  recommendation: ContentRecommendation;
  streak: number;
  quizAccuracy: number;
  topicsMastered: number;
  totalTopics: number;
}

export function useRecommendation() {
  return useQuery<DashboardData>({
    queryKey: ['recommendation'],
    queryFn: async () => {
      const response = await api.get<DashboardData>('/student/dashboard');
      return response.data;
    },
  });
}

export function useGenerateRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (topicId: string) => {
      const response = await api.post('/student/recommendations/generate', { topicId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendation'] });
    },
  });
}
