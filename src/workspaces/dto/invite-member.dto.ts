export class InviteMemberDto {
  email: string;
  role: 'admin' | 'reviewer' | 'viewer';
}
