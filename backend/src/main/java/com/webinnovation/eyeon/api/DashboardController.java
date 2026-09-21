package com.webinnovation.eyeon.api;

import com.webinnovation.eyeon.dto.DashboardDtos.KpiSnapshot;
import com.webinnovation.eyeon.security.TenantContext;
import com.webinnovation.eyeon.service.DashboardService;
import com.webinnovation.eyeon.service.DeviceAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboard;
    private final DeviceAccessService access;

    @GetMapping("/kpis")
    public KpiSnapshot kpis() {
        return dashboard.snapshot(TenantContext.requireOrgId(), access.visibleForCurrentUser(), TenantContext.currentUserId());
    }
}
