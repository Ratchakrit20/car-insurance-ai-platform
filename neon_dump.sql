--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6 (0d47993)
-- Dumped by pg_dump version 17.5

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

--
-- Name: set_timestamp_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_timestamp_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;


--
-- Name: sync_eval_img_is_annotated(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_eval_img_is_annotated() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  tgt_id bigint;
  has bool;
BEGIN
  IF TG_OP = 'DELETE' THEN
    tgt_id := OLD.evaluation_image_id;
  ELSE
    tgt_id := NEW.evaluation_image_id;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM image_damage_annotations WHERE evaluation_image_id = tgt_id
  ) INTO has;

  UPDATE evaluation_images SET is_annotated = has WHERE id = tgt_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accident_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accident_details (
    id integer NOT NULL,
    accident_type character varying(100) NOT NULL,
    accident_date date NOT NULL,
    accident_time time without time zone NOT NULL,
    province character varying(100),
    district character varying(100),
    road character varying(255),
    area_type character varying(100) NOT NULL,
    nearby text NOT NULL,
    details text NOT NULL,
    latitude numeric(10,6) NOT NULL,
    longitude numeric(10,6) NOT NULL,
    accuracy numeric(6,2),
    file_url jsonb DEFAULT '[]'::jsonb,
    agreed boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    media_type jsonb DEFAULT '[]'::jsonb,
    file_url_backup text,
    media_type_backup character varying(20),
    CONSTRAINT claim_evidences_media_type_chk CHECK (((jsonb_typeof(media_type) = 'array'::text) AND ((jsonb_array_length(media_type) = 0) OR jsonb_path_exists(media_type, '$[*]?(@ == "image" || @ == "video")'::jsonpath))))
);


--
-- Name: TABLE accident_details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.accident_details IS 'ตารางเก็บข้อมูลการแจ้งเหตุอุบัติเหตุและรายละเอียดสำหรับการเคลมประกัน';


--
-- Name: COLUMN accident_details.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accident_details.id IS 'รหัสอุบัติเหตุ (Primary Key, auto increment)';


--
-- Name: COLUMN accident_details.accident_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accident_details.accident_type IS 'ประเภทของอุบัติเหตุ เช่น ชนท้าย, ชนเอง/ล้ม';


--
-- Name: COLUMN accident_details.accident_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accident_details.accident_date IS 'วันที่เกิดเหตุ (YYYY-MM-DD)';


--
-- Name: COLUMN accident_details.accident_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accident_details.accident_time IS 'เวลาเกิดเหตุ (HH:MM:SS)';


--
-- Name: COLUMN accident_details.province; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accident_details.province IS 'จังหวัดที่เกิดเหตุ';


--
-- Name: COLUMN accident_details.district; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accident_details.district IS 'อำเภอ/เขตที่เกิดเหตุ';


--
-- Name: COLUMN accident_details.road; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accident_details.road IS 'ชื่อถนนที่เกิดเหตุ (ถ้ามี)';


--
-- Name: COLUMN accident_details.area_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accident_details.area_type IS 'ประเภทพื้นที่ เช่น ทางหลวง, ในเมือง, ชุมชน';


--
-- Name: COLUMN accident_details.nearby; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accident_details.nearby IS 'จุดสังเกตหรือสถานที่ใกล้เคียงที่สามารถอ้างอิงได้';


--
-- Name: COLUMN accident_details.details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accident_details.details IS 'รายละเอียดเพิ่มเติมเกี่ยวกับเหตุการณ์';


--
-- Name: COLUMN accident_details.latitude; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accident_details.latitude IS 'พิกัดละติจูด (Latitude) ความละเอียด 6 ตำแหน่งทศนิยม';


--
-- Name: COLUMN accident_details.longitude; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accident_details.longitude IS 'พิกัดลองจิจูด (Longitude) ความละเอียด 6 ตำแหน่งทศนิยม';


--
-- Name: COLUMN accident_details.accuracy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accident_details.accuracy IS 'ความแม่นยำของพิกัด (หน่วยเป็นเมตร)';


--
-- Name: COLUMN accident_details.file_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accident_details.file_url IS 'URL หรือ path ของไฟล์หลักฐาน (รูปภาพหรือวิดีโอ)';


--
-- Name: COLUMN accident_details.agreed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accident_details.agreed IS 'สถานะการยืนยันข้อมูลจากผู้แจ้งเหตุ';


--
-- Name: COLUMN accident_details.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accident_details.created_at IS 'วันที่และเวลาที่สร้างข้อมูลการแจ้งเหตุ';


--
-- Name: COLUMN accident_details.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accident_details.updated_at IS 'วันที่และเวลาที่แก้ไขข้อมูลล่าสุด';


--
-- Name: accident_details_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.accident_details_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: accident_details_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.accident_details_id_seq OWNED BY public.accident_details.id;


--
-- Name: claim_request_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.claim_request_steps (
    id bigint NOT NULL,
    claim_request_id bigint NOT NULL,
    step_type character varying(50) NOT NULL,
    step_order integer,
    note text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: claim_request_steps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.claim_request_steps_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: claim_request_steps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.claim_request_steps_id_seq OWNED BY public.claim_request_steps.id;


--
-- Name: claim_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.claim_requests (
    id bigint NOT NULL,
    user_id integer NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    approved_by integer,
    approved_at timestamp without time zone,
    admin_note text,
    selected_car_id integer,
    accident_detail_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    incomplete_at timestamp without time zone,
    rejected_at timestamp without time zone,
    rejected_by integer,
    incomplete_by integer,
    incomplete_history jsonb DEFAULT '[]'::jsonb,
    resubmitted_history jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT ck_claim_requests_status CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('approved'::character varying)::text, ('rejected'::character varying)::text, ('incomplete'::character varying)::text])))
);


--
-- Name: TABLE claim_requests; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.claim_requests IS 'ตารางเก็บคำขอเริ่มต้นสำหรับกระบวนการเคลม/แจ้งเหตุ';


--
-- Name: COLUMN claim_requests.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.claim_requests.user_id IS 'id ลูกค้า';


--
-- Name: COLUMN claim_requests.approved_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.claim_requests.approved_by IS 'id เจ้าหน้าที่ประกัน';


