import { prisma } from '../lib/prisma';

const ADMIN_WALLET = '0xA4c9991e1bA3F4aeB0D360186Ba6f8f7c66cC2BF';

async function main() {
  try {
    const user = await prisma.user.upsert({
      where: { walletAddress: ADMIN_WALLET },
      update: { role: 'ADMIN' },
      create: {
        walletAddress: ADMIN_WALLET,
        role: 'ADMIN',
        profileCompleted: true,
      },
    });

    console.log('✅ Admin wallet added/updated successfully:');
    console.log(user);
  } catch (error) {
    console.error('❌ Error adding admin wallet:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
