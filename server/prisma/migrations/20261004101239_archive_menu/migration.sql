-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "archived_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "archived_at" TIMESTAMP(3);
