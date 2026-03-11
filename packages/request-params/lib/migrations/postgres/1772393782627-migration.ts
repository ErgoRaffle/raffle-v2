import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Migration1772393782627 implements MigrationInterface {
  name = 'Migration1772393782627';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "public"."donation_params_status_enum" AS ENUM('pending', 'completed', 'timedout')
        `);
    await queryRunner.query(`
            CREATE TABLE "donation_params" (
                "id" SERIAL NOT NULL,
                "raffleId" character varying NOT NULL,
                "ticketCount" integer NOT NULL,
                "tokenId" character varying NOT NULL,
                "tokenAmount" bigint NOT NULL,
                "donatorAddress" character varying NOT NULL,
                "bitcoinAddress" character varying NOT NULL,
                "timestamp" integer NOT NULL,
                "status" "public"."donation_params_status_enum" NOT NULL,
                CONSTRAINT "PK_e40e6a1cd95b87179d0f920850f" PRIMARY KEY ("id")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "donation_params"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."donation_params_status_enum"
        `);
  }
}
