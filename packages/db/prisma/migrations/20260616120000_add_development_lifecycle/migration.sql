-- Add the "development" lifecycle stage for freshly scaffolded entities.
ALTER TYPE "Lifecycle" ADD VALUE IF NOT EXISTS 'development';
