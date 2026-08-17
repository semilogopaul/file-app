-- CreateEnum
CREATE TYPE "file_status" AS ENUM ('PENDING', 'READY');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folders" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "owner_id" UUID NOT NULL,
    "parent_id" UUID,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "content_type" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "status" "file_status" NOT NULL DEFAULT 'PENDING',
    "thumbnail_key" TEXT,
    "owner_id" UUID NOT NULL,
    "folder_id" UUID,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_links" (
    "id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "file_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "folders_owner_id_parent_id_deleted_at_idx" ON "folders"("owner_id", "parent_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "files_storage_key_key" ON "files"("storage_key");

-- CreateIndex
CREATE INDEX "files_owner_id_folder_id_deleted_at_idx" ON "files"("owner_id", "folder_id", "deleted_at");

-- CreateIndex
CREATE INDEX "files_owner_id_name_idx" ON "files"("owner_id", "name");

-- CreateIndex
CREATE INDEX "files_status_created_at_idx" ON "files"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "share_links_token_hash_key" ON "share_links"("token_hash");

-- CreateIndex
CREATE INDEX "share_links_file_id_expires_at_idx" ON "share_links"("file_id", "expires_at");

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
