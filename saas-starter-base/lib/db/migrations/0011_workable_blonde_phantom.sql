ALTER TABLE "promotions" ADD COLUMN "code" varchar(50);--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_code_unique" UNIQUE("code");