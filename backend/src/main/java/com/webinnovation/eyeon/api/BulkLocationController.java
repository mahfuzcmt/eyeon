package com.webinnovation.eyeon.api;

import com.webinnovation.eyeon.dto.LocationDtos.LocationView;
import com.webinnovation.eyeon.repository.LocationRepository;
import com.webinnovation.eyeon.security.TenantContext;
import com.webinnovation.eyeon.service.DeviceAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Tenant-wide location queries used to bootstrap the dashboard.
 * Lives at /devices/locations/* so the path stays under the device namespace
 * (CLAUDE.md §8 — REST API spec).
 */
@RestController
@RequestMapping("/devices/locations")
@RequiredArgsConstructor
public class BulkLocationController {

    private final LocationRepository locationRepo;
    private final DeviceAccessService access;

    /**
     * Last-known position for every device in the org — initial dashboard load.
     * Coordinates are the last GPS-confirmed fix; `valid` and `ts` describe the
     * newest packet, so the map can flag a device that is still reporting but has
     * lost its fix instead of presenting stale coordinates as live.
     *
     * <p>A tracker that has never had a fix and reports (0,0) has no position at all;
     * it is left out rather than plotted in the Gulf of Guinea.
     */
    @GetMapping("/last")
    public List<LocationView> allLastKnown() {
        UUID orgId = TenantContext.requireOrgId();
        java.util.Set<String> visible = access.visibleForCurrentUser();
        return locationRepo.findAllLastKnownWithFixForOrg(orgId).stream()
                .filter(f -> DeviceAccessService.canSee(visible, f.latest().deviceImei()))
                .map(f -> LocationView.ofLastKnown(f.latest(), f.lastValid()))
                .filter(LocationView::hasPosition)
                .toList();
    }
}
