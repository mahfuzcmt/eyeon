package com.webinnovation.motolink.service;

import com.webinnovation.motolink.repository.OrganizationRepository;
import com.webinnovation.motolink.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Dev-only bootstrap: creates a default admin user under the demo org if no
 * users exist yet. Demo org UUID is seeded by Flyway V2.
 */
@Component
@ConditionalOnProperty(prefix = "motolink.seed", name = "enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private static final UUID DEMO_ORG_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    private final UserRepository userRepo;
    private final OrganizationRepository orgRepo;
    private final PasswordEncoder passwordEncoder;

    @Value("${motolink.seed.admin-email}")
    private String adminEmail;

    @Value("${motolink.seed.admin-password}")
    private String adminPassword;

    @Override
    public void run(String... args) {
        if (userRepo.count() > 0) {
            log.debug("DataSeeder: users already present, skipping");
            return;
        }
        if (orgRepo.findById(DEMO_ORG_ID).isEmpty()) {
            log.warn("DataSeeder: demo org {} not found — Flyway V2 may not have run", DEMO_ORG_ID);
            return;
        }
        UUID id = userRepo.create(
                DEMO_ORG_ID,
                adminEmail,
                passwordEncoder.encode(adminPassword),
                "Demo Admin",
                "ORG_ADMIN");
        log.info("DataSeeder: created admin user {} ({}) in demo org", adminEmail, id);
    }
}
