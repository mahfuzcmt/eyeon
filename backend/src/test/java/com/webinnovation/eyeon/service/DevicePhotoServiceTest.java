package com.webinnovation.eyeon.service;

import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Uploaded photos are always re-encoded: square, small, and with no metadata left in them. */
class DevicePhotoServiceTest {

    private final DevicePhotoService service = new DevicePhotoService();

    private static byte[] png(int w, int h) throws IOException {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = img.createGraphics();
        g.setColor(Color.RED);
        g.fillRect(0, 0, w / 2, h);
        g.setColor(Color.BLUE);
        g.fillRect(w / 2, 0, w - w / 2, h);
        g.dispose();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, "png", out);
        return out.toByteArray();
    }

    @Test
    void a_wide_png_becomes_a_256_square_jpeg_cropped_around_its_centre() throws IOException {
        byte[] jpeg = service.normalize(png(1200, 600));

        assertEquals((byte) 0xFF, jpeg[0]);
        assertEquals((byte) 0xD8, jpeg[1]);            // JPEG start-of-image
        BufferedImage out = ImageIO.read(new ByteArrayInputStream(jpeg));
        assertEquals(DevicePhotoService.SIZE, out.getWidth());
        assertEquals(DevicePhotoService.SIZE, out.getHeight());
        // The centre 600x600 was kept: left half red, right half blue.
        assertTrue(new Color(out.getRGB(40, 128)).getRed() > 200);
        assertTrue(new Color(out.getRGB(216, 128)).getBlue() > 200);
        assertTrue(jpeg.length < 60_000, "stored photo should be small, was " + jpeg.length);
    }

    @Test
    void bytes_that_are_not_an_image_are_rejected() {
        assertThrows(IllegalArgumentException.class, () -> service.normalize("<svg onload=alert(1)>".getBytes()));
        assertThrows(IllegalArgumentException.class, () -> service.normalize(new byte[0]));
    }

    @Test
    void an_oversized_upload_is_rejected_before_decoding() {
        assertThrows(IllegalArgumentException.class,
                () -> service.normalize(new byte[DevicePhotoService.MAX_UPLOAD_BYTES + 1]));
    }
}
