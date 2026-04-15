// ─── ChequePass Global Tipler ─────────────────────────────────────────────────

export interface User {
  uid: string;
  displayName: string;
  username: string;
  email: string;
  avatarUrl?: string;
  createdAt: Date;
  stats: UserStats;
  fcmToken?: string;
}

export interface UserStats {
  totalWon: number;
  totalPassed: number;   // hediye edildi (pas geçildi)
  totalFriends: number;
}

export interface Match {
  matchId: string;
  participants: string[];
  participantNames: Record<string, string>;   // uid → displayName
  participantUsernames: Record<string, string>;
  initiatorId: string;
  status: 'pending' | 'active' | 'blocked';
  createdAt: Date;
  lastActivity: Date;
}

export type CouponDirection = 'self' | 'gift';
export type CouponStatus    = 'active' | 'used' | 'expired';
export type CouponCategory  = 'date' | 'chore' | 'fun' | 'custom';

export interface Coupon {
  couponId: string;
  matchId: string;
  winnerId: string;
  giverId: string;
  title: string;
  description: string;
  category: CouponCategory;
  direction: CouponDirection;
  recipientId: string;
  status: CouponStatus;
  createdAt: Date;
  usedAt?: Date;
  expiresAt?: Date;
  templateId: string;
  usageLimit?: number;
  usageCount: number;
  gameNote?: string;       // Oyun notu (opsiyonel)
}

export interface CouponTemplate {
  templateId: string;
  title: string;
  description: string;
  category: CouponCategory;
  iconName: string;
  isActive: boolean;
  usageLimit?: number;
  expiryDays?: number;
}

export type NotificationType = 'coupon_received' | 'friend_request' | 'reminder';

export interface AppNotification {
  notifId: string;
  toUserId: string;
  fromUserId: string;
  fromUserName: string;
  type: NotificationType;
  payload: Record<string, string>;
  isRead: boolean;
  createdAt: Date;
}

export interface FriendRequest {
  requestId: string;
  fromUserId: string;
  fromUserName: string;
  fromUsername: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}
