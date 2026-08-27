"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const passwords = [
    'postgrespassword',
    'postgres',
    'root',
    'admin',
    '1234',
    '123456',
    'password',
    'sridhar',
    'sridh',
    'ReachInbox',
    'Reachinbox',
    'outbox',
    'Outbox',
    ''
];
async function test() {
    for (const pwd of passwords) {
        const url = `postgresql://postgres:${encodeURIComponent(pwd)}@localhost:5432/postgres?schema=public`;
        const prisma = new client_1.PrismaClient({ datasources: { db: { url } } });
        try {
            await prisma.$connect();
            console.log(`\n========================================`);
            console.log(`SUCCESS! Working Postgres Password is: "${pwd}"`);
            console.log(`========================================\n`);
            await prisma.$disconnect();
            process.exit(0);
        }
        catch (e) {
            console.log(`Password "${pwd}" failed: ${e.message ? e.message.split('\n')[0] : e}`);
            await prisma.$disconnect();
        }
    }
}
test();
