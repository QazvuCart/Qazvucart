-- QazvuCart V1 schema. Money is stored as integer minor units (paise). No seed data.
CREATE TABLE admins (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE admin_sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id   uuid NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_sessions_admin_idx ON admin_sessions (admin_id);

CREATE TABLE categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  description text,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code          text NOT NULL UNIQUE,
  name                  text NOT NULL,
  slug                  text NOT NULL UNIQUE,
  description           text,
  category_id           uuid REFERENCES categories(id) ON DELETE SET NULL,
  -- NULL means "price not configured": the product cannot be ordered.
  price_minor           integer CHECK (price_minor >= 0),
  comparison_price_minor integer CHECK (comparison_price_minor >= 0),
  customisable          boolean NOT NULL DEFAULT false,
  customisation_instructions text,
  active                boolean NOT NULL DEFAULT false,
  featured              boolean NOT NULL DEFAULT false,
  archived_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CHECK (comparison_price_minor IS NULL OR (price_minor IS NOT NULL AND comparison_price_minor > price_minor))
);
CREATE INDEX products_category_idx ON products (category_id);
CREATE INDEX products_listing_idx  ON products (active, archived_at, created_at DESC);
CREATE INDEX products_featured_idx ON products (featured) WHERE featured;

CREATE TABLE product_images (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id           uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  cloudinary_public_id text NOT NULL,
  secure_url           text NOT NULL,
  alt_text             text NOT NULL DEFAULT '',
  width                integer,
  height               integer,
  format               text,
  sort_order           integer NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_images_product_idx ON product_images (product_id, sort_order);
CREATE INDEX product_images_public_id_idx ON product_images (cloudinary_public_id);

-- variant_name examples are admin-defined: "Size", "Phone model", "Finish".
CREATE TABLE product_variants (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_name     text NOT NULL,
  variant_value    text NOT NULL,
  additional_price_minor integer NOT NULL DEFAULT 0 CHECK (additional_price_minor >= 0),
  active           boolean NOT NULL DEFAULT true,
  UNIQUE (product_id, variant_name, variant_value)
);

-- Public, non-secret settings only (contact details, policy text). Secrets live in env vars.
CREATE TABLE site_settings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key   text NOT NULL UNIQUE,
  setting_value text NOT NULL DEFAULT '',
  updated_at    timestamptz NOT NULL DEFAULT now()
);
