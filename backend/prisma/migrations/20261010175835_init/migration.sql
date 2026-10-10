-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('PROVISIONED', 'ACTIVE', 'MAINTENANCE', 'DECOMMISSIONED');

-- CreateEnum
CREATE TYPE "QualityFlag" AS ENUM ('GOOD', 'OUT_OF_RANGE', 'SENSOR_ERROR', 'FUTURE_TS', 'STUCK', 'COUNTER_RESET');

-- CreateTable
CREATE TABLE "locations" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "altitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensor_types" (
    "code" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "min_valid" DOUBLE PRECISION NOT NULL,
    "max_valid" DOUBLE PRECISION NOT NULL,
    "precision" INTEGER NOT NULL,

    CONSTRAINT "sensor_types_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location_id" INTEGER NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'PROVISIONED',
    "api_key_hash" TEXT NOT NULL,
    "api_key_prefix" TEXT NOT NULL,
    "last_seen_at" TIMESTAMP(3),
    "last_battery_v" DOUBLE PRECISION,
    "last_rssi" INTEGER,
    "last_fw_version" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_status_histories" (
    "id" SERIAL NOT NULL,
    "device_id" TEXT NOT NULL,
    "from_status" "DeviceStatus" NOT NULL,
    "to_status" "DeviceStatus" NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_status_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensors" (
    "id" SERIAL NOT NULL,
    "serial_number" TEXT NOT NULL,
    "type_code" TEXT NOT NULL,

    CONSTRAINT "sensors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensor_installations" (
    "id" SERIAL NOT NULL,
    "sensor_id" INTEGER NOT NULL,
    "device_id" TEXT NOT NULL,
    "installed_at" TIMESTAMP(3) NOT NULL,
    "removed_at" TIMESTAMP(3),

    CONSTRAINT "sensor_installations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensor_calibrations" (
    "id" SERIAL NOT NULL,
    "sensor_id" INTEGER NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "offset" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scale" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "reason" TEXT,

    CONSTRAINT "sensor_calibrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensor_readings" (
    "id" BIGSERIAL NOT NULL,
    "device_id" TEXT NOT NULL,
    "sensor_id" INTEGER NOT NULL,
    "sensor_type" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "raw" DOUBLE PRECISION NOT NULL,
    "corrected" DOUBLE PRECISION,
    "flag" "QualityFlag" NOT NULL DEFAULT 'GOOD',

    CONSTRAINT "sensor_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_aggregates" (
    "id" SERIAL NOT NULL,
    "device_id" TEXT NOT NULL,
    "sensor_type" TEXT NOT NULL,
    "bucket_hour" TIMESTAMP(3) NOT NULL,
    "avg" DOUBLE PRECISION NOT NULL,
    "min" DOUBLE PRECISION NOT NULL,
    "max" DOUBLE PRECISION NOT NULL,
    "sum" DOUBLE PRECISION NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "reading_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_heartbeats" (
    "id" SERIAL NOT NULL,
    "device_id" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "battery_v" DOUBLE PRECISION NOT NULL,
    "rssi" INTEGER NOT NULL,
    "fw_version" TEXT NOT NULL,
    "uptime_s" INTEGER,

    CONSTRAINT "device_heartbeats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "devices_last_seen_at_idx" ON "devices"("last_seen_at");

-- CreateIndex
CREATE UNIQUE INDEX "sensors_serial_number_key" ON "sensors"("serial_number");

-- CreateIndex
CREATE INDEX "sensor_readings_device_id_ts_idx" ON "sensor_readings"("device_id", "ts" DESC);

-- CreateIndex
CREATE INDEX "sensor_readings_sensor_id_ts_idx" ON "sensor_readings"("sensor_id", "ts" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "sensor_readings_device_id_ts_sensor_type_key" ON "sensor_readings"("device_id", "ts", "sensor_type");

-- CreateIndex
CREATE UNIQUE INDEX "reading_aggregates_device_id_sensor_type_bucket_hour_key" ON "reading_aggregates"("device_id", "sensor_type", "bucket_hour");

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_status_histories" ADD CONSTRAINT "device_status_histories_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensors" ADD CONSTRAINT "sensors_type_code_fkey" FOREIGN KEY ("type_code") REFERENCES "sensor_types"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_installations" ADD CONSTRAINT "sensor_installations_sensor_id_fkey" FOREIGN KEY ("sensor_id") REFERENCES "sensors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_installations" ADD CONSTRAINT "sensor_installations_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_calibrations" ADD CONSTRAINT "sensor_calibrations_sensor_id_fkey" FOREIGN KEY ("sensor_id") REFERENCES "sensors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_readings" ADD CONSTRAINT "sensor_readings_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_readings" ADD CONSTRAINT "sensor_readings_sensor_id_fkey" FOREIGN KEY ("sensor_id") REFERENCES "sensors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_aggregates" ADD CONSTRAINT "reading_aggregates_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_heartbeats" ADD CONSTRAINT "device_heartbeats_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
