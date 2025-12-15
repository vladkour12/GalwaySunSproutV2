import { sql } from '@vercel/postgres';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  try {
    if (req.method === 'GET') {
      const { rows } = await sql`SELECT * FROM crops`;
                  const crops = rows.map(r => ({
                    id: r.id,
                    name: r.name,
                    scientificName: r.scientific_name,
                    difficulty: r.difficulty,
                    seedingRate: Number(r.seeding_rate),
                    soakHours: Number(r.soak_hours),
                    germinationDays: Number(r.germination_days),
                    blackoutDays: Number(r.blackout_days),
                    lightDays: Number(r.light_days),
                    estimatedYieldPerTray: Number(r.estimated_yield_per_tray),
                    pricePerTray: Number(r.price_per_tray),
                    price500g: Number(r.price_500g),
                    price1kg: Number(r.price_1kg),
                    pkgWeightSmall: Number(r.pkg_weight_small),
                    pkgWeightLarge: Number(r.pkg_weight_large),
                    color: r.color,
                    summary: r.summary,
                    imageUrl: r.image_url,
                    category: r.category || undefined,
                    optimalTemperature: r.optimal_temperature ? Number(r.optimal_temperature) : undefined,
                    storageDays: r.storage_days ? Number(r.storage_days) : undefined,
                    growingTips: r.growing_tips || undefined,
                    nutritionInfo: r.nutrition_info || undefined
                  }));
      return new Response(JSON.stringify(crops), { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
      });
    }

    if (req.method === 'POST') {
      const crop = await req.json();
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
      return new Response(JSON.stringify({ message: 'Saved' }), { status: 200 });
    }

    if (req.method === 'DELETE') {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return new Response('Missing ID', { status: 400 });
        
        await sql`DELETE FROM crops WHERE id = ${id}`;
        return new Response(JSON.stringify({ message: 'Deleted' }), { status: 200 });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' } 
    });
  }
}
