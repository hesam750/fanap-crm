const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    console.log('Prisma Client connected successfully');
  } catch (e) {
    console.error('Prisma Client connection error:', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();