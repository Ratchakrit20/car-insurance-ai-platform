--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
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
-- Name: set_timestamp_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_timestamp_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_timestamp_updated_at() OWNER TO postgres;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

--
-- Name: sync_eval_img_is_annotated(); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.sync_eval_img_is_annotated() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accident_details; Type: TABLE; Schema: public; Owner: postgres
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
    file_url text NOT NULL,
    agreed boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    media_type character varying(10),
    CONSTRAINT claim_evidences_media_type_chk CHECK (((media_type)::text = ANY (ARRAY[('image'::character varying)::text, ('video'::character varying)::text])))
);


ALTER TABLE public.accident_details OWNER TO postgres;

--
-- Name: TABLE accident_details; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.accident_details IS 'ตารางเก็บข้อมูลการแจ้งเหตุอุบัติเหตุและรายละเอียดสำหรับการเคลมประกัน';


--
-- Name: COLUMN accident_details.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.accident_details.id IS 'รหัสอุบัติเหตุ (Primary Key, auto increment)';


--
-- Name: COLUMN accident_details.accident_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.accident_details.accident_type IS 'ประเภทของอุบัติเหตุ เช่น ชนท้าย, ชนเอง/ล้ม';


--
-- Name: COLUMN accident_details.accident_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.accident_details.accident_date IS 'วันที่เกิดเหตุ (YYYY-MM-DD)';


--
-- Name: COLUMN accident_details.accident_time; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.accident_details.accident_time IS 'เวลาเกิดเหตุ (HH:MM:SS)';


--
-- Name: COLUMN accident_details.province; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.accident_details.province IS 'จังหวัดที่เกิดเหตุ';


--
-- Name: COLUMN accident_details.district; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.accident_details.district IS 'อำเภอ/เขตที่เกิดเหตุ';


--
-- Name: COLUMN accident_details.road; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.accident_details.road IS 'ชื่อถนนที่เกิดเหตุ (ถ้ามี)';


--
-- Name: COLUMN accident_details.area_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.accident_details.area_type IS 'ประเภทพื้นที่ เช่น ทางหลวง, ในเมือง, ชุมชน';


--
-- Name: COLUMN accident_details.nearby; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.accident_details.nearby IS 'จุดสังเกตหรือสถานที่ใกล้เคียงที่สามารถอ้างอิงได้';


--
-- Name: COLUMN accident_details.details; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.accident_details.details IS 'รายละเอียดเพิ่มเติมเกี่ยวกับเหตุการณ์';


--
-- Name: COLUMN accident_details.latitude; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.accident_details.latitude IS 'พิกัดละติจูด (Latitude) ความละเอียด 6 ตำแหน่งทศนิยม';


--
-- Name: COLUMN accident_details.longitude; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.accident_details.longitude IS 'พิกัดลองจิจูด (Longitude) ความละเอียด 6 ตำแหน่งทศนิยม';


--
-- Name: COLUMN accident_details.accuracy; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.accident_details.accuracy IS 'ความแม่นยำของพิกัด (หน่วยเป็นเมตร)';


--
-- Name: COLUMN accident_details.file_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.accident_details.file_url IS 'URL หรือ path ของไฟล์หลักฐาน (รูปภาพหรือวิดีโอ)';


--
-- Name: COLUMN accident_details.agreed; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.accident_details.agreed IS 'สถานะการยืนยันข้อมูลจากผู้แจ้งเหตุ';


--
-- Name: COLUMN accident_details.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.accident_details.created_at IS 'วันที่และเวลาที่สร้างข้อมูลการแจ้งเหตุ';


--
-- Name: COLUMN accident_details.updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.accident_details.updated_at IS 'วันที่และเวลาที่แก้ไขข้อมูลล่าสุด';


--
-- Name: accident_details_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.accident_details_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.accident_details_id_seq OWNER TO postgres;

--
-- Name: accident_details_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.accident_details_id_seq OWNED BY public.accident_details.id;


--
-- Name: claim_requests; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.claim_requests OWNER TO postgres;

--
-- Name: TABLE claim_requests; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.claim_requests IS 'ตารางเก็บคำขอเริ่มต้นสำหรับกระบวนการเคลม/แจ้งเหตุ';


--
-- Name: COLUMN claim_requests.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.claim_requests.user_id IS 'id ลูกค้า';


--
-- Name: COLUMN claim_requests.approved_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.claim_requests.approved_by IS 'id เจ้าหน้าที่ประกัน';


--
-- Name: COLUMN claim_requests.admin_note; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.claim_requests.admin_note IS 'ข้อความเพิ่มเติมจากเจ้าหน้าที่ประกัน';


--
-- Name: COLUMN claim_requests.selected_car_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.claim_requests.selected_car_id IS 'รถที่จะเคลม';


--
-- Name: COLUMN claim_requests.accident_detail_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.claim_requests.accident_detail_id IS 'อ้างอิงรายการรายละเอียดอุบัติเหตุ (accident_details.id)';


--
-- Name: COLUMN claim_requests.updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.claim_requests.updated_at IS 'วันและเวลาที่แก้ไขล่าสุด (อัปเดตอัตโนมัติด้วย Trigger)';


--
-- Name: claim_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.claim_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.claim_requests_id_seq OWNER TO postgres;

--
-- Name: claim_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.claim_requests_id_seq OWNED BY public.claim_requests.id;


--
-- Name: evaluation_images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evaluation_images (
    id bigint NOT NULL,
    claim_id bigint NOT NULL,
    original_url text NOT NULL,
    damage_note text,
    side character varying(10) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_annotated boolean DEFAULT false NOT NULL,
    CONSTRAINT evaluation_images_side_check CHECK (((side)::text = ANY (ARRAY[('ซ้าย'::character varying)::text, ('ขวา'::character varying)::text, ('หน้า'::character varying)::text, ('หลัง'::character varying)::text, ('ไม่ระบุ'::character varying)::text])))
);


ALTER TABLE public.evaluation_images OWNER TO postgres;

--
-- Name: evaluation_images_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
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
-- Name: image_damage_annotations; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.image_damage_annotations OWNER TO postgres;

--
-- Name: image_damage_annotations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.image_damage_annotations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.image_damage_annotations_id_seq OWNER TO postgres;

--
-- Name: image_damage_annotations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.image_damage_annotations_id_seq OWNED BY public.image_damage_annotations.id;


--
-- Name: insurance_policies; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.insurance_policies OWNER TO postgres;

--
-- Name: TABLE insurance_policies; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.insurance_policies IS 'ตารางเก็บข้อมูลกรมธรรม์ประกันภัยรถยนต์';


--
-- Name: COLUMN insurance_policies.policy_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.insurance_policies.policy_number IS 'เลขที่กรมธรรม์ประกันภัย';


--
-- Name: COLUMN insurance_policies.insurance_company; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.insurance_policies.insurance_company IS 'ชื่อบริษัทผู้รับประกันภัย';


--
-- Name: COLUMN insurance_policies.insured_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.insurance_policies.insured_name IS 'ชื่อผู้เอาประกันภัย';


--
-- Name: COLUMN insurance_policies.citizen_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.insurance_policies.citizen_id IS 'เลขบัตรประชาชนของผู้เอาประกัน';


--
-- Name: COLUMN insurance_policies.address; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.insurance_policies.address IS 'ที่อยู่ของผู้เอาประกันภัย';


--
-- Name: COLUMN insurance_policies.coverage_start_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.insurance_policies.coverage_start_date IS 'วันที่เริ่มต้นความคุ้มครอง';


--
-- Name: COLUMN insurance_policies.coverage_end_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.insurance_policies.coverage_end_date IS 'วันที่สิ้นสุดความคุ้มครอง';


--
-- Name: COLUMN insurance_policies.coverage_end_time; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.insurance_policies.coverage_end_time IS 'เวลาสิ้นสุดความคุ้มครอง';


--
-- Name: COLUMN insurance_policies.car_brand; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.insurance_policies.car_brand IS 'ยี่ห้อรถยนต์ที่เอาประกัน';


--
-- Name: COLUMN insurance_policies.car_license_plate; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.insurance_policies.car_license_plate IS 'เลขทะเบียนรถ';


--
-- Name: COLUMN insurance_policies.chassis_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.insurance_policies.chassis_number IS 'เลขตัวถังรถยนต์';


--
-- Name: COLUMN insurance_policies.car_year; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.insurance_policies.car_year IS 'ปีที่ผลิตของรถยนต์';


--
-- Name: COLUMN insurance_policies.insurance_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.insurance_policies.insurance_type IS 'ประเภทของประกัน เช่น ชั้น 1, ชั้น 2+';


--
-- Name: COLUMN insurance_policies.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.insurance_policies.created_at IS 'วันที่และเวลาที่สร้างรายการนี้';


--
-- Name: COLUMN insurance_policies.car_path; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.insurance_policies.car_path IS 'รูปภาพรถยนต์';


--
-- Name: insurance_policies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.insurance_policies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.insurance_policies_id_seq OWNER TO postgres;

