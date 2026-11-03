package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.exception.ForbiddenException;
import com.webinnovation.eyeon.exception.NotFoundException;
import com.webinnovation.eyeon.repository.SponsorAdRepository;
import com.webinnovation.eyeon.repository.SponsorAdRepository.SponsorAd;
import com.webinnovation.eyeon.security.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Sponsor ads on the app's Home slider (CLAUDE.md §8.11). Only a SUPER_ADMIN changes them; the
 * active ones are public. Every banner is re-encoded to {@link #WIDTH}x{@link #HEIGHT} JPEG, so
 * the slider has one shape and no metadata from the upload survives.
 */
@Service
@RequiredArgsConstructor
public class SponsorAdService {

    public static final int WIDTH = 1200;
    public static final int HEIGHT = 600;
    public static final int MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
    static final int MAX_TITLE = 120;
    static final int MAX_LINK = 500;

    private static final String ROLE_SUPER = "SUPER_ADMIN";

    private final SponsorAdRepository repo;
    private final AuditService audit;

    public record Input(String title, String linkUrl, Integer sortOrder, Boolean active) {}

    public List<SponsorAd> listAll() {
        requireSuperAdmin();
        return repo.listAll();
    }

    public List<SponsorAd> listShown() {
        return repo.listShown();
    }

    public SponsorAd create(Input in) {
        requireSuperAdmin();
        SponsorAd ad = repo.insert(cleanTitle(in.title()), cleanLink(in.linkUrl()),
                in.sortOrder() == null ? 0 : in.sortOrder(),
                in.active() == null || in.active(),
                TenantContext.currentUserId());
        audit.record("SPONSOR_AD_CREATE", "sponsor_ad", ad.id().toString(), null);
        return ad;
    }

    /** Fields left out (null) keep their value. A blank title or link clears it. */
    public SponsorAd update(UUID id, Input in) {
        requireSuperAdmin();
        SponsorAd cur = repo.find(id).orElseThrow(() -> new NotFoundException("sponsor ad", id.toString()));
        SponsorAd ad = repo.update(id,
                in.title() == null ? cur.title() : cleanTitle(in.title()),
                in.linkUrl() == null ? cur.linkUrl() : cleanLink(in.linkUrl()),
                in.sortOrder() == null ? cur.sortOrder() : in.sortOrder(),
                in.active() == null ? cur.active() : in.active())
                .orElseThrow(() -> new NotFoundException("sponsor ad", id.toString()));
        audit.record("SPONSOR_AD_UPDATE", "sponsor_ad", id.toString(), null);
        return ad;
    }

    public Instant setImage(UUID id, byte[] upload) {
        requireSuperAdmin();
        byte[] jpeg = DevicePhotoService.coverJpeg(upload, WIDTH, HEIGHT, MAX_UPLOAD_BYTES);
        Instant version = repo.saveImage(id, "image/jpeg", jpeg)
                .orElseThrow(() -> new NotFoundException("sponsor ad", id.toString()));
        audit.record("SPONSOR_AD_IMAGE", "sponsor_ad", id.toString(), Map.of("bytes", jpeg.length));
        return version;
    }

    public void delete(UUID id) {
        requireSuperAdmin();
        if (!repo.delete(id)) throw new NotFoundException("sponsor ad", id.toString());
        audit.record("SPONSOR_AD_DELETE", "sponsor_ad", id.toString(), null);
    }

    /** Public: the image of an ad that is shown. Switched-off ads are not served. */
    public SponsorAdRepository.Image shownImage(UUID id) {
        SponsorAd ad = repo.find(id).filter(SponsorAd::active)
                .orElseThrow(() -> new NotFoundException("sponsor ad", id.toString()));
        return repo.findImage(ad.id()).orElseThrow(() -> new NotFoundException("sponsor ad image", id.toString()));
    }

    static String cleanTitle(String title) {
        if (title == null || title.isBlank()) return null;
        String t = title.strip();
        if (t.length() > MAX_TITLE) throw new IllegalArgumentException("Title is longer than " + MAX_TITLE + " characters");
        return t;
    }

    /**
     * Only absolute http(s) links with a host: the app hands this to the phone's browser, so a
     * {@code javascript:}, {@code intent:} or {@code file:} link must never be stored.
     */
    static String cleanLink(String link) {
        if (link == null || link.isBlank()) return null;
        String l = link.strip();
        if (l.length() > MAX_LINK) throw new IllegalArgumentException("Link is longer than " + MAX_LINK + " characters");
        URI uri;
        try {
            uri = new URI(l);
        } catch (Exception e) {
            throw new IllegalArgumentException("Link is not a valid web address");
        }
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
        if (!scheme.equals("https") && !scheme.equals("http")) {
            throw new IllegalArgumentException("Link must start with https:// or http://");
        }
        if (uri.getHost() == null || uri.getHost().isBlank()) {
            throw new IllegalArgumentException("Link is not a valid web address");
        }
        return l;
    }

    private static void requireSuperAdmin() {
        if (!ROLE_SUPER.equals(TenantContext.currentRole())) {
            throw new ForbiddenException("Super Admin role required");
        }
    }
}
