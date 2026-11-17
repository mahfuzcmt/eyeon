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

    /** A valid PNG signature and IHDR declaring {@code w} x {@code h}, and nothing else: 33 bytes. */
    private static byte[] pngHeaderOnly(int w, int h) {
        java.nio.ByteBuffer ihdr = java.nio.ByteBuffer.allocate(17);
        ihdr.put(new byte[] {'I', 'H', 'D', 'R'}).putInt(w).putInt(h)
                .put((byte) 8).put((byte) 6).put((byte) 0).put((byte) 0).put((byte) 0);
        java.util.zip.CRC32 crc = new java.util.zip.CRC32();
        crc.update(ihdr.array());
        java.nio.ByteBuffer png = java.nio.ByteBuffer.allocate(8 + 4 + 17 + 4);
        png.put(new byte[] {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A});
        png.putInt(13).put(ihdr.array()).putInt((int) crc.getValue());
        return png.array();
    }

    @Test
    void a_tiny_file_declaring_huge_dimensions_is_refused_from_its_header_alone() {
        // 30000 x 30000 RGBA would be 3.6 GB decoded; the container has 768 MB.
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> service.normalize(pngHeaderOnly(30_000, 30_000)));
        assertEquals("Image dimensions are too large", e.getMessage());
        // The sponsor banner goes through the same decoder.
        assertThrows(IllegalArgumentException.class, () -> DevicePhotoService.coverJpeg(pngHeaderOnly(30_000, 30_000),
                SponsorAdService.WIDTH, SponsorAdService.HEIGHT, SponsorAdService.MAX_UPLOAD_BYTES));
        // A truncated file of sane dimensions is "not an image", not a server error.
        assertEquals("Image must be a JPEG or PNG",
                assertThrows(IllegalArgumentException.class, () -> service.normalize(pngHeaderOnly(800, 600))).getMessage());
    }

    @Test
    void a_large_photo_is_decoded_subsampled_and_still_cropped_around_its_centre() throws IOException {
        BufferedImage out = ImageIO.read(new ByteArrayInputStream(service.normalize(png(4000, 3000))));
        assertEquals(DevicePhotoService.SIZE, out.getWidth());
        assertTrue(new Color(out.getRGB(40, 128)).getRed() > 200);
        assertTrue(new Color(out.getRGB(216, 128)).getBlue() > 200);
    }

    @Test
    void a_body_is_never_read_past_the_limit() throws IOException {
        // Declared too large: refused without touching the stream.
        java.io.InputStream untouched = new java.io.InputStream() {
            @Override
            public int read() {
                throw new AssertionError("the body must not be read");
            }
        };
        assertThrows(IllegalArgumentException.class, () -> DevicePhotoService.readLimited(untouched, 5_000_000L, 1024));
        // No declared length (chunked): cut off at the limit.
        assertThrows(IllegalArgumentException.class,
                () -> DevicePhotoService.readLimited(new ByteArrayInputStream(new byte[2048]), -1, 1024));
        assertEquals(1024, DevicePhotoService.readLimited(new ByteArrayInputStream(new byte[1024]), 1024, 1024).length);
    }

    @Test
    void an_oversized_upload_is_rejected_before_decoding() {
        assertThrows(IllegalArgumentException.class,
                () -> service.normalize(new byte[DevicePhotoService.MAX_UPLOAD_BYTES + 1]));
    }
}
