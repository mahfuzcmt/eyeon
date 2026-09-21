package com.webinnovation.motolink.api;

import com.webinnovation.motolink.dto.CommandDtos.CommandRequest;
import com.webinnovation.motolink.dto.CommandDtos.CommandResponse;
import com.webinnovation.motolink.repository.DeviceRepository;
import com.webinnovation.motolink.security.SubscriptionGuard;
import com.webinnovation.motolink.security.TenantContext;
import com.webinnovation.motolink.service.AuditService;
import com.webinnovation.motolink.service.DeviceCommandService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.CancellationException;

/**
 * Operator-facing endpoints for sending commands to devices over their open
 * GT06 channel (CLAUDE.md §7.4). Awaits the device's 0x15 reply with a 20s
 * synchronous block — for end-user APIs, async polling would be a follow-up.
 */
@RestController
@RequestMapping("/devices/{imei}/commands")
@RequiredArgsConstructor
public class DeviceCommandController {

    private static final long REPLY_WAIT_MS = 20_000;
    private static final String DEFAULT_PASSWORD = "123456";  // GT06 factory default (CLAUDE.md §6.7)

    private final DeviceCommandService commandService;
    private final DeviceRepository deviceRepo;
    private final AuditService audit;
    private final SubscriptionGuard subscriptionGuard;

    @GetMapping("/online")
    public Map<String, Boolean> isOnline(@PathVariable String imei) {
        return Map.of("online", commandService.isOnline(imei));
    }

    @PostMapping("/cut-fuel")
    public ResponseEntity<CommandResponse> cutFuel(@PathVariable String imei,
                                                   @RequestBody CommandRequest req) {
        UUID orgId = TenantContext.requireOrgId();
        subscriptionGuard.requireActiveSubscription(imei);
        audit.record("DEVICE_CMD_CUT_FUEL", "device", imei, null);
        ResponseEntity<CommandResponse> resp = await(commandService.cutFuel(orgId, imei, password(req)));
        if (succeeded(resp)) {
            deviceRepo.setEngineLocked(orgId, imei, true);
        }
        return resp;
    }

    @PostMapping("/restore-fuel")
    public ResponseEntity<CommandResponse> restoreFuel(@PathVariable String imei,
                                                       @RequestBody CommandRequest req) {
        UUID orgId = TenantContext.requireOrgId();
        subscriptionGuard.requireActiveSubscription(imei);
        audit.record("DEVICE_CMD_RESTORE_FUEL", "device", imei, null);
        ResponseEntity<CommandResponse> resp = await(commandService.restoreFuel(orgId, imei, password(req)));
        if (succeeded(resp)) {
            deviceRepo.setEngineLocked(orgId, imei, false);
        }
        return resp;
    }

    private static String password(CommandRequest req) {
        return (req.devicePassword() == null || req.devicePassword().isBlank())
                ? DEFAULT_PASSWORD : req.devicePassword();
    }

    private static boolean succeeded(ResponseEntity<CommandResponse> resp) {
        return resp.getStatusCode().is2xxSuccessful()
                && resp.getBody() != null && resp.getBody().ok();
    }

    @PostMapping("/query-address")
    public ResponseEntity<CommandResponse> queryAddress(@PathVariable String imei,
                                                        @RequestBody CommandRequest req) {
        UUID orgId = TenantContext.requireOrgId();
        subscriptionGuard.requireActiveSubscription(imei);
        audit.record("DEVICE_CMD_QUERY_ADDRESS", "device", imei, null);
        return await(commandService.queryAddress(orgId, imei, req.devicePassword()));
    }

    @PostMapping("/raw")
    public ResponseEntity<CommandResponse> raw(@PathVariable String imei,
                                               @RequestBody CommandRequest req) {
        UUID orgId = TenantContext.requireOrgId();
        subscriptionGuard.requireActiveSubscription(imei);
        if (req.rawCommand() == null || req.rawCommand().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(CommandResponse.failure("rawCommand required"));
        }
        audit.record("DEVICE_CMD_RAW", "device", imei,
                Map.of("command", req.rawCommand()));
        return await(commandService.sendRaw(orgId, imei, req.rawCommand()));
    }

    private ResponseEntity<CommandResponse> await(CompletableFuture<String> future) {
        try {
            String reply = future.get(REPLY_WAIT_MS, TimeUnit.MILLISECONDS);
            return ResponseEntity.ok(CommandResponse.success(reply));
        } catch (TimeoutException e) {
            return ResponseEntity.status(504)
                    .body(CommandResponse.failure("Device did not reply within timeout"));
        } catch (CancellationException | InterruptedException e) {
            Thread.currentThread().interrupt();
            return ResponseEntity.status(503)
                    .body(CommandResponse.failure("Command cancelled"));
        } catch (ExecutionException e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            int status = cause instanceof SecurityException ? 403
                    : cause instanceof IllegalStateException ? 409
                    : 500;
            return ResponseEntity.status(status)
                    .body(CommandResponse.failure(cause.getMessage()));
        }
    }
}
