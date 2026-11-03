package com.webinnovation.eyeon.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Platform-wide sponsor ads (V32). Not tenant-scoped: only SUPER_ADMIN writes, everyone reads the active ones. */
@Repository
@RequiredArgsConstructor
public class SponsorAdRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public record SponsorAd(UUID id, String title, String linkUrl, int sortOrder, boolean active,
                            Instant imageUpdatedAt, Instant createdAt, Instant updatedAt) {
        public boolean hasImage() {
            return imageUpdatedAt != null;
        }
    }

    public record Image(String contentType, byte[] data) {}

    private static final String COLUMNS =
            "id, title, link_url, sort_order, active, image_updated_at, created_at, updated_at";

    private static final RowMapper<SponsorAd> MAPPER = (rs, i) -> new SponsorAd(
            rs.getObject("id", UUID.class),
            rs.getString("title"),
            rs.getString("link_url"),
            rs.getInt("sort_order"),
            rs.getBoolean("active"),
            toInstant(rs.getTimestamp("image_updated_at")),
            toInstant(rs.getTimestamp("created_at")),
            toInstant(rs.getTimestamp("updated_at")));

    private static Instant toInstant(Timestamp t) {
        return t == null ? null : t.toInstant();
    }

    public List<SponsorAd> listAll() {
        return jdbc.query("select " + COLUMNS + " from sponsor_ads order by sort_order, created_at", MAPPER);
    }

    /** What the app shows: switched on and with an image. */
    public List<SponsorAd> listShown() {
        return jdbc.query("select " + COLUMNS + " from sponsor_ads"
                + " where active = true and image is not null order by sort_order, created_at", MAPPER);
    }

    public Optional<SponsorAd> find(UUID id) {
        return jdbc.query("select " + COLUMNS + " from sponsor_ads where id = :id",
                new MapSqlParameterSource("id", id), MAPPER).stream().findFirst();
    }

    public SponsorAd insert(String title, String linkUrl, int sortOrder, boolean active, UUID createdBy) {
        return jdbc.queryForObject("insert into sponsor_ads (title, link_url, sort_order, active, created_by)"
                        + " values (:title, :link, :sort, :active, :by) returning " + COLUMNS,
                new MapSqlParameterSource()
                        .addValue("title", title)
                        .addValue("link", linkUrl)
                        .addValue("sort", sortOrder)
                        .addValue("active", active)
                        .addValue("by", createdBy),
                MAPPER);
    }

    public Optional<SponsorAd> update(UUID id, String title, String linkUrl, int sortOrder, boolean active) {
        return jdbc.query("update sponsor_ads set title = :title, link_url = :link, sort_order = :sort,"
                        + " active = :active, updated_at = now() where id = :id returning " + COLUMNS,
                new MapSqlParameterSource()
                        .addValue("id", id)
                        .addValue("title", title)
                        .addValue("link", linkUrl)
                        .addValue("sort", sortOrder)
                        .addValue("active", active),
                MAPPER).stream().findFirst();
    }

    /** @return the new image version, or empty when there is no such ad */
    public Optional<Instant> saveImage(UUID id, String contentType, byte[] data) {
        return jdbc.query("update sponsor_ads set image = :data, image_type = :type, image_updated_at = now(),"
                        + " updated_at = now() where id = :id returning image_updated_at",
                new MapSqlParameterSource().addValue("id", id).addValue("type", contentType).addValue("data", data),
                (rs, i) -> rs.getTimestamp(1).toInstant()).stream().findFirst();
    }

    public Optional<Image> findImage(UUID id) {
        return jdbc.query("select image_type, image from sponsor_ads where id = :id and image is not null",
                new MapSqlParameterSource("id", id),
                (rs, i) -> new Image(rs.getString("image_type"), rs.getBytes("image"))).stream().findFirst();
    }

    public boolean delete(UUID id) {
        return jdbc.update("delete from sponsor_ads where id = :id", new MapSqlParameterSource("id", id)) > 0;
    }
}