--
-- Name: COLUMN claim_requests.admin_note; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.claim_requests.admin_note IS 'ข้อความเพิ่มเติมจากเจ้าหน้าที่ประกัน';


--
-- Name: COLUMN claim_requests.selected_car_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.claim_requests.selected_car_id IS 'รถที่จะเคลม';


--
-- Name: COLUMN claim_requests.accident_detail_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.claim_requests.accident_detail_id IS 'อ้างอิงรายการรายละเอียดอุบัติเหตุ (accident_details.id)';


--
-- Name: COLUMN claim_requests.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.claim_requests.updated_at IS 'วันและเวลาที่แก้ไขล่าสุด (อัปเดตอัตโนมัติด้วย Trigger)';


--
-- Name: claim_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.claim_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: claim_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.claim_requests_id_seq OWNED BY public.claim_requests.id;


--
-- Name: evaluation_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evaluation_images (
    id bigint NOT NULL,
    claim_id bigint NOT NULL,
    original_url text NOT NULL,
    damage_note text,
    side character varying(10) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_annotated boolean DEFAULT false NOT NULL,
    CONSTRAINT evaluation_images_side_check CHECK (((side)::text = ANY ((ARRAY['ซ้าย'::character varying, 'ขวา'::character varying, 'หน้า'::character varying, 'หลัง'::character varying, 'ไม่ระบุ'::character varying, 'หน้าซ้าย'::character varying, 'หลังซ้าย'::character varying, 'หน้าขวา'::character varying, 'หลังขวา'::character varying])::text[])))
);


--
-- Name: evaluation_images_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.evaluation_images ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.evaluation_images_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: image_damage_annotations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.image_damage_annotations (
    id bigint NOT NULL,
    evaluation_image_id bigint NOT NULL,
    part_name character varying(100) NOT NULL,
    damage_name text[] NOT NULL,
    severity character(1) DEFAULT 'A'::bpchar NOT NULL,
    area_percent integer,
    x double precision NOT NULL,
    y double precision NOT NULL,
    w double precision NOT NULL,
    h double precision NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    CONSTRAINT image_damage_annotations_area_percent_check CHECK (((area_percent >= 0) AND (area_percent <= 100))),
    CONSTRAINT image_damage_annotations_h_check CHECK (((h > (0)::double precision) AND (h <= (1)::double precision))),
    CONSTRAINT image_damage_annotations_severity_check CHECK ((severity = ANY (ARRAY['A'::bpchar, 'B'::bpchar, 'C'::bpchar, 'D'::bpchar]))),
    CONSTRAINT image_damage_annotations_w_check CHECK (((w > (0)::double precision) AND (w <= (1)::double precision))),
    CONSTRAINT image_damage_annotations_x_check CHECK (((x >= (0)::double precision) AND (x <= (1)::double precision))),
    CONSTRAINT image_damage_annotations_y_check CHECK (((y >= (0)::double precision) AND (y <= (1)::double precision)))
);


--
-- Name: image_damage_annotations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.image_damage_annotations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: image_damage_annotations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.image_damage_annotations_id_seq OWNED BY public.image_damage_annotations.id;


--
-- Name: insurance_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.insurance_policies (
    id integer NOT NULL,
    policy_number character varying(20) NOT NULL,
    insurance_company character varying(100) NOT NULL,
    insured_name character varying(100) NOT NULL,
    citizen_id character varying(13) NOT NULL,
    address text NOT NULL,
    coverage_start_date date NOT NULL,
    coverage_end_date date NOT NULL,
    coverage_end_time time without time zone,
    car_brand character varying(50) NOT NULL,
    car_license_plate character varying(20) NOT NULL,
    chassis_number character varying(50) NOT NULL,
    car_year integer NOT NULL,
    insurance_type character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    car_path text NOT NULL,
    car_model character varying(50) NOT NULL,
    car_color text,
    registration_province character varying(50) NOT NULL
);


--
-- Name: TABLE insurance_policies; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.insurance_policies IS 'ตารางเก็บข้อมูลกรมธรรม์ประกันภัยรถยนต์';


--
-- Name: COLUMN insurance_policies.policy_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.insurance_policies.policy_number IS 'เลขที่กรมธรรม์ประกันภัย';


--
-- Name: COLUMN insurance_policies.insurance_company; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.insurance_policies.insurance_company IS 'ชื่อบริษัทผู้รับประกันภัย';


--
-- Name: COLUMN insurance_policies.insured_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.insurance_policies.insured_name IS 'ชื่อผู้เอาประกันภัย';


--
-- Name: COLUMN insurance_policies.citizen_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.insurance_policies.citizen_id IS 'เลขบัตรประชาชนของผู้เอาประกัน';


--
-- Name: COLUMN insurance_policies.address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.insurance_policies.address IS 'ที่อยู่ของผู้เอาประกันภัย';


--
-- Name: COLUMN insurance_policies.coverage_start_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.insurance_policies.coverage_start_date IS 'วันที่เริ่มต้นความคุ้มครอง';


--
-- Name: COLUMN insurance_policies.coverage_end_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.insurance_policies.coverage_end_date IS 'วันที่สิ้นสุดความคุ้มครอง';


--
-- Name: COLUMN insurance_policies.coverage_end_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.insurance_policies.coverage_end_time IS 'เวลาสิ้นสุดความคุ้มครอง';


--
-- Name: COLUMN insurance_policies.car_brand; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.insurance_policies.car_brand IS 'ยี่ห้อรถยนต์ที่เอาประกัน';


--
-- Name: COLUMN insurance_policies.car_license_plate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.insurance_policies.car_license_plate IS 'เลขทะเบียนรถ';


--
-- Name: COLUMN insurance_policies.chassis_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.insurance_policies.chassis_number IS 'เลขตัวถังรถยนต์';


--
-- Name: COLUMN insurance_policies.car_year; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.insurance_policies.car_year IS 'ปีที่ผลิตของรถยนต์';


--
-- Name: COLUMN insurance_policies.insurance_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.insurance_policies.insurance_type IS 'ประเภทของประกัน เช่น ชั้น 1, ชั้น 2+';


--
-- Name: COLUMN insurance_policies.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.insurance_policies.created_at IS 'วันที่และเวลาที่สร้างรายการนี้';


