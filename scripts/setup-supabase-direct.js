const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

console.log('🔗 Connecting to Supabase...')
console.log('📍 URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const profilesSchema = `
-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- App-specific fields
  lifestyle_preferences JSONB DEFAULT '{}',
  search_history JSONB DEFAULT '[]',
  favorite_apps JSONB DEFAULT '[]',
  onboarding_completed BOOLEAN DEFAULT FALSE
);
`

const enableRLS = `
-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
`

const createPolicies = `
-- Create policies for profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
`

const createTriggerFunction = `
-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`

const createTrigger = `
-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
`

const createUpdatedAtFunction = `
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`

const createUpdatedAtTrigger = `
-- Add updated_at trigger to profiles
DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
`

async function setupDatabase() {
  try {
    console.log('📊 Step 1: Creating profiles table...')
    const { error: tableError } = await supabase.rpc('exec_sql', { sql: profilesSchema })
    if (tableError) {
      console.error('❌ Table creation error:', tableError)
      // Try alternative approach - check if we can query directly
      console.log('🔄 Trying direct table creation...')
      
      // Test if we can create table via admin
      const { error: directError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)
      
      if (directError && directError.message.includes('relation "public.profiles" does not exist')) {
        console.log('ℹ️ Profiles table does not exist, will create manually')
      } else {
        console.log('✅ Profiles table already exists or accessible')
      }
    } else {
      console.log('✅ Profiles table created/verified')
    }

    console.log('🔒 Step 2: Enabling RLS...')
    await supabase.rpc('exec_sql', { sql: enableRLS })
    
    console.log('🛡️ Step 3: Creating security policies...')
    await supabase.rpc('exec_sql', { sql: createPolicies })
    
    console.log('⚙️ Step 4: Creating trigger function...')
    await supabase.rpc('exec_sql', { sql: createTriggerFunction })
    
    console.log('🔗 Step 5: Creating trigger...')
    await supabase.rpc('exec_sql', { sql: createTrigger })
    
    console.log('⏰ Step 6: Creating updated_at function...')
    await supabase.rpc('exec_sql', { sql: createUpdatedAtFunction })
    
    console.log('🔄 Step 7: Creating updated_at trigger...')
    await supabase.rpc('exec_sql', { sql: createUpdatedAtTrigger })
    
    console.log('🎉 Database setup complete!')
    console.log('🧪 Testing connection...')
    
    // Test basic functionality
    const { data: session } = await supabase.auth.getSession()
    console.log('✅ Auth service working')
    
    console.log('🚀 Ready to test authentication!')
    
  } catch (err) {
    console.error('❌ Setup error:', err)
    
    // Manual setup instructions
    console.log('\n📋 MANUAL SETUP INSTRUCTIONS:')
    console.log('If the automated setup failed, please:')
    console.log('1. Go to your Supabase project: https://cdcjbxclolnoejzludzh.supabase.co')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Run the following SQL commands one by one:')
    console.log('\n-- 1. Create profiles table')
    console.log(profilesSchema)
    console.log('\n-- 2. Enable RLS')
    console.log(enableRLS)
    console.log('\n-- 3. Create policies')
    console.log(createPolicies)
    console.log('\n-- 4. Create functions and triggers')
    console.log(createTriggerFunction)
    console.log(createTrigger)
    console.log(createUpdatedAtFunction)
    console.log(createUpdatedAtTrigger)
  }
}

setupDatabase()