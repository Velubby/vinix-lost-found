'use client';

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import type { FilterStatus, ClaimsResponse, UpdateClaimInput, BulkUpdateInput, ClaimStats } from '@/types/claims';

// Query keys
export const claimKeys = {
  all: ['claims'] as const,
  lists: () => [...claimKeys.all, 'list'] as const,
  list: (filters: { cursor?: string; limit?: number; status?: FilterStatus; search?: string }) => 
    [...claimKeys.lists(), filters] as const,
  stats: () => [...claimKeys.all, 'stats'] as const,
};

export interface ClaimsFilter {
  cursor?: string;
  limit?: number;
  status?: FilterStatus;
  search?: string;
}

// Fetch claims with pagination and search
export function useClaims(
  filters: ClaimsFilter,
  options?: Omit<UseQueryOptions<ClaimsResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: claimKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.cursor) params.set('cursor', filters.cursor);
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.status && filters.status !== 'semua') params.set('status', filters.status);
      if (filters.search && filters.search.trim()) params.set('search', filters.search.trim());
      
      const response = await fetch(`/api/admin/claims?${params.toString()}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Gagal memuat klaim');
      }
      return response.json();
    },
    placeholderData: (previousData) => previousData,
    ...options,
  });
}

// Fetch claim stats
export function useClaimStats(
  options?: Omit<UseQueryOptions<ClaimStats>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: claimKeys.stats(),
    queryFn: async () => {
      const response = await fetch('/api/admin/claims/stats');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Gagal memuat statistik');
      }
      return response.json();
    },
    ...options,
  });
}

interface UpdateClaimContext {
  previousClaims: [readonly unknown[], unknown][];
}

// Update single claim
export function useUpdateClaim(
  options?: UseMutationOptions<{ success: boolean }, Error, UpdateClaimInput, UpdateClaimContext>
) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: UpdateClaimInput) => {
      const response = await fetch('/api/admin/claims', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Gagal memperbarui klaim');
      }
      return response.json();
    },
    onMutate: async (newClaim) => {
      await queryClient.cancelQueries({ queryKey: claimKeys.lists() });
      const previousClaims = queryClient.getQueriesData({ queryKey: claimKeys.lists() });

      queryClient.setQueriesData({ queryKey: claimKeys.lists() }, (old: ClaimsResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          claims: old.claims.map(claim => 
            claim.id === newClaim.claimId 
              ? { ...claim, status: newClaim.status, pickup_location: newClaim.pickupLocation ?? claim.pickup_location }
              : claim
          ),
        };
      });

      return { previousClaims };
    },
    onError: (err, newClaim, context) => {
      if (context?.previousClaims) {
        context.previousClaims.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: claimKeys.lists() });
      queryClient.invalidateQueries({ queryKey: claimKeys.stats() });
    },
    ...options,
  });
}

// Mark an approved claim as physically handed over
export function useMarkClaimHandedOver(
  options?: UseMutationOptions<{ success: boolean; data?: { handedOverAt: string } }, Error, { claimId: string }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { claimId: string }) => {
      const response = await fetch('/api/admin/claims/handover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Gagal mencatat serah terima');
      }
      return response.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: claimKeys.lists() });
      queryClient.invalidateQueries({ queryKey: claimKeys.stats() });
      queryClient.invalidateQueries({ queryKey: ['lostReports'] });
      queryClient.invalidateQueries({ queryKey: ['adminTabCounts'] });
    },
    ...options,
  });
}

// Bulk update claims
export function useBulkUpdateClaims(
  options?: UseMutationOptions<{ success: boolean; data: { updated: number } }, Error, BulkUpdateInput>
) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: BulkUpdateInput) => {
      const response = await fetch('/api/admin/claims/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Gagal memperbarui klaim secara massal');
      }
      return response.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: claimKeys.lists() });
      queryClient.invalidateQueries({ queryKey: claimKeys.stats() });
    },
    ...options,
  });
}