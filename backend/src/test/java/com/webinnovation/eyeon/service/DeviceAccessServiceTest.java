package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.domain.User;
import com.webinnovation.eyeon.repository.DeviceRepository;
import com.webinnovation.eyeon.repository.UserDeviceRepository;
import com.webinnovation.eyeon.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DeviceAccessServiceTest {

    private final UserRepository users = mock(UserRepository.class);
    private final UserDeviceRepository assignments = mock(UserDeviceRepository.class);
    private final DeviceAccessService access = new DeviceAccessService(users, assignments, mock(DeviceRepository.class));

    private User user(String role, boolean seeAll) {
        User u = new User(UUID.randomUUID(), UUID.randomUUID(), "u@x", null, "h", "U", role, true, seeAll,
                null, Instant.now(), Instant.now());
        when(users.findById(u.id())).thenReturn(Optional.of(u));
        return u;
    }

    @Test
    void background_lookup_of_an_admin_means_every_child_not_none() {
        // Regression: Optional.map(null) turned "everyone" into an empty set for admins.
        assertNull(access.visibleImeis(user("ORG_ADMIN", false).id()));
        assertNull(access.visibleImeis(user("SUPER_ADMIN", false).id()));
        assertNull(access.visibleImeis(user("ORG_USER", true).id()), "see-all flag");
    }

    @Test
    void a_parent_sees_exactly_their_assigned_children() {
        User parent = user("ORG_USER", false);
        when(assignments.getDeviceImeis(parent.id())).thenReturn(List.of("864290060000001"));
        assertEquals(Set.of("864290060000001"), access.visibleImeis(parent.id()));
    }

    @Test
    void an_unknown_user_sees_nothing() {
        Set<String> v = access.visibleImeis(UUID.randomUUID());
        assertTrue(v != null && v.isEmpty());
    }
}
