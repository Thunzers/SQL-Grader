"""
install_sqlcheck.py
-------------------
ติดตั้ง sqlcheck schema + 3 ฟังก์ชัน query equivalence
ลงใน Database หลัก (Grader_SQL)

วิธีรัน: py install_sqlcheck.py
"""

import psycopg2
from database import DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_PORT

SQLCHECK_FUNCTIONS = """
-- =========================================
-- Schema
-- =========================================
CREATE SCHEMA IF NOT EXISTS sqlcheck;

-- =========================================
-- 1) ตรวจ equivalence แบบไม่สนลำดับแถว
--    แต่เลือกได้ว่าจะสน duplicates หรือไม่
-- =========================================
CREATE OR REPLACE FUNCTION sqlcheck.check_query_equivalence(
    q1 text,
    q2 text,
    consider_duplicates boolean DEFAULT true
)
RETURNS TABLE (
    equivalent boolean,
    q1_minus_q2_count bigint,
    q2_minus_q1_count bigint,
    comparison_mode text,
    message text
)
LANGUAGE plpgsql
AS $$
DECLARE
    op text := CASE
                 WHEN consider_duplicates THEN 'EXCEPT ALL'
                 ELSE 'EXCEPT'
               END;
    sql_text text;
    q1_cols int;
    q2_cols int;
BEGIN
    -- Remove trailing semicolon from q1 and q2 if present
    q1 := regexp_replace(q1, ';\\s*$', '');
    q2 := regexp_replace(q2, ';\\s*$', '');

    -- อนุญาตเฉพาะ SELECT / WITH
    IF q1 !~* '^\\s*(select|with)\\s' THEN
        RAISE EXCEPTION 'q1 must start with SELECT or WITH';
    END IF;

    IF q2 !~* '^\\s*(select|with)\\s' THEN
        RAISE EXCEPTION 'q2 must start with SELECT or WITH';
    END IF;

    -- Column count check: compare number of columns from both queries
    EXECUTE format('SELECT COUNT(*) FROM jsonb_each_text((SELECT to_jsonb(ROW(t.*)) FROM (%s) AS t LIMIT 1))', q1) INTO q1_cols;
    EXECUTE format('SELECT COUNT(*) FROM jsonb_each_text((SELECT to_jsonb(ROW(t.*)) FROM (%s) AS t LIMIT 1))', q2) INTO q2_cols;

    IF q1_cols IS DISTINCT FROM q2_cols THEN
        RETURN QUERY SELECT
            false,
            NULL::bigint,
            NULL::bigint,
            CASE WHEN consider_duplicates THEN 'bag equality (duplicates counted)' ELSE 'set equality (duplicates ignored)' END::text,
            format('Column count mismatch: student returned %s columns, expected %s', q1_cols, q2_cols)::text;
        RETURN;
    END IF;

    sql_text := format($SQL$
        WITH a AS (
            SELECT to_jsonb(ROW(t.*)) AS row_data
            FROM (%s) AS t
        ),
        b AS (
            SELECT to_jsonb(ROW(t.*)) AS row_data
            FROM (%s) AS t
        ),
        d1 AS (
            SELECT row_data FROM a
            %s
            SELECT row_data FROM b
        ),
        d2 AS (
            SELECT row_data FROM b
            %s
            SELECT row_data FROM a
        )
        SELECT
            ((SELECT COUNT(*) FROM d1) = 0 AND (SELECT COUNT(*) FROM d2) = 0) AS equivalent,
            (SELECT COUNT(*) FROM d1)::bigint AS q1_minus_q2_count,
            (SELECT COUNT(*) FROM d2)::bigint AS q2_minus_q1_count,
            %L::text AS comparison_mode,
            CASE
                WHEN (SELECT COUNT(*) FROM d1) = 0 AND (SELECT COUNT(*) FROM d2) = 0
                    THEN 'Equivalent'
                ELSE 'Different result'
            END::text AS message
    $SQL$,
        q1,
        q2,
        op,
        op,
        CASE
            WHEN consider_duplicates THEN 'bag equality (duplicates counted)'
            ELSE 'set equality (duplicates ignored)'
        END
    );

    RETURN QUERY EXECUTE sql_text;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY
        SELECT
            false,
            NULL::bigint,
            NULL::bigint,
            CASE
                WHEN consider_duplicates THEN 'bag equality (duplicates counted)'
                ELSE 'set equality (duplicates ignored)'
            END::text,
            ('ERROR: ' || SQLERRM)::text;
END;
$$;


-- =========================================
-- 2) แสดงแถวที่แตกต่าง
--    diff_side = 'q1_minus_q2' หรือ 'q2_minus_q1'
-- =========================================
CREATE OR REPLACE FUNCTION sqlcheck.show_query_diff(
    q1 text,
    q2 text,
    diff_side text DEFAULT 'q1_minus_q2',
    consider_duplicates boolean DEFAULT true,
    max_rows integer DEFAULT 20
)
RETURNS TABLE (
    diff_source text,
    row_data jsonb
)
LANGUAGE plpgsql
AS $$
DECLARE
    op text := CASE
                 WHEN consider_duplicates THEN 'EXCEPT ALL'
                 ELSE 'EXCEPT'
               END;
    left_src text;
    right_src text;
    sql_text text;
BEGIN
    -- Remove trailing semicolon from q1 and q2 if present
    q1 := regexp_replace(q1, ';\\s*$', '');
    q2 := regexp_replace(q2, ';\\s*$', '');

    IF q1 !~* '^\\s*(select|with)\\s' THEN
        RAISE EXCEPTION 'q1 must start with SELECT or WITH';
    END IF;

    IF q2 !~* '^\\s*(select|with)\\s' THEN
        RAISE EXCEPTION 'q2 must start with SELECT or WITH';
    END IF;

    IF diff_side NOT IN ('q1_minus_q2', 'q2_minus_q1') THEN
        RAISE EXCEPTION 'diff_side must be q1_minus_q2 or q2_minus_q1';
    END IF;

    IF diff_side = 'q1_minus_q2' THEN
        left_src := 'a';
        right_src := 'b';
    ELSE
        left_src := 'b';
        right_src := 'a';
    END IF;

    sql_text := format($SQL$
        WITH a AS (
            SELECT to_jsonb(ROW(t.*)) AS row_data
            FROM (%s) AS t
        ),
        b AS (
            SELECT to_jsonb(ROW(t.*)) AS row_data
            FROM (%s) AS t
        ),
        d AS (
            SELECT row_data FROM %s
            %s
            SELECT row_data FROM %s
        )
        SELECT
            %L::text AS diff_source,
            row_data
        FROM d
        LIMIT %s
    $SQL$,
        q1,
        q2,
        left_src,
        op,
        right_src,
        diff_side,
        max_rows
    );

    RETURN QUERY EXECUTE sql_text;
END;
$$;


-- =========================================
-- 3) ตรวจ equivalence แบบสนลำดับแถว
--    ใช้เมื่อ query ต้องการ ORDER BY จริง ๆ
-- =========================================
CREATE OR REPLACE FUNCTION sqlcheck.check_query_equivalence_ordered(
    q1 text,
    q2 text
)
RETURNS TABLE (
    equivalent boolean,
    mismatched_positions bigint,
    message text
)
LANGUAGE plpgsql
AS $$
DECLARE
    sql_text text;
    q1_cols int;
    q2_cols int;
BEGIN
    -- Remove trailing semicolon from q1 and q2 if present
    q1 := regexp_replace(q1, ';\\s*$', '');
    q2 := regexp_replace(q2, ';\\s*$', '');

    IF q1 !~* '^\\s*(select|with)\\s' THEN
        RAISE EXCEPTION 'q1 must start with SELECT or WITH';
    END IF;

    IF q2 !~* '^\\s*(select|with)\\s' THEN
        RAISE EXCEPTION 'q2 must start with SELECT or WITH';
    END IF;

    -- Column count check
    EXECUTE format('SELECT COUNT(*) FROM jsonb_each_text((SELECT to_jsonb(ROW(t.*)) FROM (%s) AS t LIMIT 1))', q1) INTO q1_cols;
    EXECUTE format('SELECT COUNT(*) FROM jsonb_each_text((SELECT to_jsonb(ROW(t.*)) FROM (%s) AS t LIMIT 1))', q2) INTO q2_cols;

    IF q1_cols IS DISTINCT FROM q2_cols THEN
        RETURN QUERY SELECT
            false,
            NULL::bigint,
            format('Column count mismatch: student returned %s columns, expected %s', q1_cols, q2_cols)::text;
        RETURN;
    END IF;

    sql_text := format($SQL$
        WITH a AS (
            SELECT row_number() OVER () AS rn,
                   to_jsonb(ROW(t.*)) AS row_data
            FROM (%s) AS t
        ),
        b AS (
            SELECT row_number() OVER () AS rn,
                   to_jsonb(ROW(t.*)) AS row_data
            FROM (%s) AS t
        ),
        cmp AS (
            SELECT
                COALESCE(a.rn, b.rn) AS rn,
                a.row_data AS q1_row,
                b.row_data AS q2_row
            FROM a
            FULL OUTER JOIN b USING (rn)
            WHERE a.row_data IS DISTINCT FROM b.row_data
        )
        SELECT
            (COUNT(*) = 0) AS equivalent,
            COUNT(*)::bigint AS mismatched_positions,
            CASE
                WHEN COUNT(*) = 0 THEN 'Equivalent including row order'
                ELSE 'Different row order or row contents'
            END::text AS message
        FROM cmp
    $SQL$,
        q1,
        q2
    );

    RETURN QUERY EXECUTE sql_text;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY
        SELECT false, NULL::bigint, ('ERROR: ' || SQLERRM)::text;
END;
$$;
"""

def install():
    print("=" * 50)
    print("Installing sqlcheck functions...")
    print("=" * 50)
    
    conn = psycopg2.connect(
        host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASS, port=DB_PORT
    )
    conn.autocommit = True
    cur = conn.cursor()
    
    try:
        cur.execute(SQLCHECK_FUNCTIONS)
        print("✅ SUCCESS: All 3 sqlcheck functions installed!")
        
        # Verify
        cur.execute("""
            SELECT routine_name 
            FROM information_schema.routines 
            WHERE routine_schema = 'sqlcheck'
            ORDER BY routine_name
        """)
        funcs = cur.fetchall()
        print(f"\nInstalled functions in 'sqlcheck' schema:")
        for f in funcs:
            print(f"  ✓ sqlcheck.{f[0]}")
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    install()
