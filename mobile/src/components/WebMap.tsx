import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { colors } from "@/theme";
import { useAuth } from "@/auth/AuthContext";
import { useI18n } from "@/i18n";

export interface MapVehicle {
  imei: string;
  lat: number;
  lng: number;
  course: number;
  /** Status color — used for the plate-label pill background. */
  color: string;
  /** Label text shown above the marker (vehicle number). */
  label: string;
  /** Marker silhouette: CAR | MOTORBIKE | TRUCK | BUS | CNG (default CAR). */
  vehicleType?: string | null;
  /** Body tint of the silhouette (device icon color). */
  iconColor?: string | null;
  /** Above the configured SPEED_OVER threshold — red body + blinking marker. */
  overspeed?: boolean;
}

export interface MapPoint {
  lat: number;
  lng: number;
  course?: number;
}

export interface MapCircle {
  lat: number;
  lng: number;
  radiusM: number;
}

interface Props {
  vehicles?: MapVehicle[];
  /** Route polyline as [lng, lat] pairs (trip playback). */
  route?: [number, number][];
  /** Animated marker position during playback. */
  moving?: MapPoint | null;
  /** Center command; bump `nonce` to re-issue the same center. */
  center?: { lat: number; lng: number; zoom?: number; nonce?: number } | null;
  /** Zoom step command (+1 / -1); bump `nonce` to re-issue. */
  zoomStep?: { dir: 1 | -1; nonce: number } | null;
  /** Base layer kind — Normal (street) or Satellite. Default street. */
  baseLayer?: "street" | "satellite";
  /** Circle overlay (geofence preview); null clears it. */
  circle?: MapCircle | null;
  fitRoute?: boolean;
  /** Auto-fit map to show all vehicles; bump `nonce` to re-trigger. */
  fitVehicles?: { nonce: number } | null;
  /** Google live-traffic overlay (only effective on the Google base layer). */
  showTraffic?: boolean;
  /** Reports whether the traffic overlay is available (Google base active). */
  onTrafficAvailable?: (available: boolean) => void;
  onSelect?: (imei: string) => void;
  /** Fires when the user taps empty map (not a marker). */
  onMapPress?: (p: { lat: number; lng: number }) => void;
}

// Bangladesh default view.
const DEFAULT = { lat: 23.685, lng: 90.3563, zoom: 10 };
// Platform default; an org-owned key from /orgs/me takes precedence (see useAuth).
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

// The WebView page gets this origin (via `baseUrl`) so a referrer-restricted
// Google key works: add https://mobile.motolink.app/* to the key's allowed
// referrers in Google Cloud Console. Domain doesn't need to exist.
const MAP_REFERRER = "https://mobile.motolink.app/";

