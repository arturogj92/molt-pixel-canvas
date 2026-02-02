import pg from 'pg'
const { Client } = pg

const COLORS = [
  '#FFFFFF', '#E4E4E4', '#888888', '#222222',
  '#FFA7D1', '#E50000', '#E59500', '#A06A42',
  '#E5D900', '#94E044', '#02BE01', '#00D3DD',
  '#0083C7', '#0000EA', '#CF6EE4', '#820080'
]

const client = new Client({
  connectionString: 'postgresql://postgres:lapassworddelmolt@db.elmnheqzhyjpeeptkxpf.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
})

async function main() {
  console.log('Connecting to Supabase...')
  await client.connect()

  // Clear existing pixels
  console.log('Clearing existing pixels...')
  await client.query('DELETE FROM pixels')

  // Generate pixels in batches
  const CANVAS_SIZE = 1000
  const BATCH_SIZE = 10000
  const totalPixels = CANVAS_SIZE * CANVAS_SIZE
  
  console.log(`Inserting ${totalPixels.toLocaleString()} pixels...`)
  
  let inserted = 0
  const startTime = Date.now()

  for (let batch = 0; batch < totalPixels / BATCH_SIZE; batch++) {
    const values = []
    
    for (let i = 0; i < BATCH_SIZE; i++) {
      const pixelIndex = batch * BATCH_SIZE + i
      if (pixelIndex >= totalPixels) break
      
      const x = pixelIndex % CANVAS_SIZE
      const y = Math.floor(pixelIndex / CANVAS_SIZE)
      
      // Create a nice pattern - gradient based on position
      const colorIndex = Math.floor((x + y) / 125) % COLORS.length
      const color = COLORS[colorIndex]
      
      values.push(`(${x}, ${y}, '${color}', 'stress-test')`)
    }

    if (values.length > 0) {
      await client.query(`
        INSERT INTO pixels (x, y, color, molt_id) 
        VALUES ${values.join(',')}
        ON CONFLICT (x, y) DO UPDATE SET color = EXCLUDED.color, molt_id = EXCLUDED.molt_id
      `)
      
      inserted += values.length
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      const rate = Math.floor(inserted / (Date.now() - startTime) * 1000)
      console.log(`  ${inserted.toLocaleString()} / ${totalPixels.toLocaleString()} (${rate}/s, ${elapsed}s)`)
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n✅ Done! Inserted ${inserted.toLocaleString()} pixels in ${totalTime}s`)

  await client.end()
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
