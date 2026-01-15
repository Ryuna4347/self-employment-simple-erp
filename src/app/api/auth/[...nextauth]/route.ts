import NextAuth from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

const handler = NextAuth({
    providers: [
        
    ],
  adapter: PrismaAdapter(prisma),
})

export { handler as GET, handler as POST }