--
-- Name: COLUMN insurance_policies.car_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.insurance_policies.car_path IS 'รูปภาพรถยนต์';


--
-- Name: insurance_policies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.insurance_policies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: insurance_policies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.insurance_policies_id_seq OWNED BY public.insurance_policies.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer,
    title text NOT NULL,
    message text NOT NULL,
    type character varying(50),
    link_to text,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    full_name character varying(100) NOT NULL,
    citizen_id character varying(13) NOT NULL,
    email character varying(100) NOT NULL,
    phone_number character varying(20) NOT NULL,
    password_hash text NOT NULL,
    address text NOT NULL,
    role character varying(20) DEFAULT 'customer'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.users IS 'ตารางเก็บข้อมูลลูกค้า';


--
-- Name: COLUMN users.full_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.full_name IS 'ชื่อและนามสกุลของลูกค้า';


--
-- Name: COLUMN users.citizen_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.citizen_id IS 'เลขประจำตัวประชาชน ใช้ยืนยันสิทธิ์';


--
-- Name: COLUMN users.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.email IS 'อีเมลของลูกค้า ใช้สำหรับเข้าสู่ระบบ';


--
-- Name: COLUMN users.phone_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.phone_number IS 'เบอร์โทรศัพท์ของลูกค้า';


--
-- Name: COLUMN users.password_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.password_hash IS 'รหัสผ่านที่ถูกเข้ารหัสแล้ว (hash)';


--
-- Name: COLUMN users.address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.address IS 'ที่อยู่ของลูกค้า';


--
-- Name: COLUMN users.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.role IS 'บทบาทของผู้ใช้งาน เช่น customer, admin, staff';


--
-- Name: COLUMN users.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.created_at IS 'วันที่สมัครใช้งานระบบ';


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: accident_details id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accident_details ALTER COLUMN id SET DEFAULT nextval('public.accident_details_id_seq'::regclass);


--
-- Name: claim_request_steps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claim_request_steps ALTER COLUMN id SET DEFAULT nextval('public.claim_request_steps_id_seq'::regclass);


--
-- Name: claim_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claim_requests ALTER COLUMN id SET DEFAULT nextval('public.claim_requests_id_seq'::regclass);


--
-- Name: image_damage_annotations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_damage_annotations ALTER COLUMN id SET DEFAULT nextval('public.image_damage_annotations_id_seq'::regclass);


