--
-- 000_create_initial_schema.sql
--
-- Schema เริ่มต้นของระบบ SQL-Grader (state ก่อนรัน migration 002 - 007)
-- สร้างตารางพื้นฐาน 7 ตาราง:
--   users, categories, assignments, datasets, exercises, submissions, test_cases
-- (test_cases จะถูกลบทิ้งภายหลังโดย migration 007)
--
-- ต้องรันไฟล์นี้เป็นไฟล์แรกก่อน migration 002, 003, ... , 007 ตามลำดับ
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignments (
    assign_id integer NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    start_date timestamp without time zone,
    due_date timestamp without time zone,
    max_attempts integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_by character varying(20),
    created_at timestamp without time zone DEFAULT now(),
    category_id integer,
    CONSTRAINT assignments_max_attempts_check CHECK ((max_attempts >= 0))
);


CREATE SEQUENCE public.assignments_assign_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.assignments_assign_id_seq OWNED BY public.assignments.assign_id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    category_id integer NOT NULL,
    name character varying(100) NOT NULL
);


CREATE SEQUENCE public.categories_category_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.categories_category_id_seq OWNED BY public.categories.category_id;


--
-- Name: datasets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.datasets (
    dataset_id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    schema_sql text NOT NULL,
    seed_data_sql text NOT NULL,
    created_by character varying(20),
    created_at timestamp without time zone DEFAULT now()
);


CREATE SEQUENCE public.datasets_dataset_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.datasets_dataset_id_seq OWNED BY public.datasets.dataset_id;


--
-- Name: exercises; Type: TABLE; Schema: public; Owner: -
--
-- หมายเหตุ: ยังไม่มีคอลัมน์ check_order ในขั้นนี้
--          (migration 007 จะเป็นตัวเพิ่มเข้ามาภายหลัง)
--

CREATE TABLE public.exercises (
    exercise_id integer NOT NULL,
    assign_id integer NOT NULL,
    dataset_id integer,
    title character varying(200) NOT NULL,
    description text NOT NULL,
    expected_query text NOT NULL,
    points integer DEFAULT 10,
    difficulty character varying(20) DEFAULT 'medium'::character varying,
    order_num integer DEFAULT 0,
    hint text,
    show_solution boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    required_keywords jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT exercises_difficulty_check CHECK (((difficulty)::text = ANY ((ARRAY['easy'::character varying, 'medium'::character varying, 'hard'::character varying])::text[]))),
    CONSTRAINT exercises_points_check CHECK ((points > 0))
);


CREATE SEQUENCE public.exercises_exercise_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.exercises_exercise_id_seq OWNED BY public.exercises.exercise_id;


--
-- Name: submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.submissions (
    submit_id integer NOT NULL,
    exercise_id integer NOT NULL,
    user_id character varying(20) CONSTRAINT submissions_student_id_not_null NOT NULL,
    submitted_query text NOT NULL,
    is_correct boolean DEFAULT false,
    total_score numeric(5,2) DEFAULT 0,
    max_score numeric(5,2),
    attempt_number integer DEFAULT 1,
    results jsonb,
    error_message text,
    submitted_at timestamp without time zone DEFAULT now(),
    CONSTRAINT submissions_attempt_number_check CHECK ((attempt_number > 0)),
    CONSTRAINT submissions_total_score_check CHECK ((total_score >= (0)::numeric))
);


CREATE SEQUENCE public.submissions_submit_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.submissions_submit_id_seq OWNED BY public.submissions.submit_id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    user_id character varying(20) CONSTRAINT users_student_id_not_null NOT NULL,
    name character varying(100) NOT NULL,
    surname character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    role character varying(20) DEFAULT 'student'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['student'::character varying, 'teacher'::character varying, 'admin'::character varying])::text[])))
);


--
-- Name: test_cases; Type: TABLE; Schema: public; Owner: -
--
-- หมายเหตุ: ตารางนี้จะถูกลบทิ้งโดย migration 007
--          (ระบบใหม่ใช้ Golden Query Equivalence แทน)
--

CREATE TABLE public.test_cases (
    case_id integer NOT NULL,
    exercise_id integer NOT NULL,
    case_name character varying(200) NOT NULL,
    expected_output jsonb NOT NULL,
    points integer DEFAULT 1 NOT NULL,
    is_hidden boolean DEFAULT false NOT NULL
);


