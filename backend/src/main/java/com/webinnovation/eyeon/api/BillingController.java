package com.webinnovation.eyeon.api;

import com.webinnovation.eyeon.dto.SubscriptionDtos.SubscriptionView;
import com.webinnovation.eyeon.exception.NotFoundException;
import com.webinnovation.eyeon.repository.SubscriptionRepository.Subscription;
import com.webinnovation.eyeon.security.TenantContext;
import com.webinnovation.eyeon.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * User billing endpoints - view subscriptions for the current org.
 */
@RestController
@RequestMapping("/billing")
@RequiredArgsConstructor
public class BillingController {

    private final SubscriptionService subscriptionService;

    /** List all subscriptions for the current org. */
    @GetMapping("/subscriptions")
    public List<SubscriptionView> listSubscriptions() {
        UUID orgId = TenantContext.requireOrgId();
        return subscriptionService.listForOrg(orgId).stream()
                .map(s -> SubscriptionView.of(s, getEffectiveStatus(s)))
                .toList();
    }

    /** Get a single subscription by ID. */
    @GetMapping("/subscriptions/{id}")
    public SubscriptionView getSubscription(@PathVariable UUID id) {
        UUID orgId = TenantContext.requireOrgId();
        Subscription sub = subscriptionService.getById(orgId, id)
                .orElseThrow(() -> new NotFoundException("subscription", id.toString()));
        return SubscriptionView.of(sub, subscriptionService.getEffectiveStatus(sub.deviceImei()));
    }

    private String getEffectiveStatus(Subscription sub) {
        return subscriptionService.getEffectiveStatus(sub.deviceImei());
    }
}
