package com.webinnovation.eyeon.api;

import com.webinnovation.eyeon.exception.NotFoundException;
import com.webinnovation.eyeon.repository.SubscriptionRepository.Subscription;
import com.webinnovation.eyeon.security.TenantContext;
import com.webinnovation.eyeon.service.DeviceAccessService;
import com.webinnovation.eyeon.service.SubscriptionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** A parent sees only the subscriptions of their own children (CLAUDE.md §11.2a); an admin sees all. */
class BillingControllerPrivacyTest {

    private final UUID orgId = UUID.randomUUID();
    private final SubscriptionService subs = mock(SubscriptionService.class);
    private final DeviceAccessService access = mock(DeviceAccessService.class);
    private final BillingController controller = new BillingController(subs, access);

    private final Subscription mine = sub("111111111111111");
    private final Subscription other = sub("222222222222222");

    private Subscription sub(String imei) {
        return new Subscription(UUID.randomUUID(), orgId, imei, "BASIC", 300, LocalDate.now().minusDays(10),
                LocalDate.now().plusDays(20), "ACTIVE", true, Instant.now(), Instant.now());
    }

    @BeforeEach
    void setUp() {
        TenantContext.set(orgId, UUID.randomUUID(), "ORG_USER");
        when(subs.listForOrg(orgId)).thenReturn(List.of(mine, other));
        when(subs.getEffectiveStatus(anyString())).thenReturn("ACTIVE");
        when(subs.getById(orgId, other.id())).thenReturn(Optional.of(other));
        when(subs.getById(orgId, mine.id())).thenReturn(Optional.of(mine));
    }

    @AfterEach
    void clear() {
        TenantContext.clear();
    }

    @Test
    void a_parent_lists_only_their_own_childrens_subscriptions() {
        when(access.visibleForCurrentUser()).thenReturn(Set.of(mine.deviceImei()));

        var list = controller.listSubscriptions();

        assertEquals(1, list.size());
        assertEquals(mine.deviceImei(), list.get(0).deviceImei());
    }

    @Test
    void a_parent_cannot_read_another_childs_subscription_by_id() {
        when(access.visibleForCurrentUser()).thenReturn(Set.of(mine.deviceImei()));

        assertThrows(NotFoundException.class, () -> controller.getSubscription(other.id()));
        assertEquals(mine.deviceImei(), controller.getSubscription(mine.id()).deviceImei());
    }

    @Test
    void someone_who_sees_everyone_lists_every_subscription() {
        when(access.visibleForCurrentUser()).thenReturn(null);   // null = sees all (admins)

        assertEquals(2, controller.listSubscriptions().size());
    }
}
