'use client'

import React, { useState, useEffect, useRef } from 'react'
import { MapPin, Navigation, Clock, Map, AlertCircle, Zap } from 'lucide-react'

type Coords = {
  lat: number
  lng: number
}

type TripMapProps = {
  start: Coords
  end: Coords
}

const TripMap: React.FC<TripMapProps> = ({ start, end }) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [routeInfo, setRouteInfo] = useState<{
    distance: string
    duration: string
    steps: number
  } | null>(null)
  const [directionsError, setDirectionsError] = useState<string | null>(null)
  const [isLoadingRoute, setIsLoadingRoute] = useState(false)

  useEffect(() => {
    // Load Leaflet CSS and JS
    const loadLeaflet = async () => {
      if (typeof window !== 'undefined' && !window.L) {
        // Load CSS
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css'
        document.head.appendChild(link)

        // Load JS
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js'
        script.onload = () => setIsLoaded(true)
        document.head.appendChild(script)
      } else if (window.L) {
        setIsLoaded(true)
      }
    }

    loadLeaflet()
  }, [])

  useEffect(() => {
    if (!isLoaded || !mapRef.current || !start || !end) return

    const L = window.L
    
    // Initialize map
    const map = L.map(mapRef.current, {
      center: [start.lat, start.lng],
      zoom: 10,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      dragging: true,
      touchZoom: true,
      zoomControl: true
    })

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map)

    // Custom marker icons
    const startIcon = L.divIcon({
      html: `
        <div style="
          width: 32px;
          height: 32px;
          background: #22c55e;
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        ">S</div>
      `,
      className: 'custom-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    })

    const endIcon = L.divIcon({
      html: `
        <div style="
          width: 32px;
          height: 32px;
          background: #ef4444;
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        ">E</div>
      `,
      className: 'custom-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    })

    // Add markers
    const startMarker = L.marker([start.lat, start.lng], { icon: startIcon })
      .addTo(map)
      .bindPopup('Start Location')

    const endMarker = L.marker([end.lat, end.lng], { icon: endIcon })
      .addTo(map)
      .bindPopup('End Location')

    // Fit bounds to show both markers
    const group = L.featureGroup([startMarker, endMarker])
    map.fitBounds(group.getBounds().pad(0.1))

    // Get route from OpenRouteService (free alternative)
    const getRoute = async () => {
      setIsLoadingRoute(true)
      setDirectionsError(null)
      
      try {
        // Using OpenRouteService API (free with rate limits)
        const response = await fetch(
  `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${process.env.NEXT_PUBLIC_ORS_API_KEY}&start=${start.lng},${start.lat}&end=${end.lng},${end.lat}&format=geojson`
)
        
        if (!response.ok) {
          throw new Error('Route service unavailable')
        }
        
        const data = await response.json()
        const route = data.features[0]
        
        if (route) {
          // Add route line to map
          const routeLine = L.geoJSON(route, {
            style: {
              color: '#3b82f6',
              weight: 4,
              opacity: 0.8,
              lineCap: 'round',
              lineJoin: 'round'
            }
          }).addTo(map)

          // Extract route info
          const properties = route.properties
          const distance = (properties.segments[0].distance / 1000).toFixed(1) + ' km'
          const duration = Math.round(properties.segments[0].duration / 60) + ' min'
          const steps = properties.segments[0].steps?.length || 0

          setRouteInfo({
            distance,
            duration,
            steps
          })

          // Fit bounds to include route
          map.fitBounds(routeLine.getBounds().pad(0.05))
        }
      } catch (error) {
        console.error('Route error:', error)
        setDirectionsError('Unable to calculate route. Showing direct path.')
        
        // Fall back to simple straight line
        const straightLine = L.polyline([
          [start.lat, start.lng],
          [end.lat, end.lng]
        ], {
          color: '#94a3b8',
          weight: 2,
          opacity: 0.7,
          dashArray: '5, 10'
        }).addTo(map)

        // Calculate approximate distance
        const distance = map.distance([start.lat, start.lng], [end.lat, end.lng])
        const distanceKm = (distance / 1000).toFixed(1) + ' km'
        const approximateDuration = Math.round(distance / 1000 / 60 * 60) + ' min' // Rough estimate

        setRouteInfo({
          distance: distanceKm + ' (direct)',
          duration: approximateDuration + ' (est.)',
          steps: 0
        })
      } finally {
        setIsLoadingRoute(false)
      }
    }

    mapInstanceRef.current = map
    getRoute()

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [isLoaded, start, end])

  if (!isLoaded) {
    return (
      <div className="w-full h-96 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-3"></div>
          <p className="text-gray-600 font-medium">Loading Map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Route Info Bar */}
      {routeInfo && (
        <div className="bg-white border border-gray-200 rounded-t-lg p-4 shadow-sm">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Map className="w-4 h-4 text-blue-600" />
                <span className="text-gray-600">Distance:</span>
                <span className="font-medium text-gray-900">{routeInfo.distance}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-600" />
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium text-gray-900">{routeInfo.duration}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isLoadingRoute ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                  <span className="text-gray-600">Calculating...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4 text-purple-600" />
                  <span className="text-gray-600">
                    {routeInfo.steps > 0 ? `${routeInfo.steps} steps` : 'Direct route'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="relative">
        <div 
          ref={mapRef} 
          className="w-full h-96 bg-gray-100 rounded-lg border border-gray-200"
          style={{ minHeight: '400px' }}
        />

        {/* Error Message */}
        {directionsError && (
          <div className="absolute top-4 left-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <p className="text-yellow-700 text-sm font-medium">{directionsError}</p>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">Legend</h4>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
              <span className="text-xs text-gray-600">Start Point</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-sm"></div>
              <span className="text-xs text-gray-600">End Point</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-blue-500 rounded"></div>
              <span className="text-xs text-gray-600">Route</span>
            </div>
          </div>
        </div>

        {/* Map Provider Info */}
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-green-600" />
            <span className="text-xs text-gray-600">Free & Open Source</span>
          </div>
        </div>
      </div>
    </div>
  )
}
export default TripMap
