// filepath: packages/shared/src/types/user.types.ts
export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE'
}

export enum LoyaltyTier {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD'
}

export enum AccountStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  REJECTED = 'REJECTED',
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: Role;
  avatarPath?: string | null;
  loyaltyPoints: number;
  loyaltyTier: LoyaltyTier;
  createdAt: Date;
  updatedAt: Date;
  ambassadorCode?: string | null;
  referralCount?: number;
  onboardingCompleted?: boolean;
  accountStatus?: AccountStatus;
  mustChangePassword?: boolean;
}
