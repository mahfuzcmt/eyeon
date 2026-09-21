package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.domain.Alarm;
import com.webinnovation.eyeon.domain.Device;
import com.webinnovation.eyeon.repository.DeviceRepository;
import com.webinnovation.eyeon.repository.UserRepository;
import com.webinnovation.eyeon.util.PasswordResetSupport;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Texts the people responsible for a child when a CRITICAL alarm (SOS, tracker taken off ...)
 * arrives. A push needs the parent to have mobile data and the app installed; an SMS does not,
 * which is the whole point of doing both.
 *
 * <p>Until 2026-09-21 this path called {@code smsService.sendAlarmSms(alarm, null, ...)} - a
 * null recipient - so no SOS text ever reached anyone.
 *
 * <p>Runs {@code @Async}: a slow SMS provider must never hold up ingestion (CLAUDE.md 3.2
 * rule 4). Two cost guards, because a held-down or faulty SOS button repeats the packet:
 * one burst per tracker per alarm type per cooldown, and a cap on recipients per alarm.
 */
@Service
@Slf4j
public class AlarmSmsService {

    private final UserRepository userRepo;
    private final DeviceRepository deviceRepo;
    private final SmsService smsService;
    private final NotificationComposer composer;
    private final StringRedisTemplate redis;
    private final Duration cooldown;
    private final int maxRecipients;

    public AlarmSmsService(UserRepository userRepo,
                           DeviceRepository deviceRepo,
                           SmsService smsService,
                           NotificationComposer composer,
                           StringRedisTemplate redis,
                           @Value("${eyeon.sms.alarm-cooldown-seconds:120}") long cooldownSeconds,
                           @Value("${eyeon.sms.alarm-max-recipients:10}") int maxRecipients) {
        this.userRepo = userRepo;
        this.deviceRepo = deviceRepo;
        this.smsService = smsService;
        this.composer = composer;
        this.redis = redis;
        this.cooldown = Duration.ofSeconds(Math.max(0, cooldownSeconds));
        this.maxRecipients = Math.max(1, maxRecipients);
    }

    /** Fire-and-forget: failures are logged, never propagated to the alarm pipeline. */
    @Async
    public void sendCriticalAlarmSms(Alarm alarm) {
        try {
            List<UserRepository.SmsRecipient> recipients =
                    userRepo.listAlarmSmsRecipients(alarm.orgId(), alarm.deviceImei());

            // One message per distinct number, keeping the first language seen for it.
            Map<String, String> localeByNumber = new LinkedHashMap<>();
            for (UserRepository.SmsRecipient r : recipients) {
                String msisdn = PasswordResetSupport.normalizeBdMsisdn(r.phone());
                if (msisdn != null) localeByNumber.putIfAbsent(msisdn, r.locale());
            }
            if (localeByNumber.isEmpty()) {
                // Loud on purpose: this is the case that used to be silent.
                log.warn("{} alarm {} for imei={} has NO SMS recipient - nobody with a phone number can see this tracker",
                        alarm.type(), alarm.id(), alarm.deviceImei());
                return;
            }
            if (!acquireCooldown(alarm)) {
                log.info("{} SMS for imei={} suppressed: already texted within {}s",
                        alarm.type(), alarm.deviceImei(), cooldown.toSeconds());
                return;
            }

            String personName = deviceRepo.findByImei(alarm.deviceImei())
                    .map(Device::name)
                    .filter(n -> n != null && !n.isBlank())
                    .orElse(alarm.deviceImei());

            int sent = 0;
            int attempted = 0;
            for (Map.Entry<String, String> e : localeByNumber.entrySet()) {
                if (attempted == maxRecipients) {
                    log.warn("{} alarm {}: {} recipients, texting only the first {}",
                            alarm.type(), alarm.id(), localeByNumber.size(), maxRecipients);
                    break;
                }
                attempted++;
                String text = composer.composeSms(alarm, personName, NotificationComposer.Lang.of(e.getValue()));
                if (smsService.sendRaw(e.getKey(), text)) sent++;
            }
            log.info("{} alarm {} for imei={}: SMS handed to provider for {}/{} recipients{}",
                    alarm.type(), alarm.id(), alarm.deviceImei(), sent, attempted,
                    smsService.isConfigured() ? "" : " (STUB MODE - no SSL_SMS_API_TOKEN, nothing was really sent)");
        } catch (Exception e) {
            log.error("Alarm SMS dispatch failed for alarm {}: {}", alarm.id(), e.getMessage(), e);
        }
    }

    /**
     * @return true when this alarm may text now. If Redis is unreachable we text anyway:
     *         for an SOS a duplicate message is a far smaller failure than a missing one.
     */
    private boolean acquireCooldown(Alarm alarm) {
        if (cooldown.isZero()) return true;
        try {
            Boolean first = redis.opsForValue().setIfAbsent(
                    "sms:alarm:" + alarm.deviceImei() + ":" + alarm.type(), "1", cooldown);
            return first == null || first;
        } catch (Exception e) {
            log.warn("SMS cooldown check failed ({}), sending anyway", e.getMessage());
            return true;
        }
    }
}
