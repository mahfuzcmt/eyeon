package com.webinnovation.eyeon.api;

import com.webinnovation.eyeon.dto.TripDtos.TripView;
import com.webinnovation.eyeon.security.TenantContext;
import com.webinnovation.eyeon.service.TripService;
import com.webinnovation.eyeon.service.DeviceAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/trips")
@RequiredArgsConstructor
public class TripController {

    private final TripService tripService;
    private final DeviceAccessService access;

    @GetMapping
    public List<TripView> list(
            @RequestParam(name = "from", required = false) String fromIso,
            @RequestParam(name = "to", required = false) String toIso,
            @RequestParam(name = "limit", defaultValue = "100") int limit,
            @RequestParam(name = "offset", defaultValue = "0") int offset) {
        UUID orgId = TenantContext.requireOrgId();
        access.requireSeesAll();
        Instant from = fromIso == null ? Instant.now().minusSeconds(7L * 24 * 3600) : Instant.parse(fromIso);
        Instant to = toIso == null ? Instant.now() : Instant.parse(toIso);
        return tripService.listForOrg(orgId, from, to, limit, offset)
                .stream().map(TripView::of).toList();
    }

    @GetMapping("/device/{imei}")
    public List<TripView> listForDevice(
            @PathVariable String imei,
            @RequestParam(name = "from", required = false) String fromIso,
            @RequestParam(name = "to", required = false) String toIso) {
        UUID orgId = TenantContext.requireOrgId();
        access.requireSeesAll();
        Instant from = fromIso == null ? Instant.now().minusSeconds(7L * 24 * 3600) : Instant.parse(fromIso);
        Instant to = toIso == null ? Instant.now() : Instant.parse(toIso);
        return tripService.listForDevice(orgId, imei, from, to)
                .stream().map(TripView::of).toList();
    }

    @GetMapping("/{id}")
    public TripView get(@PathVariable UUID id) {
        UUID orgId = TenantContext.requireOrgId();
        access.requireSeesAll();
        return TripView.of(tripService.getOrThrow(orgId, id));
    }
}
