package com.webinnovation.eyeon.service;

import org.springframework.stereotype.Service;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.MemoryCacheImageOutputStream;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

/**
 * Turns an uploaded picture into the one shape EyeOn stores: a square 256x256 JPEG.
 *
 * <p>The upload is always decoded and re-encoded here, never stored as sent. That bounds the
 * size, guarantees the bytes really are an image, and drops all metadata - a phone photo of a
 * child carries the GPS position where it was taken.
 */
@Service
public class DevicePhotoService {

    public static final int SIZE = 256;
    /** Upload limit. The web client resizes before sending, so real uploads are ~30 kB. */
    public static final int MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
    /** Refuse to decode absurd dimensions (decompression bombs). */
    private static final int MAX_SOURCE_PIXELS = 40_000_000;

    /**
     * @return JPEG bytes, centre-cropped to a square and scaled to {@link #SIZE}
     * @throws IllegalArgumentException when the upload is not a readable JPEG/PNG or is too large
     */
    public byte[] normalize(byte[] upload) {
        return coverJpeg(upload, SIZE, SIZE, MAX_UPLOAD_BYTES);
    }

    /**
     * Decode an upload and re-encode it as a {@code width} x {@code height} JPEG, centre-cropped to
     * that shape (CSS "cover"). Shared by person photos and sponsor banners (SponsorAdService).
     *
     * @throws IllegalArgumentException when the upload is empty, over {@code maxBytes}, not a
     *         readable JPEG/PNG, or has absurd dimensions
     */
    static byte[] coverJpeg(byte[] upload, int width, int height, int maxBytes) {
        if (upload == null || upload.length == 0) throw new IllegalArgumentException("Image is empty");
        if (upload.length > maxBytes) {
            throw new IllegalArgumentException("Image is larger than " + (maxBytes / (1024 * 1024)) + " MB");
        }
        BufferedImage src;
        try {
            src = ImageIO.read(new ByteArrayInputStream(upload));
        } catch (IOException e) {
            src = null;
        }
        if (src == null) throw new IllegalArgumentException("Image must be a JPEG or PNG");
        if ((long) src.getWidth() * src.getHeight() > MAX_SOURCE_PIXELS) {
            throw new IllegalArgumentException("Image dimensions are too large");
        }

        // Largest region of the source with the target's aspect ratio, centred.
        double target = (double) width / height;
        int cropW = src.getWidth();
        int cropH = (int) Math.round(cropW / target);
        if (cropH > src.getHeight()) {
            cropH = src.getHeight();
            cropW = (int) Math.round(cropH * target);
        }
        int x = (src.getWidth() - cropW) / 2;
        int y = (src.getHeight() - cropH) / 2;

        BufferedImage out = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = out.createGraphics();
        try {
            g.setColor(Color.WHITE);                 // JPEG has no alpha: transparent PNG areas become white
            g.fillRect(0, 0, width, height);
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.drawImage(src, 0, 0, width, height, x, y, x + cropW, y + cropH, null);
        } finally {
            g.dispose();
        }

        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        try (ByteArrayOutputStream bytes = new ByteArrayOutputStream();
             MemoryCacheImageOutputStream stream = new MemoryCacheImageOutputStream(bytes)) {
            ImageWriteParam param = writer.getDefaultWriteParam();
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(0.85f);
            writer.setOutput(stream);
            writer.write(null, new IIOImage(out, null, null), param);
            stream.flush();
            return bytes.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Could not encode image", e);
        } finally {
            writer.dispose();
        }
    }
}
