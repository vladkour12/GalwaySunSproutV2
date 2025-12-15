import { sql } from '@vercel/postgres';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  try {
    if (req.method === 'GET') {
      const { rows } = await sql`SELECT * FROM customers`;
      const customers = rows.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        contact: r.contact,
        email: r.email,
        notes: r.notes
      }));
      return new Response(JSON.stringify(customers), { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
      });
    }

    if (req.method === 'POST') {
      const cust = await req.json();
      await sql`
        INSERT INTO customers (id, name, type, contact, email, notes)
        VALUES (
            ${cust.id}, 
            ${cust.name}, 
            ${cust.type}, 
            ${cust.contact}, 
            ${cust.email}, 
            ${cust.notes}
        )
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            type = EXCLUDED.type,
            contact = EXCLUDED.contact,
            email = EXCLUDED.email,
            notes = EXCLUDED.notes;
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
        
        await sql`DELETE FROM customers WHERE id = ${id}`;
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
