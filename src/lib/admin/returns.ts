// Manual returns workflow (spec §11.1 Returns, step 7.3).
export const RETURN_STATUSES = ['requested', 'authorised', 'received', 'refunded', 'rejected'] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];

export const RETURN_FLOW: Record<ReturnStatus, ReturnStatus[]> = {
  requested: ['authorised', 'rejected'],
  authorised: ['received', 'rejected'],
  received: ['refunded'],
  refunded: [],
  rejected: [],
};

export const canMoveReturn = (from: ReturnStatus, to: ReturnStatus) => RETURN_FLOW[from].includes(to);
