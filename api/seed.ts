import { sql } from '@vercel/postgres';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const { crops, customers } = await req.json();

    // Insert Crops
    if (crops && Array.isArray(crops)) {
        for (const crop of crops) {
            await sql`
                INSERT INTO crops (id, name, scientific_name, difficulty, seeding_rate, soak_hours, germination_days, blackout_days, light_days, estimated_yield_per_tray, price_per_tray, price_500g, price_1kg, pkg_weight_small, pkg_weight_large, color, summary, image_url, category, optimal_temperature, storage_days, growing_tips, nutrition_info)
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
                    ${crop.imageUrl},
                    ${crop.category || null},
                    ${crop.optimalTemperature || null},
                    ${crop.storageDays || null},
                    ${crop.growingTips || null},
                    ${crop.nutritionInfo || null}
                )
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    scientific_name = EXCLUDED.scientific_name,
                    difficulty = EXCLUDED.difficulty,
                    seeding_rate = EXCLUDED.seeding_rate,
                    soak_hours = EXCLUDED.soak_hours,
                    germination_days = EXCLUDED.germination_days,
                    blackout_days = EXCLUDED.blackout_days,
                    light_days = EXCLUDED.light_days,
                    estimated_yield_per_tray = EXCLUDED.estimated_yield_per_tray,
                    price_per_tray = EXCLUDED.price_per_tray,
                    price_500g = EXCLUDED.price_500g,
                    price_1kg = EXCLUDED.price_1kg,
                    pkg_weight_small = EXCLUDED.pkg_weight_small,
                    pkg_weight_large = EXCLUDED.pkg_weight_large,
                    color = EXCLUDED.color,
                    summary = EXCLUDED.summary,
                    image_url = EXCLUDED.image_url,
                    category = EXCLUDED.category,
                    optimal_temperature = EXCLUDED.optimal_temperature,
                    storage_days = EXCLUDED.storage_days,
                    growing_tips = EXCLUDED.growing_tips,
                    nutrition_info = EXCLUDED.nutrition_info;
            `;
        }
    }

    // Insert Customers
    if (customers && Array.isArray(customers)) {
        for (const cust of customers) {
            await sql`
                INSERT INTO customers (id, name, type, contact, email, notes)
                VALUES (${cust.id}, ${cust.name}, ${cust.type}, ${cust.contact}, ${cust.email}, ${cust.notes})
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    contact = EXCLUDED.contact,
                    email = EXCLUDED.email;
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