--
-- Name: insurance_policies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insurance_policies ALTER COLUMN id SET DEFAULT nextval('public.insurance_policies_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: accident_details; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.accident_details (id, accident_type, accident_date, accident_time, province, district, road, area_type, nearby, details, latitude, longitude, accuracy, file_url, agreed, created_at, updated_at, media_type, file_url_backup, media_type_backup) FROM stdin;
1	ชนสิ่งของ	2025-10-31	23:02:00	นนทบุรี	เมืองนนทบุรี	ไๆ	ทางหลวง	ไๆ	เลี้ยวแล้วเฉี่ยวกำแพงด้านข้าง	13.736717	100.523186	0.00	["https://res.cloudinary.com/dggip608e/image/upload/v1762354857/%E0%B8%AB%E0%B8%99%E0%B9%89-x_6_gpeafw.png"]	t	2025-11-05 22:01:26.666852	2025-11-05 22:01:26.666852	["image"]	\N	\N
2	ชนสัตว์	2025-10-30	23:29:00	กรุงเทพมหานคร	พระนคร	123w	ทางหลวง	23	ขับรถอยู่ในเส้นทางชนบท มีสุนัขวิ่งตัดหน้าและเบรกไม่ทัน	13.736717	100.523186	0.00	[]	t	2025-11-05 22:29:43.765913	2025-11-05 22:29:43.765913	[]	\N	\N
3	ชนสัตว์	2025-10-29	11:55:00	พระนครศรีอยุธยา	วังน้อย	กฟไก	ทางหลวง	กกฟไ	ขณะขับรถกลางคืน มีสัตว์วิ่งตัดหน้า ทำให้เฉี่ยวชน	14.236774	100.727497	0.00	[]	t	2025-11-05 22:54:53.923293	2025-11-05 22:54:53.923293	[]	\N	\N
4	ถูกชนขนะจอดอยู่	2025-11-01	12:29:00	กรุงเทพมหานคร	เขตบางรัก	ถนนสีลม	ชุมชน/หมู่บ้าน	ใกล้ๆปั๊มน้ำมัน ปตท. สีลม ซอย 6	กล้องหน้ารถบันทึกไว้ พบว่ามีรถเก๋งชนแล้วขับออกไป	13.727902	100.532760	0.00	["https://res.cloudinary.com/dggip608e/video/upload/v1762360019/%E0%B8%A3%E0%B8%96%E0%B8%8A%E0%B8%99_ncavlw.mp4"]	t	2025-11-05 23:39:08.131794	2025-11-05 23:42:43.778219	["video"]	\N	\N
5	ชนสัตว์	2025-10-30	23:57:00	สุราษฎร์ธานี	เกาะสมุย	fe	ชุมชน/หมู่บ้าน	fe	fe	13.736717	100.523186	0.00	["https://res.cloudinary.com/dggip608e/image/upload/v1762361782/%E0%B8%AB%E0%B8%99%E0%B9%89-x_6_c9jy7i.png"]	t	2025-11-05 23:56:48.203832	2025-11-05 23:56:48.203832	["image"]	\N	\N
6	ชนสัตว์	2025-10-31	03:19:00	กรุงเทพมหานคร	เขตดุสิต	ๅ/ไ-	ชุมชน/หมู่บ้าน	-/ๅ	ขับรถอยู่ในเส้นทางชนบท มีสุนัขวิ่งตัดหน้าและเบรกไม่ทัน	13.736717	100.523186	0.00	["https://res.cloudinary.com/dggip608e/image/upload/v1762370228/%E0%B8%AB%E0%B8%99%E0%B9%89-x_5_m1zksr.png"]	t	2025-11-06 02:19:02.393433	2025-11-06 02:23:46.478231	["image"]	\N	\N
7	ชนสิ่งของ	2025-11-05	08:24:00				ชุมชน/หมู่บ้าน	7-11	เลี้ยวแล้วเฉี่ยวกำแพงด้านข้าง	13.738089	100.523413	0.00	["https://res.cloudinary.com/dggip608e/video/upload/v1762392199/istockphoto-948679414-640_adpp_is_bryzuh.mp4"]	t	2025-11-06 08:24:51.170436	2025-11-06 08:24:51.170436	["video"]	\N	\N
8	ชนสัตว์	2025-10-31	10:52:00				ชุมชน/หมู่บ้าน	7	ขณะขับรถกลางคืน มีสัตว์วิ่งตัดหน้า ทำให้เฉี่ยวชน	13.737401	100.526095	0.00	[]	t	2025-11-06 09:53:06.645545	2025-11-06 09:53:06.645545	[]	\N	\N
9	ชนสัตว์	2025-11-05	09:56:00				ทางหลวง	7-11	ขณะขับรถกลางคืน มีสัตว์วิ่งตัดหน้า ทำให้เฉี่ยวชน	13.736717	100.523186	0.00	[]	t	2025-11-06 09:57:20.828517	2025-11-06 09:57:20.828517	[]	\N	\N
\.


--
-- Data for Name: claim_request_steps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.claim_request_steps (id, claim_request_id, step_type, step_order, note, created_at) FROM stdin;
\.


--
-- Data for Name: claim_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.claim_requests (id, user_id, status, approved_by, approved_at, admin_note, selected_car_id, accident_detail_id, created_at, updated_at, incomplete_at, rejected_at, rejected_by, incomplete_by, incomplete_history, resubmitted_history) FROM stdin;
4	3	approved	1	2025-11-05 23:47:24	null	1	4	2025-11-05 23:39:08.131794	2025-11-05 23:47:24.334122	2025-11-05 23:41:11	\N	\N	1	[{"note": "{\\"incident\\":{\\"checked\\":true,\\"comment\\":\\"แก้ 1.1 รายละเอียดที่เกิดเหตุ\\"},\\"accident\\":{\\"checked\\":true,\\"comment\\":\\"แก้ 1.2 รายละเอียดอุบัติเหตุ\\"},\\"evidence\\":[{\\"url\\":\\"https://res.cloudinary.com/dggip608e/video/upload/v1762360019/%E0%B8%A3%E0%B8%96%E0%B8%8A%E0%B8%99_ncavlw.mp4\\",\\"checked\\":true,\\"comment\\":\\"แก้ 1.2 หมวดที่ 2: หลักฐานภาพ / วิดีโอ\\"}],\\"damage\\":[{\\"url\\":\\"https://res.cloudinary.com/dggip608e/image/upload/v1762360604/%E0%B8%AB%E0%B8%99%E0%B9%89-x_2_qrr1i9.png\\",\\"side\\":\\"หน้าขวา\\",\\"checked\\":true,\\"comment\\":\\"แก้ หมวดที่ 3: รูปความเสียหาย\\"},{\\"url\\":\\"https://res.cloudinary.com/dggip608e/image/upload/v1762360604/%E0%B8%AB%E0%B8%99%E0%B9%89-x_3_upthv7.png\\",\\"side\\":\\"หน้าขวา\\",\\"checked\\":false,\\"comment\\":\\"\\"},{\\"url\\":\\"https://res.cloudinary.com/dggip608e/image/upload/v1762360619/%E0%B8%AB%E0%B8%99%E0%B9%89-x_4_cvxy4b.png\\",\\"side\\":\\"ขวา\\",\\"checked\\":false,\\"comment\\":\\"\\"},{\\"url\\":\\"https://res.cloudinary.com/dggip608e/image/upload/v1762360604/%E0%B8%AB%E0%B8%99%E0%B9%89-x_5_oura4c.png\\",\\"side\\":\\"ขวา\\",\\"checked\\":false,\\"comment\\":\\"\\"},{\\"url\\":\\"https://res.cloudinary.com/dggip608e/image/upload/v1762360604/%E0%B8%AB%E0%B8%99%E0%B9%89-x_6_vhiqpa.png\\",\\"side\\":\\"หน้าขวา\\",\\"checked\\":false,\\"comment\\":\\"\\"},{\\"url\\":\\"https://res.cloudinary.com/dggip608e/image/upload/v1762360604/%E0%B8%AB%E0%B8%99%E0%B9%89-x_7_e4ckgw.png\\",\\"side\\":\\"ซ้าย\\",\\"checked\\":false,\\"comment\\":\\"\\"},{\\"url\\":\\"https://res.cloudinary.com/dggip608e/image/upload/v1762360605/%E0%B8%AB%E0%B8%99%E0%B9%89-x_8_zompmh.png\\",\\"side\\":\\"หลังซ้าย\\",\\"checked\\":false,\\"comment\\":\\"\\"}],\\"note\\":\\"\\"}", "time": "2025-11-05T23:41:11+07:00"}]	[{"note": "ผู้ใช้ส่งเอกสารที่แก้ไขแล้วกลับมาใหม่", "time": "2025-11-05T23:42:45+07:00"}]
7	3	approved	1	2025-11-06 08:27:04	null	5	7	2025-11-06 08:24:51.170436	2025-11-06 08:27:05.861415	\N	\N	\N	\N	[]	[]
8	3	pending	\N	\N	\N	6	8	2025-11-06 09:53:06.645545	2025-11-06 09:53:06.645545	\N	\N	\N	\N	[]	[]
9	3	approved	1	2025-11-06 10:01:49	null	1	9	2025-11-06 09:57:20.828517	2025-11-06 10:01:50.28685	\N	\N	\N	\N	[]	[]
\.


--
-- Data for Name: evaluation_images; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.evaluation_images (id, claim_id, original_url, damage_note, side, created_at, is_annotated) FROM stdin;
60	7	https://res.cloudinary.com/dggip608e/image/upload/v1762392277/Annotation_2025-11-05_153319_c1t7pg.png	\N	หลังขวา	2025-11-06 08:24:51.170436+07	t
22	4	https://res.cloudinary.com/dggip608e/image/upload/v1762360619/%E0%B8%AB%E0%B8%99%E0%B9%89-x_4_cvxy4b.png		ขวา	2025-11-05 23:42:43.778219+07	t
20	4	https://res.cloudinary.com/dggip608e/image/upload/v1762360604/%E0%B8%AB%E0%B8%99%E0%B9%89-x_2_qrr1i9.png	แก้แล้ว	หน้าขวา	2025-11-05 23:42:43.778219+07	t
23	4	https://res.cloudinary.com/dggip608e/image/upload/v1762360604/%E0%B8%AB%E0%B8%99%E0%B9%89-x_5_oura4c.png		ขวา	2025-11-05 23:42:43.778219+07	t
24	4	https://res.cloudinary.com/dggip608e/image/upload/v1762360604/%E0%B8%AB%E0%B8%99%E0%B9%89-x_6_vhiqpa.png		หน้าขวา	2025-11-05 23:42:43.778219+07	t
21	4	https://res.cloudinary.com/dggip608e/image/upload/v1762360604/%E0%B8%AB%E0%B8%99%E0%B9%89-x_3_upthv7.png		หน้าขวา	2025-11-05 23:42:43.778219+07	t
25	4	https://res.cloudinary.com/dggip608e/image/upload/v1762360604/%E0%B8%AB%E0%B8%99%E0%B9%89-x_7_e4ckgw.png		ซ้าย	2025-11-05 23:42:43.778219+07	t
26	4	https://res.cloudinary.com/dggip608e/image/upload/v1762360605/%E0%B8%AB%E0%B8%99%E0%B9%89-x_8_zompmh.png		หลังซ้าย	2025-11-05 23:42:43.778219+07	t
61	8	https://res.cloudinary.com/dggip608e/image/upload/v1762397579/B6FtNKtgSqRqbnNsUt3WyWs8SwhVCAiHzSzjPz9YYMueZPzGIg0uT29aWiro9Mu3aW01S_fpvngh.jpg	\N	หน้าขวา	2025-11-06 09:53:06.645545+07	f
62	9	https://res.cloudinary.com/dggip608e/image/upload/v1762397836/o482i6y0s4z1KU3i4Ze-o_pnxbix.jpg	\N	หน้าขวา	2025-11-06 09:57:20.828517+07	t
\.


--
-- Data for Name: image_damage_annotations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.image_damage_annotations (id, evaluation_image_id, part_name, damage_name, severity, area_percent, x, y, w, h, created_at, updated_at) FROM stdin;
87	60	ประตูหลัง	{บุบ}	B	11	0.57	0.086	0.228	0.598	2025-11-06 08:26:48.020243+07	\N
88	60	แผงบังโคลนหลัง	{บุบ}	B	37	0.389	0.33	0.291	0.356	2025-11-06 08:26:48.020243+07	\N
89	62	คิ้ว/สเกิร์ตข้าง	{ขีดข่วน}	A	3	0.034	0.605	0.586	0.395	2025-11-06 10:00:25.615391+07	\N
90	62	ประตูหน้า	{บุบ}	B	10	0.002	0.009	0.608	0.981	2025-11-06 10:00:25.615391+07	\N
91	62	บังโคลน/แก้มข้าง	{บุบ}	B	38	0.55	0.027	0.37	0.514	2025-11-06 10:00:25.615391+07	\N
92	62	ล้อหน้า	{ยางแบน}	B	9	0.653	0.459	0.281	0.334	2025-11-06 10:00:25.615391+07	\N
25	20	ฝากระโปรงหน้า	{บุบ}	B	9	0.283	0.267	0.645	0.294	2025-11-05 23:44:23.158281+07	\N
26	20	กันชนหน้า	{บุบ}	B	10	0.409	0.486	0.577	0.511	2025-11-05 23:44:23.158281+07	\N
27	20	ไฟหน้า	{ไฟแตก}	D	96	0.364	0.47	0.267	0.172	2025-11-05 23:44:23.158281+07	\N
28	20	บังโคลน/แก้มข้าง	{บุบ}	C	70	0.195	0.294	0.153	0.398	2025-11-05 23:44:23.158281+07	\N
29	21	กันชนหน้า	{ร้าว,ขีดข่วน}	B	7	0.086	0.317	0.914	0.659	2025-11-05 23:44:32.34876+07	\N
30	21	ฝากระโปรงหน้า	{บุบ}	B	18	0.141	0	0.858	0.394	2025-11-05 23:44:32.34876+07	\N
31	21	ไฟหน้า	{ไฟแตก}	D	99	0.361	0.291	0.514	0.25	2025-11-05 23:44:32.34876+07	\N
32	21	บังโคลน/แก้มข้าง	{บุบ}	B	42	0.008	0.002	0.267	0.566	2025-11-05 23:44:32.34876+07	\N
33	22	ไฟหน้า	{ไฟแตก}	C	68	0.894	0.578	0.086	0.059	2025-11-05 23:44:39.481798+07	\N
34	22	บังโคลน/แก้มข้าง	{บุบ}	C	64	0.705	0.492	0.238	0.319	2025-11-05 23:44:39.481798+07	\N
35	22	กันชนหน้า	{บุบ}	B	16	0.847	0.598	0.152	0.309	2025-11-05 23:44:39.481798+07	\N
36	23	ประตูหน้า	{ขีดข่วน}	A	11	0.277	0	0.719	0.961	2025-11-05 23:45:09.619926+07	\N
37	23	ประตูหลัง	{ขีดข่วน}	A	2	0	0	0.355	0.963	2025-11-05 23:45:09.619926+07	\N
38	24	ฝากระโปรงหน้า	{บุบ}	B	26	0.323	0.088	0.472	0.238	2025-11-05 23:45:21.913936+07	\N
39	24	บังโคลน/แก้มข้าง	{บุบ}	C	70	0.158	0.156	0.658	0.683	2025-11-05 23:45:21.913936+07	\N
40	25	ประตูหลัง	{บุบ}	B	33	0.544	0.236	0.234	0.506	2025-11-05 23:45:36.013409+07	\N
41	25	บังโคลน/แก้มข้าง	{บุบ}	B	4	0.111	0.423	0.2	0.334	2025-11-05 23:45:36.013409+07	\N
42	25	แผงบังโคลนหลัง	{บุบ}	B	19	0.695	0.384	0.188	0.314	2025-11-05 23:45:36.013409+07	\N
43	26	ประตูหลัง	{บุบ}	B	35	0.141	0	0.689	0.978	2025-11-05 23:45:52.560147+07	\N
44	26	แผงบังโคลนหลัง	{บุบ}	B	23	0.495	0.02	0.505	0.931	2025-11-05 23:45:52.560147+07	\N
45	26	คิ้ว/สเกิร์ตข้าง	{ขีดข่วน}	A	11	0	0.88	0.594	0.119	2025-11-05 23:45:52.560147+07	\N
\.


--
-- Data for Name: insurance_policies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.insurance_policies (id, policy_number, insurance_company, insured_name, citizen_id, address, coverage_start_date, coverage_end_date, coverage_end_time, car_brand, car_license_plate, chassis_number, car_year, insurance_type, created_at, car_path, car_model, car_color, registration_province) FROM stdin;
4	CIT-TH-25-0005611	บริษัท จีเอเบิล จำกัด (มหาชน)	นายนัทธพงษ์ รักกฤษ	1111111111111	1234555	2023-02-17	2029-07-18	23:40:00	Honda	ก 5555	MRHGK1660NP12ุ6456	2020	ชั้น 1	2025-11-01 21:35:05.211013	https://res.cloudinary.com/dggip608e/image/upload/v1762007679/%E0%B8%AB%E0%B8%99%E0%B9%89-x_1_lswjno.png	City RS1	ขาว	กรุงเทพมหานคร
5	0123456789A	บริษัท จีเอเบิล จำกัด (มหาชน)	นายรัชกฤช ถิรสัตยาภิบาล	1849901560821	123/45 แขวงบางรัก เขตบางรัก กรุงเทพมหานคร 10500	2025-10-08	2025-11-30	22:10:00	Mazda	1ขก 5678	MM7DJ2HABN0123456	2022	ชั้น 1	2025-11-05 22:08:46.630521	https://res.cloudinary.com/dggip608e/image/upload/v1762355320/Annotation_2025-11-05_153243_udcknn.png	Hatchback	บรอนซ์เงิน	กรุงเทพมหานคร
2	POL87654321	บริษัท จีเอเบิล จำกัด (มหาชน)	รัชกฤช ถิรสัตยาภิบาล	1849901560821	123/4 แขวงรามอินทรา เขตคันนายาว กรุงเทพฯ	2025-09-02	2025-09-29	21:00:00	Honda	กร 5678	HONDAJAZZ8765THAI	2019	ชั้น 1	2025-08-07 15:55:36.668283	https://res.cloudinary.com/dggip608e/image/upload/v1762356321/Screenshot_2025-04-22_225146_wjrkyd.jpg	Jazz	ดำ	กรุงเทพมหานคร
7	TYB2025110008	บริษัท จีเอเบิล จำกัด (มหาชน)	นายรัชกฤช ถิรสัตยาภิบาล	1849901560821	78/12 หมู่บ้านร่มสุข ซอยประชาอุทิศ 129 แขวงทุ่งครุ เขตทุ่งครุ กรุงเทพมหานคร 10140	2025-01-01	2028-01-01	12:00:00	Toyota	6กพ 2359	MR053HY9301508743	2010	ชั้น 1	2025-11-05 22:20:27.209806	https://res.cloudinary.com/dggip608e/image/upload/v1762356023/Screenshot_2025-11-05_151239_kuthgh.jpg	Yaris Hatchback	บรอนซ์เงิน	กรุงเทพมหานคร
6	HVB2025110003	บริษัท จีเอเบิล จำกัด (มหาชน)	นายรัชกฤช ถิรสัตยาภิบาล	1849901560821	55/450 ซ.7 หมู่บ้านวิลล่าดาวรุ่ง\nบ้าน	2025-01-01	2029-01-01	12:00:00	Honda	8กฮ 4456	MRHFL1770NP456789	2022	ชั้น 1	2025-11-05 22:18:17.336522	https://res.cloudinary.com/dggip608e/image/upload/v1762355893/image_pjveau.png	Civic	บรอนซ์เงิน	กรุงเทพมหานคร
1	POL12345678	บริษัท จีเอเบิล จำกัด (มหาชน)	รัชกฤช ถิรสัตยาภิบาล	1849901560821	123 หมู่บ้านสุขใจ เขตดินแดง กรุงเทพฯ	2025-09-02	2026-12-01	21:00:00	Toyota	ขจ 5586	MR2K3A503HH123456	2018	ชั้น 1	2025-08-07 15:31:52.305978	https://res.cloudinary.com/dggip608e/image/upload/v1762356215/image_x50bah.png	Yaris (Hatchback)	ขาว	ภูเก็ต
3	CIT-TH-25-0005679	บริษัท จีเอเบิล จำกัด (มหาชน)	นายรัชกฤช ถิรสัตยาภิบาล	1849901560821	123/45 แขวงบางรัก เขตบางรัก กรุงเทพมหานคร 10500	2025-01-01	2025-09-02	12:00:00	Honda	1กข 1234	MRHGK1660NP123456	2020	ชั้น 1	2025-09-03 21:13:04.191754	https://res.cloudinary.com/dggip608e/image/upload/v1762356304/Screenshot_2025-04-22_225629_xksyaj.jpg	City RS	ขาว	กรุงเทพมหานคร
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, title, message, type, link_to, is_read, created_at) FROM stdin;
1	5	ส่งคำขอเคลมสำเร็จ 	ระบบได้รับคำขอเคลมหมายเลข #1 แล้ว กำลังตรวจสอบโดยเจ้าหน้าที่	claim	/reports/1	f	2025-11-05 22:01:26.666852
2	3	ส่งคำขอเคลมสำเร็จ 	ระบบได้รับคำขอเคลมหมายเลข #2 แล้ว กำลังตรวจสอบโดยเจ้าหน้าที่	claim	/reports/2	f	2025-11-05 22:29:43.765913
3	3	ส่งคำขอเคลมสำเร็จ 	ระบบได้รับคำขอเคลมหมายเลข #3 แล้ว กำลังตรวจสอบโดยเจ้าหน้าที่	claim	/reports/3	f	2025-11-05 22:54:53.923293
4	3	ส่งคำขอเคลมสำเร็จ 	ระบบได้รับคำขอเคลมหมายเลข #4 แล้ว กำลังตรวจสอบโดยเจ้าหน้าที่	claim	/reports/4	f	2025-11-05 23:39:08.131794
5	3	เอกสารไม่ครบ กรุณาแก้ไข 	คำขอเคลมหมายเลข #4 ต้องแก้ไขเพิ่มเติม: โปรดตรวจสอบรายละเอียด	claim	/reports/4	f	2025-11-05 23:41:11.588425
6	3	ส่งเอกสารแก้ไขเรียบร้อย 	คุณได้ส่งคำขอเคลมหมายเลข #4 กลับมาให้เจ้าหน้าที่ตรวจสอบอีกครั้ง	claim	/reports/4	f	2025-11-05 23:42:43.778219
7	3	คำขอเคลมของคุณได้รับการอนุมัติแล้ว 	คำขอเคลมหมายเลข #4 ผ่านการตรวจสอบเรียบร้อยแล้ว	claim	/reports/4	f	2025-11-05 23:47:24.496473
8	3	ส่งคำขอเคลมสำเร็จ 	ระบบได้รับคำขอเคลมหมายเลข #5 แล้ว กำลังตรวจสอบโดยเจ้าหน้าที่	claim	/reports/5	f	2025-11-05 23:56:48.203832
9	3	คำขอเคลมของคุณได้รับการอนุมัติแล้ว 	คำขอเคลมหมายเลข #5 ผ่านการตรวจสอบเรียบร้อยแล้ว	claim	/reports/5	f	2025-11-06 01:11:02.816815
10	3	ส่งคำขอเคลมสำเร็จ 	ระบบได้รับคำขอเคลมหมายเลข #6 แล้ว กำลังตรวจสอบโดยเจ้าหน้าที่	claim	/reports/6	f	2025-11-06 02:19:02.393433
11	3	เอกสารไม่ครบ กรุณาแก้ไข 	คำขอเคลมหมายเลข #6 ต้องแก้ไขเพิ่มเติม: โปรดตรวจสอบรายละเอียด	claim	/reports/6	f	2025-11-06 02:19:56.865081
12	3	ส่งเอกสารแก้ไขเรียบร้อย 	คุณได้ส่งคำขอเคลมหมายเลข #6 กลับมาให้เจ้าหน้าที่ตรวจสอบอีกครั้ง	claim	/reports/6	f	2025-11-06 02:20:55.995314
13	3	เอกสารไม่ครบ กรุณาแก้ไข 	คำขอเคลมหมายเลข #6 ต้องแก้ไขเพิ่มเติม: โปรดตรวจสอบรายละเอียด	claim	/reports/6	f	2025-11-06 02:22:22.652359
14	3	ส่งเอกสารแก้ไขเรียบร้อย 	คุณได้ส่งคำขอเคลมหมายเลข #6 กลับมาให้เจ้าหน้าที่ตรวจสอบอีกครั้ง	claim	/reports/6	f	2025-11-06 02:22:52.167553
15	3	เอกสารไม่ครบ กรุณาแก้ไข 	คำขอเคลมหมายเลข #6 ต้องแก้ไขเพิ่มเติม: โปรดตรวจสอบรายละเอียด	claim	/reports/6	f	2025-11-06 02:23:26.974628
16	3	ส่งเอกสารแก้ไขเรียบร้อย 	คุณได้ส่งคำขอเคลมหมายเลข #6 กลับมาให้เจ้าหน้าที่ตรวจสอบอีกครั้ง	claim	/reports/6	f	2025-11-06 02:23:46.478231
17	3	คำขอเคลมของคุณถูกปฏิเสธ 	คำขอเคลมหมายเลข #6 ถูกปฏิเสธ เนื่องจาก: ติดต่อเจ้าหน้าที่ประกัน	claim	/reports/6	f	2025-11-06 02:26:23.433947
18	3	ส่งคำขอเคลมสำเร็จ 	ระบบได้รับคำขอเคลมหมายเลข #7 แล้ว กำลังตรวจสอบโดยเจ้าหน้าที่	claim	/reports/7	f	2025-11-06 08:24:51.170436
19	3	คำขอเคลมของคุณได้รับการอนุมัติแล้ว 	คำขอเคลมหมายเลข #7 ผ่านการตรวจสอบเรียบร้อยแล้ว	claim	/reports/7	f	2025-11-06 08:27:06.02873
20	3	ส่งคำขอเคลมสำเร็จ 	ระบบได้รับคำขอเคลมหมายเลข #8 แล้ว กำลังตรวจสอบโดยเจ้าหน้าที่	claim	/reports/8	f	2025-11-06 09:53:06.645545
21	3	ส่งคำขอเคลมสำเร็จ 	ระบบได้รับคำขอเคลมหมายเลข #9 แล้ว กำลังตรวจสอบโดยเจ้าหน้าที่	claim	/reports/9	f	2025-11-06 09:57:20.828517
22	3	คำขอเคลมของคุณได้รับการอนุมัติแล้ว 	คำขอเคลมหมายเลข #9 ผ่านการตรวจสอบเรียบร้อยแล้ว	claim	/reports/9	f	2025-11-06 10:01:50.454565
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, full_name, citizen_id, email, phone_number, password_hash, address, role, created_at) FROM stdin;
4	รัชกฤช ถิรสัตยา	1849901560822	prad1@gmail.com	0817376545	$2b$10$Z2x9kJgTdjQK0hw80SIfE.LMK/xZnvb6AnGs5pOp/.6QaXGb//YxS	sp	customer	2025-09-04 20:21:10.474812
5	ton	1111111111111	ton@gmail.com	0988888888	$2b$10$xb/LsFnFXJD3zbIpONrKE.HR8kNhE.hFbfqH7xHBDf46AXy0FAilC	112314	customer	2025-10-04 04:27:13.359718
6	ton11	1111	ton11@gmail.com	1111	$2b$10$HYEETUXI1b/jHZQW4LyjHu/rB1jdEfjJZrU0SUPaZ9lbPz7NWFF4a	1111	customer	2025-10-15 22:37:48.459933
3	รัชกฤช ถิรสัตยาภิบาล	1849901560821	prad@gmail.com	0988888888	$2b$10$edsHeBbpQWladRgw.aCSsuLCWcqTRBKtc5y4L97ZrGrizIA/4.oQe	123455	customer	2025-08-04 22:04:48.63006
11	กฟไ				$2b$10$Ql0891sfdJhjWZhvNBY7cORX38UHiIj/ZyZtNIlVaobyfvKGmuZb6		customer	2025-10-24 10:08:32.928924
20	ton111	1111111111133	ton111@gmail.com	0988888833	$2b$10$d0CCsaoi70y.7mbJLiKmCufeaPmDNTXM1Xc5IgFwj9TG5tQ9EqYMe	3313	customer	2025-11-05 23:57:45.365825
1	สมชาย ใจดี	1849901560820	admin@gmail.com	0817376545	$2b$10$CsyNZ3BrI2oXVsEJ0RV1VuRD3pfrcb814GmnGIP3IqDSOFWdGJZWS	sp	admin	2025-08-04 21:54:50.339416
\.


--
-- Name: accident_details_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.accident_details_id_seq', 9, true);


--
-- Name: claim_request_steps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.claim_request_steps_id_seq', 1, false);


--
-- Name: claim_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.claim_requests_id_seq', 9, true);


--
-- Name: evaluation_images_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.evaluation_images_id_seq', 62, true);


--
-- Name: image_damage_annotations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.image_damage_annotations_id_seq', 92, true);


--
-- Name: insurance_policies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.insurance_policies_id_seq', 7, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notifications_id_seq', 22, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 20, true);


