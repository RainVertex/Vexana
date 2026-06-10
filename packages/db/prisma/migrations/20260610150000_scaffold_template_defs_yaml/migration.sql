-- Template definitions move from Port-style JSON to Backstage-style template.yaml source text.
DELETE FROM "ScaffoldTemplateDef";

ALTER TABLE "ScaffoldTemplateDef" DROP COLUMN "definition";
ALTER TABLE "ScaffoldTemplateDef" ADD COLUMN "source" TEXT NOT NULL;
