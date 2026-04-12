import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { supabase } from '../lib/supabase/client'

// ── Configure token ──────────────────────────────────────────────────
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.PLACEHOLDER_REPLACE_WITH_YOUR_TOKEN'

// Chile commune centroid approximations for geocoding fallback
const COMMUNE_COORDS: Record<string, [number, number]> = {
  'SANTIAGO': [-70.6693, -33.4569],
  'PROVIDENCIA': [-70.6286, -33.4329],
  'LAS_CONDES': [-70.5726, -33.4090],
  'VITACURA': [-70.5811, -33.3837],
  'NUNOA': [-70.5967, -33.4560],
  'MAIPU': [-70.7580, -33.5120],
  'LA_FLORIDA': [-70.5959, -33.5227],
  'PUENTE_ALTO': [-70.5754, -33.6101],
  'QUILICURA': [-70.7297, -33.3619],
  'SAN_BERNARDO': [-70.6990, -33.5927],
  'ESTACION_CENTRAL': [-70.6832, -33.4584],
  'CERRILLOS': [-70.7126, -33.4920],
  'PUDAHUEL': [-70.7605, -33.4440],
  'LO_BARNECHEA': [-70.5097, -33.3426],
  'PENALOLEN': [-70.5415, -33.4887],
  'LA_REINA': [-70.5503, -33.4481],
  'MACUL': [-70.5970, -33.4876],
  'SAN_MIGUEL': [-70.6584, -33.4967],
  'RECOLETA': [-70.6444, -33.4081],
  'INDEPENDENCIA': [-70.6595, -33.4231],
  'CONCEPCION': [-73.0497, -36.8270],
  'VALPARAISO': [-71.6273, -33.0472],
  'VINA_DEL_MAR': [-71.5518, -33.0245],
  'ANTOFAGASTA': [-70.3954, -23.6509],
  'RANCAGUA': [-70.7395, -34.1703],
  'TALCA': [-71.6700, -35.4264],
  'TEMUCO': [-72.5968, -38.7379],
  'PUERTO_MONTT': [-72.9369, -41.4693],
}

const STAGE_NAMES: Record<number, string> = {
  1: 'Prospección', 2: 'Contacto', 3: 'Visita Agendada',
  4: 'Propuesta Enviada', 5: 'Negociación', 6: 'Cierre Ganado',
}

interface ClientMapViewProps {
  clients: any[]
  deals?: any[]
  onClientClick?: (client: any) => void
}

function getCoords(client: any): [number, number] | null {
  if (client.lng && client.lat) {
    const lng = parseFloat(client.lng)
    const lat = parseFloat(client.lat)
    if (!isNaN(lng) && !isNaN(lat)) return [lng, lat]
  }
  
  const comunaRaw = client.comuna || ''
  const key = comunaRaw.toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/ /g, '_')
  
  return COMMUNE_COORDS[key] || null
}

