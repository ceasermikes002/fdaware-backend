import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { NotificationsModule } from '../src/notifications/notifications.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import { AuthGuard } from '../src/common/guards/auth.guard';

type Role = 'ADMIN' | 'REVIEWER' | 'VIEWER';

function makePrismaMock() {
  let users = [{ id: 'user123', email: 'user@example.com' }];
  let workspaces = [{ id: 'workspace456', name: 'Workspace 456' }];
  let workspaceUsers = [
    { id: 'wu1', userId: 'user123', workspaceId: 'workspace456', role: 'ADMIN' as Role },
  ];
  let notifications: any[] = [];
  let idCounter = 1;

  const matchWhere = (item: any, where: any) => {
    if (!where) return true;
    const keys = Object.keys(where);
    for (const k of keys) {
      const v = where[k];
      if (k === 'AND') {
        if (!v.every((cond: any) => matchWhere(item, cond))) return false;
      } else if (k === 'OR') {
        if (!v.some((cond: any) => matchWhere(item, cond))) return false;
      } else if (typeof v === 'object' && v !== null && 'in' in v) {
        if (!v.in.includes(item[k])) return false;
      } else if (typeof v === 'object' && v !== null && 'gt' in v) {
        if (!(item[k] > v.gt)) return false;
      } else if (typeof v === 'object' && v !== null) {
        if (!matchWhere(item[k], v)) return false;
      } else if (v === null) {
        if (item[k] != null) return false; // treat undefined as null-equivalent
      } else {
        if (item[k] !== v) return false;
      }
    }
    return true;
  };

  const sortBy = (arr: any[], orderBy: any) => {
    if (!orderBy) return arr;
    const [field, direction] = Object.entries(orderBy)[0] as [string, any];
    return arr.slice().sort((a, b) => {
      const av = a[field] || 0;
      const bv = b[field] || 0;
      return direction === 'asc' ? (av > bv ? 1 : av < bv ? -1 : 0) : (av < bv ? 1 : av > bv ? -1 : 0);
    });
  };

  const prismaMock: any = {
    user: {
      findUnique: async ({ where }: any) => users.find(u => u.id === where.id) || null,
    },
    workspace: {
      findUnique: async ({ where }: any) => workspaces.find(w => w.id === where.id) || null,
    },
    workspaceUser: {
      findUnique: async ({ where }: any) => {
        const key = where.userId_workspaceId;
        return (
          workspaceUsers.find(wu => wu.userId === key.userId && wu.workspaceId === key.workspaceId) || null
        );
      },
      findFirst: async ({ where }: any) =>
        workspaceUsers.find(wu => wu.userId === where.userId && wu.workspaceId === where.workspaceId) || null,
      findMany: async ({ where }: any) => {
        const userIds = where.userId?.in || [];
        return workspaceUsers.filter(wu => userIds.includes(wu.userId) && wu.workspaceId === where.workspaceId);
      },
    },
    notification: {
      create: async ({ data }: any) => {
        const now = new Date();
        const n = {
          id: `n${idCounter++}`,
          read: false,
          readAt: null,
          createdAt: now,
          ...data,
          expiresAt: data.expiresAt,
        };
        notifications.push(n);
        return n;
      },
      findMany: async ({ where, orderBy, take, skip, include }: any) => {
        let res = notifications.filter(n => matchWhere(n, where));
        res = sortBy(res, orderBy);
        res = res.slice(skip || 0, (skip || 0) + (take || res.length));
        if (include?.workspace?.select) {
          res = res.map(n => ({
            ...n,
            workspace: n.workspaceId
              ? { id: workspaces.find(w => w.id === n.workspaceId)?.id, name: workspaces.find(w => w.id === n.workspaceId)?.name }
              : null,
          }));
        }
        return res;
      },
      count: async ({ where }: any) => notifications.filter(n => matchWhere(n, where)).length,
      groupBy: async ({ by, where, _count }: any) => {
        const filtered = notifications.filter(n => matchWhere(n, where));
        const map = new Map<string, number>();
        filtered.forEach(n => {
          const key = (n as any)[by[0]] as string;
          map.set(key, (map.get(key) || 0) + 1);
        });
        return Array.from(map.entries()).map(([type, count]) => ({ type, _count: { type: count } }));
      },
      findFirst: async ({ where }: any) => notifications.find(n => n.id === where.id && n.userId === where.userId) || null,
      update: async ({ where, data }: any) => {
        const n = notifications.find(nn => nn.id === where.id);
        if (!n) return null;
        Object.assign(n, data);
        return n;
      },
      updateMany: async ({ where, data }: any) => {
        const targets = notifications.filter(n => matchWhere(n, where));
        targets.forEach(n => Object.assign(n, data));
        return { count: targets.length };
      },
      delete: async ({ where }: any) => {
        const idx = notifications.findIndex(n => n.id === where.id);
        if (idx >= 0) notifications.splice(idx, 1);
      },
      deleteMany: async ({ where }: any) => {
        const before = notifications.length;
        notifications = notifications.filter(n => !(n.expiresAt && n.expiresAt < where.expiresAt.lt));
        return { count: before - notifications.length };
      },
    },
    $transaction: async (ops: any[]) => Promise.all(ops.map(op => op)),
  };

  return { prismaMock, state: { users, workspaces, workspaceUsers, notifications } };
}