--
-- Name: insurance_policies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.insurance_policies_id_seq OWNED BY public.insurance_policies.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.users IS 'ตารางเก็บข้อมูลลูกค้า';


--
-- Name: COLUMN users.full_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.full_name IS 'ชื่อและนามสกุลของลูกค้า';


--
-- Name: COLUMN users.citizen_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.citizen_id IS 'เลขประจำตัวประชาชน ใช้ยืนยันสิทธิ์';


--
-- Name: COLUMN users.email; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.email IS 'อีเมลของลูกค้า ใช้สำหรับเข้าสู่ระบบ';


--
-- Name: COLUMN users.phone_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.phone_number IS 'เบอร์โทรศัพท์ของลูกค้า';


--
-- Name: COLUMN users.password_hash; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.password_hash IS 'รหัสผ่านที่ถูกเข้ารหัสแล้ว (hash)';


--
-- Name: COLUMN users.address; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.address IS 'ที่อยู่ของลูกค้า';


--
-- Name: COLUMN users.role; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.role IS 'บทบาทของผู้ใช้งาน เช่น customer, admin, staff';


--
-- Name: COLUMN users.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.created_at IS 'วันที่สมัครใช้งานระบบ';


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: accident_details id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accident_details ALTER COLUMN id SET DEFAULT nextval('public.accident_details_id_seq'::regclass);


--
-- Name: claim_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.claim_requests ALTER COLUMN id SET DEFAULT nextval('public.claim_requests_id_seq'::regclass);


--
-- Name: image_damage_annotations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.image_damage_annotations ALTER COLUMN id SET DEFAULT nextval('public.image_damage_annotations_id_seq'::regclass);


