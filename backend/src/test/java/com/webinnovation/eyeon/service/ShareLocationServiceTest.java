package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.domain.Device;
import com.webinnovation.eyeon.domain.ShareLocationLink;
import com.webinnovation.eyeon.domain.User;
import com.webinnovation.eyeon.exception.NotFoundException;
import com.webinnovation.eyeon.repository.DeviceRepository;
import com.webinnovation.eyeon.repository.LocationRepository;
import com.webinnovation.eyeon.repository.ShareLocationLinkRepository;
import com.webinnovation.eyeon.repository.UserDeviceRepository;
import com.webinnovation.eyeon.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** A public share link works only while the person who made it is active and can still see the child. */
class ShareLocationServiceTest {

    private static final String IMEI = "864290061234567";
    private static final String TOKEN = "token";

    private final UUID orgId = UUID.randomUUID();
    private final UUID creator = UUID.randomUUID();
    private ShareLocationLinkRepository links;
    private UserRepository users;
    private UserDeviceRepository userDevices;
    private DeviceRepository devices;
    private ShareLocationService service;

    @BeforeEach
    void setUp() {
        links = mock(ShareLocationLinkRepository.class);
        users = mock(UserRepository.class);
        userDevices = mock(UserDeviceRepository.class);
        devices = mock(DeviceRepository.class);
        Device device = mock(Device.class);
        when(device.name()).thenReturn("Ayaan");
        when(devices.findByOrgAndImei(orgId, IMEI)).thenReturn(Optional.of(device));
        when(links.findByToken(TOKEN)).thenReturn(Optional.of(new ShareLocationLink(UUID.randomUUID(), orgId, IMEI,
                TOKEN, null, Instant.now().plusSeconds(3600), true, true, true, creator, Instant.now(), null, 0)));
        service = new ShareLocationService(links, devices, mock(LocationRepository.class), users,
                new DeviceAccessService(users, userDevices, devices));
    }

    private void creatorIs(String role, boolean active, UUID inOrg, List<String> assigned) {
        when(users.findById(creator)).thenReturn(Optional.of(new User(creator, inOrg, "p@x.test", null, "hash",
                "Parent", role, active, false, null, Instant.now(), Instant.now())));
        when(userDevices.getDeviceImeis(creator)).thenReturn(assigned);
    }

    private void assertRefusedEverywhere() {
        assertThrows(NotFoundException.class, () -> service.getSharedLocation(TOKEN, "203.0.113.7", "test"));
        assertThrows(NotFoundException.class, () -> service.getSharedHistory(TOKEN));
        assertThrows(NotFoundException.class, () -> service.validateToken(TOKEN));
        verify(links, never()).recordAccess(any(), any(), any());
    }

    @Test
    void the_link_of_a_parent_who_still_sees_the_child_works() {
        creatorIs("ORG_USER", true, orgId, List.of(IMEI));
        assertEquals("Ayaan", service.getSharedLocation(TOKEN, "203.0.113.7", "test").vehicleName());
    }

    @Test
    void the_link_of_a_disabled_user_stops_working() {
        creatorIs("ORG_ADMIN", false, orgId, List.of(IMEI));
        assertRefusedEverywhere();
    }

    @Test
    void the_link_of_a_parent_who_was_unassigned_from_the_child_stops_working() {
        creatorIs("ORG_USER", true, orgId, List.of("864290060000000"));
        assertRefusedEverywhere();
    }

    @Test
    void the_link_of_a_user_who_left_the_organization_stops_working() {
        creatorIs("ORG_ADMIN", true, UUID.randomUUID(), List.of(IMEI));
        assertRefusedEverywhere();
    }

    @Test
    void a_link_whose_creator_no_longer_exists_stops_working() {
        when(users.findById(creator)).thenReturn(Optional.empty());
        assertRefusedEverywhere();
    }
}
