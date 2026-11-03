package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.exception.ForbiddenException;
import com.webinnovation.eyeon.repository.SponsorAdRepository;
import com.webinnovation.eyeon.security.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

/** Sponsor ads: links the phone's browser may open, who may change them, and the banner shape. */
class SponsorAdServiceTest {

    private final SponsorAdRepository repo = mock(SponsorAdRepository.class);
    private final SponsorAdService service = new SponsorAdService(repo, mock(AuditService.class));

    @AfterEach
    void clear() {
        TenantContext.clear();
    }

    @Test
    void web_links_are_kept_and_blank_clears_the_link() {
        assertEquals("https://example.com/offer?x=1", SponsorAdService.cleanLink("  https://example.com/offer?x=1 "));
        assertEquals("http://shop.example.com.bd", SponsorAdService.cleanLink("http://shop.example.com.bd"));
        assertNull(SponsorAdService.cleanLink("   "));
        assertNull(SponsorAdService.cleanLink(null));
    }

    @Test
    void links_the_app_must_never_open_are_refused() {
        for (String bad : new String[] {
                "javascript:alert(1)", "intent://scan/#Intent;scheme=zxing;end", "file:///etc/passwd",
                "tel:+8801700000000", "example.com", "https://", "data:text/html,hi"}) {
            assertThrows(IllegalArgumentException.class, () -> SponsorAdService.cleanLink(bad), bad);
        }
        assertThrows(IllegalArgumentException.class, () -> SponsorAdService.cleanLink("https://a.com/" + "x".repeat(600)));
    }

    @Test
    void only_a_super_admin_can_change_ads() {
        TenantContext.set(UUID.randomUUID(), UUID.randomUUID(), "ORG_ADMIN");
        var in = new SponsorAdService.Input("Offer", "https://example.com", 0, true);

        assertThrows(ForbiddenException.class, () -> service.create(in));
        assertThrows(ForbiddenException.class, () -> service.update(UUID.randomUUID(), in));
        assertThrows(ForbiddenException.class, () -> service.delete(UUID.randomUUID()));
        assertThrows(ForbiddenException.class, () -> service.setImage(UUID.randomUUID(), new byte[] {1}));
        assertThrows(ForbiddenException.class, service::listAll);
        verifyNoInteractions(repo);
    }

    @Test
    void a_super_admin_cannot_store_a_bad_link_either() {
        TenantContext.set(UUID.randomUUID(), UUID.randomUUID(), "SUPER_ADMIN");
        assertThrows(IllegalArgumentException.class,
                () -> service.create(new SponsorAdService.Input("Offer", "javascript:alert(1)", 0, true)));
        verifyNoInteractions(repo);
    }

    @Test
    void any_upload_becomes_a_1200_by_600_banner() throws IOException {
        for (int[] size : new int[][] {{800, 800}, {3000, 1000}, {600, 1200}}) {
            BufferedImage src = new BufferedImage(size[0], size[1], BufferedImage.TYPE_INT_RGB);
            ByteArrayOutputStream png = new ByteArrayOutputStream();
            ImageIO.write(src, "png", png);

            byte[] jpeg = DevicePhotoService.coverJpeg(png.toByteArray(), SponsorAdService.WIDTH,
                    SponsorAdService.HEIGHT, SponsorAdService.MAX_UPLOAD_BYTES);
            BufferedImage out = ImageIO.read(new ByteArrayInputStream(jpeg));

            assertEquals(1200, out.getWidth());
            assertEquals(600, out.getHeight());
        }
    }

    @Test
    void the_public_never_gets_a_switched_off_ad() {
        UUID id = UUID.randomUUID();
        org.mockito.Mockito.when(repo.find(id)).thenReturn(java.util.Optional.of(
                new SponsorAdRepository.SponsorAd(id, "Old", null, 0, false, java.time.Instant.now(), null, null)));
        assertThrows(com.webinnovation.eyeon.exception.NotFoundException.class, () -> service.shownImage(id));
        org.mockito.Mockito.verify(repo, org.mockito.Mockito.never()).findImage(any());
    }
}
