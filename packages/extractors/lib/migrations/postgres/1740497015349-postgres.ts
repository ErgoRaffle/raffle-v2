import { MigrationInterface, QueryRunner } from 'typeorm';

export class Postgres1740497015349 implements MigrationInterface {
  name = 'Postgres1740497015349';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TYPE "public"."raffle_box_type_enum" AS ENUM(
            'ticket_repo',
            'gift_token_repo',
            'active_raffle'
        )
    `);
    await queryRunner.query(`
        CREATE TABLE "raffle_box" (
            "id" SERIAL NOT NULL,
            "boxId" character varying NOT NULL,
            "block" character varying NOT NULL,
            "height" integer NOT NULL,
            "spendBlock" character varying,
            "spendHeight" integer,
            "extractor" character varying NOT NULL,
            "serialized" character varying NOT NULL,
            "txId" character varying NOT NULL,
            "raffleId" character varying NOT NULL,
            "type" "public"."raffle_box_type_enum" NOT NULL,
            CONSTRAINT "UQ_f00bcdc511b61e73ffb42ddacb8" UNIQUE ("boxId", "extractor"),
            CONSTRAINT "PK_69308e57c99a16406e064b5796e" PRIMARY KEY ("id")
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TABLE "raffle_box"
    `);
    await queryRunner.query(`
        DROP TYPE "public"."raffle_box_type_enum"
    `);
  }
}
