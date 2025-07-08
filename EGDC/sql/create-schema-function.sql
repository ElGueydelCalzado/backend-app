-- Create a function to get table schema information
-- This function allows the sync script to query column information

CREATE OR REPLACE FUNCTION get_table_schema(table_name text)
RETURNS TABLE (
  column_name text,
  data_type text,
  is_nullable text,
  column_default text,
  is_generated text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text,
    c.column_default::text,
    COALESCE(c.is_generated, 'NEVER')::text as is_generated
  FROM information_schema.columns c
  WHERE c.table_name = $1 
    AND c.table_schema = 'public'
  ORDER BY c.ordinal_position;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_table_schema(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_schema(text) TO anon;