--
-- Name: insurance_policies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insurance_policies ALTER COLUMN id SET DEFAULT nextval('public.insurance_policies_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: accident_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.accident_details (id, accident_type, accident_date, accident_time, province, district, road, area_type, nearby, details, latitude, longitude, accuracy, file_url, agreed, created_at, updated_at, media_type) FROM stdin;
4	ชนท้าย	2025-08-16	22:58:00	กรุงเทพมหานคร	\N	\N	ชุมชน/หมู่บ้าน	7-11	ชน	9.106142	99.299838	28.10	https://res.cloudinary.com/dggip608e/image/upload/v1755273503/Screenshot_2025-04-22_225232_dq994m.jpg	t	2025-08-15 23:10:37.766171	2025-08-15 23:10:37.766171	image
5	ชนท้าย	2025-08-13	22:43:00	นนทบุรี	\N	\N	ชุมชน/หมู่บ้าน	cj	ต้นไม้หล่นทับ	7.868151	98.369032	13.28	https://res.cloudinary.com/dggip608e/image/upload/v1755416642/Screenshot_2025-04-22_225146_cewriq.jpg	t	2025-08-17 14:44:20.725723	2025-08-17 14:44:20.725723	image
6	ชนท้าย	2025-08-21	15:20:00	ภูเก็ต	เมืองภูเก็ต	เจ้าฟ้า	ในเมือง	7-11	ชนหมาตายห่า	7.868144	98.369030	11.99	https://res.cloudinary.com/dggip608e/image/upload/v1755418845/car4_dapzbx.jpg	t	2025-08-17 15:21:09.928075	2025-08-17 15:21:09.928075	image
14	ชนท้าย	2025-08-16	23:05:00	\N	\N	\N	ทางหลวง	aasf	adfsdg	13.827398	100.514300	15.00	https://res.cloudinary.com/dggip608e/image/upload/v1755792194/Screenshot_2025-04-22_225426_tb8rnm.jpg	t	2025-08-21 23:03:24.03992	2025-08-21 23:03:24.03992	image
15	ชนท้าย	2025-08-26	23:25:00	\N	\N	\N	ในเมือง	adgf	dfhdf	13.827343	100.514309	91.00	https://res.cloudinary.com/dggip608e/image/upload/v1756225519/24_pdf4bc.jpg	t	2025-08-26 23:25:29.091119	2025-08-26 23:25:29.091119	image
16	ถูกของตกใส่	2025-09-11	22:15:00	นนทบุรี	บางบัวทอง	หกอ	ในเมือง	หกอหกอ	หกอ	13.708000	100.583100	9999.99	https://res.cloudinary.com/dggip608e/image/upload/v1757089394/car1_nrynro.jpg	t	2025-09-05 23:39:53.757167	2025-09-05 23:39:53.757167	image
17	ชนเอง/ล้ม	2025-09-19	23:45:00	\N	\N	\N	ทางหลวง	sdfgh	sdfh	13.708000	100.583100	9999.99	https://res.cloudinary.com/dggip608e/image/upload/v1757090502/Screenshot_2025-04-22_225609_yemw8q.jpg	t	2025-09-05 23:41:47.74907	2025-09-05 23:41:47.74907	image
18	ชนท้าย	2025-09-12	23:44:00	\N	\N	\N	ในเมือง	dfbdfzb	dfbzdfb	13.708000	100.583100	9999.99	https://res.cloudinary.com/dggip608e/image/upload/v1757090601/S__11985054_0_eutcg7.jpg	t	2025-09-05 23:43:24.120092	2025-09-05 23:43:24.120092	image
19	รถถูกชนขณะจอดอยู่	2025-09-11	16:24:00	\N	\N	\N	ทางหลวง	aSF	ASDG	13.827571	100.514281	0.00	https://res.cloudinary.com/dggip608e/image/upload/v1757323371/Screenshot_2025-04-22_231107_fpbgxk.jpg	t	2025-09-08 16:23:00.359001	2025-09-08 16:23:00.359001	image
20	ชนเอง/ล้ม	2025-09-08	21:13:00	กรุงเทพมหานคร	ดุสิต	\N	ทางหลวง	asdfg	asdgdfa	13.827326	100.514278	0.00	https://res.cloudinary.com/dggip608e/image/upload/v1757341359/S__12009512_0_drkrck.jpg	t	2025-09-08 21:25:51.204889	2025-09-08 21:25:51.204889	image
22	ชนท้าย	2025-09-18	21:31:00	กรุงเทพมหานคร	พระนคร	asdf	ชุมชน/หมู่บ้าน	dghk,ryjl,	fhj.fyui.	13.827230	100.514328	0.00	https://res.cloudinary.com/dggip608e/image/upload/v1757779493/S__12009511_0_cxykbu.jpg	t	2025-09-13 23:05:05.398656	2025-09-13 23:05:05.398656	image
24	ชนท้าย	2025-09-09	21:30:00	\N	\N	\N	ทางหลวง	หกดเิฟหกดิ	ฟหกดิฟกหดิฟ	13.827464	100.514300	0.00	https://res.cloudinary.com/dggip608e/image/upload/v1757428196/1_chjwka.jpg	t	2025-09-14 00:48:27.427702	2025-09-14 00:48:27.427702	image
25	ชนท้าย	2025-09-09	21:30:00	\N	\N	\N	ทางหลวง	กดฟิฟหกดิ	หกดิหกดิ	13.827464	100.514300	0.00	https://res.cloudinary.com/dggip608e/image/upload/v1757428196/1_chjwka.jpg	t	2025-09-14 00:56:32.989183	2025-09-14 00:56:32.989183	image
21	ชนท้าย	2025-09-09	21:30:00	\N	\N	\N	ทางหลวง	sdfb	sdfbsdb	13.827464	100.514300	\N	https://res.cloudinary.com/dggip608e/image/upload/v1757428196/1_chjwka.jpg	t	2025-09-09 22:08:31.634104	2025-09-14 01:00:27.894297	image
26	ถูกชนขนะจอดอยู่	2025-09-16	07:41:00	กรุงเทพมหานคร	พระนคร	1234	ชุมชน/หมู่บ้าน	ตภ-ตภจ จ-จ-ต- จ-จ-จ- จ-จ- จ- -จ-จ  -จ- จ	กหาดกหราดกหนดาหรยดาหำยดาหำนดาหำยดาหำนยดาหำยนดาหำนยดหาำดยห\nโนหำาดนยหำาดหำยดาหำนดาหำดยนหำดาหำยนดาหำยนดา\nหดหำ\nดหนำดาหยำดาหำยนดาหำยนดาห\nหนดาหำยนดาหำยดาหำนยด	13.736331	100.520171	0.00	https://res.cloudinary.com/dggip608e/image/upload/v1757986912/casdw_izqr5h.avif	t	2025-09-18 13:49:03.85388	2025-09-18 13:49:03.85388	image
27	น้ำท่วม	2025-09-18	20:22:00	กรุงเทพมหานคร	พระนคร	11990000	ชุมชน/หมู่บ้าน	7-11	น้ำท่วม	13.737116	100.522794	0.00	https://res.cloudinary.com/dggip608e/image/upload/v1758216863/car-top-view_bghz09.png	t	2025-09-19 00:34:34.698103	2025-09-19 00:34:34.698103	image
28	ถูกชนขนะจอดอยู่	2025-09-13	13:38:00	กรุงเทพมหานคร	พระนคร	\N	ชุมชน/หมู่บ้าน	ห้าง ลานจอดรถ ชั้น6	ถูกขนขณะจอดอยู่ที่ลานจอดรถของห้าง	13.741935	100.536442	0.00	https://res.cloudinary.com/dggip608e/image/upload/v1758280054/acihdjazz_zm48lv.jpg	t	2025-09-19 18:08:13.006454	2025-09-19 18:08:13.006454	image
23	ถูกชนขนะจอดอยู่	2025-09-19	03:44:00	ปทุมธานี	เมืองปทุมธานี	อะไรเอ่ย	ชุมชน/หมู่บ้าน	อะไรเอ่ย2	ถูกชนขณะจอดในที่จอดรถ	13.828194	100.513991	\N	https://res.cloudinary.com/dggip608e/image/upload/v1757428196/1_chjwka.jpg	t	2025-09-14 00:36:38.186932	2025-09-20 18:17:47.722528	image
30	ชนสัตว์	2025-09-04	13:34:00	นครราชสีมา	เมืองนครราชสีมา	dwadwa	ทางหลวง	dawdwa	dwadawdwa	13.733660	100.526664	0.00	https://res.cloudinary.com/dggip608e/image/upload/v1758781923/2_kih2sb.jpg	t	2025-09-25 13:32:43.299818	2025-09-25 13:32:43.299818	image
35	ชนสัตว์	2025-09-04	20:10:00	นนทบุรี	ปากเกร็ด	123	ทางหลวง	3123	กฟไกไฟกฟไ	13.736686	100.522145	0.00	https://res.cloudinary.com/dggip608e/image/upload/v1759054994/ai_1_yul1ms.png	t	2025-09-28 17:51:54.625544	2025-09-28 17:51:54.625544	image
31	ชนสัตว์	2025-09-03	13:36:00	นนทบุรี		dawdwa	ชุมชน/หมู่บ้าน	awdwad3r3	awdwa	13.736623	100.521051	0.00	https://res.cloudinary.com/dggip608e/image/upload/v1758782074/1_ewmqnx.jpg	t	2025-09-25 13:34:38.678889	2025-10-08 10:01:12.057035	image
39	ถูกชนขนะจอดอยู่	2025-09-01	16:24:00	กรุงเทพมหานคร	พระนคร	ฟกไก/ไ	ทางหลวง	กฟไกฟไ	ถูกชนขนะจอดอยู่\nถูกชนขนะจอดอยู่ถูกชนขนะจอดอยู่\nถูกชนขนะจอดอยู่ถูกชนขนะจอดอยู่\nถูกชนขนะจอดอยู่	13.736884	100.519077	0.00	https://res.cloudinary.com/dggip608e/video/upload/v1759224203/%E0%B8%A3%E0%B8%96%E0%B8%8A%E0%B8%99_fazzdm.mp4	t	2025-09-30 16:24:28.557423	2025-09-30 16:24:28.557423	video
40	ไฟไหม้	2025-09-01	01:01:00	กรุงเทพมหานคร	พระนคร	dwadaw	ทางหลวง	dwadwad	dwadwadwadawdawdawdawdwa	13.736717	100.523186	0.00	https://res.cloudinary.com/dggip608e/image/upload/v1759224552/acihdjazz_er4mik.jpg	t	2025-09-30 16:29:54.124258	2025-09-30 16:29:54.124258	image
41	ชนสัตว์	2025-09-02	22:37:00	กรุงเทพมหานคร	ดุสิต	ดำดำ	ทางหลวง	ำดำหดหำดหำดหำ	หกดเหกพเหพfcddfdf	13.737624	100.516555	0.00	https://res.cloudinary.com/dggip608e/image/upload/v1759224956/acihdjazz_f0sj3t.jpg	t	2025-09-30 16:42:03.190524	2025-09-30 16:42:03.190524	image
42	ชนสัตว์	2024-02-01	15:15:00	กรุงเทพมหานคร	ดุสิต	wadwadwadwad	ชุมชน/หมู่บ้าน	awdwadwadwa	aaaaaaaaaaaaaaaaaaaaaaa	13.739062	100.518208	0.00	https://res.cloudinary.com/dggip608e/image/upload/v1759227295/acihdjazz_obm06c.jpg	t	2025-09-30 18:00:05.487568	2025-09-30 18:00:05.487568	image
43	ชนสัตว์	2025-08-31	12:27:00	กรุงเทพมหานคร	ดุสิต	dawdwa	ทางหลวง	awdwad	dwa	13.737303	100.518744	0.00	https://res.cloudinary.com/dggip608e/image/upload/v1759231741/2_fqddeq.jpg	t	2025-09-30 18:32:12.302717	2025-09-30 18:32:12.302717	image
44	ชนสัตว์	2025-10-09	03:33:00	นนทบุรี	บางบัวทอง	123124	ทางหลวง	1312312	adwa	13.736498	100.522714	0.00	https://res.cloudinary.com/dggip608e/image/upload/v1759264164/1_qfwyin.jpg	t	2025-10-01 03:29:56.380462	2025-10-01 03:29:56.380462	image
46	ถูกของตกใส่	2025-06-11	03:55:00	ชลบุรี	สัตหีบ	นนนนน	ในเมือง	ก่อนถึงปั้ม ปตท.	ต้นไม้หักทับหลังคารถ	14.364369	100.580328	0.00	https://res.cloudinary.com/dggip608e/image/upload/v1759305244/drop_p5k7bh.png	t	2025-10-01 14:55:48.626588	2025-10-01 14:55:48.626588	image
47	ชนสัตว์	2025-10-08	16:43:00	นนทบุรี	บางบัวทอง	กไฟก	ชุมชน/หมู่บ้าน	กไฟ	กฟไกฟไ	13.736717	100.523186	0.00		t	2025-10-01 16:40:54.325003	2025-10-01 16:40:54.325003	image
48	ชนสัตว์	2025-10-10	16:41:00	นนทบุรี	ปากเกร็ด	กไฟกฟไก	ชุมชน/หมู่บ้าน	ไกฟไก	กไฟกฟ	0.001341	0.000515	0.00	https://res.cloudinary.com/dggip608e/image/upload/v1759311675/drop_wd49gp.png	t	2025-10-01 16:41:45.98386	2025-10-01 16:41:45.98386	image
49	ชนสิ่งของ	2025-09-30	17:43:00	กรุงเทพมหานคร	ดุสิต	เเพเพ	ชุมชน/หมู่บ้าน	เพกเกพ	กดิกด้เก	13.737811	100.518690	0.00	https://res.cloudinary.com/dggip608e/image/upload/v1759311764/2_ctrdfj.jpg	t	2025-10-01 16:43:23.20283	2025-10-01 16:43:23.20283	image
50	ชนสัตว์	2025-10-02	20:13:00	นนทบุรี	บางบัวทอง	retre	ทางหลวง	erert	eqwfesaf	13.738822	100.519345	0.00	https://res.cloudinary.com/dggip608e/image/upload/v1759324419/1_awbesz.jpg	t	2025-10-01 20:14:22.685088	2025-10-01 20:14:22.685088	image
51	ถูกของตกใส่	2025-09-30	10:00:00	นนทบุรี	บางบัวทอง	11234	ชุมชน/หมู่บ้าน	123123	ถูกของตกใส่\nถูกของตกใส่ถูกของตกใส่\nถูกของตกใส่ถูกของตกใส่\nถูกของตกใส่	13.737775	100.516587	0.00	https://res.cloudinary.com/dggip608e/image/upload/v1759327120/drop_pam7kz.png	t	2025-10-01 21:00:41.517637	2025-10-01 21:00:41.517637	image
29	ถูกของตกใส่	2025-09-01	13:25:00	กรุงเทพมหานคร	พระนคร	TTTTT	ทางหลวง	ff	hg	13.733910	100.530055	0.00	https://res.cloudinary.com/dggip608e/image/upload/v1758781469/2_gi49e2.jpg	t	2025-09-25 13:24:33.464382	2025-10-08 07:08:46.074575	image
37	ชนสัตว์	2025-09-03	21:43:00	กรุงเทพมหานคร	พระนคร	r	ทางหลวง	tttt1123	ฟกไฟกฟไ	13.738062	100.523840	0.00	https://res.cloudinary.com/dggip608e/image/upload/v1759060177/report_rcqx7b.png	t	2025-09-28 19:31:44.535487	2025-10-08 09:04:34.068296	image
52	ชนสัตว์	2025-09-30	04:07:00	ปทุมธานี	คลองหลวง	ๅๅ/-ๅ	ทางหลวง	ๅ/-ๅ/-ๅ/	ๆๆๆ	13.736717	100.523186	0.00	https://res.cloudinary.com/dggip608e/image/upload/v1759946869/2_uqe7o7.jpg	t	2025-10-09 01:07:58.180264	2025-10-09 01:07:58.180264	image
53	ชนสัตว์	2025-10-03	13:12:00	กรุงเทพมหานคร	หนองจอก	ๆไๆ	ชุมชน/หมู่บ้าน	ๆไๆ	กไกไ	13.752349	100.526619	0.00	https://res.cloudinary.com/dggip608e/image/upload/v1759947010/acihdjazz_nmiev6.jpg	t	2025-10-09 01:10:38.397555	2025-10-09 01:10:38.397555	image
38	ชนสัตว์	2025-08-30	13:13:00	กรุงเทพมหานคร	พระนคร	11155	ทางหลวง	egegeddde1r1r1	wrr	13.736717	100.523186	0.00	https://res.cloudinary.com/dggip608e/image/upload/v1759126361/1_bayvh0.jpg	t	2025-09-29 13:13:25.227336	2025-10-08 10:01:27.908273	image
54	ชนสัตว์	2025-10-10	04:20:00	นนทบุรี	บางบัวทอง	ๆไๆ	ทางหลวง	ๆไๆไ	ไ	13.736717	100.523186	0.00	https://res.cloudinary.com/dggip608e/image/upload/v1759947435/acihdjazz_ojcoaf.jpg	t	2025-10-09 01:17:40.163012	2025-10-09 01:17:40.163012	image
45	อื่นๆ	2025-10-22	05:34:00	กรุงเทพมหานคร	ดุสิต	dwadwa	ทางหลวง	dawdwadaw	ad	13.738624	100.521920	0.00	https://res.cloudinary.com/dggip608e/image/upload/v1759303205/1_qwtowe.jpg	t	2025-10-01 14:20:31.058052	2025-10-09 01:19:16.514893	image
36	ถูกชนขนะจอดอยู่	2025-10-08	19:20:00	กรุงเทพมหานคร	พระนคร	dw	ทางหลวง	ไกไ	หฟก	13.736040	100.521609	0.00	https://res.cloudinary.com/dggip608e/image/upload/v1759058339/report_t9e6bf.png	t	2025-09-28 18:21:26.272508	2025-10-09 01:20:44.302563	image
\.


--
-- Data for Name: claim_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.claim_requests (id, user_id, status, approved_by, approved_at, admin_note, selected_car_id, accident_detail_id, created_at, updated_at, incomplete_at, rejected_at, rejected_by, incomplete_by, incomplete_history, resubmitted_history) FROM stdin;
3	3	approved	1	2025-08-28 13:44:52.429	\N	1	4	2025-08-15 23:10:37.766171	2025-08-28 20:44:52.468925	\N	\N	\N	\N	[]	[]
5	3	rejected	1	2025-08-28 14:16:19.058	เทสปฏิเสธ	2	6	2025-08-17 15:21:09.928075	2025-08-28 21:16:19.096346	\N	\N	\N	\N	[]	[]
14	3	approved	1	2025-08-29 13:21:41.85	\N	1	15	2025-08-26 23:25:29.091119	2025-08-29 20:21:41.895558	\N	\N	\N	\N	[]	[]
13	3	approved	1	2025-09-05 11:33:04.796	\N	2	14	2025-08-21 23:03:24.03992	2025-09-05 18:33:04.849081	\N	\N	\N	\N	[]	[]
15	3	pending	\N	\N	\N	1	16	2025-09-05 23:39:53.757167	2025-09-05 23:39:53.757167	\N	\N	\N	\N	[]	[]
17	3	pending	\N	\N	\N	3	18	2025-09-05 23:43:24.120092	2025-09-05 23:43:24.120092	\N	\N	\N	\N	[]	[]
18	3	pending	\N	\N	\N	3	19	2025-09-08 16:23:00.359001	2025-09-08 16:23:00.359001	\N	\N	\N	\N	[]	[]
19	3	pending	\N	\N	\N	1	20	2025-09-08 21:25:51.204889	2025-09-08 21:25:51.204889	\N	\N	\N	\N	[]	[]
23	3	pending	\N	\N	\N	3	24	2025-09-14 00:48:27.427702	2025-09-14 00:48:27.427702	\N	\N	\N	\N	[]	[]
24	3	pending	\N	\N	\N	3	25	2025-09-14 00:56:32.989183	2025-09-14 00:56:32.989183	\N	\N	\N	\N	[]	[]
4	3	approved	1	2025-09-14 08:57:57.3	\N	2	5	2025-08-17 14:44:20.725723	2025-09-14 15:57:57.307674	\N	\N	\N	\N	[]	[]
20	3	approved	1	2025-09-14 15:33:08.336	เทสข้อมูลไม่ครบ	3	21	2025-09-09 22:08:31.634104	2025-09-14 22:33:08.388127	\N	\N	\N	\N	[]	[]
25	3	pending	\N	\N	\N	1	26	2025-09-18 13:49:03.85388	2025-09-18 13:49:03.85388	\N	\N	\N	\N	[]	[]
27	3	pending	\N	\N	\N	2	28	2025-09-19 18:08:13.006454	2025-09-19 18:08:13.006454	\N	\N	\N	\N	[]	[]
29	3	pending	\N	\N	\N	3	30	2025-09-25 13:32:43.299818	2025-09-25 13:32:43.299818	\N	\N	\N	\N	[]	[]
21	3	approved	1	2025-09-30 19:23:01.392	\N	2	22	2025-09-13 23:05:05.398656	2025-10-01 02:23:01.456847	\N	\N	\N	\N	[]	[]
44	3	approved	1	2025-10-01 08:37:48.526	อัปโหลดหลักฐานเพิ่มเติม	1	46	2025-10-01 14:55:48.626588	2025-10-01 16:32:13.781406	2025-10-01 07:57:48.526	\N	\N	\N	[]	[]
46	3	approved	1	2025-10-01 13:21:32.266	\N	3	48	2025-10-01 16:41:45.98386	2025-10-01 20:21:32.309793	\N	\N	\N	\N	[]	[]
49	3	approved	1	2025-10-01 14:03:36.371	\N	3	51	2025-10-01 21:00:41.517637	2025-10-01 21:03:36.376793	\N	\N	\N	\N	[]	[]
45	3	approved	1	2025-10-06 21:27:37.562	\N	3	47	2025-10-01 16:40:54.325003	2025-10-07 04:27:37.569632	\N	\N	\N	\N	[]	[]
42	3	incomplete	\N	\N	abcdrfgsgaawd1115	2	44	2025-10-01 03:29:56.380462	2025-10-07 04:51:50.583606	2025-10-06 21:51:50.524	\N	\N	1	[]	[]
47	3	rejected	1	2025-10-06 21:56:01.553	ข้อความนี้จะถูกบันทึกในหมายเหตุของคำขอเคลม	1	49	2025-10-01 16:43:23.20283	2025-10-07 04:56:01.597338	\N	\N	\N	\N	[]	[]
40	3	incomplete	\N	\N	โปรดระบุสาเหตุหรือสิ่งที่ต้องการให้ลูกค้าแก้ไขเพิ่มเติมโปรดระบุสาเหตุหรือสิ่งที่ต้องการให้ลูกค้าแก้ไขเพิ่มเติมโปรดระบุสาเหตุหรือสิ่งที่ต้องการให้ลูกค้าแก้ไขเพิ่มเติม	1	42	2025-09-30 18:00:05.487568	2025-10-07 05:02:30.047037	2025-10-06 22:02:29.9	\N	\N	1	[]	[]
39	3	rejected	1	2025-10-06 22:05:09.862	อิอิ	3	41	2025-09-30 16:42:03.190524	2025-10-07 05:05:10.012073	\N	\N	\N	\N	[]	[]
38	3	rejected	1	2025-10-06 22:06:48.725	ะพพพพะพะพะพ	2	40	2025-09-30 16:29:54.124258	2025-10-07 05:06:48.768931	\N	\N	\N	\N	[]	[]
41	3	rejected	\N	\N	ระบุสาเหตุที่ไม่อนุมัติระบุสาเหตุที่ไม่อนุมัติระบุสาเหตุที่ไม่อนุมัติ	1	43	2025-09-30 18:32:12.302717	2025-10-07 05:23:04.2979	\N	2025-10-06 22:23:04.258	1	\N	[]	[]
37	3	incomplete	\N	\N	ข้อมูลไม่ครบครับแอแอแอแอแกดหอกกอ	3	39	2025-09-30 16:24:28.557423	2025-10-08 04:44:18.079821	2025-10-07 21:44:17.934	\N	\N	1	[]	[]
22	3	incomplete	1	2025-09-25 06:23:29.282	i^xw,j=desfsefsefssdf	3	23	2025-09-14 00:36:38.186932	2025-10-08 04:47:07.360384	2025-09-25 13:23:29.336008	\N	\N	\N	[]	[]
16	3	incomplete	1	2025-09-30 16:53:21.452	wrfwewfw	1	17	2025-09-05 23:41:47.74907	2025-10-08 04:47:07.360384	2025-09-30 23:53:21.493122	\N	\N	\N	[]	[]
26	3	incomplete	1	2025-09-30 17:55:29.514	adwadaw	3	27	2025-09-19 00:34:34.698103	2025-10-08 04:47:07.360384	2025-10-01 00:55:29.553686	\N	\N	\N	[]	[]
48	3	incomplete	\N	\N	กไฟกไฟกไฟกฟไกไฟๅๅ/ไ-/ๅ-ๅ/-ๅ/-132132132131231212	3	50	2025-10-01 20:14:22.685088	2025-10-08 04:47:07.360384	2025-10-07 04:46:53.163151	\N	\N	\N	[]	[]
28	3	incomplete	\N	\N	ไหำกำเ0000	1	29	2025-09-25 13:24:33.464382	2025-10-08 07:41:00.761237	2025-10-08 07:41:00.709	\N	\N	1	[{"note": "่รร่ร่ร่ร่ร่ร่ร่ร", "time": "2025-10-08T00:38:44.716Z"}, {"note": "ไหำกำเ0000", "time": "2025-10-08T00:41:00.760Z"}]	[]
35	3	approved	1	2025-10-08 02:06:05.834	\N	3	37	2025-09-28 19:31:44.535487	2025-10-08 09:06:05.840941	2025-10-08 09:03:39.489847	\N	\N	1	[{"note": "ฟกไกไกไกไ", "time": "2025-10-08T02:03:39.489Z"}]	[]
33	3	incomplete	\N	\N	dwadwadwadwadwadwadw444	2	35	2025-09-28 17:51:54.625544	2025-10-08 09:27:01.062216	2025-10-08 09:27:01.062216	\N	\N	1	[{"note": "dwadwadwadwadwadwadw444", "time": "2025-10-08T02:27:01.061Z"}]	[]
36	3	approved	1	2025-10-08 03:02:20.439	\N	1	38	2025-09-29 13:13:25.227336	2025-10-08 10:02:20.445508	2025-10-08 09:07:57.403487	\N	\N	1	[{"note": "ฤฤฤฤฤฤฤฤฤฤฤฤฤฤฤฤฤฤฤฤ", "time": "2025-10-08T02:03:32.432Z"}, {"note": "dedededed", "time": "2025-10-08T02:05:10.198Z"}, {"note": "11552331313", "time": "2025-10-08T02:07:57.403Z"}]	[]
30	3	approved	1	2025-10-08 03:02:44.24	\N	2	31	2025-09-25 13:34:38.678889	2025-10-08 10:02:44.247644	2025-10-08 09:39:38.0236	\N	\N	1	[{"note": "dwdwdw", "time": "2025-10-08T02:39:38.022Z"}]	[]
50	3	pending	\N	\N	\N	2	52	2025-10-09 01:07:58.180264	2025-10-09 01:07:58.180264	\N	\N	\N	\N	[]	[]
51	3	pending	\N	\N	\N	3	53	2025-10-09 01:10:38.397555	2025-10-09 01:10:38.397555	\N	\N	\N	\N	[]	[]
43	3	pending	\N	\N	\N	2	45	2025-10-01 14:20:31.058052	2025-10-09 01:19:16.514893	2025-10-01 16:49:23.692709	\N	\N	\N	[]	[]
34	3	pending	\N	\N	\N	3	36	2025-09-28 18:21:26.272508	2025-10-09 01:20:44.302563	2025-10-08 09:03:27.672255	\N	\N	1	[{"note": "ฤฤฤฤฤฤฤฤฤฤฤฤฤฤฤฤฤฤฤฤฤฤฤฤฤฤฤฤฤฤฤฤฤ", "time": "2025-10-08T02:03:27.671Z"}]	[]
52	3	approved	1	2025-10-09 14:19:36.406	\N	3	54	2025-10-09 01:17:40.163012	2025-10-09 21:19:36.460487	\N	\N	\N	\N	[]	[]
\.


--
-- Data for Name: evaluation_images; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.evaluation_images (id, claim_id, original_url, damage_note, side, created_at, is_annotated) FROM stdin;
6	13	https://res.cloudinary.com/dggip608e/image/upload/v1755792198/Screenshot_2025-04-22_225342_vsqm9z.jpg	\N	หน้า	2025-08-21 23:03:24.03992+07	t
22	23	https://res.cloudinary.com/dggip608e/image/upload/v1757785697/Screenshot_2025-04-22_225342_z7bi2k.jpg	\N	ไม่ระบุ	2025-09-14 00:48:27.427702+07	f
23	23	https://res.cloudinary.com/dggip608e/image/upload/v1757785697/Screenshot_2025-04-22_225426_nghvco.jpg	หกดิหกดิ	ไม่ระบุ	2025-09-14 00:48:27.427702+07	f
24	24	https://res.cloudinary.com/dggip608e/image/upload/v1757785899/download_uvfzxi.png	เทส	ไม่ระบุ	2025-09-14 00:56:32.989183+07	f
26	20	https://res.cloudinary.com/dggip608e/image/upload/v1757428198/S__11985059_0_ofudej.jpg	กันชนหลังหลุดหาย	ขวา	2025-09-14 01:00:27.894297+07	t
2	3	https://res.cloudinary.com/dggip608e/image/upload/v1755273505/car3_kyyq8m.jpg	\N	ไม่ระบุ	2025-08-15 23:10:37.766171+07	t
16	19	https://res.cloudinary.com/dggip608e/image/upload/v1757341362/S__12009513_pkleww.jpg	\N	หลัง	2025-09-08 21:25:51.204889+07	f
4	5	https://res.cloudinary.com/dggip608e/image/upload/v1755418846/car1_remtoc.jpg	\N	ซ้าย	2025-08-17 15:21:09.928075+07	t
9	15	https://res.cloudinary.com/dggip608e/image/upload/v1757089396/remote-1_l16anc_uxfnbp.jpg	\N	ซ้าย	2025-09-05 23:39:53.757167+07	f
10	15	https://res.cloudinary.com/dggip608e/image/upload/v1757089397/remote-Car_damages_100_jyvtw9_pqddpc.png	\N	ซ้าย	2025-09-05 23:39:53.757167+07	f
5	5	https://res.cloudinary.com/dggip608e/image/upload/v1755418847/car3_nhnvt2.jpg	\N	ขวา	2025-08-17 15:21:09.928075+07	t
12	17	https://res.cloudinary.com/dggip608e/image/upload/v1757090602/S__11985056_0_tyrevl.jpg	\N	หลัง	2025-09-05 23:43:24.120092+07	f
13	18	https://res.cloudinary.com/dggip608e/image/upload/v1757323372/car2_ccvl3f.jpg	\N	ซ้าย	2025-09-08 16:23:00.359001+07	f
14	18	https://res.cloudinary.com/dggip608e/image/upload/v1757323373/car2_1_mbxskk.jpg	\N	ซ้าย	2025-09-08 16:23:00.359001+07	f
15	19	https://res.cloudinary.com/dggip608e/image/upload/v1757341361/S__12009509_0_uumjek.jpg	มีลอยถลอกตรงประตูด้านล่าง	ซ้าย	2025-09-08 21:25:51.204889+07	f
7	14	https://res.cloudinary.com/dggip608e/image/upload/v1756225520/damage_4363_piggas.jpg	\N	หลัง	2025-08-26 23:25:29.091119+07	t
1	3	https://res.cloudinary.com/dggip608e/image/upload/v1755273507/Car_damages_100_eh8jwt.png	\N	ไม่ระบุ	2025-08-15 23:10:37.766171+07	t
8	14	https://res.cloudinary.com/dggip608e/image/upload/v1756225521/25_qyzfzn.jpg	\N	ซ้าย	2025-08-26 23:25:29.091119+07	t
3	4	https://res.cloudinary.com/dggip608e/image/upload/v1755416643/Screenshot_2025-04-22_225232_btpayn.jpg	\N	หน้า	2025-08-17 14:44:20.725723+07	t
25	20	https://res.cloudinary.com/dggip608e/image/upload/v1757428197/car1_ppudkx.jpg	\N	ซ้าย	2025-09-14 01:00:27.894297+07	t
29	25	https://res.cloudinary.com/dggip608e/image/upload/v1758173898/casdw_aep6at.avif	กระจกแตก	ซ้าย	2025-09-18 13:49:03.85388+07	f
30	25	https://res.cloudinary.com/dggip608e/image/upload/v1758174338/modern-car-isolated_23-2151504570_p0gqp3.avif	กระจกแตก 2	หน้า	2025-09-18 13:49:03.85388+07	f
31	26	https://res.cloudinary.com/dggip608e/image/upload/v1758216864/car-top-view_kot1tx.png	บุบ	หน้า	2025-09-19 00:34:34.698103+07	f
32	26	https://res.cloudinary.com/dggip608e/image/upload/v1758216865/modern-car-isolated_23-2151504570-Photoroom_atzxmh.png	ชีดช่วน	ขวา	2025-09-19 00:34:34.698103+07	f
35	22	https://res.cloudinary.com/dggip608e/image/upload/v1758367062/2_f2g3tz.jpg	มีรอยข่วนที่กันชนหน้า	หน้า	2025-09-20 18:17:47.722528+07	f
36	22	https://res.cloudinary.com/dggip608e/image/upload/v1758367062/1_wbwap9.jpg	กันชนหลัวแตก	หลัง	2025-09-20 18:17:47.722528+07	f
38	29	https://res.cloudinary.com/dggip608e/image/upload/v1758781924/2_rlnpko.jpg	\N	ซ้าย	2025-09-25 13:32:43.299818+07	f
41	33	https://res.cloudinary.com/dggip608e/image/upload/v1759054591/ai_1_pu9vod.png		หลัง	2025-09-28 17:51:54.625544+07	f
42	33	https://res.cloudinary.com/dggip608e/image/upload/v1759054597/ai_fc8r7m.png		หลัง	2025-09-28 17:51:54.625544+07	f
43	33	https://res.cloudinary.com/dggip608e/image/upload/v1759054600/fast_1_vvv0jc.png		หลัง	2025-09-28 17:51:54.625544+07	f
33	27	https://res.cloudinary.com/dggip608e/image/upload/v1758280055/2_zjsmbk.jpg	\N	หน้า	2025-09-19 18:08:13.006454+07	t
34	27	https://res.cloudinary.com/dggip608e/image/upload/v1758280056/1_wl8bqy.jpg	\N	หลัง	2025-09-19 18:08:13.006454+07	t
52	39	https://res.cloudinary.com/dggip608e/image/upload/v1759224980/1_tbgyzm.jpg		ขวา	2025-09-30 16:42:03.190524+07	t
51	38	https://res.cloudinary.com/dggip608e/image/upload/v1759224583/1_pcsxmi.jpg		ขวา	2025-09-30 16:29:54.124258+07	t
49	37	https://res.cloudinary.com/dggip608e/image/upload/v1759224233/1_z4pxpy.jpg	หลังหหลังหลัง	หลัง	2025-09-30 16:24:28.557423+07	t
64	49	https://res.cloudinary.com/dggip608e/image/upload/v1759327230/1_s6slx3.jpg		ซ้าย	2025-10-01 21:00:41.517637+07	t
73	36	https://res.cloudinary.com/dggip608e/image/upload/v1759126387/2_ueviag.jpg	egergeg	ขวา	2025-10-08 10:01:27.908273+07	t
59	45	https://res.cloudinary.com/dggip608e/image/upload/v1759311641/acihdjazz_kihqmc.jpg		ขวา	2025-10-01 16:40:54.325003+07	t
61	47	https://res.cloudinary.com/dggip608e/image/upload/v1759311794/acihdjazz_qohhxn.jpg		หน้า	2025-10-01 16:43:23.20283+07	t
11	16	https://res.cloudinary.com/dggip608e/image/upload/v1757090503/Screenshot_2025-04-22_225544_qehgge.jpg	\N	หน้า	2025-09-05 23:41:47.74907+07	t
71	30	https://res.cloudinary.com/dggip608e/image/upload/v1758782075/acihdjazz_rb9m20.jpg		หน้า	2025-10-08 10:01:12.057035+07	t
72	30	https://res.cloudinary.com/dggip608e/image/upload/v1758782075/2_cgzyxs.jpg		ขวา	2025-10-08 10:01:12.057035+07	t
74	50	https://res.cloudinary.com/dggip608e/image/upload/v1759946857/drop_jo0agq.png	ฟกฟกฟ	ซ้าย	2025-10-09 01:07:58.180264+07	f
53	40	https://res.cloudinary.com/dggip608e/image/upload/v1759227264/acihdjazz_lvcw4u.jpg	าสทม	ขวา	2025-09-30 18:00:05.487568+07	t
75	51	https://res.cloudinary.com/dggip608e/image/upload/v1759947032/acihdjazz_q5mjbj.jpg	ไๆไๆไ	ซ้าย	2025-10-09 01:10:38.397555+07	f
55	42	https://res.cloudinary.com/dggip608e/image/upload/v1759264186/2_kwd8uh.jpg		หน้า	2025-10-01 03:29:56.380462+07	t
50	38	https://res.cloudinary.com/dggip608e/image/upload/v1759224581/acihdjazz_xxqmxh.jpg		หน้า	2025-09-30 16:29:54.124258+07	t
48	37	https://res.cloudinary.com/dggip608e/image/upload/v1759224231/2_rrrqiv.jpg	อธิบายภาพความเสียหายอธิบายภาพความเสียหายอธิบายภาพความเสียหาย\nหน้า\nหน้า\nฆน้า	หน้า	2025-09-30 16:24:28.557423+07	t
19	21	https://res.cloudinary.com/dggip608e/image/upload/v1757779494/car3_jlucqo.jpg	\N	ไม่ระบุ	2025-09-13 23:05:05.398656+07	t
54	41	https://res.cloudinary.com/dggip608e/image/upload/v1759231693/acihdjazz_pssthf.jpg		ซ้าย	2025-09-30 18:32:12.302717+07	t
58	44	https://res.cloudinary.com/dggip608e/image/upload/v1759305342/drop_ak0frf.png		หน้า	2025-10-01 14:55:48.626588+07	t
62	48	https://res.cloudinary.com/dggip608e/image/upload/v1759324447/2_kqdnx0.jpg	grdeger	หน้า	2025-10-01 20:14:22.685088+07	f
63	48	https://res.cloudinary.com/dggip608e/image/upload/v1759324450/1_olur50.jpg	sdrgre	หลัง	2025-10-01 20:14:22.685088+07	f
66	28	https://res.cloudinary.com/dggip608e/image/upload/v1758781470/1_oscbpf.jpg		หลัง	2025-10-08 07:08:46.074575+07	f
60	46	https://res.cloudinary.com/dggip608e/image/upload/v1759311698/acihdjazz_qlvsyy.jpg		ซ้าย	2025-10-01 16:41:45.98386+07	t
67	35	https://res.cloudinary.com/dggip608e/image/upload/v1759061168/report_eskd3n.png	gerte4t4	ขวา	2025-10-08 09:04:34.068296+07	t
68	35	https://res.cloudinary.com/dggip608e/image/upload/v1759062409/report_fopbs2.png	t4t4	หลัง	2025-10-08 09:04:34.068296+07	t
81	34	https://res.cloudinary.com/dggip608e/image/upload/v1759947642/drop_ryp8qr.png	ะะ	หลัง	2025-10-09 01:20:44.302563+07	t
76	52	https://res.cloudinary.com/dggip608e/image/upload/v1759947456/drop_sfhms2.png	ๆไ	หน้า	2025-10-09 01:17:40.163012+07	t
79	43	https://res.cloudinary.com/dggip608e/image/upload/v1759947552/drop_o8plqu.png	\N	หลัง	2025-10-09 01:19:16.514893+07	t
78	43	https://res.cloudinary.com/dggip608e/image/upload/v1759303223/acihdjazz_w43nzd.jpg		ซ้าย	2025-10-09 01:19:16.514893+07	t
77	43	https://res.cloudinary.com/dggip608e/image/upload/v1759296669/2_k19ohq.jpg		ขวา	2025-10-09 01:19:16.514893+07	t
80	34	https://res.cloudinary.com/dggip608e/image/upload/v1759058464/ai_1_co8wuw.png		หลัง	2025-10-09 01:20:44.302563+07	t
\.


--
-- Data for Name: image_damage_annotations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.image_damage_annotations (id, evaluation_image_id, part_name, damage_name, severity, area_percent, x, y, w, h, created_at, updated_at) FROM stdin;
1	1	ประตูหน้า	{บุบ}	C	77	0.299	0.228	0.244	0.348	2025-08-27 23:01:57.241788+07	\N
2	1	ประตูหลัง	{บุบ}	B	38	0.524	0.227	0.251	0.363	2025-08-27 23:01:57.241788+07	\N
9	2	ประตูหน้า	{บุบ}	B	22	0.152	0.251	0.334	0.464	2025-08-28 20:31:43.54235+07	\N
10	2	บังโคลน/แก้มข้าง	{บุบ}	C	74	0.466	0.392	0.264	0.324	2025-08-28 20:31:43.54235+07	\N
11	4	บังโคลน/แก้มข้าง	{บุบ}	B	24	0.392	0	0.582	0.549	2025-08-28 21:15:22.247344+07	\N
12	4	หน้าต่างหลัง	{ไฟแตก}	D	95	0.372	0.2	0.235	0.392	2025-08-28 21:15:22.247344+07	\N
13	4	กันชนหน้า	{บุบ,ขีดข่วน}	B	36	0.009	0.505	0.725	0.495	2025-08-28 21:15:22.247344+07	\N
14	5	ประตูหน้า	{บุบ}	C	22	0.152	0.251	0.334	0.464	2025-08-28 21:15:36.960434+07	\N
15	5	บังโคลน/แก้มข้าง	{บุบ}	C	74	0.466	0.392	0.264	0.324	2025-08-28 21:15:36.960434+07	\N
17	7	ไฟหน้า	{ไฟแตก}	D	9	0.439	0.046	0.228	0.385	2025-08-29 20:16:01.723025+07	\N
18	7	กันชนหลัง	{ขีดข่วน}	A	42	0.2	0.471	0.8	0.529	2025-08-29 20:16:01.723025+07	\N
19	8	บังโคลน/แก้มข้าง	{บุบ}	B	53	0.456	0	0.431	0.796	2025-08-29 20:20:48.495924+07	\N
20	8	ไฟหน้า	{ไฟแตก}	D	100	0.111	0.131	0.531	0.359	2025-08-29 20:20:48.495924+07	\N
21	8	กันชนหน้า	{ขีดข่วน,บุบ}	B	53	0	0.413	0.678	0.583	2025-08-29 20:20:48.495924+07	\N
24	6	กันชนหน้า	{บุบ}	B	10	0.043	0.344	0.91	0.621	2025-09-05 18:32:33.778324+07	\N
25	6	ฝากระโปรงหน้า	{ขีดข่วน}	A	3	0.236	0.224	0.178	0.175	2025-09-05 18:32:33.778324+07	\N
38	3	ฝากระโปรงหน้า	{บุบ}	C	68	0.389	0.206	0.577	0.365	2025-09-14 15:57:46.808441+07	\N
39	3	ไฟหน้า	{ไฟแตก}	D	96	0.48	0.497	0.271	0.143	2025-09-14 15:57:46.808441+07	\N
40	3	กระจังหน้า	{ไฟแตก}	B	24	0.676	0.376	0.292	0.262	2025-09-14 15:57:46.808441+07	\N
47	25	บังโคลน/แก้มข้าง	{บุบ}	B	24	0.392	0	0.582	0.549	2025-09-14 22:30:09.752037+07	\N
48	25	หน้าต่างหลัง	{ไฟแตก}	D	95	0.372	0.2	0.235	0.392	2025-09-14 22:30:09.752037+07	\N
49	26	ประตูหลัง	{ขีดข่วน}	A	2	0.425	0	0.444	0.826	2025-09-14 22:30:13.434203+07	\N
50	26	แผงบังโคลนหลัง	{บุบ}	B	42	0.153	0.168	0.418	0.638	2025-09-14 22:30:13.434203+07	\N
52	11	ล้อหน้า	{ร้าว,ขีดข่วน}	A	24	0.279	0.27	0.39	0.621	2025-09-30 23:53:04.085606+07	\N
54	33	คิ้ว/สเกิร์ตข้าง	{ร้าว,บุบ,ยางแบน,กระจกแตก}	B	1	0.302	0.545	0.112	0.052	2025-10-01 01:36:15.795088+07	\N
55	34	กระจกมองข้าง	{ร้าว,ไฟแตก,บุบ,กระจกแตก}	B	2	0.539	0.732	0.161	0.108	2025-10-01 01:36:27.421965+07	\N
57	53	กระจกมองข้าง	{ร้าว,บุบ}	B	15	0.269	0.393	0.429	0.344	2025-10-01 02:07:14.882198+07	\N
59	19	แผงบังโคลนหลัง	{ร้าว,บุบ}	B	29	0.152	0.176	0.51	0.571	2025-10-01 02:12:55.76149+07	\N
60	58	หลังคา	{บุบ}	B	51	0.06	0.314	0.94	0.544	2025-10-01 14:57:01.872745+07	\N
61	58	กระจกบังลมหน้า	{กระจกแตก}	B	40	0.125	0.258	0.753	0.529	2025-10-01 14:57:01.872745+07	\N
63	60	หลังคา	{ร้าว,บุบ,กระจกแตก,ไฟแตก}	B	24	0.271	0.37	0.535	0.446	2025-10-01 20:20:33.357882+07	\N
66	64	กระจกมองข้าง	{ร้าว,บุบ}	B	22	0.174	0.224	0.609	0.364	2025-10-01 21:03:30.738691+07	\N
67	59	ล้อหน้า	{ยางแบน}	B	2	0.416	0.58	0.135	0.176	2025-10-07 04:27:30.264974+07	\N
68	61	ล้อหน้า	{ยางแบน}	B	1	0.265	0.257	0.11	0.113	2025-10-07 04:55:01.150491+07	\N
70	55	ป้ายทะเบียน	{ร้าว}	B	1	0.367	0.5	0.2	0.074	2025-10-07 05:04:26.717406+07	\N
71	52	ป้ายทะเบียน	{ร้าว}	B	4	0.515	0.695	0.244	0.157	2025-10-07 05:04:56.792135+07	\N
73	50	กระจกมองข้าง	{ร้าว,ไฟแตก}	B	10	0.411	0.362	0.248	0.418	2025-10-07 05:06:19.947482+07	\N
74	51	กระจกมองข้าง	{ร้าว}	B	2	0.52	0.671	0.13	0.121	2025-10-07 05:06:36.034233+07	\N
75	48	กระจกมองข้าง	{กระจกแตก}	B	4	0.315	0.793	0.305	0.135	2025-10-07 05:07:51.072695+07	\N
76	49	ป้ายทะเบียน	{ร้าว}	B	2	0.531	0.68	0.123	0.122	2025-10-07 05:08:01.816843+07	\N
77	54	กระจกมองข้าง	{ร้าว}	B	13	0.32	0.362	0.366	0.363	2025-10-07 05:22:51.402388+07	\N
78	67	กระจกมองข้าง	{ร้าว}	B	2	0.447	0.625	0.112	0.138	2025-10-08 09:05:52.061774+07	\N
79	68	หน้าต่างหน้า	{ร้าว}	B	2	0.471	0.54	0.119	0.143	2025-10-08 09:06:00.765543+07	\N
80	73	ป้ายทะเบียน	{กระจกแตก}	B	2	0.278	0.775	0.182	0.09	2025-10-08 10:02:16.254951+07	\N
81	71	คิ้ว/สเกิร์ตข้าง	{ร้าว}	B	8	0.408	0.255	0.247	0.309	2025-10-08 10:02:32.386278+07	\N
82	72	ป้ายทะเบียน	{ร้าว}	B	2	0.425	0.743	0.187	0.095	2025-10-08 10:02:40.771252+07	\N
87	79	กระจกบังลมหน้า	{กระจกแตก}	D	99	0.519	0.241	0.478	0.62	2025-10-09 20:49:10.86488+07	\N
88	79	ไม่พบชิ้นส่วน-1	{กระจกแตก}	D	100	0.044	0.319	0.386	0.566	2025-10-09 20:49:10.86488+07	\N
89	78	กันชนหลัง	{}	B	23	0.284	0.343	0.511	0.444	2025-10-09 20:52:23.834847+07	\N
90	77	ไฟหน้า	{ไฟแตก}	D	97	0.583	0.36	0.22	0.127	2025-10-09 20:52:30.623787+07	\N
91	77	คิ้ว/สเกิร์ตข้าง	{บุบ}	D	100	0.143	0.467	0.429	0.053	2025-10-09 20:52:30.623787+07	\N
92	80	ฝากระโปรงหน้า	{บุบ}	B	58	0.252	0.188	0.498	0.41	2025-10-09 20:55:02.975875+07	\N
95	81	กระจกบังลมหน้า	{กระจกแตก}	D	99	0.519	0.241	0.478	0.62	2025-10-09 20:55:10.259321+07	\N
96	81	คิ้ว/สเกิร์ตข้าง	{กระจกแตก}	D	100	0.044	0.319	0.386	0.566	2025-10-09 20:55:10.259321+07	\N
97	76	กระจกบังลมหน้า	{กระจกแตก}	D	99	0.519	0.241	0.478	0.62	2025-10-09 21:18:36.267131+07	\N
\.


--
-- Data for Name: insurance_policies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.insurance_policies (id, policy_number, insurance_company, insured_name, citizen_id, address, coverage_start_date, coverage_end_date, coverage_end_time, car_brand, car_license_plate, chassis_number, car_year, insurance_type, created_at, car_path, car_model, car_color, registration_province) FROM stdin;
3	CIT-TH-25-0005678	กรุงเทพประกันภัย จำกัด (มหาชน)	นายรัชกฤช ถิรสัตยาภิบาล	1849901560821	123/45 แขวงบางรัก เขตบางรัก กรุงเทพมหานคร 10500	2025-09-03	2025-09-30	21:05:00	Honda	1กข 1234	MRHGK1660NP123456	2020	ชั้น 1	2025-09-03 21:13:04.191754	https://res.cloudinary.com/dggip608e/image/upload/v1756908779/27_dfpflf.jpg	City RS	ขาว	กรุงเทพมหานคร
2	POL87654321	ทิพยประกันภัย	รัชกฤช ถิรสัตยาภิบาล	1849901560821	123/4 แขวงรามอินทรา เขตคันนายาว กรุงเทพฯ	2025-09-03	2025-09-30	21:00:00	Honda	กร 5678	HONDAJAZZ8765THAI	2019	ชั้น 1	2025-08-07 15:55:36.668283	https://res.cloudinary.com/dggip608e/image/upload/v1756911370/Screenshot_2025-04-22_225146_zfvodj.jpg	Jazz	ดำ	กรุงเทพมหานคร
1	POL12345678	วิริยะประกันภัย	รัชกฤช ถิรสัตยาภิบาล	1849901560821	123 หมู่บ้านสุขใจ เขตดินแดง กรุงเทพฯ	2025-09-03	2025-09-30	21:00:00	Toyota	ขจ 5586	MR2K3A503HH123456	2018	ชั้น 1	2025-08-07 15:31:52.305978	https://res.cloudinary.com/dggip608e/image/upload/v1756911470/S__11985054_0_q18jev.jpg	Yaris (Hatchback)	ขาว	ภูเก็ต
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, title, message, type, link_to, is_read, created_at) FROM stdin;
1	3	คำขอเคลมของคุณได้รับการอนุมัติแล้ว ✅	เคลมหมายเลข #20241008 ผ่านการตรวจสอบเรียบร้อย	claim	/reports/20241008	f	2025-10-09 00:55:56.907105
2	3	สถานะการเคลมของคุณถูกอัปเดต 🔄	เจ้าหน้าที่กำลังตรวจสอบเอกสารเพิ่มเติม	claim	/reports/20241009	f	2025-10-07 00:55:56.907105
3	3	การเปลี่ยนรหัสผ่านสำเร็จ 🔐	คุณได้ทำการเปลี่ยนรหัสผ่านเมื่อวันที่ 09/10/2025 00:55	account	/users	t	2025-10-04 00:55:56.907105
4	3	เปลี่ยนรหัสผ่านสำเร็จ 🔐	คุณได้ทำการเปลี่ยนรหัสผ่านเรียบร้อยแล้ว	account	/users	f	2025-10-09 01:02:04.641655
5	3	อัปเดตข้อมูลติดต่อเรียบร้อย ✅	คุณได้ทำการอัปเดตข้อมูลติดต่อ (เบอร์โทร/ที่อยู่) แล้ว	profile	/users	f	2025-10-09 01:02:22.065404
6	3	อัปเดตข้อมูลติดต่อเรียบร้อย ✅	คุณได้ทำการอัปเดตข้อมูลติดต่อ (เบอร์โทร/ที่อยู่) แล้ว	profile	/users	f	2025-10-09 01:02:29.218834
7	3	ส่งคำขอเคลมสำเร็จ 🚗	ระบบได้รับคำขอเคลมหมายเลข #52 แล้ว กำลังตรวจสอบโดยเจ้าหน้าที่	claim	/reports/52	f	2025-10-09 01:17:40.163012
8	3	อัปเดตคำขอเคลมเรียบร้อย 🔧	คุณได้ส่งข้อมูลแก้ไขคำขอเคลมหมายเลข #34 แล้ว	claim	/reports/34	f	2025-10-09 01:20:44.302563
9	3	สถานะเคลมของคุณได้รับการอัปเดต 🔄	คำขอเคลมหมายเลข #52 มีการอัปเดตสถานะล่าสุด: approved	claim	/reports/52	f	2025-10-09 21:19:36.467449
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, full_name, citizen_id, email, phone_number, password_hash, address, role, created_at) FROM stdin;
1	admin	1849901560820	admin@gmail.com	0817376545	$2b$10$CsyNZ3BrI2oXVsEJ0RV1VuRD3pfrcb814GmnGIP3IqDSOFWdGJZWS	sp	admin	2025-08-04 21:54:50.339416
4	รัชกฤช ถิรสัตยา	1849901560822	prad1@gmail.com	0817376545	$2b$10$Z2x9kJgTdjQK0hw80SIfE.LMK/xZnvb6AnGs5pOp/.6QaXGb//YxS	sp	customer	2025-09-04 20:21:10.474812
5	ton	1111111111111	ton@gmail.com	0988888888	$2b$10$xb/LsFnFXJD3zbIpONrKE.HR8kNhE.hFbfqH7xHBDf46AXy0FAilC	112314	customer	2025-10-04 04:27:13.359718
3	รัชกฤช ถิรสัตยาภิบาล	1849901560821	prad@gmail.com	0817376553	$2b$10$ILllSwQaq3/RtHE0y1nxrOa7ar4TDaYMUpOVBMKyIu8WqXJvacqeS	12344	customer	2025-08-04 22:04:48.63006
\.


