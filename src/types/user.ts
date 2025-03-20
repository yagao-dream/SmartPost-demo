export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url?: string | null;
  display_name?: string | null;
  last_login?: Date | null;
  createdAt: Date;
  updatedAt: Date;
} 