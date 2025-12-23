import { sql } from '@vercel/postgres';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  try {
    if (req.method === 'GET') {
      const { rows } = await sql`SELECT * FROM trays`;
      const trays = rows.map(r => ({
        id: r.id,
        cropTypeId: r.crop_type_id,
        cropTypeId2: r.crop_type_id2 || undefined,
        startDate: r.start_date,
        plantedAt: r.planted_at,
        stage: r.stage,
        notes: r.notes || '',
        location: r.location || '',
        capacity: Number(r.capacity || 0),
        yield: Number(r.yield || 0),
        updatedAt: r.updated_at,
        stageUpdateAt: r.stage_update_at
      }));
      return new Response(JSON.stringify(trays), { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
      });
    }

    if (req.method === 'POST') {
      const tray = await req.json();
      await sql`
        INSERT INTO trays (id, crop_type_id, crop_type_id2, start_date, planted_at, stage, notes, location, capacity, yield, updated_at, stage_update_at)
        VALUES (
            ${tray.id}, 
            ${tray.cropTypeId}, 
            ${tray.cropTypeId2 || null}, 
            ${tray.startDate}, 
            ${tray.plantedAt}, 
            ${tray.stage}, 
            ${tray.notes}, 
            ${tray.location}, 
            ${tray.capacity}, 
            ${tray.yield}, 
            ${tray.updatedAt},
            ${tray.stageUpdateAt}
        )
        ON CONFLICT (id) DO UPDATE SET
            crop_type_id = EXCLUDED.crop_type_id,
            crop_type_id2 = EXCLUDED.crop_type_id2,
            start_date = EXCLUDED.start_date,
            planted_at = EXCLUDED.planted_at,
            stage = EXCLUDED.stage,
            notes = EXCLUDED.notes,
            location = EXCLUDED.location,
            capacity = EXCLUDED.capacity,
            yield = EXCLUDED.yield,
            updated_at = EXCLUDED.updated_at,
            stage_update_at = EXCLUDED.stage_update_at;
      `;
      return new Response(JSON.stringify({ message: 'Saved' }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (req.method === 'DELETE') {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) {
          return new Response(JSON.stringify({ error: 'Missing ID' }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        await sql`DELETE FROM trays WHERE id = ${id}`;
        return new Response(JSON.stringify({ message: 'Deleted' }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' } 
    });
  }
}
