package com.webinnovation.eyeon.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Snaps a piece of GPS track to the road network with an OSRM map-matching service.
 *
 * <p>GPS in Dhaka is off by 5-20 m between tall buildings, so a raw line wanders across
 * buildings and onto the wrong side of the road. The default service is the public FOSSGIS
 * OSRM at routing.openstreetmap.de (car, bike and foot profiles over OpenStreetMap), which is
 * for light use only - calls are cached for good (RouteService) and spaced
 * {@code eyeon.roads.min-interval-ms} apart. For real volume, run OSRM with the Bangladesh
 * extract on a machine with about 4 GB of RAM and point {@code eyeon.roads.match-url} at it.
 * A blank URL turns snapping off.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RoadMatcher {

    /** A matched line this much longer than the raw one took a detour (e.g. a metro track above no road). */
    static final double MAX_DETOUR = 1.6;
    static final double MIN_CONFIDENCE = 0.2;
    static final int RADIUS_M = 30;

    private final RestClient.Builder restClientBuilder;

    @Value("${eyeon.roads.match-url:https://routing.openstreetmap.de/routed-{profile}/match/v1/driving/}")
    private String matchUrl;
    @Value("${eyeon.roads.user-agent:EyeOn/1.0 (family safety tracker; https://eyeon.motolinkgps.com)}")
    private String userAgent;
    @Value("${eyeon.roads.min-interval-ms:1100}")
    private long minIntervalMs;
    /** The public OSRM servers answer "TooBig" above 10 trace points; a self-hosted one allows 100. */
    @Value("${eyeon.roads.max-points:10}")
    private int maxPoints = 10;

    private long lastCallAt;

    public record Match(List<double[]> coords, double confidence) {}

    public boolean enabled() {
        return matchUrl != null && !matchUrl.isBlank();
    }

    /** car at vehicle speed, bike for rickshaw / cycle speed, foot when walking. */
    public static String profileFor(int medianSpeedKmh) {
        return medianSpeedKmh >= 20 ? "car" : medianSpeedKmh >= 7 ? "bike" : "foot";
    }

    /** @return the road geometry as [lat, lng], or empty when the service has no confident answer */
    public Optional<Match> match(List<RoutePlanner.Pt> all, String profile) {
        if (!enabled() || all.size() < 2) return Optional.empty();
        // Matching routes along the roads between the points it is given, so evenly spaced
        // samples (always keeping both ends) describe a piece as well as every point does.
        List<RoutePlanner.Pt> pts = sample(all, maxPoints);
        String coords = pts.stream().map(p -> String.format(java.util.Locale.ROOT, "%.6f,%.6f", p.lng(), p.lat()))
                .collect(Collectors.joining(";"));
        String stamps = pts.stream().map(p -> String.valueOf(p.ts().getEpochSecond())).collect(Collectors.joining(";"));
        String radiuses = pts.stream().map(p -> String.valueOf(RADIUS_M)).collect(Collectors.joining(";"));
        String url = matchUrl.replace("{profile}", profile) + coords
                + "?geometries=geojson&overview=full&gaps=ignore&tidy=true&timestamps=" + stamps + "&radiuses=" + radiuses;
        JsonNode body;
        synchronized (this) {
            long wait = lastCallAt + minIntervalMs - System.currentTimeMillis();
            if (wait > 0) {
                try {
                    Thread.sleep(wait);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    return Optional.empty();
                }
            }
            lastCallAt = System.currentTimeMillis();
            try {
                body = restClientBuilder.build().get().uri(java.net.URI.create(url))
                        .header("User-Agent", userAgent).retrieve().body(JsonNode.class);
            } catch (Exception e) {
                log.info("Road matching failed ({} points, {}): {}", pts.size(), profile, e.getMessage());
                return Optional.empty();
            }
        }
        return parse(body, all);
    }

    static List<RoutePlanner.Pt> sample(List<RoutePlanner.Pt> pts, int max) {
        if (pts.size() <= max) return pts;
        List<RoutePlanner.Pt> out = new ArrayList<>(max);
        for (int i = 0; i < max; i++) out.add(pts.get((int) Math.round(i * (pts.size() - 1) / (double) (max - 1))));
        return out;
    }

    static Optional<Match> parse(JsonNode body, List<RoutePlanner.Pt> pts) {
        if (body == null || !"Ok".equals(body.path("code").asText())) return Optional.empty();
        List<double[]> out = new ArrayList<>();
        double confidence = 1;
        for (JsonNode m : body.path("matchings")) {
            confidence = Math.min(confidence, m.path("confidence").asDouble(0));
            for (JsonNode c : m.path("geometry").path("coordinates")) out.add(new double[] {c.get(1).asDouble(), c.get(0).asDouble()});
        }
        if (out.size() < 2 || confidence < MIN_CONFIDENCE) return Optional.empty();
        if (length(out) > MAX_DETOUR * rawLength(pts) + 100) return Optional.empty();
        return Optional.of(new Match(out, confidence));
    }

    static double length(List<double[]> c) {
        double m = 0;
        for (int i = 1; i < c.size(); i++) m += StayDetector.meters(c.get(i - 1)[0], c.get(i - 1)[1], c.get(i)[0], c.get(i)[1]);
        return m;
    }

    static double rawLength(List<RoutePlanner.Pt> p) {
        double m = 0;
        for (int i = 1; i < p.size(); i++) m += StayDetector.meters(p.get(i - 1).lat(), p.get(i - 1).lng(), p.get(i).lat(), p.get(i).lng());
        return m;
    }
}
