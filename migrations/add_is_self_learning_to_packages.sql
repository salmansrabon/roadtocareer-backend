ALTER TABLE packages
ADD COLUMN is_self_learning BOOLEAN NOT NULL DEFAULT 0
AFTER installment;
