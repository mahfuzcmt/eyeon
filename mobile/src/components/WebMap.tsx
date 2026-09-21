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
  /** Avatar: BOY | GIRL | PERSON. Anything else, including legacy CAR/MOTORBIKE, draws PERSON. */
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
  .vwrap{position:relative;width:40px;height:40px}
  .veh{width:40px;height:40px;cursor:pointer;transform-origin:center}
  .veh svg{display:block;filter:drop-shadow(0 2px 3px rgba(10,25,40,.45))}
  .ava{position:absolute;inset:0;cursor:pointer}
  .ava svg{display:block;filter:drop-shadow(0 2px 3px rgba(10,25,40,.45))}
  .ptr{position:absolute;inset:0;transform-origin:center;pointer-events:none}
  .lbl{position:absolute;bottom:calc(100% + 5px);left:50%;transform:translateX(-50%);
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

  // Person avatars — same design as the web map (frontend/src/lib/personIcons.ts): an upright
  // round badge (a face is never rotated) and a heading pointer that orbits it while moving.
  function darken(hex, pct){
    const n = parseInt(String(hex).replace('#',''),16), a = Math.round(2.55*pct);
    const c = function(v){ return Math.max(0, v - a); };
    return '#' + (0x1000000 + c(n>>16)*0x10000 + c((n>>8)&255)*0x100 + c(n&255)).toString(16).slice(1);
  }
  function personType(t){ t = String(t||'').toUpperCase(); return (t==='BOY'||t==='GIRL') ? t : 'PERSON'; }
  function glyph(type, hair){
    const body = '<path d="M9.5 36 C9.5 27.5 14 24.5 20 24.5 C26 24.5 30.5 27.5 30.5 36 Z" fill="#fff"/>';
    const head = '<circle cx="20" cy="16.5" r="5.6" fill="#fff"/>';
    if(type==='GIRL') return '<circle cx="13" cy="14.5" r="3" fill="#fff"/><circle cx="27" cy="14.5" r="3" fill="#fff"/>' + head
      + '<path d="M14.6 15.6 Q20 8.6 25.4 15.6 Q20 12.4 14.6 15.6 Z" fill="'+hair+'"/>' + body;
    if(type==='BOY') return head + '<path d="M14.5 15.2 Q15.5 9.8 20 9.8 Q24.5 9.8 25.5 15.2 Q22.5 12 14.5 15.2 Z" fill="'+hair+'"/>' + body;
    return head + body;
  }
  // Clip ids repeat per marker with a fixed id — identical defs, so duplicates are harmless.
  function avatarSvg(type, color){
    return '<svg width="40" height="40" viewBox="0 0 40 40">'
      + '<defs><clipPath id="eoclip"><circle cx="20" cy="20" r="12.5"/></clipPath></defs>'
      + '<circle cx="20" cy="20" r="14" fill="'+color+'" stroke="#fff" stroke-width="3"/>'
      + '<g clip-path="url(#eoclip)">'+glyph(type, darken(color,22))+'</g></svg>';
  }
  function pointerSvg(color){
    return '<svg width="40" height="40" viewBox="0 0 40 40" style="overflow:visible">'
      + '<path d="M20 -5 L26 5 L14 5 Z" fill="'+color+'" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
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
    return L.divIcon({className:'', iconSize:[40,40], iconAnchor:[20,20], html: vehHtml(v)});
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
