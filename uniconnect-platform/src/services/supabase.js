import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const placeholderUrl = "https://your-project.supabase.co";
const placeholderKey = "your-anon-key";

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== placeholderUrl &&
  supabaseAnonKey !== placeholderKey
);

const configError = {
  message: "Add your Supabase URL and anon key to .env, then restart the dev server."
};

function createQueryStub() {
  const query = {
    select: () => query,
    eq: () => query,
    neq: () => query,
    in: () => query,
    or: () => query,
    order: () => query,
    limit: () => query,
    is: () => query,
    insert: () => query,
    update: () => query,
    upsert: () => query,
    delete: () => query,
    single: () => Promise.resolve({ data: null, error: configError }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (resolve, reject) => Promise.resolve({ data: [], error: null, count: 0 }).then(resolve, reject)
  };

  return query;
}

function createSupabaseStub() {
  const channelStub = {
    on: () => channelStub,
    subscribe: () => ({ unsubscribe: () => {} })
  };

  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } }
      }),
      signInWithPassword: () => Promise.resolve({ data: null, error: configError }),
      signUp: () => Promise.resolve({ data: null, error: configError }),
      signOut: () => Promise.resolve({ error: null })
    },
    channel: () => channelStub,
    removeChannel: () => Promise.resolve("ok"),
    from: () => createQueryStub()
  };
}

if (!isSupabaseConfigured) {
  console.warn(configError.message);
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createSupabaseStub();
