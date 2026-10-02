package com.webinnovation.eyeon.api;

import com.webinnovation.eyeon.exception.NotFoundException;
import com.webinnovation.eyeon.repository.DeviceRepository;
import com.webinnovation.eyeon.security.TenantContext;
import com.webinnovation.eyeon.service.AuditService;
import com.webinnovation.eyeon.service.DeviceAccessService;
import com.webinnovation.eyeon.service.DevicePhotoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * A photo of the person wearing the tracker, shown instead of the drawn portrait.
 *
 * <p>Privacy: this is a picture of a child. Reading and writing both go through
 * {@link DeviceAccessService#requireVisible(String)}, so a parent can only ever see or change
 * the photo of a child assigned to them (CLAUDE.md §11.2a), and the image is never public -
 * share links do not expose it.
 */
@RestController
@RequestMapping("/devices/{imei}/photo")
@RequiredArgsConstructor
public class DevicePhotoController {

    private final DeviceRepository deviceRepo;
    private final DevicePhotoService photoService;
    private final DeviceAccessService access;
    private final AuditService audit;

    /** Body: the raw image bytes (JPEG or PNG, at most 2 MB). Stored as a 256x256 JPEG. */
    @PutMapping(consumes = {MediaType.IMAGE_JPEG_VALUE, MediaType.IMAGE_PNG_VALUE, MediaType.APPLICATION_OCTET_STREAM_VALUE})
    public Map<String, Instant> upload(@PathVariable String imei, @RequestBody byte[] body) {
        UUID orgId = TenantContext.requireOrgId();
        access.requireVisible(imei);
        byte[] jpeg = photoService.normalize(body);   // IllegalArgumentException -> 400 VALIDATION
        Instant version = deviceRepo.savePhoto(orgId, imei, MediaType.IMAGE_JPEG_VALUE, jpeg);
        audit.record("DEVICE_PHOTO_SET", "device", imei, Map.of("bytes", jpeg.length));
        return Map.of("photoUpdatedAt", version);
    }

    /** The URL carries ?v={photoUpdatedAt}, so the response can be cached for a long time. */
    @GetMapping
    public ResponseEntity<byte[]> get(@PathVariable String imei) {
        UUID orgId = TenantContext.requireOrgId();
        access.requireVisible(imei);
        var photo = deviceRepo.findPhoto(orgId, imei).orElseThrow(() -> new NotFoundException("photo", imei));
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(photo.contentType()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePrivate())
                .body(photo.data());
    }

    @DeleteMapping
    public ResponseEntity<Void> delete(@PathVariable String imei) {
        UUID orgId = TenantContext.requireOrgId();
        access.requireVisible(imei);
        deviceRepo.deletePhoto(orgId, imei);
        audit.record("DEVICE_PHOTO_REMOVED", "device", imei, null);
        return ResponseEntity.noContent().build();
    }
}