// Leaflet in the WebView, mirroring the web dashboard (frontend/src/lib/leaflet.ts):
// Google Maps base layer via GoogleMutant when a key is configured (OSM misses
// Bangladesh roads/POIs), free OSM tiles otherwise or when Google fails to load.
function buildHtml(googleKey: string, language: "en" | "bn"): string {
  // language → Bengali place names when the app is in Bengali; region=BD biases labels to Bangladesh.
  const googleScripts = googleKey
    ? `<script src="https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleKey)}&language=${language}&region=BD"></script>
<script src="https://unpkg.com/leaflet.gridlayer.googlemutant@0.14.1/dist/Leaflet.GoogleMutant.js"></script>`
    : "";
  return `<!doctype html><html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<link href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" rel="stylesheet"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
${googleScripts}
<style>
  html,body,#map{margin:0;height:100%;width:100%;background:${colors.bg}}
  .vwrap{position:relative;width:40px;height:40px}
  .veh{width:40px;height:40px;cursor:pointer;transform-origin:center}
  .veh svg{display:block;filter:drop-shadow(0 2px 3px rgba(10,25,40,.45))}
  .lbl{position:absolute;bottom:calc(100% - 2px);left:50%;transform:translateX(-50%);
       font:700 10px ui-monospace,monospace;color:#fff;letter-spacing:.3px;
       padding:2px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.55);
       box-shadow:0 1px 4px rgba(10,25,40,.35);white-space:nowrap}
  .ovs{animation:mlblink 1s step-start infinite}
  @keyframes mlblink{50%{opacity:.25}}
</style></head><body>
<div id="map"></div>
<script>
  const RN = window.ReactNativeWebView;
  const post = (o) => RN && RN.postMessage(JSON.stringify(o));
  const map = L.map('map', {
    center:[${DEFAULT.lat},${DEFAULT.lng}], zoom:${DEFAULT.zoom},
    zoomControl:false, attributionControl:true
  });
  map.attributionControl.setPrefix(false);

  // Base layer factory — Google (roadmap/hybrid) when the JS API loaded,
  // free OSM / Esri satellite tiles otherwise. Mirrors the web dashboard's
  // createBaseLayer in frontend/src/lib/leaflet.ts.
  let googleOk = false;
  try { googleOk = !!(window.google && window.google.maps && L.gridLayer.googleMutant); } catch(e){}
  function makeBase(kind){
    if(googleOk){
      try {
        return L.gridLayer.googleMutant({type: kind==='satellite'?'hybrid':'roadmap', maxZoom:21});
      } catch(e){}
    }
    return kind==='satellite'
      ? L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {maxZoom:19, attribution:'Tiles &copy; Esri'})
      : L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          {maxZoom:19, attribution:'&copy; OpenStreetMap'});
  }
  let baseKind = 'street';
  let base = makeBase(baseKind);
  base.addTo(map);

  // Google live-traffic overlay — only exists on the GoogleMutant base layer.
  let traffic = false;
  function applyTraffic(){
    if(!base || !base.addGoogleLayer) return;
    if(traffic) base.addGoogleLayer('TrafficLayer');
    else base.removeGoogleLayer('TrafficLayer');
  }
  // Google key rejected (bad key / referrer) — swap to free tiles so the map still works.
  window.gm_authFailure = function(){
    googleOk = false;
    map.removeLayer(base); base = makeBase(baseKind).addTo(map);
    post({type:'traffic', available:false});
  };

  const markers = {};       // imei -> L.Marker
  let moving = null;         // playback marker
  let route = null;          // trip polyline
  let circle = null;         // geofence preview

  function esc(s){ return String(s==null?'':s).replace(/[<>&]/g,''); }

  // Pseudo-3D top-view vehicles (24x40, pointing north), AutoNemo-style:
  // gradient-shaded bodies, glass windshields, wheels, lights. Gradient defs
  // repeat per marker with fixed ids — identical defs, so duplicate ids are
  // harmless (the browser resolves url(#...) to the first one).
  const DEFS =
      '<defs>'
    + '<linearGradient id="mlsh" x1="0" y1="0" x2="1" y2="0">'
    +   '<stop offset="0" stop-color="#000" stop-opacity=".38"/>'
    +   '<stop offset=".22" stop-color="#fff" stop-opacity=".30"/>'
    +   '<stop offset=".5" stop-color="#fff" stop-opacity=".04"/>'
    +   '<stop offset=".8" stop-color="#000" stop-opacity=".16"/>'
    +   '<stop offset="1" stop-color="#000" stop-opacity=".42"/>'
    + '</linearGradient>'
    + '<linearGradient id="mlgl" x1="0" y1="0" x2="0" y2="1">'
    +   '<stop offset="0" stop-color="#C7D8E6"/><stop offset="1" stop-color="#54718A"/>'
    + '</linearGradient>'
    + '<linearGradient id="mlgl2" x1="0" y1="0" x2="0" y2="1">'
    +   '<stop offset="0" stop-color="#54718A"/><stop offset="1" stop-color="#C7D8E6"/>'
    + '</linearGradient>'
    + '</defs>';
  const CAR_BODY = 'M12 2.2 C16.6 2.2 19.6 4.6 19.6 8.8 L19.6 33.2 C19.6 36.6 16.4 38 12 38 C7.6 38 4.4 36.6 4.4 33.2 L4.4 8.8 C4.4 4.6 7.4 2.2 12 2.2 Z';
  const BODY = {
    CAR: function(c){ return DEFS
      + '<rect x="2.6" y="7.5" width="3" height="6.5" rx="1.5" fill="#222"/><rect x="18.4" y="7.5" width="3" height="6.5" rx="1.5" fill="#222"/>'
      + '<rect x="2.6" y="27" width="3" height="6.5" rx="1.5" fill="#222"/><rect x="18.4" y="27" width="3" height="6.5" rx="1.5" fill="#222"/>'
      + '<rect x="2.9" y="14.4" width="2.4" height="1.8" rx=".9" fill="'+c+'"/><rect x="18.7" y="14.4" width="2.4" height="1.8" rx=".9" fill="'+c+'"/>'
      + '<path d="'+CAR_BODY+'" fill="'+c+'" stroke="rgba(0,0,0,.45)" stroke-width=".8"/>'
      + '<path d="'+CAR_BODY+'" fill="url(#mlsh)"/>'
      + '<ellipse cx="7.6" cy="3.9" rx="1.7" ry=".9" fill="#FFF4C2"/><ellipse cx="16.4" cy="3.9" rx="1.7" ry=".9" fill="#FFF4C2"/>'
      + '<path d="M6.6 9.6 Q12 7 17.4 9.6 L16.6 14.8 Q12 13 7.4 14.8 Z" fill="url(#mlgl)"/>'
      + '<rect x="6.8" y="16.5" width="10.4" height="9.5" rx="3.2" fill="#fff" opacity=".14"/>'
      + '<rect x="7.6" y="17.4" width="3.6" height="7.6" rx="1.8" fill="#fff" opacity=".14"/>'
      + '<path d="M7.4 27.6 Q12 29.4 16.6 27.6 L17.2 31.6 Q12 33.6 6.8 31.6 Z" fill="url(#mlgl2)"/>'
      + '<rect x="5.4" y="36.4" width="3.4" height="1.2" rx=".6" fill="#D23131"/><rect x="15.2" y="36.4" width="3.4" height="1.2" rx=".6" fill="#D23131"/>'; },
    MOTORBIKE: function(c){ return DEFS
      + '<rect x="10.6" y="1.6" width="2.8" height="7.4" rx="1.4" fill="#1d1d1d"/>'
      + '<rect x="10.6" y="30.5" width="2.8" height="8" rx="1.4" fill="#1d1d1d"/>'
      + '<rect x="10" y="3.6" width="4" height="4.4" rx="2" fill="'+c+'"/><rect x="10" y="3.6" width="4" height="4.4" rx="2" fill="url(#mlsh)"/>'
      + '<rect x="4.6" y="9.2" width="14.8" height="2.2" rx="1.1" fill="#2b2b2b"/>'
      + '<rect x="4.6" y="8.8" width="3" height="3" rx="1.4" fill="#111"/><rect x="16.4" y="8.8" width="3" height="3" rx="1.4" fill="#111"/>'
      + '<ellipse cx="12" cy="10.2" rx="1.8" ry="1" fill="#FFF4C2"/>'
      + '<path d="M12 10.8 C14.8 10.8 15.7 12.8 15.5 15.8 L14.7 24.5 C14.5 27.3 13.6 29.2 12 29.2 C10.4 29.2 9.5 27.3 9.3 24.5 L8.5 15.8 C8.3 12.8 9.2 10.8 12 10.8 Z" fill="'+c+'" stroke="rgba(0,0,0,.45)" stroke-width=".8"/>'
      + '<path d="M12 10.8 C14.8 10.8 15.7 12.8 15.5 15.8 L14.7 24.5 C14.5 27.3 13.6 29.2 12 29.2 C10.4 29.2 9.5 27.3 9.3 24.5 L8.5 15.8 C8.3 12.8 9.2 10.8 12 10.8 Z" fill="url(#mlsh)"/>'
      + '<ellipse cx="10.9" cy="14.2" rx="1.5" ry="2.4" fill="#fff" opacity=".32"/>'
      + '<path d="M9.7 22.6 L14.3 22.6 L14.7 28.6 C14.7 30.3 13.5 31.2 12 31.2 C10.5 31.2 9.3 30.3 9.3 28.6 Z" fill="#1f1f1f"/>'; },
    TRUCK: function(c){ return DEFS
      + '<rect x="2.6" y="6.5" width="3" height="6" rx="1.5" fill="#222"/><rect x="18.4" y="6.5" width="3" height="6" rx="1.5" fill="#222"/>'
      + '<rect x="2.6" y="21.5" width="3" height="6" rx="1.5" fill="#222"/><rect x="18.4" y="21.5" width="3" height="6" rx="1.5" fill="#222"/>'
      + '<rect x="2.6" y="29" width="3" height="6" rx="1.5" fill="#222"/><rect x="18.4" y="29" width="3" height="6" rx="1.5" fill="#222"/>'
      + '<rect x="3.1" y="7.8" width="2.4" height="1.8" rx=".9" fill="'+c+'"/><rect x="18.5" y="7.8" width="2.4" height="1.8" rx=".9" fill="'+c+'"/>'
      + '<path d="M12 2.4 C15.8 2.4 18.8 3.7 18.8 6.7 L18.8 13.6 L5.2 13.6 L5.2 6.7 C5.2 3.7 8.2 2.4 12 2.4 Z" fill="'+c+'" stroke="rgba(0,0,0,.45)" stroke-width=".8"/>'
      + '<path d="M12 2.4 C15.8 2.4 18.8 3.7 18.8 6.7 L18.8 13.6 L5.2 13.6 L5.2 6.7 C5.2 3.7 8.2 2.4 12 2.4 Z" fill="url(#mlsh)"/>'
      + '<ellipse cx="7.8" cy="3.7" rx="1.6" ry=".8" fill="#FFF4C2"/><ellipse cx="16.2" cy="3.7" rx="1.6" ry=".8" fill="#FFF4C2"/>'
      + '<path d="M6.4 5.6 Q12 3.8 17.6 5.6 L17.6 9.2 Q12 7.8 6.4 9.2 Z" fill="url(#mlgl)"/>'
      + '<rect x="4" y="15" width="16" height="22.6" rx="1.6" fill="#E9EDF2" stroke="#9AA7B5" stroke-width=".8"/>'
      + '<rect x="4" y="15" width="16" height="22.6" rx="1.6" fill="url(#mlsh)" opacity=".55"/>'
      + '<path d="M4 19.5 H20 M4 24 H20 M4 28.5 H20 M4 33 H20" stroke="#9AA7B5" stroke-width=".6" opacity=".7"/>'; },
    BUS: function(c){ return DEFS
      + '<rect x="2.8" y="6.5" width="3" height="6.5" rx="1.5" fill="#222"/><rect x="18.2" y="6.5" width="3" height="6.5" rx="1.5" fill="#222"/>'
      + '<rect x="2.8" y="27.5" width="3" height="6.5" rx="1.5" fill="#222"/><rect x="18.2" y="27.5" width="3" height="6.5" rx="1.5" fill="#222"/>'
      + '<rect x="4.4" y="2.4" width="15.2" height="35.2" rx="4.5" fill="'+c+'" stroke="rgba(0,0,0,.45)" stroke-width=".8"/>'
      + '<rect x="4.4" y="2.4" width="15.2" height="35.2" rx="4.5" fill="url(#mlsh)"/>'
      + '<ellipse cx="7.8" cy="4" rx="1.6" ry=".9" fill="#FFF4C2"/><ellipse cx="16.2" cy="4" rx="1.6" ry=".9" fill="#FFF4C2"/>'
      + '<path d="M6.2 5.8 Q12 4 17.8 5.8 L17.8 9.8 Q12 8.4 6.2 9.8 Z" fill="url(#mlgl)"/>'
      + '<rect x="4.9" y="12" width="1.8" height="18" fill="url(#mlgl)" opacity=".9"/><rect x="17.3" y="12" width="1.8" height="18" fill="url(#mlgl)" opacity=".9"/>'
      + '<rect x="8.4" y="13.5" width="7.2" height="11.5" rx="1.6" fill="#fff" opacity=".18"/>'
      + '<rect x="9.6" y="15.5" width="4.8" height="3" rx="1" fill="#fff" opacity=".22"/>'
      + '<rect x="6.6" y="33.4" width="10.8" height="2.6" rx="1.2" fill="url(#mlgl2)"/>'
      + '<rect x="5.4" y="36.6" width="3.2" height="1.1" rx=".55" fill="#D23131"/><rect x="15.4" y="36.6" width="3.2" height="1.1" rx=".55" fill="#D23131"/>'; },
    CNG: function(c){ return DEFS
      + '<rect x="10.7" y="2" width="2.6" height="5.5" rx="1.3" fill="#1d1d1d"/>'
      + '<rect x="3" y="28" width="3" height="6.5" rx="1.5" fill="#222"/><rect x="18" y="28" width="3" height="6.5" rx="1.5" fill="#222"/>'
      + '<path d="M12 3.5 C16.4 3.5 18.4 6.8 18.4 11 L18.4 30.5 C18.4 34.4 15.6 36.2 12 36.2 C8.4 36.2 5.6 34.4 5.6 30.5 L5.6 11 C5.6 6.8 7.6 3.5 12 3.5 Z" fill="'+c+'" stroke="rgba(0,0,0,.45)" stroke-width=".8"/>'
      + '<path d="M12 3.5 C16.4 3.5 18.4 6.8 18.4 11 L18.4 30.5 C18.4 34.4 15.6 36.2 12 36.2 C8.4 36.2 5.6 34.4 5.6 30.5 L5.6 11 C5.6 6.8 7.6 3.5 12 3.5 Z" fill="url(#mlsh)"/>'
      + '<ellipse cx="12" cy="4.6" rx="1.8" ry=".9" fill="#FFF4C2"/>'
      + '<path d="M7.8 8.4 Q12 6 16.2 8.4 L15.8 12.6 Q12 11 8.2 12.6 Z" fill="url(#mlgl)"/>'
      + '<rect x="6.6" y="14.4" width="10.8" height="16.4" rx="3" fill="#0A1928" opacity=".32"/>'
      + '<path d="M6.6 18.6 H17.4 M6.6 23 H17.4 M6.6 27.4 H17.4" stroke="#0A1928" stroke-width=".7" opacity=".35"/>'
      + '<rect x="8.6" y="36.4" width="6.8" height="1.2" rx=".6" fill="#D23131"/>'; }
  };
  function vehHtml(v){
    const body = (BODY[v.vehicleType]||BODY.CAR)(v.overspeed ? '#DC2626' : (v.iconColor||'#E8900A'));
    return '<div class="vwrap'+(v.overspeed?' ovs':'')+'">'
      + (v.label ? '<div class="lbl" style="background:'+(v.color||'#0F2742')+'">'+esc(v.label)+'</div>' : '')
      + '<div class="veh" style="transform:rotate('+(v.course||0)+'deg)">'
      + '<svg width="40" height="40" viewBox="0 0 40 40"><g transform="translate(8 0)">'+body+'</g></svg>'
      + '</div></div>';
  }
  function vehIcon(v){
    return L.divIcon({className:'', iconSize:[40,40], iconAnchor:[20,20], html: vehHtml(v)});
  }
  function vehSig(v){ return [v.vehicleType,v.iconColor,v.color,v.label,v.overspeed?1:0].join('|'); }

  // Playback marker keeps the plain arrow (it marks a route position, not a vehicle).
  function arrowIcon(color, course){
    return L.divIcon({className:'', iconSize:[26,26], iconAnchor:[13,13],
      html: '<div class="veh" style="width:26px;height:26px;transform:rotate('+(course||0)+'deg)">'
        + '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M12 2 L19 21 L12 16 L5 21 Z" fill="'+color+'" stroke="#0A1928" stroke-width="1.2"/></svg>'
        + '</div>'});
  }
  function rotate(marker, course){
    const el = marker.getElement() && marker.getElement().querySelector('.veh');
    if(el) el.style.transform = 'rotate('+(course||0)+'deg)';
  }

  window.MLMap = {
    setVehicles(list){
      const seen = {};
      list.forEach(v => {
        seen[v.imei]=1;
        const m = markers[v.imei];
        if(m){
          m.setLatLng([v.lat,v.lng]);
          if(m._mlSig !== vehSig(v)){ m.setIcon(vehIcon(v)); m._mlSig = vehSig(v); }
          rotate(m, v.course);
        } else {
          const nm = L.marker([v.lat,v.lng], {icon: vehIcon(v)});
          nm._mlSig = vehSig(v);
          nm.on('click', () => post({type:'select', imei:v.imei}));
          nm.addTo(map);
          markers[v.imei] = nm;
        }
      });
      Object.keys(markers).forEach(imei => {
        if(!seen[imei]){ markers[imei].remove(); delete markers[imei]; }
      });
    },
    setTraffic(on){ traffic = !!on; applyTraffic(); },
    setRoute(coords){
      const latlngs = coords.map(c => [c[1], c[0]]);   // [lng,lat] -> [lat,lng]
      if(route){ route.setLatLngs(latlngs); }
      else { route = L.polyline(latlngs, {color:'${colors.brand}', weight:4, opacity:0.9}).addTo(map); }
    },
    setMoving(pt){
      if(!pt){ if(moving){moving.remove(); moving=null;} return; }
      if(moving){ moving.setLatLng([pt.lat,pt.lng]); rotate(moving, pt.course); }
      else { moving = L.marker([pt.lat,pt.lng],
               {icon: arrowIcon('#fff', pt.course||0, ''), interactive:false}).addTo(map); }
    },
    setCircle(c){
      if(!c){ if(circle){circle.remove(); circle=null;} return; }
      if(circle){ circle.setLatLng([c.lat,c.lng]); circle.setRadius(c.radiusM); }
      else {
        circle = L.circle([c.lat,c.lng], {radius:c.radiusM,
          color:'${colors.brand}', weight:2, fillColor:'${colors.brand}', fillOpacity:0.15}).addTo(map);
      }
    },
    center(lat,lng,zoom){ map.flyTo([lat,lng], zoom||14, {duration:0.8}); },
    zoomBy(d){ map.setZoom(map.getZoom()+d); },
    setBase(kind){
      if(kind === baseKind) return;
      baseKind = kind;
      map.removeLayer(base);
      base = makeBase(kind).addTo(map);
      applyTraffic();
      post({type:'traffic', available: !!(base && base.addGoogleLayer)});
    },
    fit(coords){
      if(!coords.length) return;
      const b = L.latLngBounds(coords.map(c => [c[1], c[0]]));
      map.fitBounds(b, {padding:[60,60], maxZoom:15});
    },
    fitVehicles(){
      const imeis = Object.keys(markers);
      if(imeis.length === 0) return;
      const pts = imeis.map(imei => markers[imei].getLatLng());
      if(pts.length === 1){
        // Single vehicle: zoom in close
        map.setView(pts[0], 16, {animate:true});
      } else {
        // Multiple vehicles: calculate optimal zoom based on spread
        const b = L.latLngBounds(pts);
        const latSpread = b.getNorth() - b.getSouth();
        const lngSpread = b.getEast() - b.getWest();
        const maxSpread = Math.max(latSpread, lngSpread);
        // Dynamic zoom based on spread
        let maxZoom = 15;
        if(maxSpread < 0.002) maxZoom = 17;
        else if(maxSpread < 0.005) maxZoom = 16;
        else if(maxSpread < 0.02) maxZoom = 15;
        else if(maxSpread < 0.05) maxZoom = 14;
        else if(maxSpread < 0.1) maxZoom = 13;
        else if(maxSpread < 0.3) maxZoom = 12;
        else if(maxSpread < 0.6) maxZoom = 11;
        else if(maxSpread < 1.0) maxZoom = 10;
        else maxZoom = 9;
        map.fitBounds(b.pad(0.1), {maxZoom:maxZoom, animate:true});
      }
    }
  };
  map.on('click', (e) => post({type:'mapclick', lat:e.latlng.lat, lng:e.latlng.lng}));
  map.whenReady(() => post({type:'ready', google: !!(base && base.addGoogleLayer)}));
</script></body></html>`;
}

