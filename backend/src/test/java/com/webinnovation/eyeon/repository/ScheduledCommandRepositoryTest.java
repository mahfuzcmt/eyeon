package com.webinnovation.eyeon.repository;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

/** ?limit=2000000000 used to be handed to the database as it came. */
class ScheduledCommandRepositoryTest {

    @Test
    @SuppressWarnings("unchecked")
    void the_page_size_and_offset_are_clamped() {
        NamedParameterJdbcTemplate jdbc = mock(NamedParameterJdbcTemplate.class);
        new ScheduledCommandRepository(jdbc).listForOrg(UUID.randomUUID(), Integer.MAX_VALUE, -5);

        ArgumentCaptor<SqlParameterSource> params = ArgumentCaptor.forClass(SqlParameterSource.class);
        verify(jdbc).query(anyString(), params.capture(), any(RowMapper.class));
        assertEquals(ScheduledCommandRepository.MAX_PAGE, params.getValue().getValue("limit"));
        assertEquals(0, params.getValue().getValue("offset"));
    }
}