CREATE SEQUENCE public.test_cases_case_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.test_cases_case_id_seq OWNED BY public.test_cases.case_id;


--
-- DEFAULT values (sequences)
--

ALTER TABLE ONLY public.assignments ALTER COLUMN assign_id SET DEFAULT nextval('public.assignments_assign_id_seq'::regclass);
ALTER TABLE ONLY public.categories  ALTER COLUMN category_id SET DEFAULT nextval('public.categories_category_id_seq'::regclass);
ALTER TABLE ONLY public.datasets    ALTER COLUMN dataset_id SET DEFAULT nextval('public.datasets_dataset_id_seq'::regclass);
ALTER TABLE ONLY public.exercises   ALTER COLUMN exercise_id SET DEFAULT nextval('public.exercises_exercise_id_seq'::regclass);
ALTER TABLE ONLY public.submissions ALTER COLUMN submit_id SET DEFAULT nextval('public.submissions_submit_id_seq'::regclass);
ALTER TABLE ONLY public.test_cases  ALTER COLUMN case_id SET DEFAULT nextval('public.test_cases_case_id_seq'::regclass);


--
-- PRIMARY KEYS / UNIQUE CONSTRAINTS
--

ALTER TABLE ONLY public.assignments  ADD CONSTRAINT assignments_pkey PRIMARY KEY (assign_id);
ALTER TABLE ONLY public.categories   ADD CONSTRAINT categories_pkey  PRIMARY KEY (category_id);
ALTER TABLE ONLY public.categories   ADD CONSTRAINT categories_name_key UNIQUE (name);
ALTER TABLE ONLY public.datasets     ADD CONSTRAINT datasets_pkey    PRIMARY KEY (dataset_id);
ALTER TABLE ONLY public.datasets     ADD CONSTRAINT datasets_name_key UNIQUE (name);
ALTER TABLE ONLY public.exercises    ADD CONSTRAINT exercises_pkey   PRIMARY KEY (exercise_id);
ALTER TABLE ONLY public.submissions  ADD CONSTRAINT submissions_pkey PRIMARY KEY (submit_id);
ALTER TABLE ONLY public.users        ADD CONSTRAINT users_pkey       PRIMARY KEY (user_id);
ALTER TABLE ONLY public.users        ADD CONSTRAINT users_email_key  UNIQUE (email);
ALTER TABLE ONLY public.test_cases   ADD CONSTRAINT test_cases_pkey  PRIMARY KEY (case_id);


--
-- INDEXES
--

CREATE INDEX idx_assignments_active     ON public.assignments USING btree (is_active);
CREATE INDEX idx_assignments_created_by ON public.assignments USING btree (created_by);
CREATE INDEX idx_datasets_created_by    ON public.datasets    USING btree (created_by);
CREATE INDEX idx_datasets_name          ON public.datasets    USING btree (name);
CREATE INDEX idx_exercises_assign       ON public.exercises   USING btree (assign_id);
CREATE INDEX idx_exercises_dataset      ON public.exercises   USING btree (dataset_id);
CREATE INDEX idx_exercises_order        ON public.exercises   USING btree (assign_id, order_num);
CREATE INDEX idx_submissions_date       ON public.submissions USING btree (submitted_at DESC);
CREATE INDEX idx_submissions_exercise   ON public.submissions USING btree (exercise_id);
CREATE INDEX idx_submissions_student    ON public.submissions USING btree (user_id);
CREATE INDEX idx_users_email            ON public.users       USING btree (email);
CREATE INDEX idx_users_role             ON public.users       USING btree (role);
CREATE INDEX idx_test_cases_exercise    ON public.test_cases  USING btree (exercise_id);


--
-- FOREIGN KEYS
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(category_id);

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;

ALTER TABLE ONLY public.datasets
    ADD CONSTRAINT datasets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;

ALTER TABLE ONLY public.exercises
    ADD CONSTRAINT exercises_assign_id_fkey FOREIGN KEY (assign_id) REFERENCES public.assignments(assign_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.exercises
    ADD CONSTRAINT exercises_dataset_id_fkey FOREIGN KEY (dataset_id) REFERENCES public.datasets(dataset_id) ON DELETE SET NULL;

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.exercises(exercise_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_student_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.test_cases
    ADD CONSTRAINT test_cases_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.exercises(exercise_id) ON DELETE CASCADE;


--
-- จบไฟล์ 000_create_initial_schema.sql
--
