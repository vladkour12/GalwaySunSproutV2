import { sql } from '@vercel/postgres';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  try {
    if (req.method === 'GET') {
      const { rows } = await sql`SELECT * FROM transactions`;
      const transactions = rows.map(r => ({
        id: r.id,
        date: r.date,
        type: r.type,
        category: r.category,
        amount: Number(r.amount),
        description: r.description,
        customerId: r.customer_id,
        payee: r.payee
      }));
      return new Response(JSON.stringify(transactions), { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
      });
    }

    if (req.method === 'POST') {
      const txn = await req.json();
      await sql`
        INSERT INTO transactions (id, date, type, category, amount, description, customer_id, payee)
        VALUES (
            ${txn.id}, 
            ${txn.date}, 
            ${txn.type}, 
            ${txn.category}, 
            ${txn.amount}, 
            ${txn.description}, 
            ${txn.customerId}, 
            ${txn.payee}
        )
        ON CONFLICT (id) DO UPDATE SET
            date = EXCLUDED.date,
            type = EXCLUDED.type,
            category = EXCLUDED.category,
            amount = EXCLUDED.amount,
            description = EXCLUDED.description,
            customer_id = EXCLUDED.customer_id,
            payee = EXCLUDED.payee;
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
        
        await sql`DELETE FROM transactions WHERE id = ${id}`;
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
