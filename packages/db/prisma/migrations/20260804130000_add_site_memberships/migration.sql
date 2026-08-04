-- CreateEnum
CREATE TYPE "SiteRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- CreateTable
CREATE TABLE "SiteMembership" (
    "siteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "SiteRole" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteMembership_pkey" PRIMARY KEY ("siteId", "userId")
);

-- CreateIndex
CREATE INDEX "SiteMembership_userId_idx" ON "SiteMembership"("userId");

-- AddForeignKey
ALTER TABLE "SiteMembership" ADD CONSTRAINT "SiteMembership_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SiteMembership" ADD CONSTRAINT "SiteMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing sites deliberately receive no inferred owner. Assign each one to
-- its intended user before enabling the new release, for example:
-- INSERT INTO "SiteMembership" ("siteId", "userId", role)
-- VALUES ('<site-id>', '<user-id>', 'OWNER');
