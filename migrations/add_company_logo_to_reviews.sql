-- Migration: Add companyLogo to reviews table
-- Date: October 4, 2026
-- Description: Admin-uploaded logo of the reviewer's company (URL string).
--              Nullable; not shown on the public reviews page yet.

ALTER TABLE reviews
ADD COLUMN companyLogo VARCHAR(500) NULL AFTER company;