describe('Notifications (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let token: string;
  let prismaState: ReturnType<typeof makePrismaMock>['state'];

  beforeAll(async () => {
    process.env.DEMO_WORKSPACE_ID = 'demo-workspace-id';
    const { prismaMock, state } = makePrismaMock();
    prismaState = state;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [NotificationsModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = { id: 'user123', role: 'admin' };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    jwt = app.get(JwtService);
    token = jwt.sign({ sub: 'user123' });
  });

  afterAll(async () => {
    await app.close();
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  it('POST /notifications creates a notification', async () => {
    const res = await request(app.getHttpServer())
      .post('/notifications')
      .set(auth())
      .send({
        userId: 'user123',
        workspaceId: 'workspace456',
        type: NotificationType.LABEL_ANALYZED,
        title: 'Label Analysis Complete',
        message: 'Your label has been successfully analyzed',
        data: { labelId: 'label789', labelName: 'Product Label' },
      })
      .expect(201);

    expect(res.body).toMatchObject({
      userId: 'user123',
      workspaceId: 'workspace456',
      type: 'LABEL_ANALYZED',
      title: 'Label Analysis Complete',
      read: false,
    });
  });

  it('GET /notifications lists notifications', async () => {
    const res = await request(app.getHttpServer())
      .get('/notifications')
      .set(auth())
      .query({ limit: 10, offset: 0 })
      .expect(200);

    expect(Array.isArray(res.body.notifications)).toBe(true);
    expect(typeof res.body.total).toBe('number');
    expect(res.body.notifications.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /notifications/summary returns summary', async () => {
    const res = await request(app.getHttpServer())
      .get('/notifications/summary')
      .set(auth())
      .expect(200);

    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('unread');
    expect(res.body).toHaveProperty('byType');
  });

  it('PUT /notifications/:id/mark marks a notification', async () => {
    const created = await request(app.getHttpServer())
      .post('/notifications')
      .set(auth())
      .send({
        userId: 'user123',
        workspaceId: 'workspace456',
        type: NotificationType.SYSTEM_UPDATE,
        title: 'System Update',
        message: 'Maintenance tonight',
      })
      .expect(201);

    const id = created.body.id;
    const res = await request(app.getHttpServer())
      .put(`/notifications/${id}/mark`)
      .set(auth())
      .send({ read: true })
      .expect(200);

    expect(res.body.read).toBe(true);
    expect(res.body.readAt).toBeTruthy();
  });

  it('PUT /notifications/mark-all updates many', async () => {
    const res = await request(app.getHttpServer())
      .put('/notifications/mark-all')
      .set(auth())
      .send({ read: true })
      .expect(200);
    expect(res.body).toHaveProperty('count');
    expect(typeof res.body.count).toBe('number');
  });

  it('PUT /notifications/bulk-mark updates a set', async () => {
    const created1 = await request(app.getHttpServer())
      .post('/notifications')
      .set(auth())
      .send({ userId: 'user123', workspaceId: 'workspace456', type: NotificationType.SYSTEM_UPDATE, title: 'A', message: 'A' })
      .expect(201);
    const created2 = await request(app.getHttpServer())
      .post('/notifications')
      .set(auth())
      .send({ userId: 'user123', workspaceId: 'workspace456', type: NotificationType.SYSTEM_UPDATE, title: 'B', message: 'B' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .put('/notifications/bulk-mark')
      .set(auth())
      .send({ notificationIds: [created1.body.id, created2.body.id], read: true })
      .expect(200);
    expect(res.body).toMatchObject({ count: 2 });
  });

  it('DELETE /notifications/:id deletes one', async () => {
    const created = await request(app.getHttpServer())
      .post('/notifications')
      .set(auth())
      .send({ userId: 'user123', workspaceId: 'workspace456', type: NotificationType.SYSTEM_UPDATE, title: 'ToDelete', message: 'X' })
      .expect(201);
    await request(app.getHttpServer())
      .delete(`/notifications/${created.body.id}`)
      .set(auth())
      .expect(204);
  });

  it('POST /notifications/cleanup removes expired', async () => {
    const past = new Date(Date.now() - 1000).toISOString();
    await request(app.getHttpServer())
      .post('/notifications')
      .set(auth())
      .send({ userId: 'user123', workspaceId: 'workspace456', type: NotificationType.SYSTEM_UPDATE, title: 'Expired', message: 'E', expiresAt: past })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/notifications/cleanup')
      .set(auth())
      .send({ workspaceId: 'workspace456' })
      .expect(201);
    expect(res.body).toHaveProperty('count');
    expect(res.body.count).toBeGreaterThanOrEqual(1);
  });

  it('Helper: POST /notifications/label-analyzed', async () => {
    const res = await request(app.getHttpServer())
      .post('/notifications/label-analyzed')
      .set(auth())
      .send({ userId: 'user123', workspaceId: 'workspace456', labelName: 'Product Label', labelId: 'label789' })
      .expect(201);
    expect(res.body.type).toBe('LABEL_ANALYZED');
  });

  it('Helper: POST /notifications/compliance-issue', async () => {
    const res = await request(app.getHttpServer())
      .post('/notifications/compliance-issue')
      .set(auth())
      .send({ userId: 'user123', workspaceId: 'workspace456', labelName: 'Product Label', issueCount: 3, labelId: 'label789' })
      .expect(201);
    expect(res.body.type).toBe('COMPLIANCE_ISSUE');
  });

  it('Helper: POST /notifications/workspace-invite', async () => {
    const res = await request(app.getHttpServer())
      .post('/notifications/workspace-invite')
      .set(auth())
      .send({ userId: 'user123', workspaceId: 'workspace456', workspaceName: 'My Workspace', inviterName: 'John Doe' })
      .expect(201);
    expect(res.body.type).toBe('WORKSPACE_INVITE');
  });

  it('Helper: POST /notifications/report-generated', async () => {
    const res = await request(app.getHttpServer())
      .post('/notifications/report-generated')
      .set(auth())
      .send({ userId: 'user123', workspaceId: 'workspace456', reportName: 'Compliance Report', reportId: 'report789' })
      .expect(201);
    expect(res.body.type).toBe('REPORT_GENERATED');
  });
});