--
-- Name: accident_details accident_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accident_details
    ADD CONSTRAINT accident_details_pkey PRIMARY KEY (id);


--
-- Name: claim_request_steps claim_request_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claim_request_steps
    ADD CONSTRAINT claim_request_steps_pkey PRIMARY KEY (id);


--
-- Name: claim_requests claim_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claim_requests
    ADD CONSTRAINT claim_requests_pkey PRIMARY KEY (id);


--
-- Name: evaluation_images evaluation_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluation_images
    ADD CONSTRAINT evaluation_images_pkey PRIMARY KEY (id);


--
-- Name: image_damage_annotations image_damage_annotations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_damage_annotations
    ADD CONSTRAINT image_damage_annotations_pkey PRIMARY KEY (id);


--
-- Name: insurance_policies insurance_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insurance_policies
    ADD CONSTRAINT insurance_policies_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: users unique_citizen_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT unique_citizen_id UNIQUE (citizen_id);


--
-- Name: users unique_email; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT unique_email UNIQUE (email);


--
-- Name: users users_citizen_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_citizen_id_key UNIQUE (citizen_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_claim_requests_accident_detail_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_claim_requests_accident_detail_id ON public.claim_requests USING btree (accident_detail_id);


--
-- Name: idx_claim_requests_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_claim_requests_created_at ON public.claim_requests USING btree (created_at);


--
-- Name: idx_claim_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_claim_requests_status ON public.claim_requests USING btree (status);


--
-- Name: idx_claim_requests_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_claim_requests_updated_at ON public.claim_requests USING btree (updated_at);


--
-- Name: idx_claim_requests_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_claim_requests_user_id ON public.claim_requests USING btree (user_id);


--
-- Name: idx_evaluation_images_claim_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_evaluation_images_claim_id ON public.evaluation_images USING btree (claim_id);


--
-- Name: idx_ida_eval_image_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ida_eval_image_id ON public.image_damage_annotations USING btree (evaluation_image_id);


--
-- Name: idx_ida_evalimg; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ida_evalimg ON public.image_damage_annotations USING btree (evaluation_image_id);


--
-- Name: idx_ida_part; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ida_part ON public.image_damage_annotations USING btree (part_name);


--
-- Name: ux_ida_unique_rounded; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_ida_unique_rounded ON public.image_damage_annotations USING btree (evaluation_image_id, part_name, damage_name, round((x)::numeric, 3), round((y)::numeric, 3), round((w)::numeric, 3), round((h)::numeric, 3));


--
-- Name: image_damage_annotations t_sync_ann_del; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER t_sync_ann_del AFTER DELETE ON public.image_damage_annotations FOR EACH ROW EXECUTE FUNCTION public.sync_eval_img_is_annotated();


--
-- Name: image_damage_annotations t_sync_ann_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER t_sync_ann_ins AFTER INSERT ON public.image_damage_annotations FOR EACH ROW EXECUTE FUNCTION public.sync_eval_img_is_annotated();


--
-- Name: image_damage_annotations t_sync_ann_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER t_sync_ann_upd AFTER UPDATE ON public.image_damage_annotations FOR EACH ROW EXECUTE FUNCTION public.sync_eval_img_is_annotated();


--
-- Name: claim_requests trg_claim_requests_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_claim_requests_set_updated_at BEFORE UPDATE ON public.claim_requests FOR EACH ROW EXECUTE FUNCTION public.set_timestamp_updated_at();


--
-- Name: image_damage_annotations trg_ida_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ida_updated_at BEFORE UPDATE ON public.image_damage_annotations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: claim_request_steps claim_request_steps_claim_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claim_request_steps
    ADD CONSTRAINT claim_request_steps_claim_request_id_fkey FOREIGN KEY (claim_request_id) REFERENCES public.claim_requests(id) ON DELETE CASCADE;


--
-- Name: evaluation_images evaluation_images_claim_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluation_images
    ADD CONSTRAINT evaluation_images_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES public.claim_requests(id) ON DELETE CASCADE;


--
-- Name: claim_requests fk_claim_requests_accident_detail; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claim_requests
    ADD CONSTRAINT fk_claim_requests_accident_detail FOREIGN KEY (accident_detail_id) REFERENCES public.accident_details(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: claim_requests fk_claim_requests_approved_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claim_requests
    ADD CONSTRAINT fk_claim_requests_approved_by FOREIGN KEY (approved_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: claim_requests fk_claim_requests_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claim_requests
    ADD CONSTRAINT fk_claim_requests_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: image_damage_annotations image_damage_annotations_evaluation_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_damage_annotations
    ADD CONSTRAINT image_damage_annotations_evaluation_image_id_fkey FOREIGN KEY (evaluation_image_id) REFERENCES public.evaluation_images(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

