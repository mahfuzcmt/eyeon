package com.webinnovation.eyeon.api;

import com.webinnovation.eyeon.repository.SponsorAdRepository.SponsorAd;
import com.webinnovation.eyeon.service.SponsorAdService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Super admin management of the sponsor ads (CLAUDE.md §8.11). Every method checks SUPER_ADMIN in the service. */
@RestController
@RequestMapping("/admin/sponsor-ads")
@RequiredArgsConstructor
public class SponsorAdController {

    private final SponsorAdService service;

    /** The admin view; {@code imageUrl} is the public URL (null until an image is uploaded). */
    public record SponsorAdView(UUID id, String title, String linkUrl, int sortOrder, boolean active,
                                Instant imageUpdatedAt, String imageUrl, Instant createdAt, Instant updatedAt) {
        static SponsorAdView of(SponsorAd a) {
            return new SponsorAdView(a.id(), a.title(), a.linkUrl(), a.sortOrder(), a.active(), a.imageUpdatedAt(),
                    PublicSponsorAdController.imageUrl(a), a.createdAt(), a.updatedAt());
        }
    }

    @GetMapping
    public List<SponsorAdView> list() {
        return service.listAll().stream().map(SponsorAdView::of).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SponsorAdView create(@RequestBody SponsorAdService.Input in) {
        return SponsorAdView.of(service.create(in));
    }

    @PatchMapping("/{id}")
    public SponsorAdView update(@PathVariable UUID id, @RequestBody SponsorAdService.Input in) {
        return SponsorAdView.of(service.update(id, in));
    }

    /** Body: the raw image (JPEG or PNG, at most 3 MB). Stored centre-cropped as a 1200x600 JPEG. */
    @PutMapping(value = "/{id}/image",
            consumes = {MediaType.IMAGE_JPEG_VALUE, MediaType.IMAGE_PNG_VALUE, MediaType.APPLICATION_OCTET_STREAM_VALUE})
    public Map<String, Instant> image(@PathVariable UUID id, @RequestBody byte[] body) {
        return Map.of("imageUpdatedAt", service.setImage(id, body));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}

/**
 * What the app's Home slider reads. No login: ads are public by nature, and the images can then
 * be loaded as plain URLs (an image component cannot send the app's bearer token).
 */
@RestController
@RequestMapping("/public/sponsor-ads")
@RequiredArgsConstructor
class PublicSponsorAdController {

    private final SponsorAdService service;

    public record ShownAd(UUID id, String title, String linkUrl, String imageUrl) {}

    /** Relative to the API base; the URL carries the image version, so it can be cached for long. */
    static String imageUrl(SponsorAd a) {
        return a.hasImage() ? "/public/sponsor-ads/" + a.id() + "/image?v=" + a.imageUpdatedAt().toEpochMilli() : null;
    }

    @GetMapping
    public ResponseEntity<List<ShownAd>> list() {
        List<ShownAd> ads = service.listShown().stream()
                .map(a -> new ShownAd(a.id(), a.title(), a.linkUrl(), imageUrl(a)))
                .toList();
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(Duration.ofMinutes(1)).cachePublic()).body(ads);
    }

    @GetMapping("/{id}/image")
    public ResponseEntity<byte[]> image(@PathVariable UUID id) {
        var img = service.shownImage(id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(img.contentType()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePublic())
                .body(img.data());
    }
}
