-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'kasir');

-- Create user roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'kasir',
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(100) NOT NULL,
  full_name VARCHAR(150),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create suppliers table
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Create items table
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE,
  barcode VARCHAR(50),
  name VARCHAR(150) NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  unit VARCHAR(20) DEFAULT 'pcs',
  buy_price DECIMAL(12,2) DEFAULT 0,
  sell_price DECIMAL(12,2) DEFAULT 0,
  sell_price_lv2 DECIMAL(12,2) DEFAULT 0,
  sell_price_lv3 DECIMAL(12,2) DEFAULT 0,
  discount_pct DECIMAL(5,2) DEFAULT 0,
  stock DECIMAL(12,2) DEFAULT 0,
  min_stock DECIMAL(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Create sales table
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no VARCHAR(50) UNIQUE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_name VARCHAR(150),
  price_level INTEGER DEFAULT 1,
  subtotal DECIMAL(12,2) DEFAULT 0,
  discount DECIMAL(12,2) DEFAULT 0,
  tax DECIMAL(12,2) DEFAULT 0,
  grand_total DECIMAL(12,2) DEFAULT 0,
  payment_method VARCHAR(50) DEFAULT 'cash',
  paid_amount DECIMAL(12,2) DEFAULT 0,
  change_amount DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  cashier_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Create sale_items table
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES public.items(id) ON DELETE RESTRICT NOT NULL,
  qty DECIMAL(12,2) NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  discount_pct DECIMAL(5,2) DEFAULT 0,
  subtotal DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Create purchases table
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no VARCHAR(50) UNIQUE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'draft',
  total DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Create purchase_items table
CREATE TABLE public.purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES public.items(id) ON DELETE RESTRICT NOT NULL,
  qty DECIMAL(12,2) NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

-- Create stock_moves table for stock history
CREATE TABLE public.stock_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
  qty DECIMAL(12,2) NOT NULL,
  type VARCHAR(20) NOT NULL,
  reference_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_moves ENABLE ROW LEVEL SECURITY;

-- Create returns table
CREATE TABLE public.returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_no VARCHAR(50) UNIQUE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  total DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

-- Create return_items table
CREATE TABLE public.return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID REFERENCES public.returns(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES public.items(id) ON DELETE RESTRICT NOT NULL,
  qty DECIMAL(12,2) NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;

-- Create license table
CREATE TABLE public.app_license (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key VARCHAR(100) NOT NULL,
  license_type VARCHAR(20) DEFAULT 'TRIAL',
  expire_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.app_license ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- user_roles policies
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- profiles policies
CREATE POLICY "Public profiles are viewable by authenticated users" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- categories policies
CREATE POLICY "Categories viewable by authenticated users" ON public.categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- suppliers policies
CREATE POLICY "Suppliers viewable by authenticated users" ON public.suppliers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage suppliers" ON public.suppliers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- items policies
CREATE POLICY "Items viewable by authenticated users" ON public.items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage items" ON public.items
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- sales policies
CREATE POLICY "Sales viewable by authenticated users" ON public.sales
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create sales" ON public.sales
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can manage sales" ON public.sales
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- sale_items policies
CREATE POLICY "Sale items viewable by authenticated users" ON public.sale_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create sale items" ON public.sale_items
  FOR INSERT TO authenticated WITH CHECK (true);

-- purchases policies
CREATE POLICY "Purchases viewable by authenticated users" ON public.purchases
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage purchases" ON public.purchases
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- purchase_items policies
CREATE POLICY "Purchase items viewable by authenticated users" ON public.purchase_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage purchase items" ON public.purchase_items
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- stock_moves policies
CREATE POLICY "Stock moves viewable by authenticated users" ON public.stock_moves
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create stock moves" ON public.stock_moves
  FOR INSERT TO authenticated WITH CHECK (true);

-- returns policies
CREATE POLICY "Returns viewable by authenticated users" ON public.returns
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage returns" ON public.returns
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- return_items policies
CREATE POLICY "Return items viewable by authenticated users" ON public.return_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage return items" ON public.return_items
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- license policies
CREATE POLICY "License viewable by authenticated users" ON public.app_license
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage license" ON public.app_license
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Triggers

-- Auto-create profile and role on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'kasir');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Generate invoice numbers
CREATE OR REPLACE FUNCTION public.generate_invoice_no(prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  result TEXT;
BEGIN
  result := prefix || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN result;
END;
$$;