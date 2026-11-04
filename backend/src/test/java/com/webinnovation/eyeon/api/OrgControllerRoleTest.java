package com.webinnovation.eyeon.api;

import com.webinnovation.eyeon.domain.User;
import com.webinnovation.eyeon.dto.OrgDtos.UserCreate;
import com.webinnovation.eyeon.dto.OrgDtos.UserUpdate;
import com.webinnovation.eyeon.exception.DomainException;
import com.webinnovation.eyeon.exception.ForbiddenException;
import com.webinnovation.eyeon.repository.DeviceRepository;
import com.webinnovation.eyeon.repository.OrganizationRepository;
import com.webinnovation.eyeon.repository.UserDeviceRepository;
import com.webinnovation.eyeon.repository.UserRepository;
import com.webinnovation.eyeon.security.TenantContext;
import com.webinnovation.eyeon.service.AuditService;
import com.webinnovation.eyeon.ws.LiveAudience;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Only a Super Admin can make someone a Super Admin or touch a Super Admin account. Until
 * 2026-11-04 any org admin could promote anyone (themselves included) to SUPER_ADMIN.
 */
class OrgControllerRoleTest {

    private final UUID orgId = UUID.randomUUID();
    private final UUID me = UUID.randomUUID();
    private final UserRepository users = mock(UserRepository.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final OrgController controller = new OrgController(mock(OrganizationRepository.class),
            mock(LiveAudience.class), users, mock(UserDeviceRepository.class), mock(DeviceRepository.class),
            encoder, mock(AuditService.class));

    private User user(UUID id, String role) {
        User u = new User(id, orgId, id + "@x.test", null, "hash", "Name", role, true, false, null,
                Instant.now(), Instant.now());
        when(users.findById(id)).thenReturn(Optional.of(u));
        return u;
    }

    private void actingAs(String role) {
        TenantContext.set(orgId, me, role);
        user(me, role);
        when(encoder.encode(anyString())).thenReturn("hash");
    }

    @AfterEach
    void clear() {
        TenantContext.clear();
    }

    @Test
    void an_org_admin_cannot_create_a_super_admin() {
        actingAs("ORG_ADMIN");
        when(users.findByEmail(anyString())).thenReturn(Optional.empty());

        assertThrows(ForbiddenException.class, () -> controller.createUser(
                new UserCreate("x@x.test", null, "X", "SUPER_ADMIN", "password1")));
        verify(users, never()).createInOrg(any(), any(), any(), any(), any(), any());
    }

    @Test
    void an_org_admin_cannot_promote_anyone_or_themselves() {
        actingAs("ORG_ADMIN");
        UUID other = UUID.randomUUID();
        user(other, "ORG_USER");

        assertThrows(ForbiddenException.class,
                () -> controller.updateUser(other, new UserUpdate(null, null, "SUPER_ADMIN", null, null)));
        assertThrows(DomainException.class,
                () -> controller.updateUser(me, new UserUpdate(null, null, "SUPER_ADMIN", null, null)));
        verify(users, never()).update(any(), any(), any(), any(), any(), any());
    }

    @Test
    void an_org_admin_cannot_reset_the_password_of_or_disable_a_super_admin() {
        actingAs("ORG_ADMIN");
        UUID boss = UUID.randomUUID();
        user(boss, "SUPER_ADMIN");

        assertThrows(ForbiddenException.class,
                () -> controller.updateUser(boss, new UserUpdate(null, null, null, null, "newpassword")));
        assertThrows(ForbiddenException.class,
                () -> controller.updateUser(boss, new UserUpdate(null, null, "ORG_USER", null, null)));
        assertThrows(ForbiddenException.class, () -> controller.disableUser(boss));
        verify(users, never()).updatePassword(any(), any(), any());
        verify(users, never()).softDelete(any(), any());
    }

    @Test
    void an_org_admin_still_manages_ordinary_users() {
        actingAs("ORG_ADMIN");
        UUID other = UUID.randomUUID();
        user(other, "ORG_USER");

        controller.updateUser(other, new UserUpdate(null, null, "ORG_ADMIN", null, null));
        verify(users).update(eq(other), eq(orgId), any(), any(), eq("ORG_ADMIN"), any());
    }

    @Test
    void a_super_admin_can_make_another_super_admin() {
        actingAs("SUPER_ADMIN");
        UUID other = UUID.randomUUID();
        user(other, "ORG_USER");

        controller.updateUser(other, new UserUpdate(null, null, "SUPER_ADMIN", null, null));
        verify(users).update(eq(other), eq(orgId), any(), any(), eq("SUPER_ADMIN"), any());
    }

    @Test
    void nobody_changes_their_own_role() {
        actingAs("SUPER_ADMIN");
        assertThrows(DomainException.class,
                () -> controller.updateUser(me, new UserUpdate(null, null, "ORG_USER", null, null)));
    }
}
