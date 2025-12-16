import { sql } from '@vercel/postgres';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // 1. Crops Table
    await sql`
      CREATE TABLE IF NOT EXISTS crops (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        scientific_name TEXT,
        difficulty TEXT,
        seeding_rate NUMERIC,
        soak_hours NUMERIC,
        germination_days NUMERIC,
        blackout_days NUMERIC,
        light_days NUMERIC,
        estimated_yield_per_tray NUMERIC,
        price_per_tray NUMERIC,
        price_500g NUMERIC,
        price_1kg NUMERIC,
        pkg_weight_small NUMERIC,
        pkg_weight_large NUMERIC,
        color TEXT,
        summary TEXT,
        image_url TEXT,
        category TEXT,
        optimal_temperature NUMERIC,
        storage_days NUMERIC,
        growing_tips TEXT,
        nutrition_info TEXT
      );
    `;

    // Add new columns if they don't exist (for existing databases)
    try {
      await sql`ALTER TABLE crops ADD COLUMN IF NOT EXISTS category TEXT`;
      await sql`ALTER TABLE crops ADD COLUMN IF NOT EXISTS optimal_temperature NUMERIC`;
      await sql`ALTER TABLE crops ADD COLUMN IF NOT EXISTS storage_days NUMERIC`;
      await sql`ALTER TABLE crops ADD COLUMN IF NOT EXISTS growing_tips TEXT`;
      await sql`ALTER TABLE crops ADD COLUMN IF NOT EXISTS nutrition_info TEXT`;
    } catch (e) {
      // Ignore errors if columns already exist
      console.warn('Column migration note:', (e as Error).message);
    }

    // 2. Customers Table
    await sql`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT,
        contact TEXT,
        email TEXT,
        notes TEXT
      );
    `;

    // 3. Trays Table
    await sql`
      CREATE TABLE IF NOT EXISTS trays (
        id TEXT PRIMARY KEY,
        crop_type_id TEXT REFERENCES crops(id),
        crop_type_id2 TEXT REFERENCES crops(id),
        start_date TIMESTAMP WITH TIME ZONE,
        planted_at TIMESTAMP WITH TIME ZONE,
        stage TEXT,
        notes TEXT,
        location TEXT,
        capacity NUMERIC,
        yield NUMERIC,
        updated_at TIMESTAMP WITH TIME ZONE,
        stage_update_at TIMESTAMP WITH TIME ZONE
      );
    `;
    
    // Add crop_type_id2 column if it doesn't exist (for existing databases)
    try {
      await sql`ALTER TABLE trays ADD COLUMN IF NOT EXISTS crop_type_id2 TEXT REFERENCES crops(id)`;
    } catch (e) {
      console.warn('Column migration note:', (e as Error).message);
    }

    // 4. Transactions Table
    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        date TIMESTAMP WITH TIME ZONE,
        type TEXT,
        category TEXT,
        amount NUMERIC,
        description TEXT,
        customer_id TEXT REFERENCES customers(id),
        payee TEXT,
        receipt_image TEXT,
        is_business_expense BOOLEAN
      );
    `;
    
    // Add new columns if they don't exist (for existing databases)
    try {
      await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receipt_image TEXT`;
      await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_business_expense BOOLEAN`;
    } catch (e) {
      console.warn('Column migration note:', (e as Error).message);
    }

    return new Response(JSON.stringify({ message: 'Database setup complete' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
