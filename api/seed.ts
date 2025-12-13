import { sql } from '@vercel/postgres';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  
  try {
    const { crops, customers } = await req.json();

    // Insert Crops
    if (crops && Array.isArray(crops)) {
        for (const crop of crops) {
            await sql`
                INSERT INTO crops (id, name, scientific_name, difficulty, seeding_rate, soak_hours, germination_days, blackout_days, light_days, estimated_yield_per_tray, price_per_tray, price_500g, price_1kg, pkg_weight_small, pkg_weight_large, color, summary, image_url)
                VALUES (
                    ${crop.id}, 
                    ${crop.name}, 
                    ${crop.scientificName}, 
                    ${crop.difficulty}, 
                    ${crop.seedingRate}, 
                    ${crop.soakHours}, 
                    ${crop.germinationDays}, 
                    ${crop.blackoutDays}, 
                    ${crop.lightDays}, 
                    ${crop.estimatedYieldPerTray}, 
                    ${crop.pricePerTray}, 
                    ${crop.price500g}, 
                    ${crop.price1kg}, 
                    ${crop.pkgWeightSmall || 500}, 
                    ${crop.pkgWeightLarge || 1000}, 
                    ${crop.color}, 
                    ${crop.summary}, 
                    ${crop.imageUrl}
                )
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    estimated_yield_per_tray = EXCLUDED.estimated_yield_per_tray,
                    image_url = EXCLUDED.image_url,
                    price_per_tray = EXCLUDED.price_per_tray,
                    price_500g = EXCLUDED.price_500g,
                    price_1kg = EXCLUDED.price_1kg;
            `;
        }
    }

    // Insert Customers
    if (customers && Array.isArray(customers)) {
        for (const cust of customers) {
            await sql`
                INSERT INTO customers (id, name, type, contact, email, notes)
                VALUES (${cust.id}, ${cust.name}, ${cust.type}, ${cust.contact}, ${cust.email}, ${cust.notes})
                ON CONFLICT (id) DO NOTHING;
            `;
        }
    }

    return new Response(JSON.stringify({ message: 'Data seeded successfully' }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' } 
    });
  } catch (e) {
      return new Response(JSON.stringify({ error: (e as Error).message }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
      });
  }
}
