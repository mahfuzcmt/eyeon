package com.webinnovation.eyeon.api;

import com.webinnovation.eyeon.dto.SubscriptionDtos.SubscriptionView;
import com.webinnovation.eyeon.exception.NotFoundException;
import com.webinnovation.eyeon.repository.SubscriptionRepository.Subscription;
import com.webinnovation.eyeon.security.TenantContext;
import com.webinnovation.eyeon.service.DeviceAccessService;
import com.webinnovation.eyeon.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * User billing endpoints - the subscriptions of the trackers the caller may see.
 *
 * <p>Privacy (CLAUDE.md §11.2a): a parent sees only the subscriptions of children assigned to
 * them; admins and {@code see_all_devices} users see the whole organization. Until 2026-11-04
 * every user got every subscription of the organization (other children's IMEIs, prices and
 * expiry dates).
 */
@RestController
@RequestMapping("/billing")
@RequiredArgsConstructor
public class BillingController {

    private final SubscriptionService subscriptionService;
    private final DeviceAccessService access;

    /** List all subscriptions for the current org. */
    @GetMapping("/subscriptions")
    public List<SubscriptionView> listSubscriptions() {
        UUID orgId = TenantContext.requireOrgId();
        java.util.Set<String> visible = access.visibleForCurrentUser();
        return subscriptionService.listForOrg(orgId).stream()
                .filter(s -> DeviceAccessService.canSee(visible, s.deviceImei()))
                .map(s -> SubscriptionView.of(s, getEffectiveStatus(s)))
                .toList();
    }

    /** Get a single subscription by ID. */
    @GetMapping("/subscriptions/{id}")
    public SubscriptionView getSubscription(@PathVariable UUID id) {
        UUID orgId = TenantContext.requireOrgId();
        Subscription sub = subscriptionService.getById(orgId, id)
                .filter(s -> DeviceAccessService.canSee(access.visibleForCurrentUser(), s.deviceImei()))
                .orElseThrow(() -> new NotFoundException("subscription", id.toString()));
        return SubscriptionView.of(sub, subscriptionService.getEffectiveStatus(sub.deviceImei()));
    }

    private String getEffectiveStatus(Subscription sub) {
        return subscriptionService.getEffectiveStatus(sub.deviceImei());
    }
}
