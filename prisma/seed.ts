import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcrypt"
import "dotenv/config"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const testPassword = process.env.SEED_PASSWORD
  if (!testPassword) {
    throw new Error("SEED_PASSWORD 환경변수가 필요합니다")
  }

  // 테스트 유저 생성
  const hashedPassword = await bcrypt.hash(testPassword, 10)
  
  const testUser = await prisma.user.upsert({
    where: { loginId: "testuser" },
    update: {},
    create: {
      loginId: "testuser",
      name: "테스트 사용자",
      password: hashedPassword,
      role: "USER"
    }
  })

  console.log("테스트 유저 생성 완료:", testUser)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
