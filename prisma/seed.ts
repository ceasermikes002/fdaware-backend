import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_WORKSPACE_NAME = 'FDAware Demo Workspace';

async function main() {
  // Delete any previous demo workspace(s)
  await prisma.workspace.deleteMany({
    where: {
      OR: [
        { name: DEMO_WORKSPACE_NAME },
      ],
    },
  });
  console.log('Previous demo workspaces deleted.');

  // Create a new demo workspace with a random UUID
  const newDemoWorkspace = await prisma.workspace.create({
    data: {
      name: DEMO_WORKSPACE_NAME,
    },
  });
  console.log('New demo workspace created.');
  console.log('DEMO_WORKSPACE_ID:', newDemoWorkspace.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 