


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;




ALTER SCHEMA "public" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "citext" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."event_status" AS ENUM (
    'draft',
    'pending_approval',
    'published',
    'rejected',
    'cancelled',
    'completed'
);


ALTER TYPE "public"."event_status" OWNER TO "postgres";


CREATE TYPE "public"."material_type" AS ENUM (
    'presentation',
    'image',
    'pdf',
    'other'
);


ALTER TYPE "public"."material_type" OWNER TO "postgres";


CREATE TYPE "public"."participation_mode" AS ENUM (
    'physical',
    'online',
    'hybrid'
);


ALTER TYPE "public"."participation_mode" OWNER TO "postgres";


CREATE TYPE "public"."registration_status" AS ENUM (
    'registered',
    'waitlisted',
    'cancelled',
    'checked_in'
);


ALTER TYPE "public"."registration_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'student',
    'organizer',
    'admin'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    new.updated_at = now();
    return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_auth_user_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
    email_domain text := lower(split_part(coalesce(new.email, ''), '@', 2));
    resolved_role public.user_role := case
        when email_domain = 'student.usv.ro' then 'student'::public.user_role
        else 'organizer'::public.user_role
    end;
    resolved_name text := coalesce(
        new.raw_user_meta_data ->> 'full_name',
        new.raw_user_meta_data ->> 'name',
        split_part(coalesce(new.email, ''), '@', 1)
    );
begin
    insert into public.user_profiles (
        id,
        email,
        full_name,
        role,
        student_domain_verified,
        created_at,
        updated_at
    )
    values (
        new.id,
        new.email,
        resolved_name,
        resolved_role,
        email_domain = 'student.usv.ro',
        now(),
        now()
    )
    on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        student_domain_verified = excluded.student_domain_verified,
        updated_at = now();

    return new;
end;
$$;


ALTER FUNCTION "public"."sync_auth_user_profile"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."departments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "faculty_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "short_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."departments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."event_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "event_feedback_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."event_feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_materials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "material_type" "public"."material_type" NOT NULL,
    "title" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_name" "text",
    "file_size_bytes" bigint,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "event_materials_file_size_bytes_check" CHECK ((("file_size_bytes" IS NULL) OR ("file_size_bytes" >= 0)))
);


ALTER TABLE "public"."event_materials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_registrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "public"."registration_status" DEFAULT 'registered'::"public"."registration_status" NOT NULL,
    "registered_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cancelled_at" timestamp with time zone,
    "checked_in_at" timestamp with time zone
);


ALTER TABLE "public"."event_registrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_sponsors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "sponsor_id" "uuid" NOT NULL,
    "display_order" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "event_sponsors_display_order_check" CHECK ((("display_order" IS NULL) OR ("display_order" >= 0)))
);


ALTER TABLE "public"."event_sponsors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone,
    "venue_id" "uuid",
    "category_id" "uuid",
    "participation_mode" "public"."participation_mode" DEFAULT 'physical'::"public"."participation_mode" NOT NULL,
    "organizer_name" "text" NOT NULL,
    "faculty_id" "uuid",
    "department_id" "uuid",
    "registration_required" boolean DEFAULT false NOT NULL,
    "registration_url" "text",
    "registration_deadline" timestamp with time zone,
    "max_participants" integer,
    "qr_code_value" "text",
    "is_free" boolean DEFAULT true NOT NULL,
    "status" "public"."event_status" DEFAULT 'draft'::"public"."event_status" NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "creator_name" "text" NOT NULL,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "rejection_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "event_registration_deadline_chk" CHECK ((("registration_deadline" IS NULL) OR ("registration_deadline" <= "starts_at"))),
    CONSTRAINT "event_schedule_chk" CHECK ((("ends_at" IS NULL) OR ("ends_at" > "starts_at"))),
    CONSTRAINT "events_max_participants_check" CHECK ((("max_participants" IS NULL) OR ("max_participants" > 0)))
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."faculties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "short_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."faculties" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sponsors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "logo_url" "text",
    "website_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sponsors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "email" "public"."citext" NOT NULL,
    "full_name" "text" NOT NULL,
    "role" "public"."user_role" DEFAULT 'student'::"public"."user_role" NOT NULL,
    "faculty_id" "uuid",
    "department_id" "uuid",
    "student_domain_verified" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_monthly_event_report" AS
 SELECT "date_trunc"('month'::"text", "starts_at") AS "report_month",
    "count"(*) AS "total_events",
    "count"(*) FILTER (WHERE ("status" = 'published'::"public"."event_status")) AS "published_events"
   FROM "public"."events"
  GROUP BY ("date_trunc"('month'::"text", "starts_at"))
  ORDER BY ("date_trunc"('month'::"text", "starts_at")) DESC;


