"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const DEMO_WORKSPACE_NAME = 'FDAware Demo Workspace';
async function main() {
    await prisma.workspace.deleteMany({
        where: {
            OR: [
                { name: DEMO_WORKSPACE_NAME },
            ],
        },
    });
    console.log('Previous demo workspaces deleted.');
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
//# sourceMappingURL=seed.js.map