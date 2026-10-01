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
  /** Status colour — fills the avatar badge and the name pill (same rule as the web map). */
  color: string;
  /** Name shown above the marker. */
  label: string;
  /** Avatar: BOY | GIRL | OLD_MAN | PERSON. Anything else, including legacy CAR/MOTORBIKE, draws PERSON. */
  vehicleType?: string | null;
  /** Kept for callers; the badge is tinted by status, not by this. */
  iconColor?: string | null;
  /** Above the configured SPEED_OVER threshold — red badge + blinking marker. */
  overspeed?: boolean;
  /** Draw the heading pointer. Only set while the person is actually moving. */
  moving?: boolean;
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
// Google key works: add https://mobile.eyeongps.app/* to the key's allowed
// referrers in Google Cloud Console. Domain doesn't need to exist.
const MAP_REFERRER = "https://mobile.eyeongps.app/";

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
  .vwrap{position:relative;width:48px;height:48px}
  .veh{width:40px;height:40px;cursor:pointer;transform-origin:center}
  .veh svg{display:block;filter:drop-shadow(0 2px 3px rgba(10,25,40,.45))}
  .ava{position:absolute;inset:0;cursor:pointer}
  .ava svg{display:block;filter:drop-shadow(0 2px 3px rgba(10,25,40,.45))}
  .ptr{position:absolute;inset:0;transform-origin:center;pointer-events:none}
  .lbl{position:absolute;bottom:calc(100% + 9px);left:50%;transform:translateX(-50%);
       font:700 12px -apple-system,Roboto,'Noto Sans Bengali',sans-serif;color:#fff;
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

  // Person avatars — same art as the web map (frontend/src/lib/personIcons.ts; keep the two in
  // sync): an upright round portrait (a face is never rotated) inside a ring tinted by state,
  // and a heading pointer that orbits it while moving. No ids in the SVG: it is repeated per marker.
  function personType(t){ t = String(t||'').toUpperCase(); return (t==='BOY'||t==='GIRL'||t==='OLD_MAN') ? t : 'PERSON'; }
  var SKIN = '#E9B48C', HAIR = '#2A1B14';
  var BACKDROP = {BOY:'#D6EBFF', GIRL:'#FFE1EC', OLD_MAN:'#E8F0DC', PERSON:'#E3F3EF'};
  // Lower edge runs along the ring's centre line, so the ring hides the cut (no clipPath).
  function shoulders(fill){ return '<path d="M-11.4 9 C-9.6 5 -5 4 0 4 C5 4 9.6 5 11.4 9 A14.5 14.5 0 0 1 -11.4 9 Z" fill="'+fill+'"/>'; }
  var EARS = '<circle cx="-7.5" cy="-1.5" r="1.6" fill="'+SKIN+'"/><circle cx="7.5" cy="-1.5" r="1.6" fill="'+SKIN+'"/>';
  var HEAD = '<circle cy="-2.2" r="7.6" fill="'+SKIN+'"/>';
  var EYES = '<circle cx="-2.8" cy="-1.5" r="1" fill="'+HAIR+'"/><circle cx="2.8" cy="-1.5" r="1" fill="'+HAIR+'"/>';
  var SMILE = '<path d="M-2.5 1.7 Q0 4 2.5 1.7" fill="none" stroke="#8A3B2E" stroke-width="1" stroke-linecap="round"/>';
  var CHEEKS = '<circle cx="-4.7" cy="1.3" r="1.4" fill="#F0857A" opacity=".45"/><circle cx="4.7" cy="1.3" r="1.4" fill="#F0857A" opacity=".45"/>';
  var PORTRAIT = {
    BOY: shoulders('#2F80ED') + '<path d="M-2.6 4.2 L0 6.6 L2.6 4.2 Z" fill="#fff"/>' + EARS + HEAD
      + '<path d="M-7.9 -3 C-8.8 -9.6 -4.4 -12.2 0.4 -12 C5.6 -11.8 8.8 -8.6 7.9 -2.8 C7.2 -5.4 5.4 -7 3 -7.4 C0 -6 -4 -5.8 -6.4 -6.6 C-7.2 -5.6 -7.6 -4.4 -7.9 -3 Z" fill="'+HAIR+'"/>'
      + EYES + SMILE + CHEEKS,
    GIRL: '<ellipse cx="-9" cy="1.6" rx="2.7" ry="4.6" fill="'+HAIR+'"/><ellipse cx="9" cy="1.6" rx="2.7" ry="4.6" fill="'+HAIR+'"/>'
      + '<circle cy="-3" r="8.5" fill="'+HAIR+'"/>' + shoulders('#EC4899') + '<path d="M-2.6 4.2 Q0 6.4 2.6 4.2 Z" fill="#fff"/>' + HEAD
      + '<path d="M-7.6 -2.4 C-7.8 -8.4 -4 -10.4 0 -10.4 C4 -10.4 7.8 -8.4 7.6 -2.4 C6.8 -5.6 4 -7.8 0 -8.6 C-4 -7.8 -6.8 -5.6 -7.6 -2.4 Z" fill="'+HAIR+'"/>'
      + '<circle cx="-8.4" cy="-3" r="1.5" fill="#FFC857"/><circle cx="8.4" cy="-3" r="1.5" fill="#FFC857"/>'
      + EYES + SMILE + CHEEKS,
    OLD_MAN: '<circle cx="-7" cy="-4.6" r="3.1" fill="#DADFE3"/><circle cx="7" cy="-4.6" r="3.1" fill="#DADFE3"/>'
      + shoulders('#5B7083') + EARS + HEAD
      + '<path d="M-2.6 -7.4 Q0 -8 2.6 -7.4" fill="none" stroke="#CF9A72" stroke-width=".6" stroke-linecap="round"/>'
      + '<path d="M-7 0 C-6.8 6.4 -3.4 9.4 0 9.4 C3.4 9.4 6.8 6.4 7 0 C5 2.4 2.6 1.5 0 1.5 C-2.6 1.5 -5 2.4 -7 0 Z" fill="#F7F7F5" stroke="#D5DADE" stroke-width=".4"/>'
      + '<path d="M-3.4 1.9 Q-1.7 .4 0 1.6 Q1.7 .4 3.4 1.9 Q1.7 3.2 0 2.5 Q-1.7 3.2 -3.4 1.9 Z" fill="#E1E5E8"/>'
      + '<path d="M-1.3 3.9 Q0 4.7 1.3 3.9" fill="none" stroke="#B56A5A" stroke-width=".7" stroke-linecap="round"/>'
      + '<path d="M-4.9 -5.3 Q-3 -6.2 -1.3 -5.3 M1.3 -5.3 Q3 -6.2 4.9 -5.3" fill="none" stroke="#C4CACF" stroke-width="1" stroke-linecap="round"/>'
      + '<circle cx="-2.9" cy="-2" r="2.2" fill="#fff" fill-opacity=".4" stroke="#3B3B3B" stroke-width=".7"/><circle cx="2.9" cy="-2" r="2.2" fill="#fff" fill-opacity=".4" stroke="#3B3B3B" stroke-width=".7"/>'
      + '<path d="M-.7 -2.2 Q0 -2.7 .7 -2.2 M-5.1 -2.4 L-7.2 -3 M5.1 -2.4 L7.2 -3" fill="none" stroke="#3B3B3B" stroke-width=".7" stroke-linecap="round"/>'
      + '<circle cx="-2.9" cy="-1.9" r=".85" fill="'+HAIR+'"/><circle cx="2.9" cy="-1.9" r=".85" fill="'+HAIR+'"/>',
    PERSON: shoulders('#0F6B5C') + '<path d="M-2.6 4.2 L0 6.6 L2.6 4.2 Z" fill="#fff"/>' + EARS + HEAD
      + '<path d="M-7.8 -2.6 C-8.6 -9 -4.6 -11.8 0 -11.8 C4.8 -11.8 8.6 -9 7.8 -2.6 C7.2 -5 6 -6.8 4.4 -7.8 C1.6 -8.4 -1.8 -8.2 -4.6 -8.6 C-6.2 -7.2 -7.2 -5 -7.8 -2.6 Z" fill="'+HAIR+'"/>'
      + EYES + SMILE
  };
  function avatarSvg(type, color){
    return '<svg width="48" height="48" viewBox="-18 -18 36 36">'
      + '<circle r="14.5" fill="'+BACKDROP[type]+'"/>' + PORTRAIT[type]
      + '<circle r="14.5" fill="none" stroke="'+color+'" stroke-width="3.6"/>'
      + '<circle r="16.9" fill="none" stroke="#fff" stroke-width="1.4"/></svg>';
  }
  function pointerSvg(color){
    return '<svg width="48" height="48" viewBox="-24 -24 48 48" style="overflow:visible">'
      + '<path d="M0 -34 L8 -20 L-8 -20 Z" fill="'+color+'" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  }
  function vehHtml(v){
    const color = v.overspeed ? '#D92D20' : (v.color||'#0F6B5C');
    return '<div class="vwrap'+(v.overspeed?' ovs':'')+'">'
      + (v.label ? '<div class="lbl" style="background:'+color+'">'+esc(v.label)+'</div>' : '')
      + (v.moving ? '<div class="ptr" style="transform:rotate('+(v.course||0)+'deg)">'+pointerSvg(color)+'</div>' : '')
      + '<div class="ava">'+avatarSvg(personType(v.vehicleType), color)+'</div>'
      + '</div>';
  }
  function vehIcon(v){
    return L.divIcon({className:'', iconSize:[48,48], iconAnchor:[24,24], html: vehHtml(v)});
  }
  function vehSig(v){ return [v.vehicleType,v.color,v.label,v.overspeed?1:0,v.moving?1:0].join('|'); }

  // Playback marker keeps the plain arrow (it marks a position on the route, not a person).
  function arrowIcon(color, course){
    return L.divIcon({className:'', iconSize:[26,26], iconAnchor:[13,13],
      html: '<div class="veh" style="width:26px;height:26px;transform:rotate('+(course||0)+'deg)">'
        + '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M12 2 L19 21 L12 16 L5 21 Z" fill="'+color+'" stroke="#0A1928" stroke-width="1.2"/></svg>'
        + '</div>'});
  }
  // Person markers rotate only their pointer layer; the playback arrow rotates as a whole.
  function rotate(marker, course){
    const root = marker.getElement();
    const el = root && (root.querySelector('.ptr') || root.querySelector('.veh'));
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