export function ClientMapView({ clients, deals = [], onClientClick }: ClientMapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markers = useRef<mapboxgl.Marker[]>([])

  useEffect(() => {
    if (!mapContainer.current) return
    if (MAPBOX_TOKEN.includes('PLACEHOLDER')) return

    mapboxgl.accessToken = MAPBOX_TOKEN

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-72.9424, -41.4693], // Puerto Montt, Chile
      zoom: 12,
      attributionControl: false,
    })

    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    map.current.addControl(new mapboxgl.AttributionControl({ compact: true }))

    map.current.on('load', async () => {
      console.log(`[ClientMapView] Map loaded. Processing ${clients.length} clients...`)
      
      // Clear existing markers
      markers.current.forEach(m => m.remove())
      markers.current = []

      const bounds = new mapboxgl.LngLatBounds()
      let hasValidCoords = false

      // Process clients
      for (const client of clients) {
        let coords: [number, number] | null = getCoords(client)

        // If no coords, try real geocoding using address
        if (!coords && (client.direccion || client.comuna) && MAPBOX_TOKEN) {
          try {
            const query = encodeURIComponent(`${client.direccion || ''}, ${client.comuna || ''}, Chile`)
            const resp = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${MAPBOX_TOKEN}&limit=1&country=cl`)
            const data = await resp.json()
            
            if (data.features && data.features.length > 0) {
              coords = data.features[0].center as [number, number]
              console.log(`[ClientMapView] Geocoded ${client.razon_social} to`, coords)
              
              // Save to DB (Fire and forget or minimal wait)
              supabase.from('companies')
                .update({ lat: coords[1], lng: coords[0] })
                .eq('id', client.id)
                .then(({ error }) => { if (error) console.error("Error saving coords:", error) })
            }
          } catch (e) {
            console.error(`[ClientMapView] Geocoding failed for ${client.razon_social}:`, e)
          }
        }

        if (!coords) {
          console.warn(`[ClientMapView] Skipping marker for: ${client.razon_social} (No coords found)`)
          continue
        }

        hasValidCoords = true
        bounds.extend(coords)

        // Find active deal for client
        const clientDeal = deals.find(d => d.company_id === client.id && d.stage < 7)
        const stage = clientDeal?.stage || 1
        
        // Colors from QA instructions: Verde = Ganado, Naranja = Negociación/Propuesta, Azul = Prospecto
        let color = '#3b82f6' // Default Blue (Prospect)
        if (stage === 6) color = '#10b981' // Green (Won)
        else if (stage >= 4 && stage <= 5) color = '#f59e0b' // Orange (Propuesta/Neg)
        else if (stage >= 1 && stage <= 3) color = '#3b82f6' // Blue (Early stages)

        // Custom marker element
        const el = document.createElement('div')
        el.style.cssText = `
          width: 32px; height: 32px;
          border-radius: 50%;
          background: ${color};
          border: 3px solid rgba(255,255,255,0.4);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 900; color: white;
          transition: transform 0.2s;
          font-family: 'Inter', sans-serif;
        `
        el.textContent = (client.razon_social || 'C')[0].toUpperCase()
        
        const popup = new mapboxgl.Popup({ offset: 15, closeButton: false })
          .setHTML(`
            <div style="font-family:'Inter',sans-serif;padding:6px;min-width:180px;">
              <p style="font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;opacity:0.5;margin:0 0 2px">
                ${STAGE_NAMES[stage] || 'Prospecto'}
              </p>
              <p style="font-size:13px;font-weight:900;margin:0 0 2px;line-height:1.2;">${client.razon_social || '—'}</p>
              <p style="font-size:10px;color:#6b7280;margin:0;">${(client.direccion || '')} ${(client.comuna || '').replace(/_/g, ' ')}</p>
              ${clientDeal?.valor_neto ? `<p style="font-size:11px;font-weight:700;color:${color};margin-top:4px;">
                ${new Intl.NumberFormat('es-CL', { style:'currency', currency:'CLP', maximumFractionDigits:0 }).format(clientDeal.valor_neto)}
              </p>` : ''}
            </div>
          `)

        const marker = new mapboxgl.Marker(el)
          .setLngLat(coords)
          .setPopup(popup)
          .addTo(map.current!)

        el.addEventListener('click', () => {
          onClientClick?.(client)
        })

        markers.current.push(marker)
      }

      if (hasValidCoords && map.current) {
        map.current.fitBounds(bounds, { padding: 50, maxZoom: 14, duration: 1500 })
      }
    })

    return () => {
      markers.current.forEach(m => m.remove())
      map.current?.remove()
    }
  }, [clients, deals])

  const isPlaceholder = MAPBOX_TOKEN.includes('PLACEHOLDER')

  if (isPlaceholder) {
    return (
      <div className="w-full h-[500px] rounded-[28px] border border-black/[0.05] dark:border-white/[0.05] bg-slate-950 flex flex-col items-center justify-center gap-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #6366f1 0%, transparent 60%), radial-gradient(circle at 70% 50%, #10b981 0%, transparent 60%)' }} />
        <div className="relative z-10 text-center space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">Mapa Geoespacial</p>
          <p className="text-[24px] font-black text-white tracking-tight">Agrega tu Token de Mapbox</p>
          <p className="text-[12px] text-white/50 font-medium max-w-[280px] leading-relaxed">
            Crea cuenta en <span className="text-indigo-400 font-bold">mapbox.com</span> y agrega tu token en <code className="bg-white/10 px-2 py-0.5 rounded text-white/80">.env.local</code>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div ref={mapContainer} className="w-full h-[500px] rounded-[28px] border border-black/[0.05] dark:border-white/[0.05] overflow-hidden shadow-xl" />
  )
}
