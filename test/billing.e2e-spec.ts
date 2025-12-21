// import { Test, TestingModule } from '@nestjs/testing'
// import { INestApplication, BadRequestException } from '@nestjs/common'
// import * as request from 'supertest'
// import { BillingModule } from '../src/billing/billing.module'
// import { WorkspaceModule } from '../src/workspaces/workspace.module'
// import { PrismaService } from '../src/prisma/prisma.service'
// import { BillingService } from '../src/billing/billing.service'
// import { WorkspaceService } from '../src/workspaces/workspace.service'
// import { EmailService } from '../src/common/utils/email.service'
// import { NotificationsService } from '../src/notifications/notifications.service'

// type Role = 'ADMIN' | 'REVIEWER' | 'VIEWER'

// function makePrismaMock() {
//   const now = new Date()
//   const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

//   let users = [
//     { id: 'u1', email: 'owner@example.com' },
//     { id: 'u2', email: 'member@example.com' },
//     { id: 'u3', email: 'new@example.com' },
//   ]
//   let workspaces: any[] = [
//     { id: 'ws-lite', name: 'Lite WS', plan: 'LITE', planExpiresAt: future },
//     { id: 'ws-team', name: 'Team WS', plan: 'TEAM', planExpiresAt: future },
//     { id: process.env.DEMO_WORKSPACE_ID || 'demo-workspace-id', name: 'Demo', plan: 'LITE', planExpiresAt: null },
//   ]
//   let workspaceUsers: any[] = [
//     { id: 'wu1', userId: 'u1', workspaceId: 'ws-lite', role: 'ADMIN' as Role },
//     { id: 'wu2', userId: 'u1', workspaceId: 'ws-team', role: 'ADMIN' as Role },
//   ]
//   let invitations: any[] = []
//   let labelVersions: any[] = []

//   const prismaMock: any = {
//     user: {
//       findUnique: async ({ where }: any) => users.find(u => u.email === where.email || u.id === where.id) || null,
//     },
//     workspace: {
//       findUnique: async ({ where }: any) => workspaces.find(w => w.id === where.id) || null,
//       findFirst: async ({ where }: any) => workspaces.find(w => w.id === where.id) || null,
//       create: async ({ data }: any) => {
//         const ws = { id: `ws-${workspaces.length + 1}`, plan: 'LITE', ...data }
//         workspaces.push(ws)
//         return ws
//       },
//       update: async ({ where, data }: any) => {
//         const ws = workspaces.find(w => w.id === where.id)
//         Object.assign(ws, data)
//         return ws
//       },
//       findMany: async () => workspaces.slice(),
//     },
//     workspaceUser: {
//       findFirst: async ({ where }: any) => workspaceUsers.find(wu => wu.workspaceId === where.workspaceId && wu.userId === where.userId) || null,
//       findMany: async ({ where, include }: any) => {
//         const list = workspaceUsers.filter(wu => (!where?.workspaceId || wu.workspaceId === where.workspaceId) && (!where?.userId || wu.userId === where.userId))
//         return include?.workspace ? list.map(wu => ({ ...wu, workspace: workspaces.find(w => w.id === wu.workspaceId) })) : list
//       },
//       count: async ({ where }: any) => workspaceUsers.filter(wu => wu.workspaceId === where.workspaceId && (!where.role || wu.role === where.role)).length,
//       create: async ({ data }: any) => {
//         const wu = { id: `wu-${workspaceUsers.length + 1}`, ...data }
//         workspaceUsers.push(wu)
//         return wu
//       },
//       delete: async ({ where }: any) => {
//         const idx = workspaceUsers.findIndex(wu => wu.id === where.id)
//         if (idx >= 0) workspaceUsers.splice(idx, 1)
//       },
//       update: async ({ where, data }: any) => {
//         const wu = workspaceUsers.find(x => x.id === where.id)
//         Object.assign(wu, data)
//         return wu
//       },
//     },
//     invitation: {
//       findFirst: async ({ where }: any) => invitations.find(i => i.email === where.email && i.workspaceId === where.workspaceId && i.status === where.status) || null,
//       create: async ({ data }: any) => {
//         const inv = { id: `inv-${invitations.length + 1}`, status: 'invited', invitedAt: new Date(), ...data }
//         invitations.push(inv)
//         return inv
//       },
//       findUnique: async ({ where }: any) => invitations.find(i => i.id === where.id) || null,
//       update: async ({ where, data }: any) => {
//         const inv = invitations.find(i => i.id === where.id)
//         Object.assign(inv, data)
//         return inv
//       },
//       count: async ({ where }: any) => invitations.filter(i => i.workspaceId === where.workspaceId && i.status === where.status).length,
//       delete: async ({ where }: any) => {
//         const idx = invitations.findIndex(i => i.id === where.id)
//         if (idx >= 0) invitations.splice(idx, 1)
//       },
//     },
//     labelVersion: {
//       findMany: async ({ where, distinct, select }: any) => {
//         const filtered = labelVersions.filter(lv => lv.workspaceId === where.label.workspaceId)
//         const ids = Array.from(new Set(filtered.map(f => f.labelId)))
//         return ids.map(id => ({ labelId: id }))
//       },
//       create: async ({ data }: any) => {
//         labelVersions.push({ id: `lv-${labelVersions.length + 1}`, ...data, workspaceId: data.labelId })
//       },
//     },
//     label: {
//       findUnique: async ({ where }: any) => ({ id: where.id, workspaceId: 'ws-lite', name: 'L', fileUrl: 'url' }),
//       create: async ({ data }: any) => ({ id: `label-${Date.now()}`, ...data }),
//       delete: async ({ where }: any) => {},
//     },
//     stripeEvent: {
//       findUnique: async ({ where }: any) => null,
//       create: async ({ data }: any) => data,
//     },
//     $transaction: async (ops: any[]) => Promise.all(ops.map(op => op)),
//   }