ALTER VIEW "public"."v_monthly_event_report" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."venues" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "address" "text",
    "building" "text",
    "room" "text",
    "city" "text",
    "maps_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."venues" OWNER TO "postgres";


ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_categories"
    ADD CONSTRAINT "event_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."event_categories"
    ADD CONSTRAINT "event_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_feedback"
    ADD CONSTRAINT "event_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_materials"
    ADD CONSTRAINT "event_materials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_sponsors"
    ADD CONSTRAINT "event_sponsors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."faculties"
    ADD CONSTRAINT "faculties_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."faculties"
    ADD CONSTRAINT "faculties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."faculties"
    ADD CONSTRAINT "faculties_short_name_key" UNIQUE ("short_name");



ALTER TABLE ONLY "public"."sponsors"
    ADD CONSTRAINT "sponsors_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."sponsors"
    ADD CONSTRAINT "sponsors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "uq_department_per_faculty" UNIQUE ("faculty_id", "name");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "uq_department_short_name_per_faculty" UNIQUE ("faculty_id", "short_name");



ALTER TABLE ONLY "public"."event_feedback"
    ADD CONSTRAINT "uq_event_feedback" UNIQUE ("event_id", "user_id");



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "uq_event_registration" UNIQUE ("event_id", "user_id");



ALTER TABLE ONLY "public"."event_sponsors"
    ADD CONSTRAINT "uq_event_sponsor" UNIQUE ("event_id", "sponsor_id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."venues"
    ADD CONSTRAINT "venues_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."venues"
    ADD CONSTRAINT "venues_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_departments_faculty_id" ON "public"."departments" USING "btree" ("faculty_id");



CREATE INDEX "idx_event_feedback_event_id" ON "public"."event_feedback" USING "btree" ("event_id");



CREATE INDEX "idx_event_materials_event_id" ON "public"."event_materials" USING "btree" ("event_id");



CREATE INDEX "idx_event_registrations_event_id" ON "public"."event_registrations" USING "btree" ("event_id");



CREATE INDEX "idx_event_registrations_user_id" ON "public"."event_registrations" USING "btree" ("user_id");



CREATE INDEX "idx_event_sponsors_event_id" ON "public"."event_sponsors" USING "btree" ("event_id");



CREATE INDEX "idx_event_sponsors_sponsor_id" ON "public"."event_sponsors" USING "btree" ("sponsor_id");



CREATE INDEX "idx_events_category_id" ON "public"."events" USING "btree" ("category_id");



CREATE INDEX "idx_events_creator_id" ON "public"."events" USING "btree" ("creator_id");



CREATE INDEX "idx_events_department_id" ON "public"."events" USING "btree" ("department_id");



CREATE INDEX "idx_events_faculty_id" ON "public"."events" USING "btree" ("faculty_id");



CREATE INDEX "idx_events_starts_at" ON "public"."events" USING "btree" ("starts_at");



CREATE INDEX "idx_events_status" ON "public"."events" USING "btree" ("status");



CREATE INDEX "idx_events_venue_id" ON "public"."events" USING "btree" ("venue_id");



CREATE INDEX "idx_user_profiles_department_id" ON "public"."user_profiles" USING "btree" ("department_id");



CREATE INDEX "idx_user_profiles_faculty_id" ON "public"."user_profiles" USING "btree" ("faculty_id");



CREATE OR REPLACE TRIGGER "trg_departments_updated_at" BEFORE UPDATE ON "public"."departments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_event_feedback_updated_at" BEFORE UPDATE ON "public"."event_feedback" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_events_updated_at" BEFORE UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_faculties_updated_at" BEFORE UPDATE ON "public"."faculties" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sponsors_updated_at" BEFORE UPDATE ON "public"."sponsors" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_venues_updated_at" BEFORE UPDATE ON "public"."venues" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_feedback"
    ADD CONSTRAINT "event_feedback_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_feedback"
    ADD CONSTRAINT "event_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_materials"
    ADD CONSTRAINT "event_materials_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_materials"
    ADD CONSTRAINT "event_materials_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_sponsors"
    ADD CONSTRAINT "event_sponsors_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_sponsors"
    ADD CONSTRAINT "event_sponsors_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."event_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT ALL ON SCHEMA "public" TO "service_role";




































































































































































































drop extension if exists "pg_net";

revoke delete on table "public"."departments" from "anon";

revoke insert on table "public"."departments" from "anon";

revoke references on table "public"."departments" from "anon";

revoke select on table "public"."departments" from "anon";

revoke trigger on table "public"."departments" from "anon";

revoke truncate on table "public"."departments" from "anon";

revoke update on table "public"."departments" from "anon";

revoke delete on table "public"."departments" from "authenticated";

revoke insert on table "public"."departments" from "authenticated";

revoke references on table "public"."departments" from "authenticated";

revoke select on table "public"."departments" from "authenticated";

revoke trigger on table "public"."departments" from "authenticated";

revoke truncate on table "public"."departments" from "authenticated";

revoke update on table "public"."departments" from "authenticated";

revoke delete on table "public"."departments" from "service_role";

revoke insert on table "public"."departments" from "service_role";

revoke references on table "public"."departments" from "service_role";

revoke select on table "public"."departments" from "service_role";

revoke trigger on table "public"."departments" from "service_role";

revoke truncate on table "public"."departments" from "service_role";

revoke update on table "public"."departments" from "service_role";

revoke delete on table "public"."event_categories" from "anon";

revoke insert on table "public"."event_categories" from "anon";

revoke references on table "public"."event_categories" from "anon";

revoke select on table "public"."event_categories" from "anon";

revoke trigger on table "public"."event_categories" from "anon";

revoke truncate on table "public"."event_categories" from "anon";

revoke update on table "public"."event_categories" from "anon";

revoke delete on table "public"."event_categories" from "authenticated";

revoke insert on table "public"."event_categories" from "authenticated";

revoke references on table "public"."event_categories" from "authenticated";

revoke select on table "public"."event_categories" from "authenticated";

revoke trigger on table "public"."event_categories" from "authenticated";

revoke truncate on table "public"."event_categories" from "authenticated";

revoke update on table "public"."event_categories" from "authenticated";

revoke delete on table "public"."event_categories" from "service_role";

revoke insert on table "public"."event_categories" from "service_role";

revoke references on table "public"."event_categories" from "service_role";

revoke select on table "public"."event_categories" from "service_role";

revoke trigger on table "public"."event_categories" from "service_role";

revoke truncate on table "public"."event_categories" from "service_role";

revoke update on table "public"."event_categories" from "service_role";

revoke delete on table "public"."event_feedback" from "anon";

revoke insert on table "public"."event_feedback" from "anon";

revoke references on table "public"."event_feedback" from "anon";

revoke select on table "public"."event_feedback" from "anon";

revoke trigger on table "public"."event_feedback" from "anon";

revoke truncate on table "public"."event_feedback" from "anon";

revoke update on table "public"."event_feedback" from "anon";

revoke delete on table "public"."event_feedback" from "authenticated";

revoke insert on table "public"."event_feedback" from "authenticated";

revoke references on table "public"."event_feedback" from "authenticated";

revoke select on table "public"."event_feedback" from "authenticated";

revoke trigger on table "public"."event_feedback" from "authenticated";

revoke truncate on table "public"."event_feedback" from "authenticated";

revoke update on table "public"."event_feedback" from "authenticated";

revoke delete on table "public"."event_feedback" from "service_role";

revoke insert on table "public"."event_feedback" from "service_role";

revoke references on table "public"."event_feedback" from "service_role";

revoke select on table "public"."event_feedback" from "service_role";

revoke trigger on table "public"."event_feedback" from "service_role";

revoke truncate on table "public"."event_feedback" from "service_role";

revoke update on table "public"."event_feedback" from "service_role";

revoke delete on table "public"."event_materials" from "anon";

revoke insert on table "public"."event_materials" from "anon";

revoke references on table "public"."event_materials" from "anon";

revoke select on table "public"."event_materials" from "anon";

revoke trigger on table "public"."event_materials" from "anon";

revoke truncate on table "public"."event_materials" from "anon";

revoke update on table "public"."event_materials" from "anon";

revoke delete on table "public"."event_materials" from "authenticated";

revoke insert on table "public"."event_materials" from "authenticated";

revoke references on table "public"."event_materials" from "authenticated";

revoke select on table "public"."event_materials" from "authenticated";

revoke trigger on table "public"."event_materials" from "authenticated";

revoke truncate on table "public"."event_materials" from "authenticated";

revoke update on table "public"."event_materials" from "authenticated";

revoke delete on table "public"."event_materials" from "service_role";

revoke insert on table "public"."event_materials" from "service_role";

revoke references on table "public"."event_materials" from "service_role";

revoke select on table "public"."event_materials" from "service_role";

revoke trigger on table "public"."event_materials" from "service_role";

revoke truncate on table "public"."event_materials" from "service_role";

revoke update on table "public"."event_materials" from "service_role";

revoke delete on table "public"."event_registrations" from "anon";

revoke insert on table "public"."event_registrations" from "anon";

revoke references on table "public"."event_registrations" from "anon";

revoke select on table "public"."event_registrations" from "anon";

revoke trigger on table "public"."event_registrations" from "anon";

revoke truncate on table "public"."event_registrations" from "anon";

revoke update on table "public"."event_registrations" from "anon";

revoke delete on table "public"."event_registrations" from "authenticated";

revoke insert on table "public"."event_registrations" from "authenticated";

revoke references on table "public"."event_registrations" from "authenticated";

revoke select on table "public"."event_registrations" from "authenticated";

revoke trigger on table "public"."event_registrations" from "authenticated";

revoke truncate on table "public"."event_registrations" from "authenticated";

revoke update on table "public"."event_registrations" from "authenticated";

revoke delete on table "public"."event_registrations" from "service_role";

revoke insert on table "public"."event_registrations" from "service_role";

revoke references on table "public"."event_registrations" from "service_role";

revoke select on table "public"."event_registrations" from "service_role";

revoke trigger on table "public"."event_registrations" from "service_role";

revoke truncate on table "public"."event_registrations" from "service_role";

revoke update on table "public"."event_registrations" from "service_role";

revoke delete on table "public"."event_sponsors" from "anon";

revoke insert on table "public"."event_sponsors" from "anon";

revoke references on table "public"."event_sponsors" from "anon";

revoke select on table "public"."event_sponsors" from "anon";

revoke trigger on table "public"."event_sponsors" from "anon";

revoke truncate on table "public"."event_sponsors" from "anon";

revoke update on table "public"."event_sponsors" from "anon";

revoke delete on table "public"."event_sponsors" from "authenticated";

revoke insert on table "public"."event_sponsors" from "authenticated";

revoke references on table "public"."event_sponsors" from "authenticated";

revoke select on table "public"."event_sponsors" from "authenticated";

revoke trigger on table "public"."event_sponsors" from "authenticated";

revoke truncate on table "public"."event_sponsors" from "authenticated";

revoke update on table "public"."event_sponsors" from "authenticated";

revoke delete on table "public"."event_sponsors" from "service_role";

revoke insert on table "public"."event_sponsors" from "service_role";

revoke references on table "public"."event_sponsors" from "service_role";

revoke select on table "public"."event_sponsors" from "service_role";

revoke trigger on table "public"."event_sponsors" from "service_role";

revoke truncate on table "public"."event_sponsors" from "service_role";

revoke update on table "public"."event_sponsors" from "service_role";

revoke delete on table "public"."events" from "anon";

revoke insert on table "public"."events" from "anon";

revoke references on table "public"."events" from "anon";

revoke select on table "public"."events" from "anon";

revoke trigger on table "public"."events" from "anon";

revoke truncate on table "public"."events" from "anon";

revoke update on table "public"."events" from "anon";

revoke delete on table "public"."events" from "authenticated";

revoke insert on table "public"."events" from "authenticated";

revoke references on table "public"."events" from "authenticated";

revoke select on table "public"."events" from "authenticated";

revoke trigger on table "public"."events" from "authenticated";

revoke truncate on table "public"."events" from "authenticated";

revoke update on table "public"."events" from "authenticated";

revoke delete on table "public"."events" from "service_role";

revoke insert on table "public"."events" from "service_role";

revoke references on table "public"."events" from "service_role";

revoke select on table "public"."events" from "service_role";

revoke trigger on table "public"."events" from "service_role";

revoke truncate on table "public"."events" from "service_role";

revoke update on table "public"."events" from "service_role";

revoke delete on table "public"."faculties" from "anon";

revoke insert on table "public"."faculties" from "anon";

revoke references on table "public"."faculties" from "anon";

revoke select on table "public"."faculties" from "anon";

revoke trigger on table "public"."faculties" from "anon";

revoke truncate on table "public"."faculties" from "anon";

revoke update on table "public"."faculties" from "anon";

revoke delete on table "public"."faculties" from "authenticated";

revoke insert on table "public"."faculties" from "authenticated";

revoke references on table "public"."faculties" from "authenticated";

revoke select on table "public"."faculties" from "authenticated";

revoke trigger on table "public"."faculties" from "authenticated";

revoke truncate on table "public"."faculties" from "authenticated";

revoke update on table "public"."faculties" from "authenticated";

revoke delete on table "public"."faculties" from "service_role";

revoke insert on table "public"."faculties" from "service_role";

revoke references on table "public"."faculties" from "service_role";

revoke select on table "public"."faculties" from "service_role";

revoke trigger on table "public"."faculties" from "service_role";

revoke truncate on table "public"."faculties" from "service_role";

revoke update on table "public"."faculties" from "service_role";

revoke delete on table "public"."sponsors" from "anon";

revoke insert on table "public"."sponsors" from "anon";

revoke references on table "public"."sponsors" from "anon";

revoke select on table "public"."sponsors" from "anon";

revoke trigger on table "public"."sponsors" from "anon";

revoke truncate on table "public"."sponsors" from "anon";

revoke update on table "public"."sponsors" from "anon";

revoke delete on table "public"."sponsors" from "authenticated";

revoke insert on table "public"."sponsors" from "authenticated";

revoke references on table "public"."sponsors" from "authenticated";

revoke select on table "public"."sponsors" from "authenticated";

revoke trigger on table "public"."sponsors" from "authenticated";

revoke truncate on table "public"."sponsors" from "authenticated";

revoke update on table "public"."sponsors" from "authenticated";

revoke delete on table "public"."sponsors" from "service_role";

revoke insert on table "public"."sponsors" from "service_role";

revoke references on table "public"."sponsors" from "service_role";

revoke select on table "public"."sponsors" from "service_role";

revoke trigger on table "public"."sponsors" from "service_role";

revoke truncate on table "public"."sponsors" from "service_role";

revoke update on table "public"."sponsors" from "service_role";

revoke delete on table "public"."user_profiles" from "anon";

revoke insert on table "public"."user_profiles" from "anon";

revoke references on table "public"."user_profiles" from "anon";

revoke select on table "public"."user_profiles" from "anon";

revoke trigger on table "public"."user_profiles" from "anon";

revoke truncate on table "public"."user_profiles" from "anon";

revoke update on table "public"."user_profiles" from "anon";

revoke delete on table "public"."user_profiles" from "authenticated";

revoke insert on table "public"."user_profiles" from "authenticated";

revoke references on table "public"."user_profiles" from "authenticated";

revoke select on table "public"."user_profiles" from "authenticated";

revoke trigger on table "public"."user_profiles" from "authenticated";

revoke truncate on table "public"."user_profiles" from "authenticated";

revoke update on table "public"."user_profiles" from "authenticated";

revoke delete on table "public"."user_profiles" from "service_role";

revoke insert on table "public"."user_profiles" from "service_role";

revoke references on table "public"."user_profiles" from "service_role";

revoke select on table "public"."user_profiles" from "service_role";

revoke trigger on table "public"."user_profiles" from "service_role";

revoke truncate on table "public"."user_profiles" from "service_role";

revoke update on table "public"."user_profiles" from "service_role";

revoke delete on table "public"."venues" from "anon";

revoke insert on table "public"."venues" from "anon";

revoke references on table "public"."venues" from "anon";

revoke select on table "public"."venues" from "anon";

revoke trigger on table "public"."venues" from "anon";

revoke truncate on table "public"."venues" from "anon";

revoke update on table "public"."venues" from "anon";

revoke delete on table "public"."venues" from "authenticated";

revoke insert on table "public"."venues" from "authenticated";

revoke references on table "public"."venues" from "authenticated";

revoke select on table "public"."venues" from "authenticated";

revoke trigger on table "public"."venues" from "authenticated";

revoke truncate on table "public"."venues" from "authenticated";

revoke update on table "public"."venues" from "authenticated";

revoke delete on table "public"."venues" from "service_role";

revoke insert on table "public"."venues" from "service_role";

revoke references on table "public"."venues" from "service_role";

revoke select on table "public"."venues" from "service_role";

revoke trigger on table "public"."venues" from "service_role";

revoke truncate on table "public"."venues" from "service_role";

revoke update on table "public"."venues" from "service_role";

CREATE TRIGGER on_auth_user_created AFTER INSERT OR UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.sync_auth_user_profile();