export default function WebMap({
  vehicles,
  route,
  moving,
  center,
  zoomStep,
  baseLayer,
  circle,
  fitRoute,
  fitVehicles,
  showTraffic,
  onTrafficAvailable,
  onSelect,
  onMapPress,
}: Props) {
  // Org-owned Google key (settings on the web dashboard) beats the build-time default.
  const { org } = useAuth();
  const { locale } = useI18n();
  const googleKey = org?.googleMapsApiKey?.trim() || GOOGLE_MAPS_API_KEY;
  const mapLanguage: "en" | "bn" = locale === "bn" ? "bn" : "en";

  const ref = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  // Commands issued before the map's 'ready' message are queued, not dropped.
  const pending = useRef<string[]>([]);

  const run = useCallback(
    (js: string) => {
      if (ready) ref.current?.injectJavaScript(js + ";true;");
      else pending.current.push(js);
    },
    [ready],
  );

  useEffect(() => {
    if (ready && pending.current.length > 0) {
      const queued = pending.current;
      pending.current = [];
      queued.forEach((js) => ref.current?.injectJavaScript(js + ";true;"));
    }
  }, [ready]);

  useEffect(() => {
    if (vehicles) run(`window.MLMap.setVehicles(${JSON.stringify(vehicles)})`);
  }, [vehicles, run]);

  useEffect(() => {
    if (route) {
      run(`window.MLMap.setRoute(${JSON.stringify(route)})`);
      if (fitRoute) run(`window.MLMap.fit(${JSON.stringify(route)})`);
    }
  }, [route, fitRoute, run]);

  useEffect(() => {
    run(`window.MLMap.setMoving(${JSON.stringify(moving ?? null)})`);
  }, [moving, run]);

  useEffect(() => {
    if (center) run(`window.MLMap.center(${center.lat},${center.lng},${center.zoom ?? 14})`);
  }, [center, run]);

  useEffect(() => {
    if (zoomStep) run(`window.MLMap.zoomBy(${zoomStep.dir})`);
  }, [zoomStep, run]);

  useEffect(() => {
    if (baseLayer) run(`window.MLMap.setBase(${JSON.stringify(baseLayer)})`);
  }, [baseLayer, run]);

  useEffect(() => {
    if (circle !== undefined) run(`window.MLMap.setCircle(${JSON.stringify(circle ?? null)})`);
  }, [circle, run]);

  useEffect(() => {
    if (showTraffic !== undefined) run(`window.MLMap.setTraffic(${showTraffic ? "true" : "false"})`);
  }, [showTraffic, run]);

  useEffect(() => {
    if (fitVehicles) run(`window.MLMap.fitVehicles()`);
  }, [fitVehicles, run]);

  const onMessage = useCallback(
    (e: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(e.nativeEvent.data) as {
          type: string;
          imei?: string;
          lat?: number;
          lng?: number;
          google?: boolean;
          available?: boolean;
        };
        if (msg.type === "ready") {
          setReady(true);
          onTrafficAvailable?.(msg.google === true);
        } else if (msg.type === "traffic") {
          onTrafficAvailable?.(msg.available === true);
        } else if (msg.type === "select" && msg.imei) onSelect?.(msg.imei);
        else if (msg.type === "mapclick" && msg.lat != null && msg.lng != null) {
          onMapPress?.({ lat: msg.lat, lng: msg.lng });
        }
      } catch {
        /* ignore */
      }
    },
    [onSelect, onMapPress, onTrafficAvailable],
  );

  return (
    <View style={styles.fill}>
      <WebView
        ref={ref}
        style={styles.fill}
        originWhitelist={["*"]}
        source={{ html: buildHtml(googleKey, mapLanguage), baseUrl: MAP_REFERRER }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1, backgroundColor: colors.bg } });