--
-- Name: accident_details_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.accident_details_id_seq', 54, true);


--
-- Name: claim_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.claim_requests_id_seq', 52, true);


--
-- Name: evaluation_images_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.evaluation_images_id_seq', 81, true);


--
-- Name: image_damage_annotations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.image_damage_annotations_id_seq', 97, true);


--
-- Name: insurance_policies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.insurance_policies_id_seq', 3, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 9, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 5, true);


--
-- Name: accident_details accident_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accident_details
    ADD CONSTRAINT accident_details_pkey PRIMARY KEY (id);


--
-- Name: claim_requests claim_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.claim_requests
    ADD CONSTRAINT claim_requests_pkey PRIMARY KEY (id);


--
-- Name: evaluation_images evaluation_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_images
    ADD CONSTRAINT evaluation_images_pkey PRIMARY KEY (id);


--
-- Name: image_damage_annotations image_damage_annotations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.image_damage_annotations
    ADD CONSTRAINT image_damage_annotations_pkey PRIMARY KEY (id);


--
-- Name: insurance_policies insurance_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insurance_policies
    ADD CONSTRAINT insurance_policies_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: users users_citizen_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_citizen_id_key UNIQUE (citizen_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_claim_requests_accident_detail_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_claim_requests_accident_detail_id ON public.claim_requests USING btree (accident_detail_id);


--
-- Name: idx_claim_requests_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_claim_requests_created_at ON public.claim_requests USING btree (created_at);


--
-- Name: idx_claim_requests_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_claim_requests_status ON public.claim_requests USING btree (status);


--
-- Name: idx_claim_requests_updated_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_claim_requests_updated_at ON public.claim_requests USING btree (updated_at);


--
-- Name: idx_claim_requests_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_claim_requests_user_id ON public.claim_requests USING btree (user_id);


--
-- Name: idx_evaluation_images_claim_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evaluation_images_claim_id ON public.evaluation_images USING btree (claim_id);


--
-- Name: idx_ida_eval_image_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ida_eval_image_id ON public.image_damage_annotations USING btree (evaluation_image_id);


--
-- Name: idx_ida_evalimg; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ida_evalimg ON public.image_damage_annotations USING btree (evaluation_image_id);


--
-- Name: idx_ida_part; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ida_part ON public.image_damage_annotations USING btree (part_name);


--
-- Name: ux_ida_unique_rounded; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ux_ida_unique_rounded ON public.image_damage_annotations USING btree (evaluation_image_id, part_name, damage_name, round((x)::numeric, 3), round((y)::numeric, 3), round((w)::numeric, 3), round((h)::numeric, 3));


--
-- Name: image_damage_annotations t_sync_ann_del; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER t_sync_ann_del AFTER DELETE ON public.image_damage_annotations FOR EACH ROW EXECUTE FUNCTION public.sync_eval_img_is_annotated();


--
-- Name: image_damage_annotations t_sync_ann_ins; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER t_sync_ann_ins AFTER INSERT ON public.image_damage_annotations FOR EACH ROW EXECUTE FUNCTION public.sync_eval_img_is_annotated();


--
-- Name: image_damage_annotations t_sync_ann_upd; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER t_sync_ann_upd AFTER UPDATE ON public.image_damage_annotations FOR EACH ROW EXECUTE FUNCTION public.sync_eval_img_is_annotated();


--
-- Name: claim_requests trg_claim_requests_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_claim_requests_set_updated_at BEFORE UPDATE ON public.claim_requests FOR EACH ROW EXECUTE FUNCTION public.set_timestamp_updated_at();


--
-- Name: image_damage_annotations trg_ida_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_ida_updated_at BEFORE UPDATE ON public.image_damage_annotations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: evaluation_images evaluation_images_claim_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_images
    ADD CONSTRAINT evaluation_images_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES public.claim_requests(id) ON DELETE CASCADE;


--
-- Name: claim_requests fk_claim_requests_accident_detail; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.claim_requests
    ADD CONSTRAINT fk_claim_requests_accident_detail FOREIGN KEY (accident_detail_id) REFERENCES public.accident_details(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: claim_requests fk_claim_requests_approved_by; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.claim_requests
    ADD CONSTRAINT fk_claim_requests_approved_by FOREIGN KEY (approved_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: claim_requests fk_claim_requests_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.claim_requests
    ADD CONSTRAINT fk_claim_requests_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: image_damage_annotations image_damage_annotations_evaluation_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.image_damage_annotations
    ADD CONSTRAINT image_damage_annotations_evaluation_image_id_fkey FOREIGN KEY (evaluation_image_id) REFERENCES public.evaluation_images(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

