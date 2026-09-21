package com.webinnovation.motolink.api;

import com.webinnovation.motolink.dto.DashboardDtos.KpiSnapshot;
import com.webinnovation.motolink.security.TenantContext;
import com.webinnovation.motolink.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboard;

    @GetMapping("/kpis")
    public KpiSnapshot kpis() {
        return dashboard.snapshot(TenantContext.requireOrgId());
    }
}
