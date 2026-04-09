import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

// ── Configure token ──────────────────────────────────────────────────
// Replace with real token from https://account.mapbox.com
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

const STAGE_COLORS: Record<number, string> = {
  1: '#94a3b8', // Prospección — slate
  2: '#0ea5e9', // Contacto — sky
  3: '#8b5cf6', // Visita — violet
  4: '#f59e0b', // Propuesta — amber
  5: '#f97316', // Negociación — orange
  6: '#10b981', // Ganado — emerald
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
  if (client.lng && client.lat) return [parseFloat(client.lng), parseFloat(client.lat)]
  const key = (client.comuna || '').toUpperCase().replace(/ /g, '_').replace(/Ñ/g, 'N').replace(/É/g, 'E').replace(/Á/g, 'A').replace(/Ó/g, 'O').replace(/Ú/g, 'U')
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
      center: [-70.6693, -33.4569], // Santiago, Chile
      zoom: 10,
      attributionControl: false,
    })

    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    map.current.addControl(new mapboxgl.AttributionControl({ compact: true }))

    map.current.on('load', () => {
      // Clear existing markers
      markers.current.forEach(m => m.remove())
      markers.current = []

      clients.forEach(client => {
        const coords = getCoords(client)
        if (!coords) return

        // Find active deal for client
        const clientDeal = deals.find(d => d.company_id === client.id && d.stage < 7)
        const stage = clientDeal?.stage || 1
        const color = STAGE_COLORS[stage] || '#6366f1'

        // Custom marker element
        const el = document.createElement('div')
        el.style.cssText = `
          width: 36px; height: 36px;
          border-radius: 50%;
          background: ${color};
          border: 3px solid rgba(255,255,255,0.3);
          box-shadow: 0 4px 16px rgba(0,0,0,0.4);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 900; color: white;
          transition: transform 0.2s;
          font-family: 'Inter', sans-serif;
          letter-spacing: -0.5px;
        `
        el.textContent = (client.razon_social || 'C')[0].toUpperCase()
        el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.2)' })
        el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)' })

        const popup = new mapboxgl.Popup({ offset: 20, closeButton: false, maxWidth: '240px' })
          .setHTML(`
            <div style="font-family:'Inter',sans-serif;padding:4px 0;">
              <p style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;opacity:0.5;margin:0 0 4px">
                ${STAGE_NAMES[stage] || 'Prospecto'}
              </p>
              <p style="font-size:14px;font-weight:900;margin:0 0 4px;line-height:1.2;">${client.razon_social || '—'}</p>
              <p style="font-size:11px;color:#6b7280;margin:0 0 6px;">${(client.comuna || '').replace(/_/g, ' ')}</p>
              ${clientDeal?.valor_neto ? `<p style="font-size:12px;font-weight:700;color:${color};">
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
      })
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
          <code className="block text-[10px] bg-white/10 text-emerald-400 font-mono px-4 py-2 rounded-xl">
            VITE_MAPBOX_TOKEN=pk.your_token_here
          </code>
        </div>
      </div>
    )
  }

  return (
    <div ref={mapContainer} className="w-full h-[500px] rounded-[28px] border border-black/[0.05] dark:border-white/[0.05] overflow-hidden shadow-xl" />
  )
}
