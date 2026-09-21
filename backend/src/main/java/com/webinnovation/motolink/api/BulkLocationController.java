package com.webinnovation.motolink.api;

import com.webinnovation.motolink.dto.LocationDtos.LocationView;
import com.webinnovation.motolink.repository.LocationRepository;
import com.webinnovation.motolink.security.TenantContext;
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

    /**
     * Last-known position for every device in the org — initial dashboard load.
     * Coordinates are the last GPS-confirmed fix; `valid` and `ts` describe the
     * newest packet, so the map can flag a device that is still reporting but has
     * lost its fix instead of presenting stale coordinates as live.
     */
    @GetMapping("/last")
    public List<LocationView> allLastKnown() {
        UUID orgId = TenantContext.requireOrgId();
        return locationRepo.findAllLastKnownWithFixForOrg(orgId).stream()
                .map(f -> LocationView.ofLastKnown(f.latest(), f.lastValid()))
                .toList();
    }
}
