package com.webinnovation.eyeon.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.webinnovation.eyeon.repository.StayRepository;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.LinkedBlockingQueue;

/**
 * Area names for the stay report ("Karwan Bazar", "Panthapath"), from OpenStreetMap's Nominatim.
 *
 * <p>Names are cached for good in {@code place_names}, one per ~110 m grid cell and language, so
 * a place is looked up once ever. Lookups never run inside a web request: a cell that is not
 * cached yet is queued and resolved by one background worker at most once per
 * {@code eyeon.geocoding.min-interval-ms} - the public Nominatim service allows one request per
 * second and asks for caching and an identifying User-Agent. The report shows coordinates until
 * the name arrives. Setting {@code eyeon.geocoding.reverse-url} to blank turns lookups off.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PlaceNameService {

    private static final int QUEUE_SIZE = 300;

    private final StayRepository repo;
    private final RestClient.Builder restClientBuilder;

    @Value("${eyeon.geocoding.reverse-url:https://nominatim.openstreetmap.org/reverse}")
    private String reverseUrl;
    @Value("${eyeon.geocoding.user-agent:EyeOn/1.0 (family safety tracker; https://eyeon.motolinkgps.com)}")
    private String userAgent;
    @Value("${eyeon.geocoding.min-interval-ms:1200}")
    private long minIntervalMs;

    private record Job(String cell, String lang, double lat, double lng) {}

    private final BlockingQueue<Job> queue = new LinkedBlockingQueue<>(QUEUE_SIZE);
    private final Set<String> queued = ConcurrentHashMap.newKeySet();
    private Thread worker;

    /** Grid cell of a position: three decimals, about 110 m. */
    public static String cell(double lat, double lng) {
        return String.format(Locale.ROOT, "%.3f,%.3f", lat, lng);
    }

    public static String lang(String requested) {
        return requested != null && requested.toLowerCase(Locale.ROOT).startsWith("bn") ? "bn" : "en";
    }

    public Map<String, String> cached(Collection<String> cells, String lang) {
        return repo.cachedNames(cells, lang);
    }

    public boolean enabled() {
        return reverseUrl != null && !reverseUrl.isBlank();
    }

    /** Queue a lookup. @return false when lookups are off or the queue is full (the name will not arrive soon) */
    public boolean resolveLater(double lat, double lng, String lang) {
        if (!enabled()) return false;
        String cell = cell(lat, lng);
        String key = cell + "|" + lang;
        if (!queued.add(key)) return true;
        if (!queue.offer(new Job(cell, lang, lat, lng))) {
            queued.remove(key);
            return false;
        }
        return true;
    }

    @PostConstruct
    void start() {
        worker = Thread.ofVirtual().name("place-names").start(this::run);
    }

    @PreDestroy
    void stop() {
        if (worker != null) worker.interrupt();
    }

    private void run() {
        while (!Thread.currentThread().isInterrupted()) {
            try {
                Job job = queue.take();
                try {
                    String name = fetch(job.lat(), job.lng(), job.lang());
                    if (name != null) repo.saveName(job.cell(), job.lang(), name);
                } catch (Exception e) {
                    log.warn("Place name lookup failed for {}: {}", job.cell(), e.getMessage());
                } finally {
                    queued.remove(job.cell() + "|" + job.lang());
                }
                Thread.sleep(minIntervalMs);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
    }

    /** @return the name, "" when the map has nothing there, null when the service could not be asked */
    private String fetch(double lat, double lng, String lang) {
        JsonNode body = restClientBuilder.build().get()
                .uri(reverseUrl + "?format=jsonv2&zoom=17&addressdetails=1&lat={lat}&lon={lng}&accept-language={lang}",
                        lat, lng, lang)
                .header("User-Agent", userAgent)
                .retrieve()
                .body(JsonNode.class);
        if (body == null) return null;
        return nameOf(body);
    }

    /**
     * A short label out of a Nominatim answer: the street and the neighbourhood, e.g.
     * "Panthapath, Kalabagan", or just the area when the point is not on a named street.
     */
    static String nameOf(JsonNode body) {
        JsonNode a = body.path("address");
        Set<String> parts = new LinkedHashSet<>();
        String road = first(a, List.of("road", "pedestrian", "footway", "residential"));
        String area = first(a, List.of("neighbourhood", "quarter", "suburb", "village", "town", "city_district"));
        if (road != null) parts.add(road);
        if (area != null) parts.add(area);
        if (parts.isEmpty()) {
            String wider = first(a, List.of("city", "municipality", "county", "state_district"));
            if (wider != null) parts.add(wider);
        }
        String name = String.join(", ", parts);
        return name.length() > 200 ? name.substring(0, 200) : name;
    }

    private static String first(JsonNode address, List<String> keys) {
        for (String k : keys) {
            String v = address.path(k).asText("").trim();
            if (!v.isEmpty()) return v;
        }
        return null;
    }
}
