import React, { useState, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import DownloadCSV from './DownloadCSV'
import 'leaflet/dist/leaflet.css'

/* ── Color Gradient Helper ──────────────────────────────────── */
function valueToColor(value, min, max) {
    // Interpolates from deep blue (cold/low) → cyan → yellow → red (hot/high)
    const t = max === min ? 0.5 : (value - min) / (max - min) // normalize 0..1
    const r = Math.round(255 * Math.min(1, Math.max(0, 2 * t - 0.5)))
    const g = Math.round(255 * Math.min(1, Math.max(0, t < 0.5 ? 2 * t : 2 - 2 * t)))
    const b = Math.round(255 * Math.min(1, Math.max(0, 1 - 2 * t)))
    return `rgb(${r},${g},${b})`
}

/* ── Color Legend ────────────────────────────────────────────── */
function ColorLegend({ label, min, max }) {
    return (
        <div className="flex items-center gap-2 mt-1 px-1">
            <span className="text-[0.6rem] text-muted-foreground font-semibold">{label}:</span>
            <div className="flex-1 h-2.5 rounded-full" style={{
                background: 'linear-gradient(to right, rgb(0,0,255), rgb(0,255,255), rgb(255,255,0), rgb(255,0,0))'
            }} />
            <span className="text-[0.6rem] text-muted-foreground tabular-nums">{min.toFixed(1)}</span>
            <span className="text-[0.6rem] text-muted-foreground">→</span>
            <span className="text-[0.6rem] text-muted-foreground tabular-nums">{max.toFixed(1)}</span>
        </div>
    )
}
/* ── Shared Map Content (used in both inline & fullscreen) ──── */
function MapContent({ isTrackingMode, isColorMode, polylinePaths, data, colorKey, colorBounds }) {
    return (
        <>
            {/* TRACKING MODE */}
            {isTrackingMode && polylinePaths.map(({ wmoId, color, positions, rows }) => (
                <React.Fragment key={wmoId}>
                    <Polyline positions={positions} pathOptions={{ color, weight: 2.5, opacity: 0.85, dashArray: '6 4' }} />
                    <CircleMarker center={positions[0]} radius={7} color="#10b981" fillColor="#10b981" fillOpacity={0.9}>
                        <Popup><div className="text-xs"><div><strong>🟢 START</strong> — Float {wmoId}</div><div>Cycle: {rows[0].cycle_number}</div>{rows[0].profile_datetime && <div>Date: {rows[0].profile_datetime}</div>}</div></Popup>
                    </CircleMarker>
                    <CircleMarker center={positions[positions.length - 1]} radius={7} color="#f43f5e" fillColor="#f43f5e" fillOpacity={0.9}>
                        <Popup><div className="text-xs"><div><strong>🔴 END</strong> — Float {wmoId}</div><div>Cycle: {rows[rows.length - 1].cycle_number}</div>{rows[rows.length - 1].profile_datetime && <div>Date: {rows[rows.length - 1].profile_datetime}</div>}</div></Popup>
                    </CircleMarker>
                    {rows.map((row, i) => (
                        <CircleMarker key={`${wmoId}-${i}`} center={[row.latitude, row.longitude]} radius={3} color={color} fillOpacity={0.5}>
                            <Popup><div className="text-xs"><div><strong>Float {wmoId}</strong> · Cycle {row.cycle_number}</div>{row.profile_datetime && <div>Date: {row.profile_datetime}</div>}<div>Lat: {row.latitude}, Lon: {row.longitude}</div></div></Popup>
                        </CircleMarker>
                    ))}
                </React.Fragment>
            ))}

            {/* COLOR GRADIENT MODE */}
            {isColorMode && (() => {
                const circles = data.map((row, i) => {
                    const val = row[colorKey]
                    const mc = (val != null && !isNaN(val)) ? valueToColor(val, colorBounds.min, colorBounds.max) : '#3b82f6'
                    return (
                        <CircleMarker key={i} center={[row.latitude, row.longitude]} radius={5} color={mc} fillColor={mc} fillOpacity={0.8} weight={1}>
                            <Popup><div className="text-xs">{Object.entries(row).map(([k, v]) => (<div key={k}><strong>{k}:</strong> {v}</div>))}</div></Popup>
                        </CircleMarker>
                    )
                })
                return data.length > 3000
                    ? <MarkerClusterGroup chunkedLoading showCoverageOnHover={false} maxClusterRadius={30}>{circles}</MarkerClusterGroup>
                    : circles
            })()}

            {/* DEFAULT MODE */}
            {!isTrackingMode && !isColorMode && (
                <MarkerClusterGroup chunkedLoading showCoverageOnHover={false} maxClusterRadius={40}>
                    {data.map((row, i) => (
                        <CircleMarker key={i} center={[row.latitude, row.longitude]} radius={4} color="#3b82f6" fillOpacity={0.6}>
                            <Popup><div className="text-xs">{Object.entries(row).map(([k, v]) => (<div key={k}><strong>{k}:</strong> {v}</div>))}</div></Popup>
                        </CircleMarker>
                    ))}
                </MarkerClusterGroup>
            )}
        </>
    )
}

/* ── Main ResultRenderer Component ──────────────────────────── */
export default function ResultRenderer({ data }) {
    const [isFullscreen, setIsFullscreen] = useState(false)

    if (!data || !Array.isArray(data) || data.length === 0) return null

    const keys = Object.keys(data[0])
    const hasLatLon = keys.includes('latitude') && keys.includes('longitude')
    const hasDepthProfile = keys.includes('pressure') && (keys.includes('temp_adjusted') || keys.includes('psal_adjusted'))

    // Detect tracking mode: data has wmo_id + cycle_number alongside lat/lon
    const hasTracking = hasLatLon && keys.includes('wmo_id') && keys.includes('cycle_number')

    // Detect color gradient mode: data has temp_adjusted or psal_adjusted alongside lat/lon
    const colorKey = hasLatLon
        ? (keys.includes('temp_adjusted') ? 'temp_adjusted' : keys.includes('psal_adjusted') ? 'psal_adjusted' : null)
        : null

    // Pre-compute color bounds if applicable
    const colorBounds = useMemo(() => {
        if (!colorKey) return null
        const vals = data.map(r => r[colorKey]).filter(v => v != null && !isNaN(v))
        if (vals.length === 0) return null
        return { min: Math.min(...vals), max: Math.max(...vals) }
    }, [data, colorKey])

    // Pre-compute Polyline paths grouped by wmo_id, sorted by cycle_number
    const polylinePaths = useMemo(() => {
        if (!hasTracking) return null
        const groups = {}
        data.forEach(row => {
            const id = row.wmo_id
            if (!groups[id]) groups[id] = []
            groups[id].push(row)
        })
        // Sort each group by cycle_number and extract coordinate arrays
        const FLOAT_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899']
        return Object.entries(groups).map(([wmoId, rows], idx) => ({
            wmoId,
            color: FLOAT_COLORS[idx % FLOAT_COLORS.length],
            positions: rows
                .sort((a, b) => a.cycle_number - b.cycle_number)
                .map(r => [r.latitude, r.longitude]),
            rows: rows.sort((a, b) => a.cycle_number - b.cycle_number),
        }))
    }, [data, hasTracking])

    // ── 1. Geographic Map Rendering ─────────────────────────────
    if (hasLatLon) {
        // Compute a smart center from data instead of hardcoded [0,60]
        const avgLat = data.reduce((s, r) => s + r.latitude, 0) / data.length
        const avgLon = data.reduce((s, r) => s + r.longitude, 0) / data.length

        const isTrackingMode = hasTracking && polylinePaths && polylinePaths.length <= 10
        const isColorMode = !isTrackingMode && colorKey && colorBounds

        return (
            <div className="w-full mt-4 space-y-2">
                {/* ── Fullscreen Overlay ── */}
                {isFullscreen && (
                    <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col" style={{ animation: 'chat-appear 0.2s ease both' }}>
                        {/* Fullscreen top bar */}
                        <div className="flex items-center justify-between px-4 py-2.5 bg-black/60 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <span className="text-white text-sm font-semibold">🗺️ Map View</span>
                                <span className="text-[0.65rem] text-white/50">{data.length.toLocaleString()} points</span>
                                {isTrackingMode && <span className="text-[0.65rem] text-violet-300 bg-violet-500/20 px-2 py-0.5 rounded-full">Trajectory Mode</span>}
                                {isColorMode && <span className="text-[0.65rem] text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full">Color Gradient</span>}
                            </div>
                            <button
                                onClick={() => setIsFullscreen(false)}
                                className="text-white/70 hover:text-white text-sm bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors"
                            >
                                ✕ Close
                            </button>
                        </div>
                        {/* Fullscreen map body */}
                        <div className="flex-1 relative">
                            <MapContainer center={[avgLat, avgLon]} zoom={isTrackingMode ? 4 : 3} style={{ height: '100%', width: '100%' }}>
                                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
                                <MapContent isTrackingMode={isTrackingMode} isColorMode={isColorMode} polylinePaths={polylinePaths} data={data} colorKey={colorKey} colorBounds={colorBounds} />
                            </MapContainer>
                            {isColorMode && colorBounds && (
                                <div className="absolute bottom-4 left-4 right-4 z-[1000]">
                                    <ColorLegend label={colorKey === 'temp_adjusted' ? 'Temperature (°C)' : 'Salinity (PSU)'} min={colorBounds.min} max={colorBounds.max} />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="h-72 w-full rounded-lg overflow-hidden border border-border relative">
                    {/* Fullscreen button */}
                    <button
                        onClick={() => setIsFullscreen(true)}
                        className="absolute bottom-2 left-2 z-[1000] bg-black/60 backdrop-blur-md border border-white/15 text-white text-[0.7rem] px-2.5 py-1 rounded-lg shadow-lg hover:bg-black/80 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                        ⛶ Fullscreen
                    </button>
                    {/* Floating sample pill */}
                    {data.length > 500 && (
                        <div className="absolute top-2 right-2 z-[1000] bg-black/60 backdrop-blur-md border border-white/10 text-white text-[0.65rem] px-2.5 py-1 rounded-full shadow-lg pointer-events-none">
                            Displaying <b>{data.length.toLocaleString()}</b> sample points
                        </div>
                    )}
                    {/* Tracking mode label */}
                    {isTrackingMode && (
                        <div className="absolute top-2 left-2 z-[1000] bg-violet-600/80 backdrop-blur-md border border-violet-400/30 text-white text-[0.65rem] px-2.5 py-1 rounded-full shadow-lg pointer-events-none flex items-center gap-1">
                            <span>📍</span> Trajectory Mode · {polylinePaths.length} float{polylinePaths.length > 1 ? 's' : ''}
                        </div>
                    )}

                    <MapContainer center={[avgLat, avgLon]} zoom={isTrackingMode ? 4 : 3} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
                        <MapContent isTrackingMode={isTrackingMode} isColorMode={isColorMode} polylinePaths={polylinePaths} data={data} colorKey={colorKey} colorBounds={colorBounds} />
                    </MapContainer>
                </div>

                {/* Color Legend for gradient maps */}
                {isColorMode && colorBounds && (
                    <ColorLegend
                        label={colorKey === 'temp_adjusted' ? 'Temperature (°C)' : 'Salinity (PSU)'}
                        min={colorBounds.min}
                        max={colorBounds.max}
                    />
                )}

                {/* Tracking legend */}
                {isTrackingMode && polylinePaths && (
                    <div className="flex flex-wrap items-center gap-3 px-1">
                        {polylinePaths.map(({ wmoId, color }) => (
                            <div key={wmoId} className="flex items-center gap-1.5 text-[0.65rem] text-muted-foreground">
                                <span className="w-3 h-0.5 rounded-full inline-block" style={{ background: color }} />
                                Float {wmoId}
                            </div>
                        ))}
                        <div className="flex items-center gap-1 text-[0.6rem] text-muted-foreground/60">
                            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Start
                            <span className="w-2 h-2 rounded-full bg-red-500 inline-block ml-1" /> End
                        </div>
                    </div>
                )}

                <DownloadCSV data={data} filename="wavesena_map_data.csv" />
            </div>
        )
    }

    // ── 2. Vertical Depth Profile Rendering (Chart) ─────────────
    if (hasDepthProfile) {
        const valueKey = keys.includes('temp_adjusted') ? 'temp_adjusted' : 'psal_adjusted'
        return (
            <div className="w-full mt-4 space-y-2">
                <div className="h-64 w-full bg-white rounded-md border border-border p-4">
                    <h4 className="text-xs font-semibold text-gray-500 mb-2 truncate">Depth Profile ({valueKey} vs pressure)</h4>
                    <ResponsiveContainer width="100%" height="85%">
                        <LineChart data={data} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" dataKey={valueKey} domain={['auto', 'auto']} />
                            <YAxis type="number" dataKey="pressure" reversed={true} />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                            <Line type="monotone" dataKey={valueKey} stroke="#3b82f6" dot={false} strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <DownloadCSV data={data} filename="wavesena_profile_data.csv" />
            </div>
        )
    }

    // ── 3. Fallback: Paginated Data Table ────────────────────────
    return <TableRenderer data={data} />
}

/* ── Paginated Table Subcomponent ────────────────────────────── */
function TableRenderer({ data }) {
    const [page, setPage] = useState(0)
    const ROWS_PER_PAGE = 5
    const keys = Object.keys(data[0])
    const totalPages = Math.ceil(data.length / ROWS_PER_PAGE)

    const currentRows = data.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE)

    return (
        <div className="w-full mt-4 space-y-2">
            <div className="overflow-x-auto border border-border rounded-md select-text">
                <table className="w-full text-xs text-left">
                    <thead className="bg-muted text-muted-foreground">
                        <tr>
                            {keys.map(k => <th key={k} className="px-3 py-2 font-medium">{k}</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                        {currentRows.map((row, i) => (
                            <tr key={i} className="hover:bg-muted/50 transition-colors">
                                {keys.map(k => (
                                    <td key={k} className="px-3 py-2 whitespace-nowrap text-foreground">{row[k]}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-muted-foreground">Row {page * ROWS_PER_PAGE + 1} to {Math.min((page + 1) * ROWS_PER_PAGE, data.length)} of {data.length}</span>
                    <div className="flex gap-2">
                        <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-2 py-1 text-xs border border-border rounded disabled:opacity-50">Prev</button>
                        <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-2 py-1 text-xs border border-border rounded disabled:opacity-50">Next</button>
                    </div>
                </div>
            )}
            <DownloadCSV data={data} filename="wavesena_table_data.csv" />
        </div>
    )
}