//   return { prismaMock, state: { users, workspaces, workspaceUsers, invitations, labelVersions } }
// }

// describe('Billing & Workspace limits (e2e)', () => {
//   let app: INestApplication
//   let billing: BillingService
//   let workspacesSvc: WorkspaceService
//   let prismaState: ReturnType<typeof makePrismaMock>['state']

//   beforeAll(async () => {
//     process.env.DEMO_WORKSPACE_ID = process.env.DEMO_WORKSPACE_ID || 'demo-workspace-id'
//     const { prismaMock, state } = makePrismaMock()
//     prismaState = state

//     const moduleFixture: TestingModule = await Test.createTestingModule({
//       imports: [BillingModule, WorkspaceModule],
//     })
//       .overrideProvider(PrismaService)
//       .useValue(prismaMock)
//       .overrideProvider(EmailService)
//       .useValue({ sendTemplateMail: async () => {} })
//       .overrideProvider(NotificationsService)
//       .useValue({ createWorkspaceInviteNotification: async () => {} })
//       .compile()

//     app = moduleFixture.createNestApplication()
//     await app.init()
//     billing = app.get(BillingService)
//     workspacesSvc = app.get(WorkspaceService)
//   })

//   afterAll(async () => {
//     await app.close()
//   })

//   it('assertCanScan enforces LITE sku limit', async () => {
//     prismaState.labelVersions.length = 0
//     prismaState.labelVersions.push({ labelId: 'A', workspaceId: 'ws-lite' })
//     prismaState.labelVersions.push({ labelId: 'B', workspaceId: 'ws-lite' })
//     await expect(billing.assertCanScan('ws-lite')).rejects.toThrow('Plan limit reached for monthly SKUs')
//   })

//   it('assertCanScan allows TEAM until 10', async () => {
//     const ws = prismaState.workspaces.find(w => w.id === 'ws-team')
//     for (let i = 1; i <= 9; i++) prismaState.labelVersions.push({ labelId: `T${i}`, workspaceId: 'ws-team' })
//     await expect(billing.assertCanScan('ws-team')).resolves.toBeUndefined()
//   })

//   it('assertCanScan bypasses demo workspace', async () => {
//     await expect(billing.assertCanScan(process.env.DEMO_WORKSPACE_ID as string)).resolves.toBeUndefined()
//   })

//   it('inviteMember enforces user limit per plan', async () => {
//     const wsId = 'ws-lite'
//     await expect(
//       workspacesSvc.inviteMember(wsId, { email: 'new@example.com', role: 'viewer' } as any, { id: 'u1', email: 'owner@example.com' }),
//     ).rejects.toThrow(BadRequestException)
//   })

//   it('createWorkspace respects account workspace limit', async () => {
//     // Simulate reaching TEAM plan workspace cap (5)
//     const extraWs = ['ws-extra-1', 'ws-extra-2', 'ws-extra-3']
//     for (const id of extraWs) {
//       prismaState.workspaces.push({ id, name: id, plan: 'TEAM', planExpiresAt: new Date(Date.now() + 3600_000) })
//       prismaState.workspaceUsers.push({ id: `wu-${id}`, userId: 'u1', workspaceId: id, role: 'ADMIN' })
//     }
//     // Now user u1 has memberships in 5 workspaces (ws-lite, ws-team + 3 extras)
//     await expect(workspacesSvc.createWorkspace('Another', 'u1')).rejects.toThrow(BadRequestException)
//   })
// })
